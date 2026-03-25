# Guia De Respaldo Antes De Resetear La PC

## Objetivo

Dejar un procedimiento claro para no perder el trabajo de `Proyecto Novogar` antes de formatear o resetear esta PC.

Esta guia cubre:

- que ya queda protegido por GitHub
- que **no** queda protegido por GitHub
- como sacar un `dump` de PostgreSQL
- que carpetas copiar
- y como rearmar el entorno en otra PC

## Que Ya Queda A Salvo En GitHub

Si ya hiciste `push`, GitHub te conserva:

- el codigo del repositorio
- las ramas remotas
- el historial de commits
- los pull requests

Para este proyecto, eso significa que podras volver a bajar el codigo desde GitHub en otra maquina.

## Que No Queda A Salvo En GitHub

GitHub **no** guarda automaticamente:

- la base de datos PostgreSQL
- los archivos PDF/XML/documentos subidos localmente
- los archivos `.env`
- credenciales locales

Si no haces respaldo de eso antes del reset, se pierde.

## Resumen Rapido De Lo Que Debes Guardar

Antes del reset, respalda como minimo:

1. la base de datos local normal `novogar_db`
2. la base de datos local de preproduccion `novogar_preprod`
3. la carpeta `documentos`
4. la carpeta `archivos`
5. la carpeta `runtime\preprod`
6. el archivo `backend/.env.production.local`

Si no estas seguro de cual base estas usando, respalda **las dos**.

## Bases De Datos Detectadas En Este Proyecto

### Entorno Local Normal

Por defecto, el backend usa estos valores desde `backend/config/env.js` cuando no existe `.env` local:

- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_USER=postgres`
- `DB_PASSWORD=admin`
- `DB_NAME=novogar_db`

### Entorno Casi Productivo Local

En esta PC tambien existe:

- `backend/.env.production.local`

Con estos datos:

- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_USER=novogar_preprod_app`
- `DB_PASSWORD=12345678`
- `DB_NAME=novogar_preprod`
- `PG_BIN_DIR=C:/Program Files/PostgreSQL/18/bin`

## Paso 1. Crear Una Carpeta De Backups

Usa una carpeta fuera del repo.

Ejemplo:

```powershell
New-Item -ItemType Directory -Force -Path C:\Jose\Backups | Out-Null
```

## Paso 2. Sacar El Dump De La Base Local Normal

Este comando crea una copia exportada de `novogar_db`:

```powershell
$env:PGPASSWORD='admin'
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" `
  -h localhost -p 5432 -U postgres -d novogar_db `
  -F c -f "C:\Jose\Backups\novogar_db_2026-03-24.dump"
Remove-Item Env:PGPASSWORD
```

## Paso 3. Sacar El Dump De La Base Preprod Local

Este comando crea una copia exportada de `novogar_preprod`:

```powershell
$env:PGPASSWORD='12345678'
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" `
  -h localhost -p 5432 -U novogar_preprod_app -d novogar_preprod `
  -F c -f "C:\Jose\Backups\novogar_preprod_2026-03-24.dump"
Remove-Item Env:PGPASSWORD
```

## Paso 4. Verificar Que Los Dumps Sirven

