// Alta de planta/equipo (Fase 6.6.13), rol Administrador: cierra el vacío real que bloqueaba la mitad
// "personalizada" de GestionPlantillas.tsx — hasta ahora un equipoId circulaba por todo el sistema
// (telemetría, alarmas, control, perfiles) sin que existiera ninguna fila que dijera de qué Familia es,
// cómo se llama o en qué IP/PLC vive. Esta pantalla da de alta ese registro (Plant_Equipos) y,
// opcionalmente, siembra su perfil personalizado a partir de la plantilla base del tipo de planta antes
// de mandar al Administrador a terminarlo de configurar en EditorPerfil.tsx.
import { useCallback, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, FileCog, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  guardarEquipo,
  guardarPerfilEquipo,
  listarEquipos,
  listarPcs,
  listarZonas,
  obtenerPerfilBase,
  type EquipoApi,
  type PcApi,
  type ZonaApi,
} from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import { perfilVacio, type ModeloPLC, type TipoPlanta } from '../perfiles/tipos';
import './lista.css';

const TIPOS_PLANTA: TipoPlanta[] = ['osmosis', 'ptar', 'hidroneumatico'];
const MODELOS_PLC: ModeloPLC[] = ['siemens_s7_1200', 'mitsubishi_fx5', 'delta_as200'];

