CREATE TABLE sociedades (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE,
  nombre_proyecto VARCHAR(150),
  razon_social VARCHAR(255) NOT NULL,
  cedula_juridica VARCHAR(20) UNIQUE NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE facturas (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(50) UNIQUE NOT NULL,
  consecutivo VARCHAR(20) NOT NULL,
  fecha_emision TIMESTAMP,

  emisor JSONB NOT NULL,
  receptor JSONB NOT NULL,
  resumen JSONB NOT NULL,
  xml_completo JSONB NOT NULL,

  ruta_xml VARCHAR(255),
  ruta_pdf VARCHAR(255),

  sociedad_id INTEGER NOT NULL REFERENCES sociedades(id),

  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE notas_credito (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(50) UNIQUE NOT NULL,
  fecha_emision TIMESTAMP,

  -- Factura afectada
  factura_id INTEGER
    REFERENCES facturas(id),

  referencia JSONB NOT NULL,
  xml_completo JSONB NOT NULL,

  ruta_xml VARCHAR(255),
  ruta_pdf VARCHAR(255),

  sociedad_id INTEGER NOT NULL REFERENCES sociedades(id),

  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE mensajes_hacienda (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(50) UNIQUE NOT NULL,
  mensaje SMALLINT,
  estado VARCHAR(50),
  detalle TEXT,
  xml_completo JSONB NOT NULL,

  ruta_xml VARCHAR(255),

  sociedad_id INTEGER NOT NULL REFERENCES sociedades(id),
  factura_id INTEGER REFERENCES facturas(id) ON DELETE SET NULL,

  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT mensajes_hacienda_mensaje_check CHECK (mensaje IN (1,2,3))
);
CREATE TABLE tiquetes_electronicos (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(50) UNIQUE NOT NULL,
  consecutivo VARCHAR(20) NOT NULL,
  fecha_emision TIMESTAMP,

  emisor JSONB NOT NULL,
  receptor JSONB NOT NULL,
  resumen JSONB NOT NULL,
  xml_completo JSONB NOT NULL,

  ruta_xml VARCHAR(255),
  ruta_pdf VARCHAR(255),
  sociedad_id INTEGER NOT NULL REFERENCES sociedades(id),

  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contabilizacion de facturas
CREATE TABLE facturas_contabilizacion (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER NOT NULL UNIQUE
    REFERENCES facturas(id) ON DELETE CASCADE,
  fecha_documento DATE,
  fecha_vencimiento DATE,
  fecha_contabilizacion DATE DEFAULT CURRENT_DATE,
  plazo_credito INTEGER,
  retencion NUMERIC(18,4),
  descuento NUMERIC(18,4),
  anticipo_aplicado NUMERIC(18,4),
  centro_costo VARCHAR(100),
  cuenta_contable VARCHAR(100),
  proyecto VARCHAR(150),
  orden_compra VARCHAR(100),
  numero_proveedor VARCHAR(50),
  notas TEXT,
  metadata JSONB,
  creado_por VARCHAR(100),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tramites de pago
CREATE TABLE tramites_pago (
  id SERIAL PRIMARY KEY,
  sociedad_id INTEGER REFERENCES sociedades(id),
  estado VARCHAR(50) NOT NULL DEFAULT 'en_aprobacion_gerencia',
  creado_por VARCHAR(100),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE tramites_pago_documentos (
  id SERIAL PRIMARY KEY,
  tramite_id INTEGER NOT NULL
    REFERENCES tramites_pago(id) ON DELETE CASCADE,
  factura_id INTEGER NOT NULL
    REFERENCES facturas(id) ON DELETE CASCADE,
  estado_tesoreria VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  motivo_tesoreria TEXT,
  estado_gerencia VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  estado_gerencia_contable VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  estado_financiero VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  motivo_gerencia TEXT,
  motivo_gerencia_contable TEXT,
  motivo_financiero TEXT,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tramite_id, factura_id)
);
CREATE TABLE tramites_pago_historial (
  id SERIAL PRIMARY KEY,
  tramite_id INTEGER NOT NULL
    REFERENCES tramites_pago(id) ON DELETE CASCADE,
  factura_id INTEGER
    REFERENCES facturas(id) ON DELETE SET NULL,
  accion VARCHAR(50) NOT NULL,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50),
  usuario VARCHAR(100),
  motivo TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
