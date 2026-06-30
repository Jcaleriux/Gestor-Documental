const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");
const { PDFParse } = require("pdf-parse");
const { runtimeConfig } = require("../config/runtime");
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

async function extractTextFromPdf(pdfPath) {
  try {
    const parser = new PDFParse({ data: fs.readFileSync(pdfPath) });
    const parsed = await parser.getText();
    return parsed && parsed.text ? String(parsed.text) : "";
  } catch (error) {
    return "";
  }
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

function getComparableTokens(value) {
  return String(value || "")
    .toLowerCase()
    .match(/[a-z0-9]+/g) || [];
}

function stripLeadingZeros(value) {
  const stripped = String(value || "").replace(/^0+/, "");
  return stripped || String(value || "");
}

function buildDocumentNumberHints(numeroConsecutivo) {
  const digits = String(numeroConsecutivo || "").replace(/\D/g, "");
  if (!digits) return [];

  const hints = new Set();
  hints.add(digits);
  hints.add(stripLeadingZeros(digits));

  const suffixLengths = [10, 8, 6, 4, 3];

  for (const length of suffixLengths) {
    if (digits.length < length) continue;
    const hint = stripLeadingZeros(digits.slice(-length));
    if (hint.length >= 3) {
      hints.add(hint);
    }
  }

  return [...hints];
}

function getPdfSearchText(pdf) {
  return `${pdf.originalName || ""} ${pdf.savedAs || ""} ${pdf.pdfText || ""}`;
}

function pdfMatchesDocumentNumber(pdf, numeroConsecutivo) {
  const hints = buildDocumentNumberHints(numeroConsecutivo);
  if (hints.length === 0) return false;

  const tokens = getComparableTokens(getPdfSearchText(pdf));

  return hints.some((hint) => tokens.includes(hint));
}

function pdfMatchesReceptor(pdf, receptorIdentificacion) {
  const receptor = normalizeComparableText(receptorIdentificacion);
  if (!receptor) return false;

  const haystack = normalizeComparableText(getPdfSearchText(pdf));
  return haystack.includes(receptor);
}

function createPdfAssigner(pdfEntries, { allowSinglePdfFallback = false } = {}) {
  const availablePdfPaths = new Set();

  for (const pdf of pdfEntries) {
    availablePdfPaths.add(pdf.filePath);
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
      const haystack = normalizeComparableText(getPdfSearchText(pdf));
      if (haystack.includes(claveNormalized)) {
        return takePdfIfAvailable(pdf);
      }
    }
    return null;
  };

  const assignByDocumentNumber = ({ numeroConsecutivo, receptorIdentificacion }) => {
    const matches = pdfEntries.filter((pdf) => (
      availablePdfPaths.has(pdf.filePath) &&
      pdfMatchesDocumentNumber(pdf, numeroConsecutivo)
    ));

    if (matches.length === 0) return null;
    if (matches.length === 1) return takePdfIfAvailable(matches[0]);

    const receptorMatches = matches.filter((pdf) => pdfMatchesReceptor(pdf, receptorIdentificacion));
    return receptorMatches.length === 1
      ? takePdfIfAvailable(receptorMatches[0])
      : null;
  };

  return {
    assign({ claveDoc, numeroConsecutivo, receptorIdentificacion }) {
      return (
        assignByClave(claveDoc) ||
        assignByDocumentNumber({ numeroConsecutivo, receptorIdentificacion }) ||
        (allowSinglePdfFallback
          ? takePdfIfAvailable(pdfEntries.find((pdf) => availablePdfPaths.has(pdf.filePath)))
          : null) ||
        null
      );
    },
    getRemainingCount() {
      return availablePdfPaths.size;
    },
    getRemainingEntries() {
      return pdfEntries.filter((pdf) => availablePdfPaths.has(pdf.filePath));
    }
  };
}

