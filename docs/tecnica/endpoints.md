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

## Usuarios, Roles Y Sociedades

Fuente: `backend/routes/usuarios.js`, `backend/routes/sociedades.js`, `backend/validation/schemas.js`.

| Metodo | Endpoint | Permiso | Descripcion | Tests relacionados |
| --- | --- | --- | --- | --- |
| `GET` | `/api/usuarios` | `USUARIOS_ADMINISTRAR` | Lista usuarios. | Sin test dedicado identificado |
| `GET` | `/api/roles` | `USUARIOS_ADMINISTRAR` | Lista roles. | Sin test dedicado identificado |
| `POST` | `/api/usuarios` | `USUARIOS_ADMINISTRAR` | Crea usuario. | Sin test dedicado identificado |
| `PATCH` | `/api/usuarios/:id` | `USUARIOS_ADMINISTRAR` | Actualiza usuario. | Sin test dedicado identificado |
| `GET` | `/api/usuarios/:id/sociedades` | `USUARIOS_ADMINISTRAR` | Lista sociedades asignadas a usuario. | Sin test dedicado identificado |
| `PUT` | `/api/usuarios/:id/sociedades` | `USUARIOS_ADMINISTRAR` | Reemplaza sociedades asignadas a usuario. | Sin test dedicado identificado |
| `GET` | `/api/sociedades` | Alguno de `SOCIEDADES_ACCESS_PERMISSIONS` | Lista sociedades visibles para el usuario. | Sin test dedicado identificado |

### POST /api/usuarios

Request:

```json
{
  "nombre": "Usuario Demo",
  "email": "usuario@novogar.local",
  "password": "Password2026!",
  "rol_id": 1,
  "activo": true
}
```

### PATCH /api/usuarios/:id

Request:

```json
{
  "nombre": "Usuario Demo",
  "email": "usuario@novogar.local",
  "rol_id": 1,
  "activo": true,
  "password": ""
}
```

Notas:

- `password` acepta vacio o `null` en actualizacion para conservar la clave vigente.
- Crear usuario requiere password de 8 a 255 caracteres.

### PUT /api/usuarios/:id/sociedades

Request:

```json
{
  "sociedad_ids": [1, 2]
}
```

## Proveedores

Fuente: `backend/routes/proveedores.js`, `backend/validation/schemas.js`.

| Metodo | Endpoint | Permiso | Descripcion | Tests relacionados |
| --- | --- | --- | --- | --- |
| `GET` | `/api/proveedores` | `USUARIOS_ADMINISTRAR` o `DOCUMENTOS_CONTABILIZAR` o `DOCUMENTOS_SUBIR` | Lista proveedores. | Sin test dedicado identificado |
| `POST` | `/api/proveedores` | `USUARIOS_ADMINISTRAR` | Crea proveedor. | Sin test dedicado identificado |
| `PATCH` | `/api/proveedores/:id` | `USUARIOS_ADMINISTRAR` | Actualiza proveedor. | Sin test dedicado identificado |

### POST /api/proveedores

Request:

```json
{
  "sociedad_id": 1,
  "identificacion_tipo": "JURIDICA",
  "identificacion_numero": "3-101-000000",
  "nombre": "Proveedor Demo S.A.",
  "nombre_comercial": "Proveedor Demo",
  "correo_electronico": "proveedor@demo.local",
  "telefono_codigo_pais": "506",
  "telefono_numero": "22222222"
}
```

### PATCH /api/proveedores/:id

Request:

```json
{
  "identificacion_tipo": "JURIDICA",
  "identificacion_numero": "3-101-000000",
  "nombre": "Proveedor Demo S.A.",
  "nombre_comercial": "Proveedor Demo",
  "correo_electronico": "proveedor@demo.local",
  "telefono_codigo_pais": "506",
  "telefono_numero": "22222222"
}
```

## Centros De Costo

Fuente: `backend/routes/centrosCosto.js`, `backend/validation/schemas.js`.

