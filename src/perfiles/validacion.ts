// Reglas de integridad del perfil (11-perfiles-dispositivo.md "Reglas de integridad"). Puro: el editor lo
// corre antes de guardar/exportar, sin llamar a la API. Devuelve una lista de errores (vacía = válido).
import type { EntradaCatalogoAlarma, PerfilDispositivo } from './tipos';

const RE_CODIGO_ALARMA = /^(F|AD|S|H)\d{5}$/;
const PREFIJO_POR_TIPO: Record<string, string> = { falla: 'F', advertencia: 'AD', sistema: 'S', helper: 'H' };
const IDIOMAS: Array<keyof EntradaCatalogoAlarma['descripcion']> = ['es', 'en', 'fr', 'pt'];

/** Valida un perfil completo. Devuelve los mensajes de error (vacío = perfil válido). */
export function validarPerfil(p: PerfilDispositivo): string[] {
  const errores: string[] = [];
  const clavesDisponibles = new Set<string>([
    ...p.variablesLectura.map((v) => v.clave),
    ...p.variablesControl.map((v) => v.clave),
  ]);

  if (!p.equipoId) errores.push('Falta el ID del equipo');
  if (!p.nombre.trim()) errores.push('Falta el nombre del equipo');
  if (!p.ip.trim()) errores.push('Falta la IP del PLC');

  if (p.dashboard.variables.length > 6) {
    errores.push(`El dashboard admite máximo 6 variables (tiene ${p.dashboard.variables.length})`);
  }
  for (const clave of p.dashboard.variables) {
    if (!clavesDisponibles.has(clave)) errores.push(`Dashboard: la variable "${clave}" no existe`);
  }

  for (const nodo of p.diagrama.nodos) {
    for (const clave of nodo.variables ?? []) {
      if (!clavesDisponibles.has(clave)) {
        errores.push(`Diagrama: el nodo "${nodo.id}" referencia la variable inexistente "${clave}"`);
      }
    }
  }
  const idsNodos = new Set(p.diagrama.nodos.map((n) => n.id));
  for (const con of p.diagrama.conexiones) {
    if (!idsNodos.has(con.desde)) errores.push(`Diagrama: conexión con origen inexistente "${con.desde}"`);
    if (!idsNodos.has(con.hasta)) errores.push(`Diagrama: conexión con destino inexistente "${con.hasta}"`);
  }

  for (const grafica of p.graficas) {
    for (const clave of grafica.variables) {
      if (!clavesDisponibles.has(clave)) {
        errores.push(`Gráfica "${grafica.titulo}": la variable "${clave}" no existe`);
      }
    }
  }

  for (const alarma of p.catalogoAlarmas) {
    if (!RE_CODIGO_ALARMA.test(alarma.codigo)) {
      errores.push(`Alarma "${alarma.codigo}": código inválido (F##### | AD##### | S##### | H#####)`);
    } else {
      const prefijoEsperado = PREFIJO_POR_TIPO[alarma.tipo];
      if (!alarma.codigo.startsWith(prefijoEsperado)) {
        errores.push(`Alarma "${alarma.codigo}": el prefijo no coincide con el tipo "${alarma.tipo}"`);
      }
    }
    if (alarma.variable && !clavesDisponibles.has(alarma.variable)) {
      errores.push(`Alarma "${alarma.codigo}": la variable "${alarma.variable}" no existe`);
    }
    for (const idioma of IDIOMAS) {
      if (!alarma.descripcion[idioma]?.trim()) {
        errores.push(`Alarma "${alarma.codigo}": falta la descripción en "${idioma}"`);
      }
    }
  }

  return errores;
}
