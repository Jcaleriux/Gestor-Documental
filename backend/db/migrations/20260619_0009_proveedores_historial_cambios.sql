CREATE TABLE IF NOT EXISTS public.proveedores_historial_cambios
(
    id serial NOT NULL,
    proveedor_id integer NOT NULL,
    campo character varying(80) NOT NULL,
    valor_anterior text,
    valor_nuevo text,
    origen character varying(120),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT proveedores_historial_cambios_pkey PRIMARY KEY (id),
    CONSTRAINT proveedores_historial_cambios_proveedor_id_fkey FOREIGN KEY (proveedor_id)
        REFERENCES public.proveedores (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_proveedores_historial_cambios_proveedor
    ON public.proveedores_historial_cambios(proveedor_id, creado_en DESC);
