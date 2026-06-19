ALTER TABLE IF EXISTS public.facturas_contabilizacion
    ADD COLUMN IF NOT EXISTS asiento character varying(50);

CREATE INDEX IF NOT EXISTS idx_facturas_contabilizacion_asiento
    ON public.facturas_contabilizacion(asiento);
