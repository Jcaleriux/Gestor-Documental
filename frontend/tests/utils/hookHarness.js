import React from 'react';

const areDepsEqual = (prevDeps, nextDeps) => {
  if (!Array.isArray(prevDeps) || !Array.isArray(nextDeps)) {
    return false;
  }
  if (prevDeps.length !== nextDeps.length) {
    return false;
  }
  for (let index = 0; index < prevDeps.length; index += 1) {
    if (!Object.is(prevDeps[index], nextDeps[index])) {
      return false;
    }
  }
  return true;
};

const waitTick = () => new Promise((resolve) => setTimeout(resolve, 0));

export const createHookHarness = ({ hook, initialProps, autoRunEffects = true }) => {
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  if (!internals) {
    throw new Error('React internals no disponibles para ejecutar pruebas de hooks.');
  }

  const stateValues = [];
  const stateSetters = [];
  const reducerValues = [];
  const reducerDispatchers = [];
  const memoValues = [];
  const memoDeps = [];
  const refValues = [];
  const effectStates = [];

  let props = initialProps;
  let result;
  let shouldRender = false;
  let stateIndex = 0;
  let reducerIndex = 0;
  let memoIndex = 0;
  let refIndex = 0;
  let effectIndex = 0;

  const scheduleRender = () => {
    shouldRender = true;
  };

  const dispatcher = {
    useState(initialValue) {
      const currentIndex = stateIndex;
      stateIndex += 1;

      if (!(currentIndex in stateValues)) {
        stateValues[currentIndex] = typeof initialValue === 'function'
          ? initialValue()
          : initialValue;
      }

      if (!(currentIndex in stateSetters)) {
        stateSetters[currentIndex] = (nextValue) => {
          stateValues[currentIndex] = typeof nextValue === 'function'
            ? nextValue(stateValues[currentIndex])
            : nextValue;
          scheduleRender();
        };
      }

      return [stateValues[currentIndex], stateSetters[currentIndex]];
    },
    useReducer(reducer, initialArg, init) {
      const currentIndex = reducerIndex;
      reducerIndex += 1;

      if (!(currentIndex in reducerValues)) {
        reducerValues[currentIndex] = typeof init === 'function'
          ? init(initialArg)
          : initialArg;
      }

      if (!(currentIndex in reducerDispatchers)) {
        reducerDispatchers[currentIndex] = (action) => {
          reducerValues[currentIndex] = reducer(reducerValues[currentIndex], action);
          scheduleRender();
        };
      }

      return [reducerValues[currentIndex], reducerDispatchers[currentIndex]];
    },
    useEffect(create, deps) {
      const currentIndex = effectIndex;
      effectIndex += 1;
      const previous = effectStates[currentIndex];
      const shouldRun = !previous || deps === undefined || !areDepsEqual(previous.deps, deps);

      effectStates[currentIndex] = {
        create,
        deps,
        cleanup: previous?.cleanup || null,
        pending: shouldRun
      };
    },
    useMemo(factory, deps) {
      const currentIndex = memoIndex;
      memoIndex += 1;
      if (!(currentIndex in memoValues) || deps === undefined || !areDepsEqual(memoDeps[currentIndex], deps)) {
        memoValues[currentIndex] = factory();
        memoDeps[currentIndex] = deps;
      }
      return memoValues[currentIndex];
    },
    useCallback(fn, deps) {
      return dispatcher.useMemo(() => fn, deps);
    },
    useRef(initialValue) {
      const currentIndex = refIndex;
      refIndex += 1;
      if (!(currentIndex in refValues)) {
        refValues[currentIndex] = { current: initialValue };
      }
      return refValues[currentIndex];
    }
  };

  const runEffects = () => {
    effectStates.forEach((entry) => {
      if (!entry?.pending) return;
      entry.pending = false;
      if (typeof entry.cleanup === 'function') {
        entry.cleanup();
      }
      const cleanup = entry.create();
      entry.cleanup = typeof cleanup === 'function' ? cleanup : null;
    });
  };

  const renderOnce = () => {
    const previousDispatcher = internals.H;
    internals.H = dispatcher;
    stateIndex = 0;
    reducerIndex = 0;
    memoIndex = 0;
    refIndex = 0;
    effectIndex = 0;
    result = hook(props);
    internals.H = previousDispatcher;
    if (autoRunEffects) {
      runEffects();
    }
  };

  const flushSync = () => {
    while (shouldRender) {
      shouldRender = false;
      renderOnce();
    }
  };

  const flush = async ({ cycles = 5 } = {}) => {
    for (let index = 0; index < cycles; index += 1) {
      await waitTick();
      flushSync();
    }
  };

  const rerender = (nextProps) => {
    props = nextProps;
    shouldRender = true;
    flushSync();
  };

  const unmount = () => {
    effectStates.forEach((entry) => {
      if (typeof entry?.cleanup === 'function') {
        entry.cleanup();
      }
    });
  };

  renderOnce();
  flushSync();

  return {
    get result() {
      return result;
    },
    flush,
    rerender,
    unmount
  };
};
