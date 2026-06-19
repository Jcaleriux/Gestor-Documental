-- Seed permisos segun REQUERIMIENTOS.md
INSERT INTO permisos (nombre, descripcion)
VALUES
  ('acceso_total', 'Acceso total a la aplicacion.'),
  ('sociedades_todas', 'Puede operar sobre todas las sociedades.'),
  ('sociedades_asignadas', 'Puede operar solo sobre sociedades asignadas.'),
  ('sociedades_administrar', 'Puede crear, editar y desactivar sociedades.'),
  ('usuarios_administrar', 'Puede crear, editar y desactivar usuarios y grupos.'),
  ('documentos_ver', 'Puede visualizar documentos.'),
  ('documentos_descargar', 'Puede descargar documentos.'),
  ('documentos_subir', 'Puede subir documentos.'),
  ('documentos_comentar', 'Puede agregar comentarios.'),
  ('documentos_contabilizar', 'Puede contabilizar documentos.'),
  ('documentos_tramitar_pago', 'Puede tramitar documentos para pago.'),
  ('documentos_aprobar_gerencia', 'Puede aprobar/rechazar en etapa de gerencia.'),
  ('documentos_aprobar_gerencia_contable', 'Puede aprobar/rechazar en etapa de gerencia contable.'),
  ('documentos_aprobar_gerencia_financiera', 'Puede aprobar/rechazar en etapa de gerencia financiera.'),
  ('documentos_firmar_autorizar', 'Puede firmar y autorizar documentos.'),
  ('documentos_marcar_pagado', 'Puede marcar documentos como pagados.'),
  ('auditoria_ver', 'Puede consultar el log de auditoria.'),
  ('reservas_ver', 'Puede consultar reservas por sociedad.'),
  ('reservas_crear', 'Puede crear nuevas reservas.'),
  ('reservas_gestionar', 'Puede cancelar, cerrar y trasladar reservas.')
ON CONFLICT (nombre) DO UPDATE
SET descripcion = EXCLUDED.descripcion;

-- Seed roles segun REQUERIMIENTOS.md
INSERT INTO roles (codigo, nombre, descripcion, nivel_jerarquia)
VALUES
  ('admin', 'Administrador', 'Acceso total a la aplicacion.', 100),
  ('gerencia_financiera', 'Gerencia financiera', 'Acceso a todas las sociedades.', 90),
  ('gerencia_contable', 'Gerencia contable', 'Acceso a sociedades asignadas y aprobacion contable.', 85),
  ('gerencia_construccion', 'Gerencia construccion', 'Acceso a sociedades asignadas.', 80),
  ('gerencia_presupuesto', 'Gerencia presupuesto', 'Acceso a sociedades asignadas.', 80),
  ('gerencia_mercadeo', 'Gerencia mercadeo', 'Acceso a sociedades asignadas.', 80),
  ('gerencia_ventas', 'Gerencia ventas', 'Acceso a sociedades asignadas.', 80),
  ('gerencia_infraestructura', 'Gerencia infraestructura', 'Acceso a sociedades asignadas.', 80),
  ('gerencia_proyectos', 'Gerencia proyectos', 'Acceso a sociedades asignadas.', 80),
  ('contabilidad_jefe', 'Contabilidad jefe', 'Acceso a todas las sociedades.', 70),
  ('contabilidad_asistente', 'Contabilidad asistente', 'Acceso a sociedades asignadas.', 60),
  ('tesoreria_encargado', 'Tesoreria encargado', 'Acceso a todas las sociedades.', 70),
  ('tesoreria_auxiliar', 'Tesoreria auxiliar', 'Acceso a sociedades asignadas.', 60),
  ('proveeduria', 'Proveeduria', 'Acceso a sociedades asignadas.', 60),
  ('asistencia', 'Asistencia', 'Acceso a sociedades asignadas.', 50),
  ('personalizado', 'Personalizado', 'Acceso a sociedades asignadas con permisos configurables.', 40)
