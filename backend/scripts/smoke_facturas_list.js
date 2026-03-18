const facturasRepo = require('../repositories/facturasRepository');
const { createFacturasUseCases } = require('../services/facturasUseCases');
const pool = require('../db');

const toOptionalPositiveInt = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const main = async () => {
  const sociedadId = toOptionalPositiveInt(process.env.SMOKE_SOCIEDAD_ID);
  const pageSize = toOptionalPositiveInt(process.env.SMOKE_FACTURAS_PAGE_SIZE) || 50;
  const useCases = createFacturasUseCases({ facturasRepo });

  const result = await useCases.listFacturas({
    sociedadId,
    page: 1,
    pageSize,
  });

  console.log(JSON.stringify({
    request: {
      sociedadId,
      page: 1,
      pageSize,
    },
    meta: result.meta,
    summary: result.summary,
    sample: result.items.slice(0, 3).map((item) => ({
      id: item.id,
      consecutivo: item.consecutivo || item.numero_consecutivo || null,
      clave: item.clave,
      estado: item.estado,
      has_mensaje_hacienda: item.has_mensaje_hacienda,
    })),
  }, null, 2));
};

main()
  .catch((error) => {
    console.error('FACTURAS_SMOKE_ERROR');
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
