const fs = require('fs');
const { assertFound, createError } = require('../utils/errors');
const { createFilesUseCases } = require('./filesUseCases');
const {
  parsePositiveIntOrThrow,
  parseOptionalPositiveIntOrThrow,
  toNormalizedLowerString,
  callOptionalRepoMethod
} = require('./tramitesPagoUseCases.helpers');
const {
  mapTramiteRow,
  mapDocumentoRow,
  mapRetencionRow,
  mapHistorialRow
} = require('../mappers/tramitesPagoMapper');
const { summarizeStoredTramiteCaratulasV2 } = require('./tramitesPagoCaratulasProviderSupport');
const {
  normalizeSortDirection,
  buildUnifiedPdfResourcePlan,
  mergeUnifiedPdfResources,
  buildOmittedItemsHeader,
  buildUnifiedPdfDownloadFilename,
} = require('./tramitesPagoUnifiedPdfSupport');

const loadTramiteReadModel = async ({
  tramitesPagoRepo,
  tramiteId,
  actorUserId,
}) => {
  const tramite = await tramitesPagoRepo.getTramiteById(tramiteId);
  assertFound(tramite, 'Tramite no encontrado');

  const [documentos, retenciones, caratulaRow, providerRows, providerOrderRows, orphanRows, sociedad] = await Promise.all([
    tramitesPagoRepo.listDocumentosByTramite(tramiteId, null, { currentUserId: actorUserId }),
    tramitesPagoRepo.listRetencionesByTramite(tramiteId),
    tramitesPagoRepo.getTramiteCaratulaByTramiteId(tramiteId),
    callOptionalRepoMethod({
      repo: tramitesPagoRepo,
      methodName: 'listTramiteCaratulaProvidersByTramiteId',
      args: [tramiteId],
      defaultValue: []
    }),
    callOptionalRepoMethod({
      repo: tramitesPagoRepo,
      methodName: 'listTramiteCaratulaProviderFacturasByTramiteId',
      args: [tramiteId],
      defaultValue: []
    }),
    callOptionalRepoMethod({
      repo: tramitesPagoRepo,
      methodName: 'listTramiteCaratulaOrphansByTramiteId',
      args: [tramiteId],
      defaultValue: []
    }),
    tramite?.sociedad_id
      ? callOptionalRepoMethod({
        repo: tramitesPagoRepo,
        methodName: 'getSociedadById',
        args: [tramite.sociedad_id],
        defaultValue: null
      })
      : null
  ]);
  const documentosMapped = documentos.map(mapDocumentoRow);
  const caratulaSummary = summarizeStoredTramiteCaratulasV2({
    row: caratulaRow,
    documents: documentosMapped,
    providerRows,
    providerOrderRows,
    orphanRows,
    tramiteEstado: tramite.estado
  });

  return {
    tramite: mapTramiteRow(tramite),
    documentos: documentosMapped,
    retenciones: retenciones.map(mapRetencionRow),
    sociedad,
    caratula: caratulaSummary.caratula,
    provider_groups: caratulaSummary.provider_groups,
    orphan_groups: caratulaSummary.orphan_groups
  };
};

const createTramitesPagoReadUseCases = ({
  tramitesPagoRepo,
  baseDir,
  dependencies = {},
}) => {
  const {
    createFilesUseCasesImpl = createFilesUseCases,
    readFileImpl = fs.promises.readFile.bind(fs.promises),
    buildUnifiedPdfResourcePlanImpl = buildUnifiedPdfResourcePlan,
    mergeUnifiedPdfResourcesImpl = mergeUnifiedPdfResources,
    buildOmittedItemsHeaderImpl = buildOmittedItemsHeader,
    buildUnifiedPdfDownloadFilenameImpl = buildUnifiedPdfDownloadFilename,
  } = dependencies;
  const filesUseCases = createFilesUseCasesImpl({ baseDir });

  const listTramites = async ({ sociedadId, estado }) => {
    const normalizedSociedadId = parseOptionalPositiveIntOrThrow(sociedadId, 'sociedadId');
    const normalizedEstado = estado ? toNormalizedLowerString(estado) : undefined;
    const rows = await tramitesPagoRepo.listTramites({
      sociedadId: normalizedSociedadId,
      estado: normalizedEstado
    });
    return rows.map(mapTramiteRow);
  };

  const getRetencionesDisponibles = async ({ sociedadId }) => {
    const sociedad = parsePositiveIntOrThrow(sociedadId, 'sociedadId');
    const rows = await tramitesPagoRepo.getRetencionesDisponibles({ sociedadId: sociedad });
    return rows.map(mapRetencionRow);
  };

  const getTramite = async ({ id, actorUserId }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    return loadTramiteReadModel({
      tramitesPagoRepo,
      tramiteId,
      actorUserId,
    });
  };

  const getTramitePdfUnificado = async ({ id, actorUserId, providerSortDirection }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const normalizedDirectionInput = String(providerSortDirection || '').trim().toLowerCase();
    if (normalizedDirectionInput && normalizedDirectionInput !== 'asc' && normalizedDirectionInput !== 'desc') {
      throw createError(400, 'providerSortDirection invalido');
    }

    const tramiteData = await loadTramiteReadModel({
      tramitesPagoRepo,
      tramiteId,
      actorUserId,
    });
    const direction = normalizeSortDirection(providerSortDirection);
    const resources = buildUnifiedPdfResourcePlanImpl({
      providerGroups: tramiteData.provider_groups,
      documents: tramiteData.documentos,
      society: tramiteData.sociedad,
      direction,
    });

    const { buffer, omittedItems } = await mergeUnifiedPdfResourcesImpl({
      resources,
      loadResourceBuffer: async (resource) => {
        const { fullPath } = filesUseCases.getPdfFile({ rawPath: resource.path });
        return readFileImpl(fullPath);
      },
    });

    if (!buffer) {
      throw createError(404, 'No se encontraron PDFs validos para descargar en la vista unificada del tramite.');
    }

    return {
      buffer,
      filename: buildUnifiedPdfDownloadFilenameImpl({ tramiteId }),
      partialDownload: omittedItems.length > 0,
      omittedCount: omittedItems.length,
      omittedItemsHeader: buildOmittedItemsHeaderImpl(omittedItems),
    };
  };

  const getHistorial = async ({ id }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const rows = await tramitesPagoRepo.listHistorialByTramite(tramiteId);
    return rows.map(mapHistorialRow);
  };

  return {
    listTramites,
    getRetencionesDisponibles,
    getTramite,
    getTramitePdfUnificado,
    getHistorial
  };
};

module.exports = { createTramitesPagoReadUseCases };
