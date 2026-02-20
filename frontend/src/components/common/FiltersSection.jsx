function FiltersSection({ title, className = '', children }) {
  return (
    <div className={`tramite-create-filters ${className}`.trim()}>
      {title && <div className="fw-semibold">{title}</div>}
      {children}
    </div>
  );
}

export default FiltersSection;
