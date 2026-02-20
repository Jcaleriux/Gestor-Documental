function StatusBadge({ label, className = '' }) {
  return (
    <span className={`status-badge ${className}`}>
      {label}
    </span>
  );
}

export default StatusBadge;
