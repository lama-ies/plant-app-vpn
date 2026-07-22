// Núcleo Rust de plant-app-vpn (Tauri v2). Aquí vive la lógica sensible/de SO que NO debe estar en el
// frontend web: control de la NIC/túnel WireGuard en Windows (`wireguard.rs`), terminal SSH embebida
// (`ssh.rs`) y transferencia de archivos por SFTP (`sftp.rs`) — Fase 6.2. El frontend solo invoca estos
// comandos (allowlist); nunca ejecuta shell arbitrario. Ver plant-arquitectura/07-app-vpn.md.
//
// NOTA DE VERIFICACIÓN: sin toolchain Rust en el equipo de desarrollo, este módulo no se compiló en esta
// sesión. Se valida con `cargo check`/`cargo build` en Fase 9.

mod sftp;
mod ssh;
mod wireguard;

/// Comando de prueba del puente frontend↔Rust (se mantiene como healthcheck del núcleo).
#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

/// Arranca la app Tauri. Se llama desde main.rs.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(ssh::EstadoSsh::default())
        .invoke_handler(tauri::generate_handler![
            ping,
            wireguard::vpn_generar_par,
            wireguard::vpn_conectar,
            wireguard::vpn_desconectar,
            wireguard::vpn_estado,
            ssh::ssh_conectar,
            ssh::ssh_enviar,
            ssh::ssh_redimensionar,
            ssh::ssh_cerrar,
            sftp::sftp_listar,
            sftp::sftp_subir,
            sftp::sftp_descargar,
        ])
        .run(tauri::generate_context!())
        .expect("error al arrancar plant-app-vpn");
}
