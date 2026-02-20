function PageHeader({
  title,
  subtitle,
  actions,
  className = '',
  actionsClassName = ''
}) {
  return (
    <div className={`documents-header ${className}`.trim()}>
      <div>
        <h2 className="page-title">{title}</h2>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {actions && (
        <div className={actionsClassName || 'page-actions'}>
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
