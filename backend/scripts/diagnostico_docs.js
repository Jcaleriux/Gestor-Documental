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

function listarArchivos(dir) {
  const resultados = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      resultados.push(...listarArchivos(full));
    } else if (item.isFile()) {
      resultados.push(full);
    }
  }
  return resultados;
}

function baseGrupo(filename) {
  let base = filename.replace(/\.(xml|pdf)$/i, "");
  if (/^RH-/i.test(base)) base = base.replace(/^RH-/i, "");
  if (/RH$/i.test(base)) base = base.replace(/RH$/i, "");
  return base;
}

async function diagnosticoArchivos() {
  const files = listarArchivos(procesadasDir);
  const xmls = files.filter((f) => f.toLowerCase().endsWith(".xml"));
  const pdfs = files.filter((f) => f.toLowerCase().endsWith(".pdf"));

  const tipoCounts = {};
  let xmlErrores = 0;

  const grupos = {};
  for (const file of files) {
    const name = path.basename(file);
    const base = baseGrupo(name);
    if (!grupos[base]) grupos[base] = { xml: 0, pdf: 0, rh: 0 };
    if (name.toLowerCase().endsWith(".pdf")) grupos[base].pdf += 1;
    if (name.toLowerCase().endsWith(".xml")) {
      const isRH = /(^RH-)|RH\.xml$/i.test(name);
      if (isRH) grupos[base].rh += 1;
      else grupos[base].xml += 1;
    }
  }

  for (const xml of xmls) {
    try {
      const content = fs.readFileSync(xml, "utf8");
      const { tipo } = parseXML(content);
      tipoCounts[tipo] = (tipoCounts[tipo] || 0) + 1;
    } catch (err) {
      xmlErrores += 1;
    }
  }

  const gruposArray = Object.values(grupos);
  const gruposConXml = gruposArray.filter((g) => g.xml > 0).length;
  const gruposConPdf = gruposArray.filter((g) => g.pdf > 0).length;
  const gruposConRh = gruposArray.filter((g) => g.rh > 0).length;

  return {
    totalFiles: files.length,
    totalXml: xmls.length,
    totalPdf: pdfs.length,
    xmlErrores,
    tipoCounts,
    grupos: {
      total: gruposArray.length,
      conXml: gruposConXml,
      conPdf: gruposConPdf,
      conRh: gruposConRh,
    },
  };
}

async function diagnosticoDb() {
  const [
    facturas,
    notas,
    mensajes,
    facturasSinSociedad,
    notasSinSociedad,
    mensajesSinSociedad,
    facturasSinXml,
    facturasSinPdf,
  ] = await Promise.all([
    pool.query("SELECT COUNT(*)::int as count FROM facturas"),
    pool.query("SELECT COUNT(*)::int as count FROM notas_credito"),
    pool.query("SELECT COUNT(*)::int as count FROM mensajes_hacienda"),
    pool.query("SELECT COUNT(*)::int as count FROM facturas WHERE sociedad_id IS NULL"),
    pool.query("SELECT COUNT(*)::int as count FROM notas_credito WHERE sociedad_id IS NULL"),
    pool.query("SELECT COUNT(*)::int as count FROM mensajes_hacienda WHERE sociedad_id IS NULL"),
    pool.query("SELECT COUNT(*)::int as count FROM facturas WHERE ruta_xml IS NULL"),
    pool.query("SELECT COUNT(*)::int as count FROM facturas WHERE ruta_pdf IS NULL"),
  ]);

  return {
    facturas: facturas.rows[0].count,
    notas: notas.rows[0].count,
    mensajes: mensajes.rows[0].count,
    sinSociedad: {
      facturas: facturasSinSociedad.rows[0].count,
      notas: notasSinSociedad.rows[0].count,
      mensajes: mensajesSinSociedad.rows[0].count,
    },
    sinRutas: {
      facturasXml: facturasSinXml.rows[0].count,
      facturasPdf: facturasSinPdf.rows[0].count,
    },
  };
}

async function main() {
  try {
    const archivos = await diagnosticoArchivos();
    const db = await diagnosticoDb();

    console.log("=== DIAGNOSTICO ARCHIVOS ===");
    console.log(`Total archivos: ${archivos.totalFiles}`);
    console.log(`Total XML: ${archivos.totalXml}`);
    console.log(`Total PDF: ${archivos.totalPdf}`);
    console.log(`XML con error: ${archivos.xmlErrores}`);
    console.log("Tipos XML:");
    Object.entries(archivos.tipoCounts).forEach(([tipo, count]) => {
      console.log(`  - ${tipo}: ${count}`);
    });
    console.log("Grupos (base):");
    console.log(`  Total grupos: ${archivos.grupos.total}`);
    console.log(`  Con XML: ${archivos.grupos.conXml}`);
    console.log(`  Con PDF: ${archivos.grupos.conPdf}`);
    console.log(`  Con RH: ${archivos.grupos.conRh}`);

    console.log("\n=== DIAGNOSTICO DB ===");
    console.log(`Facturas: ${db.facturas}`);
    console.log(`Notas credito: ${db.notas}`);
    console.log(`Mensajes Hacienda: ${db.mensajes}`);
    console.log(`Sin sociedad -> Facturas: ${db.sinSociedad.facturas}, Notas: ${db.sinSociedad.notas}, Mensajes: ${db.sinSociedad.mensajes}`);
    console.log(`Facturas sin ruta_xml: ${db.sinRutas.facturasXml}`);
    console.log(`Facturas sin ruta_pdf: ${db.sinRutas.facturasPdf}`);
  } catch (err) {
    console.error("Error en diagnostico:", err.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