| Metodo | Endpoint | Permiso | Descripcion | Tests relacionados |
| --- | --- | --- | --- | --- |
| `GET` | `/api/centros-costo` | `USUARIOS_ADMINISTRAR` o `DOCUMENTOS_CONTABILIZAR` o `DOCUMENTOS_VER` | Lista centros de costo. | Sin test dedicado identificado |
| `POST` | `/api/centros-costo` | `USUARIOS_ADMINISTRAR` | Crea centro de costo. | Sin test dedicado identificado |
| `PUT` | `/api/centros-costo/bulk` | `USUARIOS_ADMINISTRAR` | Carga o actualiza centros de costo en lote. | Sin test dedicado identificado |
| `PATCH` | `/api/centros-costo/:id` | `USUARIOS_ADMINISTRAR` | Actualiza centro de costo. | Sin test dedicado identificado |

### POST /api/centros-costo

Request:

```json
{
  "sociedad_id": 1,
  "codigo": "CC-001",
  "nombre": "Administracion",
  "centro_padre_id": null,
  "codigo_padre": "",
  "centro_padre_codigo": "",
  "usuario_aprobador_id": 1,
  "rol_aprobador_id": null,
  "seleccionable_en_contabilizacion": true,
  "activo": true,
  "orden": 1,
  "metadata": {}
}
```

Reglas:

- Debe indicar `usuario_aprobador_id` o `rol_aprobador_id`, pero no ambos.
- `PATCH /api/centros-costo/:id` usa los mismos campos salvo `sociedad_id`.

### PUT /api/centros-costo/bulk

Request:

```json
{
  "sociedad_id": 1,
  "centros": [
    {
      "id": 1,
      "codigo": "CC-001",
      "nombre": "Administracion",
      "usuario_aprobador_id": 1,
      "rol_aprobador_id": null,
      "activo": true
    }
  ]
}
```

## Tablas De Pago

Fuente: `backend/routes/tablasPago.js`, `backend/validation/schemas.js`.

| Metodo | Endpoint | Permiso | Descripcion | Tests relacionados |
| --- | --- | --- | --- | --- |
| `GET` | `/api/tablas-pago` | `DOCUMENTOS_CONTABILIZAR` o `DOCUMENTOS_SUBIR` o `USUARIOS_ADMINISTRAR` | Lista tablas de pago. | Sin test dedicado identificado |
| `POST` | `/api/tablas-pago` | `DOCUMENTOS_SUBIR` o `USUARIOS_ADMINISTRAR` | Carga tabla de pago. | Sin test dedicado identificado |
| `DELETE` | `/api/tablas-pago/:tablaPagoId` | `DOCUMENTOS_SUBIR` o `USUARIOS_ADMINISTRAR` | Elimina tabla de pago. | Sin test dedicado identificado |

### POST /api/tablas-pago

Request:

```json
{
  "sociedad_id": 1,
  "proveedor_id": 1,
  "nombre": "Tabla Junio",
  "filename": "tabla-pago.pdf",
  "file_base64": "base64",
  "metadata": {},
  "usuario": "usuario@novogar.local"
}
```

Notas:

- Los archivos estan sujetos a `TABLAS_PAGO_MAX_FILE_MB`.

## Ordenes De Compra

Fuente: `backend/routes/ordenesCompra.js`, `backend/validation/schemas.js`.

| Metodo | Endpoint | Permiso | Descripcion | Tests relacionados |
| --- | --- | --- | --- | --- |
| `GET` | `/api/ordenes-compra` | `DOCUMENTOS_CONTABILIZAR` o `DOCUMENTOS_SUBIR` o `USUARIOS_ADMINISTRAR` | Lista ordenes de compra. | Sin test dedicado identificado |
| `POST` | `/api/ordenes-compra` | `DOCUMENTOS_SUBIR` o `USUARIOS_ADMINISTRAR` | Crea orden de compra con archivo. | Sin test dedicado identificado |
| `POST` | `/api/ordenes-compra/auto-import` | `DOCUMENTOS_SUBIR` o `USUARIOS_ADMINISTRAR` | Importa orden de compra desde archivo. | Sin test dedicado identificado |
| `PATCH` | `/api/ordenes-compra/:ordenCompraId/estado-manual` | `DOCUMENTOS_CONTABILIZAR` o `USUARIOS_ADMINISTRAR` | Cambia estado manual de orden de compra. | Sin test dedicado identificado |
| `DELETE` | `/api/ordenes-compra/:ordenCompraId` | `DOCUMENTOS_SUBIR` o `USUARIOS_ADMINISTRAR` | Elimina orden de compra. | Sin test dedicado identificado |

