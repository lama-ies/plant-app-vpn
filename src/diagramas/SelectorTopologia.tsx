// Paso 1 del editor de diagrama: elegir la topología (segmentos) según el tipo de planta. Ver spec §6.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TipoPlanta } from '../perfiles/tipos';
import type { SegmentoDiagrama } from './tipos';
import type { SegmentoElegido } from './ensamblador';
import { SEGMENTO_A1, SEGMENTO_A2, SEGMENTO_A3, SEGMENTO_A4, SEGMENTO_A5, SEGMENTO_C8 } from './catalogo/alimentacion';
import { SEGMENTO_N1, SEGMENTO_N2, SEGMENTO_N3 } from './catalogo/nucleos';
import { SEGMENTO_COMPLEMENTO_NINGUNO, SEGMENTO_C1, SEGMENTO_C2, SEGMENTO_UV, SEGMENTO_CISTERNA_FINAL } from './catalogo/complementos';
import { SEGMENTO_CISTERNA_HIDRO, SEGMENTO_LINEA_SUMINISTRO } from './catalogo/hidroneumatico';

const ALIMENTACIONES: Record<string, SegmentoDiagrama> = { A1: SEGMENTO_A1, A2: SEGMENTO_A2, A3: SEGMENTO_A3 };
const PRETRATAMIENTOS: Record<string, SegmentoDiagrama | null> = { ninguno: null, A4: SEGMENTO_A4, A5: SEGMENTO_A5 };
const NUCLEOS: Record<string, SegmentoDiagrama> = { N1: SEGMENTO_N1, N2: SEGMENTO_N2, N3: SEGMENTO_N3 };
const COMPLEMENTOS: Record<string, SegmentoDiagrama> = {
  ninguno: SEGMENTO_COMPLEMENTO_NINGUNO, C1: SEGMENTO_C1, C2: SEGMENTO_C2,
};

interface Props {
  tipoPlanta: TipoPlanta;
  onListo: (secuencia: SegmentoElegido[], numDosificadoras: number) => void;
}

export function SelectorTopologia({ tipoPlanta, onListo }: Props) {
  const { t } = useTranslation();

  if (tipoPlanta === 'hidroneumatico') return <SelectorHidroneumatico onListo={onListo} />;
  if (tipoPlanta !== 'osmosis') {
    return <p className="lista-vacia">{t('diagramaEditor.tipoPlantaSinSoporte')}</p>;
  }

  return <SelectorOsmosis onListo={onListo} />;
}

