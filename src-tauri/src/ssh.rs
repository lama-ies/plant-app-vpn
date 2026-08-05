//! Terminal SSH embebida (Fase 6.2.2), rol Administrador. Abre un canal PTY sobre el túnel WireGuard hacia
//! la IP virtual de la PC de sitio, reenvía la salida al frontend como eventos (`ssh-datos-{sesionId}`) y
//! recibe entrada/resize por comandos. Usa `russh` (SSH puro en Rust, sin libssh2/OpenSSL nativo).
//!
//! SEGURIDAD: `ManejadorSsh::check_server_key` pinea contra la huella SHA-256 del host registrada en
//! `Plant_PCs` (misma idea que su llave pública de WireGuard), pasada por el frontend en
//! `ParametrosConexionSsh.llave_host_esperada`. Si coincide con la huella real, acepta; si no coincide, o
//! si la PC todavía no tiene huella registrada (`None`), **rechaza** — nunca se acepta una llave de host
//! sin verificarla contra un valor conocido. (Fix de seguridad: antes, `None` hacía `Ok(true)` y aceptaba
//! cualquier llave sin comprobar nada, lo que dejaba toda conexión SSH abierta a MITM, porque el
//! onboarding que llena `sshHostKeyFingerprint` en `Plant_PCs` no existía todavía y esa rama era la única
//! que se ejercía en la práctica.) El onboarding ya existe (alta de PC en `AltaEquipo.tsx` ->
//! `Plant_PCs.sshHostKeyFingerprint`); sin esa huella, `ssh_conectar` corta temprano con un mensaje claro
//! antes de intentar el handshake — ver el guard al inicio de `ssh_conectar`. NO reintroducir un modo
//! "aceptar la primera llave que se vea" (TOFU) aquí: sin huella conocida, simplemente no se conecta.
//!
//! NOTA DE VERIFICACIÓN (2026-08-05, primera compilación real): `russh` 0.45.0 NO tiene `Channel::split()`
//! ni `ChannelWriteHalf` (esa API es de versiones más nuevas) — `Channel::data()`/`window_change()`/
//! `close()` toman `&self` directo, pero `wait()` exige `&mut self`, así que una sola tarea debe ser
//! dueña exclusiva del `Channel`. Se resuelve con un mpsc interno: la tarea que abre el canal lo posee
//! por completo y multiplexa con `tokio::select!` entre leer mensajes entrantes (`wait()`) y comandos que
//! llegan por el canal (`ComandoSsh`, enviados desde `ssh_enviar`/`ssh_redimensionar`/`ssh_cerrar`) — no
//! hay necesidad real de partir el `Channel`, solo de serializar el acceso.
//! Tampoco existe `HashAlg` ni `russh::keys::PublicKey` en esta versión: el tipo real es la enum
//! `russh::keys::key::PublicKey` (API vieja, pre-rediseño con `ssh_key`), su método `fingerprint()` no
//! toma algoritmo (siempre SHA-256) y devuelve SOLO el base64 sin el prefijo `SHA256:` que usa
//! `Plant_PCs`/el resto del sistema — se le agrega el prefijo antes de comparar.

use russh::client::{Handle, Handler};
use russh::keys::key::PublicKey;
use russh::{ChannelId, ChannelMsg, Disconnect};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::{mpsc, Mutex};

/// Manejador SSH: pinea la llave de host contra la huella esperada. Sin huella conocida (`None`) rechaza
/// por defecto — ver cabecera del archivo. El rechazo con mensaje explicativo para el técnico ocurre antes
/// de llegar aquí, en el guard de `ssh_conectar`; esta rama es la defensa en profundidad del propio
/// manejador (nunca debe aceptar una llave de host sin verificarla, sin importar quién lo invoque).
struct ManejadorSsh {
    llave_host_esperada: Option<String>,
}

#[async_trait::async_trait]
impl Handler for ManejadorSsh {
    type Error = russh::Error;