### POST /api/ordenes-compra

Request:

```json
{
  "sociedad_id": 1,
  "proveedor_id": 1,
  "numero_oc": "OC-001",
  "nombre": "Orden demo",
  "monto": 1000,
  "moneda": "CRC",
  "fecha": "2026-06-08",
  "filename": "orden.pdf",
  "file_base64": "base64",
  "metadata": {},
  "usuario": "usuario@novogar.local"
}
```

Reglas:

- Debe venir `numero_oc` o `nombre`.
- `monto` debe ser positivo.
- `moneda` es obligatoria. No omitirla en UI, reportes ni validaciones.

### POST /api/ordenes-compra/auto-import

Request:

```json
{
  "sociedad_id": 1,
  "filename": "orden.pdf",
  "file_base64": "base64",
  "metadata": {},
  "usuario": "usuario@novogar.local"
}
```

### PATCH /api/ordenes-compra/:ordenCompraId/estado-manual

Request:

```json
{
  "estado": "cerrada"
}
```

Valores validos:

- `abierta`
- `cerrada`

## Reservas

Fuente: `backend/routes/reservas.js`, `backend/validation/schemas.js`.

Permisos de lectura de reservas:

- `RESERVAS_VER`
- `RESERVAS_CREAR`
- `RESERVAS_GESTIONAR`

| Metodo | Endpoint | Permiso | Descripcion | Tests relacionados |
| --- | --- | --- | --- | --- |
| `GET` | `/api/reservas/operaciones` | Alguno de permisos de lectura | Lista operaciones de reserva. | `reservasUseCases.test.js` |
| `GET` | `/api/reservas/operaciones/:operacionId` | Alguno de permisos de lectura | Obtiene detalle de operacion. | `reservasUseCases.test.js` |
| `POST` | `/api/reservas/operaciones` | `RESERVAS_CREAR` o `RESERVAS_GESTIONAR` | Crea operacion de reserva. | `reservasUseCases.test.js` |
| `POST` | `/api/reservas/operaciones/sync-documento` | `RESERVAS_CREAR` o `RESERVAS_GESTIONAR` | Sincroniza documento con operacion de reserva. | `reservasDocumentStorage.test.js` |
| `POST` | `/api/reservas/operaciones/:operacionId/documentos` | `RESERVAS_CREAR` o `RESERVAS_GESTIONAR` | Registra o actualiza metadata de documento. | `reservasDocumentStorage.test.js` |
| `GET` | `/api/reservas/operaciones/:operacionId/documentos/:documentoId/preview` | Alguno de permisos de lectura | Preview de documento. | `reservasDocumentStorage.test.js` |
| `POST` | `/api/reservas/operaciones/:operacionId/documentos/:documentoId/reemplazar` | `RESERVAS_GESTIONAR` | Reemplaza archivo de documento. | `reservasDocumentStorage.test.js` |
| `POST` | `/api/reservas/operaciones/:operacionId/cancelar` | `RESERVAS_GESTIONAR` | Cancela operacion. | `reservasUseCases.test.js` |
| `POST` | `/api/reservas/operaciones/:operacionId/cerrar` | `RESERVAS_GESTIONAR` | Cierra operacion. | `reservasUseCases.test.js` |
| `POST` | `/api/reservas/operaciones/:operacionId/trasladar` | `RESERVAS_GESTIONAR` | Traslada reserva a otra unidad/proyecto. | `reservasUseCases.test.js` |

