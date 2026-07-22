// Gestión de plantillas BASE de perfil de dispositivo (Fase 6.6.10), rol Administrador. Alcance de esta
// versión: los 3 tipos de planta tienen un número FIJO y conocido (osmosis/ptar/hidroneumatico), así que
// listarlos no necesita un endpoint de listado — solo se consulta si cada uno ya tiene plantilla base
// guardada. Las plantillas PERSONALIZADAS (por equipo) quedan pendientes: dependen de un alta de planta/
// equipo que todavía no existe como pantalla (AltaCliente solo da de alta Familia + PC, no equipos/plantas
// individuales) — no es un olvido, es un bloqueo real documentado en plan-de-trabajo.md.
import { useEffect, useState } from 'react';
import { CheckCircle2, FileCog, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { obtenerPerfilBase } from '../lib/api';
import type { TipoPlanta } from '../perfiles/tipos';
import './lista.css';

const TIPOS_PLANTA: TipoPlanta[] = ['osmosis', 'ptar', 'hidroneumatico'];

export function GestionPlantillas() {
  const { t } = useTranslation();
  const [estado, setEstado] = useState<Record<TipoPlanta, boolean | null>>({
    osmosis: null,
    ptar: null,
    hidroneumatico: null,
  });

  useEffect(() => {
    let activo = true;
    for (const tipo of TIPOS_PLANTA) {
      void obtenerPerfilBase(tipo).then(
        (r) => activo && setEstado((prev) => ({ ...prev, [tipo]: r.perfil !== null })),
        () => activo && setEstado((prev) => ({ ...prev, [tipo]: false })),
      );
    }
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="panel">
      <p className="panel__titulo">{t('gestionPlantillas.titulo')}</p>
      <p className="vacio">{t('gestionPlantillas.sub')}</p>

      <ul className="lista">
        {TIPOS_PLANTA.map((tipo) => (
          <li className="fila-lista" key={tipo}>
            <div className="fila-lista__cab">
              <span className="fila-lista__principal">{t(`tipoPlanta.${tipo}`)}</span>
              {estado[tipo] === null ? (
                <span className="fila-lista__meta">{t('app.cargando')}</span>
              ) : estado[tipo] ? (
                <span className="fila-lista__meta">
                  <CheckCircle2 size={14} aria-hidden /> {t('gestionPlantillas.existe')}
                </span>
              ) : (
                <span className="fila-lista__meta">
                  <XCircle size={14} aria-hidden /> {t('gestionPlantillas.noExiste')}
                </span>
              )}
            </div>
            <Link to="/editor-perfil" className="boton-tenue">
              <FileCog size={15} aria-hidden />
              {t('nav.editorPerfil')}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
