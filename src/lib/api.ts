// Capa de acceso a la API (API Gateway con dominio propio). Recurso propio de esta app: /app-vpn/*. El
// token (ID token de Cognito, pool Staff) lo obtiene Amplify y se adjunta como Authorization. Un 401
// fuerza el cierre de sesión (idempotente). Ver plant-arquitectura/07-app-vpn.md.
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import type { ModeloPLC, PerfilDispositivo, TipoAlarma, TipoPlanta } from '../perfiles/tipos';

// BUG encontrado en auditoría 2026-07-28: esta app es un binario de escritorio Tauri v2, no una SPA servida
// por un servidor propio. En dev, Vite reescribe '/api' hacia la API real (proxy same-origin, ver
// vite.config.ts) — pero `tauri build` NO empaqueta ese servidor: `frontendDist` sirve los archivos
// estáticos directo desde la webview, así que un `fetch('/api/...')` en producción intentaría resolver
// contra el propio origen de la webview (p.ej. `tauri://localhost` o `https://tauri.localhost`) y SIEMPRE
// fallaría (nunca llegaría a la API real). `src-tauri/tauri.conf.json` ya anticipaba esto en su CSP
// (`connect-src 'self' https://*.amazonaws.com https://*.iesinternacional.com`), pero el código nunca
// llegó a hacer la llamada directa. Fix: en build de producción (`import.meta.env.PROD`) se apunta directo
// a la URL real de la API (mismo patrón que `vite.config.ts` usa para el destino del proxy de dev); en dev
// se mantiene '/api' (same-origin vía el proxy de Vite, sin tocar nada ahí).
const BASE = import.meta.env.PROD
  ? (import.meta.env.VITE_API_BASE_URL ?? 'https://plant-api.iesinternacional.com')
  : '/api';

/** Error de API con el código de máquina y el status HTTP. */
export class ErrorApi extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

let redirigiendo = false;
function expirarSesion(): void {
  if (redirigiendo) return;
  redirigiendo = true;
  void signOut().finally(() => {
    if (!location.pathname.startsWith('/login')) location.replace('/login');
  });
}

