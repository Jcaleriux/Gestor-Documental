const pool = require("../db");
const { upsertProveedorDesdeEmisor } = require("./proveedor.service");

function toJsonb(value, fallback = {}) {
  return JSON.stringify(value ?? fallback);
}

async function obtenerSociedadIdPorCedula(cedulaJuridica) {
  if (!cedulaJuridica) return null;
  const raw = String(cedulaJuridica);
  const normalizada = raw.replace(/\D/g, '');
  const result = await pool.query(
    `
    SELECT id
    FROM sociedades
    WHERE cedula_juridica = $1
       OR regexp_replace(cedula_juridica, '\\D', '', 'g') = $2
    LIMIT 1
    `,
    [raw, normalizada]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

async function registrarProveedor(emisor, claveDocumento, sociedadId) {
  try {
    await upsertProveedorDesdeEmisor(emisor, sociedadId, {
      origen: `documento:${claveDocumento}`
    });
  } catch (error) {
    console.error(`No se pudo registrar proveedor para ${claveDocumento}: ${error.message}`);
  }
}

async function insertarFactura(data, rutaXml, rutaPdf) {
  const clave = String(data.Clave);
  const consecutivo = String(data.NumeroConsecutivo);
  const sociedadId = await obtenerSociedadIdPorCedula(data.Receptor?.Identificacion?.Numero);
  if (!sociedadId) {
    console.log(`Sociedad no encontrada para factura ${clave}, omitiendo.`);
    return { status: "sociedad_missing", id: null };
  }
  await registrarProveedor(data.Emisor, clave, sociedadId);

  // Check if clave already exists
  const existeClave = await pool.query(
    "SELECT id FROM facturas WHERE clave = $1",
    [clave]
  );
  if (existeClave.rows.length > 0) {
    console.log(`Factura con clave ${clave} ya existe, saltando.`);
    return { status: "duplicate", id: null };
  }

  const factura = await pool.query(
    `INSERT INTO facturas
     (clave, consecutivo, fecha_emision, emisor, receptor, resumen, xml_completo, ruta_xml, ruta_pdf, sociedad_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      clave,
      consecutivo,
      data.FechaEmision,
      toJsonb(data.Emisor),
      toJsonb(data.Receptor),
      toJsonb(data.ResumenFactura),
      toJsonb(data),
      rutaXml,
      rutaPdf,
      sociedadId
    ]
  );

  const facturaId = factura.rows[0].id;

  await pool.query(
    `UPDATE mensajes_hacienda
     SET factura_id = $1
     WHERE clave = $2 AND factura_id IS NULL`,
    [facturaId, clave]
  );

  return { status: "inserted", id: facturaId };
}

async function insertarTiqueteElectronico(data, rutaXml, rutaPdf) {
  const clave = String(data.Clave);
  const consecutivo = String(data.NumeroConsecutivo);
  const sociedadId = await obtenerSociedadIdPorCedula(data.Receptor?.Identificacion?.Numero);
  if (!sociedadId) {
    console.log(`Sociedad no encontrada para tiquete ${clave}, omitiendo.`);
    return { status: "sociedad_missing", id: null };
  }
  await registrarProveedor(data.Emisor, clave, sociedadId);

  const existe = await pool.query(
    "SELECT id FROM tiquetes_electronicos WHERE clave = $1",
    [clave]
  );
  if (existe.rows.length > 0) {
    console.log(`Tiquete Electronico con clave ${clave} ya existe, saltando.`);
    return { status: "duplicate", id: null };
  }

  const resumen = data.ResumenFactura || data.ResumenTiquete || data.Resumen || {};

  const tiquete = await pool.query(
    `INSERT INTO tiquetes_electronicos
     (clave, consecutivo, fecha_emision, emisor, receptor, resumen, xml_completo, ruta_xml, ruta_pdf, sociedad_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      clave,
      consecutivo,
      data.FechaEmision,
      toJsonb(data.Emisor),
      toJsonb(data.Receptor),
      toJsonb(resumen),
      toJsonb(data),
      rutaXml,
      rutaPdf,
      sociedadId
    ]
  );

  return { status: "inserted", id: tiquete.rows[0].id };
}

async function insertarMensajeHacienda(data, rutaXml) {
  const clave = String(data.Clave);
  const cedulaReceptor = String(data.NumeroCedulaReceptor);
  const sociedadId = await obtenerSociedadIdPorCedula(cedulaReceptor);
  if (!sociedadId) {
    console.log(`Sociedad no encontrada para mensaje ${clave}, omitiendo.`);
    return { status: "sociedad_missing", id: null };
  }

  // Check if clave already exists
  const existe = await pool.query(
    "SELECT id FROM mensajes_hacienda WHERE clave = $1",
    [clave]
  );
  if (existe.rows.length > 0) {
    console.log(`Mensaje Hacienda con clave ${clave} ya existe, saltando.`);
    return { status: "duplicate", id: null };
  }

  const mensajeCodigoRaw = data.Mensaje;
  const mensajeCodigo = mensajeCodigoRaw != null && String(mensajeCodigoRaw).trim() !== ''
    ? Number(String(mensajeCodigoRaw).trim())
    : null;
  const mensajeCodigoFinal = Number.isFinite(mensajeCodigo) ? mensajeCodigo : null;

  const facturaRes = await pool.query(
    "SELECT id FROM facturas WHERE clave = $1",
    [clave]
  );
  const facturaId = facturaRes.rows.length > 0 ? facturaRes.rows[0].id : null;

  const mensaje = await pool.query(
    `INSERT INTO mensajes_hacienda
     (clave, mensaje, estado, detalle, xml_completo, ruta_xml, sociedad_id, factura_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      clave,
      mensajeCodigoFinal,
      data.EstadoMensaje,
      data.DetalleMensaje,
      toJsonb(data),
      rutaXml,
      sociedadId,
      facturaId
    ]
  );

  return { status: "inserted", id: mensaje.rows[0].id };
}

async function insertarNotaCredito(data, rutaXml, rutaPdf) {
  const clave = String(data.Clave);
  const sociedadId = await obtenerSociedadIdPorCedula(data.Receptor?.Identificacion?.Numero);
  if (!sociedadId) {
    console.log(`Sociedad no encontrada para nota ${clave}, omitiendo.`);
    return { status: "sociedad_missing", id: null };
  }
  await registrarProveedor(data.Emisor, clave, sociedadId);

  // Check if clave already exists
  const existe = await pool.query(
    "SELECT id FROM notas_credito WHERE clave = $1",
    [clave]
  );
  if (existe.rows.length > 0) {
    console.log(`Nota de Crédito con clave ${clave} ya existe, saltando.`);
    return { status: "duplicate", id: null };
  }

  const infoReferencia = data.InformacionReferencia;
  const numeroReferencia = Array.isArray(infoReferencia)
    ? infoReferencia.find((item) => item && item.Numero)?.Numero
    : infoReferencia && infoReferencia.Numero;

  // Asumir que hay una referencia a la factura
  let facturaId = null;
  if (numeroReferencia) {
    const refNumero = String(numeroReferencia);
    // Buscar la factura por clave o algo
    const factura = await pool.query(
      "SELECT id FROM facturas WHERE clave = $1",
      [refNumero]
    );
    if (factura.rows.length > 0) {
      facturaId = factura.rows[0].id;
    }
  }

  const nota = await pool.query(
    `INSERT INTO notas_credito
     (clave, fecha_emision, factura_id, referencia, xml_completo, ruta_xml, ruta_pdf, sociedad_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      clave,
      data.FechaEmision,
      facturaId,
      toJsonb(infoReferencia || {}),
      toJsonb(data),
      rutaXml,
      rutaPdf,
      sociedadId
    ]
  );

  return { status: "inserted", id: nota.rows[0].id };
}

module.exports = {
  insertarFactura,
  insertarTiqueteElectronico,
  insertarMensajeHacienda,
  insertarNotaCredito
};
