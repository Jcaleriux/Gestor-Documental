-- Actualizar tablas para agregar ruta_xml y ruta_pdf
ALTER TABLE facturas ADD COLUMN ruta_xml VARCHAR(255);
ALTER TABLE facturas ADD COLUMN ruta_pdf VARCHAR(255);
ALTER TABLE notas_credito ADD COLUMN ruta_xml VARCHAR(255);
ALTER TABLE notas_credito ADD COLUMN ruta_pdf VARCHAR(255);
ALTER TABLE mensajes_hacienda ADD COLUMN ruta_xml VARCHAR(255);