No basta con que el archivo exista. Conviene validar que `pg_restore` lo pueda leer:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" --list "C:\Jose\Backups\novogar_db_2026-03-24.dump"
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" --list "C:\Jose\Backups\novogar_preprod_2026-03-24.dump"
```

Si este paso falla, el dump no es confiable.

## Paso 5. Copiar Las Carpetas De Archivos

Estas carpetas contienen archivos que el sistema usa y que no viven en GitHub:

- `C:\Jose\Proyecto Novogar\documentos`
- `C:\Jose\Proyecto Novogar\archivos`
- `C:\Jose\Proyecto Novogar\runtime\preprod`

Puedes copiarlas manualmente a un disco externo o comprimirlas.

Ejemplo:

```powershell
Compress-Archive -LiteralPath "C:\Jose\Proyecto Novogar\documentos" -DestinationPath "C:\Jose\Backups\documentos_2026-03-24.zip" -Force
Compress-Archive -LiteralPath "C:\Jose\Proyecto Novogar\archivos" -DestinationPath "C:\Jose\Backups\archivos_2026-03-24.zip" -Force
Compress-Archive -LiteralPath "C:\Jose\Proyecto Novogar\runtime\preprod" -DestinationPath "C:\Jose\Backups\runtime_preprod_2026-03-24.zip" -Force
```

## Paso 6. Guardar El Archivo De Entorno

Respalda este archivo:

- `C:\Jose\Proyecto Novogar\backend\.env.production.local`

Puedes copiarlo a la misma carpeta de backups:

```powershell
Copy-Item "C:\Jose\Proyecto Novogar\backend\.env.production.local" "C:\Jose\Backups\.env.production.local.backup"
```

## Paso 7. Confirmar Que Todo El Codigo Este En GitHub

Antes del reset, revisa:

- que el branch actual ya este empujado
- que no queden cambios sin commit que quieras conservar
- que el PR exista si lo necesitas como referencia

Comandos utiles:

```powershell
git status
git branch --show-current
git log --oneline -5
```

## Que No Hace Falta Respaldar

No vale la pena copiar:

- `node_modules`
- `dist`
- caches de npm
- archivos temporales de pruebas

Todo eso se puede volver a generar.

## Como Seguir En Otra PC

## 1. Instalar Herramientas

En la nueva PC instala:

- Git
- Node.js
- PostgreSQL

## 2. Clonar El Repositorio

```powershell
cd C:\Jose
git clone https://github.com/Jcaleriux/Proyecto-Novogar.git
cd "C:\Jose\Proyecto Novogar"
git checkout refactor-solid-frontend
```

## 3. Instalar Dependencias

Desde la raiz:

```powershell
npm install
```

Y si trabajas por separado dentro de `frontend` o `backend`, reinstala segun haga falta.

## 4. Restaurar El Archivo `.env`

Copia tu backup de `.env.production.local` de vuelta a:

- `C:\Jose\Proyecto Novogar\backend\.env.production.local`

Si luego usas un `.env` normal para desarrollo, recrealo manualmente o usa los valores por defecto del proyecto.

## 5. Restaurar Las Carpetas De Archivos

Descomprime o copia de vuelta:

- `documentos`
- `archivos`
- `runtime\preprod`

A las mismas rutas dentro del repo.

## 6. Restaurar La Base De Datos

### Restaurar `novogar_db`

Primero crea la base si no existe:

```powershell
createdb -U postgres novogar_db
```

Luego restaura:

```powershell
$env:PGPASSWORD='admin'
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" `
  --clean --if-exists --no-owner --no-privileges `
  -h localhost -p 5432 -U postgres -d novogar_db `
  "C:\Jose\Backups\novogar_db_2026-03-24.dump"
Remove-Item Env:PGPASSWORD
```

### Restaurar `novogar_preprod`

Primero crea la base si no existe:

```powershell
createdb -U postgres novogar_preprod
```

Luego restaura:

```powershell
$env:PGPASSWORD='12345678'
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" `
  --clean --if-exists --no-owner --no-privileges `
  -h localhost -p 5432 -U novogar_preprod_app -d novogar_preprod `
  "C:\Jose\Backups\novogar_preprod_2026-03-24.dump"
Remove-Item Env:PGPASSWORD
```

## 7. Aplicar Migraciones Si Hace Falta

Cuando el proyecto ya este clonado y con su DB restaurada:

```powershell
cd "C:\Jose\Proyecto Novogar\backend"
npm run db:migrate
```

Y para preprod local:

```powershell
cd "C:\Jose\Proyecto Novogar\backend"
npm run preprod:db:migrate
```

## 8. Levantar El Proyecto

### Backend normal

```powershell
cd "C:\Jose\Proyecto Novogar\backend"
npm run dev
```

### Backend preprod local

```powershell
cd "C:\Jose\Proyecto Novogar\backend"
npm run preprod:start
```

### Frontend

```powershell
cd "C:\Jose\Proyecto Novogar\frontend"
npm install
npm run dev
```

## Checklist Final Antes Del Reset

- codigo empujado a GitHub
- dump de `novogar_db`
- dump de `novogar_preprod`
- dumps verificados con `pg_restore --list`
- copia de `documentos`
- copia de `archivos`
- copia de `runtime\preprod`
- copia de `backend\.env.production.local`
- backups guardados fuera de la PC o en una nube/disco externo

## Recomendacion Final

Si tienes tiempo limitado, la prioridad correcta es:

1. GitHub
2. dumps de base de datos
3. carpetas `documentos`, `archivos` y `runtime\preprod`
4. `.env.production.local`

Con eso, en otra PC podras reconstruir casi todo el entorno sin perder el trabajo importante.
