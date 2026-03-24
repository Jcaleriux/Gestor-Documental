ALTER TABLE IF EXISTS public.tramites_pago_documentos
    ADD COLUMN IF NOT EXISTS monto_pago_programado numeric(18, 4);
