const fs = require("fs");
const path = require("path");
const { resolveDocumentPaths } = require("../utils/documentPaths");

const baseDir = process.env.FACTURAS_BASE_DIR || path.resolve(__dirname, "..", "..");
const documentPaths = resolveDocumentPaths(baseDir);
const recibidasDir = documentPaths.facturasRecibidasDir;
const salidaDir = path.join(__dirname, "salidas");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return { ok: true, data: JSON.parse(raw) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function isManifest(name) {
  return name.toLowerCase().endsWith(".manifest.json");
}

function isPdfSavedAs(name) {
  return /\.PDF\.\d+\.pdf$/i.test(name);
}
function isDocXmlSavedAs(name) {
  return /\.DOC\.\d+\.xml$/i.test(name);
}
function isRhXmlSavedAs(name) {
  return /\.RH\.\d+\.xml$/i.test(name);
}

function isLegacyXml(name) {
  if (!name.toLowerCase().endsWith(".xml")) return false;
  if (isDocXmlSavedAs(name)) return false;
  if (isRhXmlSavedAs(name)) return false;
  return true;
}

function main() {
  try {
    if (!fs.existsSync(recibidasDir)) {
      console.error("No existe carpeta recibidas:", recibidasDir);
      process.exit(1);
    }

    const files = fs.readdirSync(recibidasDir);
    const manifests = files.filter(isManifest);
    const referenced = new Set();
    const report = [];

    let totalMissing = 0;
    let totalErrors = 0;

    for (const manifestFile of manifests) {
      const manifestPath = path.join(recibidasDir, manifestFile);
      const entry = {
        manifest: manifestFile,
        ingestion_id: null,
        errors: [],
        missing: [],
      };

      const parsed = safeReadJson(manifestPath);
      if (!parsed.ok) {
        entry.errors.push(`JSON invalido: ${parsed.error}`);
        totalErrors += 1;
        report.push(entry);
        continue;
      }

      const data = parsed.data || {};
      entry.ingestion_id = data.ingestion_id || null;
      if (!entry.ingestion_id) {
        entry.errors.push("Falta ingestion_id");
        totalErrors += 1;
      }

      const attachments = Array.isArray(data.attachments_saved) ? data.attachments_saved : null;
      if (!attachments) {
        entry.errors.push("attachments_saved no es un arreglo");
        totalErrors += 1;
        report.push(entry);
        continue;
      }

      for (const a of attachments) {
        if (!a || !a.savedAs) continue;
        referenced.add(a.savedAs);
        const full = path.join(recibidasDir, a.savedAs);
        if (!fs.existsSync(full)) {
          entry.missing.push(a.savedAs);
          totalMissing += 1;
        }
      }

      if (entry.errors.length > 0 || entry.missing.length > 0) {
        report.push(entry);
      }
    }

    const orphanFiles = files.filter((f) => {
      if (isManifest(f)) return false;
      if (referenced.has(f)) return false;
      return isPdfSavedAs(f) || isDocXmlSavedAs(f) || isRhXmlSavedAs(f);
    });

    const legacyXmls = files.filter(isLegacyXml);

    console.log("=== REPORTE NO PROCESADOS ===");
    console.log(`Recibidas: ${recibidasDir}`);
    console.log(`Manifests en recibidas: ${manifests.length}`);
    console.log(`Manifests con error o faltantes: ${report.length}`);
    console.log(`Total errores: ${totalErrors}`);
    console.log(`Adjuntos faltantes: ${totalMissing}`);
    console.log(`Archivos huerfanos (no referenciados): ${orphanFiles.length}`);
    console.log(`XML legacy sueltos: ${legacyXmls.length}`);

    ensureDir(salidaDir);
    const outPath = path.join(salidaDir, "reporte_no_procesados.json");
    const payload = {
      recibidasDir,
      manifests: manifests.length,
      errores: totalErrors,
      faltantes: totalMissing,
      orphanFiles,
      legacyXmls,
      detalles: report,
    };
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
    console.log("Detalle guardado en:", outPath);
  } catch (err) {
    console.error("Error generando reporte:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
