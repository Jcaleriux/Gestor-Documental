const PDF_VIEWER_FRAGMENT = 'zoom=page-width';

const withPdfFitToWidth = (url) => {
  if (!url) {
    return '';
  }

  return `${url}${url.includes('#') ? '&' : '#'}${PDF_VIEWER_FRAGMENT}`;
};

export {
  PDF_VIEWER_FRAGMENT,
  withPdfFitToWidth,
};
