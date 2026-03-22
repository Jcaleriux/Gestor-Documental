import { useRef, useState } from 'react';
import {
  extractFacturasPagePayload,
  extractNotasCreditoPagePayload,
  facturasApi,
} from '../../services/facturasApi.js';
import {
  buildFacturasReportRows,
  downloadFacturasReportExcel
} from '../../utils/facturasExcelReport.js';

const toManifestCacheKey = (documentType, documentId) => `${documentType}:${documentId}`;

const extractReceivedTime = (manifestResponse) => {
  const payload = manifestResponse?.data ?? manifestResponse;
  if (!payload || typeof payload !== 'object') return null;

  const receivedTime = payload.received_time;
  if (receivedTime === null || receivedTime === undefined || receivedTime === '') {
    return null;
  }
  return String(receivedTime);
};

const enrichWithManifestReceivedTime = async ({
  documentos = [],
  documentType,
  getManifest,
  cache
}) => {
  if (!Array.isArray(documentos) || documentos.length === 0) return [];
  if (typeof getManifest !== 'function') return documentos;

  return Promise.all(documentos.map(async (documento) => {
    const documentId = documento?.id;
    if (!documentId) {
      return { ...documento, manifest_received_time: null };
    }

    const cacheKey = toManifestCacheKey(documentType, documentId);
    if (cache.has(cacheKey)) {
      return { ...documento, manifest_received_time: cache.get(cacheKey) };
    }

    if (!documento?.ruta_xml && !documento?.ruta_pdf) {
      cache.set(cacheKey, null);
      return { ...documento, manifest_received_time: null };
    }

    try {
      const manifestResponse = await getManifest(documentId);
      const receivedTime = extractReceivedTime(manifestResponse);
      cache.set(cacheKey, receivedTime);
      return { ...documento, manifest_received_time: receivedTime };
    } catch {
      cache.set(cacheKey, null);
      return { ...documento, manifest_received_time: null };
    }
  }));
};

const fetchAllFacturasForReport = async ({ api, query, sociedadId }) => {
  if (typeof api.listAllFacturas === 'function') {
    return api.listAllFacturas({ sociedadId, ...(query || {}) });
  }

  if (typeof api.listFacturas !== 'function') {
    return [];
  }

  const { page: _ignoredPage, pageSize: _ignoredPageSize, ...baseQuery } = query || {};
  const allItems = [];
  let page = 1;

  while (page <= 100) {
    const response = await api.listFacturas({
      sociedadId,
      ...baseQuery,
      page,
      pageSize: 200,
    });

    const payload = extractFacturasPagePayload(response);
    const items = payload.items;
    allItems.push(...items);

    if (!payload.meta.hasNext) {
      break;
    }

    page += 1;
  }

  return allItems;
};

const fetchAllNotasCreditoForReport = async ({ api, sociedadId }) => {
  if (typeof api.listAllNotasCredito === 'function') {
    return api.listAllNotasCredito({ sociedadId });
  }

  if (typeof api.listNotasCredito !== 'function') {
    return [];
  }

  const firstResponse = await api.listNotasCredito({ sociedadId });
  const legacyPayload = firstResponse?.data?.data;
  if (Array.isArray(legacyPayload)) {
    return legacyPayload;
  }

  const allItems = [];
  let page = 1;
  while (page <= 100) {
    const response = page === 1
      ? firstResponse
      : await api.listNotasCredito({
        sociedadId,
        page,
        pageSize: 200,
      });

    const payload = extractNotasCreditoPagePayload(response);
    allItems.push(...payload.items);

    if (!payload.meta.hasNext) {
      break;
    }

    page += 1;
  }

  return allItems;
};

export const useFacturasReport = ({
  sociedadId,
  query,
  filterNotaCreditoForReport,
  dependencies = {}
}) => {
  const {
    api = facturasApi,
    buildReportRows = buildFacturasReportRows,
    downloadReport = downloadFacturasReportExcel
  } = dependencies;

  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const manifestReceivedTimeCacheRef = useRef(new Map());

  const exportReport = async () => {
    if (!sociedadId || reportLoading) return;

    try {
      setReportLoading(true);
      setReportError('');
      setReportMessage('');

      const [facturas, notasRes, mensajesRes] = await Promise.all([
        fetchAllFacturasForReport({ api, query, sociedadId }),
        fetchAllNotasCreditoForReport({ api, sociedadId }),
        api.listMensajesHacienda({ sociedadId })
      ]);

      const facturasWithReceivedTimePromise = enrichWithManifestReceivedTime({
        documentos: facturas,
        documentType: 'factura',
        getManifest: api.getFacturaManifest,
        cache: manifestReceivedTimeCacheRef.current
      });

      const notasCredito = Array.isArray(notasRes) ? notasRes : [];
      const mensajesHacienda = mensajesRes.data?.success ? (mensajesRes.data.data || []) : [];
      const notasFiltradas = notasCredito.filter(filterNotaCreditoForReport);
      const notasWithReceivedTimePromise = enrichWithManifestReceivedTime({
        documentos: notasFiltradas,
        documentType: 'nota_credito',
        getManifest: api.getNotaCreditoManifest,
        cache: manifestReceivedTimeCacheRef.current
      });

      const [facturasWithReceivedTime, notasWithReceivedTime] = await Promise.all([
        facturasWithReceivedTimePromise,
        notasWithReceivedTimePromise
      ]);

      const rows = buildReportRows({
        facturas: facturasWithReceivedTime,
        notasCredito: notasWithReceivedTime,
        mensajesHacienda
      });

      if (rows.length === 0) {
        setReportError('No hay facturas ni notas de credito para generar el reporte.');
        return;
      }

      downloadReport({
        rows,
        sociedadId
      });

      setReportMessage(`Reporte generado con ${rows.length} registros filtrados.`);
    } catch (err) {
      const apiError = err?.response?.data?.error || err?.message || 'No se pudo generar el reporte de facturas.';
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
