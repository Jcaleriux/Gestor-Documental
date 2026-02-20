-- Quitar indice UNIQUE sobre facturas.consecutivo si existe
DROP INDEX IF EXISTS idx_facturas_consecutivo;
