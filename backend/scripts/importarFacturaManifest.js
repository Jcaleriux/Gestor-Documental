const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");
const { parseXML } = require("../utils/xmlParser");
const { resolveDocumentPaths } = require("../utils/documentPaths");
const {
  insertarFactura,
  insertarTiqueteElectronico,
  insertarMensajeHacienda,
  insertarNotaCredito,
} = require("../services/factura.service");

function normalizarRuta(relPath) {
  return relPath.replace(/\\/g, "/");
}

function obtenerReceptorIdentificacion(tipo, data) {
  if (
    tipo === "FacturaElectronica" ||
    tipo === "NotaCreditoElectronica" ||
    tipo === "NotaDebitoElectronica" ||
    tipo === "TiqueteElectronico" ||
    tipo === "FacturaCompra"
  ) {
    return data && data.Receptor && data.Receptor.Identificacion && data.Receptor.Identificacion.Numero
      ? String(data.Receptor.Identificacion.Numero)
      : null;
  }
  if (tipo === "MensajeHacienda") {
    return data && data.NumeroCedulaReceptor ? String(data.NumeroCedulaReceptor) : null;
  }
  return null;
}

function safeReadJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function parseXmlFile(xmlPath) {
  const xml = fs.readFileSync(xmlPath, "utf8");
  return parseXML(xml);
}

// <ingestion_id>.PDF.1.pdf, <ingestion_id>.DOC.1.xml, <ingestion_id>.RH.1.xml
function isPdfSavedAs(name) {
  return /\.PDF\.\d+\.pdf$/i.test(name);
}
function isDocXmlSavedAs(name) {
  return /\.DOC\.\d+\.xml$/i.test(name);
}
function isRhXmlSavedAs(name) {
  return /\.RH\.\d+\.xml$/i.test(name);
}

