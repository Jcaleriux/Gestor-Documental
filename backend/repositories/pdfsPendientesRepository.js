const pool = require('../db');

const getDb = (client) => client || pool;
const getClient = () => pool.connect();

const getSociedadById = async (sociedadId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT id, codigo, nombre_proyecto, razon_social, cedula_juridica, activo
    FROM sociedades
    WHERE id = $1
    `,
    [sociedadId]
  );

  return rows[0] || null;
};

const emisorNombreExpression = `
  COALESCE(
    f.emisor ->> 'Nombre',
    f.emisor ->> 'nombre',
    ''
  )
`;

const receptorNombreExpression = `
  COALESCE(
    f.receptor ->> 'Nombre',
    f.receptor ->> 'nombre',
    ''
  )
`;

const emisorIdentificacionExpression = `
  COALESCE(
    f.emisor #>> '{Identificacion,Numero}',
    f.emisor #>> '{identificacion,numero}',
    ''
  )
`;

const receptorIdentificacionExpression = `
  COALESCE(
    f.receptor #>> '{Identificacion,Numero}',
    f.receptor #>> '{identificacion,numero}',
    ''
  )
`;

const monedaExpression = `
  COALESCE(
    f.resumen #>> '{CodigoMoneda}',
    f.resumen #>> '{codigoMoneda}',
    f.resumen #>> '{ResumenFactura,CodigoTipoMoneda,CodigoMoneda}',
    f.resumen #>> '{resumenFactura,codigoTipoMoneda,codigoMoneda}',
    'CRC'
  )
`;

const totalExpression = `
  COALESCE(
    NULLIF(f.resumen #>> '{TotalComprobante}', '')::numeric,
    NULLIF(f.resumen #>> '{totalComprobante}', '')::numeric,
    NULLIF(f.resumen #>> '{ResumenFactura,TotalComprobante}', '')::numeric,
    NULLIF(f.resumen #>> '{resumenFactura,totalComprobante}', '')::numeric,
    0
  )
`;

const facturaCandidateSelect = `
  SELECT
    f.id,
    f.sociedad_id,
    s.nombre_proyecto AS sociedad_nombre_proyecto,
    s.razon_social AS sociedad_razon_social,
    f.clave,
    f.consecutivo,
    f.fecha_emision,
    ${emisorNombreExpression} AS emisor_nombre,
    ${emisorIdentificacionExpression} AS emisor_identificacion,
    ${receptorNombreExpression} AS receptor_nombre,
    ${receptorIdentificacionExpression} AS receptor_identificacion,
    ${monedaExpression} AS moneda,
    ${totalExpression} AS total,
    f.ruta_pdf,
    f.ruta_xml,
    (f.ruta_pdf IS NOT NULL AND f.ruta_pdf <> '') AS has_pdf
  FROM facturas f
  LEFT JOIN sociedades s ON s.id = f.sociedad_id
`;

const searchFacturaCandidates = async ({ sociedadId, query, limit = 15 } = {}, client) => {
  const params = [];
  const clauses = [];
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const normalizedLimit = Math.min(Math.max(Number(limit) || 15, 1), 50);

  if (sociedadId) {
    params.push(Number(sociedadId));
    clauses.push(`f.sociedad_id = $${params.length}`);
  }

  if (normalizedQuery) {
    params.push(`%${normalizedQuery}%`);
    clauses.push(`(
      LOWER(COALESCE(f.clave::text, '')) LIKE $${params.length}
      OR LOWER(COALESCE(f.consecutivo::text, '')) LIKE $${params.length}
      OR LOWER(${emisorNombreExpression}) LIKE $${params.length}
      OR LOWER(${receptorNombreExpression}) LIKE $${params.length}
      OR LOWER(${emisorIdentificacionExpression}) LIKE $${params.length}
      OR LOWER(${receptorIdentificacionExpression}) LIKE $${params.length}
      OR LOWER(COALESCE(f.ruta_xml::text, '')) LIKE $${params.length}
      OR LOWER(COALESCE(f.ruta_pdf::text, '')) LIKE $${params.length}
    )`);
  }

  params.push(normalizedLimit);

  const { rows } = await getDb(client).query(
    `
    ${facturaCandidateSelect}
    ${clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''}
    ORDER BY
      CASE WHEN f.ruta_pdf IS NULL OR f.ruta_pdf = '' THEN 0 ELSE 1 END,
      f.fecha_emision DESC NULLS LAST,
      f.id DESC
    LIMIT $${params.length}
    `,
    params
  );

  return rows;
};

const getFacturaForPdfAssignment = async (facturaId, client) => {
  const { rows } = await getDb(client).query(
    `
    ${facturaCandidateSelect}
    WHERE f.id = $1
    FOR UPDATE OF f
    `,
    [facturaId]
  );

  return rows[0] || null;
};

const updateFacturaRutaPdf = async ({ facturaId, rutaPdf }, client) => {
  const { rows } = await getDb(client).query(
    `
    UPDATE facturas
    SET ruta_pdf = $2
    WHERE id = $1
    RETURNING id, sociedad_id, clave, consecutivo, fecha_emision, ruta_pdf, ruta_xml
    `,
    [facturaId, rutaPdf]
  );

  return rows[0] || null;
};

module.exports = {
  getClient,
  getSociedadById,
  searchFacturaCandidates,
  getFacturaForPdfAssignment,
  updateFacturaRutaPdf
};
