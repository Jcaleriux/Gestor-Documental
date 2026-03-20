const fs = require("fs");
const chokidar = require("chokidar");
const { procesarFacturaDesdeXML } = require("./importarFactura");
const { runtimeConfig } = require("../config/runtime");
const { resolveDocumentPaths } = require("../utils/documentPaths");

// ==============================
// CONFIGURACION
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

console.log("Watcher activo en:", carpetaEntrada);

// ==============================
// DEBOUNCE PARA EVITAR DOBLE PROCESO
// ==============================
let timer = null;

function scheduleScan() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => escanearCarpeta(), runtimeConfig.watcher.scanDebounceMs);
}

chokidar.watch(carpetaEntrada, { ignoreInitial: false }).on("add", (addedPath) => {
  if (!addedPath.toLowerCase().endsWith(".xml")) return;
  scheduleScan();
});

// ==============================
// ESCANEAR Y PROCESAR XML
// ==============================
function escanearCarpeta() {
  const archivos = fs.readdirSync(carpetaEntrada).filter((a) => a.toLowerCase().endsWith(".xml"));

  archivos.forEach((archivo) => {
    const rutaXML = path.join(carpetaEntrada, archivo);
    procesarFacturaDesdeXML(rutaXML, {
      baseDir,
      carpetaEntrada,
      carpetaProcesados,
    }).catch((err) => {
      console.error("Error procesando XML:", err.message);
    });
  });
}