function SelectorOsmosis({ onListo }: { onListo: Props['onListo'] }) {
  const { t } = useTranslation();
  const [alimentacion, setAlimentacion] = useState('A1');
  const [numPozos, setNumPozos] = useState(1);
  const [pretratamiento, setPretratamiento] = useState('ninguno');
  const [usaC8, setUsaC8] = useState(false);
  const [numBombasC8, setNumBombasC8] = useState(1);
  const [nucleo, setNucleo] = useState('N1');
  const [complemento, setComplemento] = useState('ninguno');
  const [usaUV, setUsaUV] = useState(false);
  const [numDosificadoras, setNumDosificadoras] = useState(0);

  const secuencia = useMemo((): SegmentoElegido[] => {
    const pasos: SegmentoElegido[] = [];
    const segAlimentacion = ALIMENTACIONES[alimentacion];
    pasos.push({ segmento: segAlimentacion, copias: alimentacion === 'A1' ? numPozos : undefined });
    const segPretratamiento = PRETRATAMIENTOS[pretratamiento];
    if (segPretratamiento) pasos.push({ segmento: segPretratamiento });
    if (usaC8) pasos.push({ segmento: SEGMENTO_C8, copias: numBombasC8 });
    pasos.push({ segmento: NUCLEOS[nucleo] });
    pasos.push({ segmento: COMPLEMENTOS[complemento] });
    if (usaUV) pasos.push({ segmento: SEGMENTO_UV });
    pasos.push({ segmento: SEGMENTO_CISTERNA_FINAL });
    return pasos;
  }, [alimentacion, numPozos, pretratamiento, usaC8, numBombasC8, nucleo, complemento, usaUV]);

  return (
    <div className="selector-topologia">
      <label>
        {t('diagramaEditor.alimentacion')}
        <select value={alimentacion} onChange={(e) => setAlimentacion(e.target.value)}>
          <option value="A1">{t('diagramaEditor.alimentacionA1')}</option>
          <option value="A2">{t('diagramaEditor.alimentacionA2')}</option>
          <option value="A3">{t('diagramaEditor.alimentacionA3')}</option>
        </select>
      </label>
      {alimentacion === 'A1' && (
        <label>
          {t('diagramaEditor.numPozos')}
          <input
            type="number" min={1} max={5} value={numPozos}
            onChange={(e) => setNumPozos(Math.min(5, Math.max(1, Number(e.target.value))))}
          />
        </label>
      )}

      <label>
        {t('diagramaEditor.pretratamiento')}
        <select value={pretratamiento} onChange={(e) => setPretratamiento(e.target.value)}>
          <option value="ninguno">{t('diagramaEditor.pretratamientoNinguno')}</option>
          <option value="A4">{t('diagramaEditor.pretratamientoA4')}</option>
          <option value="A5">{t('diagramaEditor.pretratamientoA5')}</option>
        </select>
      </label>

      <label>
        <input type="checkbox" checked={usaC8} onChange={(e) => setUsaC8(e.target.checked)} />
        {t('diagramaEditor.grupoBombasPresion')}
      </label>
      {usaC8 && (
        <label>
          {t('diagramaEditor.numBombas')}
          <input
            type="number" min={1} max={5} value={numBombasC8}
            onChange={(e) => setNumBombasC8(Math.min(5, Math.max(1, Number(e.target.value))))}
          />
        </label>
      )}

      <label>
        {t('diagramaEditor.nucleo')}
        <select value={nucleo} onChange={(e) => setNucleo(e.target.value)}>
          <option value="N1">{t('diagramaEditor.nucleoN1')}</option>
          <option value="N2">{t('diagramaEditor.nucleoN2')}</option>
          <option value="N3">{t('diagramaEditor.nucleoN3')}</option>
        </select>
      </label>

      <label>
        {t('diagramaEditor.complemento')}
        <select value={complemento} onChange={(e) => setComplemento(e.target.value)}>
          <option value="ninguno">{t('diagramaEditor.complementoNinguno')}</option>
          <option value="C1">{t('diagramaEditor.complementoC1')}</option>
          <option value="C2">{t('diagramaEditor.complementoC2')}</option>
        </select>
      </label>
      <label>
        <input type="checkbox" checked={usaUV} onChange={(e) => setUsaUV(e.target.checked)} />
        {t('diagramaEditor.uvOpcional')}
      </label>

      <label>
        {t('diagramaEditor.numDosificadoras')}
        <input
          type="number" min={0} max={5} value={numDosificadoras}
          onChange={(e) => setNumDosificadoras(Math.min(5, Math.max(0, Number(e.target.value))))}
        />
      </label>

      <button type="button" className="boton-primario" onClick={() => onListo(secuencia, numDosificadoras)}>
        {t('diagramaEditor.continuarASensores')}
      </button>
    </div>
  );
}

function SelectorHidroneumatico({ onListo }: { onListo: Props['onListo'] }) {
  const { t } = useTranslation();
  const [numBombas, setNumBombas] = useState(1);
  const secuencia: SegmentoElegido[] = [
    { segmento: SEGMENTO_CISTERNA_HIDRO },
    { segmento: SEGMENTO_C8, copias: numBombas },
    { segmento: SEGMENTO_LINEA_SUMINISTRO },
  ];
  return (
    <div className="selector-topologia">
      <label>
        {t('diagramaEditor.numBombas')}
        <input
          type="number" min={1} max={5} value={numBombas}
          onChange={(e) => setNumBombas(Math.min(5, Math.max(1, Number(e.target.value))))}
        />
      </label>
      <button type="button" className="boton-primario" onClick={() => onListo(secuencia, 0)}>
        {t('diagramaEditor.continuarASensores')}
      </button>
    </div>
  );
}
