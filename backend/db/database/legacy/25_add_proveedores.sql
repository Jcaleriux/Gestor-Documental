CREATE TABLE IF NOT EXISTS proveedores (
  id SERIAL PRIMARY KEY,
  identificacion_tipo VARCHAR(20),
  identificacion_numero VARCHAR(50) NOT NULL,
  identificacion_numero_normalizado VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  nombre_comercial VARCHAR(255),
  correo_electronico VARCHAR(255),
  telefono_codigo_pais VARCHAR(10),
  telefono_numero VARCHAR(50),
  creado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proveedores_nombre
  ON proveedores(nombre);