async function idTokenActual(): Promise<string | null> {
  try {
    const s = await fetchAuthSession();
    return s.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

interface Opciones {
  cuerpo?: unknown;
  query?: Record<string, string | number | undefined>;
  cabeceras?: Record<string, string>;
}

function construirUrl(ruta: string, query?: Opciones['query']): string {
  const qs = new URLSearchParams();
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined) qs.set(k, String(v));
  const cola = qs.toString();
  return `${BASE}${ruta.startsWith('/') ? ruta : `/${ruta}`}${cola ? `?${cola}` : ''}`;
}

/** Ejecuta una petición a la API y devuelve el JSON. Lanza ErrorApi si no es 2xx. */
export async function peticion<T = unknown>(
  metodo: 'GET' | 'POST' | 'PUT' | 'DELETE',
  ruta: string,
  opciones: Opciones = {},
): Promise<T> {
  const cabeceras: Record<string, string> = { 'Content-Type': 'application/json', ...opciones.cabeceras };
  const token = await idTokenActual();
  if (token) cabeceras.Authorization = token;

  const resp = await fetch(construirUrl(ruta, opciones.query), {
    method: metodo,
    headers: cabeceras,
    body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
  });

  if (resp.status === 401) {
    expirarSesion();
    throw new ErrorApi(401, 'AUTH_UNAUTHORIZED', 'Sesión expirada');
  }

  const texto = await resp.text();
  const datos = texto ? JSON.parse(texto) : {};
  if (!resp.ok) {
    const code = typeof datos?.code === 'string' ? datos.code : `HTTP_${resp.status}`;
    const msg = typeof datos?.error === 'string' ? datos.error : `Error ${resp.status}`;
    throw new ErrorApi(resp.status, code, msg);
  }
  return datos as T;
}

// --- Sesión (identidad del personal Staff) -------------------------------------------------------------
// Contra Plant_StaffLogin (real, ver plant-lambdas/lambdas/Plant_StaffLogin) — resuelve rol/zonas server-side.

/** Perfil de sesión: resuelve rol/zonas del usuario autenticado (server-side, anti-IDOR). */
export function staffLogin() {
  return peticion('POST', '/app-vpn/staff-login');
}

// --- Activación de cuenta Staff (Plant_StaffValidateActivation / Plant_StaffConsumeActivation) --------
// Públicas (sin sesión): la pantalla "Activar cuenta" las usa ANTES de que exista un JWT.

export interface PreviewActivacionStaff {
  email: string;
  rol: string;
  nombre: string | null;
}

/** Valida el código de activación y devuelve un preview (rol) antes de pedir la contraseña. */
export function validarActivacionStaff(code: string) {
  return peticion<PreviewActivacionStaff>('POST', '/staff/activacion/validar', { cuerpo: { code } });
}

/** Confirma la activación (ya hecho signUp en Cognito) y marca la cuenta activa. */
export function consumirActivacionStaff(code: string, email: string) {
  return peticion<{ email: string; rol: string; estado: string }>('POST', '/staff/activacion/consumir', {
    cuerpo: { code, email },
  });
}

// --- Gestión de personal Staff (Plant_StaffUsuarios) — GestionStaff.tsx ---------------------------------

export interface UsuarioStaffApi {
  email: string;
  nombre: string | null;
  rol: string;
  zonaIds: string[];
  // 'expired' (código vencido, marcado perezoso) y 'suspended' faltaban aquí — el backend sí los usa
  // (Plant_StaffValidateActivation marca expired; Plant_StaffUsuarios PUT acepta suspended).
  estado: 'inactive' | 'active' | 'expired' | 'suspended';
  creadoEn: string;
}

export function listarStaff() {
  return peticion<{ usuarios: UsuarioStaffApi[] }>('GET', '/staff/usuarios');
}

export function invitarStaff(datos: { email: string; nombre?: string; rol: string; zonaIds?: string[] }) {
  return peticion<{ email: string; rol: string; expiraEnSeg?: number; correoEnviado: boolean; activationCode?: string }>(
    'POST',
    '/staff/usuarios',
    { cuerpo: datos },
  );
}

export function actualizarStaff(datos: {
  email: string;
  nombre?: string;
  rol?: string;
  zonaIds?: string[];
  estado?: string;
}) {
  return peticion<{ usuario: UsuarioStaffApi }>('PUT', '/staff/usuarios', { cuerpo: datos });
}

export function eliminarStaff(email: string) {
  return peticion<{ eliminado: string }>('DELETE', '/staff/usuarios', { query: { email } });
}

/** Reenvía una invitación pendiente (estado inactive/expired): regenera el código y reenvía el correo.
 * Ver plant-lambdas Plant_ResendStaffInvitation (auditoría pre-AWS 2026-07-31, hallazgo ALTO). */
export function reenviarInvitacionStaff(email: string) {
  return peticion<{ email: string; rol: string; expiresAt: string; correoEnviado: boolean; activationCode?: string }>(
    'POST',
    '/staff/usuarios/reenviar',
    { cuerpo: { email } },
  );
}

// --- PCs de sitio (Plant_PCs) — TarjetaEquipo.tsx (host-key/IP automáticos) y AltaCliente.tsx ------------

export interface PcApi {
  pcId: string;
  familiaId: string;
  zonaId: string | null;
  nombre: string;
  ubicacion: string | null;
  wireguardPublicKey: string;
  sshHostKeyFingerprint: string | null;
  direccionVirtual: string | null;
  creadoEn: string;
}

/** Lista las PCs de un cliente (para elegir a cuál conectarse). */
export function listarPcs(familiaId: string) {
  return peticion<{ pcs: PcApi[] }>('GET', '/app-vpn/pcs', { query: { familiaId } });
}

/** Trae una PC puntual — su `direccionVirtual`/`sshHostKeyFingerprint` alimentan la conexión automática. */
export function obtenerPc(pcId: string) {
  return peticion<{ pc: PcApi }>('GET', '/app-vpn/pcs', { query: { pcId } });
}

/** Alta de una PC nueva (sin pcId) o actualización de metadata (con pcId) — nunca reasigna la llave WireGuard. */
export function guardarPc(datos: {
  pcId?: string;
  familiaId: string;
  zonaId?: string;
  nombre: string;
  ubicacion?: string;
  wireguardPublicKey?: string;
  sshHostKeyFingerprint?: string;
}) {
  return peticion<{ pc: PcApi }>('PUT', '/app-vpn/pcs', { cuerpo: datos });
}

/** Da de baja una sola PC (cierre de hallazgo de auditoría 2026-07-31: antes solo se podía borrar retirando
 * la Familia completa). Rechaza con `PC_TIENE_EQUIPOS_ASIGNADOS` si algún equipo todavía la referencia. */
export function eliminarPc(pcId: string) {
  return peticion<{ eliminada: string }>('DELETE', '/app-vpn/pcs', { query: { pcId } });
}

// --- Equipos/plantas (Plant_Equipos) — AltaEquipo.tsx / GestionPlantillas.tsx, rol Administrador ---------

export interface EquipoApi {
  equipoId: string;
  familiaId: string;
  zonaId: string | null;
  pcId: string | null;
  nombre: string;
  tipoPlanta: TipoPlanta;
  modeloPLC: ModeloPLC;
  ip: string;
  puerto: number;
  creadoEn: string;
}

/** Lista los equipos (plantas) de un cliente. */
export function listarEquipos(familiaId: string) {
  return peticion<{ equipos: EquipoApi[] }>('GET', '/app-vpn/equipos', { query: { familiaId } });
}

/** Trae un equipo puntual — usado para resolver su `pcId` antes de desplegar su perfil. */
export function obtenerEquipo(equipoId: string) {
  return peticion<{ equipo: EquipoApi }>('GET', '/app-vpn/equipos', { query: { equipoId } });
}

/** Alta de un equipo nuevo (sin equipoId) o actualización de metadata (con equipoId). */
export function guardarEquipo(datos: {
  equipoId?: string;
  familiaId: string;
  zonaId?: string;
  pcId?: string;
  nombre: string;
  tipoPlanta: TipoPlanta;
  modeloPLC: ModeloPLC;
  ip: string;
  puerto: number;
}) {
  return peticion<{ equipo: EquipoApi }>('PUT', '/app-vpn/equipos', { cuerpo: datos });
}

// --- Acceso VPN (Plant_AccesoVPN) — TarjetaEquipo.tsx: "Establecer conexión" -----------------------------

export interface RespuestaAccesoVpn {
  sesionId: string;
  tipoAcceso: 'directo' | 'temporal';
  anchoBandaMbps: number;
  expiraEnSeg: number;
  servidorPublicKey: string;
  endpoint: string;
  /** IP efímera propia asignada a ESTA sesión — va en el `[Interface] Address=` del túnel local. */
  direccionCliente: string;
  /** IP virtual del vpn-plc destino — es el host al que apunta la terminal SSH/SFTP. */
  direccionVirtual: string;
  allowedIps: string[];
}

/** Pide acceso temporal a un `vpn-plc` (peer nuevo, TTL, ancho de banda por rol). */
export function solicitarAccesoVpn(pcId: string, publicKey: string) {
  return peticion<RespuestaAccesoVpn>('POST', '/acceso-vpn', { cuerpo: { pcId, publicKey } });
}

// --- Listado de familias (Plant_ListFamilias) — Filtros.tsx, rol Administrador (Staff) --------------------

export interface FamiliaApi {
  familiaId: string;
  numeroCliente: string;
  nombre: string;
  familyType: 'cliente' | 'so';
  pais: string | null;
  direccion: string | null;
}

/** Lista las Familias (clientes o S&O), opcionalmente filtradas por tipo. El filtro por texto es local. */
export function listarFamilias(tipo?: 'cliente' | 'so') {
  return peticion<{ familias: FamiliaApi[] }>('GET', '/staff/familias', { query: { tipo } });
}

// --- Alta de cliente (Plant_InviteFamilia) — AltaCliente.tsx, rol Administrador --------------------------

/** Pide una URL prefirmada para subir el logo de la familia (antes de crearla). */
export function urlSubidaLogoFamilia(nombreArchivo: string) {
  return peticion<{ s3Key: string; url: string }>('GET', '/staff/familias/invitar', {
    query: { accion: 'urlLogo', nombreArchivo },
  });
}

/** Sube el archivo directo a S3 con la URL prefirmada (sin pasar por la API). */
export async function subirLogoFamilia(url: string, archivo: File): Promise<void> {
  const resp = await fetch(url, { method: 'PUT', body: archivo, headers: { 'Content-Type': archivo.type } });
  if (!resp.ok) throw new ErrorApi(resp.status, 'S3_UPLOAD_FAILED', 'No se pudo subir el logo');
}

export interface RespuestaCrearFamilia {
  familiaId: string;
  numeroCliente: string;
  ownerEmail: string;
  rol: string;
  zonaIds: string[] | null;
  correoEnviado: boolean;
}

// --- Zonas (Plant_Zonas) — GestionZonas.tsx, rol Administrador (Staff opera cualquier familia) ----------

export interface ZonaApi {
  familiaId: string;
  zonaId: string;
  nombre: string;
  createdAt: string;
}

export function listarZonas(familiaId: string) {
  return peticion<{ zonas: ZonaApi[] }>('GET', '/zonas', { query: { familiaId } });
}

export function crearZona(familiaId: string, nombre: string) {
  return peticion<{ zona: ZonaApi }>('POST', '/zonas', { cuerpo: { familiaId, nombre } });
}

export function actualizarZona(familiaId: string, zonaId: string, nombre: string) {
  return peticion<{ zona: ZonaApi }>('PUT', '/zonas', { cuerpo: { familiaId, zonaId, nombre } });
}

export function eliminarZona(familiaId: string, zonaId: string) {
  return peticion<{ eliminada: string }>('DELETE', '/zonas', { query: { familiaId, zonaId } });
}

// --- Gerentes/miembros de una familia S&O (Plant_InviteUser) — GestionGerentes.tsx, rol Administrador ----

/** Invita a un rol dentro de una familia existente. Staff Administrador puede invitar incluso otro Gerente
 * peer (la matriz normal lo prohíbe entre pares; Staff no es miembro de ninguna familia). */
export function invitarMiembroFamilia(datos: { familiaId: string; email: string; nombre?: string; rol: string; zonaIds?: string[] }) {
  return peticion<{ email: string; rol: string; correoEnviado: boolean; activationCode?: string; link?: string }>(
    'POST',
    '/usuarios/invitar',
    { cuerpo: datos },
  );
}

/** Usuario (Cliente o S&O) de `Plant_Usuarios`, tal como lo ve Staff a través de Plant_ListUsers. */
export interface UsuarioFamiliaApi {
  email: string;
  nombre?: string;
  familiaId: string;
  familyType: 'cliente' | 'so';
  rol: string;
  zonaIds?: string[];
  status: 'active' | 'inactive' | 'expired' | 'suspended';
  invitedBy?: string;
  createdAt?: string;
}

/** Lista los usuarios (activos + pendientes) de una familia. Staff Administrador ve cualquier familia
 * completa (cierre de hallazgo de auditoría 2026-07-31: antes GestionGerentes.tsx invitaba a ciegas, sin
 * forma de ver/reenviar/cancelar después una invitación perdida). */
export function listarUsuariosFamilia(familiaId: string) {
  return peticion<{ usuarios: UsuarioFamiliaApi[] }>('GET', '/usuarios', { query: { familiaId } });
}

/** Reenvía una invitación pendiente (inactive/expired) de un usuario de la familia. */
export function reenviarInvitacionFamilia(familiaId: string, email: string) {
  return peticion<{ email: string; rol: string; correoEnviado: boolean; activationCode?: string; link?: string }>(
    'POST',
    '/usuarios/invitar/reenviar',
    { cuerpo: { familiaId, email } },
  );
}

/** Elimina/cancela un usuario (incluida una invitación pendiente) de la familia. El dueño está protegido. */
export function eliminarUsuarioFamilia(familiaId: string, email: string) {
  return peticion<{ eliminado: string }>('DELETE', '/usuarios', { query: { familiaId, email } });
}

/** Crea la Familia Cliente (o S&O) + invita a su gerente/owner en un solo paso. */
export function crearFamilia(datos: {
  name: string;
  familyType: 'cliente' | 'so';
  ownerEmail: string;
  ownerNombre?: string;
  pais?: string;
  idioma?: string;
  direccion?: string;
  logoS3Key?: string;
  zonas?: string[];
}) {
  return peticion<RespuestaCrearFamilia>('POST', '/staff/familias/invitar', {
    cuerpo: datos,
    cabeceras: { 'Idempotency-Key': crypto.randomUUID() },
  });
}

// --- Auditoría de conexiones (Plant_SesionesVPN) — Auditoria.tsx, rol Administrador/Gerente/Coordinador ---

export interface SesionVpnApi {
  sesionId: string;
  tecnicoEmail: string;
  pcId: string;
  inicio: string;
  fin: string;
  duracionMs: number;
}

export function listarSesionesPorPc(pcId: string) {
  return peticion<{ sesiones: SesionVpnApi[] }>('GET', '/sesiones-vpn', { query: { pcId } });
}

export function listarSesionesPorTecnico(tecnicoEmail: string) {
  return peticion<{ sesiones: SesionVpnApi[] }>('GET', '/sesiones-vpn', { query: { tecnicoEmail } });
}

// --- Panel de errores (Plant_Errores) — PanelErrores.tsx, rol Administrador --------------------------

export interface ErrorRegistradoApi {
  uuidError: string;
  origen: string;
  versionCodigo: string;
  timestamp: string;
  descripcion: string;
}

export function listarErrores(limite = 50) {
  return peticion<{ errores: ErrorRegistradoApi[]; total: number }>('GET', '/errores', {
    query: { limite },
  });
}

// --- Perfiles de dispositivo (Plant_Perfiles) --------------------------------------------------------

/** Trae la plantilla BASE de un tipo de planta (o null si no existe todavía). */
export function obtenerPerfilBase(tipoPlanta: string) {
  return peticion<{ tipo: string; perfil: PerfilDispositivo | null }>('GET', '/app-vpn/perfiles', {
    query: { tipo: tipoPlanta },
  });
}

/** Trae la plantilla PERSONALIZADA de un equipo (o null si usa solo la base). */
export function obtenerPerfilEquipo(equipoId: string) {
  return peticion<{ equipoId: string; perfil: PerfilDispositivo | null }>('GET', '/app-vpn/perfiles', {
    query: { equipoId },
  });
}

/** Guarda la plantilla BASE de un tipo de planta. */
export function guardarPerfilBase(tipoPlanta: string, perfil: PerfilDispositivo) {
  return peticion<{ tipo: string; guardado: string }>('PUT', '/app-vpn/perfiles', {
    cuerpo: { tipo: tipoPlanta, perfil },
  });
}

/** Guarda la plantilla PERSONALIZADA de un equipo. */
export function guardarPerfilEquipo(equipoId: string, perfil: PerfilDispositivo) {
  return peticion<{ equipoId: string; guardado: string }>('PUT', '/app-vpn/perfiles', {
    cuerpo: { equipoId, perfil },
  });
}

// --- Telemetría/alarmas en vivo (Plant_Telemetria/Plant_Alarmas) — Dashboard.tsx, estado por tarjeta ----
// Mismos lambdas que ya usaba plant-portal-client; 2026-08-07 se les agregó la rama Staff
// (`validarAccesoEquipoStaff`) y la ruta `/app-vpn/*` para que el Tablero pinte el mismo estado en vivo.

/** Última telemetría reportada de un equipo (o `null` si nunca ha reportado). */
export interface TelemetriaActualApi {
  equipoId: string;
  timestamp: string;
  valores: Record<string, number | boolean>;
}

export function obtenerTelemetriaActual(equipoId: string) {
  return peticion<{ actual: TelemetriaActualApi | null }>('GET', '/app-vpn/telemetria', {
    query: { equipoId },
  });
}

/** Un punto de una serie histórica, ya normalizado (ISO UTC + número). */
export interface PuntoHistorial {
  timestamp: string;
  valor: number;
}

/**
 * Fila cruda del historial de Timestream (`SELECT *` sobre el registro multi-measure): además de
 * `time`/`pcId`/`equipoId`/`measure_name`, cada variable reportada en el rango aparece como su propia
 * columna (nombre = clave de la variable) y el valor SIEMPRE llega como string (ScalarValue de
 * Timestream). Para sacar la serie de una clave concreta se usa `serieDeVariable`, no acceso directo.
 */
export interface FilaHistorialTelemetria {
  time: string; // formato Timestream: 'YYYY-MM-DD HH:mm:ss.nnnnnnnnn' (UTC, sin 'T' ni 'Z')
  pcId?: string;
  equipoId?: string;
  measure_name?: string;
  [clave: string]: string | undefined;
}

/** Historial de telemetría de un equipo en un rango, para las gráficas de estudio de la vista de planta.
 * Mismo lambda `Plant_Telemetria` que el estado actual: si vienen `desde`/`hasta` consulta Timestream. */
export function obtenerHistorialTelemetria(equipoId: string, desde: string, hasta: string) {
  return peticion<{ historial: FilaHistorialTelemetria[] }>('GET', '/app-vpn/telemetria', {
    query: { equipoId, desde, hasta },
  });
}

/** Convierte el 'YYYY-MM-DD HH:mm:ss.nnnnnnnnn' de Timestream a ISO 8601 UTC (recorta a milisegundos). */
function timestreamTimeAIso(time: string): string {
  const [fecha, horaFraccion] = time.split(' ');
  const [hora, fraccion = '0'] = (horaFraccion ?? '00:00:00').split('.');
  const ms = fraccion.slice(0, 3).padEnd(3, '0');
  return `${fecha}T${hora}.${ms}Z`;
}

/** Extrae la serie histórica de UNA variable de las filas crudas de Timestream. Descarta lo que no sea
 * numérico finito: las variables booleanas llegan como texto ('true'/'false') y no se pueden graficar. */
export function serieDeVariable(historial: FilaHistorialTelemetria[], clave: string): PuntoHistorial[] {
  return historial
    .filter((fila) => fila[clave] !== undefined && fila[clave] !== null)
    .map((fila) => ({ timestamp: timestreamTimeAIso(fila.time), valor: Number(fila[clave]) }))
    .filter((p) => Number.isFinite(p.valor));
}

/** Fila de Plant_AlarmasActivas (una por código de alarma activo del equipo). */
export interface AlarmaActivaApi {
  pk: string;
  sk: string;
  pcId: string;
  equipoId: string;
  codigoAlarma: string;
  tipoAlarma: TipoAlarma;
  timestampActivacion: string;
  timestampDesactivacion?: string | null;
}

/** Alarmas activas de un equipo. */
export function listarAlarmasActivas(equipoId: string) {
  return peticion<{ tipo: string; alarmas: AlarmaActivaApi[] }>('GET', '/app-vpn/alarmas', {
    query: { equipoId, tipo: 'activas' },
  });
}

// --- Despliegue real a la PC (Plant_Config) — EditorPerfil.tsx, botón "Desplegar", rol Administrador -----
// Distinto de guardarPerfilEquipo: eso solo guarda la plantilla del editor. Esto la empuja de verdad al
// shadow IoT que consume plant-plc — dos pasos separados, decisión del usuario (2026-07-22).

export interface RespuestaDesplegarPerfil {
  equipoId: string;
  versionConfig: number;
}

export function desplegarPerfil(pcId: string, equipoId: string, perfil: PerfilDispositivo) {
  return peticion<RespuestaDesplegarPerfil>('POST', '/app-vpn/config', { cuerpo: { pcId, equipoId, perfil } });
}

// --- Import/export de perfil en Excel (Plant_PerfilExcel) --------------------------------------------

/** Pide el .xlsx del perfil actual y dispara la descarga (respuesta binaria, fuera del envoltorio JSON). */
export async function exportarPerfilExcel(perfil: PerfilDispositivo): Promise<void> {
  const token = await idTokenActual();
  const resp = await fetch(construirUrl('/app-vpn/perfiles/exportar'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
    body: JSON.stringify({ perfil }),
  });
  if (!resp.ok) {
    let code = `HTTP_${resp.status}`;
    let mensaje = `Error ${resp.status}`;
    try {
      const cuerpo = await resp.json();
      if (typeof cuerpo?.code === 'string') code = cuerpo.code;
      if (typeof cuerpo?.error === 'string') mensaje = cuerpo.error;
    } catch {
      // cuerpo no era JSON
    }
    throw new ErrorApi(resp.status, code, mensaje);
  }
  const blob = await resp.blob();
  const nombreArchivo = `perfil-${perfil.equipoId || perfil.tipoPlanta}.xlsx`;
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

/** Sube un .xlsx y devuelve el perfil ya validado contra el esquema (no lo guarda; el editor decide). */
export async function importarPerfilExcel(archivo: File): Promise<PerfilDispositivo> {
  const token = await idTokenActual();
  const forma = new FormData();
  forma.append('archivo', archivo);
  const resp = await fetch(construirUrl('/app-vpn/perfiles/importar'), {
    method: 'POST',
    headers: token ? { Authorization: token } : {},
    body: forma,
  });
  const texto = await resp.text();
  const datos = texto ? JSON.parse(texto) : {};
  if (!resp.ok) {
    const code = typeof datos?.code === 'string' ? datos.code : `HTTP_${resp.status}`;
    const msg = typeof datos?.error === 'string' ? datos.error : `Error ${resp.status}`;
    throw new ErrorApi(resp.status, code, msg);
  }
  return datos.perfil as PerfilDispositivo;
}

// --- Respaldos versionados de equipo (Plant_Respaldos) ------------------------------------------------
//
// `07-app-vpn.md` los especifica por tarjeta de equipo: descargar el último, elegir una versión anterior y
// cargar uno nuevo con versionado automático (v1, v2, v3...). El backend, las rutas y el bucket estaban
// completos desde hacía tiempo, pero no había ni una llamada aquí: el permiso `canRespaldos` era un flag
// muerto y la función no existía para el usuario (hallazgo de la auditoría 2026-08-07).

/** Una versión de respaldo registrada para un equipo. */
export interface RespaldoApi {
  equipoId: string;
  version: number;
  s3Key: string;
  nombreArchivo: string;
  subidoPor: string;
  timestamp: string;
}

/** Versiones registradas de un equipo, de la más reciente a la más antigua. */
export function listarRespaldos(equipoId: string) {
  return peticion<{ versiones: RespaldoApi[] }>('GET', '/respaldos', {
    query: { equipoId, accion: 'versiones' },
  });
}

/** URL prefirmada de descarga. Sin `version`, la última. */
export function urlDescargaRespaldo(equipoId: string, version?: number) {
  return peticion<{ version: number; url: string }>('GET', '/respaldos', {
    query: { equipoId, accion: 'descargar', version },
  });
}

/** Pide una URL prefirmada de subida; el backend asigna la versión siguiente. */
export function urlSubidaRespaldo(equipoId: string, nombreArchivo: string) {
  return peticion<{ version: number; s3Key: string; url: string }>('POST', '/respaldos', {
    cuerpo: { accion: 'urlSubida', equipoId, nombreArchivo },
  });
}

/**
 * Registra la metadata TRAS subir el archivo a S3. `subidoPor` NO se manda: el backend lo toma de la
 * identidad del token (corrección 2026-08-07 — antes se aceptaba del cuerpo y era falsificable, siendo la
 * única traza de quién subió el respaldo de un PLC).
 */
export function confirmarRespaldo(equipoId: string, version: number, nombreArchivo: string) {
  return peticion<{ registrado: RespaldoApi }>('POST', '/respaldos', {
    cuerpo: { accion: 'confirmar', equipoId, version, nombreArchivo },
  });
}

/** Sube el archivo a la URL prefirmada de S3 (PUT directo, fuera de la API). */
export async function subirArchivoRespaldo(url: string, archivo: File): Promise<void> {
  const resp = await fetch(url, { method: 'PUT', body: archivo });
  if (!resp.ok) throw new ErrorApi(resp.status, 'S3_UPLOAD_FAILED', 'No se pudo subir el respaldo');
}
