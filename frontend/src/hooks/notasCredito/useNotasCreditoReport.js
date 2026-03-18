import { useState } from 'react';
import { facturasApi } from '../../services/facturasApi.js';
import {
  buildNotasCreditoReportRows,
  downloadNotasCreditoReportExcel
} from '../../utils/notasCreditoExcelReport.js';

export const useNotasCreditoReport = ({
  sociedadId,
  query,
  dependencies = {}
}) => {
  const {
    api = facturasApi,
    buildReportRows = buildNotasCreditoReportRows,
    downloadReport = downloadNotasCreditoReportExcel
  } = dependencies;

  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportMessage, setReportMessage] = useState('');

  const exportReport = async () => {
    if (!sociedadId || reportLoading) return;

    try {
      setReportLoading(true);
      setReportError('');
      setReportMessage('');

      const notasCredito = await api.listAllNotasCredito({
        sociedadId,
        ...(query || {}),
      });

      const rows = buildReportRows({ notasCredito });
      if (rows.length === 0) {
        setReportError('No hay notas de credito para generar el reporte.');
        return;
      }

      downloadReport({
        rows,
        sociedadId
      });

      setReportMessage(`Reporte generado con ${rows.length} notas de credito filtradas.`);
    } catch (err) {
      const apiError = err?.response?.data?.error || err?.message || 'No se pudo generar el reporte de notas de credito.';
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
