const path = require('path');
const { assertFound, createError } = require('../utils/errors');
const { TRAMITE_ACCIONES, TRAMITE_ESTADOS } = require('../domain/tramitesPago');
const {
  parsePositiveIntOrThrow,
  callOptionalRepoMethod
} = require('./tramitesPagoUseCases.helpers');
const {
  buildDocumentsCatalog,
  decodeCaratulaPdfBase64,
  parseTramiteCaratulaPdf,
  applyManualResolutionToPayload
} = require('./tramitesPagoCaratulasSupport');
const {
  ATTACHMENT_STATUS,
  ORDER_STATUS,
  ORPHAN_STATUS,
  summarizeStoredTramiteCaratulasV2,
  splitBulkCaratulasPdf,
  buildProviderUploadDraft,
  buildProviderDraftFromAssignedOrphan,
  buildOrderRows,
  buildProviderOrderIds,
  compareOrderedIds,
  ensureProviderBelongsToCatalog,
  applyManualResolutionToStoredGroup,
  copyStoredCaratulaFile,
  deleteStoredFiles
} = require('./tramitesPagoCaratulasProviderSupport');

const CARATULAS_EDITABLE_STATE = TRAMITE_ESTADOS.EN_REVISION_TESORERIA_1;

const assertCaratulasEditableState = (tramite) => {
  if (tramite?.estado !== CARATULAS_EDITABLE_STATE) {
    throw createError(409, 'Las caratulas solo se pueden gestionar en revision de tesoreria');
  }
};

const buildVirtualCaratulaRow = ({
  baseRow,
  tramiteId,
  nombreArchivo,
  rutaArchivo,
  parsedPayload,
  usuario,
  procesadoEn
}) => ({
  id: baseRow?.id || 0,
  tramite_id: tramiteId,
  nombre_archivo: nombreArchivo,
  ruta_archivo: rutaArchivo,
  estado: parsedPayload?.summary?.state || baseRow?.estado || 'pendiente',
  fecha_ejecucion: parsedPayload?.execution_date || baseRow?.fecha_ejecucion || null,
  sociedad_nombre_raw: parsedPayload?.society?.raw_name || baseRow?.sociedad_nombre_raw || null,
  sociedad_identificacion_raw: parsedPayload?.society?.raw_identification || baseRow?.sociedad_identificacion_raw || null,
  moneda: parsedPayload?.currency || baseRow?.moneda || null,
  total_paginas: Number(parsedPayload?.total_pages || baseRow?.total_paginas || 0),
  cargado_por: baseRow?.cargado_por || usuario || null,
  procesado_en: procesadoEn || baseRow?.procesado_en || null,
  actualizado_en: procesadoEn || baseRow?.actualizado_en || null,
  parsed_payload: parsedPayload
});

const normalizeProviderFacturaId = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return parsePositiveIntOrThrow(value, 'provider_factura_id');
};

const normalizeProviderKey = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw createError(400, 'provider_key requerido');
  }
  return normalized;
};

const normalizeFacturaIds = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }

  const normalized = values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  return Array.from(new Set(normalized));
};

const loadCaratulasState = async ({ tramitesPagoRepo, tramiteId, client }) => {
  const [documentos, currentCaratula, providerRows, providerOrderRows, orphanRows] = await Promise.all([
    tramitesPagoRepo.listDocumentosByTramite(tramiteId, client),
    tramitesPagoRepo.getTramiteCaratulaByTramiteId(tramiteId, client),
    callOptionalRepoMethod({
      repo: tramitesPagoRepo,
      methodName: 'listTramiteCaratulaProvidersByTramiteId',
      args: [tramiteId, client],
      defaultValue: []
    }),
    callOptionalRepoMethod({
      repo: tramitesPagoRepo,
      methodName: 'listTramiteCaratulaProviderFacturasByTramiteId',
      args: [tramiteId, client],
      defaultValue: []
    }),
    callOptionalRepoMethod({
      repo: tramitesPagoRepo,
      methodName: 'listTramiteCaratulaOrphansByTramiteId',
      args: [tramiteId, client],
      defaultValue: []
    })
  ]);

  return {
    documentos,
    currentCaratula,
    providerRows,
    providerOrderRows,
    orphanRows
  };
};

const buildSummary = ({
  row,
  documents,
  providerRows,
  providerOrderRows,
  orphanRows,
  tramiteEstado
}) => summarizeStoredTramiteCaratulasV2({
  row,
  providerRows,
  providerOrderRows,
  orphanRows,
  documents,
  tramiteEstado
});

