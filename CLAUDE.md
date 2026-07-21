# CLAUDE.md — plant-app-vpn

Instrucciones para Claude Code dentro de este repo. Las convenciones generales (comentarios y commits en
español, documentar el propósito, verificación obligatoria, versionado `vX.Y.Z`, flujo de commit, no
ejecutar git) están en el `CLAUDE.md` raíz de `MonitorPlant` y en `plant-arquitectura/`. Aquí lo específico.

## Qué es

App de escritorio **Windows (Tauri v2)**: frontend React+Vite+TS + **núcleo Rust** (`src-tauri/`) para la
lógica sensible/de SO. Fusiona `plant-vpn-client` + `plant-portal-admin`: VPN + SSH/transferencia +
administración interna (roles, zonas, alta de clientes/PCs/plantas, editor de perfiles, auditoría,
respaldos, panel de errores). Detalle en `plant-arquitectura/07-app-vpn.md` y `plan-de-trabajo.md` Fase 6.

## Reglas específicas

- **Cuentas independientes del portal**: pool Cognito **Staff** (no el pool del portal). Roles
  Administrador > Gerente > Coordinador > Técnico.
- **Lógica sensible SOLO en Rust** (`src-tauri/`): control de NIC/WireGuard, PTY de SSH, SFTP. El frontend
  invoca comandos de una allowlist; nunca shell arbitrario. Un comando en `lib.rs` no debe ser `pub`.
- i18n obligatorio (es/en/fr/pt), Lucide, sin emojis, `.tsx`. Diseño con los plugins (frontend-design /
  ui-ux-pro-max / impeccable).
- El **perfil de dispositivo** que edita `EditorPerfil.tsx` sigue el esquema canónico de
  `plant-arquitectura/11-perfiles-dispositivo.md` (no inventar campos).
- Antes de escribir contra una librería/SDK (Tauri v2, aws-amplify, etc.), consultar la MCP **context7**.

## Stack y comandos

- Frontend: `pnpm dev` (Vite, puerto 5174), `pnpm build` (tsc -b + vite), `pnpm typecheck`, `pnpm lint`.
- App completa (requiere toolchain Rust + build tools de Windows): `pnpm tauri dev` / `pnpm tauri build`.

## Verificación

- El **frontend** se verifica con `pnpm typecheck` + `pnpm lint` + `pnpm build` (sin toolchain Rust).
- El **núcleo Rust** y el instalador firmado se compilan/validan con el toolchain (Fase 9). No asumir que
  compilan sin haberlos construido.