    async fn check_server_key(&mut self, clave_servidor: &PublicKey) -> Result<bool, Self::Error> {
        match &self.llave_host_esperada {
            // fingerprint() de esta versión siempre es SHA-256 pero NO incluye el prefijo "SHA256:" que
            // usa el resto del sistema (Plant_PCs/RE_HUELLA_SHA256) -- se agrega aquí antes de comparar.
            Some(esperada) => Ok(&format!("SHA256:{}", clave_servidor.fingerprint()) == esperada),
            // Fix de seguridad: antes era `Ok(true)` (acepta cualquier llave sin verificar -> MITM).
            None => Ok(false),
        }
    }
}

/// Comandos que `ssh_enviar`/`ssh_redimensionar`/`ssh_cerrar` mandan a la tarea dueña del `Channel`
/// (ver nota de verificación en la cabecera del archivo: no hay split, se serializa por este canal).
enum ComandoSsh {
    Datos(Vec<u8>),
    Redimensionar(u32, u32),
    Cerrar,
}

/// Una sesión SSH viva: el extremo de entrada hacia la tarea que posee el canal + el handle (se mantiene
/// vivo mientras exista la sesión).
struct SesionSsh {
    entrada: mpsc::UnboundedSender<ComandoSsh>,
    _canal_id: ChannelId,
    _manejador: Handle<ManejadorSsh>,
}

