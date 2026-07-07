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

