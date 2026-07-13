# Matriz de Permisos (Base)

## Objetivo
Documentar acciones y endpoints con el permiso minimo requerido.

## Permisos definidos hoy
1. `ACCESO_TOTAL`
2. `SOCIEDADES_TODAS`
3. `SOCIEDADES_ASIGNADAS`
4. `SOCIEDADES_ADMINISTRAR`
5. `USUARIOS_ADMINISTRAR`
6. `DOCUMENTOS_VER`
7. `DOCUMENTOS_DESCARGAR`
8. `DOCUMENTOS_SUBIR`
9. `DOCUMENTOS_COMENTAR`
10. `DOCUMENTOS_CONTABILIZAR`
11. `DOCUMENTOS_TRAMITAR_PAGO`
12. `DOCUMENTOS_APROBAR_GERENCIA`
13. `DOCUMENTOS_APROBAR_GERENCIA_CONTABLE`
14. `DOCUMENTOS_APROBAR_GERENCIA_FINANCIERA`
15. `DOCUMENTOS_FIRMAR_AUTORIZAR`
16. `DOCUMENTOS_MARCAR_PAGADO`
17. `AUDITORIA_VER`
18. `RESERVAS_VER`
19. `RESERVAS_CREAR`
20. `RESERVAS_GESTIONAR`

Fuente: `backend/domain/permissions.js`

## Matriz accion -> permiso
| Modulo | Accion | Endpoint ejemplo | Permiso |
|---|---|---|---|
| Auth | Login | `POST /api/auth/login` | Publico |
| Sociedades | Listar sociedades | `GET /api/sociedades` | `SOCIEDADES_TODAS` o `SOCIEDADES_ASIGNADAS` |
| Facturas | Listar/consultar | `GET /api/facturas` | `DOCUMENTOS_VER` |
| Facturas | Ver manifest/pdf/xml | `/api/facturas/:id/manifest`, `/api/files/*` | `DOCUMENTOS_VER` o `DOCUMENTOS_DESCARGAR` |
| Notas/Tiquetes | Listar | `/api/notas-credito`, `/api/tiquetes-electronicos` | `DOCUMENTOS_VER` |
| Comentarios | Crear comentario | `POST /api/facturas/:id/comentarios` | `DOCUMENTOS_COMENTAR` |
| Contabilizacion | Guardar contabilizacion | `POST /api/facturas/:id/contabilizacion` | `DOCUMENTOS_CONTABILIZAR` |
| Tramites | Crear tramite | `POST /api/tramites-pago` | `DOCUMENTOS_TRAMITAR_PAGO` |
| Tramites | Cambiar estado tramite | `POST /api/tramites-pago/:id/estado` | `WORKFLOW_PERMISSIONS` |
| Tramites | Decision por etapa | `POST /api/tramites-pago/:id/documentos/:facturaId/decision` | Permiso por etapa |
| Auditoria | Ver auditoria | `/api/facturas/:id/auditoria` | `AUDITORIA_VER` |
| Usuarios | Administrar usuarios/roles/permisos | `/api/usuarios`, `/api/roles`, `/api/permisos`, `/api/roles/:id/permisos` | `USUARIOS_ADMINISTRAR` |

## Politica de autorizacion recomendada
1. Cada endpoint define permiso explicito en route.
2. Cada use case vuelve a validar reglas de negocio sensibles.
3. Cada accion escribe auditoria cuando altere estado o datos relevantes.

## Pendientes de negocio
1. Matriz final Rol x Permiso x Sociedad.
2. Reglas de delegacion jerarquica.
3. Permisos de override y trazabilidad reforzada.
4. Excepciones de permisos por usuario si el negocio confirma ese modelo.

## Definition of Done
1. Ningun endpoint sin permiso.
2. Ninguna accion critica sin auditoria.
3. Pruebas de autorizacion por rol y por sociedad.
