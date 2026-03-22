const { assertFound, createError } = require('../utils/errors');
const { TRAMITE_ACCIONES, TRAMITE_ESTADOS } = require('../domain/tramitesPago');
const { parsePositiveIntOrThrow } = require('./tramitesPagoUseCases.helpers');
const {
  decodeCaratulaPdfBase64,
  saveTramiteCaratulaPdf,
  deleteTramiteCaratulaFileIfExists,
  parseTramiteCaratulaPdf,
  applyAutomaticMatchingToPayload,
  summarizeStoredTramiteCaratula,
  applyManualResolutionToPayload
} = require('./tramitesPagoCaratulasSupport');

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

    let savedRutaArchivo = null;
    let previousRutaArchivo = null;

    try {
      const result = await runInTransaction(async (client) => {
        const tramite = await tramitesPagoRepo.getTramiteByIdForUpdate(tramiteId, client);
        assertFound(tramite, 'Tramite no encontrado');
        assertCaratulasEditableState(tramite);

        const sociedad = await tramitesPagoRepo.getSociedadById(tramite.sociedad_id, client);
        assertFound(sociedad, 'Sociedad no encontrada');

        const [documentos, currentCaratula] = await Promise.all([
          tramitesPagoRepo.listDocumentosByTramite(tramiteId, client),
          tramitesPagoRepo.getTramiteCaratulaByTramiteId(tramiteId, client)
        ]);

        const matchedPayload = applyAutomaticMatchingToPayload({
          parsedPayload,
          documents: documentos,
          society: sociedad
        });

        savedRutaArchivo = saveTramiteCaratulaPdf({
          baseDir,
          sociedadId: tramite.sociedad_id,
          tramiteId,
          pdfBuffer,
          filename: normalizedFilename
        });
        previousRutaArchivo = currentCaratula?.ruta_archivo || null;

        const procesadoEn = new Date().toISOString();
        const previewSummary = summarizeStoredTramiteCaratula({
          row: buildVirtualCaratulaRow({
            baseRow: currentCaratula,
            tramiteId,
            nombreArchivo: normalizedFilename,
            rutaArchivo: savedRutaArchivo,
            parsedPayload: matchedPayload,
            usuario,
            procesadoEn
          }),
          documents: documentos
        });

        const storedRow = await tramitesPagoRepo.upsertTramiteCaratula({
          tramiteId,
          nombreArchivo: normalizedFilename,
          rutaArchivo: savedRutaArchivo,
          estado: previewSummary.caratula?.estado || matchedPayload?.summary?.state || 'pendiente',
          fechaEjecucion: matchedPayload?.execution_date || null,
          sociedadNombreRaw: matchedPayload?.society?.raw_name || null,
          sociedadIdentificacionRaw: matchedPayload?.society?.raw_identification || null,
          moneda: matchedPayload?.currency || null,
          totalPaginas: matchedPayload?.total_pages || 0,
          warnings: previewSummary.warnings,
          parsedPayload: matchedPayload,
          cargadoPor: usuario || null,
          procesadoEn
        }, client);

        await tramitesPagoRepo.insertHistorialTramite({
          tramiteId,
          accion: TRAMITE_ACCIONES.CARGAR_CARATULAS,
          estadoNuevo: tramite.estado,
          usuario,
          motivo: normalizedFilename
        }, client);
        await tramitesPagoRepo.touchTramite(tramiteId, client);

        return summarizeStoredTramiteCaratula({
          row: storedRow,
          documents
        });
      });

      if (previousRutaArchivo && previousRutaArchivo !== savedRutaArchivo) {
        deleteTramiteCaratulaFileIfExists({
          baseDir,
          rutaArchivo: previousRutaArchivo
        });
      }

      return result;
    } catch (error) {
      if (savedRutaArchivo) {
        deleteTramiteCaratulaFileIfExists({
          baseDir,
          rutaArchivo: savedRutaArchivo
        });
      }
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

      const [documentos, currentCaratula] = await Promise.all([
        tramitesPagoRepo.listDocumentosByTramite(tramiteId, client),
        tramitesPagoRepo.getTramiteCaratulaByTramiteId(tramiteId, client)
      ]);
      assertFound(currentCaratula, 'Caratulas no cargadas para este tramite');

      const nextPayload = applyManualResolutionToPayload({
        payload: currentCaratula.parsed_payload || {},
        documents: documentos,
        groupKey,
        providerFacturaId,
        lineMatches: Array.isArray(line_matches) ? line_matches : []
      });

      const procesadoEn = new Date().toISOString();
      const previewSummary = summarizeStoredTramiteCaratula({
        row: buildVirtualCaratulaRow({
          baseRow: currentCaratula,
          tramiteId,
          nombreArchivo: currentCaratula.nombre_archivo,
          rutaArchivo: currentCaratula.ruta_archivo,
          parsedPayload: nextPayload,
          usuario,
          procesadoEn
        }),
        documents: documentos
      });

      const storedRow = await tramitesPagoRepo.upsertTramiteCaratula({
        tramiteId,
        nombreArchivo: currentCaratula.nombre_archivo,
        rutaArchivo: currentCaratula.ruta_archivo,
        estado: previewSummary.caratula?.estado || nextPayload?.summary?.state || currentCaratula.estado,
        fechaEjecucion: nextPayload?.execution_date || currentCaratula.fecha_ejecucion || null,
        sociedadNombreRaw: nextPayload?.society?.raw_name || currentCaratula.sociedad_nombre_raw || null,
        sociedadIdentificacionRaw: nextPayload?.society?.raw_identification || currentCaratula.sociedad_identificacion_raw || null,
        moneda: nextPayload?.currency || currentCaratula.moneda || null,
        totalPaginas: nextPayload?.total_pages || currentCaratula.total_paginas || 0,
        warnings: previewSummary.warnings,
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

      return summarizeStoredTramiteCaratula({
        row: storedRow,
        documents
      });
    });
  };

  return {
    uploadCaratulas,
    resolveCaratulas
  };
};

module.exports = { createTramitesPagoCaratulasUseCases };
