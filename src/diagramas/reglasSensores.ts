// Regla RÍGIDA de qué sensores puede llevar cada tipo de nodo, y qué puede llevar cualquier tubería. Ver
// spec §2 (corregida en la autorevisión: la partición real es EQUIPO (tanque/bomba/dosificadora, catálogo
// fijo cada uno) vs TUBERÍA (un solo catálogo completo, sin importar a qué esté junto).
import type { TipoNodoProceso, TipoSensor } from './tipos';

const SLOTS_TANQUE: TipoSensor[] = ['nivelOnOff', 'presionOnOff', 'flujoOnOff', 'flotadorOnOff', 'alarmaNivel'];
const SLOTS_BOMBA: TipoSensor[] = ['onOffEquipo', 'rpm', 'hz', 'temperatura', 'falla'];
const SLOTS_DOSIFICADORA: TipoSensor[] = ['onOffEquipo', 'porcentajeFuncionamiento', 'flotadorOnOff', 'falla'];
const SLOTS_TUBERIA: TipoSensor[] = [
  'flujo', 'presion', 'conductividad', 'tds', 'orp', 'ph', 'cloro', 'temperatura',
  'flujoOnOff', 'presionOnOff', 'nivel', 'nivelOnOff',
];

const TIPOS_TANQUE: Set<TipoNodoProceso> = new Set(['tanque', 'tanquePulmon', 'torreDesgasificadora']);
const TIPOS_BOMBA: Set<TipoNodoProceso> = new Set([
  'bomba', 'bombaSumergible', 'bombaRealce', 'bombaAltaPresion', 'bombaBooster', 'turbocharger', 'recuperadorPX', 'soplador',
]);

/** Slots permitidos en el icono de un nodo (tanque/bomba/dosificadora tienen catálogo propio; cualquier
 * otro tipo de nodo de proceso — filtros, membranas, válvulas — se trata como una tubería genérica). */
export function slotsPermitidos(tipo: TipoNodoProceso): TipoSensor[] {
  if (TIPOS_TANQUE.has(tipo)) return SLOTS_TANQUE;
  if (TIPOS_BOMBA.has(tipo)) return SLOTS_BOMBA;
  if (tipo === 'dosificadora') return SLOTS_DOSIFICADORA;
  return SLOTS_TUBERIA;
}

/** Slots permitidos en cualquier conexión (tubería) del diagrama. */
export function slotsPermitidosConexion(): TipoSensor[] {
  return SLOTS_TUBERIA;
}
