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
  const cabeceras: Record<string, string> = { 'Content-Type': 'application/json' };
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
// NOTA: `Plant_StaffLogin` (o equivalente) todavía NO existe en plant-lambdas — es un pendiente explícito
// (ver plan-de-trabajo.md 6.9.2: definir si reutiliza Plant_Usuarios con un flag o es una tabla aparte).
// Este contrato queda listo para cuando se construya.

/** Perfil de sesión: resuelve rol/zonas del usuario autenticado (server-side, anti-IDOR). */
export function staffLogin() {
  return peticion('POST', '/app-vpn/staff-login');
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
