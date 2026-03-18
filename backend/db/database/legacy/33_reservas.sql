BEGIN;

DO $$
BEGIN
  IF to_regclass('public.ventas_unidades') IS NOT NULL
    AND to_regclass('public.reservas_unidades') IS NULL THEN
    ALTER TABLE public.ventas_unidades RENAME TO reservas_unidades;
  END IF;

  IF to_regclass('public.ventas_operaciones') IS NOT NULL
    AND to_regclass('public.reservas_operaciones') IS NULL THEN
    ALTER TABLE public.ventas_operaciones RENAME TO reservas_operaciones;
  END IF;

  IF to_regclass('public.ventas_operaciones_historial') IS NOT NULL
    AND to_regclass('public.reservas_operaciones_historial') IS NULL THEN
    ALTER TABLE public.ventas_operaciones_historial RENAME TO reservas_operaciones_historial;
  END IF;

  IF to_regclass('public.ventas_operaciones_documentos') IS NOT NULL
    AND to_regclass('public.reservas_operaciones_documentos') IS NULL THEN
    ALTER TABLE public.ventas_operaciones_documentos RENAME TO reservas_operaciones_documentos;
  END IF;

  IF to_regclass('public.ventas_unidades_id_seq') IS NOT NULL
    AND to_regclass('public.reservas_unidades_id_seq') IS NULL THEN
    ALTER SEQUENCE public.ventas_unidades_id_seq RENAME TO reservas_unidades_id_seq;
  END IF;

  IF to_regclass('public.ventas_operaciones_id_seq') IS NOT NULL
    AND to_regclass('public.reservas_operaciones_id_seq') IS NULL THEN
    ALTER SEQUENCE public.ventas_operaciones_id_seq RENAME TO reservas_operaciones_id_seq;
  END IF;

  IF to_regclass('public.ventas_operaciones_historial_id_seq') IS NOT NULL
    AND to_regclass('public.reservas_operaciones_historial_id_seq') IS NULL THEN
    ALTER SEQUENCE public.ventas_operaciones_historial_id_seq RENAME TO reservas_operaciones_historial_id_seq;
  END IF;

  IF to_regclass('public.ventas_operaciones_documentos_id_seq') IS NOT NULL
    AND to_regclass('public.reservas_operaciones_documentos_id_seq') IS NULL THEN
    ALTER SEQUENCE public.ventas_operaciones_documentos_id_seq RENAME TO reservas_operaciones_documentos_id_seq;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_unidades_pkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_unidades_pkey') THEN
    ALTER TABLE public.reservas_unidades
      RENAME CONSTRAINT ventas_unidades_pkey TO reservas_unidades_pkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ventas_unidades_sociedad_id_proyecto_codigo_unidad_codigo_key'
  )
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'reservas_unidades_sociedad_id_proyecto_codigo_unidad_codigo_key'
    ) THEN
    ALTER TABLE public.reservas_unidades
      RENAME CONSTRAINT ventas_unidades_sociedad_id_proyecto_codigo_unidad_codigo_key
      TO reservas_unidades_sociedad_id_proyecto_codigo_unidad_codigo_key;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_unidades_sociedad_id_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_unidades_sociedad_id_fkey') THEN
    ALTER TABLE public.reservas_unidades
      RENAME CONSTRAINT ventas_unidades_sociedad_id_fkey TO reservas_unidades_sociedad_id_fkey;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_operaciones_pkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_operaciones_pkey') THEN
    ALTER TABLE public.reservas_operaciones
      RENAME CONSTRAINT ventas_operaciones_pkey TO reservas_operaciones_pkey;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_operaciones_estado_check')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_operaciones_estado_check') THEN
    ALTER TABLE public.reservas_operaciones
      RENAME CONSTRAINT ventas_operaciones_estado_check TO reservas_operaciones_estado_check;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_operaciones_unidad_id_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_operaciones_unidad_id_fkey') THEN
    ALTER TABLE public.reservas_operaciones
      RENAME CONSTRAINT ventas_operaciones_unidad_id_fkey TO reservas_operaciones_unidad_id_fkey;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_operaciones_origen_operacion_id_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_operaciones_origen_operacion_id_fkey') THEN
    ALTER TABLE public.reservas_operaciones
      RENAME CONSTRAINT ventas_operaciones_origen_operacion_id_fkey TO reservas_operaciones_origen_operacion_id_fkey;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_operaciones_historial_pkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_operaciones_historial_pkey') THEN
    ALTER TABLE public.reservas_operaciones_historial
      RENAME CONSTRAINT ventas_operaciones_historial_pkey TO reservas_operaciones_historial_pkey;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_operaciones_historial_operacion_id_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_operaciones_historial_operacion_id_fkey') THEN
    ALTER TABLE public.reservas_operaciones_historial
      RENAME CONSTRAINT ventas_operaciones_historial_operacion_id_fkey TO reservas_operaciones_historial_operacion_id_fkey;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_operaciones_documentos_pkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_operaciones_documentos_pkey') THEN
    ALTER TABLE public.reservas_operaciones_documentos
      RENAME CONSTRAINT ventas_operaciones_documentos_pkey TO reservas_operaciones_documentos_pkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ventas_operaciones_documentos_operacion_id_codigo_documento_key'
  )
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'reservas_operaciones_documentos_operacion_id_codigo_documento_key'
    ) THEN
    ALTER TABLE public.reservas_operaciones_documentos
      RENAME CONSTRAINT ventas_operaciones_documentos_operacion_id_codigo_documento_key
      TO reservas_operaciones_documentos_operacion_id_codigo_documento_key;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ventas_operaciones_documentos_operacion_id_fkey')
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservas_operaciones_documentos_operacion_id_fkey') THEN
    ALTER TABLE public.reservas_operaciones_documentos
      RENAME CONSTRAINT ventas_operaciones_documentos_operacion_id_fkey
      TO reservas_operaciones_documentos_operacion_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.idx_ventas_unidades_sociedad') IS NOT NULL
    AND to_regclass('public.idx_reservas_unidades_sociedad') IS NULL THEN
    ALTER INDEX public.idx_ventas_unidades_sociedad RENAME TO idx_reservas_unidades_sociedad;
  END IF;

  IF to_regclass('public.idx_ventas_unidades_proyecto') IS NOT NULL
    AND to_regclass('public.idx_reservas_unidades_proyecto') IS NULL THEN
    ALTER INDEX public.idx_ventas_unidades_proyecto RENAME TO idx_reservas_unidades_proyecto;
  END IF;

  IF to_regclass('public.idx_ventas_unidades_unidad') IS NOT NULL
    AND to_regclass('public.idx_reservas_unidades_unidad') IS NULL THEN
    ALTER INDEX public.idx_ventas_unidades_unidad RENAME TO idx_reservas_unidades_unidad;
  END IF;

  IF to_regclass('public.idx_ventas_operaciones_unidad') IS NOT NULL
    AND to_regclass('public.idx_reservas_operaciones_unidad') IS NULL THEN
    ALTER INDEX public.idx_ventas_operaciones_unidad RENAME TO idx_reservas_operaciones_unidad;
  END IF;

  IF to_regclass('public.idx_ventas_operaciones_estado') IS NOT NULL
    AND to_regclass('public.idx_reservas_operaciones_estado') IS NULL THEN
    ALTER INDEX public.idx_ventas_operaciones_estado RENAME TO idx_reservas_operaciones_estado;
  END IF;

  IF to_regclass('public.idx_ventas_operaciones_creado_en') IS NOT NULL
    AND to_regclass('public.idx_reservas_operaciones_creado_en') IS NULL THEN
    ALTER INDEX public.idx_ventas_operaciones_creado_en RENAME TO idx_reservas_operaciones_creado_en;
  END IF;

  IF to_regclass('public.ux_ventas_operaciones_unidad_activa') IS NOT NULL
    AND to_regclass('public.ux_reservas_operaciones_unidad_activa') IS NULL THEN
    ALTER INDEX public.ux_ventas_operaciones_unidad_activa RENAME TO ux_reservas_operaciones_unidad_activa;
  END IF;

  IF to_regclass('public.idx_ventas_operaciones_historial_operacion') IS NOT NULL
    AND to_regclass('public.idx_reservas_operaciones_historial_operacion') IS NULL THEN
    ALTER INDEX public.idx_ventas_operaciones_historial_operacion
      RENAME TO idx_reservas_operaciones_historial_operacion;
  END IF;

  IF to_regclass('public.idx_ventas_operaciones_historial_creado_en') IS NOT NULL
    AND to_regclass('public.idx_reservas_operaciones_historial_creado_en') IS NULL THEN
    ALTER INDEX public.idx_ventas_operaciones_historial_creado_en
      RENAME TO idx_reservas_operaciones_historial_creado_en;
  END IF;

  IF to_regclass('public.idx_ventas_operaciones_documentos_operacion') IS NOT NULL
    AND to_regclass('public.idx_reservas_operaciones_documentos_operacion') IS NULL THEN
    ALTER INDEX public.idx_ventas_operaciones_documentos_operacion
      RENAME TO idx_reservas_operaciones_documentos_operacion;
  END IF;

  IF to_regclass('public.idx_ventas_operaciones_documentos_codigo') IS NOT NULL
    AND to_regclass('public.idx_reservas_operaciones_documentos_codigo') IS NULL THEN
    ALTER INDEX public.idx_ventas_operaciones_documentos_codigo
      RENAME TO idx_reservas_operaciones_documentos_codigo;
  END IF;

  IF to_regclass('public.idx_ventas_operaciones_documentos_creado_en') IS NOT NULL
    AND to_regclass('public.idx_reservas_operaciones_documentos_creado_en') IS NULL THEN
    ALTER INDEX public.idx_ventas_operaciones_documentos_creado_en
      RENAME TO idx_reservas_operaciones_documentos_creado_en;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.reservas_unidades (
  id SERIAL PRIMARY KEY,
  sociedad_id INTEGER NOT NULL,
  proyecto_codigo VARCHAR(20) NOT NULL,
  unidad_codigo VARCHAR(20) NOT NULL,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reservas_unidades_sociedad_id_proyecto_codigo_unidad_codigo_key
    UNIQUE (sociedad_id, proyecto_codigo, unidad_codigo)
);

