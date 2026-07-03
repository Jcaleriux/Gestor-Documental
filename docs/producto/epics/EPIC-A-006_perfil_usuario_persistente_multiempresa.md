# EPIC-A-006 Perfil De Usuario Persistente Multiempresa

## Estado

Implementado (V1)

## Problema

La aplicacion ya permite una configuracion local basica del usuario, pero esa preferencia vive en el navegador. Eso sirve para validar UX, pero no es suficiente para una plataforma multiempresa:

- la foto y el tema no acompanan al usuario entre computadoras,
- borrar cache o cambiar navegador pierde la configuracion,
- soporte no puede ayudar a gestionar perfiles,
- no hay limites, respaldo ni trazabilidad centralizada,
- y la experiencia se siente menos madura para entornos corporativos.

## Usuario o area afectada

- usuarios operativos de contabilidad, tesoreria, gerencia y administracion
- soporte interno
- administradores del sistema
- operacion multiempresa donde un mismo producto se instala para distintos clientes

## Resultado esperado

Cada usuario debe tener un perfil persistente y portable:

- preferencias guardadas en backend,
- foto de perfil disponible en cualquier dispositivo,
- fallback visual por iniciales si no hay foto,
- validaciones de archivo y permisos,
- auditoria minima de cambios sensibles,
- y capacidad futura para que soporte/admin gestione casos puntuales.

## Alcance

- modelo DB para preferencias de usuario
- endpoints autenticados para leer y actualizar preferencias propias
- persistencia de `theme_mode` para preparar modo claro/oscuro real
- modelo y storage seguro para avatar de usuario
- endpoints para subir, reemplazar, consultar y eliminar avatar propio
- validacion de tipo y tamano de imagen
- procesamiento/normalizacion de imagen a tamanos controlados si la herramienta disponible lo permite
- integracion frontend del modal actual con backend
- fallback localStorage durante migracion o si el backend no devuelve preferencias
- pruebas backend/frontend focalizadas
- documentacion tecnica minima de contrato y almacenamiento

## Fuera de alcance

- implementar toda la paleta de modo oscuro en esta misma iniciativa
- guardar imagenes como base64 en columnas de DB
- permitir que cualquier usuario edite perfiles de terceros
- redisenar autenticacion o sesiones
- cambiar permisos existentes fuera de lo necesario para perfil propio/admin
- mover storage operativo existente de documentos o facturas

## Modulos impactados

- backend de usuarios/auth
- DB y migraciones versionadas
- repositorio/servicio de usuarios o preferencias
- storage de archivos para avatar
- middleware de permisos/autenticacion
- frontend del sidebar y modal de configuracion
- pruebas de frontend y backend
- documentacion tecnica de endpoints

## Riesgos

- almacenar datos personales sin limites claros
- subir archivos grandes o tipos no soportados
- mezclar imagenes de perfil con storage documental operativo
- romper compatibilidad con usuarios que ya tienen preferencias locales
- exponer fotos de perfil sin control de autorizacion
- introducir migraciones o cambios de contrato sin validacion suficiente

## Dependencias

- decision de ubicacion de storage para avatares, separada de `documentos/` y `archivos/` operativos
- convencion final de nombres genericos SendaDocs para evitar rastros de cliente
- politica minima de permisos para perfil propio y administracion
- migracion versionada aprobada
- criterio de tamano maximo y tipos permitidos para imagenes

## Historias candidatas

- FEAT-009: Perfil de usuario persistente con preferencias y avatar sincronizados
- HIST-009A: Persistir preferencias propias de usuario en backend
- HIST-009B: Subir, reemplazar y eliminar avatar propio con storage seguro
- HIST-009C: Integrar modal de configuracion con backend manteniendo fallback local
- HIST-009D: Gestion administrativa minima para remover avatar de un usuario

## Criterios de exito

- un usuario cambia tema o foto y lo ve igual al iniciar sesion desde otro navegador
- borrar cache local no elimina preferencias persistidas en backend
- la app sigue mostrando iniciales si no hay avatar o si falla la carga
- el backend rechaza archivos no imagen, demasiado grandes o fuera de permisos
- la DB guarda metadata/ruta del avatar, no base64 de la imagen
- existe migracion versionada y rollback razonable
- hay pruebas para endpoints, permisos, validaciones y helpers frontend
- soporte/admin puede remover una foto si el rol autorizado existe para esa operacion

## Implementacion V1

- Migracion: `backend/db/migrations/20260702_0010_usuario_perfil_preferencias_avatar.sql`
- Tablas: `usuarios_preferencias`, `usuarios_avatar`, `usuarios_perfil_historial`
- Endpoints propios: `GET/PATCH /api/me/preferencias`, `GET/PUT/DELETE /api/me/avatar`
- Endpoint admin: `DELETE /api/usuarios/:id/avatar` protegido por `usuarios_administrar`
- Storage: `perfiles/avatares/{usuario_id}/`, separado de `documentos/` y `archivos/`
- Frontend: modal de configuracion sincronizado con backend y fallback local si falla la carga remota
- Validacion: frontend completo, backend completo, lint y build de produccion

## Referencias

- `docs/producto/04_backlog.md`
- `docs/producto/trello_pendiente.md`
- `frontend/src/components/UserSettingsModal.jsx`
- `frontend/src/utils/userPreferences.js`
