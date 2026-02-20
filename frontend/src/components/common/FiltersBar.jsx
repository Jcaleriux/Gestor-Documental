function FiltersBar({ className = '', children }) {
  return (
    <div className={`documents-filters ${className}`.trim()}>
      {children}
    </div>
  );
}

export default FiltersBar;
