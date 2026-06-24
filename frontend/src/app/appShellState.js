export const buildExpandedSectionsState = (sections, storedValue = {}) => {
  const defaults = Object.fromEntries(sections.map((section) => [section.id, false]));

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
}) => {
  return buildExpandedSectionsState(sections, storedValue);
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
