-- Agregar columna estado a la tabla facturas si no existe
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'no_contabilizado';

-- Crear índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);

