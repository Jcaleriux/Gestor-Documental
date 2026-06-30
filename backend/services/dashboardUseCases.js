const { FACTURA_ESTADOS } = require('../domain/facturas');
const { TRAMITE_ESTADOS } = require('../domain/tramitesPago');
const {
  mapActividadRow,
  mapDocumentoRecienteRow,
  mapDashboardStats,
  mapDashboardWorkQueue
} = require('../mappers/dashboardMapper');
const { resolveSociedadAccessScope } = require('./sociedadAccessService');

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildMonetaryBreakdown = (rows, { amountKey, documentsKey }) => (
  (rows || [])
    .map((row) => ({
      moneda: row.moneda || 'CRC',
      monto: toNumber(row[amountKey]),
      documentos: toNumber(row[documentsKey])
    }))
    .filter((entry) => entry.documentos > 0 || entry.monto > 0)
);

const buildCurrencyGroupBreakdown = (totalesPorMoneda, group) => (
  Object.entries(totalesPorMoneda || {})
    .map(([moneda, groups]) => ({
      moneda,
      monto: toNumber(groups?.[group]?.total || 0),
      documentos: toNumber(groups?.[group]?.count || 0)
    }))
    .filter((entry) => entry.documentos > 0 || entry.monto > 0)
);

const countDocuments = (rows, key) => (
  (rows || []).reduce((total, row) => total + toNumber(row[key]), 0)
);

const countCurrencyGroupDocuments = (totalesPorMoneda, group) => (
  Object.values(totalesPorMoneda || {}).reduce(
    (total, groups) => total + toNumber(groups?.[group]?.count || 0),
    0
  )
);

const groupTopProveedoresByCurrency = (rows) => (
  (rows || []).reduce((result, row) => {
    const moneda = row.moneda || 'CRC';

    if (!result[moneda]) {
      result[moneda] = [];
    }

    result[moneda].push({
      proveedorId: Number(row.proveedor_id),
      proveedorNombre: row.proveedor_nombre || 'Sin nombre',
      proveedorIdentificacion: row.proveedor_identificacion || '',
      moneda,
      documentos: toNumber(row.documentos),
      totalAPagar: toNumber(row.total_a_pagar),
      totalRetencionPendiente: toNumber(row.total_retencion_pendiente),
      totalPendienteGlobal: toNumber(row.total_pendiente_global)
    });

    return result;
  }, {})
);

const buildFacturasWorkQueue = ({ facturasStats, cuentasPagarRows }) => {
  const facturas = facturasStats || {};

  return {
    noContabilizadas: toNumber(facturas.no_contabilizado),
    enRevision: toNumber(facturas.en_revision),
    porPagar: countDocuments(cuentasPagarRows, 'docs_por_pagar'),
    vencidas: countDocuments(cuentasPagarRows, 'docs_vencidas'),
    porVencer7Dias: countDocuments(cuentasPagarRows, 'docs_por_vencer_7'),
    retencionesPendientes: countDocuments(cuentasPagarRows, 'docs_retencion_pendiente'),
    enTramite: toNumber(facturas.en_tramite) + toNumber(facturas.pagados_parcialmente),
    pagadas: toNumber(facturas.pagados)
  };
};

const buildTramitesWorkQueue = (tramitesSummary) => {
  const summary = tramitesSummary || {};

  return {
    activos: toNumber(summary.activos),
    porEstado: {
      [TRAMITE_ESTADOS.EN_APROBACION_GERENCIA]: toNumber(summary.estado_en_aprobacion_gerencia),
      [TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_CONTABLE]: toNumber(summary.estado_en_aprobacion_gerencia_contable),
      [TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_FINANCIERA]: toNumber(summary.estado_en_aprobacion_gerencia_financiera),
      [TRAMITE_ESTADOS.EN_REVISION_TESORERIA]: toNumber(summary.estado_en_revision_tesoreria),
      [TRAMITE_ESTADOS.EN_REVISION_TESORERIA_1]: toNumber(summary.estado_en_revision_tesoreria_1),
      [TRAMITE_ESTADOS.EN_REVISION_TESORERIA_2]: toNumber(summary.estado_en_revision_tesoreria_2),
      [TRAMITE_ESTADOS.PAGADO]: toNumber(summary.estado_pagado),
      [TRAMITE_ESTADOS.CANCELADO]: toNumber(summary.estado_cancelado),
    },
    aprobacionesPendientes: {
      gerencia: toNumber(summary.aprobaciones_pendientes_gerencia),
      gerencia_contable: toNumber(summary.aprobaciones_pendientes_gerencia_contable),
      financiera: toNumber(summary.aprobaciones_pendientes_financiera)
    },
    rechazadosActivos: toNumber(summary.rechazados_activos)
  };
};

