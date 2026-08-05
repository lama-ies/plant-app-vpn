//! Transferencia de archivos por SFTP (Fase 6.2.3), rol Administrador, sobre el mismo túnel WireGuard hacia
//! la PC de sitio. Es una funcionalidad DISTINTA de los "respaldos" versionados (esos van por S3 vía
//! `Plant_Respaldos`, presigned URLs desde el portal/app) — esto es transferencia ad-hoc de archivos.
//!
//! Cada operación abre su propia conexión SSH+SFTP (no se comparte con las sesiones de `ssh.rs`, que son
//! para la terminal interactiva) — más simple y evita compartir estado entre features independientes.
//!
//! Mismo pineo de huella de host que `ssh.rs` (ver su cabecera y el fix de seguridad ahí documentado): con
//! huella esperada presente, la exige; sin ella (`llave_host_esperada: None`), `abrir_sftp` rechaza la
//! conexión con un mensaje claro en vez de aceptar cualquier llave — nunca hay una rama "acepta lo que sea".
//! NOTA DE VERIFICACIÓN (2026-08-05, primera compilación real): mismo hallazgo que `ssh.rs` — en russh
//! 0.45.0 no existe `HashAlg` ni `russh::keys::PublicKey` (es `russh::keys::key::PublicKey`, API vieja),
//! `fingerprint()` no toma algoritmo y no incluye el prefijo `SHA256:`, y `authenticate_password()`
//! devuelve `bool` directo (no una struct con `.success()`). Ver detalle en ssh.rs.

use russh::client::Handler;
use russh::keys::key::PublicKey;
use russh_sftp::client::SftpSession;
use russh_sftp::protocol::OpenFlags;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

/// Manejador SSH del transporte SFTP: mismo criterio que `ssh.rs::ManejadorSsh` — sin huella conocida,
/// rechaza por defecto (defensa en profundidad; el rechazo con mensaje para el técnico ocurre antes, en
/// el guard de `abrir_sftp`).
struct ManejadorSsh {
    llave_host_esperada: Option<String>,
}

#[async_trait::async_trait]
impl Handler for ManejadorSsh {
    type Error = russh::Error;
    async fn check_server_key(&mut self, clave: &PublicKey) -> Result<bool, Self::Error> {
        match &self.llave_host_esperada {
            // fingerprint() no incluye el prefijo "SHA256:" en esta version -- se agrega antes de comparar.
            Some(esperada) => Ok(&format!("SHA256:{}", clave.fingerprint()) == esperada),
            // Fix de seguridad: antes era `Ok(true)` (acepta cualquier llave sin verificar -> MITM).
            None => Ok(false),
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParametrosSftp {
    pub host: String,
    pub puerto: u16,
    pub usuario: String,
    pub contrasena: String,
    /// Huella SHA-256 del host (`SHA256:...`) registrada en `Plant_PCs`. Si viene en `None`, `abrir_sftp`
    /// rechaza la conexión antes de intentar nada — ver el guard ahí y la cabecera del archivo.
    pub llave_host_esperada: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntradaRemota {
    pub nombre: String,
    pub es_directorio: bool,
    pub tamano_bytes: u64,
}

/// Abre una sesión SSH+SFTP nueva (una por operación). Helper interno, no expuesto como comando.
async fn abrir_sftp(params: &ParametrosSftp) -> Result<SftpSession, String> {
    // Mismo guard que `ssh.rs::ssh_conectar`: sin huella de host conocida no se conecta (antes se
    // aceptaba cualquier llave, que es el bug de seguridad que este guard cierra).
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
    canal
        .request_subsystem(true, "sftp")
        .await
        .map_err(|e| format!("no se pudo solicitar el subsistema sftp: {e}"))?;
    SftpSession::new(canal.into_stream())
        .await
        .map_err(|e| format!("no se pudo iniciar la sesión sftp: {e}"))
}

/// Lista el contenido de un directorio remoto.
#[tauri::command]
pub async fn sftp_listar(params: ParametrosSftp, ruta: String) -> Result<Vec<EntradaRemota>, String> {
    let sftp = abrir_sftp(&params).await?;
    let entradas = sftp
        .read_dir(ruta)
        .await
        .map_err(|e| format!("no se pudo listar el directorio: {e}"))?;
    Ok(entradas
        .map(|e| EntradaRemota {
            nombre: e.file_name(),
            es_directorio: e.file_type().is_dir(),
            tamano_bytes: e.metadata().len(),
        })
        .collect())
}

/// Sube un archivo local a una ruta remota (crea/trunca).
#[tauri::command]
pub async fn sftp_subir(params: ParametrosSftp, ruta_local: String, ruta_remota: String) -> Result<(), String> {
    let sftp = abrir_sftp(&params).await?;
    let contenido = tokio::fs::read(&ruta_local)
        .await
        .map_err(|e| format!("no se pudo leer el archivo local: {e}"))?;
    let mut archivo = sftp
        .open_with_flags(ruta_remota, OpenFlags::CREATE | OpenFlags::WRITE | OpenFlags::TRUNCATE)
        .await
        .map_err(|e| format!("no se pudo abrir el archivo remoto: {e}"))?;
    archivo
        .write_all(&contenido)
        .await
        .map_err(|e| format!("no se pudo escribir el archivo remoto: {e}"))?;
    archivo.flush().await.map_err(|e| format!("no se pudo confirmar la escritura: {e}"))
}

/// Descarga un archivo remoto a una ruta local.
#[tauri::command]
pub async fn sftp_descargar(params: ParametrosSftp, ruta_remota: String, ruta_local: String) -> Result<(), String> {
    let sftp = abrir_sftp(&params).await?;
    let mut archivo = sftp
        .open(ruta_remota)
        .await
        .map_err(|e| format!("no se pudo abrir el archivo remoto: {e}"))?;
    let mut contenido = Vec::new();
    archivo
        .read_to_end(&mut contenido)
        .await
        .map_err(|e| format!("no se pudo leer el archivo remoto: {e}"))?;
    tokio::fs::write(&ruta_local, contenido)
        .await
        .map_err(|e| format!("no se pudo escribir el archivo local: {e}"))
}
