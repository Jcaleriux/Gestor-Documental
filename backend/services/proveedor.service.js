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

async function upsertProveedorDesdeEmisor(emisor, sociedadId, options = {}) {
  const proveedor = extraerProveedorDesdeEmisor(emisor);
  const sociedadIdNum = Number(sociedadId);
  if (!proveedor || !Number.isInteger(sociedadIdNum) || sociedadIdNum <= 0) {
    return { status: "skipped", id: null };
  }

  const origen = asString(options.origen) || "ingestion_documento";

  const result = await pool.query(
    `WITH incoming AS (
       SELECT
         $1::integer AS sociedad_id,
         $2::varchar AS identificacion_tipo,
         $3::varchar AS identificacion_numero,
         $4::varchar AS identificacion_numero_normalizado,
         $5::varchar AS nombre,
         $6::varchar AS nombre_comercial,
         $7::varchar AS correo_electronico,
         $8::varchar AS telefono_codigo_pais,
         $9::varchar AS telefono_numero
     ),
     existing AS (
       SELECT p.*
       FROM proveedores p
       JOIN incoming i
         ON i.sociedad_id = p.sociedad_id
        AND i.identificacion_numero_normalizado = p.identificacion_numero_normalizado
     ),
     upsert AS (
       INSERT INTO proveedores
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
       SELECT
         sociedad_id,
         identificacion_tipo,
         identificacion_numero,
         identificacion_numero_normalizado,
         nombre,
         nombre_comercial,
         correo_electronico,
         telefono_codigo_pais,
         telefono_numero
       FROM incoming
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
       WHERE (EXCLUDED.identificacion_tipo IS NOT NULL AND EXCLUDED.identificacion_tipo IS DISTINCT FROM proveedores.identificacion_tipo)
          OR (EXCLUDED.identificacion_numero IS NOT NULL AND EXCLUDED.identificacion_numero IS DISTINCT FROM proveedores.identificacion_numero)
          OR (EXCLUDED.nombre IS NOT NULL AND EXCLUDED.nombre IS DISTINCT FROM proveedores.nombre)
          OR (EXCLUDED.nombre_comercial IS NOT NULL AND EXCLUDED.nombre_comercial IS DISTINCT FROM proveedores.nombre_comercial)
          OR (EXCLUDED.correo_electronico IS NOT NULL AND EXCLUDED.correo_electronico IS DISTINCT FROM proveedores.correo_electronico)
          OR (EXCLUDED.telefono_codigo_pais IS NOT NULL AND EXCLUDED.telefono_codigo_pais IS DISTINCT FROM proveedores.telefono_codigo_pais)
          OR (EXCLUDED.telefono_numero IS NOT NULL AND EXCLUDED.telefono_numero IS DISTINCT FROM proveedores.telefono_numero)
       RETURNING id, true AS changed
     ),
     changes AS (
       SELECT
         u.id AS proveedor_id,
         changed.campo,
         changed.valor_anterior,
         changed.valor_nuevo,
         $10::varchar AS origen
       FROM upsert u
       JOIN existing e ON true
       JOIN incoming i ON true
       CROSS JOIN LATERAL (
         VALUES
           ('identificacion_tipo', e.identificacion_tipo::text, COALESCE(i.identificacion_tipo, e.identificacion_tipo)::text),
           ('identificacion_numero', e.identificacion_numero::text, COALESCE(i.identificacion_numero, e.identificacion_numero)::text),
           ('nombre', e.nombre::text, COALESCE(i.nombre, e.nombre)::text),
           ('nombre_comercial', e.nombre_comercial::text, COALESCE(i.nombre_comercial, e.nombre_comercial)::text),
           ('correo_electronico', e.correo_electronico::text, COALESCE(i.correo_electronico, e.correo_electronico)::text),
           ('telefono_codigo_pais', e.telefono_codigo_pais::text, COALESCE(i.telefono_codigo_pais, e.telefono_codigo_pais)::text),
           ('telefono_numero', e.telefono_numero::text, COALESCE(i.telefono_numero, e.telefono_numero)::text)
       ) AS changed(campo, valor_anterior, valor_nuevo)
       WHERE changed.valor_nuevo IS DISTINCT FROM changed.valor_anterior
     ),
     history AS (
       INSERT INTO proveedores_historial_cambios
         (proveedor_id, campo, valor_anterior, valor_nuevo, origen)
       SELECT proveedor_id, campo, valor_anterior, valor_nuevo, origen
       FROM changes
       RETURNING id
     )
     SELECT
       id,
       changed,
       CASE WHEN EXISTS (SELECT 1 FROM existing) THEN 'updated' ELSE 'inserted' END AS action,
       (SELECT COUNT(*)::int FROM history) AS changes_logged
     FROM upsert
     UNION ALL
     SELECT
       id,
       false AS changed,
       'unchanged' AS action,
       0 AS changes_logged
     FROM existing
     WHERE NOT EXISTS (SELECT 1 FROM upsert)
     LIMIT 1`,
    [
      sociedadIdNum,
      proveedor.identificacionTipo,
      proveedor.identificacionNumero,
      proveedor.identificacionNumeroNormalizado,
      proveedor.nombre,
      proveedor.nombreComercial,
      proveedor.correoElectronico,
      proveedor.telefonoCodigoPais,
      proveedor.telefonoNumero,
      origen
    ]
  );

  const row = result.rows[0];
  return {
    status: row.changed ? "upserted" : "unchanged",
    id: row.id,
    action: row.action,
    changesLogged: Number(row.changes_logged || 0)
  };
}

module.exports = {
  upsertProveedorDesdeEmisor,
  extraerProveedorDesdeEmisor,
  normalizarIdentificacion
};
