function SectionCard({
  title,
  actions,
  className = '',
  bodyClassName = '',
  children
}) {
  return (
    <div className={`card section-card shadow-sm border-0 ${className}`.trim()}>
      <div className={`card-body ${bodyClassName}`.trim()}>
        {(title || actions) && (
          <div className="section-card-header d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
            {title && <h5 className="section-card-title mb-0">{title}</h5>}
            {actions && <div>{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default SectionCard;
