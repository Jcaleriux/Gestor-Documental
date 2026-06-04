# Catalogo De Endpoints Criticos

Fecha de referencia: 2026-06-04.

Este catalogo documenta los endpoints de mayor riesgo operativo y de mantenimiento. La fuente de verdad sigue siendo el codigo en `backend/app.js` y `backend/routes/`; este documento sirve para revisar contratos antes de cambiar rutas, payloads, permisos o errores.

## Convenciones Generales

- Base path API: `/api`.
- La mayoria de endpoints requiere header `Authorization: Bearer <token>`.
- Las respuestas JSON exitosas envueltas por `handleRequest` usan:

```json
{
  "success": true,
  "data": {}
}
```

- Cuando el handler no retorna datos, la respuesta exitosa es:

```json
{
  "success": true
}
```

- Errores comunes:
  - `400`: payload invalido o campos requeridos faltantes.
  - `401`: token faltante, token invalido o credenciales invalidas.
  - `403`: permiso insuficiente.
  - `404`: recurso no encontrado.
  - `500`: error interno.
- Para endpoints con `handleRequest`, el payload de error usa `error` por defecto:

```json
{
  "success": false,
  "error": "mensaje"
}
```

- Login usa `message` como llave de error:

```json
{
  "success": false,
  "message": "mensaje"
}
```

## Auth

Fuente: `backend/routes/auth.js`, `backend/services/authService.js`.

| Metodo | Endpoint | Auth | Permiso | Descripcion | Tests relacionados |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/auth/login` | No | Publico | Autentica usuario y retorna JWT. Tiene rate limit por IP/email. | `authService.test.js`, `authRoutes.rateLimit.test.js` |
| `GET` | `/api/auth/me` | Si | Usuario autenticado | Retorna usuario actual con rol vigente. | `authService.test.js` |

### POST /api/auth/login

Request:

```json
{
  "email": "admin@novogar.local",
  "password": "Novogar2026!"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "nombre": "Admin",
      "email": "admin@novogar.local",
      "rol": 1,
      "rol_codigo": "ADMIN",
      "rol_nombre": "Administrador",
      "permissions": ["DOCUMENTOS_VER"]
    },
    "token": "jwt"
  }
}
```

Errores relevantes:

- `400`: `email y password requeridos`.
- `401`: `Credenciales incorrectas`.
- `401`: `Usuario inactivo`.

### GET /api/auth/me

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "nombre": "Admin",
      "email": "admin@novogar.local",
      "rol": 1,
      "rol_codigo": "ADMIN",
      "rol_nombre": "Administrador"
    }
  }
}
```

## Facturas Y Documentos Fiscales

Fuente: `backend/routes/facturas.js`, `backend/services/facturasService.js`.

Todos estos endpoints requieren token y `DOCUMENTOS_VER`.

| Metodo | Endpoint | Descripcion | Tests relacionados |
| --- | --- | --- | --- |
| `GET` | `/api/facturas` | Lista facturas con filtros soportados por el servicio. | `facturasUseCases.test.js`, `facturas.domain.test.js` |
| `GET` | `/api/retenciones-pendientes` | Lista facturas con retenciones pendientes de pago o gestion. | `facturasUseCases.test.js` |
| `GET` | `/api/facturas/:id` | Obtiene detalle de factura. | `facturasUseCases.test.js` |
| `GET` | `/api/facturas/:id/mensaje-hacienda` | Obtiene mensaje de Hacienda asociado a la factura. | `facturasUseCases.test.js` |
| `GET` | `/api/facturas/:id/manifest` | Obtiene manifest de archivos asociados a factura. | `facturasUseCases.test.js` |
| `GET` | `/api/notas-credito` | Lista notas de credito. | `facturasUseCases.test.js` |
| `GET` | `/api/notas-credito/:id/manifest` | Obtiene manifest de archivos asociados a nota de credito. | `facturasUseCases.test.js` |
| `GET` | `/api/tiquetes-electronicos` | Lista tiquetes electronicos. | `facturasUseCases.test.js` |
| `GET` | `/api/mensajes-hacienda` | Lista mensajes de Hacienda. | `facturasUseCases.test.js` |

