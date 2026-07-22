//! Terminal SSH embebida (Fase 6.2.2), rol Administrador. Abre un canal PTY sobre el túnel WireGuard hacia
//! la IP virtual de la PC de sitio, reenvía la salida al frontend como eventos (`ssh-datos-{sesionId}`) y
//! recibe entrada/resize por comandos. Usa `russh` (SSH puro en Rust, sin libssh2/OpenSSL nativo).
//!
//! SEGURIDAD: `ManejadorSsh::check_server_key` pinea contra la huella SHA-256 del host registrada en
//! `Plant_PCs` (misma idea que su llave pública de WireGuard), pasada por el frontend en
//! `ParametrosConexionSsh.llave_host_esperada`. **Mientras el onboarding en `Plant_PCs` que la registra no
//! exista (Fase 9), ese campo llega en `None` y la conexión se acepta sin pinear** — placeholder explícito,
//! no silencioso, para no bloquear el resto del desarrollo. En cuanto el frontend empiece a enviar la
//! huella esperada, la verificación queda cerrada automáticamente (sin tocar este archivo otra vez). NO usar
//! contra una red no confiable mientras `llave_host_esperada` siga en `None`.
//!
//! NOTA DE VERIFICACIÓN: sin toolchain Rust en este equipo, este archivo no se compiló. La superficie
//! exacta de la API de `russh` (nombres de tipos/métodos) se ajusta al compilar en Fase 9 contra la
//! versión fijada en Cargo.toml; el diseño (canal PTY + eventos + estado por sesión + pineo de huella) sí
//! es el definitivo.

use russh::client::{Handle, Handler};
use russh::keys::HashAlg;
use russh::{ChannelId, ChannelMsg, ChannelWriteHalf, Disconnect};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

/// Manejador SSH: si trae una huella esperada, rechaza cualquier otra llave de host (pineo real). Sin
/// huella (todavía no hay registro en `Plant_PCs`), acepta cualquiera — ver el TODO de seguridad arriba.
struct ManejadorSsh {
    llave_host_esperada: Option<String>,
}

#[async_trait::async_trait]
impl Handler for ManejadorSsh {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        clave_servidor: &russh::keys::PublicKey,
    ) -> Result<bool, Self::Error> {
        match &self.llave_host_esperada {
            Some(esperada) => {
                let huella = clave_servidor.fingerprint(HashAlg::Sha256).to_string();
                Ok(&huella == esperada)
            }
            None => Ok(true), // TODO(seguridad, Fase 9): sin huella registrada aún en Plant_PCs.
        }
    }
}

/// Una sesión SSH viva: el extremo de escritura del canal + el handle (se mantiene vivo mientras exista).
struct SesionSsh {
    escritura: ChannelWriteHalf<russh::client::Msg>,
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
    /// Huella SHA-256 del host (`SHA256:...`) registrada en `Plant_PCs`; `None` mientras ese registro no
    /// exista todavía (Fase 9). Ver el TODO de seguridad en la cabecera del archivo.
    pub llave_host_esperada: Option<String>,
}

/// Abre la sesión SSH + PTY + shell, y arranca la tarea que reenvía la salida como eventos.
#[tauri::command]
pub async fn ssh_conectar(
    app: AppHandle,
    estado: State<'_, EstadoSsh>,
    params: ParametrosConexionSsh,
) -> Result<(), String> {
    let direccion = format!("{}:{}", params.host, params.puerto);
    let flujo = tokio::net::TcpStream::connect(&direccion)
        .await
        .map_err(|e| format!("no se pudo conectar a {direccion}: {e}"))?;

    let config = Arc::new(russh::client::Config::default());
    let manejador = ManejadorSsh { llave_host_esperada: params.llave_host_esperada.clone() };
    let mut manejador = russh::client::connect_stream(config, flujo, manejador)
        .await
        .map_err(|e| format!("negociación SSH falló: {e}"))?;

    let autenticado = manejador
        .authenticate_password(&params.usuario, &params.contrasena)
        .await
        .map_err(|e| format!("fallo de autenticación: {e}"))?;
    if !autenticado.success() {
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

    let (mut lectura, escritura) = canal.split();
    let sesion_id = params.sesion_id.clone();

    // Tarea que reenvía la salida de la PTY al frontend hasta que el canal cierre.
    let app_evento = app.clone();
    tokio::spawn(async move {
        while let Some(mensaje) = lectura.wait().await {
            match mensaje {
                ChannelMsg::Data { data } => {
                    let _ = app_evento.emit(&format!("ssh-datos-{sesion_id}"), data.to_vec());
                }
                ChannelMsg::Close | ChannelMsg::Eof => break,
                _ => {}
            }
        }
        let _ = app_evento.emit(&format!("ssh-cerrado-{sesion_id}"), ());
    });

    estado.sesiones.lock().await.insert(
        params.sesion_id,
        SesionSsh { escritura, _canal_id: canal_id, _manejador: manejador },
    );
    Ok(())
}

/// Envía lo que el técnico escribe en la terminal al canal PTY remoto.
#[tauri::command]
pub async fn ssh_enviar(estado: State<'_, EstadoSsh>, sesion_id: String, datos: String) -> Result<(), String> {
    let mut sesiones = estado.sesiones.lock().await;
    let sesion = sesiones.get_mut(&sesion_id).ok_or("sesión SSH no encontrada")?;
    sesion
        .escritura
        .data(datos.as_bytes())
        .await
        .map_err(|e| format!("no se pudo enviar al canal: {e}"))
}

/// Notifica el cambio de tamaño de la terminal (el usuario redimensiona la ventana).
#[tauri::command]
pub async fn ssh_redimensionar(
    estado: State<'_, EstadoSsh>,
    sesion_id: String,
    columnas: u32,
    filas: u32,
) -> Result<(), String> {
    let mut sesiones = estado.sesiones.lock().await;
    let sesion = sesiones.get_mut(&sesion_id).ok_or("sesión SSH no encontrada")?;
    sesion
        .escritura
        .window_change(columnas, filas, 0, 0)
        .await
        .map_err(|e| format!("no se pudo redimensionar la PTY: {e}"))
}

/// Cierra la sesión SSH (best-effort) y libera el estado.
#[tauri::command]
pub async fn ssh_cerrar(estado: State<'_, EstadoSsh>, sesion_id: String) -> Result<(), String> {
    let mut sesiones = estado.sesiones.lock().await;
    if let Some(sesion) = sesiones.remove(&sesion_id) {
        let _ = sesion.escritura.close().await;
        let _ = sesion._manejador.disconnect(Disconnect::ByApplication, "", "en").await;
    }
    Ok(())
}
