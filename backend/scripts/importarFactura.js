const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");
const pool = require("../db");
const { parseXML } = require("../utils/xmlParser");
const { resolveDocumentPaths } = require("../utils/documentPaths");
const {
  insertarFactura,
  insertarTiqueteElectronico,
  insertarMensajeHacienda,
  insertarNotaCredito
} = require("../services/factura.service");

const DOCUMENT_TYPE_STRATEGIES = Object.freeze({
  FacturaElectronica: Object.freeze({
    table: "facturas",
    getReceptorIdentificacion: (data) => String(data.Receptor.Identificacion.Numero),
    persistRecord: ({ data, relXml, relPdf }) => insertarFactura(data, relXml, relPdf)
  }),
  NotaCreditoElectronica: Object.freeze({
    table: "notas_credito",
    getReceptorIdentificacion: (data) => String(data.Receptor.Identificacion.Numero),
    persistRecord: ({ data, relXml, relPdf }) => insertarNotaCredito(data, relXml, relPdf)
  }),
  TiqueteElectronico: Object.freeze({
    table: "tiquetes_electronicos",
    getReceptorIdentificacion: (data) => String(data.Receptor.Identificacion.Numero),
    persistRecord: ({ data, relXml, relPdf }) => insertarTiqueteElectronico(data, relXml, relPdf)
  }),
  MensajeHacienda: Object.freeze({
    table: "mensajes_hacienda",
    getReceptorIdentificacion: (data) => String(data.NumeroCedulaReceptor),
    persistRecord: ({ data, relXml }) => insertarMensajeHacienda(data, relXml)
  })
});

const STATUS_MOVE_BUILDERS = Object.freeze({
  inserted: ({
    xmlPath,
    destinoXmlPath,
    pdfSource,
    destinoPdfPath
  }) => {
    const operations = [{ from: xmlPath, to: destinoXmlPath }];
    if (destinoPdfPath && fs.existsSync(pdfSource)) {
      operations.push({ from: pdfSource, to: destinoPdfPath });
    }
    return operations;
  },
  duplicate: ({
    xmlPath,
    xmlFile,
    pdfSource,
    pdfFile,
    dupDir
  }) => {
    const operations = [{ from: xmlPath, to: path.join(dupDir, xmlFile) }];
    if (fs.existsSync(pdfSource)) {
      operations.push({ from: pdfSource, to: path.join(dupDir, pdfFile) });
    }
    return operations;
  },
  sociedad_missing: ({
    xmlPath,
    xmlFile,
    pdfSource,
    pdfFile,
    sinSocDir
  }) => {
    const operations = [{ from: xmlPath, to: path.join(sinSocDir, xmlFile) }];
    if (fs.existsSync(pdfSource)) {
      operations.push({ from: pdfSource, to: path.join(sinSocDir, pdfFile) });
    }
    return operations;
  }
});

function resolveDocumentStrategy(tipo) {
  return DOCUMENT_TYPE_STRATEGIES[tipo] || null;
}

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