Notas de contrato:

- El filtro por sociedad y otros filtros de consulta se resuelven en los servicios/use cases.
- Los endpoints de manifest no deben exponer rutas absolutas inseguras; deben apoyarse en rutas normalizadas y endpoints de descarga/preview.
- No mezclar agregados de montos entre monedas. Si un endpoint agrega valores, debe mantener `moneda` visible o agrupar por moneda.

## Files

Fuente: `backend/routes/files.js`, `backend/services/filesService.js`.

Todos estos endpoints requieren token y alguno de:

- `DOCUMENTOS_VER`
- `DOCUMENTOS_DESCARGAR`

| Metodo | Endpoint | Descripcion | Tests relacionados |
| --- | --- | --- | --- |
| `GET` | `/api/files/xml` | Devuelve un XML operativo segun parametros de consulta. | `filesService.test.js`, `filesUseCases.test.js` |
| `GET` | `/api/files/pdf` | Devuelve un PDF operativo segun parametros de consulta. | `filesService.test.js`, `filesUseCases.test.js` |

Notas de contrato:

- Las rutas fisicas se resuelven desde `FACTURAS_BASE_DIR` mediante la configuracion runtime.
- No aceptar rutas que permitan escapar del directorio operativo autorizado.
- Estos endpoints pueden devolver archivo binario, no necesariamente JSON.
- La ruta estatica `/files/*` tambien existe fuera de `/api`, protegida con auth y permisos desde `backend/app.js`.

## Contabilizacion

Fuente: `backend/routes/contabilizacion.js`, `backend/validation/schemas.js`.

| Metodo | Endpoint | Permiso | Descripcion | Tests relacionados |
| --- | --- | --- | --- | --- |
| `GET` | `/api/facturas/:facturaId/contabilizacion` | `DOCUMENTOS_VER` | Obtiene datos de contabilizacion de una factura. | `contabilizacionUseCases.test.js` |
| `POST` | `/api/facturas/:facturaId/contabilizacion` | `DOCUMENTOS_CONTABILIZAR` | Crea o actualiza datos de contabilizacion. | `contabilizacionUseCases.test.js` |
| `POST` | `/api/facturas/:facturaId/contabilizacion/documentos-respaldo` | `DOCUMENTOS_CONTABILIZAR` | Carga documento de respaldo en base64. | `contabilizacionUseCases.test.js` |
| `DELETE` | `/api/facturas/:facturaId/contabilizacion/documentos-respaldo/:documentoId` | `DOCUMENTOS_CONTABILIZAR` | Elimina documento de respaldo. | `contabilizacionUseCases.test.js` |
| `POST` | `/api/facturas/:facturaId/contabilizacion/retencion-pagos` | `DOCUMENTOS_CONTABILIZAR` | Registra pago de retencion. | `contabilizacionUseCases.test.js` |

### POST /api/facturas/:facturaId/contabilizacion

Request permitido por schema:

```json
{
  "fecha_documento": "2026-06-04",
  "fecha_vencimiento": "2026-06-30",
  "fecha_contabilizacion": "2026-06-04",
  "plazo_credito": 30,
  "retencion": 1000,
  "descuento": 0,
  "anticipo_aplicado": 0,
  "monto_nota_credito": 0,
  "centro_costo": "CC-001",
  "cuenta_contable": "5000",
  "proyecto": "Proyecto",
  "orden_compra": "OC-001",
  "orden_compra_id": 1,
  "numero_proveedor": "P-001",
  "proveedor_id": 1,
  "tabla_pago_id": 1,
  "nota_credito_id": 1,
  "notas": "Observacion",
  "workflow_action": "save_draft",
  "metadata": {},
  "usuario": "usuario@novogar.local"
}
```

Valores validos para `workflow_action`:

- `save_draft`
- `mark_in_review`
- `finalize`

Notas:

- `usuario` es opcional; si no viene, se usa `req.user.email` o `system`.
- Cualquier cambio que afecte montos debe conservar contexto de `moneda` segun `docs/principios_transversales.md`.