### POST /api/reservas/operaciones

Request:

```json
{
  "sociedad_id": 1,
  "proyecto_codigo": "PRY",
  "unidad_codigo": "U-001",
  "cliente_nombre": "Cliente Demo",
  "cliente_identificacion": "1-0000-0000",
  "metadata": {},
  "usuario": "usuario@novogar.local"
}
```

### POST /api/reservas/operaciones/:operacionId/cancelar

Request:

```json
{
  "motivo": "Cliente desiste",
  "usuario": "usuario@novogar.local"
}
```

### POST /api/reservas/operaciones/:operacionId/cerrar

Request:

```json
{
  "motivo": "Operacion completada",
  "usuario": "usuario@novogar.local"
}
```

### POST /api/reservas/operaciones/:operacionId/trasladar

Request:

```json
{
  "destino_sociedad_id": 1,
  "destino_proyecto_codigo": "PRY",
  "destino_unidad_codigo": "U-002",
  "cliente_nombre": "Cliente Demo",
  "cliente_identificacion": "1-0000-0000",
  "motivo": "Cambio de unidad",
  "usuario": "usuario@novogar.local",
  "metadata": {}
}
```

### POST /api/reservas/operaciones/:operacionId/documentos

Request:

```json
{
  "codigo_documento": "contrato",
  "nombre_archivo": "contrato.pdf",
  "ruta_archivo": "documentos/reservas/contrato.pdf",
  "mime_type": "application/pdf",
  "tamanio_bytes": 12345,
  "hash_sha256": "hash",
  "metadata": {},
  "usuario": "usuario@novogar.local"
}
```

### POST /api/reservas/operaciones/sync-documento

Request:

```json
{
  "sociedad_id": 1,
  "proyecto_codigo": "PRY",
  "unidad_codigo": "U-001",
  "cliente_nombre": "Cliente Demo",
  "cliente_identificacion": "1-0000-0000",
  "codigo_documento": "contrato",
  "nombre_archivo": "contrato.pdf",
  "ruta_archivo": "documentos/reservas/contrato.pdf",
  "mime_type": "application/pdf",
  "tamanio_bytes": 12345,
  "hash_sha256": "hash",
  "metadata": {},
  "usuario": "usuario@novogar.local"
}
```

### POST /api/reservas/operaciones/:operacionId/documentos/:documentoId/reemplazar

Request:

```json
{
  "filename": "contrato-nuevo.pdf",
  "file_base64": "base64",
  "mime_type": "application/pdf",
  "motivo": "Correccion de documento",
  "metadata": {},
  "usuario": "usuario@novogar.local"
}
```

Notas:

- Los documentos de reservas estan sujetos a `RESERVAS_DOC_MAX_FILE_MB`.
- No tocar rutas fisicas de documentos sin revisar almacenamiento operativo.

## Dashboard

Fuente: `backend/routes/dashboard.js`.

Todos estos endpoints requieren alguno de `DASHBOARD_ACCESS_PERMISSIONS`.

| Metodo | Endpoint | Descripcion | Tests relacionados |
| --- | --- | --- | --- |
| `GET` | `/api/dashboard/stats` | Estadisticas y totales principales. | `dashboardRoutes.test.js`, `dashboardUseCases.test.js`, `dashboardRepository.test.js` |
| `GET` | `/api/dashboard/work-queue` | Cola de trabajo operativa. | `dashboardRoutes.test.js`, `dashboardUseCases.test.js` |
| `GET` | `/api/dashboard/recent-activity` | Actividad reciente. | `dashboardRoutes.test.js`, `dashboardUseCases.test.js` |
| `GET` | `/api/dashboard/recent-documents` | Documentos recientes. | `dashboardRoutes.test.js`, `dashboardUseCases.test.js` |

Notas:

- Los totales monetarios del dashboard deben mantenerse agrupados por `moneda`.
- Antes de cambiar agregados, revisar `docs/principios_transversales.md`.

