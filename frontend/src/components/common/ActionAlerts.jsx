function ActionAlerts({ error, warning, message, className = '' }) {
  return (
    <>
      {error && <div className={`alert alert-danger ${className}`.trim()}>{error}</div>}
      {warning && <div className={`alert alert-warning ${className}`.trim()}>{warning}</div>}
      {message && <div className={`alert alert-success ${className}`.trim()}>{message}</div>}
    </>
  );
}

export default ActionAlerts;
