const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { parseXML } = require("../utils/xmlParser");
const { resolveDocumentPaths } = require("../utils/documentPaths");

const baseDir = process.env.FACTURAS_BASE_DIR || path.resolve(__dirname, "..", "..");
const documentPaths = resolveDocumentPaths(baseDir);
const procesadasDir = documentPaths.facturasProcesadasDir;
const salidaDir = path.join(__dirname, "salidas");

function listarXmls(dir) {
  const resultados = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      resultados.push(...listarXmls(full));
    } else if (item.isFile() && item.name.toLowerCase().endsWith(".xml")) {
      resultados.push(full);
    }
  }
  return resultados;
}

function safeParseXml(xmlPath) {
  try {
    const content = fs.readFileSync(xmlPath, "utf8");
    const { tipo, data } = parseXML(content);
    return { tipo, data };
  } catch (err) {
    return null;
  }
}

function norm(val) {
  if (val == null) return "";
  return String(val).trim();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function toCsv(rows, headers) {
  const esc = (val) => {
    const s = val == null ? "" : String(val);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [];
  lines.push(headers.join(","));
  for (const row of rows) {
    lines.push(headers.map((h) => esc(row[h])).join(","));
  }
  return lines.join("\n");
}

async function main() {
  try {
    ensureDir(salidaDir);
    const xmls = listarXmls(procesadasDir);

    const facturas = [];
    const notas = [];
    const mensajes = [];

    for (const xmlPath of xmls) {
      const parsed = safeParseXml(xmlPath);
      if (!parsed) continue;
      const { tipo, data } = parsed;
      const base = path.basename(xmlPath);

      if (tipo === "FacturaElectronica") {
        facturas.push({
          clave: norm(data.Clave),
          consecutivo: norm(data.NumeroConsecutivo),
          file: xmlPath,
        });
      } else if (tipo === "NotaCreditoElectronica") {
        notas.push({
          clave: norm(data.Clave),
          file: xmlPath,
        });
      } else if (tipo === "MensajeHacienda") {
        mensajes.push({
          clave: norm(data.Clave),
          estado: norm(data.EstadoMensaje),
          file: xmlPath,
        });
      }
    }

    const dupFacturas = {};
    const dupNotas = {};
    const dupMensajes = {};

    for (const f of facturas) {
      const key = `${f.clave}||${f.consecutivo}`;
      if (!dupFacturas[key]) dupFacturas[key] = [];
      dupFacturas[key].push(f);
    }
    for (const n of notas) {
      const key = n.clave;
      if (!dupNotas[key]) dupNotas[key] = [];
      dupNotas[key].push(n);
    }
    for (const m of mensajes) {
      const key = m.clave;
      if (!dupMensajes[key]) dupMensajes[key] = [];
      dupMensajes[key].push(m);
    }

    const facturasDuplicadas = Object.values(dupFacturas)
      .filter((arr) => arr.length > 1)
      .flatMap((arr) => arr.map((x) => ({
        clave: x.clave,
        consecutivo: x.consecutivo,
        file: x.file,
      })));

    const notasDuplicadas = Object.values(dupNotas)
      .filter((arr) => arr.length > 1)
      .flatMap((arr) => arr.map((x) => ({
        clave: x.clave,
        file: x.file,
      })));

    const mensajesDuplicados = Object.values(dupMensajes)
      .filter((arr) => arr.length > 1)
      .flatMap((arr) => arr.map((x) => ({
        clave: x.clave,
        estado: x.estado,
        file: x.file,
      })));

    const facturasCsv = toCsv(facturasDuplicadas, ["clave", "consecutivo", "file"]);
    const notasCsv = toCsv(notasDuplicadas, ["clave", "file"]);
    const mensajesCsv = toCsv(mensajesDuplicados, ["clave", "estado", "file"]);

    fs.writeFileSync(path.join(salidaDir, "duplicados_facturas.csv"), facturasCsv, "utf8");
    fs.writeFileSync(path.join(salidaDir, "duplicados_notas.csv"), notasCsv, "utf8");
    fs.writeFileSync(path.join(salidaDir, "duplicados_mensajes.csv"), mensajesCsv, "utf8");

    const [
      facturasDb,
      notasDb,
      mensajesDb,
    ] = await Promise.all([
      pool.query("SELECT clave, consecutivo FROM facturas"),
      pool.query("SELECT clave FROM notas_credito"),
      pool.query("SELECT clave FROM mensajes_hacienda"),
    ]);

    const dbFacturas = new Set(facturasDb.rows.map((r) => `${norm(r.clave)}||${norm(r.consecutivo)}`));
    const dbNotas = new Set(notasDb.rows.map((r) => norm(r.clave)));
    const dbMensajes = new Set(mensajesDb.rows.map((r) => norm(r.clave)));

    const faltantesFacturas = facturas
      .filter((f) => f.clave && f.consecutivo && !dbFacturas.has(`${norm(f.clave)}||${norm(f.consecutivo)}`))
      .map((f) => ({ clave: f.clave, consecutivo: f.consecutivo, file: f.file }));

    const faltantesNotas = notas
      .filter((n) => n.clave && !dbNotas.has(norm(n.clave)))
      .map((n) => ({ clave: n.clave, file: n.file }));

    const faltantesMensajes = mensajes
      .filter((m) => m.clave && !dbMensajes.has(norm(m.clave)))
      .map((m) => ({ clave: m.clave, estado: m.estado, file: m.file }));

    fs.writeFileSync(
      path.join(salidaDir, "faltantes_facturas.csv"),
      toCsv(faltantesFacturas, ["clave", "consecutivo", "file"]),
      "utf8"
    );
    fs.writeFileSync(
      path.join(salidaDir, "faltantes_notas.csv"),
      toCsv(faltantesNotas, ["clave", "file"]),
      "utf8"
    );
    fs.writeFileSync(
      path.join(salidaDir, "faltantes_mensajes.csv"),
      toCsv(faltantesMensajes, ["clave", "estado", "file"]),
      "utf8"
    );

    console.log("Reportes generados en:", salidaDir);
    console.log(`Duplicados facturas: ${facturasDuplicadas.length}`);
    console.log(`Duplicados notas: ${notasDuplicadas.length}`);
    console.log(`Duplicados mensajes: ${mensajesDuplicados.length}`);
    console.log(`Faltantes facturas: ${faltantesFacturas.length}`);
    console.log(`Faltantes notas: ${faltantesNotas.length}`);
    console.log(`Faltantes mensajes: ${faltantesMensajes.length}`);
  } catch (err) {
    console.error("Error en reporte duplicados:", err.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
