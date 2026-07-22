//! Control de la NIC/túnel WireGuard en Windows (Fase 6.2.1).
//!
//! Windows no expone `wg`/`wg-quick` como en Linux: el instalador oficial de WireGuard trae
//! `wireguard.exe`, que administra túneles como SERVICIOS de Windows a partir de un archivo `.conf`
//! (`/installtunnelservice <ruta>`, `/uninstalltunnelservice <nombre>`). Ese es el mecanismo que este
//! módulo invoca — sin interpolar nada en un shell (argumentos por array a `Command`, igual que
//! plant-vpn-server/plant-vpn-plc en Linux).
//!
//! NOTA DE VERIFICACIÓN: este archivo no se compiló en esta sesión (no hay toolchain Rust instalado en
//! el equipo de desarrollo). Se valida con `cargo check`/`cargo build` y contra WireGuard real en Fase 9.

use base64::prelude::{Engine as _, BASE64_STANDARD};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use x25519_dalek::{PublicKey, StaticSecret};

/// Par de llaves WireGuard (Curve25519, base64 estándar — mismo formato que `wg genkey`/`wg pubkey`).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ParLlavesWireGuard {
    pub public_key: String,
    pub private_key: String,
}

/// Genera un par de llaves WireGuard nuevo para esta sesión de la app (nunca se persiste ni se reutiliza
/// entre conexiones — cada "Establecer conexión" pide un peer temporal nuevo a `Plant_AccesoVPN`, con su
/// propio par). Windows no expone `wg genkey`, así que se genera con Curve25519 puro en Rust.
#[tauri::command]
pub fn vpn_generar_par() -> ParLlavesWireGuard {
    let privada = StaticSecret::random();
    let publica = PublicKey::from(&privada);
    ParLlavesWireGuard {
        public_key: BASE64_STANDARD.encode(publica.as_bytes()),
        private_key: BASE64_STANDARD.encode(privada.to_bytes()),
    }
}

/// Datos para levantar un túnel hacia UN vpn-plc (los mismos que devuelve `Plant_AccesoVPN`).
/// `rename_all = "camelCase"` para que el frontend TS pueda pasar las claves tal cual las devuelve la API
/// (`direccionCliente`, etc.) sin tener que traducirlas a snake_case a mano.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfiguracionPeer {
    /// Nombre del túnel/servicio (ej. derivado de `sesionId`); identifica el servicio de Windows.
    pub nombre_tunel: String,
    /// Llave privada del cliente (se genera en el frontend/Rust al primer uso; nunca se loguea).
    pub private_key: String,
    /// IP virtual propia del cliente dentro de la VPN, sin CIDR (ej. "10.100.1.5").
    pub direccion_local: String,
    /// Llave pública de plant-vpn-server.
    pub servidor_public_key: String,
    /// Endpoint público del servidor ("host:puerto").
    pub endpoint: String,
    /// AllowedIPs: SOLO la IP virtual del vpn-plc autorizado, como /32 (aislamiento — ver 05-vpn.md).
    pub allowed_ips: String,
}

#[derive(Debug, Serialize)]
pub struct EstadoTunel {
    pub nombre: String,
    pub activo: bool,
}

/// Ruta de instalación estándar del WireGuard oficial para Windows.
fn ruta_wireguard_exe() -> PathBuf {
    PathBuf::from(r"C:\Program Files\WireGuard\wireguard.exe")
}

/// Construye el contenido del `.conf` del túnel (PURO — no toca disco ni procesos).
fn construir_conf(cfg: &ConfiguracionPeer) -> String {
    format!(
        "[Interface]\nPrivateKey = {}\nAddress = {}/32\n\n[Peer]\nPublicKey = {}\nEndpoint = {}\nAllowedIPs = {}\nPersistentKeepalive = 25\n",
        cfg.private_key, cfg.direccion_local, cfg.servidor_public_key, cfg.endpoint, cfg.allowed_ips
    )
}

/// Levanta el túnel: escribe un `.conf` temporal e instala el servicio de WireGuard. Borra el `.conf`
/// (con la llave privada) apenas termina, esté ok o no — nunca debe quedar la privada en disco fuera del
/// almacén cifrado del servicio de WireGuard.
#[tauri::command]
pub async fn vpn_conectar(cfg: ConfiguracionPeer) -> Result<EstadoTunel, String> {
    tokio::task::spawn_blocking(move || {
        let ruta = std::env::temp_dir().join(format!("{}.conf", cfg.nombre_tunel));
        std::fs::write(&ruta, construir_conf(&cfg))
            .map_err(|e| format!("no se pudo escribir la configuración temporal: {e}"))?;

        let resultado = Command::new(ruta_wireguard_exe())
            .arg("/installtunnelservice")
            .arg(&ruta)
            .output();

        let _ = std::fs::remove_file(&ruta); // best-effort: nunca dejar la llave privada en disco

        let salida = resultado.map_err(|e| format!("no se pudo invocar wireguard.exe: {e}"))?;
        if !salida.status.success() {
            return Err(format!(
                "wireguard.exe /installtunnelservice falló: {}",
                String::from_utf8_lossy(&salida.stderr)
            ));
        }
        Ok(EstadoTunel { nombre: cfg.nombre_tunel, activo: true })
    })
    .await
    .map_err(|e| format!("tarea de conexión VPN falló: {e}"))?
}

/// Baja el túnel (desinstala el servicio). Idempotente si ya no existe.
#[tauri::command]
pub async fn vpn_desconectar(nombre_tunel: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let salida = Command::new(ruta_wireguard_exe())
            .arg("/uninstalltunnelservice")
            .arg(&nombre_tunel)
            .output()
            .map_err(|e| format!("no se pudo invocar wireguard.exe: {e}"))?;
        if !salida.status.success() {
            return Err(format!(
                "wireguard.exe /uninstalltunnelservice falló: {}",
                String::from_utf8_lossy(&salida.stderr)
            ));
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("tarea de desconexión VPN falló: {e}"))?
}

/// Consulta si el servicio del túnel está corriendo (`sc query WireGuardTunnel$<nombre>`).
#[tauri::command]
pub async fn vpn_estado(nombre_tunel: String) -> Result<EstadoTunel, String> {
    tokio::task::spawn_blocking(move || {
        let salida = Command::new("sc")
            .args(["query", &format!("WireGuardTunnel${nombre_tunel}")])
            .output()
            .map_err(|e| format!("no se pudo consultar el servicio: {e}"))?;
        let texto = String::from_utf8_lossy(&salida.stdout);
        Ok(EstadoTunel { nombre: nombre_tunel, activo: texto.contains("RUNNING") })
    })
    .await
    .map_err(|e| format!("tarea de estado VPN falló: {e}"))?
}
