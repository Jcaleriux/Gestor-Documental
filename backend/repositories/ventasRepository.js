const pool = require('../db');

const getDb = (client) => client || pool;

const getClient = () => pool.connect();

const OPERACION_SELECT = `
  vo.id,
  vo.unidad_id,
  vu.sociedad_id,
  vu.proyecto_codigo,
  vu.unidad_codigo,
  vo.cliente_nombre,
  vo.cliente_identificacion,
  vo.estado,
  vo.origen_operacion_id,
  vo.motivo,
  vo.creado_por,
  vo.metadata,
  vo.creado_en,
  vo.actualizado_en,
  vo.cerrado_en,
  (
    SELECT COUNT(*)::int
    FROM ventas_operaciones_documentos vod
    WHERE vod.operacion_id = vo.id
  ) AS total_documentos
`;

const getUnidadByNaturalKey = async ({ sociedadId, proyectoCodigo, unidadCodigo }, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT *
    FROM ventas_unidades
    WHERE sociedad_id = $1
      AND proyecto_codigo = $2
      AND unidad_codigo = $3
    `,
    [sociedadId, proyectoCodigo, unidadCodigo]
  );

  return rows[0] || null;
};

const getSociedadByCodigo = async (codigo, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT id, codigo, nombre_proyecto, razon_social, activo
    FROM sociedades
    WHERE UPPER(COALESCE(codigo, '')) = UPPER($1)
    ORDER BY activo DESC, id ASC
    LIMIT 1
    `,
    [codigo]
  );

  return rows[0] || null;
};

const upsertUnidad = async ({ sociedadId, proyectoCodigo, unidadCodigo }, client) => {
  const { rows } = await getDb(client).query(
    `
    INSERT INTO ventas_unidades (
      sociedad_id,
      proyecto_codigo,
      unidad_codigo,
      activo
    )
    VALUES ($1, $2, $3, true)
    ON CONFLICT (sociedad_id, proyecto_codigo, unidad_codigo)
    DO UPDATE
      SET activo = true,
          actualizado_en = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [sociedadId, proyectoCodigo, unidadCodigo]
  );

  return rows[0] || null;
};

const findActiveOperacionByUnidadId = async (unidadId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT ${OPERACION_SELECT}
    FROM ventas_operaciones vo
    JOIN ventas_unidades vu ON vu.id = vo.unidad_id
    WHERE vo.unidad_id = $1
      AND vo.estado = 'activa'
    ORDER BY vo.creado_en DESC, vo.id DESC
    LIMIT 1
    `,
    [unidadId]
  );

  return rows[0] || null;
};

