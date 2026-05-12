ALTER TABLE IF EXISTS public.centros_costo
    ADD COLUMN IF NOT EXISTS rol_aprobador_id integer;

ALTER TABLE IF EXISTS public.centros_costo
    ALTER COLUMN usuario_aprobador_id DROP NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.centros_costo
        WHERE num_nonnulls(usuario_aprobador_id, rol_aprobador_id) <> 1
    ) THEN
        RAISE EXCEPTION 'La migracion 20260511_0006 encontro centros_costo sin un aprobador valido (usuario o rol, pero no ambos).';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'centros_costo_aprobador_check'
          AND conrelid = 'public.centros_costo'::regclass
    ) THEN
        ALTER TABLE public.centros_costo
            ADD CONSTRAINT centros_costo_aprobador_check
            CHECK (num_nonnulls(usuario_aprobador_id, rol_aprobador_id) = 1);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'centros_costo_rol_aprobador_id_fkey'
          AND conrelid = 'public.centros_costo'::regclass
    ) THEN
        ALTER TABLE public.centros_costo
            ADD CONSTRAINT centros_costo_rol_aprobador_id_fkey
            FOREIGN KEY (rol_aprobador_id)
            REFERENCES public.roles(id)
            ON DELETE NO ACTION;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_centros_costo_aprobador_rol
    ON public.centros_costo(rol_aprobador_id);

ALTER TABLE IF EXISTS public.tramites_pago_documentos_aprobadores
    ADD COLUMN IF NOT EXISTS rol_aprobador_id integer;

ALTER TABLE IF EXISTS public.tramites_pago_documentos_aprobadores
    ADD COLUMN IF NOT EXISTS rol_aprobador_codigo character varying(100);

ALTER TABLE IF EXISTS public.tramites_pago_documentos_aprobadores
    ADD COLUMN IF NOT EXISTS rol_aprobador_nombre character varying(150);

ALTER TABLE IF EXISTS public.tramites_pago_documentos_aprobadores
    ADD COLUMN IF NOT EXISTS decision_usuario_id integer;

ALTER TABLE IF EXISTS public.tramites_pago_documentos_aprobadores
    ADD COLUMN IF NOT EXISTS decision_usuario_nombre character varying(150);

ALTER TABLE IF EXISTS public.tramites_pago_documentos_aprobadores
    ADD COLUMN IF NOT EXISTS decision_usuario_email character varying(255);

ALTER TABLE IF EXISTS public.tramites_pago_documentos_aprobadores
    ALTER COLUMN usuario_aprobador_id DROP NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tramites_pago_documentos_aprobadores
        WHERE num_nonnulls(usuario_aprobador_id, rol_aprobador_id) <> 1
    ) THEN
        RAISE EXCEPTION 'La migracion 20260511_0006 encontro tramites_pago_documentos_aprobadores sin un aprobador valido (usuario o rol, pero no ambos).';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (
            SELECT tramite_id, factura_id, rol_aprobador_id
            FROM public.tramites_pago_documentos_aprobadores
            WHERE usuario_aprobador_id IS NULL
              AND rol_aprobador_id IS NOT NULL
            GROUP BY tramite_id, factura_id, rol_aprobador_id
            HAVING COUNT(*) > 1
        ) duplicated_roles
    ) THEN
        RAISE EXCEPTION 'La migracion 20260511_0006 detecto aprobadores por rol duplicados en tramites_pago_documentos_aprobadores.';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tramites_pago_documentos_aprobadores_aprobador_check'
          AND conrelid = 'public.tramites_pago_documentos_aprobadores'::regclass
    ) THEN
        ALTER TABLE public.tramites_pago_documentos_aprobadores
            ADD CONSTRAINT tramites_pago_documentos_aprobadores_aprobador_check
            CHECK (num_nonnulls(usuario_aprobador_id, rol_aprobador_id) = 1);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tramites_pago_documentos_aprobadores_rol_aprobador_id_fkey'
          AND conrelid = 'public.tramites_pago_documentos_aprobadores'::regclass
    ) THEN
        ALTER TABLE public.tramites_pago_documentos_aprobadores
            ADD CONSTRAINT tramites_pago_documentos_aprobadores_rol_aprobador_id_fkey
            FOREIGN KEY (rol_aprobador_id)
            REFERENCES public.roles(id)
            ON DELETE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tramites_pago_documentos_aprobadores_decision_usuario_id_fkey'
          AND conrelid = 'public.tramites_pago_documentos_aprobadores'::regclass
    ) THEN
        ALTER TABLE public.tramites_pago_documentos_aprobadores
            ADD CONSTRAINT tramites_pago_documentos_aprobadores_decision_usuario_id_fkey
            FOREIGN KEY (decision_usuario_id)
            REFERENCES public.usuarios(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tramites_pago_doc_aprobadores_rol
    ON public.tramites_pago_documentos_aprobadores(rol_aprobador_id);

CREATE INDEX IF NOT EXISTS idx_tramites_pago_doc_aprobadores_decision_usuario
    ON public.tramites_pago_documentos_aprobadores(decision_usuario_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tramites_pago_doc_aprobadores_rol_unique
    ON public.tramites_pago_documentos_aprobadores(tramite_id, factura_id, rol_aprobador_id)
    WHERE usuario_aprobador_id IS NULL AND rol_aprobador_id IS NOT NULL;

WITH role_snapshot_source AS (
    SELECT DISTINCT
        td.tramite_id,
        td.factura_id,
        NULLIF(linea->>'rol_aprobador_id', '')::integer AS rol_aprobador_id,
        COALESCE(
            NULLIF(BTRIM(COALESCE(linea->>'rol_aprobador_codigo', '')), ''),
            r.codigo
        ) AS rol_aprobador_codigo,
        COALESCE(
            NULLIF(BTRIM(COALESCE(linea->>'rol_aprobador_nombre', '')), ''),
            r.nombre
        ) AS rol_aprobador_nombre
    FROM public.tramites_pago_documentos td
    JOIN public.facturas_contabilizacion fc
      ON fc.factura_id = td.factura_id
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(fc.metadata->'centros_costo_lineas', '[]'::jsonb)) AS linea
    LEFT JOIN public.roles r
      ON r.id = NULLIF(linea->>'rol_aprobador_id', '')::integer
    WHERE NULLIF(linea->>'rol_aprobador_id', '') ~ '^[0-9]+$'
)
INSERT INTO public.tramites_pago_documentos_aprobadores (
    tramite_id,
    factura_id,
    usuario_aprobador_id,
    usuario_aprobador_nombre,
    usuario_aprobador_email,
    rol_aprobador_id,
    rol_aprobador_codigo,
    rol_aprobador_nombre
)
SELECT
    source.tramite_id,
    source.factura_id,
    NULL::integer AS usuario_aprobador_id,
    NULL::character varying(150) AS usuario_aprobador_nombre,
    NULL::character varying(255) AS usuario_aprobador_email,
    source.rol_aprobador_id,
    source.rol_aprobador_codigo,
    source.rol_aprobador_nombre
FROM role_snapshot_source source
WHERE NOT EXISTS (
    SELECT 1
    FROM public.tramites_pago_documentos_aprobadores existing
    WHERE existing.tramite_id = source.tramite_id
      AND existing.factura_id = source.factura_id
      AND existing.usuario_aprobador_id IS NULL
      AND existing.rol_aprobador_id = source.rol_aprobador_id
);
