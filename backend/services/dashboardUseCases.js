const { FACTURA_ESTADOS } = require('../domain/facturas');
const {
  mapActividadRow,
  mapDocumentoRecienteRow,
  mapDashboardStats
} = require('../mappers/dashboardMapper');

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

const createDashboardUseCases = ({ dashboardRepo }) => {
  if (!dashboardRepo) {
    throw new Error('dashboardRepo requerido');
  }

  const getStats = async ({ sociedadId }) => {
    const [
      facturasStats,
      notasCount,
      mensajesCount,
      sociedadesCount,
      monedasRows,
      cuentasPagarRows,
      topProveedoresRows
    ] = await Promise.all([
      dashboardRepo.getFacturasStats({ sociedadId }),
      dashboardRepo.countNotasCredito({ sociedadId }),
      dashboardRepo.countMensajesHacienda({ sociedadId }),
      dashboardRepo.countSociedades({ sociedadId }),
      dashboardRepo.getMonedasResumen({ sociedadId }),
      dashboardRepo.getCuentasPagarResumenPorMoneda({ sociedadId }),
      dashboardRepo.getTopProveedoresPorPagar({ sociedadId, limit: 10 })
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

  const getRecentActivity = async ({ sociedadId }) => {
    const [facturas, notas, mensajes] = await Promise.all([
      dashboardRepo.listRecentFacturas({ sociedadId }),
      dashboardRepo.listRecentNotasCredito({ sociedadId }),
      dashboardRepo.listRecentMensajesHacienda({ sociedadId })
    ]);

    const activity = [...facturas, ...notas, ...mensajes]
      .map(mapActividadRow)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 10);

    return activity;
  };

  const getRecentDocuments = async ({ sociedadId }) => {
    const rows = await dashboardRepo.listRecentDocuments({ sociedadId });
    return rows.map(mapDocumentoRecienteRow);
  };

  return {
    getStats,
    getRecentActivity,
    getRecentDocuments
  };
};

module.exports = { createDashboardUseCases };
