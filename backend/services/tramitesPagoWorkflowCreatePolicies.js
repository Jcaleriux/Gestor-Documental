const { TRAMITE_ESTADOS, TRAMITE_ACCIONES } = require('../domain/tramitesPago');
const { FACTURA_ESTADOS } = require('../domain/facturas');
const { createError } = require('../utils/errors');
const {
  validateFacturasExistentes,
  resolveSociedadFinal
} = require('./tramitesPagoRules');

const FACTURA_ESTADOS_DISPONIBLES_PARA_TRAMITE = new Set([
  FACTURA_ESTADOS.CONTABILIZADO,
  FACTURA_ESTADOS.PAGADO_PARCIALMENTE
]);

const CREATE_TRAMITE_ITEM_POLICIES = Object.freeze({
  facturas: Object.freeze({
    fetchRows: async ({ tramitesPagoRepo, ids, client }) => (
      ids.length > 0
        ? tramitesPagoRepo.getFacturasByIds(ids, client)
        : []
    ),
    validateRows: ({ ids, rows }) => {
      if (ids.length === 0) {
        return;
      }
      const facturasExistError = validateFacturasExistentes(ids, rows);
      if (facturasExistError) {
        throw createError(
          facturasExistError.status,
          facturasExistError.error,
          facturasExistError.data
        );
      }

      const invalidRows = rows.filter(
        (row) => !FACTURA_ESTADOS_DISPONIBLES_PARA_TRAMITE.has(row.estado)
      );
      if (invalidRows.length > 0) {
        throw createError(
          400,
          'Solo se pueden tramitar facturas contabilizadas o con pago parcial',
          invalidRows.map((row) => Number(row.id))
        );
      }
    },
    validateDuplicates: async ({ tramitesPagoRepo, ids, client }) => {
      if (ids.length === 0) {
        return;
      }
      const duplicadosRows = await tramitesPagoRepo.findDuplicadosActivos(ids, client);
      if (duplicadosRows.length > 0) {
        throw createError(
          409,
          'Algunas facturas ya pertenecen a un tramite activo',
          duplicadosRows.map((row) => row.factura_id)
        );
      }
    },
    toSociedadRows: ({ rows }) => rows,
    attachToTramite: async ({ tramitesPagoRepo, tramiteId, ids, rows, client }) => {
      if (ids.length === 0) {
        return;
      }
      await tramitesPagoRepo.insertTramiteDocumentos({
        tramiteId,
        facturaEntries: rows.map((row) => ({
          facturaId: Number(row.id),
          estadoFacturaOrigen: row.estado || FACTURA_ESTADOS.CONTABILIZADO
        }))
      }, client);

      const aprobadores = await tramitesPagoRepo.listCentroCostoAprobadoresByFacturaIds(ids, client);
      if (aprobadores.length > 0) {
        await tramitesPagoRepo.insertTramiteDocumentoAprobadores({
          tramiteId,
          aprobadores
        }, client);
      }

      await tramitesPagoRepo.updateFacturasEstadoByIds({
        facturaIds: ids,
        estado: FACTURA_ESTADOS.EN_TRAMITE_PAGO
      }, client);
    }
  }),
  retenciones: Object.freeze({
    fetchRows: async ({ tramitesPagoRepo, ids, client }) => (
      ids.length > 0
        ? tramitesPagoRepo.getRetencionesPendientesByFacturaIds(ids, client)
        : []
    ),
    validateRows: ({ ids, rows }) => {
      if (ids.length > 0 && rows.length !== ids.length) {
        throw createError(400, 'Una o mas retenciones no estan disponibles para pago');
      }
    },
    validateDuplicates: async ({ tramitesPagoRepo, ids, client }) => {
      if (ids.length === 0) {
        return;
      }
      const duplicadosRet = await tramitesPagoRepo.findRetencionesDuplicadasActivas(ids, client);
      if (duplicadosRet.length > 0) {
        throw createError(
          409,
          'Algunas retenciones ya pertenecen a un tramite activo',
          duplicadosRet.map((row) => row.factura_id)
        );
      }
    },
    toSociedadRows: ({ rows }) => rows.map((row) => ({ id: row.id, sociedad_id: row.sociedad_id })),
    attachToTramite: async ({ tramitesPagoRepo, tramiteId, rows, client }) => {
      if (rows.length === 0) {
        return;
      }
      await tramitesPagoRepo.insertTramiteRetenciones({
        tramiteId,
        retenciones: rows.map((row) => ({
          facturaId: Number(row.id),
          proveedorId: row.proveedor_id ? Number(row.proveedor_id) : null,
          montoRetencion: Number(row.monto_retencion_pendiente || 0)
        }))
      }, client);
    }
  })
});

const resolveCreateTramiteItemPolicy = (itemType) => CREATE_TRAMITE_ITEM_POLICIES[itemType] || null;

const createTramiteWithPolicies = async ({
  tramitesPagoRepo,
  itemEntries,
  resolveItemPolicy,
  sociedadInput,
  usuario,
  client
}) => {
  const itemContexts = [];
  const resolvePolicy = resolveItemPolicy || resolveCreateTramiteItemPolicy;

  for (const entry of itemEntries) {
    const policy = resolvePolicy(entry.type);
    if (!policy) {
      throw createError(400, `tipo de item invalido: ${entry.type}`);
    }

    const rows = await policy.fetchRows({
      tramitesPagoRepo,
      ids: entry.ids,
      client
    });

    policy.validateRows({
      ids: entry.ids,
      rows
    });

    itemContexts.push({
      ...entry,
      rows,
      policy
    });
  }

  const sociedadesSource = itemContexts.flatMap((itemContext) => itemContext.policy.toSociedadRows({
    ids: itemContext.ids,
    rows: itemContext.rows
  }));

  const sociedadCheck = resolveSociedadFinal(sociedadInput, sociedadesSource);
  if (sociedadCheck.status) {
    throw createError(sociedadCheck.status, sociedadCheck.error, sociedadCheck.data);
  }
  const sociedadFinal = sociedadCheck.sociedadFinal;

  for (const itemContext of itemContexts) {
    await itemContext.policy.validateDuplicates({
      tramitesPagoRepo,
      ids: itemContext.ids,
      rows: itemContext.rows,
      client
    });
  }

  const tramite = await tramitesPagoRepo.insertTramite({
    sociedadId: sociedadFinal,
    estado: TRAMITE_ESTADOS.EN_APROBACION_GERENCIA,
    creadoPor: usuario
  }, client);

  for (const itemContext of itemContexts) {
    await itemContext.policy.attachToTramite({
      tramitesPagoRepo,
      tramiteId: tramite.id,
      ids: itemContext.ids,
      rows: itemContext.rows,
      client
    });
  }

  await tramitesPagoRepo.insertHistorialTramite({
    tramiteId: tramite.id,
    accion: TRAMITE_ACCIONES.CREAR_TRAMITE,
    estadoNuevo: tramite.estado,
    usuario,
    motivo: null
  }, client);

  return tramite;
};

module.exports = {
  CREATE_TRAMITE_ITEM_POLICIES,
  resolveCreateTramiteItemPolicy,
  createTramiteWithPolicies
};
