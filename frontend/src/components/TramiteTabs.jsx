function TramiteTabs({ activeTab, onChange, labels }) {
  const tabLabels = labels || {
    individual: 'Documentos individuales',
    unificada: 'Vista unificada'
  };
  return (
    <div className="btn-group mb-3" role="group" aria-label="Vista de documentos">
      <button
        className={`btn ${activeTab === 'individual' ? 'btn-primary' : 'btn-outline-primary'}`}
        type="button"
        onClick={() => onChange('individual')}
      >
        {tabLabels.individual}
      </button>
      <button
        className={`btn ${activeTab === 'unificada' ? 'btn-primary' : 'btn-outline-primary'}`}
        type="button"
        onClick={() => onChange('unificada')}
      >
        {tabLabels.unificada}
      </button>
    </div>
  );
}

export default TramiteTabs;
