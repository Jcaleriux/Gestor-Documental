const CURRENT_HEADER_PREFIX = 'X-SendaDocs';

const RESPONSE_HEADERS = Object.freeze({
  partialDownload: `${CURRENT_HEADER_PREFIX}-Partial-Download`,
  omittedCount: `${CURRENT_HEADER_PREFIX}-Omitted-Count`,
  omittedItems: `${CURRENT_HEADER_PREFIX}-Omitted-Items`,
});

const readResponseHeader = (headers, key) => (
  headers?.get?.(RESPONSE_HEADERS[key])
  || ''
);

export {
  RESPONSE_HEADERS,
  readResponseHeader,
};
