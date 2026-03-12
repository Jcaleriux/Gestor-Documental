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

function parseSavedAsIndex(name, tipo) {
  const pattern =
    tipo === "PDF"
      ? /\.PDF\.(\d+)\.pdf$/i
      : (tipo === "DOC" ? /\.DOC\.(\d+)\.xml$/i : /\.RH\.(\d+)\.xml$/i);
  const match = String(name || "").match(pattern);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function buildAttachmentEntries(attachments, carpetaEntrada, { type, validator }) {
  return attachments
    .map((a) => ({
      savedAs: a && a.savedAs ? String(a.savedAs) : "",
      originalName: a && a.originalName ? String(a.originalName) : null
    }))
    .filter((a) => a.savedAs && validator(a.savedAs))
    .map((a) => ({
      ...a,
      index: parseSavedAsIndex(a.savedAs, type),
      filePath: path.join(carpetaEntrada, a.savedAs)
    }))
    .filter((a) => fs.existsSync(a.filePath))
    .sort((a, b) => {
      const ai = Number.isFinite(a.index) ? a.index : Number.MAX_SAFE_INTEGER;
      const bi = Number.isFinite(b.index) ? b.index : Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return a.savedAs.localeCompare(b.savedAs);
    });
}

function normalizeComparableText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function createPdfAssigner(pdfEntries) {
  const pdfsByIndex = new Map();
  const availablePdfPaths = new Set();

  for (const pdf of pdfEntries) {
    availablePdfPaths.add(pdf.filePath);
    if (Number.isFinite(pdf.index) && !pdfsByIndex.has(pdf.index)) {
      pdfsByIndex.set(pdf.index, pdf);
    }
  }

  const takePdfIfAvailable = (pdf) => {
    if (!pdf) return null;
    if (!availablePdfPaths.has(pdf.filePath)) return null;
    availablePdfPaths.delete(pdf.filePath);
    return pdf;
  };

  const assignByClave = (claveDoc) => {
    const claveNormalized = normalizeComparableText(claveDoc);
    if (!claveNormalized) return null;

    for (const pdf of pdfEntries) {
      if (!availablePdfPaths.has(pdf.filePath)) continue;
      const originalName = normalizeComparableText(pdf.originalName);
      const savedAs = normalizeComparableText(pdf.savedAs);
      if (
        (originalName && originalName.includes(claveNormalized)) ||
        (savedAs && savedAs.includes(claveNormalized))
      ) {
        return takePdfIfAvailable(pdf);
      }
    }
    return null;
  };

  return {
    assign(docEntry, claveDoc) {
      return (
        assignByClave(claveDoc) ||
        (Number.isFinite(docEntry.index) ? takePdfIfAvailable(pdfsByIndex.get(docEntry.index)) : null) ||
        takePdfIfAvailable(pdfEntries.find((pdf) => availablePdfPaths.has(pdf.filePath))) ||
        null
      );
    },
    getRemainingCount() {
      return availablePdfPaths.size;
    }
  };
}

async function procesarManifest(manifestPath, options = {}) {
  const baseDir = options.baseDir || process.env.FACTURAS_BASE_DIR || path.resolve(__dirname, "..", "..");
  const documentPaths = resolveDocumentPaths(baseDir);
  const carpetaEntrada = options.carpetaEntrada || documentPaths.facturasRecibidasDir;
  const carpetaProcesados = options.carpetaProcesados || documentPaths.facturasProcesadasDir;

  const manifest = safeReadJson(manifestPath);
  const ingestionId = manifest.ingestion_id;

  if (!ingestionId) {
    throw new Error("manifest.json sin ingestion_id");
  }

  const attachments = Array.isArray(manifest.attachments_saved) ? manifest.attachments_saved : [];

  const pdfEntries = buildAttachmentEntries(attachments, carpetaEntrada, {
    type: "PDF",
    validator: isPdfSavedAs
  });
  const docEntries = buildAttachmentEntries(attachments, carpetaEntrada, {
    type: "DOC",
    validator: isDocXmlSavedAs
  });
  const rhEntries = buildAttachmentEntries(attachments, carpetaEntrada, {
    type: "RH",
    validator: isRhXmlSavedAs
  });

  if (pdfEntries.length === 0 && docEntries.length === 0 && rhEntries.length === 0) {
    return null;
  }

  let receptorIdentificacion = null;
  let insertedAny = false;
  let duplicateAny = false;
  let missingAny = false;
  const pdfAssigner = createPdfAssigner(pdfEntries);

  if (docEntries.length > pdfEntries.length) {
    console.warn(
      `Manifest ${path.basename(manifestPath)}: hay ${docEntries.length} DOC y ${pdfEntries.length} PDF; algunos DOC quedaran sin PDF asociado.`
    );
  }

  for (const docEntry of docEntries) {
    const xmlPath = docEntry.filePath;
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
    const claveDoc = data && data.Clave ? String(data.Clave) : null;
    const assignedPdf = pdfAssigner.assign(docEntry, claveDoc);
    const assignedPdfName = assignedPdf ? path.basename(assignedPdf.filePath) : null;

    if (!assignedPdfName) {
      console.warn(`DOC sin PDF asociado en manifest ${path.basename(manifestPath)}: ${xmlFile}`);
    }

    const relXml = normalizarRuta(path.relative(baseDir, destinoXmlPath));
    const relPdf = assignedPdfName
      ? normalizarRuta(path.relative(baseDir, path.join(loteDir, assignedPdfName)))
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

  for (const rhEntry of rhEntries) {
    const xmlPath = rhEntry.filePath;
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

  if (pdfAssigner.getRemainingCount() > 0) {
    console.warn(
      `Manifest ${path.basename(manifestPath)}: quedaron ${pdfAssigner.getRemainingCount()} PDF sin asociar a un DOC.`
    );
  }

  if (receptorIdentificacion) {
    const loteDir = path.join(carpetaProcesados, receptorIdentificacion, ingestionId);
    const dupDir = path.join(carpetaProcesados, receptorIdentificacion, "duplicados", ingestionId);
    const sinSocDir = path.join(carpetaProcesados, "sin_sociedad", ingestionId);

    const targetDir = insertedAny ? loteDir : (duplicateAny ? dupDir : (missingAny ? sinSocDir : null));
    if (targetDir) {
      ensureDir(targetDir);
      for (const pdfEntry of pdfEntries) {
        const pdfPath = pdfEntry.filePath;
        const pdfFile = path.basename(pdfPath);
        const destinoPdfPath = path.join(targetDir, pdfFile);
        if (fs.existsSync(pdfPath)) {
          fse.moveSync(pdfPath, destinoPdfPath, { overwrite: true });
        }
      }
      if (insertedAny && duplicateAny) {
        ensureDir(dupDir);
        for (const pdfEntry of pdfEntries) {
          const pdfPath = pdfEntry.filePath;
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
        for (const pdfEntry of pdfEntries) {
          const pdfPath = pdfEntry.filePath;
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
    const recibidasDir = documentPaths.facturasRecibidasDir;
    const procesadasDir = documentPaths.facturasProcesadasDir;

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
