function ActionAlerts({ error, message, className = '' }) {
  return (
    <>
      {error && <div className={`alert alert-danger ${className}`.trim()}>{error}</div>}
      {message && <div className={`alert alert-success ${className}`.trim()}>{message}</div>}
    </>
  );
}

export default ActionAlerts;
