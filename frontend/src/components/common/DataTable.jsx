const SortIcon = ({ direction, active }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    className={`data-table-sort-icon${active ? ' active' : ''}`}
    aria-hidden="true"
  >
    <path
      d={direction === 'asc' ? 'M5 9l3-3 3 3' : 'M5 7l3 3 3-3'}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const normalizeHeaders = (headers = []) => headers.map((header) => {
  if (typeof header === 'string') {
    return {
      key: header,
      label: header,
      align: 'start',
      sortable: false,
    };
  }

  return {
    key: header.key || header.label,
    label: header.label || header.key,
    align: header.align || 'start',
    sortable: Boolean(header.sortable && header.sortKey),
    sortKey: header.sortKey || null,
    className: header.className || '',
    headerClassName: header.headerClassName || '',
  };
});

function DataTable({
  headers = [],
  children,
  className = '',
  tableClassName = 'table table-hover align-middle mb-0',
  stickyHeader = false,
  sortBy = '',
  sortDir = 'asc',
  onSort = null,
}) {
  const normalizedHeaders = normalizeHeaders(headers);

  return (
    <div className={`table-responsive ${stickyHeader ? 'sticky-table-wrap' : ''} ${className}`.trim()}>
      <table className={`data-table ${tableClassName}`.trim()}>
        {normalizedHeaders.length > 0 && (
          <thead>
            <tr>
              {normalizedHeaders.map((header) => {
                const isActiveSort = header.sortable && header.sortKey === sortBy;
                const nextSortDir = isActiveSort && sortDir === 'asc' ? 'desc' : 'asc';
                const alignClass = header.align === 'end'
                  ? 'text-end'
                  : header.align === 'center'
                    ? 'text-center'
                    : '';

                return (
                  <th
                    key={header.key}
                    className={[alignClass, header.headerClassName].filter(Boolean).join(' ')}
                    scope="col"
                  >
                    {header.sortable && typeof onSort === 'function' ? (
                      <button
                        type="button"
                        className={`data-table-sort-btn${isActiveSort ? ' active' : ''}`}
                        onClick={() => onSort(header.sortKey, nextSortDir)}
                      >
                        <span>{header.label}</span>
                        <SortIcon direction={isActiveSort ? sortDir : 'desc'} active={isActiveSort} />
                      </button>
                    ) : (
                      header.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
        )}
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default DataTable;
