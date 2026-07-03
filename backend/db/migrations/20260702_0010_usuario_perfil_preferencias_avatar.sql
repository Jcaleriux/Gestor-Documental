CREATE TABLE IF NOT EXISTS public.usuarios_preferencias
(
    usuario_id integer NOT NULL,
    theme_mode character varying(20) NOT NULL DEFAULT 'light',
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_preferencias_pkey PRIMARY KEY (usuario_id),
    CONSTRAINT usuarios_preferencias_theme_mode_check CHECK (theme_mode IN ('light', 'dark')),
    CONSTRAINT usuarios_preferencias_usuario_id_fkey FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.usuarios_avatar
(
    usuario_id integer NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    ruta_archivo text NOT NULL,
    mime_type character varying(100) NOT NULL,
    tamanio_bytes integer NOT NULL,
    hash_sha256 character varying(128) NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_avatar_pkey PRIMARY KEY (usuario_id),
    CONSTRAINT usuarios_avatar_tamanio_bytes_check CHECK (tamanio_bytes >= 0),
    CONSTRAINT usuarios_avatar_usuario_id_fkey FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.usuarios_perfil_historial
(
    id serial NOT NULL,
    usuario_id integer NOT NULL,
    actor_usuario_id integer,
    actor_email character varying(255),
    accion character varying(80) NOT NULL,
    detalles jsonb,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_perfil_historial_pkey PRIMARY KEY (id),
    CONSTRAINT usuarios_perfil_historial_usuario_id_fkey FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT usuarios_perfil_historial_actor_usuario_id_fkey FOREIGN KEY (actor_usuario_id)
        REFERENCES public.usuarios (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_usuarios_perfil_historial_usuario
    ON public.usuarios_perfil_historial(usuario_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_usuarios_perfil_historial_actor
    ON public.usuarios_perfil_historial(actor_usuario_id, creado_en DESC);
