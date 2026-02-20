export const createMockFn = (implementation = undefined) => {
  const calls = [];
  const mock = (...args) => {
    calls.push(args);
    if (typeof implementation === 'function') {
      return implementation(...args);
    }
    return implementation;
  };

  mock.calls = calls;
  return mock;
};
