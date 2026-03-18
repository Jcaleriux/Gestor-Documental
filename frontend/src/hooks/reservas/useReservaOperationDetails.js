import { useCallback, useEffect, useState } from 'react';
import {
  extractReservaActionPayload,
  extractReservaDetallePayload,
  reservasApi,
} from '../../services/reservasApi.js';
import { getAuthToken } from '../../utils/auth.js';

const getErrorMessage = (error, fallbackMessage) => (
  error?.response?.data?.error || error?.message || fallbackMessage
);

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
  reader.readAsDataURL(file);
});

export const useReservaOperationDetails = ({
  scopeKey = null,
  dependencies = {},
}) => {
  const {
    api = reservasApi,
    getToken = getAuthToken,
    readFile = readFileAsDataUrl,
  } = dependencies;

  const [openDetailId, setOpenDetailId] = useState(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState(null);
  const [operationDetails, setOperationDetails] = useState({});
  const [selectedDocumentByOperation, setSelectedDocumentByOperation] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const clearFeedback = useCallback(() => {
    setError('');
    setMessage('');
  }, []);

  const resetReplacementState = useCallback(() => {
    clearFeedback();
  }, [clearFeedback]);

  const resetState = useCallback(() => {
    setOpenDetailId(null);
    setDetailsLoadingId(null);
    setOperationDetails({});
    setSelectedDocumentByOperation({});
    clearFeedback();
  }, [clearFeedback]);

  useEffect(() => {
    resetState();
  }, [resetState, scopeKey]);

  const loadOperationDetail = useCallback(async (operationId) => {
    setDetailsLoadingId(operationId);
    try {
      setError('');
      const response = await api.getOperacion(operationId);
      const detail = extractReservaDetallePayload(response);

      setOperationDetails((previous) => ({
        ...previous,
        [operationId]: detail,
      }));

      if (detail.documentos.length > 0) {
        setSelectedDocumentByOperation((previous) => ({
          ...previous,
          [operationId]: previous[operationId] || detail.documentos[0].id,
        }));
      }

      return detail;
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'No se pudo cargar el detalle de la reserva.'));
      throw requestError;
    } finally {
      setDetailsLoadingId(null);
    }
  }, [api]);

  const toggleOperationDetail = useCallback(async (operationId) => {
    if (openDetailId === operationId) {
      setOpenDetailId(null);
      clearFeedback();
      return null;
    }

    setOpenDetailId(operationId);
    clearFeedback();

    try {
      return await loadOperationDetail(operationId);
    } catch (requestError) {
      setOpenDetailId(null);
      throw requestError;
    }
  }, [clearFeedback, loadOperationDetail, openDetailId]);

  const selectDocument = useCallback(({ operationId, documentoId }) => {
    setSelectedDocumentByOperation((previous) => ({
      ...previous,
      [operationId]: documentoId,
    }));
    clearFeedback();
  }, [clearFeedback]);

  const buildPreviewUrl = useCallback(({ operacionId, documentoId }) => (
    api.buildPreviewDocumentoUrl({
      operacionId,
      documentoId,
      token: getToken(),
    })
  ), [api, getToken]);

  const replaceDocument = useCallback(async ({
    operacionId,
    documentoId,
    file,
    motivo = null,
    metadata = null,
  }) => {
    if (!file) {
      const fileRequiredError = new Error('Seleccione un archivo PDF o imagen para reemplazar.');
      setError(fileRequiredError.message);
      throw fileRequiredError;
    }

    try {
      setSaving(true);
      clearFeedback();
      const fileBase64 = await readFile(file);
      const response = await api.replaceDocumento(operacionId, documentoId, {
        filename: file.name,
        file_base64: fileBase64,
        mime_type: file.type || null,
        motivo: motivo || null,
        metadata,
      });
      const payload = extractReservaActionPayload(response, 'No se pudo reemplazar el documento.');
      await loadOperationDetail(operacionId);
      setMessage('Documento reemplazado correctamente. Se registro en historial.');
      return payload;
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'No se pudo reemplazar el documento.'));
      throw requestError;
    } finally {
      setSaving(false);
    }
  }, [api, clearFeedback, loadOperationDetail, readFile]);

  return {
    buildPreviewUrl,
    clearFeedback,
    detailsLoadingId,
    error,
    message,
    openDetailId,
    operationDetails,
    replaceDocument,
    resetReplacementState,
    resetState,
    saving,
    selectDocument,
    selectedDocumentByOperation,
    toggleOperationDetail,
  };
};
