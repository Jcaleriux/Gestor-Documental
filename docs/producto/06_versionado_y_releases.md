# Versionado Y Releases

## Objetivo

Definir como se versiona `Proyecto Novogar`, que significa `release` vs `deployment`, y que es obligatorio antes del primer paso a produccion.

## Estado actual

Hoy el repo ya tiene bases importantes:

- CI base
- migraciones versionadas
- checklist de despliegue
- backlog y epics de producto

Pero hasta este momento no existia una fuente oficial y unica para la version del producto.

## Release vs Deployment

Las dos palabras son correctas, pero no significan exactamente lo mismo.

### Release

Es la version del software que declaras como candidata o oficial para un entorno.

Ejemplo:

- `1.0.0` es la primera release oficial de Novogar.

### Deployment

Es el acto de instalar o publicar una release en un entorno.

Ejemplos:

- deployment a `staging`
- deployment a `produccion`

## Regla practica

En conversaciones de producto y versionado:

- usa `release`

En conversaciones de ejecucion operativa:

- usa `deployment`

## Politica de versionado

Novogar usara `SemVer`.

### MAJOR

Sube cuando hay cambios no compatibles o cambios operativos grandes.

Ejemplos:

- contratos incompatibles
- permisos incompatibles
- cambios de flujo que rompen expectativas previas

### MINOR

Sube cuando agregas capacidad nueva sin romper compatibilidad.

Ejemplos:

- nuevas pantallas
- nuevas reporterias
- nuevas acciones compatibles

### PATCH

Sube cuando corriges bugs o haces hardening sin romper comportamiento esperado.

Ejemplos:

- bugfixes
- refactors seguros
- mejoras de release o CI

## Fuente de verdad de la version

La version oficial del producto se define en:

1. `VERSION`
2. `CHANGELOG.md`
3. Git tag `vX.Y.Z`

Las versiones de `backend/package.json` y `frontend/package.json` deben alinearse cuando corresponda, pero no son la fuente principal de gobierno.

## Primera version objetivo

La primera version objetivo de Novogar para release a produccion es:

- `1.0.0`

El tag oficial asociado sera:

- `v1.0.0`

## Cuando se crea el tag Git

No conviene crear el tag final demasiado temprano.

La regla recomendada es:

- definir hoy la version objetivo en el repo,
- preparar todo para esa release,
- y crear el tag Git `v1.0.0` en el commit exacto que realmente se libera o se confirma como desplegado a produccion.

## Respuesta corta para este caso

Si, puedes definir desde ya que la primera release oficial sera `1.0.0`.

Pero el tag `v1.0.0` deberia crearse:

- cuando ya sepas cual commit exacto es el que se va a liberar,
- idealmente al cerrar el release o inmediatamente despues de confirmar el deployment exitoso a produccion.

## Obligatorio Antes Del Primer Release A Produccion

Esto es lo minimo que deberia cumplirse antes del primer release o primer deployment productivo.

### Gobierno de release

- `VERSION` definido
- `CHANGELOG.md` actualizado
- criterio claro de version (`1.0.0` en este caso)
- commit objetivo identificado
- tag Git listo para crearse sobre ese commit

### Calidad tecnica

- backend `check:release` en verde
- backend tests relevantes en verde
- frontend lint en verde
- frontend build en verde
- frontend tests CI en verde

### Base de datos

- `db:migrate:status` sin sorpresas
- migraciones pendientes revisadas
- evidencia de backup antes del primer deployment productivo
- criterio claro de rollback

### Seguridad y entorno

- `JWT_SECRET` real
- credenciales reales de DB
- rutas operativas correctas para documentos
- no usar credenciales dev
- no usar `db:reset`

### Operacion

- smoke checks basicos definidos y ejecutados
- logs observables
- commit y version registrados
- evidencia de que frontend y backend liberados son compatibles

## Pendientes Que Siguen Vivos Antes Del Primer Paso A Produccion

Hoy, despues de esta Fase 1, siguen siendo importantes:

- exponer version y commit del deploy en un punto visible o tecnico
- dejar runbook mas explicito de backup y rollback
- ampliar smoke checks por dominio critico
- confirmar entorno real y secretos definitivos

## Flujo Recomendado De Release

1. Elegir alcance estable.
2. Confirmar version objetivo.
3. Actualizar `VERSION` y `CHANGELOG.md`.
4. Ejecutar CI y checks de release.
5. Confirmar migraciones y backup.
6. Hacer deployment.
7. Ejecutar smoke checks.
8. Registrar version, commit y migraciones aplicadas.
9. Crear o confirmar tag Git sobre el commit liberado.

## Referencias

- `../../CHANGELOG.md`
- `../../VERSION`
- `../proceso_crecimiento_scrum.md`
- `../despliegue_checklist.md`
