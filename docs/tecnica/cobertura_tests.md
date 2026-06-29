# Cobertura De Tests

Fecha de referencia: 2026-06-29.

Esta guia define los comandos de cobertura vigentes y el alcance real que mide cada suite.

## Comandos

Desde la raiz del repo:

```bash
pnpm run test:coverage
pnpm run test:coverage:backend
pnpm run test:coverage:frontend
```

Desde cada paquete:

```bash
pnpm --dir backend run test:coverage
pnpm --dir frontend run test:coverage
```

Si `pnpm` intenta reinstalar dependencias en un entorno no interactivo, se puede ejecutar el runner directo:

```bash
cd backend
node node_modules/jest/bin/jest.js --runInBand --coverage --coverageReporters=text --coverageReporters=text-summary --coverageReporters=json-summary

cd frontend
node --test --experimental-test-coverage --test-coverage-include=src/**/*.js --test-coverage-exclude=tests/**/*.js tests/run-ci-suite.js
```

## Alcance Actual

Backend usa Jest/Istanbul y cubre los archivos cargados por `backend/__tests__/`.

Frontend usa el runner nativo de Node y cubre archivos `src/**/*.js` importados por `frontend/tests/run-ci-suite.js`. La medicion actual no cubre componentes `.jsx`, porque esos archivos requieren el pipeline de Vite/React y no se cargan directamente en el runner de Node.

## Criterio De Mejora

Priorizar tests por riesgo de negocio antes que por porcentaje global:

- dinero, pagos, retenciones y saldos;
- workflow de tramites y permisos;
- importacion y parsing de documentos;
- reportes/exportaciones;
- repositorios SQL criticos.

No agregar dependencias de test para componentes `.jsx` sin evaluar el impacto y confirmar la decision.
