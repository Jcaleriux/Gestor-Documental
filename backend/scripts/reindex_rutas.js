const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { parseXML } = require("../utils/xmlParser");
const { resolveDocumentPaths } = require("../utils/documentPaths");

const baseDir = process.env.FACTURAS_BASE_DIR || path.resolve(__dirname, "..", "..");
const documentPaths = resolveDocumentPaths(baseDir);
const procesadasDir = fs.existsSync(documentPaths.legacyFacturasProcesadasDir)
  ? documentPaths.legacyFacturasProcesadasDir
  : documentPaths.facturasProcesadasDir;

function normalizarRuta(relPath) {
  return relPath.replace(/\\/g, "/");
}

function obtenerBaseNombre(xmlFile) {
  let base = xmlFile.replace(/\.xml$/i, "");
  if (/^RH-/i.test(base)) {
    base = base.replace(/^RH-/i, "");
  }
  if (/RH$/i.test(base)) {
    base = base.replace(/RH$/i, "");
  }
  return base;
}

function obtenerPdfPath(xmlPath) {
  const dir = path.dirname(xmlPath);
  const baseName = obtenerBaseNombre(path.basename(xmlPath));
  const pdfPath = path.join(dir, `${baseName}.pdf`);
  return fs.existsSync(pdfPath) ? pdfPath : null;
}

async function procesarXml(xmlPath) {
  const xml = fs.readFileSync(xmlPath, "utf8");
  const { tipo, data } = parseXML(xml);

  const relXml = normalizarRuta(path.relative(baseDir, xmlPath));
  const pdfPath = obtenerPdfPath(xmlPath);
  const relPdf = pdfPath ? normalizarRuta(path.relative(baseDir, pdfPath)) : null;

  if (tipo === "FacturaElectronica") {
    await pool.query(
      `UPDATE facturas
       SET ruta_xml = $1, ruta_pdf = COALESCE($2, ruta_pdf)
       WHERE clave = $3`,
      [relXml, relPdf, data.Clave]
    );
    return;
  }

  if (tipo === "TiqueteElectronico") {
    await pool.query(
      `UPDATE tiquetes_electronicos
       SET ruta_xml = $1, ruta_pdf = COALESCE($2, ruta_pdf)
       WHERE clave = $3`,
      [relXml, relPdf, data.Clave]
    );
    return;
  }

  if (tipo === "NotaCreditoElectronica") {
    await pool.query(
      `UPDATE notas_credito
       SET ruta_xml = $1, ruta_pdf = COALESCE($2, ruta_pdf)
       WHERE clave = $3`,
      [relXml, relPdf, data.Clave]
    );
    return;
  }

  if (tipo === "MensajeHacienda") {
    await pool.query(
      `UPDATE mensajes_hacienda
       SET ruta_xml = $1
       WHERE clave = $2`,
      [relXml, data.Clave]
    );
  }
}

function listarXmls(dir) {
  const resultados = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      resultados.push(...listarXmls(full));
    } else if (item.isFile() && item.name.toLowerCase().endsWith(".xml")) {
      resultados.push(full);
    }
  }
  return resultados;
}

async function main() {
  try {
    const xmls = listarXmls(procesadasDir);
    console.log(`XML encontrados: ${xmls.length}`);

    for (const xmlPath of xmls) {
      await procesarXml(xmlPath);
    }

    console.log("Reindex de rutas completado.");
  } catch (err) {
    console.error("Error en reindex:", err.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
