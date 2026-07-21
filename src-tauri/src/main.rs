// Entrypoint del binario de escritorio. Evita abrir una consola extra en Windows en modo release y delega
// toda la lógica a `run()` de la librería (lib.rs), para poder reutilizarla a futuro (ej. móvil).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    plant_app_vpn_lib::run();
}
