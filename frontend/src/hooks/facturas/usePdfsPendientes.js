import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { facturasApi } from '../../services/facturasApi.js';

const getApiPayload = (response, fallback = {}) => response?.data?.data || fallback;

const getApiErrorMessage = (error, fallback) => (
  error?.response?.data?.error
  || error?.response?.data?.message
  || error?.message
  || fallback
);

export const buildPdfPendienteKey = (item) => (
  `${item?.ingestion_id || ''}:${item?.ruta || item?.savedAs || ''}`
);

const deriveCandidateQuery = (item) => {
  const source = item?.originalName || item?.savedAs || '';
  return source
    .replace(/\.[^.]+$/, '')
    .replace(/[_.-]+/g, ' ')
    .trim()
    .slice(0, 120);
};

export const usePdfsPendientes = ({
  sociedadId,
  dependencies = {}
} = {}) => {
  const { api = facturasApi } = dependencies;

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ totalPdfs: 0, totalLotes: 0 });
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [candidateSearchAttempted, setCandidateSearchAttempted] = useState(false);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedFacturaId, setSelectedFacturaId] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const selectedKeyRef = useRef(selectedKey);

  useEffect(() => {
    selectedKeyRef.current = selectedKey;
  }, [selectedKey]);

  const selectedPdf = useMemo(
    () => items.find((item) => buildPdfPendienteKey(item) === selectedKey) || null,
    [items, selectedKey],
  );

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => String(candidate.id) === String(selectedFacturaId)) || null,
    [candidates, selectedFacturaId],
  );

  const fetchPdfs = useCallback(async () => {
    try {
      setLoading(true);
      setActionError('');

      const response = await api.listPdfsPendientes({ sociedadId });
      const payload = getApiPayload(response, { items: [], summary: {} });
      const nextItems = Array.isArray(payload.items) ? payload.items : [];
      const currentKey = selectedKeyRef.current;
      const currentStillExists = nextItems.some((item) => buildPdfPendienteKey(item) === currentKey);
      const nextSelectedKey = currentStillExists
        ? currentKey
        : (nextItems[0] ? buildPdfPendienteKey(nextItems[0]) : '');

      setItems(nextItems);
      setSummary({
        totalPdfs: Number(payload.summary?.totalPdfs || nextItems.length || 0),
        totalLotes: Number(payload.summary?.totalLotes || 0)
      });
      setSelectedKey(nextSelectedKey);

      if (nextSelectedKey !== currentKey) {
        const nextSelectedItem = nextItems.find((item) => buildPdfPendienteKey(item) === nextSelectedKey);
        setCandidateQuery(nextSelectedItem ? deriveCandidateQuery(nextSelectedItem) : '');
        setCandidates([]);
        setCandidateSearchAttempted(false);
        setSelectedFacturaId('');
        setOverwrite(false);
      }
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'No se pudieron cargar los PDFs pendientes.'));
    } finally {
      setLoading(false);
    }
  }, [api, sociedadId]);

  useEffect(() => {
    fetchPdfs();
  }, [fetchPdfs]);

  const selectPdf = useCallback((item) => {
    const key = buildPdfPendienteKey(item);
    setSelectedKey(key);
    setCandidateQuery(deriveCandidateQuery(item));
    setCandidates([]);
    setCandidateSearchAttempted(false);
    setSelectedFacturaId('');
    setOverwrite(false);
    setActionError('');
    setMessage('');
  }, []);

  const searchCandidates = useCallback(async (queryOverride) => {
    const query = String(queryOverride ?? candidateQuery).trim();
    if (!sociedadId) {
      setActionError('Seleccione una sociedad para buscar facturas destino.');
      return;
    }
    if (!query) {
      setCandidates([]);
      setCandidateSearchAttempted(false);
      setSelectedFacturaId('');
      return;
    }

    try {
      setCandidatesLoading(true);
      setActionError('');
      setMessage('');

      const response = await api.searchPdfsPendientesFacturas({
        sociedad_id: sociedadId,
        q: query,
        limit: 20
      });
      const payload = getApiPayload(response, []);
      const nextCandidates = Array.isArray(payload) ? payload : [];

      setCandidates(nextCandidates);
      setCandidateSearchAttempted(true);
      setSelectedFacturaId(nextCandidates[0]?.id ? String(nextCandidates[0].id) : '');
      setOverwrite(false);
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'No se pudieron buscar facturas destino.'));
    } finally {
      setCandidatesLoading(false);
    }
  }, [api, candidateQuery, sociedadId]);

  const assignSelectedPdf = useCallback(async () => {
    if (!selectedPdf) {
      setActionError('Seleccione un PDF pendiente.');
      return;
    }
    if (!selectedFacturaId) {
      setActionError('Seleccione una factura destino.');
      return;
    }
    if (selectedCandidate?.has_pdf && !overwrite) {
      setActionError('La factura destino ya tiene PDF. Confirma el reemplazo de la ruta.');
      return;
    }

    try {
      setAssigning(true);
      setActionError('');
      setMessage('');

      await api.assignPdfPendiente({
        ingestion_id: selectedPdf.ingestion_id,
        pdf_ruta: selectedPdf.ruta,
        factura_id: Number(selectedFacturaId),
        sociedad_id: sociedadId ? Number(sociedadId) : undefined,
        overwrite
      });

      setMessage('PDF asociado correctamente.');
      setCandidates([]);
      setCandidateSearchAttempted(false);
      setSelectedFacturaId('');
      setOverwrite(false);
      await fetchPdfs();
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'No se pudo asociar el PDF pendiente.'));
    } finally {
      setAssigning(false);
    }
  }, [
    api,
    fetchPdfs,
    overwrite,
    selectedCandidate,
    selectedFacturaId,
    selectedPdf,
    sociedadId,
  ]);

  return {
    items,
    summary,
    loading,
    actionError,
    message,
    selectedKey,
    selectedPdf,
    selectPdf,
    candidateQuery,
    setCandidateQuery: (value) => {
      setCandidateQuery(value);
      setCandidateSearchAttempted(false);
      setCandidates([]);
      setSelectedFacturaId('');
      setOverwrite(false);
    },
    candidates,
    candidateSearchAttempted,
    candidatesLoading,
    searchCandidates,
    selectedFacturaId,
    setSelectedFacturaId,
    selectedCandidate,
    overwrite,
    setOverwrite,
    assigning,
    assignSelectedPdf,
    refetch: fetchPdfs,
    setActionError,
    setMessage,
  };
};