async function attachPdfText(pdfEntries, extractPdfText = extractTextFromPdf) {
  const withText = [];

  for (const pdf of pdfEntries) {
    withText.push({
      ...pdf,
      pdfText: await extractPdfText(pdf.filePath)
    });
  }

  return withText;
}

function buildProcessingDirs(carpetaProcesados, receptorIdentificacion, ingestionId) {
  return {
    loteDir: path.join(carpetaProcesados, receptorIdentificacion, ingestionId),
    dupDir: path.join(carpetaProcesados, receptorIdentificacion, "duplicados", ingestionId),
    sinSocDir: path.join(carpetaProcesados, "sin_sociedad", ingestionId)
  };
}

function getTargetDirForStatus(status, dirs) {
  if (status === "inserted" || status === "skipped") return dirs.loteDir;
  if (status === "duplicate") return dirs.dupDir;
  if (status === "sociedad_missing") return dirs.sinSocDir;
  return null;
}

function moveFileToDirIfExists(filePath, targetDir) {
  if (!filePath || !targetDir || !fs.existsSync(filePath)) return null;

  ensureDir(targetDir);
  const targetPath = path.join(targetDir, path.basename(filePath));
  fse.moveSync(filePath, targetPath, { overwrite: true });
  return targetPath;
}

function moveManifestToTargetDirs(manifestPath, targetDirs) {
  const dirs = [...targetDirs].filter(Boolean);
  if (dirs.length === 0 || !fs.existsSync(manifestPath)) return;

  const manifestFile = path.basename(manifestPath);
  const [primaryDir, ...copyDirs] = dirs;
  ensureDir(primaryDir);
  const primaryManifestPath = path.join(primaryDir, manifestFile);
  fse.moveSync(manifestPath, primaryManifestPath, { overwrite: true });

  for (const targetDir of copyDirs) {
    ensureDir(targetDir);
    fse.copySync(primaryManifestPath, path.join(targetDir, manifestFile), { overwrite: true });
  }
}

function buildPendingPdfDir(carpetaProcesados, ingestionId) {
  return path.join(carpetaProcesados, "pdfs_pendientes", ingestionId);
}

function movePendingPdfEntries({ pdfEntries, carpetaProcesados, ingestionId, baseDir, targetDirs }) {
  if (pdfEntries.length === 0) return null;

  const pendingDir = buildPendingPdfDir(carpetaProcesados, ingestionId);
  ensureDir(pendingDir);

  const moved = pdfEntries.map((pdf) => {
    const targetPath = path.join(pendingDir, path.basename(pdf.filePath));
    if (fs.existsSync(pdf.filePath)) {
      fse.moveSync(pdf.filePath, targetPath, { overwrite: true });
    }

    return {
      savedAs: pdf.savedAs,
      originalName: pdf.originalName,
      ruta: normalizarRuta(path.relative(baseDir, targetPath)),
      motivo: "PDF sin asociacion confiable con DOC/XML"
    };
  });

  const reportPath = path.join(pendingDir, `${ingestionId}.pdfs_pendientes.json`);
  fs.writeFileSync(
    reportPath,
    JSON.stringify({
      ingestion_id: ingestionId,
      motivo: "Hay PDFs sin asociacion confiable. Requieren revision manual.",
      target_dirs: [...targetDirs].map((targetDir) => normalizarRuta(path.relative(baseDir, targetDir))),
      pdfs: moved
    }, null, 2)
  );

  return pendingDir;
}