ON CONFLICT (codigo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    nivel_jerarquia = EXCLUDED.nivel_jerarquia;

-- Base: todos ven, descargan, suben y comentan
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'documentos_ver'
WHERE r.codigo IN (
  'admin', 'gerencia_financiera', 'gerencia_contable', 'gerencia_construccion',
  'gerencia_presupuesto', 'gerencia_mercadeo', 'gerencia_ventas', 'gerencia_infraestructura',
  'gerencia_proyectos', 'contabilidad_jefe', 'contabilidad_asistente', 'tesoreria_encargado',
  'tesoreria_auxiliar', 'proveeduria', 'asistencia', 'personalizado'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'documentos_descargar'
WHERE r.codigo IN (
  'admin', 'gerencia_financiera', 'gerencia_contable', 'gerencia_construccion',
  'gerencia_presupuesto', 'gerencia_mercadeo', 'gerencia_ventas', 'gerencia_infraestructura',
  'gerencia_proyectos', 'contabilidad_jefe', 'contabilidad_asistente', 'tesoreria_encargado',
  'tesoreria_auxiliar', 'proveeduria', 'asistencia', 'personalizado'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'documentos_subir'
WHERE r.codigo IN (
  'admin', 'gerencia_financiera', 'gerencia_contable', 'gerencia_construccion',
  'gerencia_presupuesto', 'gerencia_mercadeo', 'gerencia_ventas', 'gerencia_infraestructura',
  'gerencia_proyectos', 'contabilidad_jefe', 'contabilidad_asistente', 'tesoreria_encargado',
  'tesoreria_auxiliar', 'proveeduria', 'asistencia', 'personalizado'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'documentos_comentar'
WHERE r.codigo IN (
  'admin', 'gerencia_financiera', 'gerencia_contable', 'gerencia_construccion',
  'gerencia_presupuesto', 'gerencia_mercadeo', 'gerencia_ventas', 'gerencia_infraestructura',
  'gerencia_proyectos', 'contabilidad_jefe', 'contabilidad_asistente', 'tesoreria_encargado',
  'tesoreria_auxiliar', 'proveeduria', 'asistencia', 'personalizado'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Alcance por sociedades
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'sociedades_todas'
WHERE r.codigo IN ('admin', 'gerencia_financiera', 'contabilidad_jefe', 'tesoreria_encargado')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'sociedades_asignadas'
WHERE r.codigo IN (
  'gerencia_contable', 'gerencia_construccion', 'gerencia_presupuesto', 'gerencia_mercadeo',
  'gerencia_ventas', 'gerencia_infraestructura', 'gerencia_proyectos', 'contabilidad_asistente',
  'tesoreria_auxiliar', 'proveeduria', 'asistencia', 'personalizado'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Administracion de usuarios (admin, gerencias y jefaturas)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'usuarios_administrar'
WHERE r.codigo IN (
  'admin', 'gerencia_financiera', 'gerencia_contable', 'gerencia_construccion',
  'gerencia_presupuesto', 'gerencia_mercadeo', 'gerencia_ventas', 'gerencia_infraestructura',
  'gerencia_proyectos', 'contabilidad_jefe', 'tesoreria_encargado'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Administracion de sociedades
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'sociedades_administrar'
WHERE r.codigo = 'admin'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Flujo operativo
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'documentos_contabilizar'
WHERE r.codigo IN ('contabilidad_jefe', 'contabilidad_asistente')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'documentos_tramitar_pago'
WHERE r.codigo IN ('tesoreria_encargado', 'tesoreria_auxiliar')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'documentos_aprobar_gerencia'
WHERE r.codigo IN (
  'gerencia_construccion', 'gerencia_presupuesto', 'gerencia_mercadeo',
  'gerencia_ventas', 'gerencia_infraestructura', 'gerencia_proyectos'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'documentos_aprobar_gerencia_contable'
WHERE r.codigo IN ('gerencia_contable')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'documentos_aprobar_gerencia_financiera'
WHERE r.codigo IN ('gerencia_financiera')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'documentos_firmar_autorizar'
WHERE r.codigo IN (
  'gerencia_financiera', 'gerencia_contable', 'gerencia_construccion', 'gerencia_presupuesto',
  'gerencia_mercadeo', 'gerencia_ventas', 'gerencia_infraestructura', 'gerencia_proyectos'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'documentos_marcar_pagado'
WHERE r.codigo IN ('gerencia_financiera')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Auditoria
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'auditoria_ver'
WHERE r.codigo IN (
  'admin', 'gerencia_financiera', 'gerencia_contable', 'gerencia_construccion',
  'gerencia_presupuesto', 'gerencia_mercadeo', 'gerencia_ventas',
  'gerencia_infraestructura', 'gerencia_proyectos', 'contabilidad_jefe',
  'tesoreria_encargado'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Admin con acceso total
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'acceso_total'
WHERE r.codigo = 'admin'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Reservas
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'reservas_ver'
WHERE r.codigo IN (
  'admin', 'gerencia_financiera', 'gerencia_contable', 'gerencia_construccion',
  'gerencia_presupuesto', 'gerencia_mercadeo', 'gerencia_ventas',
  'gerencia_infraestructura', 'gerencia_proyectos', 'contabilidad_jefe',
  'contabilidad_asistente', 'tesoreria_encargado', 'tesoreria_auxiliar',
  'asistencia', 'personalizado'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'reservas_crear'
WHERE r.codigo IN (
  'admin', 'gerencia_financiera', 'gerencia_contable', 'gerencia_ventas',
  'gerencia_proyectos', 'contabilidad_jefe', 'contabilidad_asistente',
  'tesoreria_encargado', 'tesoreria_auxiliar', 'asistencia'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'reservas_gestionar'
WHERE r.codigo IN (
  'admin', 'gerencia_financiera', 'gerencia_contable', 'gerencia_ventas', 'gerencia_proyectos'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Seed usuarios base: 1 usuario por rol (excepto personalizado)
-- La password inicial corresponde al hash bcrypt de `Novogar2026!`.
-- Debe rotarse antes de usar cualquier entorno compartido o expuesto.
WITH seed_defaults AS (
  SELECT '$2b$12$xdaV21ddpyjSymqzYuDnSuN7Ggj0Gf1fvpLCPVPVbpj9Mtg3aXR8W'::text AS password_hash
),
usuarios_seed AS (
  SELECT *
  FROM (VALUES
    ('admin@novogar.local', 'Administrador', 'admin'),
    ('gerencia.financiera@novogar.local', 'Gerencia Financiera', 'gerencia_financiera'),
    ('gerencia.contable@novogar.local', 'Gerencia Contable', 'gerencia_contable'),
    ('gerencia.construccion@novogar.local', 'Gerencia Construccion', 'gerencia_construccion'),
    ('gerencia.presupuesto@novogar.local', 'Gerencia Presupuesto', 'gerencia_presupuesto'),
    ('gerencia.mercadeo@novogar.local', 'Gerencia Mercadeo', 'gerencia_mercadeo'),
    ('gerencia.ventas@novogar.local', 'Gerencia Ventas', 'gerencia_ventas'),
    ('gerencia.infraestructura@novogar.local', 'Gerencia Infraestructura', 'gerencia_infraestructura'),
    ('gerencia.proyectos@novogar.local', 'Gerencia Proyectos', 'gerencia_proyectos'),
    ('contabilidad.jefe@novogar.local', 'Contabilidad Jefe', 'contabilidad_jefe'),
    ('contabilidad.asistente@novogar.local', 'Contabilidad Asistente', 'contabilidad_asistente'),
    ('tesoreria.encargado@novogar.local', 'Tesoreria Encargado', 'tesoreria_encargado'),
    ('tesoreria.auxiliar@novogar.local', 'Tesoreria Auxiliar', 'tesoreria_auxiliar'),
    ('proveeduria@novogar.local', 'Proveeduria', 'proveeduria'),
    ('asistencia@novogar.local', 'Asistencia', 'asistencia')
  ) AS t(email, nombre, rol_codigo)
)
INSERT INTO usuarios (email, nombre, password, rol_id, activo)
SELECT us.email, us.nombre, sd.password_hash, r.id, true
FROM usuarios_seed us
CROSS JOIN seed_defaults sd
JOIN roles r ON r.codigo = us.rol_codigo
ON CONFLICT (email) DO UPDATE
SET nombre = EXCLUDED.nombre,
    rol_id = EXCLUDED.rol_id,
    activo = true;

-- Seed asignaciones iniciales usuario-sociedad para roles con acceso por sociedades asignadas
WITH sociedades_base AS (
  SELECT id
  FROM sociedades
  WHERE activo = true
  ORDER BY id ASC
  LIMIT 3
),
usuarios_objetivo AS (
  SELECT u.id AS usuario_id
  FROM usuarios u
  JOIN roles r ON r.id = u.rol_id
  WHERE r.codigo IN (
    'gerencia_contable', 'gerencia_construccion', 'gerencia_presupuesto',
    'gerencia_mercadeo', 'gerencia_ventas', 'gerencia_infraestructura',
    'gerencia_proyectos', 'contabilidad_asistente', 'tesoreria_auxiliar',
    'proveeduria', 'asistencia', 'personalizado'
  )
)
INSERT INTO usuarios_sociedades (usuario_id, sociedad_id)
SELECT uo.usuario_id, sb.id
FROM usuarios_objetivo uo
CROSS JOIN sociedades_base sb
ON CONFLICT (usuario_id, sociedad_id) DO NOTHING;







