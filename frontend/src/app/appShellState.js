export const buildExpandedSectionsState = (sections, storedValue = {}) => {
  const defaults = Object.fromEntries(sections.map((section) => [section.id, true]));

  if (!storedValue || typeof storedValue !== 'object') {
    return defaults;
  }

  return Object.keys(defaults).reduce((result, sectionId) => {
    result[sectionId] = storedValue[sectionId] !== undefined
      ? Boolean(storedValue[sectionId])
      : defaults[sectionId];
    return result;
  }, {});
};

export const buildVisibleExpandedSections = ({
  sections,
  storedValue = {},
  activeSectionId = null,
  pathname = '',
  syncedPathname = '',
}) => {
  const baseState = buildExpandedSectionsState(sections, storedValue);

  if (!activeSectionId || syncedPathname === pathname || baseState[activeSectionId] === true) {
    return baseState;
  }

  return {
    ...baseState,
    [activeSectionId]: true,
  };
};

export const buildMobileSidebarOpen = ({
  isMobileView,
  pathname,
  state,
}) => Boolean(
  isMobileView
  && state?.open
  && state?.pathname === pathname,
);
