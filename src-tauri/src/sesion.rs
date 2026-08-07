//! Identidad del usuario dentro del NÚCLEO Rust, para poder autorizar los comandos sensibles
//! (SSH, SFTP) sin depender de que el frontend diga la verdad.
//!
//! # Por qué existe (hallazgo crítico de la auditoría 2026-08-07)
//!
//! `ssh_conectar`, `sftp_subir` y compañía están registrados en `generate_handler!` y no recibían ni
//! consultaban ninguna identidad: la ÚNICA barrera era que `usePermissions` ocultara los botones en el
//! frontend. Como el inspector está habilitado a propósito también en release (ver Cargo.toml), cualquier
//! Técnico o Coordinador autenticado podía abrirlo e invocar directamente
//! `__TAURI__.core.invoke('ssh_conectar', ...)` con la `direccionVirtual` y la huella que él mismo obtiene
//! de `GET /app-vpn/pcs`, y quedarse con una shell en la PC de sitio del cliente. Ninguna lambda participa
//! en esa ruta: es todo local, así que la autorización del backend no lo frena. `07-app-vpn.md` es
//! explícito en que SSH y transferencia de archivos son EXCLUSIVOS de Administrador (ni siquiera Gerente).
//!
//! # Por qué se consulta al backend y no se cree al frontend
//!
//! Guardar aquí un "rol" que el propio frontend envía no serviría de nada: quien puede invocar un comando
//! desde el inspector también puede invocar el que fija el rol. Lo único que el frontend NO puede
//! falsificar es un ID token firmado por Cognito. Así que aquí se guarda el TOKEN, y el rol se resuelve
//! preguntándole al backend (`POST /app-vpn/staff-login`, que devuelve la identidad resuelta server-side
//! contra `Plant_StaffUsuarios`, nunca desde claims del JWT). La URL de la API está COMPILADA en el
//! binario: si se recibiera del frontend, bastaría con apuntarla a un servidor propio que conteste
//! "administrador".

use std::time::{Duration, Instant};
use tokio::sync::Mutex;

/// Base de la API, fija en el binario a propósito (ver nota de cabecera). Es el mismo origen que declara
/// la CSP en `tauri.conf.json`; si cambia uno, debe cambiar el otro.
const API_BASE: &str = "https://dgoamfqs8drqt.cloudfront.net";

/// Cuánto se reusa un rol ya verificado antes de volver a preguntarle al backend. Corto a propósito: si a
/// un usuario le bajan el rol, deja de poder abrir sesiones nuevas en menos de un minuto.
const VIGENCIA_ROL: Duration = Duration::from_secs(60);

/// Rol que exige el núcleo para SSH/SFTP (07-app-vpn.md).
const ROL_REQUERIDO: &str = "administrador";

#[derive(Clone)]
struct RolVerificado {
    rol: String,
    verificado_en: Instant,
}

/// Estado de sesión del núcleo. Lo registra `lib.rs` con `.manage(...)`.
#[derive(Default)]
pub struct EstadoSesion {
    /// ID token de Cognito del usuario que inició sesión en la app.
    token: Mutex<Option<String>>,
    /// Último rol confirmado por el backend, con su marca de tiempo (caché corta).
    cache: Mutex<Option<RolVerificado>>,
}

/// Guarda el ID token tras iniciar sesión. Lo llama el frontend en `AuthProvider`.
#[tauri::command]
pub async fn sesion_establecer(
    estado: tauri::State<'_, EstadoSesion>,
    token: String,
) -> Result<(), String> {
    if token.trim().is_empty() {
        return Err("token vacío".to_string());
    }
    *estado.token.lock().await = Some(token);
    // Un token nuevo invalida el rol cacheado del anterior.
    *estado.cache.lock().await = None;
    Ok(())
}

/// Borra la sesión del núcleo (cierre de sesión o expiración). Idempotente.
#[tauri::command]
pub async fn sesion_cerrar(estado: tauri::State<'_, EstadoSesion>) -> Result<(), String> {
    *estado.token.lock().await = None;
    *estado.cache.lock().await = None;
    Ok(())
}

/// Respuesta de `POST /app-vpn/staff-login` (solo se lee el rol; el resto se ignora).
#[derive(serde::Deserialize)]
struct IdentidadStaff {
    rol: Option<String>,
}

/// Consulta el rol REAL al backend usando el token guardado.
async fn consultar_rol(token: &str) -> Result<String, String> {
    let cliente = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("no se pudo crear el cliente HTTP: {e}"))?;

    let respuesta = cliente
        .post(format!("{API_BASE}/app-vpn/staff-login"))
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("no se pudo verificar la identidad: {e}"))?;

    if !respuesta.status().is_success() {
        return Err(format!(
            "el backend rechazó la identidad (HTTP {})",
            respuesta.status().as_u16()
        ));
    }

    let identidad: IdentidadStaff = respuesta
        .json()
        .await
        .map_err(|e| format!("respuesta de identidad ilegible: {e}"))?;

    identidad
        .rol
        .map(|r| r.trim().to_lowercase())
        .ok_or_else(|| "el backend no devolvió un rol".to_string())
}

/// Exige que el usuario de la sesión sea Administrador. Devuelve `Err` (que Tauri entrega al frontend como
/// error del comando) en cualquier otro caso, incluido "no hay sesión".
///
/// Se usa al INICIO de todo comando que abra un canal hacia la PC de sitio.
pub async fn exigir_administrador(estado: &EstadoSesion) -> Result<(), String> {
    // Caché corta: evita una llamada de red por cada pulsación de tecla en la terminal.
    if let Some(previo) = estado.cache.lock().await.clone() {
        if previo.verificado_en.elapsed() < VIGENCIA_ROL {
            return si_es_administrador(&previo.rol);
        }
    }

    let token = estado
        .token
        .lock()
        .await
        .clone()
        .ok_or_else(|| "AUTH_ACCESS_DENIED: no hay sesión iniciada en el núcleo".to_string())?;

    let rol = consultar_rol(&token).await?;
    *estado.cache.lock().await = Some(RolVerificado {
        rol: rol.clone(),
        verificado_en: Instant::now(),
    });
    si_es_administrador(&rol)
}

fn si_es_administrador(rol: &str) -> Result<(), String> {
    if rol == ROL_REQUERIDO {
        Ok(())
    } else {
        Err(format!(
            "AUTH_ACCESS_DENIED: esta acción es exclusiva de Administrador (rol actual: {rol})"
        ))
    }
}
