# Runbook De Backup Y Rollback

## Objetivo

Dejar un procedimiento claro y repetible para preparar backup y rollback antes de un release o deployment productivo de `Proyecto Novogar`.

Este runbook es la Fase 1 segura:

- explicita el procedimiento,
- agrega un helper no destructivo para preparar el plan,
- y deja comandos concretos para backup, restore y rollback.

No automatiza restores ni despliegues. Eso queda deliberadamente fuera para evitar acciones destructivas por error.

## Referencias

- `docs/operaciones/despliegue_checklist.md`
- `docs/producto/06_versionado_y_releases.md`
- `VERSION`
- `CHANGELOG.md`
- `backend/scripts/release_backup_plan.js`

## Que Cubre Este Runbook

Antes de un deployment productivo, deberias proteger al menos:

1. codigo liberado
2. base de datos
3. filesystem operativo
4. metadata del release

En Novogar, el filesystem operativo relevante suele incluir:

- `documentos/`
- `facturas/`

segun la raiz resuelta por `FACTURAS_BASE_DIR`.

## Helper De Plan De Backup

Antes de ejecutar comandos manuales, corre:

```bash
cd backend
npm run release:backup-plan
```

Ese helper:

- lee `VERSION`
- detecta branch y commit actuales
- revisa si existen `git`, `pg_dump` y `pg_restore`
- resuelve la DB objetivo segun el entorno actual
- resuelve la raiz operativa de documentos
- y te imprime comandos sugeridos para:
  - backup DB
  - verificacion del dump
  - snapshot de filesystem
  - rollback DB

Si quieres el plan en JSON:

```bash
cd backend
node scripts/release_backup_plan.js --json
```

## Preflight Obligatorio

Antes del backup:

- confirmar version objetivo en `VERSION`
- confirmar alcance del release en `CHANGELOG.md`
- confirmar commit objetivo
- confirmar acceso a DB y a filesystem operativo
- confirmar que no se va a usar `db:reset`
- confirmar ventana de mantenimiento si aplica

## Paso 1. Preparar Directorio De Backup

La Fase 1 recomienda usar un directorio de respaldo fuera del flujo normal de trabajo y con timestamp.

Ejemplo sugerido por el helper:

- `backend/backups/v1.0.0/<timestamp>/`

Estructura esperada:

```text
backend/backups/
  v1.0.0/
    2026-03-21T12-00-00-000Z/
      db/
      storage/
      release-plan.json
```

## Paso 2. Backup De Base De Datos

Usa el comando `pg_dump` que te entrega el helper.

Ejemplo:

```powershell
pg_dump --format=custom --verbose --host=localhost --port=5432 --username=postgres --file="C:\Jose\Proyecto Novogar\backend\backups\v1.0.0\2026-03-21T12-00-00-000Z\db\novogar_db_2026-03-21T12-00-00-000Z.dump" novogar_db
```

## Paso 3. Verificar El Dump

No basta con generar el archivo. Valida que el dump se pueda listar:

```powershell
pg_restore --list "C:\Jose\Proyecto Novogar\backend\backups\v1.0.0\2026-03-21T12-00-00-000Z\db\novogar_db_2026-03-21T12-00-00-000Z.dump"
```

Si este paso falla, no deberias seguir con el deployment.

## Paso 4. Snapshot De Filesystem Operativo

Si el entorno productivo usa carpetas reales para `documentos` y `facturas`, respalda ambas.

Ejemplo PowerShell:

```powershell
Compress-Archive -LiteralPath "C:\Ruta\documentos" -DestinationPath "C:\Backup\documentos_2026-03-21T12-00-00-000Z.zip" -Force
Compress-Archive -LiteralPath "C:\Ruta\facturas" -DestinationPath "C:\Backup\facturas_2026-03-21T12-00-00-000Z.zip" -Force
```

Usa las rutas exactas que te entregue el helper segun `FACTURAS_BASE_DIR`.

## Paso 5. Guardar Metadata Del Release

Guarda evidencia del corte:

- version
- commit
- branch
- timestamp
- dump usado
- backups de storage generados
- migraciones pendientes o aplicadas

Puedes guardar el plan JSON asi:

```powershell
cd backend
node scripts/release_backup_plan.js --json > ".\backups\v1.0.0\2026-03-21T12-00-00-000Z\release-plan.json"
```

## Paso 6. Ejecutar El Deployment

Solo despues de:

- dump valido
- snapshot de storage
- metadata guardada
- y checks tecnicos en verde

## Estrategias De Rollback

No todo rollback es igual. Usa la estrategia menos invasiva que resuelva el problema.

### A. Rollback Solo De Codigo

Usa esto cuando:

- el problema esta en frontend o backend
- pero no se modifico schema ni datos

Accion:

- volver al commit o build anterior
- reiniciar servicio
- revalidar smoke checks

### B. Rollback De Codigo + Base De Datos

Usa esto cuando:

- el release introdujo un cambio de DB o datos
- y volver solo el codigo no corrige el problema

Accion sugerida:

1. detener la app o ponerla en mantenimiento
2. confirmar que el dump correcto es el mas reciente y valido
3. ejecutar restore controlado con `pg_restore`
4. volver al codigo anterior
5. ejecutar smoke checks completos

Ejemplo de restore:

```powershell
pg_restore --clean --if-exists --no-owner --no-privileges --host=localhost --port=5432 --username=postgres --dbname=novogar_db "C:\Jose\Proyecto Novogar\backend\backups\v1.0.0\2026-03-21T12-00-00-000Z\db\novogar_db_2026-03-21T12-00-00-000Z.dump"
```

### C. Rollback De Codigo + Base De Datos + Filesystem

Usa esto cuando:

- el release toco documentos o archivos operativos
- o el problema dejo inconsistente el filesystem respecto a la DB

Accion:

- restaurar DB
- restaurar snapshots de `documentos` y `facturas`
- revalidar previews, descargas y rutas

## Que No Hacer

- no usar `npm run db:reset`
- no restaurar un dump sin verificar antes que corresponde al release correcto
- no asumir que el rollback de codigo basta si hubo cambios de datos
- no hacer restore encima de un entorno productivo sin ventana y confirmacion

## Evidencia Minima A Registrar

Despues del backup o del rollback, deja registrado:

- version
- commit
- entorno
- timestamp
- nombre o ruta del dump
- nombre o ruta de los zips de storage
- migraciones aplicadas
- resultado de smoke checks

## Residual De Esta Fase 1

Esta fase deja listo:

- el runbook explicito
- el helper de plan
- y la referencia operativa para backup y rollback

Lo que sigue pendiente como trabajo posterior:

- automatizacion mas fuerte del proceso
- exposicion visible de version y commit en runtime
- smoke checks por dominio mas completos
- y readiness productiva final con secretos y entorno definitivos
