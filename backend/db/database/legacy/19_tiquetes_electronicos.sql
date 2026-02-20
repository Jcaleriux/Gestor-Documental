CREATE TABLE IF NOT EXISTS tiquetes_electronicos (
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
  sociedad_id INTEGER,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS tiquetes_electronicos
  ADD CONSTRAINT fk_tiquetes_sociedad FOREIGN KEY (sociedad_id)
  REFERENCES sociedades (id) MATCH SIMPLE
  ON UPDATE NO ACTION
  ON DELETE NO ACTION;

CREATE INDEX IF NOT EXISTS idx_tiquetes_sociedad
  ON tiquetes_electronicos(sociedad_id);
CREATE INDEX IF NOT EXISTS idx_tiquetes_fecha
  ON tiquetes_electronicos(fecha_emision);
