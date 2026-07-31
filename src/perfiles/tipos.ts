// Tipos del PERFIL DE DISPOSITIVO — reflejan 1:1 el esquema canónico de
// plant-arquitectura/11-perfiles-dispositivo.md. Es el contrato central: lo edita esta app, lo guarda
// Plant_Perfiles (S3), lo consume plant-plc (subset) y plant-portal-client (dashboard/diagrama/alarmas).
// Cualquier cambio aquí debe reflejarse en ese documento y en los otros 3 subproyectos.
import type { DiagramaEquipo } from '../diagramas/tipos';
export type {
  NodoDiagrama,
  ConexionDiagrama,
  DiagramaEquipo,
  SensorBinding,
  TipoSensor,
  TipoNodoProceso,
} from '../diagramas/tipos';

export type TipoPlanta = 'osmosis' | 'ptar' | 'hidroneumatico';
export type ModeloPLC = 'siemens_s7_1200' | 'mitsubishi_fx5' | 'delta_as200';
export type TipoDato = 'bool' | 'int16' | 'uint16' | 'int32' | 'uint32' | 'float32' | 'float64';
export type GrupoEscritura = 'portal_client' | 'admin_app_vpn';
export type TipoAlarma = 'falla' | 'advertencia' | 'sistema' | 'helper';

export type Idioma = 'es' | 'en' | 'fr' | 'pt';
export type TextoMultiidioma = Record<Idioma, string>;

export interface VariableLectura {
  clave: string;
  etiqueta: string;
  tipoDato: TipoDato;
  direccion: string;
  escala?: number;
  offset?: number;
  unidad?: string;
}

export interface VariableControl extends VariableLectura {
  grupoEscritura: GrupoEscritura;
}

export interface EntradaCatalogoAlarma {
  codigo: string; // F##### | AD##### | S##### | H#####
  variable: string; // clave de la variable ligada
  tipo: TipoAlarma;
  condicion: string; // expresión que evalúa plant-plc (DSL sin eval)
  descripcion: TextoMultiidioma;
  ayuda?: TextoMultiidioma;
}

export interface PlantillaGrafica {
  id: string;
  titulo: string;
  variables: string[];
}

/** Ficha técnica de la planta/equipo: datos descriptivos de construcción, todos OPCIONALES (se llenan al
 * armar el config de la planta, ver 11-perfiles-dispositivo.md). Ninguno participa de la lógica del
 * sistema (no se referencia desde alarmas/dashboard/diagrama) — es solo información de referencia que se
 * muestra en el panel del diagrama mimético. */
export interface FichaTecnica {
  descripcion?: string;
  capacidad?: string;
  voltajeOperacion?: string;
  numeroEquipo?: string;
  ubicacion?: string;
  cliente?: string;
  modelo?: string;
  serie?: string;
  fabricante?: string;
}

/** El perfil completo de una planta/equipo (esquema canónico, ver 11-perfiles-dispositivo.md). */
export interface PerfilDispositivo {
  equipoId: string;
  nombre: string;
  tipoPlanta: TipoPlanta;
  cliente: string;

  modeloPLC: ModeloPLC;
  ip: string;
  puerto: number;

  variablesLectura: VariableLectura[];
  variablesControl: VariableControl[];
  catalogoAlarmas: EntradaCatalogoAlarma[];

  dashboard: { variables: string[] }; // máximo 6 claves
  diagrama: DiagramaEquipo;
  graficas: PlantillaGrafica[];
  fichaTecnica: FichaTecnica;

  perfil: { esBase: boolean; tipoBase: TipoPlanta; version: number };
}

/** Perfil vacío (plantilla nueva) para un tipo de planta dado — punto de partida del editor. */
export function perfilVacio(tipoPlanta: TipoPlanta, esBase: boolean): PerfilDispositivo {
  return {
    equipoId: '',
    nombre: '',
    tipoPlanta,
    cliente: '',
    modeloPLC: 'siemens_s7_1200',
    ip: '',
    puerto: 102,
    variablesLectura: [],
    variablesControl: [],
    catalogoAlarmas: [],
    dashboard: { variables: [] },
    diagrama: { viewBox: '0 0 100 100', nodos: [], conexiones: [] },
    graficas: [],
    fichaTecnica: {},
    perfil: { esBase, tipoBase: tipoPlanta, version: 1 },
  };
}
