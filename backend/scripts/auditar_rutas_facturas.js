const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { runtimeConfig } = require('../config/runtime');
const { getRelativePathVariants } = require('../utils/documentPaths');

const MAX_ISSUES_TO_PRINT = 50;

const configuredBaseDir = path.resolve(runtimeConfig.storageBaseDir);
const projectRoot = path.resolve(__dirname, '..', '..');

const resolveStoredPath = (rawPath) => {
  if (!rawPath) return null;

  const raw = String(rawPath).replace(/\\/g, '/');
  const normalized = raw.replace(/^\/+/, '');
  const variants = getRelativePathVariants(normalized);
  const candidates = path.isAbsolute(raw)
    ? [path.normalize(raw)]
    : variants.flatMap((variant) => ([
      path.resolve(configuredBaseDir, variant),
      path.resolve(configuredBaseDir, '..', variant),
      path.resolve(projectRoot, variant),
      path.resolve(process.cwd(), variant),
    ]));

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0] || null;
};

const hasManifestInDir = (dirPath) => {
  if (!dirPath || !fs.existsSync(dirPath)) return false;

  return fs.readdirSync(dirPath, { withFileTypes: true })
    .some((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.manifest.json'));
};

const auditFacturaRow = (row) => {
  const pdfPath = resolveStoredPath(row.ruta_pdf);
  const xmlPath = resolveStoredPath(row.ruta_xml);
  const pdfExists = row.ruta_pdf ? fs.existsSync(pdfPath) : null;
  const xmlExists = row.ruta_xml ? fs.existsSync(xmlPath) : null;
  const dirs = [...new Set(
    [pdfPath, xmlPath]
      .filter(Boolean)
      .map((filePath) => path.dirname(filePath))
  )];
  const manifestExists = dirs.some(hasManifestInDir);

  if (pdfExists !== false && xmlExists !== false && manifestExists) {
    return null;
  }

  return {
    id: row.id,
    consecutivo: row.consecutivo,
    fecha_emision: row.fecha_emision,
    pdf_exists: pdfExists,
    xml_exists: xmlExists,
    manifest_exists: manifestExists,
    ruta_pdf: row.ruta_pdf,
    ruta_xml: row.ruta_xml,
  };
};

const main = async () => {
  const failOnIssues = process.argv.includes('--fail-on-issues');
  const { rows } = await pool.query(`
    SELECT id, consecutivo::text AS consecutivo, ruta_pdf, ruta_xml, fecha_emision
    FROM facturas
    WHERE ruta_pdf IS NOT NULL OR ruta_xml IS NOT NULL
    ORDER BY id DESC
  `);

  const issues = rows
    .map(auditFacturaRow)
    .filter(Boolean);

  console.log(JSON.stringify({
    checked: rows.length,
    issue_count: issues.length,
    issues: issues.slice(0, MAX_ISSUES_TO_PRINT),
    truncated: issues.length > MAX_ISSUES_TO_PRINT,
  }, null, 2));

  if (failOnIssues && issues.length > 0) {
    process.exitCode = 1;
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
