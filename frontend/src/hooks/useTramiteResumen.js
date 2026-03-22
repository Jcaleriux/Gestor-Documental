import { useMemo } from 'react';
import { formatAmount, getMoneda, getMontoDocumento } from '../utils/formatters.js';

const getMontoRetencion = (item) => {
  const monto = Number(item?.monto_retencion ?? item?.monto_retencion_pendiente ?? 0);
  return Number.isFinite(monto) ? monto : 0;
};

const isDocumentoActivo = (estadoTesoreria) => (
  estadoTesoreria !== 'excluido' && estadoTesoreria !== 'devuelto_contabilidad'
);

function useTramiteResumen(documentos = [], retenciones = []) {
  const documentosActivos = useMemo(
    () => documentos.filter((doc) => isDocumentoActivo(doc.estado_tesoreria)),
    [documentos]
  );

  const retencionesActivas = useMemo(
    () => retenciones.filter((ret) => ret.estado_tesoreria !== 'excluido'),
    [retenciones]
  );

  const resumenTotales = useMemo(() => {
    const totalFacturas = documentosActivos.length;
    const totalRetenciones = retencionesActivas.length;
    const sumaFacturas = documentosActivos.reduce(
      (acc, doc) => acc + getMontoDocumento(doc, { preferAjustado: true }),
      0
    );
    const sumaRetenciones = retencionesActivas.reduce(
      (acc, ret) => acc + getMontoRetencion(ret),
      0
    );
    const porMoneda = documentosActivos.reduce((acc, doc) => {
      const moneda = getMoneda(doc);
      acc[moneda] = (acc[moneda] || 0) + getMontoDocumento(doc, { preferAjustado: true });
      return acc;
    }, {});

    retencionesActivas.forEach((ret) => {
      const moneda = ret.moneda || 'CRC';
      porMoneda[moneda] = (porMoneda[moneda] || 0) + getMontoRetencion(ret);
    });

    return {
      totalFacturas,
      totalRetenciones,
      totalDocs: totalFacturas + totalRetenciones,
      sumaFacturas,
      sumaRetenciones,
      suma: sumaFacturas + sumaRetenciones,
      porMoneda
    };
  }, [documentosActivos, retencionesActivas]);

  const resumenMoneda = useMemo(() => {
    const entries = Object.entries(resumenTotales.porMoneda || {});
    if (entries.length === 0) return '';
    return entries.map(([moneda, total]) => `${moneda}: ${formatAmount(total)}`).join(' - ');
  }, [resumenTotales]);

  return { documentosActivos, retencionesActivas, resumenTotales, resumenMoneda };
}

export default useTramiteResumen;