const createDashboardUseCases = ({ dashboardRepo }) => {
  if (!dashboardRepo) {
    throw new Error('dashboardRepo requerido');
  }

  const resolveScope = ({ user, sociedadId }) => resolveSociedadAccessScope({
    user,
    sociedadId,
    fieldName: 'sociedadId'
  });

  const getStats = async ({ sociedadId, user }) => {
    const sociedadScope = await resolveScope({ user, sociedadId });
    const [
      facturasStats,
      notasCount,
      mensajesCount,
      sociedadesCount,
      monedasRows,
      cuentasPagarRows,
      topProveedoresRows
    ] = await Promise.all([
      dashboardRepo.getFacturasStats(sociedadScope),
      dashboardRepo.countNotasCredito(sociedadScope),
      dashboardRepo.countMensajesHacienda(sociedadScope),
      dashboardRepo.countSociedades(sociedadScope),
      dashboardRepo.getMonedasResumen(sociedadScope),
      dashboardRepo.getCuentasPagarResumenPorMoneda(sociedadScope),
      dashboardRepo.getTopProveedoresPorPagar({ ...sociedadScope, limit: 10 })
    ]);

    const facturas = facturasStats || {};
    const pendientes = (facturas.no_contabilizado || 0) + (facturas.en_revision || 0);
    const resumenEstados = {
      no_contabilizadas: pendientes,
      contabilizadas: facturas.contabilizado_simple || 0,
      en_tramite: (facturas.en_tramite || 0) + (facturas.pagados_parcialmente || 0),
      pagadas_parcialmente: facturas.pagados_parcialmente || 0,
      pagadas: facturas.pagados || 0
    };

    const totalesPorMoneda = {};
    (monedasRows || []).forEach((row) => {
      const moneda = row.moneda || 'CRC';
      const estado = row.estado || FACTURA_ESTADOS.NO_CONTABILIZADO;
      const group = (estado === FACTURA_ESTADOS.NO_CONTABILIZADO || estado === FACTURA_ESTADOS.EN_REVISION)
        ? 'no_contabilizadas'
        : estado === FACTURA_ESTADOS.CONTABILIZADO
          ? 'contabilizadas'
        : (estado === FACTURA_ESTADOS.EN_TRAMITE_PAGO || estado === FACTURA_ESTADOS.PAGADO_PARCIALMENTE)
            ? 'en_tramite'
            : estado === FACTURA_ESTADOS.PAGADO
              ? 'pagadas'
              : 'otros';

      if (!totalesPorMoneda[moneda]) {
        totalesPorMoneda[moneda] = {};
      }
      const current = totalesPorMoneda[moneda][group] || { total: 0, count: 0 };
      totalesPorMoneda[moneda][group] = {
        total: Number(current.total) + Number(row.total || 0),
        count: Number(current.count) + Number(row.count || 0)
      };
    });

    const cuentasPorPagar = {
      documentos: countDocuments(cuentasPagarRows, 'docs_por_pagar'),
      montosPorMoneda: buildMonetaryBreakdown(cuentasPagarRows, {
        amountKey: 'monto_por_pagar',
        documentsKey: 'docs_por_pagar'
      })
    };

    const vencidas = {
      documentos: countDocuments(cuentasPagarRows, 'docs_vencidas'),
      montosPorMoneda: buildMonetaryBreakdown(cuentasPagarRows, {
        amountKey: 'monto_vencidas',
        documentsKey: 'docs_vencidas'
      })
    };

    const porVencer7Dias = {
      documentos: countDocuments(cuentasPagarRows, 'docs_por_vencer_7'),
      montosPorMoneda: buildMonetaryBreakdown(cuentasPagarRows, {
        amountKey: 'monto_por_vencer_7',
        documentsKey: 'docs_por_vencer_7'
      })
    };

    const retencionesPendientes = {
      documentos: countDocuments(cuentasPagarRows, 'docs_retencion_pendiente'),
      montosPorMoneda: buildMonetaryBreakdown(cuentasPagarRows, {
        amountKey: 'monto_retencion_pendiente',
        documentsKey: 'docs_retencion_pendiente'
      })
    };

    const pagadas = {
      documentos: countCurrencyGroupDocuments(totalesPorMoneda, 'pagadas'),
      montosPorMoneda: buildCurrencyGroupBreakdown(totalesPorMoneda, 'pagadas')
    };

    const topProveedoresPorPagar = groupTopProveedoresByCurrency(topProveedoresRows);

    return mapDashboardStats({
      totalFacturas: facturas.total_facturas || 0,
      totalNotasCredito: notasCount ? Number(notasCount.count) : 0,
      totalMensajesHacienda: mensajesCount ? Number(mensajesCount.count) : 0,
      totalSociedades: sociedadesCount ? Number(sociedadesCount.count) : 0,
      pendientes,
      contabilizados: facturas.contabilizados || 0,
      rechazados: facturas.rechazados || 0,
      enRevision: facturas.en_revision || 0,
      noContabilizado: facturas.no_contabilizado || 0,
      totalMes: facturas.total_mes || 0,
      resumenEstados,
      totalesPorMoneda,
      cuentasPorPagar,
      vencidas,
      porVencer7Dias,
      retencionesPendientes,
      pagadas,
      montoPendienteGlobalPorMoneda: buildMonetaryBreakdown(cuentasPagarRows, {
        amountKey: 'monto_pendiente_global',
        documentsKey: 'docs_por_pagar'
      }),
      topProveedoresPorPagar
    });
  };

  const getRecentActivity = async ({ sociedadId, user }) => {
    const sociedadScope = await resolveScope({ user, sociedadId });
    const [facturas, notas, mensajes] = await Promise.all([
      dashboardRepo.listRecentFacturas(sociedadScope),
      dashboardRepo.listRecentNotasCredito(sociedadScope),
      dashboardRepo.listRecentMensajesHacienda(sociedadScope)
    ]);

    const activity = [...facturas, ...notas, ...mensajes]
      .map(mapActividadRow)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 10);

    return activity;
  };

  const getRecentDocuments = async ({ sociedadId, user }) => {
    const sociedadScope = await resolveScope({ user, sociedadId });
    const rows = await dashboardRepo.listRecentDocuments(sociedadScope);
    return rows.map(mapDocumentoRecienteRow);
  };

  const getWorkQueue = async ({ sociedadId, user }) => {
    const sociedadScope = await resolveScope({ user, sociedadId });
    const [
      facturasStats,
      cuentasPagarRows,
      recentDocumentRows,
      sociedadesCount,
      tramitesSummary
    ] = await Promise.all([
      dashboardRepo.getFacturasStats(sociedadScope),
      dashboardRepo.getCuentasPagarResumenPorMoneda(sociedadScope),
      dashboardRepo.listRecentDocuments(sociedadScope),
      dashboardRepo.countSociedades(sociedadScope),
      dashboardRepo.getTramitesWorkQueueSummary(sociedadScope)
    ]);

    return mapDashboardWorkQueue({
      updatedAt: new Date().toISOString(),
      facturas: buildFacturasWorkQueue({
        facturasStats,
        cuentasPagarRows
      }),
      tramites: buildTramitesWorkQueue(tramitesSummary),
      documentosRecientes: {
        total: Array.isArray(recentDocumentRows) ? recentDocumentRows.length : 0,
        conMotivo: Array.isArray(recentDocumentRows)
          ? recentDocumentRows.filter((row) => String(row?.motivo || '').trim()).length
          : 0
      },
      sociedades: {
        visibles: toNumber(sociedadesCount?.count)
      }
    });
  };

  return {
    getStats,
    getWorkQueue,
    getRecentActivity,
    getRecentDocuments
  };
};

module.exports = { createDashboardUseCases };
