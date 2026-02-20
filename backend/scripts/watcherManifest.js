const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const { procesarManifest } = require("./importarFacturaManifest");
const { resolveDocumentPaths } = require("../utils/documentPaths");

// ==============================
// CONFIGURACION (MANIFEST)
// ==============================
const baseDir = process.env.FACTURAS_BASE_DIR || path.resolve(__dirname, "..", "..");
const documentPaths = resolveDocumentPaths(baseDir);
const carpetaEntrada = fs.existsSync(documentPaths.legacyFacturasRecibidasDir)
  ? documentPaths.legacyFacturasRecibidasDir
  : documentPaths.facturasRecibidasDir;
const carpetaProcesados = fs.existsSync(documentPaths.legacyFacturasProcesadasDir)
  ? documentPaths.legacyFacturasProcesadasDir
  : documentPaths.facturasProcesadasDir;

if (!fs.existsSync(carpetaEntrada)) {
  fs.mkdirSync(carpetaEntrada, { recursive: true });
}
if (!fs.existsSync(carpetaProcesados)) {
  fs.mkdirSync(carpetaProcesados, { recursive: true });
}

console.log("Watcher manifest activo en:", carpetaEntrada);

// ==============================
// DEBOUNCE + ESPERA POR ARCHIVOS TARDIOS
// ==============================
let timer = null;
let scanning = false;

const toNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const SCAN_DEBOUNCE_MS = toNumber(process.env.WATCHER_SCAN_DEBOUNCE_MS, 600);
const LATE_FILES_DELAY_MS = toNumber(process.env.WATCHER_LATE_FILES_DELAY_MS, 2000);
const AWF_STABILITY_MS = toNumber(process.env.WATCHER_AWF_STABILITY_MS, 2000);
const AWF_POLL_MS = toNumber(process.env.WATCHER_AWF_POLL_MS, 100);
const SCAN_DELAY_MS = SCAN_DEBOUNCE_MS + LATE_FILES_DELAY_MS;

function scheduleScan() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => escanearManifests(), SCAN_DELAY_MS);
}

chokidar
  .watch(carpetaEntrada, {
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: AWF_STABILITY_MS,
      pollInterval: AWF_POLL_MS,
    },
  })
  .on("add", () => {
    scheduleScan();
  });

// ==============================
// ESCANEAR Y PROCESAR MANIFESTS
// ==============================
async function escanearManifests() {
  if (scanning) return;
  scanning = true;
  try {
    const manifests = fs
      .readdirSync(carpetaEntrada)
      .filter((f) => f.toLowerCase().endsWith(".manifest.json"));

    for (const file of manifests) {
      const manifestPath = path.join(carpetaEntrada, file);
      try {
        await procesarManifest(manifestPath, {
          baseDir,
          carpetaEntrada,
          carpetaProcesados,
        });
      } catch (err) {
        console.error("Error procesando manifest:", file, "-", err.message);
      }
    }
  } finally {
    scanning = false;
  }
}
