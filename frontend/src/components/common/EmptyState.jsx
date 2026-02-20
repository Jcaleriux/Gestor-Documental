function EmptyState({ children, className = '' }) {
  return (
    <div className={`text-muted ${className}`}>
      {children}
    </div>
  );
}

export default EmptyState;
