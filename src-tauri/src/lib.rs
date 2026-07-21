// Núcleo Rust de plant-app-vpn (Tauri v2). Aquí vive la lógica sensible/de SO que NO debe estar en el
// frontend web: control de la NIC/túnel WireGuard en Windows, PTY de la terminal SSH y transferencia SFTP
// (Fase 6.2). El frontend solo invoca comandos de esta allowlist; nunca ejecuta shell arbitrario.
//
// Este arranque (6.1) solo expone `ping`, para confirmar el puente frontend↔Rust. Los comandos reales se
// agregan en la Fase 6.2. Un comando definido en lib.rs NO debe ser `pub`. Ver 07-app-vpn.md.

/// Comando de prueba del puente: el frontend lo invoca con invoke('ping') y recibe "pong".
#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

/// Arranca la app Tauri. Se llama desde main.rs (y a futuro desde el entrypoint móvil).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // TODO(Fase 6.2): registrar aquí los comandos reales (wireguard, ssh_pty, sftp).
        .invoke_handler(tauri::generate_handler![ping])
        .run(tauri::generate_context!())
        .expect("error al arrancar plant-app-vpn");
}