async function procesarManifest(manifestPath, options = {}) {
  const baseDir = options.baseDir || runtimeConfig.storageBaseDir;
  const documentPaths = resolveDocumentPaths(baseDir);
  const carpetaEntrada = options.carpetaEntrada || documentPaths.facturasRecibidasDir;
  const carpetaProcesados = options.carpetaProcesados || documentPaths.facturasProcesadasDir;

  const manifest = safeReadJson(manifestPath);
  const ingestionId = manifest.ingestion_id;

  if (!ingestionId) {
    throw new Error("manifest.json sin ingestion_id");
  }

  const attachments = Array.isArray(manifest.attachments_saved) ? manifest.attachments_saved : [];

  const pdfEntries = await attachPdfText(buildAttachmentEntries(attachments, carpetaEntrada, {
    type: "PDF",
    validator: isPdfSavedAs
  }), options.extractPdfText);
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
  const pdfAssigner = createPdfAssigner(pdfEntries, {
    allowSinglePdfFallback: docEntries.length === 1 && pdfEntries.length === 1
  });
  const targetDirs = new Set();

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

    const dirs = buildProcessingDirs(carpetaProcesados, receptorIdentificacion, ingestionId);

    const xmlFile = path.basename(xmlPath);
    const destinoXmlPath = path.join(dirs.loteDir, xmlFile);
    const claveDoc = data && data.Clave ? String(data.Clave) : null;
    const assignedPdf = pdfAssigner.assign({
      claveDoc,
      numeroConsecutivo: data && data.NumeroConsecutivo,
      receptorIdentificacion
    });
    const assignedPdfName = assignedPdf ? path.basename(assignedPdf.filePath) : null;

    if (!assignedPdfName) {
      console.warn(`DOC sin PDF asociado en manifest ${path.basename(manifestPath)}: ${xmlFile}`);
    }

    const relXml = normalizarRuta(path.relative(baseDir, destinoXmlPath));
    const relPdf = assignedPdfName
      ? normalizarRuta(path.relative(baseDir, path.join(dirs.loteDir, assignedPdfName)))
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

    const targetDir = getTargetDirForStatus(resultado.status, dirs);
    if (targetDir) {
      targetDirs.add(targetDir);
      moveFileToDirIfExists(xmlPath, targetDir);
      moveFileToDirIfExists(assignedPdf && assignedPdf.filePath, targetDir);
    }
  }

  for (const rhEntry of rhEntries) {
    const xmlPath = rhEntry.filePath;
    const { tipo, data } = parseXmlFile(xmlPath);

    const receptor = obtenerReceptorIdentificacion(tipo, data);

    if (!receptor) {
      console.log(`RH sin receptor identificable: ${tipo} (${xmlPath})`);
      continue;
    }

    receptorIdentificacion = receptor;
    const dirs = buildProcessingDirs(carpetaProcesados, receptorIdentificacion, ingestionId);

    const xmlFile = path.basename(xmlPath);
    const destinoXmlPath = path.join(dirs.loteDir, xmlFile);

    const relXml = normalizarRuta(path.relative(baseDir, destinoXmlPath));

    let resultado = { status: "inserted", id: null };
    if (tipo === "MensajeHacienda") {
      resultado = await insertarMensajeHacienda(data, relXml);
    } else {
      console.log(`Tipo RH no esperado: ${tipo} (${xmlPath})`);
      resultado = { status: "skipped", id: null };
    }

    const targetDir = getTargetDirForStatus(resultado.status, dirs);
    if (targetDir) {
      targetDirs.add(targetDir);
      moveFileToDirIfExists(xmlPath, targetDir);
    }
  }

  if (pdfAssigner.getRemainingCount() > 0) {
    console.warn(
      `Manifest ${path.basename(manifestPath)}: quedaron ${pdfAssigner.getRemainingCount()} PDF pendientes de asociacion manual.`
    );
  }

  const pendingDir = movePendingPdfEntries({
    pdfEntries: pdfAssigner.getRemainingEntries(),
    carpetaProcesados,
    ingestionId,
    baseDir,
    targetDirs
  });

  if (pendingDir) {
    targetDirs.add(pendingDir);
  }

  if (targetDirs.size > 0) {
    moveManifestToTargetDirs(manifestPath, targetDirs);
    return receptorIdentificacion;
  }

  return null;
}

// CLI: procesar manifests existentes en carpeta recibidas
async function main() {
  try {
    const baseDir = runtimeConfig.storageBaseDir;
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