async function procesarManifest(manifestPath, options = {}) {
  const baseDir = options.baseDir || process.env.FACTURAS_BASE_DIR || path.resolve(__dirname, "..", "..");
  const documentPaths = resolveDocumentPaths(baseDir);
  const carpetaEntrada = options.carpetaEntrada || (
    fs.existsSync(documentPaths.legacyFacturasRecibidasDir)
      ? documentPaths.legacyFacturasRecibidasDir
      : documentPaths.facturasRecibidasDir
  );
  const carpetaProcesados = options.carpetaProcesados || (
    fs.existsSync(documentPaths.legacyFacturasProcesadasDir)
      ? documentPaths.legacyFacturasProcesadasDir
      : documentPaths.facturasProcesadasDir
  );

  const manifest = safeReadJson(manifestPath);
  const ingestionId = manifest.ingestion_id;

  if (!ingestionId) {
    throw new Error("manifest.json sin ingestion_id");
  }

  const attachments = Array.isArray(manifest.attachments_saved) ? manifest.attachments_saved : [];

  const pdfs = attachments
    .map((a) => a.savedAs)
    .filter((n) => n && isPdfSavedAs(n))
    .map((n) => path.join(carpetaEntrada, n))
    .filter((p) => fs.existsSync(p));

  const docXmls = attachments
    .map((a) => a.savedAs)
    .filter((n) => n && isDocXmlSavedAs(n))
    .map((n) => path.join(carpetaEntrada, n))
    .filter((p) => fs.existsSync(p));

  const rhXmls = attachments
    .map((a) => a.savedAs)
    .filter((n) => n && isRhXmlSavedAs(n))
    .map((n) => path.join(carpetaEntrada, n))
    .filter((p) => fs.existsSync(p));

  if (pdfs.length === 0 && docXmls.length === 0 && rhXmls.length === 0) {
    return null;
  }

  let receptorIdentificacion = null;
  let insertedAny = false;
  let duplicateAny = false;
  let missingAny = false;
  const pdfPrincipal = pdfs.length > 0 ? pdfs[0] : null;
  const pdfPrincipalName = pdfPrincipal ? path.basename(pdfPrincipal) : null;

  for (const xmlPath of docXmls) {
    const { tipo, data } = parseXmlFile(xmlPath);

    const receptor = obtenerReceptorIdentificacion(tipo, data);
    if (!receptor) {
      console.log(`DOC sin receptor identificable: ${tipo} (${xmlPath})`);
      continue;
    }

    receptorIdentificacion = receptor;

    const loteDir = path.join(carpetaProcesados, receptorIdentificacion, ingestionId);
    const dupDir = path.join(carpetaProcesados, receptorIdentificacion, "duplicados", ingestionId);
    const sinSocDir = path.join(carpetaProcesados, "sin_sociedad", ingestionId);

    const xmlFile = path.basename(xmlPath);
    const destinoXmlPath = path.join(loteDir, xmlFile);

    const relXml = normalizarRuta(path.relative(baseDir, destinoXmlPath));
    const relPdf = pdfPrincipalName
      ? normalizarRuta(path.relative(baseDir, path.join(loteDir, pdfPrincipalName)))
      : null;

    let resultado = { status: "inserted", id: null };
    if (tipo === "FacturaElectronica") {
      resultado = await insertarFactura(data, relXml, relPdf);
    } else if (tipo === "NotaCreditoElectronica") {
      resultado = await insertarNotaCredito(data, relXml, relPdf);
    } else if (tipo === "TiqueteElectronico") {
      resultado = await insertarTiqueteElectronico(data, relXml, relPdf);
    } else {
      console.log(`Tipo DOC no insertado en DB (solo guardado): ${tipo}`);
      resultado = { status: "skipped", id: null };
    }

    if (resultado.status === "inserted") {
      insertedAny = true;
      ensureDir(loteDir);
      fse.moveSync(xmlPath, destinoXmlPath, { overwrite: true });
    } else if (resultado.status === "duplicate") {
      duplicateAny = true;
      ensureDir(dupDir);
      const dupXmlPath = path.join(dupDir, xmlFile);
      fse.moveSync(xmlPath, dupXmlPath, { overwrite: true });
    } else if (resultado.status === "sociedad_missing") {
      missingAny = true;
      ensureDir(sinSocDir);
      const sinXmlPath = path.join(sinSocDir, xmlFile);
      fse.moveSync(xmlPath, sinXmlPath, { overwrite: true });
    } else if (resultado.status === "skipped") {
      insertedAny = true;
      ensureDir(loteDir);
      fse.moveSync(xmlPath, destinoXmlPath, { overwrite: true });
    }
  }

  for (const xmlPath of rhXmls) {
    const { tipo, data } = parseXmlFile(xmlPath);

    const receptor = obtenerReceptorIdentificacion(tipo, data);
    receptorIdentificacion = receptorIdentificacion || receptor;

    if (!receptorIdentificacion) {
      console.log(`RH sin receptor identificable: ${tipo} (${xmlPath})`);
      continue;
    }

    const loteDir = path.join(carpetaProcesados, receptorIdentificacion, ingestionId);
    const dupDir = path.join(carpetaProcesados, receptorIdentificacion, "duplicados", ingestionId);
    const sinSocDir = path.join(carpetaProcesados, "sin_sociedad", ingestionId);

    const xmlFile = path.basename(xmlPath);
    const destinoXmlPath = path.join(loteDir, xmlFile);

    const relXml = normalizarRuta(path.relative(baseDir, destinoXmlPath));
    const relPdf = pdfPrincipalName
      ? normalizarRuta(path.relative(baseDir, path.join(loteDir, pdfPrincipalName)))
      : null;

    let resultado = { status: "inserted", id: null };
    if (tipo === "MensajeHacienda") {
      resultado = await insertarMensajeHacienda(data, relXml);
    } else {
      console.log(`Tipo RH no esperado: ${tipo} (${xmlPath})`);
      resultado = { status: "skipped", id: null };
    }

    if (resultado.status === "inserted") {
      insertedAny = true;
      ensureDir(loteDir);
      fse.moveSync(xmlPath, destinoXmlPath, { overwrite: true });
    } else if (resultado.status === "duplicate") {
      duplicateAny = true;
      ensureDir(dupDir);
      const dupXmlPath = path.join(dupDir, xmlFile);
      fse.moveSync(xmlPath, dupXmlPath, { overwrite: true });
    } else if (resultado.status === "sociedad_missing") {
      missingAny = true;
      ensureDir(sinSocDir);
      const sinXmlPath = path.join(sinSocDir, xmlFile);
      fse.moveSync(xmlPath, sinXmlPath, { overwrite: true });
    } else if (resultado.status === "skipped") {
      insertedAny = true;
      ensureDir(loteDir);
      fse.moveSync(xmlPath, destinoXmlPath, { overwrite: true });
    }
  }

  if (receptorIdentificacion) {
    const loteDir = path.join(carpetaProcesados, receptorIdentificacion, ingestionId);
    const dupDir = path.join(carpetaProcesados, receptorIdentificacion, "duplicados", ingestionId);
    const sinSocDir = path.join(carpetaProcesados, "sin_sociedad", ingestionId);

    const targetDir = insertedAny ? loteDir : (duplicateAny ? dupDir : (missingAny ? sinSocDir : null));
    if (targetDir) {
      ensureDir(targetDir);
      for (const pdfPath of pdfs) {
        const pdfFile = path.basename(pdfPath);
        const destinoPdfPath = path.join(targetDir, pdfFile);
        if (fs.existsSync(pdfPath)) {
          fse.moveSync(pdfPath, destinoPdfPath, { overwrite: true });
        }
      }
      if (insertedAny && duplicateAny) {
        ensureDir(dupDir);
        for (const pdfPath of pdfs) {
          const pdfFile = path.basename(pdfPath);
          const sourcePdfPath = path.join(targetDir, pdfFile);
          const dupPdfPath = path.join(dupDir, pdfFile);
          if (fs.existsSync(sourcePdfPath)) {
            fse.copySync(sourcePdfPath, dupPdfPath, { overwrite: true });
          }
        }
      }
      if (missingAny && targetDir !== sinSocDir) {
        ensureDir(sinSocDir);
        for (const pdfPath of pdfs) {
          const pdfFile = path.basename(pdfPath);
          const sourcePdfPath = path.join(targetDir, pdfFile);
          const sinPdfPath = path.join(sinSocDir, pdfFile);
          if (fs.existsSync(sourcePdfPath)) {
            fse.copySync(sourcePdfPath, sinPdfPath, { overwrite: true });
          }
        }
      }
      const manifestFile = path.basename(manifestPath);
      const destinoManifest = path.join(targetDir, manifestFile);
      if (fs.existsSync(manifestPath)) {
        fse.moveSync(manifestPath, destinoManifest, { overwrite: true });
      }
      if (insertedAny && duplicateAny) {
        ensureDir(dupDir);
        const dupManifest = path.join(dupDir, manifestFile);
        if (fs.existsSync(destinoManifest)) {
          fse.copySync(destinoManifest, dupManifest, { overwrite: true });
        }
      }
      if (missingAny && targetDir !== sinSocDir) {
        ensureDir(sinSocDir);
        const sinManifest = path.join(sinSocDir, manifestFile);
        if (fs.existsSync(destinoManifest)) {
          fse.copySync(destinoManifest, sinManifest, { overwrite: true });
        }
      }
    }

    return receptorIdentificacion;
  }

  return null;
}

// CLI: procesar manifests existentes en carpeta recibidas
async function main() {
  try {
    const baseDir = process.env.FACTURAS_BASE_DIR || path.resolve(__dirname, "..", "..");
    const documentPaths = resolveDocumentPaths(baseDir);
    const recibidasDir = fs.existsSync(documentPaths.legacyFacturasRecibidasDir)
      ? documentPaths.legacyFacturasRecibidasDir
      : documentPaths.facturasRecibidasDir;
    const procesadasDir = fs.existsSync(documentPaths.legacyFacturasProcesadasDir)
      ? documentPaths.legacyFacturasProcesadasDir
      : documentPaths.facturasProcesadasDir;

    ensureDir(procesadasDir);

    const manifests = fs.readdirSync(recibidasDir).filter((f) => f.toLowerCase().endsWith(".manifest.json"));

    for (const m of manifests) {
      const manifestPath = path.join(recibidasDir, m);
      await procesarManifest(manifestPath, {
        baseDir,
        carpetaEntrada: recibidasDir,
        carpetaProcesados: procesadasDir,
      });
    }

    console.log("Procesamiento de manifests completado.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { procesarManifest };