const getOperacionById = async (id, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT ${OPERACION_SELECT}
    FROM ventas_operaciones vo
    JOIN ventas_unidades vu ON vu.id = vo.unidad_id
    WHERE vo.id = $1
    `,
    [id]
  );

  return rows[0] || null;
};

const listOperaciones = async (
  {
    sociedadId,
    estado,
    proyectoCodigo,
    unidadCodigo,
    clienteTexto,
    limit = 200,
  } = {},
  client,
) => {
  const params = [];
  const where = [];

  if (sociedadId) {
    params.push(sociedadId);
    where.push(`vu.sociedad_id = $${params.length}`);
  }

  if (estado) {
    params.push(estado);
    where.push(`vo.estado = $${params.length}`);
  }

  if (proyectoCodigo) {
    params.push(proyectoCodigo);
    where.push(`vu.proyecto_codigo = $${params.length}`);
  }

  if (unidadCodigo) {
    params.push(unidadCodigo);
    where.push(`vu.unidad_codigo = $${params.length}`);
  }

  if (clienteTexto) {
    params.push(`%${clienteTexto}%`);
    where.push(`vo.cliente_nombre ILIKE $${params.length}`);
  }

  params.push(limit);

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await getDb(client).query(
    `
    SELECT ${OPERACION_SELECT}
    FROM ventas_operaciones vo
    JOIN ventas_unidades vu ON vu.id = vo.unidad_id
    ${whereClause}
    ORDER BY vo.creado_en DESC, vo.id DESC
    LIMIT $${params.length}
    `,
    params
  );

  return rows;
};

const createOperacion = async (
  {
    unidadId,
    clienteNombre,
    clienteIdentificacion,
    estado,
    origenOperacionId,
    motivo,
    creadoPor,
    metadata,
  },
  client,
) => {
  const { rows } = await getDb(client).query(
    `
    INSERT INTO ventas_operaciones (
      unidad_id,
      cliente_nombre,
      cliente_identificacion,
      estado,
      origen_operacion_id,
      motivo,
      creado_por,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
    `,
    [
      unidadId,
      clienteNombre,
      clienteIdentificacion || null,
      estado,
      origenOperacionId || null,
      motivo || null,
      creadoPor || null,
      metadata || null,
    ],
  );

  if (!rows[0]) {
    return null;
  }

  return getOperacionById(rows[0].id, client);
};

const updateOperacionEstado = async (
  {
    id,
    estado,
    motivo,
    origenOperacionId = null,
    cerradoEn = null,
  },
  client,
) => {
  const { rows } = await getDb(client).query(
    `
    UPDATE ventas_operaciones
    SET estado = $1,
        motivo = COALESCE($2, motivo),
        origen_operacion_id = COALESCE($3, origen_operacion_id),
        cerrado_en = COALESCE($4, cerrado_en),
        actualizado_en = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING id
    `,
    [estado, motivo || null, origenOperacionId || null, cerradoEn || null, id]
  );

  if (!rows[0]) {
    return null;
  }

  return getOperacionById(rows[0].id, client);
};

const insertOperacionHistorial = async (
  {
    operacionId,
    accion,
    estadoAnterior,
    estadoNuevo,
    usuario,
    motivo,
    detalles,
  },
  client,
) => {
  await getDb(client).query(
    `
    INSERT INTO ventas_operaciones_historial (
      operacion_id,
      accion,
      estado_anterior,
      estado_nuevo,
      usuario,
      motivo,
      detalles
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      operacionId,
      accion,
      estadoAnterior || null,
      estadoNuevo || null,
      usuario || null,
      motivo || null,
      detalles || null,
    ],
  );
};

const listOperacionHistorial = async (operacionId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT *
    FROM ventas_operaciones_historial
    WHERE operacion_id = $1
    ORDER BY creado_en DESC, id DESC
    `,
    [operacionId]
  );

  return rows;
};

const listOperacionDocumentos = async (operacionId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT *
    FROM ventas_operaciones_documentos
    WHERE operacion_id = $1
    ORDER BY creado_en DESC, id DESC
    `,
    [operacionId]
  );

  return rows;
};

const getOperacionDocumentoById = async (documentoId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT *
    FROM ventas_operaciones_documentos
    WHERE id = $1
    `,
    [documentoId]
  );

  return rows[0] || null;
};

const upsertOperacionDocumento = async (
  {
    operacionId,
    codigoDocumento,
    nombreArchivo,
    rutaArchivo,
    mimeType,
    tamanioBytes,
    hashSha256,
    metadata,
    creadoPor,
  },
  client,
) => {
  const { rows } = await getDb(client).query(
    `
    INSERT INTO ventas_operaciones_documentos (
      operacion_id,
      codigo_documento,
      nombre_archivo,
      ruta_archivo,
      mime_type,
      tamanio_bytes,
      hash_sha256,
      metadata,
      creado_por
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (operacion_id, codigo_documento)
    DO UPDATE
      SET nombre_archivo = EXCLUDED.nombre_archivo,
          ruta_archivo = EXCLUDED.ruta_archivo,
          mime_type = EXCLUDED.mime_type,
          tamanio_bytes = EXCLUDED.tamanio_bytes,
          hash_sha256 = EXCLUDED.hash_sha256,
          metadata = EXCLUDED.metadata,
          creado_por = EXCLUDED.creado_por,
          actualizado_en = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [
      operacionId,
      codigoDocumento,
      nombreArchivo,
      rutaArchivo,
      mimeType || null,
      tamanioBytes || null,
      hashSha256 || null,
      metadata || null,
      creadoPor || null,
    ]
  );

  return rows[0] || null;
};

module.exports = {
  getClient,
  getSociedadByCodigo,
  getUnidadByNaturalKey,
  upsertUnidad,
  findActiveOperacionByUnidadId,
  getOperacionById,
  listOperaciones,
  createOperacion,
  updateOperacionEstado,
  insertOperacionHistorial,
  listOperacionHistorial,
  listOperacionDocumentos,
  getOperacionDocumentoById,
  upsertOperacionDocumento,
};
