-- Init schema for fresh installs
BEGIN;

CREATE TABLE IF NOT EXISTS public.auditoria
(
    id serial NOT NULL,
    factura_id integer NOT NULL,
    accion character varying(50) NOT NULL,
    usuario character varying(100) NOT NULL,
    detalles jsonb,
    ip_address character varying(45),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auditoria_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.comentarios_documento
(
    id serial NOT NULL,
    factura_id integer NOT NULL,
    usuario character varying(100) NOT NULL,
    texto text NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT comentarios_documento_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.estados_documento
(
    id serial NOT NULL,
    factura_id integer NOT NULL,
    estado_anterior character varying(50),
    estado_nuevo character varying(50) NOT NULL,
    usuario character varying(100) NOT NULL,
    motivo text,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT estados_documento_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.facturas
(
    id serial NOT NULL,
    clave character varying(50) NOT NULL,
    consecutivo character varying(20) NOT NULL,
    fecha_emision timestamp without time zone,
    emisor jsonb NOT NULL,
    receptor jsonb NOT NULL,
    resumen jsonb NOT NULL,
    xml_completo jsonb NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ruta_pdf character varying(255),
    estado character varying(50) NOT NULL DEFAULT 'no_contabilizado'::character varying,
    sociedad_id integer NOT NULL,
    ruta_xml character varying(255),
    CONSTRAINT facturas_pkey PRIMARY KEY (id),
    CONSTRAINT facturas_clave_key UNIQUE (clave),
    CONSTRAINT facturas_estado_check CHECK (estado IN (
      'no_contabilizado',
      'en_revision',
      'en_tramite_pago',
      'contabilizado',
      'pagado_parcialmente',
      'rechazado',
      'pagado'
    ))
);

CREATE TABLE IF NOT EXISTS public.facturas_contabilizacion
(
    id serial NOT NULL,
    factura_id integer NOT NULL,
    fecha_documento date,
    fecha_vencimiento date,
    fecha_contabilizacion date DEFAULT CURRENT_DATE,
    plazo_credito integer,
    retencion numeric(18, 4),
    retencion_pagada numeric(18, 4) NOT NULL DEFAULT 0,
    estado_retencion character varying(20) NOT NULL DEFAULT 'pagada'::character varying,
    fecha_ultimo_pago_retencion date,
    descuento numeric(18, 4),
    anticipo_aplicado numeric(18, 4),
    centro_costo character varying(100),
    cuenta_contable character varying(100),
    proyecto character varying(150),
    orden_compra character varying(100),
    numero_proveedor character varying(50),
    proveedor_id integer,
    tabla_pago_id integer,
    nota_credito_id integer,
    monto_nota_credito numeric(18, 4),
    notas text,
    metadata jsonb,
    creado_por character varying(100),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT facturas_contabilizacion_pkey PRIMARY KEY (id),
    CONSTRAINT facturas_contabilizacion_factura_id_key UNIQUE (factura_id),
    CONSTRAINT facturas_contabilizacion_estado_retencion_check CHECK (estado_retencion IN (
      'pendiente',
      'parcial',
      'pagada'
    )),
    CONSTRAINT facturas_contabilizacion_retencion_pagada_check CHECK (retencion_pagada >= 0)
);

CREATE TABLE IF NOT EXISTS public.facturas_retenciones_pagos
(
    id serial NOT NULL,
    factura_id integer NOT NULL,
    contabilizacion_id integer,
    monto numeric(18, 4) NOT NULL,
    fecha_pago date NOT NULL DEFAULT CURRENT_DATE,
    usuario character varying(100),
    notas text,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT facturas_retenciones_pagos_pkey PRIMARY KEY (id),
    CONSTRAINT facturas_retenciones_pagos_monto_check CHECK (monto > 0)
);

CREATE TABLE IF NOT EXISTS public.facturas_pagos
(
    id serial NOT NULL,
    factura_id integer NOT NULL,
    tramite_id integer,
    monto numeric(18, 4) NOT NULL,
    fecha_pago date NOT NULL DEFAULT CURRENT_DATE,
    usuario character varying(100),
    notas text,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT facturas_pagos_pkey PRIMARY KEY (id),
    CONSTRAINT facturas_pagos_monto_check CHECK (monto > 0)
);


CREATE TABLE IF NOT EXISTS public.mensajes_hacienda
(
    id serial NOT NULL,
    clave character varying(50) NOT NULL,
    mensaje smallint,
    estado character varying(50),
    detalle text,
    xml_completo jsonb NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sociedad_id integer NOT NULL,
    ruta_xml character varying(255),
    factura_id integer,
    CONSTRAINT mensajes_hacienda_pkey PRIMARY KEY (id),
    CONSTRAINT mensajes_hacienda_clave_key UNIQUE (clave),
    CONSTRAINT mensajes_hacienda_mensaje_check CHECK (mensaje IN (1,2,3))
);

CREATE TABLE IF NOT EXISTS public.notas_credito
(
    id serial NOT NULL,
    clave character varying(50) NOT NULL,
    fecha_emision timestamp without time zone,
    factura_id integer,
    referencia jsonb NOT NULL,
    xml_completo jsonb NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ruta_pdf character varying(255),
    sociedad_id integer NOT NULL,
    ruta_xml character varying(255),
    CONSTRAINT notas_credito_pkey PRIMARY KEY (id),
    CONSTRAINT notas_credito_clave_key UNIQUE (clave)
);

CREATE TABLE IF NOT EXISTS public.tiquetes_electronicos
(
    id serial NOT NULL,
    clave character varying(50) NOT NULL,
    consecutivo character varying(20) NOT NULL,
    fecha_emision timestamp without time zone,
    emisor jsonb NOT NULL,
    receptor jsonb NOT NULL,
    resumen jsonb NOT NULL,
    xml_completo jsonb NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ruta_pdf character varying(255),
    sociedad_id integer NOT NULL,
    ruta_xml character varying(255),
    CONSTRAINT tiquetes_electronicos_pkey PRIMARY KEY (id),
    CONSTRAINT tiquetes_electronicos_clave_key UNIQUE (clave)
);

CREATE TABLE IF NOT EXISTS public.permisos
(
    id serial NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT permisos_pkey PRIMARY KEY (id),
    CONSTRAINT permisos_nombre_key UNIQUE (nombre)
);

CREATE TABLE IF NOT EXISTS public.roles
(
    id serial NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(255),
    nivel_jerarquia integer DEFAULT 0,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    codigo character varying(50),
    CONSTRAINT roles_pkey PRIMARY KEY (id),
    CONSTRAINT roles_codigo_key UNIQUE (codigo),
    CONSTRAINT roles_nombre_key UNIQUE (nombre)
);

CREATE TABLE IF NOT EXISTS public.roles_permisos
(
    id serial NOT NULL,
    rol_id integer NOT NULL,
    permiso_id integer NOT NULL,
    CONSTRAINT roles_permisos_pkey PRIMARY KEY (id),
    CONSTRAINT roles_permisos_rol_id_permiso_id_key UNIQUE (rol_id, permiso_id)
);

CREATE TABLE IF NOT EXISTS public.sociedades
(
    id serial NOT NULL,
    codigo character varying(20),
    nombre_proyecto character varying(150),
    razon_social character varying(255) NOT NULL,
    cedula_juridica character varying(20) NOT NULL,
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sociedades_pkey PRIMARY KEY (id),
    CONSTRAINT sociedades_cedula_juridica_key UNIQUE (cedula_juridica),
    CONSTRAINT sociedades_codigo_key UNIQUE (codigo)
);

CREATE TABLE IF NOT EXISTS public.proveedores
(
    id serial NOT NULL,
    sociedad_id integer NOT NULL,
    identificacion_tipo character varying(20),
    identificacion_numero character varying(50) NOT NULL,
    identificacion_numero_normalizado character varying(50) NOT NULL,
    nombre character varying(255) NOT NULL,
    nombre_comercial character varying(255),
    correo_electronico character varying(255),
    telefono_codigo_pais character varying(10),
    telefono_numero character varying(50),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT proveedores_pkey PRIMARY KEY (id),
    CONSTRAINT proveedores_sociedad_id_identificacion_numero_normalizado_key UNIQUE (sociedad_id, identificacion_numero_normalizado)
);

CREATE TABLE IF NOT EXISTS public.tablas_pago
(
    id serial NOT NULL,
    sociedad_id integer NOT NULL,
    proveedor_id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    ruta_pdf character varying(255) NOT NULL,
    creado_por character varying(100),
    metadata jsonb,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tablas_pago_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tramites_pago
(
    id serial NOT NULL,
    sociedad_id integer NOT NULL,
    estado character varying(50) NOT NULL DEFAULT 'en_aprobacion_gerencia'::character varying,
    creado_por character varying(100),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tramites_pago_pkey PRIMARY KEY (id),
    CONSTRAINT tramites_pago_estado_check CHECK (estado IN (
      'en_aprobacion_gerencia',
      'en_aprobacion_gerencia_contable',
      'en_aprobacion_gerencia_financiera',
      'en_revision_tesoreria',
      'en_revision_tesoreria_1',
      'en_revision_tesoreria_2',
      'pagado',
      'cancelado'
    ))
);

CREATE TABLE IF NOT EXISTS public.tramites_pago_documentos
(
    id serial NOT NULL,
    tramite_id integer NOT NULL,
    factura_id integer NOT NULL,
    estado_gerencia character varying(20) NOT NULL DEFAULT 'pendiente'::character varying,
    estado_gerencia_contable character varying(20) NOT NULL DEFAULT 'pendiente'::character varying,
    estado_financiero character varying(20) NOT NULL DEFAULT 'pendiente'::character varying,
    motivo_gerencia text,
    motivo_gerencia_contable text,
    motivo_financiero text,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    estado_tesoreria character varying(20) NOT NULL DEFAULT 'pendiente'::character varying,
    motivo_tesoreria text,
    CONSTRAINT tramites_pago_documentos_pkey PRIMARY KEY (id),
    CONSTRAINT tramites_pago_documentos_tramite_id_factura_id_key UNIQUE (tramite_id, factura_id),
    CONSTRAINT tramites_pago_documentos_estado_gerencia_check CHECK (estado_gerencia IN (
      'pendiente',
      'aprobado',
      'rechazado'
    )),
    CONSTRAINT tramites_pago_documentos_estado_gerencia_contable_check CHECK (estado_gerencia_contable IN (
      'pendiente',
      'aprobado',
      'rechazado'
    )),
    CONSTRAINT tramites_pago_documentos_estado_financiero_check CHECK (estado_financiero IN (
      'pendiente',
      'aprobado',
      'rechazado'
    )),
    CONSTRAINT tramites_pago_documentos_estado_tesoreria_check CHECK (estado_tesoreria IN (
      'pendiente',
      'excluido',
      'reenviado',
      'reincluido'
    ))
);

CREATE TABLE IF NOT EXISTS public.tramites_pago_retenciones
(
    id serial NOT NULL,
    tramite_id integer NOT NULL,
    factura_id integer NOT NULL,
    proveedor_id integer,
    monto_retencion numeric(18, 4) NOT NULL,
    estado_tesoreria character varying(20) NOT NULL DEFAULT 'pendiente'::character varying,
    motivo_tesoreria text,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tramites_pago_retenciones_pkey PRIMARY KEY (id),
    CONSTRAINT tramites_pago_retenciones_tramite_id_factura_id_key UNIQUE (tramite_id, factura_id),
    CONSTRAINT tramites_pago_retenciones_monto_check CHECK (monto_retencion > 0),
    CONSTRAINT tramites_pago_retenciones_estado_tesoreria_check CHECK (estado_tesoreria IN (
      'pendiente',
      'excluido',
      'reenviado',
      'reincluido'
    ))
);

CREATE TABLE IF NOT EXISTS public.tramites_pago_historial
(
    id serial NOT NULL,
    tramite_id integer NOT NULL,
    factura_id integer,
    accion character varying(50) NOT NULL,
    estado_anterior character varying(50),
    estado_nuevo character varying(50),
    usuario character varying(100),
    motivo text,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tramites_pago_historial_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.usuarios
(
    id serial NOT NULL,
    email character varying(100) NOT NULL,
    nombre character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    rol_id integer NOT NULL,
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_pkey PRIMARY KEY (id),
    CONSTRAINT usuarios_email_key UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS public.usuarios_sociedades
(
    id serial NOT NULL,
    usuario_id integer NOT NULL,
    sociedad_id integer NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_sociedades_pkey PRIMARY KEY (id),
    CONSTRAINT usuarios_sociedades_usuario_id_sociedad_id_key UNIQUE (usuario_id, sociedad_id)
);

CREATE TABLE IF NOT EXISTS public.versiones_documento
(
    id serial NOT NULL,
    factura_id integer NOT NULL,
    numero integer NOT NULL,
    usuario character varying(100) NOT NULL,
    cambios text,
    ruta_archivo character varying(255),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT versiones_documento_pkey PRIMARY KEY (id),
    CONSTRAINT versiones_documento_factura_numero_key UNIQUE (factura_id, numero)
);

ALTER TABLE IF EXISTS public.auditoria
    ADD CONSTRAINT auditoria_factura_id_fkey FOREIGN KEY (factura_id)
    REFERENCES public.facturas (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_auditoria_factura
    ON public.auditoria(factura_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion
    ON public.auditoria(accion);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha
    ON public.auditoria(creado_en);

ALTER TABLE IF EXISTS public.comentarios_documento
    ADD CONSTRAINT comentarios_documento_factura_id_fkey FOREIGN KEY (factura_id)
    REFERENCES public.facturas (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_comentarios_factura
    ON public.comentarios_documento(factura_id);

ALTER TABLE IF EXISTS public.estados_documento
    ADD CONSTRAINT estados_documento_factura_id_fkey FOREIGN KEY (factura_id)
    REFERENCES public.facturas (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_estados_factura
    ON public.estados_documento(factura_id);
CREATE INDEX IF NOT EXISTS idx_estados_fecha
    ON public.estados_documento(creado_en);

ALTER TABLE IF EXISTS public.facturas
    ADD CONSTRAINT fk_facturas_sociedad FOREIGN KEY (sociedad_id)
    REFERENCES public.sociedades (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_facturas_sociedad
    ON public.facturas(sociedad_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado
    ON public.facturas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha
    ON public.facturas(fecha_emision);

ALTER TABLE IF EXISTS public.facturas_contabilizacion
    ADD CONSTRAINT facturas_contabilizacion_factura_id_fkey FOREIGN KEY (factura_id)
    REFERENCES public.facturas (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.facturas_contabilizacion
    ADD CONSTRAINT facturas_contabilizacion_proveedor_id_fkey FOREIGN KEY (proveedor_id)
    REFERENCES public.proveedores (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.facturas_contabilizacion
    ADD CONSTRAINT facturas_contabilizacion_tabla_pago_id_fkey FOREIGN KEY (tabla_pago_id)
    REFERENCES public.tablas_pago (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.facturas_contabilizacion
    ADD CONSTRAINT facturas_contabilizacion_nota_credito_id_fkey FOREIGN KEY (nota_credito_id)
    REFERENCES public.notas_credito (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS facturas_contabilizacion_factura_id_key
    ON public.facturas_contabilizacion(factura_id);
CREATE INDEX IF NOT EXISTS idx_facturas_contabilizacion_proveedor
    ON public.facturas_contabilizacion(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_facturas_contabilizacion_tabla_pago
    ON public.facturas_contabilizacion(tabla_pago_id);
CREATE INDEX IF NOT EXISTS idx_facturas_contabilizacion_nota_credito
    ON public.facturas_contabilizacion(nota_credito_id);
CREATE INDEX IF NOT EXISTS idx_facturas_contabilizacion_estado_retencion
    ON public.facturas_contabilizacion(estado_retencion);

ALTER TABLE IF EXISTS public.facturas_retenciones_pagos
    ADD CONSTRAINT facturas_retenciones_pagos_factura_id_fkey FOREIGN KEY (factura_id)
    REFERENCES public.facturas (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.facturas_retenciones_pagos
    ADD CONSTRAINT facturas_retenciones_pagos_contabilizacion_id_fkey FOREIGN KEY (contabilizacion_id)
    REFERENCES public.facturas_contabilizacion (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_facturas_retenciones_pagos_factura
    ON public.facturas_retenciones_pagos(factura_id);
CREATE INDEX IF NOT EXISTS idx_facturas_retenciones_pagos_contabilizacion
    ON public.facturas_retenciones_pagos(contabilizacion_id);
CREATE INDEX IF NOT EXISTS idx_facturas_retenciones_pagos_fecha
    ON public.facturas_retenciones_pagos(fecha_pago);

ALTER TABLE IF EXISTS public.facturas_pagos
    ADD CONSTRAINT facturas_pagos_factura_id_fkey FOREIGN KEY (factura_id)
    REFERENCES public.facturas (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.facturas_pagos
    ADD CONSTRAINT facturas_pagos_tramite_id_fkey FOREIGN KEY (tramite_id)
    REFERENCES public.tramites_pago (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_facturas_pagos_factura
    ON public.facturas_pagos(factura_id);
CREATE INDEX IF NOT EXISTS idx_facturas_pagos_tramite
    ON public.facturas_pagos(tramite_id);
CREATE INDEX IF NOT EXISTS idx_facturas_pagos_fecha
    ON public.facturas_pagos(fecha_pago);

ALTER TABLE IF EXISTS public.mensajes_hacienda
    ADD CONSTRAINT fk_mensajes_sociedad FOREIGN KEY (sociedad_id)
    REFERENCES public.sociedades (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
ALTER TABLE IF EXISTS public.mensajes_hacienda
    ADD CONSTRAINT fk_mensajes_factura FOREIGN KEY (factura_id)
    REFERENCES public.facturas (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_mensajes_sociedad
    ON public.mensajes_hacienda(sociedad_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_estado
    ON public.mensajes_hacienda(estado);
CREATE INDEX IF NOT EXISTS idx_mensajes_factura
    ON public.mensajes_hacienda(factura_id);

ALTER TABLE IF EXISTS public.notas_credito
    ADD CONSTRAINT fk_notas_sociedad FOREIGN KEY (sociedad_id)
    REFERENCES public.sociedades (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_notas_sociedad
    ON public.notas_credito(sociedad_id);

ALTER TABLE IF EXISTS public.notas_credito
    ADD CONSTRAINT notas_credito_factura_id_fkey FOREIGN KEY (factura_id)
    REFERENCES public.facturas (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_notas_credito_factura
    ON public.notas_credito(factura_id);

ALTER TABLE IF EXISTS public.tiquetes_electronicos
    ADD CONSTRAINT fk_tiquetes_sociedad FOREIGN KEY (sociedad_id)
    REFERENCES public.sociedades (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_tiquetes_sociedad
    ON public.tiquetes_electronicos(sociedad_id);
CREATE INDEX IF NOT EXISTS idx_tiquetes_fecha
    ON public.tiquetes_electronicos(fecha_emision);

ALTER TABLE IF EXISTS public.roles_permisos
    ADD CONSTRAINT roles_permisos_permiso_id_fkey FOREIGN KEY (permiso_id)
    REFERENCES public.permisos (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.roles_permisos
    ADD CONSTRAINT roles_permisos_rol_id_fkey FOREIGN KEY (rol_id)
    REFERENCES public.roles (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_roles_permisos_rol
    ON public.roles_permisos(rol_id);

ALTER TABLE IF EXISTS public.proveedores
    ADD CONSTRAINT proveedores_sociedad_id_fkey FOREIGN KEY (sociedad_id)
    REFERENCES public.sociedades (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_proveedores_sociedad
    ON public.proveedores(sociedad_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre
    ON public.proveedores(nombre);
CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_sociedad_identificacion
    ON public.proveedores(sociedad_id, identificacion_numero_normalizado);

ALTER TABLE IF EXISTS public.tablas_pago
    ADD CONSTRAINT tablas_pago_sociedad_id_fkey FOREIGN KEY (sociedad_id)
    REFERENCES public.sociedades (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.tablas_pago
    ADD CONSTRAINT tablas_pago_proveedor_id_fkey FOREIGN KEY (proveedor_id)
    REFERENCES public.proveedores (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tablas_pago_sociedad
    ON public.tablas_pago(sociedad_id);
CREATE INDEX IF NOT EXISTS idx_tablas_pago_proveedor
    ON public.tablas_pago(proveedor_id);

ALTER TABLE IF EXISTS public.tramites_pago
    ADD CONSTRAINT tramites_pago_sociedad_id_fkey FOREIGN KEY (sociedad_id)
    REFERENCES public.sociedades (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_tramites_pago_sociedad
    ON public.tramites_pago(sociedad_id);
CREATE INDEX IF NOT EXISTS idx_tramites_pago_estado
    ON public.tramites_pago(estado);

ALTER TABLE IF EXISTS public.tramites_pago_documentos
    ADD CONSTRAINT tramites_pago_documentos_factura_id_fkey FOREIGN KEY (factura_id)
    REFERENCES public.facturas (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tramites_pago_docs_factura
    ON public.tramites_pago_documentos(factura_id);

ALTER TABLE IF EXISTS public.tramites_pago_documentos
    ADD CONSTRAINT tramites_pago_documentos_tramite_id_fkey FOREIGN KEY (tramite_id)
    REFERENCES public.tramites_pago (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tramites_pago_docs_tramite
    ON public.tramites_pago_documentos(tramite_id);

ALTER TABLE IF EXISTS public.tramites_pago_retenciones
    ADD CONSTRAINT tramites_pago_retenciones_factura_id_fkey FOREIGN KEY (factura_id)
    REFERENCES public.facturas (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.tramites_pago_retenciones
    ADD CONSTRAINT tramites_pago_retenciones_tramite_id_fkey FOREIGN KEY (tramite_id)
    REFERENCES public.tramites_pago (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.tramites_pago_retenciones
    ADD CONSTRAINT tramites_pago_retenciones_proveedor_id_fkey FOREIGN KEY (proveedor_id)
    REFERENCES public.proveedores (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tramites_pago_retenciones_factura
    ON public.tramites_pago_retenciones(factura_id);
CREATE INDEX IF NOT EXISTS idx_tramites_pago_retenciones_tramite
    ON public.tramites_pago_retenciones(tramite_id);
CREATE INDEX IF NOT EXISTS idx_tramites_pago_retenciones_proveedor
    ON public.tramites_pago_retenciones(proveedor_id);

ALTER TABLE IF EXISTS public.tramites_pago_historial
    ADD CONSTRAINT tramites_pago_historial_factura_id_fkey FOREIGN KEY (factura_id)
    REFERENCES public.facturas (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.tramites_pago_historial
    ADD CONSTRAINT tramites_pago_historial_tramite_id_fkey FOREIGN KEY (tramite_id)
    REFERENCES public.tramites_pago (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tramites_pago_historial_tramite
    ON public.tramites_pago_historial(tramite_id);

ALTER TABLE IF EXISTS public.usuarios
    ADD CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id)
    REFERENCES public.roles (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_id
    ON public.usuarios(rol_id);

ALTER TABLE IF EXISTS public.usuarios_sociedades
    ADD CONSTRAINT usuarios_sociedades_usuario_id_fkey FOREIGN KEY (usuario_id)
    REFERENCES public.usuarios (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.usuarios_sociedades
    ADD CONSTRAINT usuarios_sociedades_sociedad_id_fkey FOREIGN KEY (sociedad_id)
    REFERENCES public.sociedades (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_usuarios_sociedades_usuario
    ON public.usuarios_sociedades(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_sociedades_sociedad
    ON public.usuarios_sociedades(sociedad_id);

ALTER TABLE IF EXISTS public.versiones_documento
    ADD CONSTRAINT versiones_documento_factura_id_fkey FOREIGN KEY (factura_id)
    REFERENCES public.facturas (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_versiones_factura
    ON public.versiones_documento(factura_id);

COMMIT;
