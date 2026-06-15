# Guia Tecnica

Fecha de referencia: 2026-06-01.

Esta guia es el punto de entrada tecnico para entender, cambiar y validar el sistema sin depender de conocimiento tribal. Complementa la documentacion vigente de `docs/arquitectura/`, `docs/operaciones/` y `docs/producto/`.

## Documentos Tecnicos

- `endpoints.md`: catalogo de endpoints, permisos, requests, errores y tests relacionados.
- `flujos_estado.md`: mapa de estados de facturas, tramites de pago, decisiones por documento y tesoreria.

## Estado General De Documentacion Tecnica

El proyecto ya tiene una base documental util:

- `README.md`: onboarding general, comandos, entorno, scripts y endpoints base.
- `docs/arquitectura/estado_actual.md`: mapa vigente de capas, modulos y modelo de datos.
- `docs/arquitectura/02_asis_inventario.md`: inventario tecnico AS-IS y brechas.
- `docs/arquitectura/06_matriz_permisos.md`: permisos por accion y endpoint ejemplo.
- `docs/operaciones/`: despliegue, preproduccion local, readiness, backup y rollback.
- `backend/db/migrations/README.md`: criterio para migraciones versionadas.
- `backend/db/database/README.md`: baseline SQL canonico.

La brecha principal era la falta de una guia tecnica unificada para desarrolladores. Este documento cubre esa entrada y deja pendientes concretos para completar documentacion mas formal.

## Stack Y Entrypoints

| Area | Tecnologia | Entrypoint |
| --- | --- | --- |
| Backend | Node.js + Express + CommonJS | `backend/server.js`, `backend/app.js` |
| Frontend | React + Vite | `frontend/src/main.jsx`, `frontend/src/App.jsx` |
| DB | PostgreSQL + SQL directo | `backend/db/index.js`, `backend/db/database/00_init.sql` |
| Tests backend | Jest + Supertest | `backend/__tests__/` |
| Tests frontend | Node test runner + helpers propios | `frontend/tests/` |
| Operacion documental | Filesystem local | `documentos/`, rutas resueltas desde `FACTURAS_BASE_DIR` |

## Capas Backend

El backend sigue una separacion por responsabilidad:

- `routes/`: contratos HTTP, middleware de auth/permisos y adaptacion de request/response.
- `services/`: casos de uso y orquestacion de reglas de negocio.
- `repositories/`: SQL directo y acceso a PostgreSQL.
- `domain/`: constantes, estados, permisos e invariantes de dominio.
- `mappers/`: traduccion de filas o payloads hacia formas de respuesta.
- `middleware/`: auth, permisos, validacion, rate limit, 404 y errores.
- `config/`: variables de entorno, runtime y metadata de release.
- `db/`: conexion, transacciones, schema baseline y migraciones.
- `scripts/`: tareas operativas, diagnosticos, importacion, release y preproduccion.

Regla practica: las rutas no deben acumular negocio, los repositorios no deben decidir flujo, y el frontend no debe duplicar reglas sensibles del backend.

## Modulos Funcionales Vigentes

- Autenticacion y sesion: JWT, login, `me`, expiracion y rate limit.
- Seguridad: usuarios, roles, permisos, sociedades asignadas.
- Documentos fiscales: facturas, notas de credito, tiquetes electronicos y mensajes de Hacienda.
- Contabilizacion: datos contables, proveedores, centros de costo, respaldos, retenciones y pagos.
- Tramites de pago: creacion, documentos, aprobaciones, tesoreria, caratulas, retenciones e historial.
- Reservas: unidades, operaciones, documentos e historial.
- Reporteria: dashboard, totales por moneda, colas de trabajo y exportaciones.
- Trazabilidad: auditoria, comentarios, versiones e historiales de estado.

## Contratos HTTP

Los endpoints se registran desde `backend/app.js`.

Publicos:

- `GET /api`
- `GET /api/health`
- `GET /api/release-info`
- `POST /api/auth/login`

Protegidos por `requireAuth` y `loadUserPermissions`:

- `/api/auth/me`
- `/api/comentarios`
- `/api/versiones`
- `/api/auditoria`
- `/api/tramites-pago`
- `/api/contabilizacion`
- `/api/dashboard`
- `/api/facturas`
- `/api/files`
- `/api/usuarios`
- `/api/sociedades`
- `/api/proveedores`
- `/api/centros-costo`
- `/api/tablas-pago`
- `/api/ordenes-compra`
- `/api/reservas`

Para cambios de contrato:

