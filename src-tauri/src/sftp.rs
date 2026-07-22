//! Transferencia de archivos por SFTP (Fase 6.2.3), rol Administrador, sobre el mismo túnel WireGuard hacia
//! la PC de sitio. Es una funcionalidad DISTINTA de los "respaldos" versionados (esos van por S3 vía
//! `Plant_Respaldos`, presigned URLs desde el portal/app) — esto es transferencia ad-hoc de archivos.
//!
//! Cada operación abre su propia conexión SSH+SFTP (no se comparte con las sesiones de `ssh.rs`, que son
//! para la terminal interactiva) — más simple y evita compartir estado entre features independientes.
//!
//! Mismo pineo de huella de host que `ssh.rs` (ver su cabecera): con `llave_host_esperada: None` (todavía
//! sin registro en `Plant_PCs`, Fase 9) acepta cualquier llave; con huella presente, la exige.
//! NOTA DE VERIFICACIÓN: sin toolchain Rust, este archivo no se compiló en esta sesión.

use russh::client::Handler;
use russh::keys::HashAlg;
use russh_sftp::client::SftpSession;
use russh_sftp::protocol::OpenFlags;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

struct ManejadorSsh {
    llave_host_esperada: Option<String>,
}

#[async_trait::async_trait]
impl Handler for ManejadorSsh {
    type Error = russh::Error;
    async fn check_server_key(&mut self, clave: &russh::keys::PublicKey) -> Result<bool, Self::Error> {
        match &self.llave_host_esperada {
            Some(esperada) => Ok(&clave.fingerprint(HashAlg::Sha256).to_string() == esperada),
            None => Ok(true), // TODO(seguridad, Fase 9): sin huella registrada aún en Plant_PCs.
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
    /// Huella SHA-256 del host (`SHA256:...`) registrada en `Plant_PCs`; `None` mientras ese registro no
    /// exista todavía (Fase 9). Ver el TODO de seguridad en la cabecera del archivo.
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
