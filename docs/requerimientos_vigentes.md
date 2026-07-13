# Requerimientos Vigentes

## Estado

Este documento resume el alcance funcional vigente del proyecto al `2026-03-19`.

El archivo `docs/historico/REQUERIMIENTOS.md` se conserva como levantamiento inicial e historia del arranque. Si existe conflicto entre ambos, prevalecen este documento, `README.md`, la documentacion en `docs/arquitectura/` y el comportamiento real del codigo.

## Referencias principales

- `README.md`: arranque, stack, scripts y panorama general.
- `docs/arquitectura/estado_actual.md`: arquitectura y modulos vigentes.
- `docs/arquitectura/brechas_y_mejoras.md`: mejoras pendientes respecto al objetivo arquitectonico.
- `docs/arquitectura/06_matriz_permisos.md`: permisos minimos por accion y endpoint.
- `docs/principios_transversales.md`: principios de negocio que deben mantenerse, especialmente `multicurrency-first`.

## Implementado hoy

### 1. Autenticacion y sesion

- En una instalacion limpia sin usuarios activos, la app muestra configuracion inicial antes del login.
- El primer usuario se crea desde la app como `admin` y hereda `acceso_total`.
- Login con `email + password`.
- Sesion autenticada con JWT.
- Endpoint de sesion actual en `/api/auth/me`.
- No existe MFA en la implementacion actual.

### 2. Usuarios, roles y acceso por sociedades

- Cada usuario pertenece a un solo rol.
- Existe administracion de usuarios, roles, permisos por rol y asignacion de sociedades.
- El acceso se controla por permisos y por sociedades asignadas.
- El codigo de un rol se define al crearlo y luego queda inmutable desde la app para no romper referencias operativas.
- El rol `admin` debe conservar `acceso_total` y `usuarios_administrar`.
- No existen excepciones de permisos por usuario; cualquier ajuste de permisos aplica al rol completo.

Roles activos en el seed base:

- `admin`
- `gerencia_financiera`
- `gerencia_contable`
- `gerencia_construccion`
- `gerencia_presupuesto`
- `gerencia_mercadeo`
- `gerencia_ventas`
- `gerencia_infraestructura`
- `gerencia_proyectos`
- `contabilidad_jefe`
- `contabilidad_asistente`
- `tesoreria_encargado`
- `tesoreria_auxiliar`
- `proveeduria`
- `asistencia`
- `personalizado`

El seed normal conserva roles/permisos, pero no crea usuarios demo. Los usuarios posteriores al primer admin se crean desde la administracion interna por usuarios con permiso `usuarios_administrar` o `acceso_total`; los roles y permisos se administran desde la pantalla de usuarios.

### 3. Dominios documentales y persistencia

- El sistema maneja `facturas`, `notas_credito`, `tiquetes_electronicos` y `mensajes_hacienda`.
- Los documentos y adjuntos se almacenan en filesystem con rutas persistidas en base de datos.
- La app expone visualizacion y descarga de PDF/XML mediante `/api/files/*`.
- Existe soporte de versiones documentales, comentarios, historial de estados y auditoria.

### 4. Contabilizacion y datos operativos

- La factura puede enriquecerse con datos de contabilizacion.
- Ya existen asociaciones operativas con:
  - proveedores,
  - centros de costo,
  - ordenes de compra,
  - tablas de pago,
  - notas de credito,
  - retenciones,
  - pagos parciales.
- La solucion actual ya trabaja con moneda como dato de dominio y evita mezclar montos entre `CRC` y `USD` en dashboards y reportes.

### 5. Workflow de tramites de pago

- Existe un workflow de tramites desacoplado del documento.
- El flujo actual contempla etapas de:
  - tesoreria,
  - aprobacion de gerencia,
  - aprobacion de gerencia contable,
  - aprobacion de gerencia financiera,
  - pago.
- La aprobacion de gerencia puede depender de aprobadores definidos por centro de costo.
- Existe historial del tramite y estados por documento dentro del tramite.

### 6. Dashboard y reportes

- Existe dashboard base con resumen documental, actividad reciente, documentos recientes, totales por moneda y proveedores.
- Existen exportaciones operativas a Excel para facturas y notas de credito.
- Existen filtros y vistas operativas para facturas y tramites.

### 7. Modulos adicionales ya presentes

- `proveedores`
- `usuarios`
- `sociedades`
- `centros_costo`
- `tablas_pago`
- `ordenes_compra`
- `reservas`

## Implementado parcialmente o en consolidacion

### 1. Ingesta por correo

- Existe un flujo real de apoyo para correo en `docs/integraciones/correo/`.
- Existen scripts de importacion y watcher en backend.
- Aun no debe asumirse como un modulo productizado de extremo a extremo dentro de la UI principal.

### 2. Dashboard por rol

- Ya existe base para experiencia por perfil y copy por rol.
- Aun faltan colas operativas mas completas, widgets realmente diferenciados por rol y alertas operativas mas profundas.

### 3. Firma y autorizacion

- Existe permiso de `documentos_firmar_autorizar` y acciones de aprobacion/autorizacion dentro del workflow.
- No existe evidencia de firma digital avanzada, certificado digital, estampado grafico de firma en PDF o validacion criptografica final del documento.

### 4. Notificaciones

- La UI ya muestra alertas y mensajes de accion en varios flujos.
- No existe un centro de notificaciones consolidado ni notificaciones en tiempo real.

## Pendiente o fuera del alcance actual

- MFA por correo o segundo factor.
- Envio automatico de correos desde la app como capacidad consolidada del producto.
- Motor formal de tareas por movimiento para cada usuario.
- Firma digital certificada o integracion con certificados.
- Validacion criptografica de integridad del PDF despues de firmar.
- Integraciones ERP en tiempo real.
- Almacenamiento de PDF dentro de la base de datos como estrategia principal.

## Ajustes respecto al levantamiento inicial

- El levantamiento inicial mencionaba `inmobiliaria` como rol; ese rol no forma parte del seed actual.
- El sistema actual no se apoya en un unico estado plano del documento; hoy hay separacion entre estados documentales y workflow de pago.
- La decision actual de almacenamiento es `filesystem + rutas en DB`, no `blob en DB`.
- La aprobacion actual es operativa y basada en permisos/etapas; no debe confundirse con firma digital formal.

## Regla de mantenimiento documental

- `docs/historico/REQUERIMIENTOS.md`: historia del inicio del proyecto.
- `docs/requerimientos_vigentes.md`: resumen funcional vigente.
- `docs/arquitectura/`: detalle tecnico y reglas que deben mantenerse consistentes con el codigo.

Cuando se implemente una capacidad nueva o se descarte una suposicion antigua, este documento debe actualizarse en el mismo cambio para evitar que la documentacion vuelva a divergir.
