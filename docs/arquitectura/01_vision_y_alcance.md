# Vision y Alcance de Arquitectura

## Objetivo
Definir la arquitectura objetivo para rehacer el sistema desde cero, usando el proyecto actual como referencia funcional, pero corrigiendo acoplamientos entre procesamiento documental, estados y workflow.

## Principios de diseno
1. Source of truth documental: los datos canonicamente validos del documento viven en el contexto Documentos.
2. Separacion de responsabilidades: Documentos, Estados y Workflow son modulos independientes.
3. Integridad en base de datos: FK, UNIQUE, CHECK, NOT NULL e indices desde el diseno inicial.
4. Transacciones obligatorias en operaciones multi-tabla.
5. Contratos explicitos: API, reglas de negocio y permisos versionados.
6. Trazabilidad completa: historial de estado, auditoria de acciones y actor responsable.
7. Arquitectura evolutiva: cambios por migraciones versionadas y ADR.

## Alcance V1
1. Ingesta y persistencia de documentos (facturas, notas de credito, tiquetes, mensajes hacienda).
2. Consultas y filtros documentales por sociedad.
3. Modelo de estados por dominio (hacienda, contabilizacion, workflow_pago).
4. Workflow de pago desacoplado del modelo canonico documental.
5. Seguridad por permisos y acceso por sociedades.
6. Reportes operativos de documentos y estados.

## Fuera de alcance V1
1. Integraciones ERP externas en tiempo real.
2. Motor BPM externo.
3. Multi-tenant con aislamiento fisico por cliente.
4. Firma digital avanzada certificada (si aplica, queda para fase posterior).

## Restricciones tecnicas base
1. Backend Node.js + Express.
2. Base de datos PostgreSQL relacional.
3. Driver SQL directo (`pg`), sin ORM en V1.
4. Frontend React (consumo REST).

## Decisiones iniciales
1. Mantener PostgreSQL como modelo principal.
2. Reemplazar acoplamiento actual `facturas.estado` -> workflow por modelo de estado por dominio.
3. Definir migraciones versionadas desde el inicio (no editar historial aplicado).
4. Mantener auditoria y trazabilidad como requerimiento no negociable.

## Criterios de exito arquitectonico
1. Ningun modulo de workflow modifica tablas canonicas documentales.
2. Todo cambio de estado deja rastro historico con usuario, fecha y motivo.
3. API publica con contratos y permisos documentados.
4. Tests de integracion para casos criticos (ingesta, estado, workflow, reportes).
5. Runbook de operacion DB (backup, restore, rollback de release).
