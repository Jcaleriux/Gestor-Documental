function FiltersPanel({ visible = true, className = '', children }) {
  if (!visible) return null;

  return (
    <div className={`filters-row ${className}`.trim()}>
      {children}
    </div>
  );
}

export default FiltersPanel;
