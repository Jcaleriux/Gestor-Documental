-- Seed demo opcional: 1 usuario por rol (excepto personalizado).
-- La password inicial corresponde al hash bcrypt de `SendaDocs2026!`.
-- Usar solo para demos o ambientes locales controlados.
WITH seed_defaults AS (
  SELECT '$2b$12$t7ynL35k8I5xk1JB1KRSZO12p5Mo6ozZcK8vpKgAac/4pSnQRaD52'::text AS password_hash
),
usuarios_seed AS (
  SELECT *
  FROM (VALUES
    ('admin@sendadocs.local', 'Administrador', 'admin'),
    ('gerencia.financiera@sendadocs.local', 'Gerencia Financiera', 'gerencia_financiera'),
    ('gerencia.contable@sendadocs.local', 'Gerencia Contable', 'gerencia_contable'),
    ('gerencia.construccion@sendadocs.local', 'Gerencia Construccion', 'gerencia_construccion'),
    ('gerencia.presupuesto@sendadocs.local', 'Gerencia Presupuesto', 'gerencia_presupuesto'),
    ('gerencia.mercadeo@sendadocs.local', 'Gerencia Mercadeo', 'gerencia_mercadeo'),
    ('gerencia.ventas@sendadocs.local', 'Gerencia Ventas', 'gerencia_ventas'),
    ('gerencia.infraestructura@sendadocs.local', 'Gerencia Infraestructura', 'gerencia_infraestructura'),
    ('gerencia.proyectos@sendadocs.local', 'Gerencia Proyectos', 'gerencia_proyectos'),
    ('contabilidad.jefe@sendadocs.local', 'Contabilidad Jefe', 'contabilidad_jefe'),
    ('contabilidad.asistente@sendadocs.local', 'Contabilidad Asistente', 'contabilidad_asistente'),
    ('tesoreria.encargado@sendadocs.local', 'Tesoreria Encargado', 'tesoreria_encargado'),
    ('tesoreria.auxiliar@sendadocs.local', 'Tesoreria Auxiliar', 'tesoreria_auxiliar'),
    ('proveeduria@sendadocs.local', 'Proveeduria', 'proveeduria'),
    ('asistencia@sendadocs.local', 'Asistencia', 'asistencia')
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

-- Asignaciones demo usuario-sociedad para roles con acceso por sociedades asignadas.
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
