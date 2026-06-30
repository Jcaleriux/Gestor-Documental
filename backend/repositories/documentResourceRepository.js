const pool = require('../db');
const { getRelativePathVariants, toCurrentRelativePath } = require('../utils/documentPaths');

const toPosix = (value) => String(value || '').replace(/\\/g, '/');

const tryDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
};

const addCandidate = (candidates, value) => {
  const normalized = toPosix(value).replace(/^\/+/, '').trim();
  if (normalized) {
    candidates.add(normalized);
  }
};

const addDocumentsRelativeCandidate = (candidates, value) => {
  const normalized = toPosix(value);
  const lower = normalized.toLowerCase();
  const marker = '/documentos/';
  const markerIndex = lower.lastIndexOf(marker);
  if (markerIndex >= 0) {
    addCandidate(candidates, normalized.slice(markerIndex + 1));
    return;
  }

  if (lower.startsWith('documentos/')) {
    addCandidate(candidates, normalized);
  }
};

const buildStoredPathCandidates = (rawPath) => {
  const decoded = tryDecode(rawPath);
  const candidates = new Set();

  addCandidate(candidates, decoded);
  addCandidate(candidates, toCurrentRelativePath(decoded));
  getRelativePathVariants(decoded).forEach((variant) => addCandidate(candidates, variant));
  addDocumentsRelativeCandidate(candidates, decoded);

  return [...candidates];
};

const PDF_RESOURCE_SQL = `
  SELECT resource_type, resource_id, sociedad_id
  FROM (
    SELECT 'factura_pdf' AS resource_type, f.id AS resource_id, f.sociedad_id
    FROM facturas f
    WHERE f.ruta_pdf = ANY($1::text[])

    UNION ALL

    SELECT 'nota_credito_pdf' AS resource_type, n.id AS resource_id, n.sociedad_id
    FROM notas_credito n
    WHERE n.ruta_pdf = ANY($1::text[])

    UNION ALL

    SELECT 'tiquete_pdf' AS resource_type, t.id AS resource_id, t.sociedad_id
    FROM tiquetes_electronicos t
    WHERE t.ruta_pdf = ANY($1::text[])

    UNION ALL

    SELECT 'tabla_pago_pdf' AS resource_type, tp.id AS resource_id, tp.sociedad_id
    FROM tablas_pago tp
    WHERE tp.ruta_pdf = ANY($1::text[])

    UNION ALL

    SELECT 'orden_compra_pdf' AS resource_type, oc.id AS resource_id, oc.sociedad_id
    FROM ordenes_compra oc
    WHERE oc.ruta_pdf = ANY($1::text[])

    UNION ALL

    SELECT 'contabilizacion_respaldo_pdf' AS resource_type, dr.id AS resource_id, f.sociedad_id
    FROM facturas_contabilizacion_documentos_respaldo dr
    JOIN facturas f ON f.id = dr.factura_id
    WHERE dr.ruta_pdf = ANY($1::text[])

    UNION ALL

    SELECT 'tramite_caratula_pdf' AS resource_type, tc.id AS resource_id, t.sociedad_id
    FROM tramites_pago_caratulas tc
    JOIN tramites_pago t ON t.id = tc.tramite_id
    WHERE tc.ruta_archivo = ANY($1::text[])

    UNION ALL

    SELECT 'tramite_caratula_proveedor_pdf' AS resource_type, tcp.id AS resource_id, t.sociedad_id
    FROM tramites_pago_caratulas_proveedor tcp
    JOIN tramites_pago t ON t.id = tcp.tramite_id
    WHERE tcp.ruta_archivo = ANY($1::text[])

    UNION ALL

    SELECT 'tramite_caratula_huerfana_pdf' AS resource_type, tch.id AS resource_id, t.sociedad_id
    FROM tramites_pago_caratulas_huerfanas tch
    JOIN tramites_pago t ON t.id = tch.tramite_id
    WHERE tch.ruta_archivo = ANY($1::text[])
  ) resources
`;

const XML_RESOURCE_SQL = `
  SELECT resource_type, resource_id, sociedad_id
  FROM (
    SELECT 'factura_xml' AS resource_type, f.id AS resource_id, f.sociedad_id
    FROM facturas f
    WHERE f.ruta_xml = ANY($1::text[])

    UNION ALL

    SELECT 'nota_credito_xml' AS resource_type, n.id AS resource_id, n.sociedad_id
    FROM notas_credito n
    WHERE n.ruta_xml = ANY($1::text[])

    UNION ALL

    SELECT 'tiquete_xml' AS resource_type, t.id AS resource_id, t.sociedad_id
    FROM tiquetes_electronicos t
    WHERE t.ruta_xml = ANY($1::text[])

    UNION ALL

    SELECT 'mensaje_hacienda_xml' AS resource_type, m.id AS resource_id, m.sociedad_id
    FROM mensajes_hacienda m
    WHERE m.ruta_xml = ANY($1::text[])
  ) resources
`;

const listDocumentResourcesByPath = async ({ rawPath, kind }) => {
  const candidates = buildStoredPathCandidates(rawPath);
  if (candidates.length === 0) {
    return [];
  }

  const sql = kind === 'xml' ? XML_RESOURCE_SQL : PDF_RESOURCE_SQL;
  const { rows } = await pool.query(sql, [candidates]);
  return rows;
};

module.exports = {
  buildStoredPathCandidates,
  listDocumentResourcesByPath
};
