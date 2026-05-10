-- Tabla de sociedades
CREATE TABLE IF NOT EXISTS sociedades (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE,
  nombre_proyecto VARCHAR(150),
  razon_social VARCHAR(255) NOT NULL,
  cedula_juridica VARCHAR(20) UNIQUE NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed inicial de sociedades
INSERT INTO sociedades (codigo, nombre_proyecto, razon_social, cedula_juridica)
VALUES
  ('PULPERIA-LA-ESQUINA', 'PULPERIA LA ESQUINA', 'DENIA MARIA CALERO JIMENEZ', '602320335')
ON CONFLICT (cedula_juridica) DO NOTHING;