### POST /api/facturas/:facturaId/contabilizacion/documentos-respaldo

Request:

```json
{
  "filename": "respaldo.pdf",
  "file_base64": "base64",
  "metadata": {},
  "usuario": "usuario@novogar.local"
}
```

### POST /api/facturas/:facturaId/contabilizacion/retencion-pagos

Request:

```json
{
  "monto": 1000,
  "fecha_pago": "2026-06-04",
  "notas": "Pago aplicado",
  "usuario": "usuario@novogar.local"
}
```

## Tramites De Pago

Fuente: `backend/routes/tramitesPago.js`, `backend/validation/schemas.js`.

Permisos de lectura: `TRAMITES_READ_PERMISSIONS` desde `backend/domain/permissions.js`.

| Metodo | Endpoint | Permiso | Descripcion | Tests relacionados |
| --- | --- | --- | --- | --- |
| `GET` | `/api/tramites-pago` | Alguno de `TRAMITES_READ_PERMISSIONS` | Lista tramites. | `tramitesPagoReadUseCases.test.js`, `tramitesPagoRoutes.test.js` |
| `GET` | `/api/tramites-pago/retenciones-disponibles` | `DOCUMENTOS_TRAMITAR_PAGO` | Lista retenciones disponibles para tramite. | `tramitesPagoReadUseCases.test.js` |
| `GET` | `/api/tramites-pago/:id` | Alguno de `TRAMITES_READ_PERMISSIONS` | Obtiene detalle de tramite. | `tramitesPagoReadUseCases.test.js` |
| `GET` | `/api/tramites-pago/:id/pdf-unificado` | Alguno de `TRAMITES_READ_PERMISSIONS` | Genera/obtiene PDF unificado del tramite. | `tramitesPagoUnifiedPdfSupport.test.js` |
| `GET` | `/api/tramites-pago/:id/historial` | Alguno de `TRAMITES_READ_PERMISSIONS` | Obtiene historial del tramite. | `tramitesPagoReadUseCases.test.js` |
| `POST` | `/api/tramites-pago` | `DOCUMENTOS_TRAMITAR_PAGO` | Crea tramite con facturas y/o retenciones. | `tramitesPago.useCases.test.js`, `tramitesPago.validation.test.js` |
| `POST` | `/api/tramites-pago/:id/estado` | Alguno de `WORKFLOW_PERMISSIONS` | Cambia estado del tramite. | `tramitesPago.useCases.test.js`, `tramitesPago.rules.test.js` |
| `POST` | `/api/tramites-pago/:id/documentos/:facturaId/decision` | `DOCUMENTOS_VER` + validacion de etapa en use case | Registra decision por documento/etapa. | `tramitesPago.useCases.test.js`, `tramitesPago.policyRegistry.test.js` |
| `POST` | `/api/tramites-pago/:id/documentos/:facturaId/tesoreria` | `DOCUMENTOS_TRAMITAR_PAGO` | Ejecuta accion de tesoreria. | `tramitesPago.useCases.test.js` |
| `POST` | `/api/tramites-pago/:id/documentos/:facturaId/rechazo-tesoreria` | `DOCUMENTOS_TRAMITAR_PAGO` | Legacy: rechazo tratado como exclusion. | `tramitesPago.useCases.test.js` |

### POST /api/tramites-pago

Request:

```json
{
  "sociedad_id": 1,
  "factura_ids": [10, 11],
  "retencion_factura_ids": [12],
  "usuario": "usuario@novogar.local"
}
```

Reglas:

- Debe incluir al menos una factura o una retencion.
- `sociedad_id` se acepta como valor flexible por compatibilidad del schema actual.

### POST /api/tramites-pago/:id/estado

Request:

```json
{
  "estado": "en_revision",
  "usuario": "usuario@novogar.local",
  "motivo": "Cambio solicitado",
  "force": false,
  "pagos_documentos": [
    {
      "factura_id": 10,
      "monto_pago": 1000
    }
  ]
}
```

Notas:

- `pagos_documentos` es opcional.
- El permiso exacto se evalua contra `WORKFLOW_PERMISSIONS`.
- No cambiar estados sin revisar reglas en servicios y tests de `tramitesPago.rules.test.js`.

