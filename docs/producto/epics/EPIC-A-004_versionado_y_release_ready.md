# EPIC-A-004 Versionado Y Release Ready

## Estado

Hecho

## Problema

El proyecto ya tiene una base tecnica mucho mas estable, pero aun faltaba formalizar como:

- se versiona el producto,
- se corta una release,
- y se valida lo obligatorio antes del primer paso a produccion.

## Usuario o area afectada

- desarrollo
- operacion
- despliegue
- soporte futuro

## Resultado esperado

Un flujo de release mas profesional, trazable y repetible.

## Alcance

- politica de versionado
- fuente de verdad de version
- changelog
- reglas de tag Git
- criterio claro de release vs deployment
- checklist obligatorio antes del primer paso a produccion

## Fuera de alcance

- automatizacion completa de releases
- despliegue automatizado a produccion
- observabilidad completa del runtime

## Modulos impactados

- documentacion de producto
- documentacion operativa
- version metadata del repo

## Riesgos

- confundir version objetivo con tag ya liberado
- desplegar sin evidencia clara de version
- mezclar release y deployment como si fueran lo mismo

## Dependencias

- CI base ya existente
- checklist de despliegue
- versionado de migraciones ya resuelto

## Historias candidatas

- TECH-004
- TECH-005
- TECH-006
- TECH-007

## Criterios de exito

- la primera version objetivo esta definida
- existe politica de versionado
- existe changelog
- existe criterio claro para crear el tag Git
- y esta visible lo obligatorio antes del primer paso a produccion

## Progreso actual

- `TECH-004`: hecho
- `TECH-006`: hecho en Fase 1 con runbook explicito y helper no destructivo de backup/rollback
- `TECH-005`: hecho con endpoint tecnico `GET /api/release-info` y headers de release en `/api/health`
- `TECH-007`: hecho con perfil de preproduccion local, readiness en verde, evidencia JSON y smoke checks de dominio sobre `sociedades`, `dashboard`, `facturas` y `tramites-pago`
- estado local final de `TECH-007`: readiness y smoke checks en verde en esta PC, con evidencia guardada en `backend/backups/v1.0.0/local-preprod/`
- residual conocido de `TECH-007`: si el deployment final cambia de maquina, hay que repetir readiness, backup plan y smoke checks en el servidor objetivo
