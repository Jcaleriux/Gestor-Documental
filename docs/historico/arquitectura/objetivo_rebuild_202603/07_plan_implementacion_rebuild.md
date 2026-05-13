# Plan de Implementacion (Rebuild)

> Nota: este plan describe el rebuild propuesto en marzo de 2026. Ya no debe usarse como plan operativo vigente sin contrastarlo contra `estado_actual.md` y `brechas_y_mejoras.md`.

## Objetivo
Rehacer el sistema con arquitectura limpia, manteniendo aprendizaje funcional del sistema actual.

## Estrategia general
1. Big-bang tecnico (esquema y codigo nuevo) porque no hay datos criticos a migrar.
2. Entregas por fases, cada una con Definition of Done.
3. Calidad guiada por tests de integracion y contratos API.

## Fase 0 - Discovery y decisiones (1 semana)
Entregables:
1. Vision y alcance aprobados.
2. Inventario AS-IS validado.
3. ADRs iniciales.

DoD:
- Documentos 01-03 aprobados por stakeholders tecnicos.

## Fase 1 - Diseno de datos y seguridad (1 semana)
Entregables:
1. ERD objetivo y diccionario de datos.
2. Catalogo de estados por dominio.
3. Matriz de permisos base.

DoD:
- Documentos 04-06 aprobados.
- SQL de schema objetivo listo para ejecutar.

## Fase 2 - Infra base backend (1 semana)
Entregables:
1. Proyecto backend base (capas y convenciones).
2. Sistema de migraciones versionadas.
3. Modulo auth + permisos + sociedades.

DoD:
- Login, validacion de token y autorizacion por endpoint operativos.

## Fase 3 - Contexto Documentos (2 semanas)
Entregables:
1. Ingesta y persistencia de documentos.
2. Endpoints de consulta por tipo documental.
3. Manejador de archivos y manifiestos.

DoD:
- Facturas/notas/tiquetes consultables con filtros basicos.
- Tests de integracion de alta y lectura.

## Fase 4 - Contexto Estados (1 semana)
Entregables:
1. Servicio de estado unico por dominio.
2. Estado actual + historial.
3. Reglas de transicion y permisos por dominio.

DoD:
- Cambio de estado con trazabilidad completa.
- Tests de transiciones permitidas/no permitidas.

## Fase 5 - Workflow de pagos desacoplado (2 semanas)
Entregables:
1. Tramites y decisiones por etapa.
2. Integracion con estado `workflow_pago` sin escribir datos canonicos.
3. Historial de workflow.

DoD:
- Flujo minimo de tramite end-to-end.
- Tests de negocio workflow.

## Fase 6 - Reportes, UI y hardening (1-2 semanas)
Entregables:
1. Reportes de documentos y estado.
2. Pantallas operativas por rol.
3. Observabilidad, manejo de errores, performance tuning basico.

DoD:
- Reportes estables y validos.
- P95 de endpoints criticos dentro del objetivo definido.

## Criterios transversales
1. Todo caso multi-tabla usa transaccion.
2. Todo endpoint protegido tiene permiso explicito.
3. Todo cambio de estado genera historial.
4. Todo cambio DB via migracion versionada.

## Riesgos y mitigaciones
1. Riesgo: scope creep en workflow.
- Mitigacion: definir V1 minima y backlog V2.

2. Riesgo: reglas de negocio ambiguas.
- Mitigacion: sesiones semanales de refinamiento + decision log.

3. Riesgo: deuda de pruebas.
- Mitigacion: no cerrar fase sin cobertura de integracion critica.

## Checklist de arranque
1. Aprobar documentos de arquitectura.
2. Congelar alcance V1.
3. Crear repositorio/branch de rebuild.
4. Configurar CI minima (lint + test + migraciones dry run).
5. Iniciar Fase 2.