function obtenerIngestionId(xmlFile, data) {
  let id = data && data.Clave ? String(data.Clave) : obtenerBaseNombre(xmlFile);
  id = (id || "").trim();
  if (!id) {
    id = `legacy-${Date.now()}`;
  }
  return id.replace(/[^\w.-]/g, "_");
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolveDirectories(options = {}) {
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

  return {
    baseDir,
    carpetaEntrada,
    carpetaProcesados
  };
}

function parseXmlDocument(xmlPath) {
  const xml = fs.readFileSync(xmlPath, "utf8");
  const { tipo, data } = parseXML(xml);
  const strategy = resolveDocumentStrategy(tipo);
  const receptorIdentificacion = strategy ? strategy.getReceptorIdentificacion(data) : null;
  const xmlFile = path.basename(xmlPath);
  const baseName = obtenerBaseNombre(xmlFile);
  const pdfFile = `${baseName}.pdf`;
  const ingestionId = obtenerIngestionId(xmlFile, data);

  return {
    strategy,
    tipo,
    data,
    receptorIdentificacion,
    xmlFile,
    pdfFile,
    ingestionId
  };
}

function buildRoutingContext({
  baseDir,
  carpetaEntrada,
  carpetaProcesados,
  receptorIdentificacion,
  ingestionId,
  xmlFile,
  pdfFile
}) {
  const pdfSource = path.join(carpetaEntrada, pdfFile);
  const loteDir = path.join(carpetaProcesados, receptorIdentificacion, ingestionId);
  const dupDir = path.join(carpetaProcesados, receptorIdentificacion, "duplicados", ingestionId);
  const sinSocDir = path.join(carpetaProcesados, "sin_sociedad", ingestionId);
  const destinoXmlPath = path.join(loteDir, xmlFile);
  const pdfAlready = path.join(loteDir, pdfFile);
  const destinoPdfPath = fs.existsSync(pdfSource)
    ? path.join(loteDir, pdfFile)
    : (fs.existsSync(pdfAlready) ? pdfAlready : null);

  return {
    pdfSource,
    loteDir,
    dupDir,
    sinSocDir,
    destinoXmlPath,
    destinoPdfPath,
    relXml: normalizarRuta(path.relative(baseDir, destinoXmlPath)),
    relPdf: destinoPdfPath ? normalizarRuta(path.relative(baseDir, destinoPdfPath)) : null
  };
}

async function persistDocumentRecord({ strategy, data, relXml, relPdf }) {
  if (!strategy) {
    return { status: "ignored", id: null };
  }
  return strategy.persistRecord({ data, relXml, relPdf });
}

function buildMoveOperations({
  status,
  xmlPath,
  xmlFile,
  pdfSource,
  pdfFile,
  destinoXmlPath,
  destinoPdfPath,
  dupDir,
  sinSocDir
}) {
  const buildOperations = STATUS_MOVE_BUILDERS[status];
  if (!buildOperations) {
    return [];
  }

  return buildOperations({
    xmlPath,
    xmlFile,
    pdfSource,
    pdfFile,
    destinoXmlPath,
    destinoPdfPath,
    dupDir,
    sinSocDir
  });
}

function executeMoveOperations(operations) {
  const applied = [];
  try {
    operations.forEach(({ from, to }) => {
      ensureDir(path.dirname(to));
      fse.moveSync(from, to, { overwrite: true });
      applied.push({ from, to });
    });
  } catch (error) {
    for (let index = applied.length - 1; index >= 0; index -= 1) {
      const { from, to } = applied[index];
      try {
        if (fs.existsSync(to)) {
          ensureDir(path.dirname(from));
          fse.moveSync(to, from, { overwrite: true });
        }
      } catch (rollbackError) {
        console.error(`No se pudo revertir movimiento ${to} -> ${from}: ${rollbackError.message}`);
      }
    }
    throw error;
  }
}

async function rollbackPersistedRecord({ strategy, resultado }) {
  if (!resultado || resultado.status !== "inserted" || !resultado.id) {
    return;
  }

  const table = strategy?.table;
  if (!table) {
    return;
  }

  try {
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [resultado.id]);
  } catch (error) {
    console.error(`No se pudo hacer rollback de ${table}(${resultado.id}): ${error.message}`);
  }
}

async function procesarFacturaDesdeXML(xmlPath, options = {}) {
  const { baseDir, carpetaEntrada, carpetaProcesados } = resolveDirectories(options);
  const parsedDocument = parseXmlDocument(xmlPath);

  if (!parsedDocument.receptorIdentificacion) {
    console.log(`Tipo desconocido: ${parsedDocument.tipo} para ${xmlPath}`);
    return null;
  }

  const routing = buildRoutingContext({
    baseDir,
    carpetaEntrada,
    carpetaProcesados,
    receptorIdentificacion: parsedDocument.receptorIdentificacion,
    ingestionId: parsedDocument.ingestionId,
    xmlFile: parsedDocument.xmlFile,
    pdfFile: parsedDocument.pdfFile
  });

  const resultado = await persistDocumentRecord({
    strategy: parsedDocument.strategy,
    data: parsedDocument.data,
    relXml: routing.relXml,
    relPdf: routing.relPdf
  });

  try {
    const operations = buildMoveOperations({
      status: resultado.status,
      xmlPath,
      xmlFile: parsedDocument.xmlFile,
      pdfSource: routing.pdfSource,
      pdfFile: parsedDocument.pdfFile,
      destinoXmlPath: routing.destinoXmlPath,
      destinoPdfPath: routing.destinoPdfPath,
      dupDir: routing.dupDir,
      sinSocDir: routing.sinSocDir
    });
    executeMoveOperations(operations);
  } catch (moveError) {
    await rollbackPersistedRecord({
      strategy: parsedDocument.strategy,
      resultado
    });
    throw moveError;
  }

  return parsedDocument.receptorIdentificacion;
}

async function main() {
  try {
    const { baseDir, carpetaEntrada, carpetaProcesados } = resolveDirectories();
    ensureDir(carpetaProcesados);

    const archivos = fs.readdirSync(carpetaEntrada).filter((f) => f.toLowerCase().endsWith(".xml"));

    for (const archivo of archivos) {
      const xmlPath = path.join(carpetaEntrada, archivo);
      await procesarFacturaDesdeXML(xmlPath, {
        baseDir,
        carpetaEntrada,
        carpetaProcesados
      });
    }

    console.log("Procesamiento completado.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { procesarFacturaDesdeXML };
