-- FACTURAS
CREATE UNIQUE INDEX idx_facturas_clave
ON facturas (clave);

CREATE INDEX idx_facturas_consecutivo
ON facturas (consecutivo);

CREATE INDEX idx_facturas_fecha
ON facturas (fecha_emision);

-- NOTAS DE CRÉDITO
CREATE INDEX idx_notas_credito_factura
ON notas_credito (factura_id);

-- MENSAJES HACIENDA
CREATE INDEX idx_mensajes_estado
ON mensajes_hacienda (estado);