const replaceProviderOrders = async ({
  tramitesPagoRepo,
  providerCaratulaId,
  orderRows,
  client
}) => {
  await tramitesPagoRepo.replaceTramiteCaratulaProviderFacturas({
    providerCaratulaId,
    rows: orderRows
  }, client);
};

const upsertProviderRowWithOrders = async ({
  tramitesPagoRepo,
  tramiteId,
  providerRow,
  orderRows,
  client
}) => {
  const storedProviderRow = await tramitesPagoRepo.upsertTramiteCaratulaProvider({
    tramiteId,
    ...providerRow
  }, client);

  await replaceProviderOrders({
    tramitesPagoRepo,
    providerCaratulaId: storedProviderRow.id,
    orderRows,
    client
  });

  return storedProviderRow;
};

const collectRutasToDelete = ({ currentCaratula, providerRows, orphanRows }) => {
  const rutas = [
    currentCaratula?.ruta_archivo || null,
    ...(Array.isArray(providerRows) ? providerRows.map((row) => row.ruta_archivo || null) : []),
    ...(Array.isArray(orphanRows) ? orphanRows.map((row) => row.ruta_archivo || null) : [])
  ];

  return rutas.filter(Boolean);
};

const buildProvidersRelativeDir = ({ sociedadId, tramiteId }) => (
  path.join('documentos', 'tramites', 'caratulas', String(sociedadId), String(tramiteId), 'providers')
);

const validateProviderOrderPayload = ({ providerEntry, facturaIds }) => {
  const expectedIds = providerEntry.documents.map((doc) => Number(doc.factura_id));
  if (expectedIds.length <= 1) {
    return expectedIds;
  }

  if (facturaIds.length !== expectedIds.length) {
    throw createError(400, 'Debe confirmar el orden de todas las facturas del proveedor');
  }

  const expectedSet = new Set(expectedIds);
  if (facturaIds.some((facturaId) => !expectedSet.has(facturaId))) {
    throw createError(400, 'El orden contiene facturas que no pertenecen al proveedor');
  }

  return facturaIds;
};

const providerHasUnresolvedLines = (providerRow) => (
  Array.isArray(providerRow?.group_payload?.lines)
  && providerRow.group_payload.lines.some((line) => line.match_status !== 'matched')
);

const getProviderOrderRowsByProviderId = (providerOrderRows, providerCaratulaId) => (
  (Array.isArray(providerOrderRows) ? providerOrderRows : [])
    .filter((row) => Number(row.provider_caratula_id) === Number(providerCaratulaId))
    .sort((left, right) => Number(left.sort_index) - Number(right.sort_index))
);

