const fs = require("fs");
const chokidar = require("chokidar");
const { procesarManifest } = require("./importarFacturaManifest");
const { runtimeConfig } = require("../config/runtime");
const { resolveDocumentPaths } = require("../utils/documentPaths");

// ==============================
// CONFIGURACION (MANIFEST)
// ==============================
const baseDir = runtimeConfig.storageBaseDir;
const documentPaths = resolveDocumentPaths(baseDir);
const carpetaEntrada = documentPaths.facturasRecibidasDir;
const carpetaProcesados = documentPaths.facturasProcesadasDir;

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

const {
  scanDebounceMs: SCAN_DEBOUNCE_MS,
  lateFilesDelayMs: LATE_FILES_DELAY_MS,
  awfStabilityMs: AWF_STABILITY_MS,
  awfPollMs: AWF_POLL_MS,
  scanDelayMs: SCAN_DELAY_MS,
} = runtimeConfig.watcher;

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
