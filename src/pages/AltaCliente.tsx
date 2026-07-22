// Alta de cliente (Fase 6.6.8), rol Administrador: crea la Familia (Cliente o zona S&O) y a su gerente/
// owner en un solo paso (Plant_InviteFamilia). El número de cliente es automático (lo asigna el backend);
// el logo, si se elige uno, se sube directo a S3 con una URL prefirmada antes de crear la familia.
import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { crearFamilia, ErrorApi, subirLogoFamilia, urlSubidaLogoFamilia, type RespuestaCrearFamilia } from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import './editor-perfil.css';

export function AltaCliente() {
  const { t } = useTranslation();

  const [familyType, setFamilyType] = useState<'cliente' | 'so'>('cliente');
  const [name, setName] = useState('');
  const [direccion, setDireccion] = useState('');
  const [pais, setPais] = useState('');
  const [idioma, setIdioma] = useState('es');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerNombre, setOwnerNombre] = useState('');
  const [zonasTexto, setZonasTexto] = useState('');
  const [logo, setLogo] = useState<File | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creada, setCreada] = useState<RespuestaCrearFamilia | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      let logoS3Key: string | undefined;
      if (logo) {
        const { s3Key, url } = await urlSubidaLogoFamilia(logo.name);
        await subirLogoFamilia(url, logo);
        logoS3Key = s3Key;
      }
      const zonas = zonasTexto
        .split(',')
        .map((z) => z.trim())
        .filter(Boolean);

      const r = await crearFamilia({
        name: name.trim(),
        familyType,
        ownerEmail: ownerEmail.trim(),
        ownerNombre: ownerNombre.trim() || undefined,
        pais: pais.trim() || undefined,
        idioma,
        direccion: direccion.trim() || undefined,
        logoS3Key,
        zonas: familyType === 'so' && zonas.length ? zonas : undefined,
      });
      setCreada(r);
    } catch (err) {
      setError(err instanceof ErrorApi ? codigoAMensaje(t, err) : t('errores.generico'));
    } finally {
      setEnviando(false);
    }
  }

  if (creada) {
    return (
      <div className="editor">
        <h1 className="editor__titulo">{t('altaCliente.titulo')}</h1>
        <section className="seccion">
          <p className="auth-ok">
            <CheckCircle2 size={16} aria-hidden /> {t('altaCliente.creadaOk')}
          </p>
          <div className="rejilla-campos">
            <p>
              <strong>{t('altaCliente.numeroCliente')}:</strong> {creada.numeroCliente}
            </p>
            <p>
              <strong>{t('activarStaff.correo')}:</strong> {creada.ownerEmail}
            </p>
            <p>
              <strong>{t('activarStaff.rol')}:</strong> {creada.rol}
            </p>
          </div>
          <button type="button" className="boton-tenue" onClick={() => setCreada(null)}>
            {t('altaCliente.crearOtra')}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="editor">
      <h1 className="editor__titulo">{t('altaCliente.titulo')}</h1>
      <p className="editor__sub">{t('altaCliente.sub')}</p>

      <form className="seccion" onSubmit={enviar}>
        <div className="rejilla-campos">
          <label className="auth-campo">
            {t('altaCliente.tipo')}
            <select value={familyType} onChange={(e) => setFamilyType(e.target.value as 'cliente' | 'so')}>
              <option value="cliente">{t('altaCliente.tipoCliente')}</option>
              <option value="so">{t('altaCliente.tipoSo')}</option>
            </select>
          </label>
          <label className="auth-campo">
            {t('altaCliente.nombre')}
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="auth-campo">
            {t('altaCliente.direccion')}
            <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </label>
          <label className="auth-campo">
            {t('altaCliente.pais')}
            <input type="text" value={pais} onChange={(e) => setPais(e.target.value)} />
          </label>
          <label className="auth-campo">
            {t('idioma.etiqueta')}
            <select value={idioma} onChange={(e) => setIdioma(e.target.value)}>
              <option value="es">{t('idioma.es')}</option>
              <option value="en">{t('idioma.en')}</option>
              <option value="fr">{t('idioma.fr')}</option>
              <option value="pt">{t('idioma.pt')}</option>
            </select>
          </label>
          <label className="auth-campo">
            {t('altaCliente.logo')}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <p className="subtitulo-lista">{t('altaCliente.owner')}</p>
        <div className="rejilla-campos">
          <label className="auth-campo">
            {t('activarStaff.correo')}
            <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required />
          </label>
          <label className="auth-campo">
            {t('altaCliente.ownerNombre')}
            <input type="text" value={ownerNombre} onChange={(e) => setOwnerNombre(e.target.value)} />
          </label>
        </div>

        {familyType === 'so' && (
          <label className="auth-campo">
            {t('altaCliente.zonas')}
            <input
              type="text"
              value={zonasTexto}
              onChange={(e) => setZonasTexto(e.target.value)}
              placeholder={t('altaCliente.zonasEjemplo')}
            />
          </label>
        )}

        {error && (
          <p className="auth-error" role="alert">
            <AlertTriangle size={15} aria-hidden /> {error}
          </p>
        )}

        <div className="editor__acciones">
          <button type="submit" className="auth-boton" disabled={enviando}>
            <Upload size={16} aria-hidden />
            {enviando ? t('altaCliente.creando') : t('altaCliente.crear')}
          </button>
        </div>
      </form>
    </div>
  );
}
