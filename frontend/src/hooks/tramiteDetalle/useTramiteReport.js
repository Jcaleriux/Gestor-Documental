import { useState } from 'react';
import {
  buildTramiteReportRows,
  downloadTramiteReportExcel
} from '../../utils/tramiteExcelReport.js';

export const useTramiteReport = ({
  tramite = null,
  documentos = [],
  providerGroups = [],
  providerSortDirection = 'asc',
  sociedadId,
  sociedadLabel,
  dependencies = {}
} = {}) => {
  const {
    buildReportRows = buildTramiteReportRows,
    downloadReport = downloadTramiteReportExcel
  } = dependencies;

  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportMessage, setReportMessage] = useState('');

  const exportReport = async () => {
    if (!tramite?.id || reportLoading) return;

    try {
      setReportLoading(true);
      setReportError('');
      setReportMessage('');

      const rows = buildReportRows({
        tramite,
        documentos,
        providerGroups,
        direction: providerSortDirection
      });

      if (rows.length === 0) {
        setReportError('No hay documentos activos en el tramite para generar el reporte.');
        return;
      }

      downloadReport({
        rows,
        sociedadId,
        sociedadLabel,
        tramiteId: tramite.id
      });

      setReportMessage(`Reporte generado con ${rows.length} documentos del tramite.`);
    } catch (err) {
      const apiError = err?.response?.data?.error || err?.message || 'No se pudo generar el reporte del tramite.';
      setReportError(apiError);
    } finally {
      setReportLoading(false);
    }
  };

  return {
    reportLoading,
    reportError,
    reportMessage,
    exportReport
  };
};
