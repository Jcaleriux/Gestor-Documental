import { useCallback, useState } from 'react';
import {
  extractReservaActionPayload,
  extractReservaDetallePayload,
  reservasApi,
} from '../../services/reservasApi.js';

const getErrorMessage = (error, fallbackMessage) => (
  error?.response?.data?.error || error?.message || fallbackMessage
);

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
  reader.readAsDataURL(file);
});

const normalizeScopeKey = (scopeKey) => String(scopeKey || '');

const createEmptyDetailState = (scopeKey) => ({
  scopeKey,
  openDetailId: null,
  detailsLoadingId: null,
  operationDetails: {},
  selectedDocumentByOperation: {},
});

const createEmptyFeedbackState = (scopeKey) => ({
  scopeKey,
  saving: false,
  error: '',
  message: '',
});

const resolveScopedState = (state, scopeKey, createDefaultState) => (
  state?.scopeKey === scopeKey ? state : createDefaultState(scopeKey)
);

export const useReservaOperationDetails = ({
  scopeKey = null,
  dependencies = {},
}) => {
  const {
    api = reservasApi,
    readFile = readFileAsDataUrl,
  } = dependencies;

  const currentScopeKey = normalizeScopeKey(scopeKey);
  const [detailState, setDetailState] = useState(() => createEmptyDetailState(currentScopeKey));
  const [feedbackState, setFeedbackState] = useState(() => createEmptyFeedbackState(currentScopeKey));

  const clearFeedback = useCallback(() => {
    setFeedbackState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, createEmptyFeedbackState);
      return {
        ...current,
        scopeKey: currentScopeKey,
        error: '',
        message: '',
      };
    });
  }, [currentScopeKey]);

  const resetReplacementState = useCallback(() => {
    clearFeedback();
  }, [clearFeedback]);

  const resetState = useCallback(() => {
    setDetailState(createEmptyDetailState(currentScopeKey));
    setFeedbackState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, createEmptyFeedbackState);
      return {
        ...current,
        scopeKey: currentScopeKey,
        error: '',
        message: '',
      };
    });
  }, [currentScopeKey]);

  const loadOperationDetail = useCallback(async (operationId) => {
    const targetScopeKey = currentScopeKey;

    setDetailState((previous) => {
      const current = resolveScopedState(previous, targetScopeKey, createEmptyDetailState);
      return {
        ...current,
        scopeKey: targetScopeKey,
        detailsLoadingId: operationId,
      };
    });

    setFeedbackState((previous) => {
      const current = resolveScopedState(previous, targetScopeKey, createEmptyFeedbackState);
      return {
        ...current,
        scopeKey: targetScopeKey,
        error: '',
        message: '',
      };
    });

    try {
      const response = await api.getOperacion(operationId);
      const detail = extractReservaDetallePayload(response);

      setDetailState((previous) => {
        const current = resolveScopedState(previous, targetScopeKey, createEmptyDetailState);
        const selectedDocumentId = current.selectedDocumentByOperation[operationId]
          || detail.documentos[0]?.id
          || null;

        return {
          ...current,
          scopeKey: targetScopeKey,
          operationDetails: {
            ...current.operationDetails,
            [operationId]: detail,
          },
          selectedDocumentByOperation: selectedDocumentId
            ? {
              ...current.selectedDocumentByOperation,
              [operationId]: selectedDocumentId,
            }
            : current.selectedDocumentByOperation,
          detailsLoadingId: null,
        };
      });

      return detail;
    } catch (requestError) {
      setFeedbackState((previous) => {
        const current = resolveScopedState(previous, targetScopeKey, createEmptyFeedbackState);
        return {
          ...current,
          scopeKey: targetScopeKey,
          error: getErrorMessage(requestError, 'No se pudo cargar el detalle de la reserva.'),
        };
      });
      setDetailState((previous) => {
        const current = resolveScopedState(previous, targetScopeKey, createEmptyDetailState);
        return {
          ...current,
          scopeKey: targetScopeKey,
          detailsLoadingId: null,
        };
      });
      throw requestError;
    }
  }, [api, currentScopeKey]);

  const openDetailId = resolveScopedState(
    detailState,
    currentScopeKey,
    createEmptyDetailState,
  ).openDetailId;

  const toggleOperationDetail = useCallback(async (operationId) => {
    const targetScopeKey = currentScopeKey;

    if (openDetailId === operationId) {
      setDetailState((previous) => {
        const current = resolveScopedState(previous, targetScopeKey, createEmptyDetailState);
        return {
          ...current,
          scopeKey: targetScopeKey,
          openDetailId: null,
        };
      });
      clearFeedback();
      return null;
    }

    setDetailState((previous) => {
      const current = resolveScopedState(previous, targetScopeKey, createEmptyDetailState);
      return {
        ...current,
        scopeKey: targetScopeKey,
        openDetailId: operationId,
      };
    });
    clearFeedback();

    try {
      return await loadOperationDetail(operationId);
    } catch (requestError) {
      setDetailState((previous) => {
        const current = resolveScopedState(previous, targetScopeKey, createEmptyDetailState);
        return {
          ...current,
          scopeKey: targetScopeKey,
          openDetailId: null,
        };
      });
      throw requestError;
    }
  }, [clearFeedback, currentScopeKey, loadOperationDetail, openDetailId]);

  const selectDocument = useCallback(({ operationId, documentoId }) => {
    const targetScopeKey = currentScopeKey;

    setDetailState((previous) => {
      const current = resolveScopedState(previous, targetScopeKey, createEmptyDetailState);
      return {
        ...current,
        scopeKey: targetScopeKey,
        selectedDocumentByOperation: {
          ...current.selectedDocumentByOperation,
          [operationId]: documentoId,
        },
      };
    });
    clearFeedback();
  }, [clearFeedback, currentScopeKey]);

  const buildPreviewUrl = useCallback(({ operacionId, documentoId }) => (
    api.buildPreviewDocumentoUrl({
      operacionId,
      documentoId,
    })
  ), [api]);

  const replaceDocument = useCallback(async ({
    operacionId,
    documentoId,
    file,
    motivo = null,
    metadata = null,
  }) => {
    const targetScopeKey = currentScopeKey;

    if (!file) {
      const fileRequiredError = new Error('Seleccione un archivo PDF o imagen para reemplazar.');
      setFeedbackState((previous) => {
        const current = resolveScopedState(previous, targetScopeKey, createEmptyFeedbackState);
        return {
          ...current,
          scopeKey: targetScopeKey,
          error: fileRequiredError.message,
        };
      });
      throw fileRequiredError;
    }

    try {
      setFeedbackState((previous) => {
        const current = resolveScopedState(previous, targetScopeKey, createEmptyFeedbackState);
        return {
          ...current,
          scopeKey: targetScopeKey,
          saving: true,
          error: '',
          message: '',
        };
      });

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
      setFeedbackState((previous) => {
        const current = resolveScopedState(previous, targetScopeKey, createEmptyFeedbackState);
        return {
          ...current,
          scopeKey: targetScopeKey,
          saving: false,
          message: 'Documento reemplazado correctamente. Se registro en historial.',
        };
      });
      return payload;
    } catch (requestError) {
      setFeedbackState((previous) => {
        const current = resolveScopedState(previous, targetScopeKey, createEmptyFeedbackState);
        return {
          ...current,
          scopeKey: targetScopeKey,
          saving: false,
          error: getErrorMessage(requestError, 'No se pudo reemplazar el documento.'),
        };
      });
      throw requestError;
    }
  }, [api, currentScopeKey, loadOperationDetail, readFile]);

  const currentDetailState = resolveScopedState(detailState, currentScopeKey, createEmptyDetailState);
  const currentFeedbackState = resolveScopedState(feedbackState, currentScopeKey, createEmptyFeedbackState);

  return {
    buildPreviewUrl,
    clearFeedback,
    detailsLoadingId: currentDetailState.detailsLoadingId,
    error: currentFeedbackState.error,
    message: currentFeedbackState.message,
    openDetailId: currentDetailState.openDetailId,
    operationDetails: currentDetailState.operationDetails,
    replaceDocument,
    resetReplacementState,
    resetState,
    saving: currentFeedbackState.saving,
    selectDocument,
    selectedDocumentByOperation: currentDetailState.selectedDocumentByOperation,
    toggleOperationDetail,
  };
};