CREATE TABLE IF NOT EXISTS public.reservas_operaciones (
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
  CONSTRAINT reservas_operaciones_estado_check
    CHECK (estado IN ('activa', 'cancelada', 'trasladada', 'cerrada'))
);

CREATE TABLE IF NOT EXISTS public.reservas_operaciones_historial (
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

CREATE TABLE IF NOT EXISTS public.reservas_operaciones_documentos (
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
  CONSTRAINT reservas_operaciones_documentos_operacion_id_codigo_documento_key
    UNIQUE (operacion_id, codigo_documento)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservas_unidades_sociedad_id_fkey'
  ) THEN
    ALTER TABLE public.reservas_unidades
      ADD CONSTRAINT reservas_unidades_sociedad_id_fkey
      FOREIGN KEY (sociedad_id)
      REFERENCES public.sociedades(id)
      ON DELETE NO ACTION;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservas_operaciones_unidad_id_fkey'
  ) THEN
    ALTER TABLE public.reservas_operaciones
      ADD CONSTRAINT reservas_operaciones_unidad_id_fkey
      FOREIGN KEY (unidad_id)
      REFERENCES public.reservas_unidades(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservas_operaciones_origen_operacion_id_fkey'
  ) THEN
    ALTER TABLE public.reservas_operaciones
      ADD CONSTRAINT reservas_operaciones_origen_operacion_id_fkey
      FOREIGN KEY (origen_operacion_id)
      REFERENCES public.reservas_operaciones(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservas_operaciones_historial_operacion_id_fkey'
  ) THEN
    ALTER TABLE public.reservas_operaciones_historial
      ADD CONSTRAINT reservas_operaciones_historial_operacion_id_fkey
      FOREIGN KEY (operacion_id)
      REFERENCES public.reservas_operaciones(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reservas_operaciones_documentos_operacion_id_fkey'
  ) THEN
    ALTER TABLE public.reservas_operaciones_documentos
      ADD CONSTRAINT reservas_operaciones_documentos_operacion_id_fkey
      FOREIGN KEY (operacion_id)
      REFERENCES public.reservas_operaciones(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservas_unidades_sociedad
  ON public.reservas_unidades(sociedad_id);

CREATE INDEX IF NOT EXISTS idx_reservas_unidades_proyecto
  ON public.reservas_unidades(proyecto_codigo);

CREATE INDEX IF NOT EXISTS idx_reservas_unidades_unidad
  ON public.reservas_unidades(unidad_codigo);

CREATE INDEX IF NOT EXISTS idx_reservas_operaciones_unidad
  ON public.reservas_operaciones(unidad_id);

CREATE INDEX IF NOT EXISTS idx_reservas_operaciones_estado
  ON public.reservas_operaciones(estado);

CREATE INDEX IF NOT EXISTS idx_reservas_operaciones_creado_en
  ON public.reservas_operaciones(creado_en DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_reservas_operaciones_unidad_activa
  ON public.reservas_operaciones(unidad_id)
  WHERE estado = 'activa';

CREATE INDEX IF NOT EXISTS idx_reservas_operaciones_historial_operacion
  ON public.reservas_operaciones_historial(operacion_id);

CREATE INDEX IF NOT EXISTS idx_reservas_operaciones_historial_creado_en
  ON public.reservas_operaciones_historial(creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_reservas_operaciones_documentos_operacion
  ON public.reservas_operaciones_documentos(operacion_id);

CREATE INDEX IF NOT EXISTS idx_reservas_operaciones_documentos_codigo
  ON public.reservas_operaciones_documentos(codigo_documento);

CREATE INDEX IF NOT EXISTS idx_reservas_operaciones_documentos_creado_en
  ON public.reservas_operaciones_documentos(creado_en DESC);

INSERT INTO permisos (nombre, descripcion)
VALUES
  ('reservas_ver', 'Puede consultar reservas por sociedad.'),
  ('reservas_crear', 'Puede crear nuevas reservas.'),
  ('reservas_gestionar', 'Puede cancelar, cerrar y trasladar reservas.')
ON CONFLICT (nombre) DO UPDATE
SET descripcion = EXCLUDED.descripcion;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT rp.rol_id, nuevo.id
FROM roles_permisos rp
JOIN permisos anterior ON anterior.id = rp.permiso_id
JOIN permisos nuevo ON nuevo.nombre = 'reservas_ver'
WHERE anterior.nombre = 'ventas_ver'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT rp.rol_id, nuevo.id
FROM roles_permisos rp
JOIN permisos anterior ON anterior.id = rp.permiso_id
JOIN permisos nuevo ON nuevo.nombre = 'reservas_crear'
WHERE anterior.nombre = 'ventas_crear'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT rp.rol_id, nuevo.id
FROM roles_permisos rp
JOIN permisos anterior ON anterior.id = rp.permiso_id
JOIN permisos nuevo ON nuevo.nombre = 'reservas_gestionar'
WHERE anterior.nombre = 'ventas_gestionar'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

DELETE FROM roles_permisos rp
USING permisos p
WHERE rp.permiso_id = p.id
  AND p.nombre IN ('ventas_ver', 'ventas_crear', 'ventas_gestionar');

DELETE FROM permisos
WHERE nombre IN ('ventas_ver', 'ventas_crear', 'ventas_gestionar');

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'reservas_ver'
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
JOIN permisos p ON p.nombre = 'reservas_crear'
WHERE r.codigo IN (
  'admin', 'gerencia_financiera', 'gerencia_contable', 'gerencia_ventas',
  'gerencia_proyectos', 'contabilidad_jefe', 'contabilidad_asistente',
  'tesoreria_encargado', 'tesoreria_auxiliar', 'asistencia'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'reservas_gestionar'
WHERE r.codigo IN (
  'admin', 'gerencia_financiera', 'gerencia_contable', 'gerencia_ventas', 'gerencia_proyectos'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

COMMIT;
