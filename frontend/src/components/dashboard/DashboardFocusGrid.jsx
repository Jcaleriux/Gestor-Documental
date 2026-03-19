function DashboardFocusGrid({ items }) {
  return (
    <div className="dashboard-focus-grid">
      {items.map((item) => (
        <div className="dashboard-focus-card" key={item.label}>
          <div className="dashboard-focus-label">{item.label}</div>
          <div className="dashboard-focus-value">{item.value}</div>
          <div className="dashboard-focus-description">{item.description}</div>
        </div>
      ))}
    </div>
  );
}

export default DashboardFocusGrid;