## Comentarios, Versiones, Auditoria Y Estados Documentales

Fuente: `backend/routes/comentarios.js`, `backend/routes/versiones.js`, `backend/routes/auditoria.js`, `backend/validation/schemas.js`.

| Metodo | Endpoint | Permiso | Descripcion | Tests relacionados |
| --- | --- | --- | --- | --- |
| `GET` | `/api/documentos/:facturaId/comentarios` | `DOCUMENTOS_VER` | Lista comentarios del documento. | Sin test dedicado identificado |
| `POST` | `/api/documentos/:facturaId/comentarios` | `DOCUMENTOS_COMENTAR` | Crea comentario. | Sin test dedicado identificado |
| `GET` | `/api/documentos/:facturaId/versiones` | `DOCUMENTOS_VER` | Lista versiones del documento. | Sin test dedicado identificado |
| `POST` | `/api/documentos/:facturaId/versiones` | `DOCUMENTOS_SUBIR` | Crea version documental. | Sin test dedicado identificado |
| `GET` | `/api/documentos/:facturaId/auditoria` | `AUDITORIA_VER` | Lista auditoria del documento. | `auditoriaUseCases.test.js`, `auditoriaRepository.test.js` |
| `POST` | `/api/documentos/:facturaId/auditoria` | `AUDITORIA_VER` | Crea registro de auditoria. | `auditoriaUseCases.test.js` |
| `GET` | `/api/documentos/:facturaId/estados` | `DOCUMENTOS_VER` | Lista historiales de estado. | `auditoriaUseCases.test.js` |
| `POST` | `/api/documentos/:facturaId/estados` | Alguno de `WORKFLOW_PERMISSIONS` | Crea registro de estado. | `auditoriaUseCases.test.js` |
| `PATCH` | `/api/documentos/:facturaId/estado` | Alguno de `WORKFLOW_PERMISSIONS` | Actualiza estado actual de factura. | `auditoriaUseCases.test.js` |

### POST /api/documentos/:facturaId/comentarios

Request:

```json
{
  "usuario": "usuario@novogar.local",
  "texto": "Comentario operativo"
}
```

Notas:

- El backend prioriza `req.user.nombre` o `req.user.email` como actor sobre `usuario` recibido.

### POST /api/documentos/:facturaId/versiones

Request:

```json
{
  "usuario": "usuario@novogar.local",
  "cambios": "Se reemplazo el PDF",
  "ruta_archivo": "documentos/facturas/factura.pdf"
}
```

### POST /api/documentos/:facturaId/auditoria

Request:

```json
{
  "accion": "actualizar_estado",
  "usuario": "usuario@novogar.local",
  "detalles": {},
  "ip_address": "127.0.0.1"
}
```

### POST /api/documentos/:facturaId/estados

Request:

```json
{
  "dominio": "workflow_pago",
  "estado_anterior": "pendiente",
  "estado_nuevo": "aprobado",
  "usuario": "usuario@novogar.local",
  "motivo": "Aprobado por flujo"
}
```

Valores validos para `dominio`:

- `contabilizacion`
- `workflow_pago`
- `mixto`

### PATCH /api/documentos/:facturaId/estado

Request:

```json
{
  "estado": "contabilizada"
}
```

Notas:

- Estos endpoints mantienen trazabilidad. No usarlos como atajo para saltarse use cases de negocio.
- El estado documental y el workflow de pago deben seguir separados.

## Checklist Antes De Cambiar Un Endpoint

1. Confirmar si el cambio altera ruta, metodo, permiso, payload, response o codigo HTTP.
2. Revisar `backend/routes/<modulo>.js`.
3. Revisar schemas en `backend/validation/schemas.js`.
4. Revisar use cases y tests relacionados.
5. Si toca dinero, revisar `docs/principios_transversales.md`.
6. Si toca permisos, actualizar `docs/arquitectura/06_matriz_permisos.md`.
7. Si el contrato cambia de forma intencional, actualizar este catalogo.
