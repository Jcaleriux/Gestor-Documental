function DataTable({
  headers = [],
  children,
  className = '',
  tableClassName = 'table table-hover align-middle mb-0'
}) {
  return (
    <div className={`table-responsive ${className}`.trim()}>
      <table className={tableClassName}>
        {headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default DataTable;
