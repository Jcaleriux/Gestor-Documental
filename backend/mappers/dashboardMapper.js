const mapActividadRow = (row) => ({ ...row });

const mapDocumentoRecienteRow = (row) => ({
  ...row,
  id: row?.origen_historial ? `${row.origen_historial}-${row.id}` : row.id
});

const mapDashboardStats = (data) => ({ ...data });
const mapDashboardWorkQueue = (data) => ({ ...data });

module.exports = {
  mapActividadRow,
  mapDocumentoRecienteRow,
  mapDashboardStats,
  mapDashboardWorkQueue
};
