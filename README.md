# plant-app-vpn

App de escritorio **Windows (Tauri v2)** de **IES Monitor Plant**. Frontend React + Vite + TypeScript con
un **núcleo Rust** (`src-tauri/`) para la lógica sensible/de SO. Fusiona `plant-vpn-client` +
`plant-portal-admin`. Ver `plant-arquitectura/07-app-vpn.md`.

## Funciones (por rol Administrador > Gerente > Coordinador > Técnico)

- Conexión VPN a los equipos (NIC virtual, IPs virtuales), respaldos versionados por equipo (S3).
- Terminal SSH y transferencia de archivos (SFTP) — rol Administrador.
- Auditoría de conexiones de técnicos; panel de errores del sistema (tabla `Errores`).
- Alta de clientes/PCs/plantas, gestión de zonas y gerentes.
- **Editor de perfiles de dispositivo** (esquema canónico en `11-perfiles-dispositivo.md`) con
  import/export Excel y plantillas base/personalizadas.

## Estructura

```
src/                 frontend React (i18n, auth pool Staff, api, pantallas — Fase 6.4–6.6)
src-tauri/           núcleo Rust (Tauri v2): comandos seguros de WireGuard/SSH/SFTP — Fase 6.2
  Cargo.toml · tauri.conf.json · build.rs · src/{main,lib}.rs · capabilities/
```

## Desarrollo

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm build   # frontend (no requiere Rust)
pnpm tauri dev                               # app completa (requiere toolchain Rust + build tools Windows)
```

Estado: **6.1 scaffolding** (frontend base + esqueleto Rust con el comando `ping`). Las pantallas y los
comandos reales (VPN/SSH/SFTP) se construyen en la Fase 6.2–6.6. El frontend compila y corre; el núcleo
Rust y el instalador firmado se validan con el toolchain en Fase 9.
