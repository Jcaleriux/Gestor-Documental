-- Tramites de pago (workflow de tesoreria/gerencias)
CREATE TABLE IF NOT EXISTS tramites_pago (
  id SERIAL PRIMARY KEY,
  sociedad_id INTEGER REFERENCES sociedades(id),
  estado VARCHAR(50) NOT NULL DEFAULT 'en_aprobacion_gerencia',
  creado_por VARCHAR(100),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tramites_pago_documentos (
  id SERIAL PRIMARY KEY,
  tramite_id INTEGER NOT NULL REFERENCES tramites_pago(id) ON DELETE CASCADE,
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  estado_gerencia VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  estado_gerencia_contable VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  estado_financiero VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  motivo_gerencia TEXT,
  motivo_gerencia_contable TEXT,
  motivo_financiero TEXT,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tramite_id, factura_id)
);

CREATE TABLE IF NOT EXISTS tramites_pago_historial (
  id SERIAL PRIMARY KEY,
  tramite_id INTEGER NOT NULL REFERENCES tramites_pago(id) ON DELETE CASCADE,
  factura_id INTEGER REFERENCES facturas(id) ON DELETE SET NULL,
  accion VARCHAR(50) NOT NULL,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50),
  usuario VARCHAR(100),
  motivo TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tramites_pago_sociedad
  ON tramites_pago(sociedad_id);
CREATE INDEX IF NOT EXISTS idx_tramites_pago_estado
  ON tramites_pago(estado);
CREATE INDEX IF NOT EXISTS idx_tramites_pago_docs_tramite
  ON tramites_pago_documentos(tramite_id);
CREATE INDEX IF NOT EXISTS idx_tramites_pago_docs_factura
  ON tramites_pago_documentos(factura_id);
CREATE INDEX IF NOT EXISTS idx_tramites_pago_historial_tramite
  ON tramites_pago_historial(tramite_id);
