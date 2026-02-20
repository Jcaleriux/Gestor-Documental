-- Tabla para comentarios de documentos
CREATE TABLE IF NOT EXISTS comentarios_documento (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  usuario VARCHAR(100) NOT NULL,
  texto TEXT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comentarios_factura ON comentarios_documento(factura_id);

-- Tabla para versiones de documentos
CREATE TABLE IF NOT EXISTS versiones_documento (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  usuario VARCHAR(100) NOT NULL,
  cambios TEXT,
  ruta_archivo VARCHAR(255),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_versiones_factura ON versiones_documento(factura_id);

-- Tabla para auditoría (historial de cambios)
CREATE TABLE IF NOT EXISTS auditoria (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  accion VARCHAR(50) NOT NULL,
  usuario VARCHAR(100) NOT NULL,
  detalles JSONB,
  ip_address VARCHAR(45),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_factura ON auditoria(factura_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria(accion);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(creado_en);

-- Tabla para estados de documento (para tracking de cambios de estado)
CREATE TABLE IF NOT EXISTS estados_documento (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50) NOT NULL,
  usuario VARCHAR(100) NOT NULL,
  motivo TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_estados_factura ON estados_documento(factura_id);
CREATE INDEX IF NOT EXISTS idx_estados_fecha ON estados_documento(creado_en);
