const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const { procesarFacturaDesdeXML } = require("./importarFactura");
const { resolveDocumentPaths } = require("../utils/documentPaths");

// ==============================
// CONFIGURACION
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

console.log("Watcher activo en:", carpetaEntrada);

// ==============================
// DEBOUNCE PARA EVITAR DOBLE PROCESO
// ==============================
let timer = null;

function scheduleScan() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => escanearCarpeta(), 600);
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
