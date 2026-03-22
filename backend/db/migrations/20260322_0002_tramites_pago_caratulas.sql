CREATE TABLE IF NOT EXISTS public.tramites_pago_caratulas
(
    id serial NOT NULL,
    tramite_id integer NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    ruta_archivo text NOT NULL,
    estado character varying(30) NOT NULL DEFAULT 'pendiente'::character varying,
    fecha_ejecucion date,
    sociedad_nombre_raw character varying(255),
    sociedad_identificacion_raw character varying(50),
    moneda character varying(10),
    total_paginas integer NOT NULL DEFAULT 0,
    warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
    parsed_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    cargado_por character varying(100),
    procesado_en timestamp without time zone,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tramites_pago_caratulas_pkey PRIMARY KEY (id),
    CONSTRAINT tramites_pago_caratulas_tramite_id_key UNIQUE (tramite_id),
    CONSTRAINT tramites_pago_caratulas_estado_check CHECK (estado IN (
      'pendiente',
      'procesada',
      'requiere_revision',
      'sociedad_invalida',
      'error'
    )),
    CONSTRAINT tramites_pago_caratulas_total_paginas_check CHECK (total_paginas >= 0)
);

ALTER TABLE IF EXISTS public.tramites_pago_caratulas
    ADD CONSTRAINT tramites_pago_caratulas_tramite_id_fkey FOREIGN KEY (tramite_id)
    REFERENCES public.tramites_pago (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tramites_pago_caratulas_estado
    ON public.tramites_pago_caratulas(estado);
