// Capa de acceso a la API (API Gateway con dominio propio, vía proxy same-origin /api). Recurso propio de
// esta app: /app-vpn/*. El token (ID token de Cognito, pool Staff) lo obtiene Amplify y se adjunta como
// Authorization. Un 401 fuerza el cierre de sesión (idempotente). Ver plant-arquitectura/07-app-vpn.md.
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import type { PerfilDispositivo } from '../perfiles/tipos';

const BASE = '/api';

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

// --- Gestión de personal Staff (Plant_StaffUsuarios) — GestionGerentes.tsx ------------------------------

export interface UsuarioStaffApi {
  email: string;
  nombre: string | null;
  rol: string;
  zonaIds: string[];
  estado: 'inactive' | 'active';
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
