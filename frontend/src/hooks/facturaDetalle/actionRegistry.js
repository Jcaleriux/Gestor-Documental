import { createCommentEstadoActions } from './commentEstadoActions.js';
import { createContabilizacionActions } from './contabilizacionActions.js';
import { createDocumentActions } from './documentActions.js';

const createScopedActionModule = ({
  name,
  scope,
  createActions
}) => ({
  name,
  scope,
  createActions
});

const createCommentEstadoActionModule = createScopedActionModule({
  name: 'commentEstado',
  scope: 'commentEstado',
  createActions: ({ moduleInputs, shared }) => createCommentEstadoActions({
    ...moduleInputs,
    facturaApi: shared.facturaApi
  })
});

const createContabilizacionActionModule = createScopedActionModule({
  name: 'contabilizacion',
  scope: 'contabilizacion',
  createActions: ({ moduleInputs, shared }) => createContabilizacionActions({
    ...moduleInputs,
    facturaApi: shared.facturaApi
  })
});

const createDocumentActionModule = createScopedActionModule({
  name: 'document',
  scope: 'document',
  createActions: ({ moduleInputs, shared }) => createDocumentActions({
    ...moduleInputs,
    facturaApi: shared.facturaApi,
    buildAuthUrl: shared.buildAuthUrl,
    openWindow: shared.openWindow
  })
});

const ensureUniqueActionName = ({ actionName, moduleName, registry }) => {
  if (registry[actionName]) {
    throw new Error(`FacturaDetalle action duplicated: "${actionName}" from module "${moduleName}"`);
  }
};

const isScopedModuleDefinition = (moduleDefinition) => (
  Boolean(moduleDefinition)
  && typeof moduleDefinition === 'object'
  && typeof moduleDefinition.createActions === 'function'
);

const ensureNoLegacyModuleDefinition = (moduleDefinition) => {
  if (typeof moduleDefinition === 'function') {
    throw new Error('FacturaDetalle legacy action modules ya no son soportados. Use createScopedActionModule.');
  }
};

const normalizeScopedModule = ({ moduleDefinition, index }) => ({
  name: moduleDefinition.name || `module_${index + 1}`,
  scope: moduleDefinition.scope,
  createActions: moduleDefinition.createActions
});

const normalizeModuleDefinition = ({ moduleDefinition, index }) => {
  ensureNoLegacyModuleDefinition(moduleDefinition);

  if (isScopedModuleDefinition(moduleDefinition)) {
    return normalizeScopedModule({ moduleDefinition, index });
  }

  return null;
};

const getScopedModuleInputs = ({ moduleInputs, scope }) => (
  scope ? moduleInputs?.[scope] || {} : {}
);

const executeScopedModule = ({ moduleDescriptor, moduleInputs, shared }) => {
  const scopedInputs = getScopedModuleInputs({
    moduleInputs,
    scope: moduleDescriptor.scope
  });

  return moduleDescriptor.createActions({
    moduleInputs: scopedInputs,
    shared,
    scope: moduleDescriptor.scope
  }) || {};
};

const mergeActionsWithCollisionGuard = ({ registry, moduleName, moduleActions }) => {
  Object.entries(moduleActions).forEach(([actionName, actionHandler]) => {
    ensureUniqueActionName({ actionName, moduleName, registry });
    registry[actionName] = actionHandler;
  });

  return registry;
};

const mergeModuleActions = ({ modules, moduleInputs, shared }) => {
  const normalizedModules = modules
    .map((moduleDefinition, index) => normalizeModuleDefinition({ moduleDefinition, index }))
    .filter(Boolean);

  return normalizedModules.reduce((registry, moduleDescriptor) => {
    const moduleActions = executeScopedModule({
      moduleDescriptor,
      moduleInputs,
      shared
    });

    return mergeActionsWithCollisionGuard({
      registry,
      moduleName: moduleDescriptor.name,
      moduleActions
    });
  }, {});
};

const defaultActionModules = [
  createCommentEstadoActionModule,
  createContabilizacionActionModule,
  createDocumentActionModule
];

export {
  defaultActionModules,
  mergeModuleActions,
  createScopedActionModule
};
