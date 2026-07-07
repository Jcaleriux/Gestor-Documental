function ThemeDiscoveryTooltip({
  onDismiss,
  onOpenSettings,
}) {
  return (
    <div className="theme-discovery-tooltip" role="status">
      <div className="theme-discovery-eyebrow">Nuevo</div>
      <div className="theme-discovery-title">Modo claro y oscuro</div>
      <p>Cambia el tema desde tu perfil cuando prefieras trabajar con menos brillo.</p>
      <div className="theme-discovery-actions">
        <button type="button" className="theme-discovery-secondary" onClick={onDismiss}>
          Entendido
        </button>
        <button type="button" className="theme-discovery-primary" onClick={onOpenSettings}>
          Configurar
        </button>
      </div>
    </div>
  );
}

export default ThemeDiscoveryTooltip;