/// Estado gestionado por Tauri: todas las sesiones SSH abiertas, por `sesionId` elegido por el frontend.
#[derive(Default)]
pub struct EstadoSsh {
    sesiones: Mutex<HashMap<String, SesionSsh>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParametrosConexionSsh {
    /// Id que el frontend elige para esta terminal (correlaciona los eventos de datos/cierre).
    pub sesion_id: String,
    /// IP virtual de la PC de sitio (sobre el túnel WireGuard ya establecido).
    pub host: String,
    pub puerto: u16,
    pub usuario: String,
    // TODO: soportar autenticación por llave pública además de contraseña.
    pub contrasena: String,
    /// Huella SHA-256 del host (`SHA256:...`) registrada en `Plant_PCs`. Si viene en `None` (la PC nunca
    /// se onboardeó con su huella SSH), `ssh_conectar` rechaza la conexión antes de intentar nada — ver
    /// el guard al inicio de esa función y la cabecera del archivo.
    pub llave_host_esperada: Option<String>,
}

/// Abre la sesión SSH + PTY + shell, y arranca la tarea que reenvía la salida como eventos.
#[tauri::command]
pub async fn ssh_conectar(
    app: AppHandle,
    estado: State<'_, EstadoSsh>,
    params: ParametrosConexionSsh,
) -> Result<(), String> {
    // Sin huella de host conocida no hay nada que pinear: en vez de aceptar cualquier llave (el bug de
    // seguridad que tenía `check_server_key`), se corta aquí con un mensaje claro para el técnico. La
    // huella se registra una sola vez, en el onboarding de la PC (Plant_PCs.sshHostKeyFingerprint,
    // capturado desde AltaEquipo.tsx durante la instalación física).
    if params.llave_host_esperada.is_none() {
        return Err(
            "Esta PC no tiene huella SSH registrada: no se puede verificar la identidad del servidor. \
             Contacta a onboarding para registrar su huella SSH en Plant_PCs antes de conectar."
                .into(),
        );
    }

    let direccion = format!("{}:{}", params.host, params.puerto);
    let flujo = tokio::net::TcpStream::connect(&direccion)
        .await
        .map_err(|e| format!("no se pudo conectar a {direccion}: {e}"))?;

    let config = Arc::new(russh::client::Config::default());
    let manejador = ManejadorSsh { llave_host_esperada: params.llave_host_esperada.clone() };
    let mut manejador = russh::client::connect_stream(config, flujo, manejador)
        .await
        .map_err(|e| format!("negociación SSH falló: {e}"))?;

    // authenticate_password() devuelve Result<bool, Error> en esta version (no una struct con .success()).
    let autenticado = manejador
        .authenticate_password(&params.usuario, &params.contrasena)
        .await
        .map_err(|e| format!("fallo de autenticación: {e}"))?;
    if !autenticado {
        return Err("usuario o contraseña incorrectos".into());
    }

    let canal = manejador
        .channel_open_session()
        .await
        .map_err(|e| format!("no se pudo abrir el canal: {e}"))?;
    let canal_id = canal.id();
    canal
        .request_pty(false, "xterm-256color", 80, 24, 0, 0, &[])
        .await
        .map_err(|e| format!("no se pudo solicitar la PTY: {e}"))?;
    canal
        .request_shell(false)
        .await
        .map_err(|e| format!("no se pudo solicitar el shell: {e}"))?;

    let sesion_id = params.sesion_id.clone();
    let (tx, mut rx) = mpsc::unbounded_channel::<ComandoSsh>();

    // Tarea única, dueña exclusiva del Channel: multiplexa entre mensajes entrantes (wait(), necesita
    // &mut self) y comandos salientes (data()/window_change()/close(), toman &self pero se serializan
    // igual porque solo esta tarea tiene el Channel) -- ver nota de verificación en la cabecera.
    let app_evento = app.clone();
    tokio::spawn(async move {
        let mut canal = canal;
        loop {
            tokio::select! {
                mensaje = canal.wait() => {
                    match mensaje {
                        Some(ChannelMsg::Data { data }) => {
                            let _ = app_evento.emit(&format!("ssh-datos-{sesion_id}"), data.to_vec());
                        }
                        Some(ChannelMsg::Close) | Some(ChannelMsg::Eof) | None => break,
                        _ => {}
                    }
                }
                comando = rx.recv() => {
                    match comando {
                        Some(ComandoSsh::Datos(datos)) => {
                            let _ = canal.data(&datos[..]).await;
                        }
                        Some(ComandoSsh::Redimensionar(columnas, filas)) => {
                            let _ = canal.window_change(columnas, filas, 0, 0).await;
                        }
                        Some(ComandoSsh::Cerrar) | None => {
                            let _ = canal.close().await;
                            break;
                        }
                    }
                }
            }
        }
        let _ = app_evento.emit(&format!("ssh-cerrado-{sesion_id}"), ());
    });

    estado.sesiones.lock().await.insert(
        params.sesion_id,
        SesionSsh { entrada: tx, _canal_id: canal_id, _manejador: manejador },
    );
    Ok(())
}

/// Envía lo que el técnico escribe en la terminal al canal PTY remoto.
#[tauri::command]
pub async fn ssh_enviar(estado: State<'_, EstadoSsh>, sesion_id: String, datos: String) -> Result<(), String> {
    let sesiones = estado.sesiones.lock().await;
    let sesion = sesiones.get(&sesion_id).ok_or("sesión SSH no encontrada")?;
    sesion
        .entrada
        .send(ComandoSsh::Datos(datos.into_bytes()))
        .map_err(|_| "el canal SSH ya se cerró".to_string())
}

/// Notifica el cambio de tamaño de la terminal (el usuario redimensiona la ventana).
#[tauri::command]
pub async fn ssh_redimensionar(
    estado: State<'_, EstadoSsh>,
    sesion_id: String,
    columnas: u32,
    filas: u32,
) -> Result<(), String> {
    let sesiones = estado.sesiones.lock().await;
    let sesion = sesiones.get(&sesion_id).ok_or("sesión SSH no encontrada")?;
    sesion
        .entrada
        .send(ComandoSsh::Redimensionar(columnas, filas))
        .map_err(|_| "el canal SSH ya se cerró".to_string())
}

/// Cierra la sesión SSH (best-effort) y libera el estado.
#[tauri::command]
pub async fn ssh_cerrar(estado: State<'_, EstadoSsh>, sesion_id: String) -> Result<(), String> {
    let mut sesiones = estado.sesiones.lock().await;
    if let Some(sesion) = sesiones.remove(&sesion_id) {
        let _ = sesion.entrada.send(ComandoSsh::Cerrar);
        let _ = sesion._manejador.disconnect(Disconnect::ByApplication, "", "en").await;
    }
    Ok(())
}
