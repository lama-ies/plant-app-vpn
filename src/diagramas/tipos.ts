// Tipos del diagrama mimético ensamblado (lo que se persiste en Plant_Perfiles) y del catálogo de
// segmentos combinables (lo que arma el ensamblador). Ver
// plant-arquitectura/docs/superpowers/specs/2026-07-29-diagrama-planta-design.md.

/** Catálogo fijo de tipos de sensor. La ubicación permitida por tipo de punto es una regla del EDITOR
 * (ver src/diagramas/reglasSensores.ts), no de este tipo. */
export type TipoSensor =
  | 'flujo' | 'presion' | 'conductividad' | 'tds' | 'orp' | 'ph' | 'cloro' | 'temperatura'
  | 'flujoOnOff' | 'presionOnOff'
  | 'nivel' // UNA variable de PLC; el sistema deriva % y m³ (necesita el volumen del tanque, fuera de alcance aquí)
  | 'nivelOnOff' | 'flotadorOnOff' | 'alarmaNivel'
  | 'onOffEquipo' | 'rpm' | 'hz' | 'falla'
  | 'porcentajeFuncionamiento';

/** Un slot de sensor enlazado (o no) a una variable real del equipo. */
export interface SensorBinding {
  tipo: TipoSensor;
  /** Clave de variablesLectura/variablesControl del equipo. Si falta, el slot no se dibuja. */
  variable?: string;
}

/** Tipo de nodo de proceso — determina el ícono que dibuja el motor de render. */
export type TipoNodoProceso =
  | 'tanque' | 'tanquePulmon' | 'torreDesgasificadora' | 'bomba' | 'bombaSumergible' | 'bombaRealce' | 'pozo'
  | 'filtroMultimedia' | 'valvulaActuadora' | 'filtroCanasta' | 'filtroCarbono' | 'filtroCarbonoActivado'
  | 'bombaAltaPresion' | 'membranaRO' | 'turbocharger' | 'recuperadorPX' | 'bombaBooster'
  | 'soplador' | 'inyeccionCloro' | 'lamparaUV' | 'dosificadora' | 'salidaDrenaje' | 'lineaDistribucion';

/** Tipo de agua que lleva una tubería — determina su color real en el motor de render (verde/celeste/rojo,
 * ver spec §9): `alimentacion` (agua cruda hasta entrar a la membrana), `permeado` (agua producto después
 * de la membrana), `rechazo` (concentrado/reject). Obligatorio en toda conexión: sin esto no se puede
 * distinguir a simple vista qué tubería es cuál donde se cruzan. */
export type TipoFlujo = 'alimentacion' | 'permeado' | 'rechazo';

/** Nodo del diagrama YA ENSAMBLADO (posición absoluta, ids globales únicos). */
export interface NodoDiagrama {
  id: string;
  tipo: TipoNodoProceso;
  etiqueta: string;
  x: number;
  y: number;
  sensores: SensorBinding[];
  /** true SOLO para dosificadoras: no se dibuja línea de conexión hacia/desde este nodo. */
  flotante?: boolean;
  /** Grados de rotación del ícono (ej. la flecha de Drenaje apunta hacia abajo cuando la tubería que llega
   * es vertical, no hacia la derecha que es el default del ícono). Default 0/sin definir = sin rotar. */
  rotacion?: number;
}

/** Conexión (tubería) entre dos nodos, por id global. */
export interface ConexionDiagrama {
  id: string;
  desde: string;
  hasta: string;
  etiqueta?: string;
  sensores: SensorBinding[];
  tipo: TipoFlujo;
  /** Puntos intermedios (coordenadas ya proyectadas) entre `desde` y `hasta`. Vacío = tramo recto de un
   * solo eje isométrico. Ver ensamblador.ts `calcularRuta` — nunca es una línea diagonal arbitraria. */
  ruta: { x: number; y: number }[];
  /** Desplazamiento manual del badge de sensores de ESTA conexión, respecto de su posición automática.
   * Solo lo puede fijar el editor (plant-app-vpn, arrastrando la burbuja) — plant-portal-client nunca lo
   * escribe, solo lo lee y respeta la posición guardada. */
  offsetEtiqueta?: { dx: number; dy: number };
}

/** El diagrama completo ya ensamblado — esto es lo que viaja en `perfil.diagrama`. */
export interface DiagramaEquipo {
  viewBox: string;
  nodos: NodoDiagrama[];
  conexiones: ConexionDiagrama[];
}

// --- Catálogo de segmentos (autoría interna, nunca se persiste tal cual) ------------------------------

/** Nodo de un segmento del catálogo, en coordenadas RELATIVAS al origen del segmento. */
export interface NodoSegmento {
  /** Único DENTRO del segmento; el ensamblador lo renumera a un id global al ensamblar. */
  idLocal: string;
  tipo: TipoNodoProceso;
  etiqueta: string;
  col: number;
  fila: number;
  /** Desplazamiento de altura, relativo a col/fila. Default 0. Usado para nodos flotantes y para apilar
   * copias de un mismo grupo repetible sin cambiar su fila (que queda reservada a ramas reales del
   * proceso). */
  elevacion?: number;
  flotante?: boolean;
  rotacion?: number;
}

/** Conexión de un segmento del catálogo, por idLocal. */
export interface ConexionSegmento {
  desde: string;
  hasta: string;
  etiqueta?: string;
  tipo: TipoFlujo;
  /** Orden de la esquina que calcula el ensamblador (ver `calcularRuta`): `'col-fila'` (default) dobla
   * primero al col del destino y después a su fila; `'fila-col'` dobla primero a la fila del destino y
   * después a su col. Sirve para separar dos tuberías que de otro modo compartirían el mismo tramo (ej.
   * en N3: la alimentación hacia Bomba Alta Presión/Recuperador PX debe doblar en la columna de ORIGEN
   * — Filtro Canasta —, no en la del destino, para dejar esa columna libre para el Rechazo). */
  ordenRuta?: 'col-fila' | 'fila-col';
}

/** Rango de repetición de un segmento (ej. 1 a 5 pozos, 1 a 5 bombas de un grupo de presión). */
export interface RangoRepetible {
  min: number;
  max: number;
}

/**
 * Un fragmento combinable del catálogo. `entradaIdLocal: null` = el segmento no tiene entrada externa (es
 * un origen, ej. un pozo) — pero si TAMBIÉN `nodos.length === 0`, es un segmento "pass-through" (ver
 * cabecera del plan): no agrega nada, la salida pendiente de la secuencia sigue siendo la anterior.
 */
export interface SegmentoDiagrama {
  id: string; // ej. 'osmosis.alimentacion.A1'
  nodos: NodoSegmento[];
  conexiones: ConexionSegmento[];
  entradaIdLocal: string | null;
  /** null = pass-through (ver cabecera). Si no es null, DEBE existir en `nodos`. */
  salidaIdLocal: string | null;
  /** idLocal cerca del cual se insertan dosificadoras flotantes (solo lo definen los núcleos). */
  anclaDosificadoras?: string;
  repetible?: RangoRepetible;
  /** Tipo de flujo que trae la conexión de empalme SINTÉTICA que el ensamblador crea al conectar la salida
   * del segmento anterior con `entradaIdLocal` de este (no es una `ConexionSegmento` real, así que no tiene
   * su propio `tipo`). Default `'alimentacion'` si no se especifica — los complementos posteriores a la
   * membrana (C1/C2/UV/cisterna final) declaran `'permeado'`, porque lo que reciben ya es agua producto. */
  tipoEntrada?: TipoFlujo;
}
