const pool = require("../db");

function asString(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function normalizarIdentificacion(value) {
  const raw = asString(value);
  if (!raw) return null;
  const normalizada = raw.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  return normalizada || null;
}

function obtenerTelefono(telefonoRaw) {
  if (!telefonoRaw) {
    return { codigoPais: null, numero: null };
  }

  if (typeof telefonoRaw === "string") {
    return { codigoPais: null, numero: asString(telefonoRaw) };
  }

  return {
    codigoPais: asString(telefonoRaw.CodigoPais),
    numero: asString(telefonoRaw.NumTelefono)
  };
}

function extraerProveedorDesdeEmisor(emisor) {
  if (!emisor || typeof emisor !== "object") {
    return null;
  }

  const identificacionTipo = asString(emisor.Identificacion?.Tipo);
  const identificacionNumero = asString(emisor.Identificacion?.Numero);
  const identificacionNumeroNormalizado = normalizarIdentificacion(identificacionNumero);
  const nombre = asString(emisor.Nombre) || asString(emisor.NombreComercial);
  const nombreComercial = asString(emisor.NombreComercial);
  const correoElectronico = asString(emisor.CorreoElectronico);
  const telefono = obtenerTelefono(emisor.Telefono);

  if (!identificacionNumeroNormalizado || !nombre) {
    return null;
  }

  return {
    identificacionTipo,
    identificacionNumero,
    identificacionNumeroNormalizado,
    nombre,
    nombreComercial,
    correoElectronico,
    telefonoCodigoPais: telefono.codigoPais,
    telefonoNumero: telefono.numero
  };
}

async function upsertProveedorDesdeEmisor(emisor, sociedadId) {
  const proveedor = extraerProveedorDesdeEmisor(emisor);
  const sociedadIdNum = Number(sociedadId);
  if (!proveedor || !Number.isInteger(sociedadIdNum) || sociedadIdNum <= 0) {
    return { status: "skipped", id: null };
  }

  const result = await pool.query(
    `INSERT INTO proveedores
     (
       sociedad_id,
       identificacion_tipo,
       identificacion_numero,
       identificacion_numero_normalizado,
       nombre,
       nombre_comercial,
       correo_electronico,
       telefono_codigo_pais,
       telefono_numero
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (sociedad_id, identificacion_numero_normalizado)
     DO UPDATE
     SET identificacion_tipo = COALESCE(EXCLUDED.identificacion_tipo, proveedores.identificacion_tipo),
         identificacion_numero = COALESCE(EXCLUDED.identificacion_numero, proveedores.identificacion_numero),
         nombre = COALESCE(EXCLUDED.nombre, proveedores.nombre),
         nombre_comercial = COALESCE(EXCLUDED.nombre_comercial, proveedores.nombre_comercial),
         correo_electronico = COALESCE(EXCLUDED.correo_electronico, proveedores.correo_electronico),
         telefono_codigo_pais = COALESCE(EXCLUDED.telefono_codigo_pais, proveedores.telefono_codigo_pais),
         telefono_numero = COALESCE(EXCLUDED.telefono_numero, proveedores.telefono_numero),
         actualizado_en = CURRENT_TIMESTAMP
     RETURNING id`,
    [
      sociedadIdNum,
      proveedor.identificacionTipo,
      proveedor.identificacionNumero,
      proveedor.identificacionNumeroNormalizado,
      proveedor.nombre,
      proveedor.nombreComercial,
      proveedor.correoElectronico,
      proveedor.telefonoCodigoPais,
      proveedor.telefonoNumero
    ]
  );

  return { status: "upserted", id: result.rows[0].id };
}

module.exports = {
  upsertProveedorDesdeEmisor,
  extraerProveedorDesdeEmisor,
  normalizarIdentificacion
};
