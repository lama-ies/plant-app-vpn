// Editor de perfil de dispositivo (Fase 6.6.9, prioridad explícita del usuario): formulario para crear y
// mantener el perfil canónico de una planta (11-perfiles-dispositivo.md) — identidad del equipo, variables
// de lectura/control, catálogo de alarmas, dashboard, diagrama y gráficas — reutilizable como plantilla BASE
// por tipo de planta o PERSONALIZADA para un equipo puntual. Incluye validar/exportar/importar en Excel.
import { useMemo, useState, type ChangeEvent } from 'react';
import { AlertTriangle, CheckCircle2, Download, Plus, Save, Trash2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  exportarPerfilExcel,
  guardarPerfilBase,
  guardarPerfilEquipo,
  importarPerfilExcel,
  obtenerPerfilBase,
  obtenerPerfilEquipo,
} from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import {
  perfilVacio,
  type ConexionDiagrama,
  type EntradaCatalogoAlarma,
  type GrupoEscritura,
  type Idioma,
  type ModeloPLC,
  type NodoDiagrama,
  type PerfilDispositivo,
  type PlantillaGrafica,
  type TipoAlarma,
  type TipoDato,
  type TipoNodoDiagrama,
  type TipoPlanta,
  type VariableControl,
  type VariableLectura,
} from '../perfiles/tipos';
import { validarPerfil } from '../perfiles/validacion';
import './editor-perfil.css';

const TIPOS_PLANTA: TipoPlanta[] = ['osmosis', 'ptar', 'hidroneumatico'];
const MODELOS_PLC: ModeloPLC[] = ['siemens_s7_1200', 'mitsubishi_fx5', 'delta_as200'];
const TIPOS_DATO: TipoDato[] = ['bool', 'int16', 'uint16', 'int32', 'uint32', 'float32', 'float64'];
const GRUPOS_ESCRITURA: GrupoEscritura[] = ['portal_client', 'admin_app_vpn'];
const TIPOS_ALARMA: TipoAlarma[] = ['falla', 'advertencia', 'sistema', 'helper'];
const TIPOS_NODO: TipoNodoDiagrama[] = [
  'tanque', 'bomba', 'filtro', 'membrana', 'aireador', 'sedimentador', 'cloracion', 'salida',
];
const IDIOMAS: Idioma[] = ['es', 'en', 'fr', 'pt'];

function actualizarEnLista<T>(lista: T[], idx: number, cambios: Partial<T>): T[] {
  return lista.map((item, i) => (i === idx ? { ...item, ...cambios } : item));
}
function quitarDeLista<T>(lista: T[], idx: number): T[] {
  return lista.filter((_, i) => i !== idx);
}

