BEGIN;

CREATE TABLE IF NOT EXISTS ventas_unidades (
  id SERIAL PRIMARY KEY,
  sociedad_id INTEGER NOT NULL,
  proyecto_codigo VARCHAR(20) NOT NULL,
  unidad_codigo VARCHAR(20) NOT NULL,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ventas_unidades_sociedad_id_proyecto_codigo_unidad_codigo_key UNIQUE (sociedad_id, proyecto_codigo, unidad_codigo)
);

CREATE TABLE IF NOT EXISTS ventas_operaciones (
  id SERIAL PRIMARY KEY,
  unidad_id INTEGER NOT NULL,
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_identificacion VARCHAR(50),
  estado VARCHAR(20) NOT NULL DEFAULT 'activa',
  origen_operacion_id INTEGER,
  motivo TEXT,
  creado_por VARCHAR(100),
  metadata JSONB,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cerrado_en TIMESTAMP,
  CONSTRAINT ventas_operaciones_estado_check CHECK (estado IN ('activa', 'cancelada', 'trasladada', 'cerrada'))
);

CREATE TABLE IF NOT EXISTS ventas_operaciones_historial (
  id SERIAL PRIMARY KEY,
  operacion_id INTEGER NOT NULL,
  accion VARCHAR(50) NOT NULL,
  estado_anterior VARCHAR(20),
  estado_nuevo VARCHAR(20),
  usuario VARCHAR(100),
  motivo TEXT,
  detalles JSONB,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ventas_operaciones_documentos (
  id SERIAL PRIMARY KEY,
  operacion_id INTEGER NOT NULL,
  codigo_documento VARCHAR(50) NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  ruta_archivo TEXT NOT NULL,
  mime_type VARCHAR(150),
  tamanio_bytes INTEGER,
  hash_sha256 VARCHAR(128),
  metadata JSONB,
  creado_por VARCHAR(100),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ventas_operaciones_documentos_operacion_id_codigo_documento_key
    UNIQUE (operacion_id, codigo_documento)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ventas_unidades_sociedad_id_fkey'
  ) THEN
    ALTER TABLE ventas_unidades
      ADD CONSTRAINT ventas_unidades_sociedad_id_fkey
      FOREIGN KEY (sociedad_id)
      REFERENCES sociedades(id)
      ON DELETE NO ACTION;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ventas_operaciones_unidad_id_fkey'
  ) THEN
    ALTER TABLE ventas_operaciones
      ADD CONSTRAINT ventas_operaciones_unidad_id_fkey
      FOREIGN KEY (unidad_id)
      REFERENCES ventas_unidades(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ventas_operaciones_origen_operacion_id_fkey'
  ) THEN
    ALTER TABLE ventas_operaciones
      ADD CONSTRAINT ventas_operaciones_origen_operacion_id_fkey
      FOREIGN KEY (origen_operacion_id)
      REFERENCES ventas_operaciones(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ventas_operaciones_historial_operacion_id_fkey'
  ) THEN
    ALTER TABLE ventas_operaciones_historial
      ADD CONSTRAINT ventas_operaciones_historial_operacion_id_fkey
      FOREIGN KEY (operacion_id)
      REFERENCES ventas_operaciones(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ventas_operaciones_documentos_operacion_id_fkey'
  ) THEN
    ALTER TABLE ventas_operaciones_documentos
      ADD CONSTRAINT ventas_operaciones_documentos_operacion_id_fkey
      FOREIGN KEY (operacion_id)
      REFERENCES ventas_operaciones(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ventas_unidades_sociedad
  ON ventas_unidades(sociedad_id);

CREATE INDEX IF NOT EXISTS idx_ventas_unidades_proyecto
  ON ventas_unidades(proyecto_codigo);

CREATE INDEX IF NOT EXISTS idx_ventas_unidades_unidad
  ON ventas_unidades(unidad_codigo);

CREATE INDEX IF NOT EXISTS idx_ventas_operaciones_unidad
  ON ventas_operaciones(unidad_id);

CREATE INDEX IF NOT EXISTS idx_ventas_operaciones_estado
  ON ventas_operaciones(estado);

CREATE INDEX IF NOT EXISTS idx_ventas_operaciones_creado_en
  ON ventas_operaciones(creado_en DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ventas_operaciones_unidad_activa
  ON ventas_operaciones(unidad_id)
  WHERE estado = 'activa';

CREATE INDEX IF NOT EXISTS idx_ventas_operaciones_historial_operacion
  ON ventas_operaciones_historial(operacion_id);

CREATE INDEX IF NOT EXISTS idx_ventas_operaciones_historial_creado_en
  ON ventas_operaciones_historial(creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_ventas_operaciones_documentos_operacion
  ON ventas_operaciones_documentos(operacion_id);

CREATE INDEX IF NOT EXISTS idx_ventas_operaciones_documentos_codigo
  ON ventas_operaciones_documentos(codigo_documento);

CREATE INDEX IF NOT EXISTS idx_ventas_operaciones_documentos_creado_en
  ON ventas_operaciones_documentos(creado_en DESC);

INSERT INTO permisos (nombre, descripcion)
VALUES
  ('ventas_ver', 'Puede consultar operaciones de ventas por sociedad.'),
  ('ventas_crear', 'Puede crear nuevas operaciones de venta.'),
  ('ventas_gestionar', 'Puede cancelar, cerrar y trasladar operaciones de venta.')
ON CONFLICT (nombre) DO UPDATE
SET descripcion = EXCLUDED.descripcion;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'ventas_ver'
WHERE r.codigo IN (
  'admin', 'gerencia_financiera', 'gerencia_contable', 'gerencia_construccion',
  'gerencia_presupuesto', 'gerencia_mercadeo', 'gerencia_ventas',
  'gerencia_infraestructura', 'gerencia_proyectos', 'contabilidad_jefe',
  'contabilidad_asistente', 'tesoreria_encargado', 'tesoreria_auxiliar',
  'asistencia', 'personalizado'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'ventas_crear'
WHERE r.codigo IN (
  'admin', 'gerencia_financiera', 'gerencia_contable', 'gerencia_ventas',
  'gerencia_proyectos', 'contabilidad_jefe', 'contabilidad_asistente',
  'tesoreria_encargado', 'tesoreria_auxiliar', 'asistencia'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'ventas_gestionar'
WHERE r.codigo IN (
  'admin', 'gerencia_financiera', 'gerencia_contable', 'gerencia_ventas', 'gerencia_proyectos'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

COMMIT;