const createTramitesPagoCaratulasUseCases = ({ tramitesPagoRepo, runInTransaction, baseDir }) => {
  if (!tramitesPagoRepo) {
    throw new Error('tramitesPagoRepo requerido');
  }
  if (!runInTransaction) {
    throw new Error('runInTransaction requerido');
  }
  if (!baseDir) {
    throw new Error('baseDir requerido');
  }

  const uploadCaratulas = async ({ id, filename, file_base64, usuario }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const normalizedFilename = String(filename || '').trim();
    if (!normalizedFilename) {
      throw createError(400, 'filename requerido');
    }

    const pdfBuffer = decodeCaratulaPdfBase64(file_base64);
    const parsedPayload = await parseTramiteCaratulaPdf({ pdfBuffer });
    let newSavedPaths = [];
    let previousRutas = [];

    try {
      const result = await runInTransaction(async (client) => {
        const tramite = await tramitesPagoRepo.getTramiteByIdForUpdate(tramiteId, client);
        assertFound(tramite, 'Tramite no encontrado');
        assertCaratulasEditableState(tramite);

        const sociedad = await tramitesPagoRepo.getSociedadById(tramite.sociedad_id, client);
        assertFound(sociedad, 'Sociedad no encontrada');

        const {
          documentos,
          currentCaratula,
          providerRows: currentProviderRows,
          orphanRows: currentOrphanRows
        } = await loadCaratulasState({
          tramitesPagoRepo,
          tramiteId,
          client
        });

        previousRutas = collectRutasToDelete({
          currentCaratula,
          providerRows: currentProviderRows,
          orphanRows: currentOrphanRows
        });

        const splitResult = await splitBulkCaratulasPdf({
          parsedPayload,
          documents: documentos,
          society: sociedad,
          pdfBuffer,
          baseDir,
          sociedadId: tramite.sociedad_id,
          tramiteId,
          sourceFilename: normalizedFilename
        });
        newSavedPaths = splitResult.savedPaths;

        const procesadoEn = new Date().toISOString();
        const storedRow = await tramitesPagoRepo.upsertTramiteCaratula({
          tramiteId,
          nombreArchivo: normalizedFilename,
          rutaArchivo: '',
          estado: 'pendiente',
          fechaEjecucion: splitResult.manifestPayload.execution_date || null,
          sociedadNombreRaw: splitResult.manifestPayload.society?.raw_name || null,
          sociedadIdentificacionRaw: splitResult.manifestPayload.society?.raw_identification || null,
          moneda: splitResult.manifestPayload.currency || null,
          totalPaginas: splitResult.manifestPayload.total_pages || 0,
          warnings: splitResult.manifestPayload.warnings || [],
          parsedPayload: splitResult.manifestPayload,
          cargadoPor: usuario || null,
          procesadoEn
        }, client);

        await tramitesPagoRepo.deleteTramiteCaratulaOrphansByTramiteId(tramiteId, client);
        await tramitesPagoRepo.deleteTramiteCaratulaProvidersByTramiteId(tramiteId, client);

        const storedProviderRows = [];
        for (const providerRow of splitResult.providerRows) {
          const orderRows = splitResult.providerOrderRows.find((item) => item.provider_key === providerRow.provider_key)?.rows || [];
          const storedProviderRow = await upsertProviderRowWithOrders({
            tramitesPagoRepo,
            tramiteId,
            providerRow,
            orderRows,
            client
          });
          storedProviderRows.push(storedProviderRow);
        }

        for (const orphanRow of splitResult.orphanRows) {
          await tramitesPagoRepo.insertTramiteCaratulaOrphan({
            tramiteId,
            ...orphanRow
          }, client);
        }

        await tramitesPagoRepo.insertHistorialTramite({
          tramiteId,
          accion: TRAMITE_ACCIONES.CARGAR_CARATULAS,
          estadoNuevo: tramite.estado,
          usuario,
          motivo: normalizedFilename
        }, client);
        await tramitesPagoRepo.touchTramite(tramiteId, client);

        const reloadedOrders = await tramitesPagoRepo.listTramiteCaratulaProviderFacturasByTramiteId(tramiteId, client);
        const reloadedOrphans = await tramitesPagoRepo.listTramiteCaratulaOrphansByTramiteId(tramiteId, client);

        return buildSummary({
          row: storedRow,
          documents: documentos,
          providerRows: storedProviderRows,
          providerOrderRows: reloadedOrders,
          orphanRows: reloadedOrphans,
          tramiteEstado: tramite.estado
        });
      });

      deleteStoredFiles({
        baseDir,
        rutas: previousRutas.filter((ruta) => !newSavedPaths.includes(ruta))
      });

      return result;
    } catch (error) {
      deleteStoredFiles({
        baseDir,
        rutas: newSavedPaths
      });
      throw error;
    }
  };

  const resolveCaratulas = async ({
    id,
    group_key,
    provider_factura_id,
    line_matches,
    usuario
  }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const groupKey = String(group_key || '').trim();
    if (!groupKey) {
      throw createError(400, 'group_key requerido');
    }

    const providerFacturaId = normalizeProviderFacturaId(provider_factura_id);

    return runInTransaction(async (client) => {
      const tramite = await tramitesPagoRepo.getTramiteByIdForUpdate(tramiteId, client);
      assertFound(tramite, 'Tramite no encontrado');
      assertCaratulasEditableState(tramite);

      const state = await loadCaratulasState({ tramitesPagoRepo, tramiteId, client });
      const { documentos, currentCaratula, providerRows, providerOrderRows, orphanRows } = state;

      if (providerRows.length === 0 && currentCaratula && Number(currentCaratula?.parsed_payload?.version || 0) !== 2) {
        const nextPayload = applyManualResolutionToPayload({
          payload: currentCaratula.parsed_payload || {},
          documents: documentos,
          groupKey,
          providerFacturaId,
          lineMatches: Array.isArray(line_matches) ? line_matches : []
        });

        const procesadoEn = new Date().toISOString();
        const storedRow = await tramitesPagoRepo.upsertTramiteCaratula({
          tramiteId,
          nombreArchivo: currentCaratula.nombre_archivo,
          rutaArchivo: currentCaratula.ruta_archivo,
          estado: currentCaratula.estado,
          fechaEjecucion: nextPayload?.execution_date || currentCaratula.fecha_ejecucion || null,
          sociedadNombreRaw: nextPayload?.society?.raw_name || currentCaratula.sociedad_nombre_raw || null,
          sociedadIdentificacionRaw: nextPayload?.society?.raw_identification || currentCaratula.sociedad_identificacion_raw || null,
          moneda: nextPayload?.currency || currentCaratula.moneda || null,
          totalPaginas: nextPayload?.total_pages || currentCaratula.total_paginas || 0,
          warnings: [],
          parsedPayload: nextPayload,
          cargadoPor: currentCaratula.cargado_por || usuario || null,
          procesadoEn
        }, client);

        await tramitesPagoRepo.insertHistorialTramite({
          tramiteId,
          accion: TRAMITE_ACCIONES.RESOLVER_CARATULAS,
          estadoNuevo: tramite.estado,
          usuario,
          motivo: groupKey
        }, client);
        await tramitesPagoRepo.touchTramite(tramiteId, client);

        const legacySummary = buildSummary({
          row: buildVirtualCaratulaRow({
            baseRow: storedRow,
            tramiteId,
            nombreArchivo: storedRow.nombre_archivo,
            rutaArchivo: storedRow.ruta_archivo,
            parsedPayload: nextPayload,
            usuario,
            procesadoEn
          }),
          documents: documentos,
          providerRows: [],
          providerOrderRows: [],
          orphanRows: [],
          tramiteEstado: tramite.estado
        });

        return legacySummary;
      }

      const catalog = buildDocumentsCatalog(documentos);
      const providerEntry = ensureProviderBelongsToCatalog({
        catalog,
        providerKey: groupKey
      });
      const currentProviderRow = await tramitesPagoRepo.getTramiteCaratulaProviderByKeyForUpdate({
        tramiteId,
        providerKey: groupKey
      }, client);
      assertFound(currentProviderRow, 'Caratula del proveedor no encontrada');

      const updatedGroupPayload = applyManualResolutionToStoredGroup({
        providerRow: currentProviderRow,
        providerEntry,
        lineMatches: Array.isArray(line_matches) ? line_matches : []
      });
      const currentOrderRows = getProviderOrderRowsByProviderId(providerOrderRows, currentProviderRow.id);
      const nextOrderIds = buildProviderOrderIds({
        providerEntry,
        groupPayload: updatedGroupPayload,
        storedOrderRows: currentOrderRows
      });
      const nextOrderSource = (updatedGroupPayload.lines || []).some((line) => Number(line.matched_factura_id) > 0)
        ? 'auto'
        : (currentOrderRows[0]?.order_source || 'manual');

      const storedProviderRow = await upsertProviderRowWithOrders({
        tramitesPagoRepo,
        tramiteId,
        providerRow: {
          ...currentProviderRow,
          warnings: [
            ...(updatedGroupPayload.warnings || []),
            ...((updatedGroupPayload.lines || []).map((line) => line.warning).filter(Boolean))
          ],
          group_payload: updatedGroupPayload,
          attachment_status: currentProviderRow.ruta_archivo
            ? ATTACHMENT_STATUS.PENDIENTE_CONFIRMACION
            : ATTACHMENT_STATUS.SIN_CARATULA,
          order_status: providerEntry.documents.length > 1
            ? ORDER_STATUS.PENDIENTE_CONFIRMACION
            : ORDER_STATUS.NO_REQUERIDO,
          order_confirmed_by: null,
          order_confirmed_at: null,
          attachment_confirmed_by: null,
          attachment_confirmed_at: null
        },
        orderRows: buildOrderRows({
          facturaIds: nextOrderIds,
          orderSource: nextOrderSource
        }),
        client
      });

      await tramitesPagoRepo.insertHistorialTramite({
        tramiteId,
        accion: TRAMITE_ACCIONES.RESOLVER_CARATULAS,
        estadoNuevo: tramite.estado,
        usuario,
        motivo: groupKey
      }, client);
      await tramitesPagoRepo.touchTramite(tramiteId, client);

      const reloadedProviders = await tramitesPagoRepo.listTramiteCaratulaProvidersByTramiteId(tramiteId, client);
      const reloadedOrders = await tramitesPagoRepo.listTramiteCaratulaProviderFacturasByTramiteId(tramiteId, client);

      return buildSummary({
        row: currentCaratula,
        documents: documentos,
        providerRows: reloadedProviders.map((row) => (Number(row.id) === Number(storedProviderRow.id) ? storedProviderRow : row)),
        providerOrderRows: reloadedOrders,
        orphanRows,
        tramiteEstado: tramite.estado
      });
    });
  };

  const confirmProviderOrder = async ({
    id,
    provider_key,
    factura_ids,
    order_source,
    usuario
  }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const providerKey = normalizeProviderKey(provider_key);
    const facturaIds = normalizeFacturaIds(factura_ids);

    return runInTransaction(async (client) => {
      const tramite = await tramitesPagoRepo.getTramiteByIdForUpdate(tramiteId, client);
      assertFound(tramite, 'Tramite no encontrado');
      assertCaratulasEditableState(tramite);

      const state = await loadCaratulasState({ tramitesPagoRepo, tramiteId, client });
      const { documentos, currentCaratula, providerRows, providerOrderRows, orphanRows } = state;
      const catalog = buildDocumentsCatalog(documentos);
      const providerEntry = ensureProviderBelongsToCatalog({ catalog, providerKey });
      const confirmedOrderIds = validateProviderOrderPayload({ providerEntry, facturaIds });
      const currentProviderRow = await tramitesPagoRepo.getTramiteCaratulaProviderByKeyForUpdate({
        tramiteId,
        providerKey
      }, client);

      const storedProviderRow = await upsertProviderRowWithOrders({
        tramitesPagoRepo,
        tramiteId,
        providerRow: {
          ...(currentProviderRow || {}),
          provider_key: providerEntry.provider_key,
          proveedor_id: providerEntry.provider_id,
          proveedor_nombre: providerEntry.provider_name,
          proveedor_identificacion: providerEntry.provider_identification,
          provider_raw_name: currentProviderRow?.provider_raw_name || providerEntry.provider_name,
          provider_raw_identification: currentProviderRow?.provider_raw_identification || providerEntry.provider_identification,
          provider_code: currentProviderRow?.provider_code || null,
          nombre_archivo: currentProviderRow?.nombre_archivo || null,
          ruta_archivo: currentProviderRow?.ruta_archivo || null,
          attachment_status: currentProviderRow?.ruta_archivo
            ? (currentProviderRow.attachment_status || ATTACHMENT_STATUS.PENDIENTE_CONFIRMACION)
            : ATTACHMENT_STATUS.SIN_CARATULA,
          attachment_origin: currentProviderRow?.attachment_origin || null,
          order_status: providerEntry.documents.length > 1 ? ORDER_STATUS.CONFIRMADO : ORDER_STATUS.NO_REQUERIDO,
          execution_date: currentProviderRow?.execution_date || null,
          currency: currentProviderRow?.currency || null,
          page_start: currentProviderRow?.page_start || null,
          page_end: currentProviderRow?.page_end || null,
          page_numbers: currentProviderRow?.page_numbers || [],
          warnings: currentProviderRow?.warnings || [],
          group_payload: currentProviderRow?.group_payload || {
            version: 2,
            matched_provider: {
              provider_key: providerEntry.provider_key,
              provider_id: providerEntry.provider_id,
              provider_name: providerEntry.provider_name,
              provider_identification: providerEntry.provider_identification,
              strategy: 'provider_key'
            },
            lines: []
          },
          order_confirmed_by: usuario || null,
          order_confirmed_at: new Date().toISOString(),
          attachment_confirmed_by: currentProviderRow?.attachment_confirmed_by || null,
          attachment_confirmed_at: currentProviderRow?.attachment_confirmed_at || null
        },
        orderRows: buildOrderRows({
          facturaIds: confirmedOrderIds,
          orderSource: order_source === 'auto' ? 'auto' : 'manual'
        }),
        client
      });

      await tramitesPagoRepo.insertHistorialTramite({
        tramiteId,
        accion: TRAMITE_ACCIONES.CONFIRMAR_ORDEN_CARATULA,
        estadoNuevo: tramite.estado,
        usuario,
        motivo: providerKey
      }, client);
      await tramitesPagoRepo.touchTramite(tramiteId, client);

      const reloadedProviders = await tramitesPagoRepo.listTramiteCaratulaProvidersByTramiteId(tramiteId, client);
      const reloadedOrders = await tramitesPagoRepo.listTramiteCaratulaProviderFacturasByTramiteId(tramiteId, client);

      return buildSummary({
        row: currentCaratula,
        documents: documentos,
        providerRows: reloadedProviders.map((row) => (Number(row.id) === Number(storedProviderRow.id) ? storedProviderRow : row)),
        providerOrderRows: reloadedOrders,
        orphanRows,
        tramiteEstado: tramite.estado
      });
    });
  };

  const uploadProviderCaratula = async ({
    id,
    provider_key,
    filename,
    file_base64,
    usuario
  }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const providerKey = normalizeProviderKey(provider_key);
    const normalizedFilename = String(filename || '').trim();
    if (!normalizedFilename) {
      throw createError(400, 'filename requerido');
    }

    const pdfBuffer = decodeCaratulaPdfBase64(file_base64);
    const parsedPayload = await parseTramiteCaratulaPdf({ pdfBuffer });
    let newRutaArchivo = null;
    let previousRutaArchivo = null;

    try {
      const result = await runInTransaction(async (client) => {
        const tramite = await tramitesPagoRepo.getTramiteByIdForUpdate(tramiteId, client);
        assertFound(tramite, 'Tramite no encontrado');
        assertCaratulasEditableState(tramite);

        const state = await loadCaratulasState({ tramitesPagoRepo, tramiteId, client });
        const { documentos, currentCaratula, providerRows, providerOrderRows, orphanRows } = state;
        const catalog = buildDocumentsCatalog(documentos);
        const providerEntry = ensureProviderBelongsToCatalog({ catalog, providerKey });
        const currentProviderRow = await tramitesPagoRepo.getTramiteCaratulaProviderByKeyForUpdate({
          tramiteId,
          providerKey
        }, client);
        const currentOrderRows = currentProviderRow
          ? getProviderOrderRowsByProviderId(providerOrderRows, currentProviderRow.id)
          : [];

        const draft = await buildProviderUploadDraft({
          providerEntry,
          parsedPayload,
          pdfBuffer,
          baseDir,
          sociedadId: tramite.sociedad_id,
          tramiteId,
          filename: normalizedFilename,
          existingOrderRows: currentOrderRows
        });

        newRutaArchivo = draft.rutaArchivo;
        previousRutaArchivo = currentProviderRow?.ruta_archivo || null;

        const storedProviderRow = await upsertProviderRowWithOrders({
          tramitesPagoRepo,
          tramiteId,
          providerRow: {
            ...(currentProviderRow || {}),
            ...draft.providerRow
          },
          orderRows: draft.orderRows,
          client
        });

        await tramitesPagoRepo.insertHistorialTramite({
          tramiteId,
          accion: TRAMITE_ACCIONES.SUSTITUIR_CARATULA_PROVEEDOR,
          estadoNuevo: tramite.estado,
          usuario,
          motivo: providerKey
        }, client);
        await tramitesPagoRepo.touchTramite(tramiteId, client);

        const reloadedProviders = await tramitesPagoRepo.listTramiteCaratulaProvidersByTramiteId(tramiteId, client);
        const reloadedOrders = await tramitesPagoRepo.listTramiteCaratulaProviderFacturasByTramiteId(tramiteId, client);

        return buildSummary({
          row: currentCaratula,
          documents: documentos,
          providerRows: reloadedProviders.map((row) => (Number(row.id) === Number(storedProviderRow.id) ? storedProviderRow : row)),
          providerOrderRows: reloadedOrders,
          orphanRows,
          tramiteEstado: tramite.estado
        });
      });

      if (previousRutaArchivo && previousRutaArchivo !== newRutaArchivo) {
        deleteStoredFiles({
          baseDir,
          rutas: [previousRutaArchivo]
        });
      }

      return result;
    } catch (error) {
      if (newRutaArchivo) {
        deleteStoredFiles({
          baseDir,
          rutas: [newRutaArchivo]
        });
      }
      throw error;
    }
  };

  const confirmProviderCaratula = async ({
    id,
    provider_key,
    usuario
  }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const providerKey = normalizeProviderKey(provider_key);

    return runInTransaction(async (client) => {
      const tramite = await tramitesPagoRepo.getTramiteByIdForUpdate(tramiteId, client);
      assertFound(tramite, 'Tramite no encontrado');
      assertCaratulasEditableState(tramite);

      const state = await loadCaratulasState({ tramitesPagoRepo, tramiteId, client });
      const { documentos, currentCaratula, providerRows, providerOrderRows, orphanRows } = state;
      const catalog = buildDocumentsCatalog(documentos);
      const providerEntry = ensureProviderBelongsToCatalog({ catalog, providerKey });
      const currentProviderRow = await tramitesPagoRepo.getTramiteCaratulaProviderByKeyForUpdate({
        tramiteId,
        providerKey
      }, client);
      assertFound(currentProviderRow, 'Caratula del proveedor no encontrada');

      if (!currentProviderRow.ruta_archivo) {
        throw createError(400, 'Debe adjuntar la caratula del proveedor antes de confirmarla');
      }
      if (providerHasUnresolvedLines(currentProviderRow)) {
        throw createError(400, 'Debe resolver todas las lineas de la caratula antes de confirmarla');
      }
      if (providerEntry.documents.length > 1 && currentProviderRow.order_status !== ORDER_STATUS.CONFIRMADO) {
        throw createError(400, 'Debe confirmar el orden de las facturas antes de confirmar la caratula');
      }

      const storedProviderRow = await upsertProviderRowWithOrders({
        tramitesPagoRepo,
        tramiteId,
        providerRow: {
          ...currentProviderRow,
          attachment_status: ATTACHMENT_STATUS.CONFIRMADA,
          attachment_confirmed_by: usuario || null,
          attachment_confirmed_at: new Date().toISOString()
        },
        orderRows: getProviderOrderRowsByProviderId(providerOrderRows, currentProviderRow.id),
        client
      });

      await tramitesPagoRepo.insertHistorialTramite({
        tramiteId,
        accion: TRAMITE_ACCIONES.CONFIRMAR_CARATULA_PROVEEDOR,
        estadoNuevo: tramite.estado,
        usuario,
        motivo: providerKey
      }, client);
      await tramitesPagoRepo.touchTramite(tramiteId, client);

      const reloadedProviders = await tramitesPagoRepo.listTramiteCaratulaProvidersByTramiteId(tramiteId, client);

      return buildSummary({
        row: currentCaratula,
        documents: documentos,
        providerRows: reloadedProviders.map((row) => (Number(row.id) === Number(storedProviderRow.id) ? storedProviderRow : row)),
        providerOrderRows,
        orphanRows,
        tramiteEstado: tramite.estado
      });
    });
  };

  const assignOrphanCaratula = async ({
    id,
    orphan_id,
    provider_key,
    usuario
  }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const orphanId = parsePositiveIntOrThrow(orphan_id, 'orphan_id');
    const providerKey = normalizeProviderKey(provider_key);
    let copiedRutaArchivo = null;

    try {
      const result = await runInTransaction(async (client) => {
        const tramite = await tramitesPagoRepo.getTramiteByIdForUpdate(tramiteId, client);
        assertFound(tramite, 'Tramite no encontrado');
        assertCaratulasEditableState(tramite);

        const state = await loadCaratulasState({ tramitesPagoRepo, tramiteId, client });
        const { documentos, currentCaratula, providerRows, providerOrderRows, orphanRows } = state;
        const catalog = buildDocumentsCatalog(documentos);
        const providerEntry = ensureProviderBelongsToCatalog({ catalog, providerKey });
        const currentProviderRow = await tramitesPagoRepo.getTramiteCaratulaProviderByKeyForUpdate({
          tramiteId,
          providerKey
        }, client);
        if (currentProviderRow?.ruta_archivo) {
          throw createError(400, 'Solo se pueden asignar caratulas huerfanas a proveedores sin caratula');
        }

        const orphan = await tramitesPagoRepo.getTramiteCaratulaOrphanByIdForUpdate({
          tramiteId,
          orphanId
        }, client);
        assertFound(orphan, 'Caratula huerfana no encontrada');
        if (orphan.status !== ORPHAN_STATUS.PENDIENTE) {
          throw createError(409, 'La caratula huerfana ya fue gestionada');
        }

        const currentOrderRows = currentProviderRow
          ? getProviderOrderRowsByProviderId(providerOrderRows, currentProviderRow.id)
          : [];
        const draft = buildProviderDraftFromAssignedOrphan({
          providerEntry,
          orphan,
          existingOrderRows: currentOrderRows
        });
        copiedRutaArchivo = copyStoredCaratulaFile({
          baseDir,
          sourceRutaArchivo: orphan.ruta_archivo,
          targetRelativeDir: buildProvidersRelativeDir({
            sociedadId: tramite.sociedad_id,
            tramiteId
          }),
          filenameBase: draft.providerRow.nombre_archivo || `caratula_${providerKey}.pdf`
        });

        const storedProviderRow = await upsertProviderRowWithOrders({
          tramitesPagoRepo,
          tramiteId,
          providerRow: {
            ...(currentProviderRow || {}),
            ...draft.providerRow,
            ruta_archivo: copiedRutaArchivo
          },
          orderRows: draft.orderRows,
          client
        });

        await tramitesPagoRepo.updateTramiteCaratulaOrphanStatus({
          orphanId,
          status: ORPHAN_STATUS.ASIGNADA,
          assignedProviderCaratulaId: storedProviderRow.id,
          assignedBy: usuario || null,
          assignedAt: new Date().toISOString(),
          discardedBy: null,
          discardedAt: null
        }, client);

        await tramitesPagoRepo.insertHistorialTramite({
          tramiteId,
          accion: TRAMITE_ACCIONES.ASIGNAR_CARATULA_HUERFANA,
          estadoNuevo: tramite.estado,
          usuario,
          motivo: `${orphanId}:${providerKey}`
        }, client);
        await tramitesPagoRepo.touchTramite(tramiteId, client);

        const reloadedProviders = await tramitesPagoRepo.listTramiteCaratulaProvidersByTramiteId(tramiteId, client);
        const reloadedOrders = await tramitesPagoRepo.listTramiteCaratulaProviderFacturasByTramiteId(tramiteId, client);
        const reloadedOrphans = await tramitesPagoRepo.listTramiteCaratulaOrphansByTramiteId(tramiteId, client);

        return buildSummary({
          row: currentCaratula,
          documents: documentos,
          providerRows: reloadedProviders.map((row) => (Number(row.id) === Number(storedProviderRow.id) ? storedProviderRow : row)),
          providerOrderRows: reloadedOrders,
          orphanRows: reloadedOrphans,
          tramiteEstado: tramite.estado
        });
      });

      return result;
    } catch (error) {
      if (copiedRutaArchivo) {
        deleteStoredFiles({
          baseDir,
          rutas: [copiedRutaArchivo]
        });
      }
      throw error;
    }
  };

  const discardOrphanCaratula = async ({
    id,
    orphan_id,
    usuario
  }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const orphanId = parsePositiveIntOrThrow(orphan_id, 'orphan_id');

    return runInTransaction(async (client) => {
      const tramite = await tramitesPagoRepo.getTramiteByIdForUpdate(tramiteId, client);
      assertFound(tramite, 'Tramite no encontrado');
      assertCaratulasEditableState(tramite);

      const state = await loadCaratulasState({ tramitesPagoRepo, tramiteId, client });
      const { documentos, currentCaratula, providerRows, providerOrderRows, orphanRows } = state;
      const orphan = await tramitesPagoRepo.getTramiteCaratulaOrphanByIdForUpdate({
        tramiteId,
        orphanId
      }, client);
      assertFound(orphan, 'Caratula huerfana no encontrada');
      if (orphan.status !== ORPHAN_STATUS.PENDIENTE) {
        throw createError(409, 'La caratula huerfana ya fue gestionada');
      }

      await tramitesPagoRepo.updateTramiteCaratulaOrphanStatus({
        orphanId,
        status: ORPHAN_STATUS.DESCARTADA,
        assignedProviderCaratulaId: null,
        assignedBy: null,
        assignedAt: null,
        discardedBy: usuario || null,
        discardedAt: new Date().toISOString()
      }, client);

      await tramitesPagoRepo.insertHistorialTramite({
        tramiteId,
        accion: TRAMITE_ACCIONES.DESCARTAR_CARATULA_HUERFANA,
        estadoNuevo: tramite.estado,
        usuario,
        motivo: String(orphanId)
      }, client);
      await tramitesPagoRepo.touchTramite(tramiteId, client);

      const reloadedOrphans = await tramitesPagoRepo.listTramiteCaratulaOrphansByTramiteId(tramiteId, client);

      return buildSummary({
        row: currentCaratula,
        documents: documentos,
        providerRows,
        providerOrderRows,
        orphanRows: reloadedOrphans,
        tramiteEstado: tramite.estado
      });
    });
  };

  return {
    uploadCaratulas,
    resolveCaratulas,
    confirmProviderOrder,
    uploadProviderCaratula,
    confirmProviderCaratula,
    assignOrphanCaratula,
    discardOrphanCaratula
  };
};

module.exports = { createTramitesPagoCaratulasUseCases };