export function AltaEquipo() {
  const { t } = useTranslation();

  const [familiaId, setFamiliaId] = useState('');
  const [equipos, setEquipos] = useState<EquipoApi[] | null>(null);
  const [zonas, setZonas] = useState<ZonaApi[]>([]);
  const [pcs, setPcs] = useState<PcApi[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [tipoPlanta, setTipoPlanta] = useState<TipoPlanta>('osmosis');
  const [modeloPLC, setModeloPLC] = useState<ModeloPLC>('siemens_s7_1200');
  const [ip, setIp] = useState('');
  const [puerto, setPuerto] = useState(102);
  const [zonaId, setZonaId] = useState('');
  const [pcId, setPcId] = useState('');
  const [sembrarBase, setSembrarBase] = useState(true);
  const [creando, setCreando] = useState(false);
  const [ultimoCreado, setUltimoCreado] = useState<EquipoApi | null>(null);

  const cargar = useCallback(
    async (id: string) => {
      setCargando(true);
      setError(null);
      try {
        const [rEquipos, rZonas, rPcs] = await Promise.all([listarEquipos(id), listarZonas(id), listarPcs(id)]);
        setEquipos(rEquipos.equipos);
        setZonas(rZonas.zonas);
        setPcs(rPcs.pcs);
      } catch (e) {
        setError(codigoAMensaje(t, e));
        setEquipos(null);
      } finally {
        setCargando(false);
      }
    },
    [t],
  );

  function buscar(e: FormEvent) {
    e.preventDefault();
    if (familiaId.trim()) void cargar(familiaId.trim());
  }

  async function altaEquipo(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !ip.trim()) return;
    setCreando(true);
    setError(null);
    setUltimoCreado(null);
    try {
      const { equipo } = await guardarEquipo({
        familiaId: familiaId.trim(),
        nombre: nombre.trim(),
        tipoPlanta,
        modeloPLC,
        ip: ip.trim(),
        puerto,
        zonaId: zonaId || undefined,
        pcId: pcId || undefined,
      });

      // Siembra opcional: copia la plantilla base del tipo de planta como punto de partida del perfil
      // personalizado, en vez de dejarlo vacío — el Administrador solo ajusta lo que cambia por equipo.
      if (sembrarBase) {
        const { perfil: base } = await obtenerPerfilBase(tipoPlanta);
        const perfilInicial = {
          ...(base ?? perfilVacio(tipoPlanta, false)),
          equipoId: equipo.equipoId,
          nombre: equipo.nombre,
          cliente: familiaId.trim(),
          modeloPLC: equipo.modeloPLC,
          ip: equipo.ip,
          puerto: equipo.puerto,
          perfil: { ...(base?.perfil ?? { esBase: false, tipoBase: tipoPlanta, version: 1 }), esBase: false },
        };
        await guardarPerfilEquipo(equipo.equipoId, perfilInicial);
      }

      setUltimoCreado(equipo);
      setNombre('');
      setIp('');
      await cargar(familiaId.trim());
    } catch (err) {
      setError(codigoAMensaje(t, err));
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="panel">
      <p className="panel__titulo">{t('altaEquipo.titulo')}</p>
      <p className="vacio">{t('altaEquipo.sub')}</p>

      <form className="panel-acciones" onSubmit={buscar}>
        <label className="auth-campo">
          {t('altaCliente.numeroCliente')} / familiaId
          <input type="text" value={familiaId} onChange={(e) => setFamiliaId(e.target.value)} required />
        </label>
        <button type="submit" className="boton-tenue" disabled={cargando}>
          {cargando ? t('dashboard.buscando') : t('dashboard.buscar')}
        </button>
      </form>

      {error && (
        <p className="auth-error" role="alert">
          <AlertTriangle size={15} aria-hidden /> {error}
        </p>
      )}

      {equipos && (
        <>
          <form className="panel-acciones" onSubmit={altaEquipo}>
            <label className="auth-campo">
              {t('altaEquipo.nombre')}
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </label>
            <label className="auth-campo">
              {t('editorPerfil.tipoPlantaEtiqueta')}
              <select value={tipoPlanta} onChange={(e) => setTipoPlanta(e.target.value as TipoPlanta)}>
                {TIPOS_PLANTA.map((tp) => (
                  <option key={tp} value={tp}>
                    {t(`tipoPlanta.${tp}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="auth-campo">
              {t('altaEquipo.modeloPLC')}
              <select value={modeloPLC} onChange={(e) => setModeloPLC(e.target.value as ModeloPLC)}>
                {MODELOS_PLC.map((m) => (
                  <option key={m} value={m}>
                    {t(`modeloPLC.${m}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="auth-campo">
              {t('altaEquipo.ip')}
              <input type="text" value={ip} onChange={(e) => setIp(e.target.value)} required />
            </label>
            <label className="auth-campo">
              {t('altaEquipo.puerto')}
              <input
                type="number"
                value={puerto}
                onChange={(e) => setPuerto(Number(e.target.value))}
                min={1}
                max={65535}
                required
              />
            </label>
            <label className="auth-campo">
              {t('altaEquipo.zona')}
              <select value={zonaId} onChange={(e) => setZonaId(e.target.value)}>
                <option value="">{t('altaEquipo.sinZona')}</option>
                {zonas.map((z) => (
                  <option key={z.zonaId} value={z.zonaId}>
                    {z.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="auth-campo">
              {t('altaEquipo.pc')}
              <select value={pcId} onChange={(e) => setPcId(e.target.value)}>
                <option value="">{t('altaEquipo.sinPc')}</option>
                {pcs.map((pc) => (
                  <option key={pc.pcId} value={pc.pcId}>
                    {pc.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="auth-campo auth-campo--casilla">
              <input type="checkbox" checked={sembrarBase} onChange={(e) => setSembrarBase(e.target.checked)} />
              {t('altaEquipo.sembrarBase')}
            </label>
            <button type="submit" className="boton-tenue" disabled={creando}>
              <Plus size={16} aria-hidden />
              {creando ? t('altaEquipo.creando') : t('altaEquipo.crear')}
            </button>
          </form>

          {ultimoCreado && (
            <p className="auth-ok" role="status">
              <CheckCircle2 size={16} aria-hidden />{' '}
              {t('altaEquipo.creadoOk', { nombre: ultimoCreado.nombre })}{' '}
              <Link to={`/editor-perfil?equipoId=${ultimoCreado.equipoId}`} className="auth-link">
                {t('altaEquipo.irAEditor')}
              </Link>
            </p>
          )}

          {equipos.length === 0 && <p className="vacio">{t('altaEquipo.sinEquipos')}</p>}

          <ul className="lista">
            {equipos.map((eq) => (
              <li className="fila-lista" key={eq.equipoId}>
                <div className="fila-lista__cab">
                  <span className="fila-lista__principal">{eq.nombre}</span>
                  <span className="fila-lista__meta">
                    {t(`tipoPlanta.${eq.tipoPlanta}`)} · {eq.ip}
                  </span>
                </div>
                <Link to={`/editor-perfil?equipoId=${eq.equipoId}`} className="boton-tenue">
                  <FileCog size={15} aria-hidden />
                  {t('nav.editorPerfil')}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
