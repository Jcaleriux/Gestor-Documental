import { useState } from 'react';
import { buildUnifiedPdfDownloadUrl } from '../../services/tramitesApi.js';
import {
  buildTramiteReportRows,
  downloadTramiteReportExcel
} from '../../utils/tramiteExcelReport.js';
import { downloadProtectedResource } from '../../utils/protectedResources.js';
import { readResponseHeader } from '../../constants/responseHeaders.js';

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
    downloadReport = downloadTramiteReportExcel,
    buildUnifiedPdfUrl = buildUnifiedPdfDownloadUrl,
    downloadProtectedFile = downloadProtectedResource,
  } = dependencies;

  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [downloadUnifiedPdfLoading, setDownloadUnifiedPdfLoading] = useState(false);
  const [downloadUnifiedPdfError, setDownloadUnifiedPdfError] = useState('');
  const [downloadUnifiedPdfMessage, setDownloadUnifiedPdfMessage] = useState('');
  const [downloadUnifiedPdfWarning, setDownloadUnifiedPdfWarning] = useState('');

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

  const downloadUnifiedPdf = async () => {
    if (!tramite?.id || downloadUnifiedPdfLoading) return;

    try {
      setDownloadUnifiedPdfLoading(true);
      setDownloadUnifiedPdfError('');
      setDownloadUnifiedPdfMessage('');
      setDownloadUnifiedPdfWarning('');

      if (!Array.isArray(documentos) || documentos.length === 0) {
        setDownloadUnifiedPdfError('No hay documentos activos en el tramite para descargar el PDF unificado.');
        return;
      }

      const url = buildUnifiedPdfUrl(tramite.id, {
        providerSortDirection,
      });
      const { response } = await downloadProtectedFile(url, {
        fallbackFilename: `tramite_${tramite.id}_vista_unificada.pdf`,
      });
      const partialDownload = readResponseHeader(response.headers, 'partialDownload') === '1';
      const omittedCount = Number(readResponseHeader(response.headers, 'omittedCount') || 0);
      const omittedItems = readResponseHeader(response.headers, 'omittedItems');

      if (partialDownload) {
        const countLabel = omittedCount > 0 ? omittedCount : 'varios';
        const summary = omittedItems ? ` ${omittedItems}` : '';
        setDownloadUnifiedPdfWarning(
          `Se descargo el PDF unificado con ${countLabel} archivos omitidos.${summary}`.trim()
        );
        return;
      }

      setDownloadUnifiedPdfMessage('PDF unificado descargado correctamente.');
    } catch (err) {
      const apiError = err?.response?.data?.error || err?.message || 'No se pudo descargar el PDF unificado del tramite.';
      setDownloadUnifiedPdfError(apiError);
    } finally {
      setDownloadUnifiedPdfLoading(false);
    }
  };

  return {
    reportLoading,
    reportError,
    reportMessage,
    exportReport,
    downloadUnifiedPdfLoading,
    downloadUnifiedPdfError,
    downloadUnifiedPdfMessage,
    downloadUnifiedPdfWarning,
    downloadUnifiedPdf,
  };
};