1. Revisar la ruta en `backend/routes/`.
2. Revisar permisos en `backend/domain/permissions.js` y `docs/arquitectura/06_matriz_permisos.md`.
3. Revisar tests existentes del modulo.
4. No cambiar payloads, codigos HTTP ni permisos como parte de un refactor interno.
5. Si el cambio es intencional, documentarlo en el README del modulo o en una ficha de producto/arquitectura.

Pendiente recomendado: generar una especificacion OpenAPI o, al menos, catalogos por modulo con request/response de endpoints criticos.

## Frontend

La app usa `React Router` con lazy loading desde `frontend/src/App.jsx`. Mantener ese patron para pantallas grandes.

Estructura principal:

- `src/components/`: pantallas y componentes visuales.
- `src/components/common/`: componentes reutilizables de UI.
- `src/hooks/`: estado, carga de datos, acciones y view models por modulo.
- `src/services/`: clientes HTTP y adaptadores de transporte.
- `src/utils/`: formateadores, permisos, estados y helpers transversales.
- `src/styles/`: tokens, layout, responsive y estilos por modulo.
- `tests/`: pruebas de hooks, view models, utils y helpers de pantalla.

Regla practica: las pantallas deben renderizar y coordinar vista; transporte, parsing, filtros complejos y acciones deben vivir en hooks, services o helpers.

## Datos Y Migraciones

Fuentes actuales:

- Baseline runtime: `backend/db/database/00_init.sql`.
- Seed: `backend/db/database/seed.sql`.
- Migraciones nuevas: `backend/db/migrations/`.
- Tracking: tabla `schema_migrations`.
- SQL legacy: `backend/db/database/legacy/`.

Reglas:

- No usar `pnpm --dir backend run db:reset` en entornos compartidos o con datos reales.
- Todo cambio incremental de schema debe ir como migracion versionada nueva.
- Si toca dinero, revisar `docs/principios_transversales.md`.
- Si toca permisos o sociedades, revisar `docs/arquitectura/06_matriz_permisos.md`.
- Si toca rutas operativas de archivos, revisar `FACTURAS_BASE_DIR` y `backend/utils/documentPaths.js`.

## Configuracion

El backend carga variables desde:

1. entorno del proceso,
2. `backend/.env`,
3. `backend/.env.local`,
4. archivo explicito via `NOVOGAR_ENV_FILE`.

Archivos base:

- `backend/.env.example`
- `backend/.env.production.example`
- `backend/config/env.js`
- `backend/config/runtime.js`

En `production`, `JWT_SECRET` y `CORS_ALLOWED_ORIGINS` deben estar definidos de forma explicita.

## Validacion Recomendada

Para una revision general:

```bash
pnpm install
pnpm --dir backend run check:release
pnpm --dir backend run test:ci
pnpm --dir frontend run lint
pnpm --dir frontend run build
pnpm --dir frontend run test:ci
```

Para cambios acotados, preferir pruebas dirigidas del modulo tocado y luego un build o check de release si el cambio afecta integracion.

## Reglas De Cambio Seguro

- Mantener terminos de dominio canonicos en espanol: `factura`, `tramite`, `sociedad`, `proveedor`, `notaCredito`, `retencion`, `moneda`.
- Usar ingles para helpers y abstracciones tecnicas reutilizables.
- No renombrar rutas, tablas, payloads ni columnas solo por traduccion.
- No mezclar montos de monedas distintas en consultas, UI, reportes ni dashboards.
- No mover reglas de negocio criticas al frontend.
- No tocar `documentos/`, `archivos/` ni scripts destructivos sin instruccion explicita.
- Preferir refactors por slice vertical y con tests enfocados.

## Pendientes De Documentacion Tecnica

Prioridad alta:

- Evolucionar el catalogo de endpoints a OpenAPI si el proyecto requiere contratos ejecutables o generacion de clientes.
- Diagrama C4 o Mermaid de contexto/contenedores vigente, no historico.
- Mantener el mapa de flujos de estado sincronizado cuando cambien reglas de `facturas`, `tramites_pago` o aprobaciones por etapa.

Prioridad media:

- ADRs para decisiones con impacto amplio: migraciones versionadas, storage filesystem, JWT/localStorage y separacion estado documental/workflow.
- Guia de observabilidad esperada: logs, correlation id, metricas y errores operativos.
- Guia de troubleshooting para problemas frecuentes de DB, CORS, documentos y permisos.

Prioridad baja:

- Catalogo de scripts operativos con nivel de riesgo.
- Diccionario tecnico de tablas principales y sus relaciones.
- Mapa de pruebas por modulo y comando recomendado.
