CREATE TABLE IF NOT EXISTS public.facturas_contabilizacion_documentos_respaldo
(
    id serial NOT NULL,
    factura_id integer NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    ruta_pdf text NOT NULL,
    metadata jsonb,
    creado_por character varying(100),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT facturas_contabilizacion_documentos_respaldo_pkey PRIMARY KEY (id)
);

ALTER TABLE IF EXISTS public.facturas_contabilizacion_documentos_respaldo
    ADD CONSTRAINT facturas_contabilizacion_documentos_respaldo_factura_id_fkey FOREIGN KEY (factura_id)
    REFERENCES public.facturas (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_facturas_conta_docs_respaldo_factura
    ON public.facturas_contabilizacion_documentos_respaldo(factura_id);
