INSERT INTO permisos (nombre, descripcion)
VALUES ('sociedades_administrar', 'Puede crear, editar y desactivar sociedades.')
ON CONFLICT (nombre) DO UPDATE
SET descripcion = EXCLUDED.descripcion;

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
JOIN permisos p ON p.nombre = 'sociedades_administrar'
WHERE r.codigo = 'admin'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