export function EditorPerfil() {
  const { t } = useTranslation();

  // --- Origen del perfil a editar (plantilla base de un tipo de planta, o perfil de un equipo) --------
  const [origenTipo, setOrigenTipo] = useState<'base' | 'equipo'>('base');
  const [tipoPlantaSel, setTipoPlantaSel] = useState<TipoPlanta>('osmosis');
  const [equipoIdSel, setEquipoIdSel] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [perfil, setPerfil] = useState<PerfilDispositivo | null>(null);
  const [erroresValidacion, setErroresValidacion] = useState<string[] | null>(null);
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const clavesDisponibles = useMemo(() => {
    if (!perfil) return [] as string[];
    return [...perfil.variablesLectura.map((v) => v.clave), ...perfil.variablesControl.map((v) => v.clave)];
  }, [perfil]);

  const idsNodos = useMemo(() => perfil?.diagrama.nodos.map((n) => n.id) ?? [], [perfil]);

  function limpiarAvisos() {
    setErroresValidacion(null);
    setMensajeOk(null);
    setErrorAccion(null);
  }

  async function cargar() {
    limpiarAvisos();
    setErrorCarga(null);
    setCargando(true);
    try {
      if (origenTipo === 'base') {
        const r = await obtenerPerfilBase(tipoPlantaSel);
        setPerfil(r.perfil ?? perfilVacio(tipoPlantaSel, true));
      } else {
        const r = await obtenerPerfilEquipo(equipoIdSel.trim());
        setPerfil(r.perfil ?? { ...perfilVacio(tipoPlantaSel, false), equipoId: equipoIdSel.trim() });
      }
    } catch (e) {
      setErrorCarga(codigoAMensaje(t, e));
    } finally {
      setCargando(false);
    }
  }

  function nuevo() {
    limpiarAvisos();
    setErrorCarga(null);
    setPerfil({
      ...perfilVacio(tipoPlantaSel, origenTipo === 'base'),
      equipoId: origenTipo === 'equipo' ? equipoIdSel.trim() : '',
    });
  }

  function campo<K extends keyof PerfilDispositivo>(clave: K, valor: PerfilDispositivo[K]) {
    setPerfil((p) => (p ? { ...p, [clave]: valor } : p));
  }

  function validar() {
    if (!perfil) return;
    const errores = validarPerfil(perfil);
    setErroresValidacion(errores);
    setMensajeOk(errores.length === 0 ? t('editorPerfil.validarOk') : null);
  }

  async function exportar() {
    if (!perfil) return;
    limpiarAvisos();
    setExportando(true);
    try {
      await exportarPerfilExcel(perfil);
    } catch (e) {
      setErrorAccion(codigoAMensaje(t, e));
    } finally {
      setExportando(false);
    }
  }

  async function importar(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    limpiarAvisos();
    setImportando(true);
    try {
      setPerfil(await importarPerfilExcel(archivo));
    } catch (err) {
      setErrorAccion(codigoAMensaje(t, err));
    } finally {
      setImportando(false);
    }
  }

  async function guardar(destino: 'base' | 'equipo') {
    if (!perfil) return;
    limpiarAvisos();
    const errores = validarPerfil(perfil);
    setErroresValidacion(errores);
    if (errores.length > 0) return;
    setGuardando(true);
    try {
      if (destino === 'base') await guardarPerfilBase(perfil.tipoPlanta, perfil);
      else await guardarPerfilEquipo(perfil.equipoId, perfil);
      setMensajeOk(t('editorPerfil.guardadoOk'));
    } catch (e) {
      setErrorAccion(codigoAMensaje(t, e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="editor">
      <h1 className="editor__titulo">{t('editorPerfil.titulo')}</h1>
      <p className="editor__sub">{t('editorPerfil.sub')}</p>

      <div className="editor__origen">
        <label className="auth-campo">
          {t('editorPerfil.origen')}
          <select value={origenTipo} onChange={(e) => setOrigenTipo(e.target.value as 'base' | 'equipo')}>
            <option value="base">{t('editorPerfil.origenBase')}</option>
            <option value="equipo">{t('editorPerfil.origenEquipo')}</option>
          </select>
        </label>
        {origenTipo === 'base' ? (
          <label className="auth-campo">
            {t('editorPerfil.tipoPlantaEtiqueta')}
            <select value={tipoPlantaSel} onChange={(e) => setTipoPlantaSel(e.target.value as TipoPlanta)}>
              {TIPOS_PLANTA.map((tp) => (
                <option key={tp} value={tp}>
                  {t(`tipoPlanta.${tp}`)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="auth-campo">
            {t('editorPerfil.equipoIdEtiqueta')}
            <input type="text" value={equipoIdSel} onChange={(e) => setEquipoIdSel(e.target.value)} />
          </label>
        )}
        <div className="editor__origen-acciones">
          <button
            type="button"
            className="boton-tenue"
            onClick={() => void cargar()}
            disabled={cargando || (origenTipo === 'equipo' && !equipoIdSel.trim())}
          >
            {cargando ? t('editorPerfil.cargando') : t('editorPerfil.cargar')}
          </button>
          <button type="button" className="boton-tenue" onClick={nuevo} disabled={cargando}>
            <Plus size={16} aria-hidden />
            {t('editorPerfil.nuevo')}
          </button>
        </div>
      </div>

      {errorCarga && (
        <p className="auth-error" role="alert">
          <AlertTriangle size={15} aria-hidden /> {errorCarga}
        </p>
      )}

      {!perfil ? (
        <p className="vacio">{t('editorPerfil.sinCargar')}</p>
      ) : (
        <>
          {/* --- 1. Datos del equipo ------------------------------------------------------------- */}
          <section className="seccion">
            <h2 className="seccion__titulo">{t('editorPerfil.seccionEquipo')}</h2>
            <div className="rejilla-campos">
              <label className="auth-campo">
                {t('editorPerfil.campo.equipoId')}
                <input type="text" value={perfil.equipoId} onChange={(e) => campo('equipoId', e.target.value)} />
              </label>
              <label className="auth-campo">
                {t('editorPerfil.campo.nombre')}
                <input type="text" value={perfil.nombre} onChange={(e) => campo('nombre', e.target.value)} />
              </label>
              <label className="auth-campo">
                {t('editorPerfil.campo.tipoPlanta')}
                <select value={perfil.tipoPlanta} onChange={(e) => campo('tipoPlanta', e.target.value as TipoPlanta)}>
                  {TIPOS_PLANTA.map((tp) => (
                    <option key={tp} value={tp}>
                      {t(`tipoPlanta.${tp}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="auth-campo">
                {t('editorPerfil.campo.cliente')}
                <input type="text" value={perfil.cliente} onChange={(e) => campo('cliente', e.target.value)} />
              </label>
              <label className="auth-campo">
                {t('editorPerfil.campo.modeloPLC')}
                <select value={perfil.modeloPLC} onChange={(e) => campo('modeloPLC', e.target.value as ModeloPLC)}>
                  {MODELOS_PLC.map((m) => (
                    <option key={m} value={m}>
                      {t(`modeloPLC.${m}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="auth-campo">
                {t('editorPerfil.campo.ip')}
                <input type="text" value={perfil.ip} onChange={(e) => campo('ip', e.target.value)} />
              </label>
              <label className="auth-campo">
                {t('editorPerfil.campo.puerto')}
                <input
                  type="number"
                  value={perfil.puerto}
                  onChange={(e) => campo('puerto', Number(e.target.value) || 0)}
                />
              </label>
            </div>
          </section>

          {/* --- 2. Variables de lectura --------------------------------------------------------- */}
          <SeccionVariables
            titulo={t('editorPerfil.seccionLectura')}
            variables={perfil.variablesLectura}
            conGrupoEscritura={false}
            onCambiar={(lista) => campo('variablesLectura', lista)}
            t={t}
          />

          {/* --- 3. Variables de control ---------------------------------------------------------- */}
          <SeccionVariables
            titulo={t('editorPerfil.seccionControl')}
            variables={perfil.variablesControl}
            conGrupoEscritura
            onCambiar={(lista) => campo('variablesControl', lista as VariableControl[])}
            t={t}
          />

          {/* --- 4. Catálogo de alarmas ------------------------------------------------------------ */}
          <section className="seccion">
            <h2 className="seccion__titulo">{t('editorPerfil.seccionAlarmas')}</h2>
            {perfil.catalogoAlarmas.length === 0 && <p className="lista-vacia">{t('editorPerfil.sinFilas')}</p>}
            {perfil.catalogoAlarmas.map((alarma, idx) => (
              <FilaAlarma
                key={idx}
                alarma={alarma}
                clavesDisponibles={clavesDisponibles}
                onCambiar={(cambios) =>
                  campo('catalogoAlarmas', actualizarEnLista(perfil.catalogoAlarmas, idx, cambios))
                }
                onQuitar={() => campo('catalogoAlarmas', quitarDeLista(perfil.catalogoAlarmas, idx))}
                t={t}
              />
            ))}
            <button
              type="button"
              className="agregar-fila"
              onClick={() =>
                campo('catalogoAlarmas', [
                  ...perfil.catalogoAlarmas,
                  {
                    codigo: '',
                    variable: '',
                    tipo: 'falla',
                    condicion: '',
                    descripcion: { es: '', en: '', fr: '', pt: '' },
                  },
                ])
              }
            >
              <Plus size={15} aria-hidden />
              {t('editorPerfil.agregarAlarma')}
            </button>
          </section>

          {/* --- 5. Variables del dashboard --------------------------------------------------------- */}
          <section className="seccion">
            <h2 className="seccion__titulo">{t('editorPerfil.seccionDashboard')}</h2>
            <p className="seccion__ayuda">
              {t('editorPerfil.dashboardAyuda', { count: perfil.dashboard.variables.length })}
            </p>
            <div className="casillas">
              {clavesDisponibles.length === 0 && <p className="lista-vacia">{t('editorPerfil.sinFilas')}</p>}
              {clavesDisponibles.map((clave) => {
                const marcada = perfil.dashboard.variables.includes(clave);
                return (
                  <label className="casilla" key={clave}>
                    <input
                      type="checkbox"
                      checked={marcada}
                      disabled={!marcada && perfil.dashboard.variables.length >= 6}
                      onChange={() =>
                        campo('dashboard', {
                          variables: marcada
                            ? perfil.dashboard.variables.filter((c) => c !== clave)
                            : [...perfil.dashboard.variables, clave],
                        })
                      }
                    />
                    {clave}
                  </label>
                );
              })}
            </div>
          </section>

          {/* --- 6. Diagrama: nodos + conexiones ---------------------------------------------------- */}
          <section className="seccion">
            <h2 className="seccion__titulo">{t('editorPerfil.seccionDiagrama')}</h2>

            <p className="subtitulo-lista">{t('editorPerfil.diagramaNodosTitulo')}</p>
            {perfil.diagrama.nodos.length === 0 && <p className="lista-vacia">{t('editorPerfil.sinFilas')}</p>}
            {perfil.diagrama.nodos.map((nodo, idx) => (
              <FilaNodo
                key={idx}
                nodo={nodo}
                clavesDisponibles={clavesDisponibles}
                onCambiar={(cambios) =>
                  campo('diagrama', {
                    ...perfil.diagrama,
                    nodos: actualizarEnLista(perfil.diagrama.nodos, idx, cambios),
                  })
                }
                onQuitar={() =>
                  campo('diagrama', { ...perfil.diagrama, nodos: quitarDeLista(perfil.diagrama.nodos, idx) })
                }
                t={t}
              />
            ))}
            <button
              type="button"
              className="agregar-fila"
              onClick={() =>
                campo('diagrama', {
                  ...perfil.diagrama,
                  nodos: [...perfil.diagrama.nodos, { id: '', tipo: 'tanque', etiqueta: '', x: 0, y: 0 }],
                })
              }
            >
              <Plus size={15} aria-hidden />
              {t('editorPerfil.agregarNodo')}
            </button>

            <p className="subtitulo-lista">{t('editorPerfil.diagramaConexionesTitulo')}</p>
            {perfil.diagrama.conexiones.length === 0 && <p className="lista-vacia">{t('editorPerfil.sinFilas')}</p>}
            {perfil.diagrama.conexiones.map((con, idx) => (
              <FilaConexion
                key={idx}
                conexion={con}
                idsNodos={idsNodos}
                onCambiar={(cambios) =>
                  campo('diagrama', {
                    ...perfil.diagrama,
                    conexiones: actualizarEnLista(perfil.diagrama.conexiones, idx, cambios),
                  })
                }
                onQuitar={() =>
                  campo('diagrama', {
                    ...perfil.diagrama,
                    conexiones: quitarDeLista(perfil.diagrama.conexiones, idx),
                  })
                }
                t={t}
              />
            ))}
            <button
              type="button"
              className="agregar-fila"
              onClick={() =>
                campo('diagrama', {
                  ...perfil.diagrama,
                  conexiones: [...perfil.diagrama.conexiones, { desde: '', hasta: '' }],
                })
              }
            >
              <Plus size={15} aria-hidden />
              {t('editorPerfil.agregarConexion')}
            </button>
          </section>

          {/* --- 7. Gráficas ------------------------------------------------------------------------ */}
          <section className="seccion">
            <h2 className="seccion__titulo">{t('editorPerfil.seccionGraficas')}</h2>
            {perfil.graficas.length === 0 && <p className="lista-vacia">{t('editorPerfil.sinFilas')}</p>}
            {perfil.graficas.map((grafica, idx) => (
              <FilaGrafica
                key={idx}
                grafica={grafica}
                clavesDisponibles={clavesDisponibles}
                onCambiar={(cambios) => campo('graficas', actualizarEnLista(perfil.graficas, idx, cambios))}
                onQuitar={() => campo('graficas', quitarDeLista(perfil.graficas, idx))}
                t={t}
              />
            ))}
            <button
              type="button"
              className="agregar-fila"
              onClick={() => campo('graficas', [...perfil.graficas, { id: '', titulo: '', variables: [] }])}
            >
              <Plus size={15} aria-hidden />
              {t('editorPerfil.agregarGrafica')}
            </button>
          </section>

          {/* --- 8. Acciones ------------------------------------------------------------------------ */}
          <section className="seccion">
            <h2 className="seccion__titulo">{t('editorPerfil.seccionAcciones')}</h2>

            {erroresValidacion && erroresValidacion.length > 0 && (
              <ul className="validacion" role="alert">
                <li>{t('editorPerfil.validarErrores', { count: erroresValidacion.length })}</li>
                {erroresValidacion.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
            {mensajeOk && (
              <p className="auth-ok">
                <CheckCircle2 size={15} aria-hidden /> {mensajeOk}
              </p>
            )}
            {errorAccion && (
              <p className="auth-error" role="alert">
                <AlertTriangle size={15} aria-hidden /> {errorAccion}
              </p>
            )}

            <div className="editor__acciones">
              <button type="button" className="boton-tenue" onClick={validar}>
                <CheckCircle2 size={16} aria-hidden />
                {t('editorPerfil.validar')}
              </button>
              <button type="button" className="boton-tenue" onClick={() => void exportar()} disabled={exportando}>
                <Download size={16} aria-hidden />
                {exportando ? t('editorPerfil.exportando') : t('editorPerfil.exportar')}
              </button>
              <label className="boton-tenue">
                <Upload size={16} aria-hidden />
                {importando ? t('editorPerfil.importando') : t('editorPerfil.importar')}
                <input type="file" accept=".xlsx" hidden onChange={(e) => void importar(e)} disabled={importando} />
              </label>
              <button
                type="button"
                className="auth-boton"
                onClick={() => void guardar('base')}
                disabled={guardando}
              >
                <Save size={16} aria-hidden />
                {guardando ? t('editorPerfil.guardando') : t('editorPerfil.guardarBase')}
              </button>
              <button
                type="button"
                className="auth-boton"
                onClick={() => void guardar('equipo')}
                disabled={guardando || !perfil.equipoId}
              >
                <Save size={16} aria-hidden />
                {guardando ? t('editorPerfil.guardando') : t('editorPerfil.guardarPersonalizada')}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// --- Sección 2/3: variables de lectura y de control (misma forma; control agrega grupoEscritura) --------

interface PropsSeccionVariables {
  titulo: string;
  variables: VariableLectura[] | VariableControl[];
  conGrupoEscritura: boolean;
  onCambiar: (lista: VariableLectura[] | VariableControl[]) => void;
  t: (clave: string, opciones?: Record<string, unknown>) => string;
}

function SeccionVariables({ titulo, variables, conGrupoEscritura, onCambiar, t }: PropsSeccionVariables) {
  return (
    <section className="seccion">
      <h2 className="seccion__titulo">{titulo}</h2>
      {variables.length === 0 && <p className="lista-vacia">{t('editorPerfil.sinFilas')}</p>}
      {variables.map((v, idx) => (
        <div className="fila" key={idx}>
          <label className="auth-campo">
            {t('editorPerfil.campo.clave')}
            <input
              type="text"
              value={v.clave}
              onChange={(e) => onCambiar(actualizarEnLista(variables, idx, { clave: e.target.value }))}
            />
          </label>
          <label className="auth-campo">
            {t('editorPerfil.campo.etiqueta')}
            <input
              type="text"
              value={v.etiqueta}
              onChange={(e) => onCambiar(actualizarEnLista(variables, idx, { etiqueta: e.target.value }))}
            />
          </label>
          <label className="auth-campo">
            {t('editorPerfil.campo.tipoDato')}
            <select
              value={v.tipoDato}
              onChange={(e) => onCambiar(actualizarEnLista(variables, idx, { tipoDato: e.target.value as TipoDato }))}
            >
              {TIPOS_DATO.map((td) => (
                <option key={td} value={td}>
                  {t(`tipoDato.${td}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="auth-campo">
            {t('editorPerfil.campo.direccion')}
            <input
              type="text"
              value={v.direccion}
              onChange={(e) => onCambiar(actualizarEnLista(variables, idx, { direccion: e.target.value }))}
            />
          </label>
          <label className="auth-campo">
            {t('editorPerfil.campo.escala')}
            <input
              type="number"
              value={v.escala ?? ''}
              onChange={(e) =>
                onCambiar(
                  actualizarEnLista(variables, idx, { escala: e.target.value === '' ? undefined : Number(e.target.value) }),
                )
              }
            />
          </label>
          <label className="auth-campo">
            {t('editorPerfil.campo.offset')}
            <input
              type="number"
              value={v.offset ?? ''}
              onChange={(e) =>
                onCambiar(
                  actualizarEnLista(variables, idx, { offset: e.target.value === '' ? undefined : Number(e.target.value) }),
                )
              }
            />
          </label>
          <label className="auth-campo">
            {t('editorPerfil.campo.unidad')}
            <input
              type="text"
              value={v.unidad ?? ''}
              onChange={(e) => onCambiar(actualizarEnLista(variables, idx, { unidad: e.target.value }))}
            />
          </label>
          {conGrupoEscritura && (
            <label className="auth-campo">
              {t('editorPerfil.campo.grupoEscritura')}
              <select
                value={(v as VariableControl).grupoEscritura}
                onChange={(e) =>
                  onCambiar(actualizarEnLista(variables, idx, { grupoEscritura: e.target.value as GrupoEscritura } as Partial<VariableControl>))
                }
              >
                {GRUPOS_ESCRITURA.map((g) => (
                  <option key={g} value={g}>
                    {t(`grupoEscritura.${g}`)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            className="icono-boton icono-boton--peligro fila__quitar"
            title={t('editorPerfil.quitar')}
            onClick={() => onCambiar(quitarDeLista(variables, idx))}
          >
            <Trash2 size={15} aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="agregar-fila"
        onClick={() =>
          onCambiar([
            ...variables,
            conGrupoEscritura
              ? { clave: '', etiqueta: '', tipoDato: 'bool', direccion: '', grupoEscritura: 'admin_app_vpn' }
              : { clave: '', etiqueta: '', tipoDato: 'bool', direccion: '' },
          ])
        }
      >
        <Plus size={15} aria-hidden />
        {t(conGrupoEscritura ? 'editorPerfil.agregarControl' : 'editorPerfil.agregarLectura')}
      </button>
    </section>
  );
}

// --- Sección 4: fila de una alarma del catálogo ----------------------------------------------------------

interface PropsFilaAlarma {
  alarma: EntradaCatalogoAlarma;
  clavesDisponibles: string[];
  onCambiar: (cambios: Partial<EntradaCatalogoAlarma>) => void;
  onQuitar: () => void;
  t: (clave: string, opciones?: Record<string, unknown>) => string;
}

function FilaAlarma({ alarma, clavesDisponibles, onCambiar, onQuitar, t }: PropsFilaAlarma) {
  return (
    <div className="fila-compuesta">
      <div className="fila-compuesta__top">
        <label className="auth-campo">
          {t('editorPerfil.campo.codigo')}
          <input type="text" value={alarma.codigo} onChange={(e) => onCambiar({ codigo: e.target.value })} />
        </label>
        <label className="auth-campo">
          {t('editorPerfil.campo.variable')}
          <select value={alarma.variable} onChange={(e) => onCambiar({ variable: e.target.value })}>
            <option value=""></option>
            {clavesDisponibles.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-campo">
          {t('editorPerfil.campo.tipo')}
          <select value={alarma.tipo} onChange={(e) => onCambiar({ tipo: e.target.value as TipoAlarma })}>
            {TIPOS_ALARMA.map((ta) => (
              <option key={ta} value={ta}>
                {t(`tipoAlarma.${ta}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-campo">
          {t('editorPerfil.campo.condicion')}
          <input type="text" value={alarma.condicion} onChange={(e) => onCambiar({ condicion: e.target.value })} />
        </label>
        <button
          type="button"
          className="icono-boton icono-boton--peligro fila-compuesta__quitar"
          title={t('editorPerfil.quitar')}
          onClick={onQuitar}
        >
          <Trash2 size={15} aria-hidden />
        </button>
      </div>
      <div className="fila-compuesta__extra">
        <p className="subtitulo-lista">{t('editorPerfil.campo.descripcion')}</p>
        <div className="fila-compuesta__idiomas">
          {IDIOMAS.map((idioma) => (
            <label className="auth-campo" key={idioma}>
              {t(`idioma.${idioma}`)}
              <input
                type="text"
                value={alarma.descripcion[idioma]}
                onChange={(e) => onCambiar({ descripcion: { ...alarma.descripcion, [idioma]: e.target.value } })}
              />
            </label>
          ))}
        </div>
        <p className="subtitulo-lista">{t('editorPerfil.campo.ayuda')}</p>
        <div className="fila-compuesta__idiomas">
          {IDIOMAS.map((idioma) => (
            <label className="auth-campo" key={idioma}>
              {t(`idioma.${idioma}`)}
              <input
                type="text"
                value={alarma.ayuda?.[idioma] ?? ''}
                onChange={(e) =>
                  onCambiar({
                    ayuda: {
                      es: alarma.ayuda?.es ?? '',
                      en: alarma.ayuda?.en ?? '',
                      fr: alarma.ayuda?.fr ?? '',
                      pt: alarma.ayuda?.pt ?? '',
                      [idioma]: e.target.value,
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Sección 6: fila de un nodo del diagrama --------------------------------------------------------------

interface PropsFilaNodo {
  nodo: NodoDiagrama;
  clavesDisponibles: string[];
  onCambiar: (cambios: Partial<NodoDiagrama>) => void;
  onQuitar: () => void;
  t: (clave: string, opciones?: Record<string, unknown>) => string;
}

function FilaNodo({ nodo, clavesDisponibles, onCambiar, onQuitar, t }: PropsFilaNodo) {
  const variables = nodo.variables ?? [];
  return (
    <div className="fila-compuesta">
      <div className="fila-compuesta__top">
        <label className="auth-campo">
          {t('editorPerfil.campo.nodoId')}
          <input type="text" value={nodo.id} onChange={(e) => onCambiar({ id: e.target.value })} />
        </label>
        <label className="auth-campo">
          {t('editorPerfil.campo.tipo')}
          <select value={nodo.tipo} onChange={(e) => onCambiar({ tipo: e.target.value as TipoNodoDiagrama })}>
            {TIPOS_NODO.map((tn) => (
              <option key={tn} value={tn}>
                {t(`tipoNodo.${tn}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-campo">
          {t('editorPerfil.campo.etiqueta')}
          <input type="text" value={nodo.etiqueta} onChange={(e) => onCambiar({ etiqueta: e.target.value })} />
        </label>
        <label className="auth-campo">
          {t('editorPerfil.campo.x')}
          <input type="number" value={nodo.x} onChange={(e) => onCambiar({ x: Number(e.target.value) || 0 })} />
        </label>
        <label className="auth-campo">
          {t('editorPerfil.campo.y')}
          <input type="number" value={nodo.y} onChange={(e) => onCambiar({ y: Number(e.target.value) || 0 })} />
        </label>
        <button
          type="button"
          className="icono-boton icono-boton--peligro fila-compuesta__quitar"
          title={t('editorPerfil.quitar')}
          onClick={onQuitar}
        >
          <Trash2 size={15} aria-hidden />
        </button>
      </div>
      <div className="fila-compuesta__extra">
        <p className="subtitulo-lista">{t('editorPerfil.campo.variables')}</p>
        <div className="casillas">
          {clavesDisponibles.map((clave) => {
            const marcada = variables.includes(clave);
            return (
              <label className="casilla" key={clave}>
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() =>
                    onCambiar({ variables: marcada ? variables.filter((c) => c !== clave) : [...variables, clave] })
                  }
                />
                {clave}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Sección 6: fila de una conexión del diagrama ---------------------------------------------------------

interface PropsFilaConexion {
  conexion: ConexionDiagrama;
  idsNodos: string[];
  onCambiar: (cambios: Partial<ConexionDiagrama>) => void;
  onQuitar: () => void;
  t: (clave: string, opciones?: Record<string, unknown>) => string;
}

function FilaConexion({ conexion, idsNodos, onCambiar, onQuitar, t }: PropsFilaConexion) {
  return (
    <div className="fila">
      <label className="auth-campo">
        {t('editorPerfil.campo.desde')}
        <select value={conexion.desde} onChange={(e) => onCambiar({ desde: e.target.value })}>
          <option value=""></option>
          {idsNodos.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <label className="auth-campo">
        {t('editorPerfil.campo.hasta')}
        <select value={conexion.hasta} onChange={(e) => onCambiar({ hasta: e.target.value })}>
          <option value=""></option>
          {idsNodos.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <label className="auth-campo">
        {t('editorPerfil.campo.etiquetaConexion')}
        <input type="text" value={conexion.etiqueta ?? ''} onChange={(e) => onCambiar({ etiqueta: e.target.value })} />
      </label>
      <button
        type="button"
        className="icono-boton icono-boton--peligro fila__quitar"
        title={t('editorPerfil.quitar')}
        onClick={onQuitar}
      >
        <Trash2 size={15} aria-hidden />
      </button>
    </div>
  );
}

// --- Sección 7: fila de una plantilla de gráfica ------------------------------------------------------------

interface PropsFilaGrafica {
  grafica: PlantillaGrafica;
  clavesDisponibles: string[];
  onCambiar: (cambios: Partial<PlantillaGrafica>) => void;
  onQuitar: () => void;
  t: (clave: string, opciones?: Record<string, unknown>) => string;
}

function FilaGrafica({ grafica, clavesDisponibles, onCambiar, onQuitar, t }: PropsFilaGrafica) {
  return (
    <div className="fila-compuesta">
      <div className="fila-compuesta__top">
        <label className="auth-campo">
          {t('editorPerfil.campo.graficaId')}
          <input type="text" value={grafica.id} onChange={(e) => onCambiar({ id: e.target.value })} />
        </label>
        <label className="auth-campo">
          {t('editorPerfil.campo.graficaTitulo')}
          <input type="text" value={grafica.titulo} onChange={(e) => onCambiar({ titulo: e.target.value })} />
        </label>
        <button
          type="button"
          className="icono-boton icono-boton--peligro fila-compuesta__quitar"
          title={t('editorPerfil.quitar')}
          onClick={onQuitar}
        >
          <Trash2 size={15} aria-hidden />
        </button>
      </div>
      <div className="fila-compuesta__extra">
        <p className="subtitulo-lista">{t('editorPerfil.campo.variables')}</p>
        <div className="casillas">
          {clavesDisponibles.map((clave) => {
            const marcada = grafica.variables.includes(clave);
            return (
              <label className="casilla" key={clave}>
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() =>
                    onCambiar({
                      variables: marcada
                        ? grafica.variables.filter((c) => c !== clave)
                        : [...grafica.variables, clave],
                    })
                  }
                />
                {clave}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
