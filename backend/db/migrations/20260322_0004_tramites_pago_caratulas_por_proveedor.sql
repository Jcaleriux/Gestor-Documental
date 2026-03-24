CREATE TABLE IF NOT EXISTS public.tramites_pago_caratulas_proveedor
(
    id serial NOT NULL,
    tramite_id integer NOT NULL,
    provider_key text NOT NULL,
    proveedor_id integer,
    proveedor_nombre character varying(255) NOT NULL,
    proveedor_identificacion character varying(50),
    provider_raw_name character varying(255),
    provider_raw_identification character varying(50),
    provider_code character varying(50),
    nombre_archivo character varying(255),
    ruta_archivo text,
    attachment_status character varying(30) NOT NULL DEFAULT 'sin_caratula'::character varying,
    attachment_origin character varying(20),
    order_status character varying(30) NOT NULL DEFAULT 'no_requerido'::character varying,
    execution_date date,
    currency character varying(10),
    page_start integer,
    page_end integer,
    page_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
    warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
    group_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    order_confirmed_by character varying(100),
    order_confirmed_at timestamp without time zone,
    attachment_confirmed_by character varying(100),
    attachment_confirmed_at timestamp without time zone,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tramites_pago_caratulas_proveedor_pkey PRIMARY KEY (id),
    CONSTRAINT tramites_pago_caratulas_proveedor_tramite_provider_key_key UNIQUE (tramite_id, provider_key),
    CONSTRAINT tramites_pago_caratulas_proveedor_attachment_status_check CHECK (attachment_status IN (
      'sin_caratula',
      'pendiente_confirmacion',
      'confirmada'
    )),
    CONSTRAINT tramites_pago_caratulas_proveedor_attachment_origin_check CHECK (attachment_origin IS NULL OR attachment_origin IN (
      'auto',
      'manual',
      'huerfana'
    )),
    CONSTRAINT tramites_pago_caratulas_proveedor_order_status_check CHECK (order_status IN (
      'no_requerido',
      'pendiente_confirmacion',
      'confirmado'
    ))
);

ALTER TABLE IF EXISTS public.tramites_pago_caratulas_proveedor
    ADD CONSTRAINT tramites_pago_caratulas_proveedor_tramite_id_fkey FOREIGN KEY (tramite_id)
    REFERENCES public.tramites_pago (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tramites_pago_caratulas_proveedor_tramite
    ON public.tramites_pago_caratulas_proveedor(tramite_id);

CREATE INDEX IF NOT EXISTS idx_tramites_pago_caratulas_proveedor_proveedor_id
    ON public.tramites_pago_caratulas_proveedor(proveedor_id);

CREATE TABLE IF NOT EXISTS public.tramites_pago_caratulas_proveedor_facturas
(
    id serial NOT NULL,
    provider_caratula_id integer NOT NULL,
    factura_id integer NOT NULL,
    sort_index integer NOT NULL,
    order_source character varying(20) NOT NULL DEFAULT 'auto'::character varying,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tramites_pago_caratulas_proveedor_facturas_pkey PRIMARY KEY (id),
    CONSTRAINT tramites_pago_caratulas_proveedor_facturas_provider_factura_key UNIQUE (provider_caratula_id, factura_id),
    CONSTRAINT tramites_pago_caratulas_proveedor_facturas_provider_sort_index_key UNIQUE (provider_caratula_id, sort_index),
    CONSTRAINT tramites_pago_caratulas_proveedor_facturas_sort_index_check CHECK (sort_index > 0),
    CONSTRAINT tramites_pago_caratulas_proveedor_facturas_order_source_check CHECK (order_source IN (
      'auto',
      'manual'
    ))
);

ALTER TABLE IF EXISTS public.tramites_pago_caratulas_proveedor_facturas
    ADD CONSTRAINT tramites_pago_caratulas_proveedor_facturas_provider_caratula_id_fkey FOREIGN KEY (provider_caratula_id)
    REFERENCES public.tramites_pago_caratulas_proveedor (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.tramites_pago_caratulas_proveedor_facturas
    ADD CONSTRAINT tramites_pago_caratulas_proveedor_facturas_factura_id_fkey FOREIGN KEY (factura_id)
    REFERENCES public.facturas (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tramites_pago_caratulas_proveedor_facturas_provider
    ON public.tramites_pago_caratulas_proveedor_facturas(provider_caratula_id);

CREATE INDEX IF NOT EXISTS idx_tramites_pago_caratulas_proveedor_facturas_factura
    ON public.tramites_pago_caratulas_proveedor_facturas(factura_id);

CREATE TABLE IF NOT EXISTS public.tramites_pago_caratulas_huerfanas
(
    id serial NOT NULL,
    tramite_id integer NOT NULL,
    provider_raw_name character varying(255),
    provider_raw_identification character varying(50),
    provider_code character varying(50),
    nombre_archivo character varying(255) NOT NULL,
    ruta_archivo text NOT NULL,
    execution_date date,
    currency character varying(10),
    page_start integer,
    page_end integer,
    page_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
    warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
    group_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    status character varying(20) NOT NULL DEFAULT 'pendiente'::character varying,
    assigned_provider_caratula_id integer,
    assigned_by character varying(100),
    assigned_at timestamp without time zone,
    discarded_by character varying(100),
    discarded_at timestamp without time zone,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tramites_pago_caratulas_huerfanas_pkey PRIMARY KEY (id),
    CONSTRAINT tramites_pago_caratulas_huerfanas_status_check CHECK (status IN (
      'pendiente',
      'asignada',
      'descartada'
    ))
);

ALTER TABLE IF EXISTS public.tramites_pago_caratulas_huerfanas
    ADD CONSTRAINT tramites_pago_caratulas_huerfanas_tramite_id_fkey FOREIGN KEY (tramite_id)
    REFERENCES public.tramites_pago (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.tramites_pago_caratulas_huerfanas
    ADD CONSTRAINT tramites_pago_caratulas_huerfanas_assigned_provider_caratula_id_fkey FOREIGN KEY (assigned_provider_caratula_id)
    REFERENCES public.tramites_pago_caratulas_proveedor (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tramites_pago_caratulas_huerfanas_tramite
    ON public.tramites_pago_caratulas_huerfanas(tramite_id);

CREATE INDEX IF NOT EXISTS idx_tramites_pago_caratulas_huerfanas_status
    ON public.tramites_pago_caratulas_huerfanas(status);