### POST /api/tramites-pago/:id/documentos/:facturaId/decision

Request:

```json
{
  "etapa": "gerencia",
  "decision": "aprobado",
  "motivo": "Aprobado",
  "usuario": "usuario@novogar.local"
}
```

Notas:

- La ruta exige `DOCUMENTOS_VER`, pero las politicas internas validan la etapa y la decision.
- Cualquier cambio aqui debe revisar permisos por etapa y trazabilidad.

### POST /api/tramites-pago/:id/documentos/:facturaId/tesoreria

Request:

```json
{
  "accion": "reenviar",
  "destino": "contabilidad",
  "motivo": "Correccion requerida",
  "usuario": "usuario@novogar.local"
}
```

### POST /api/tramites-pago/:id/documentos/:facturaId/rechazo-tesoreria

Request:

```json
{
  "motivo": "No procede",
  "usuario": "usuario@novogar.local"
}
```

## Tramites De Pago: Caratulas

Todos estos endpoints requieren `DOCUMENTOS_TRAMITAR_PAGO`.

| Metodo | Endpoint | Descripcion | Tests relacionados |
| --- | --- | --- | --- |
| `POST` | `/api/tramites-pago/:id/caratulas` | Carga o reemplaza caratulas del tramite. | `tramitesPagoCaratulasUseCases.test.js` |
| `POST` | `/api/tramites-pago/:id/caratulas/resolver` | Resuelve coincidencias manuales de caratulas. | `tramitesPagoCaratulasUseCases.test.js` |
| `POST` | `/api/tramites-pago/:id/caratulas/proveedores/:providerKey/confirm-order` | Confirma orden de facturas para caratula de proveedor. | `tramitesPagoCaratulasProviderSupport.test.js` |
| `POST` | `/api/tramites-pago/:id/caratulas/proveedores/:providerKey/upload` | Carga caratula por proveedor. | `tramitesPagoCaratulasProviderSupport.test.js` |
| `POST` | `/api/tramites-pago/:id/caratulas/proveedores/:providerKey/confirm` | Confirma caratula por proveedor. | `tramitesPagoCaratulasProviderSupport.test.js` |
| `POST` | `/api/tramites-pago/:id/caratulas/huerfanas/:orphanId/assign` | Asigna caratula huerfana a proveedor. | `tramitesPagoCaratulasSupport.test.js` |
| `POST` | `/api/tramites-pago/:id/caratulas/huerfanas/:orphanId/discard` | Descarta caratula huerfana. | `tramitesPagoCaratulasSupport.test.js` |

Requests:

```json
{
  "filename": "caratula.pdf",
  "file_base64": "base64",
  "usuario": "usuario@novogar.local"
}
```

```json
{
  "group_key": "grupo-1",
  "provider_factura_id": 10,
  "line_matches": [
    {
      "line_key": "linea-1",
      "factura_id": 10
    }
  ],
  "usuario": "usuario@novogar.local"
}
```

```json
{
  "factura_ids": [10, 11],
  "order_source": "manual",
  "usuario": "usuario@novogar.local"
}
```

```json
{
  "provider_key": "proveedor-1",
  "usuario": "usuario@novogar.local"
}
```

Notas:

- `order_source` acepta `auto` o `manual`.
- Los archivos via base64 estan sujetos a limites runtime como `TRAMITES_CARATULA_MAX_FILE_MB`.
- No cambiar el flujo de caratulas como refactor interno; afecta workflow operativo y evidencia documental.

## Checklist Antes De Cambiar Un Endpoint

1. Confirmar si el cambio altera ruta, metodo, permiso, payload, response o codigo HTTP.
2. Revisar `backend/routes/<modulo>.js`.
3. Revisar schemas en `backend/validation/schemas.js`.
4. Revisar use cases y tests relacionados.
5. Si toca dinero, revisar `docs/principios_transversales.md`.
6. Si toca permisos, actualizar `docs/arquitectura/06_matriz_permisos.md`.
7. Si el contrato cambia de forma intencional, actualizar este catalogo.
