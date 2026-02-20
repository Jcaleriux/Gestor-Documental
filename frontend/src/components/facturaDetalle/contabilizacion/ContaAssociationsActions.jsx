function ContaAssociationsActions({
  conta,
  tablasLoading,
  notasLoading,
  tablaPagoActual,
  notaCreditoActual,
  abrirAsociarTablaPago,
  abrirAsociarNotaCredito,
  verTablaPagoAsociada,
  verNotaCreditoAsociada
}) {
  return (
    <>
      <div className="col-12 d-flex flex-wrap gap-2">
        <button
          className="btn btn-outline-primary btn-sm"
          type="button"
          onClick={abrirAsociarTablaPago}
          disabled={tablasLoading || !conta.proveedor_id}
        >
          {tablasLoading ? 'Cargando tablas...' : 'Asociar tabla de pagos'}
        </button>
        <button
          className="btn btn-outline-primary btn-sm"
          type="button"
          onClick={abrirAsociarNotaCredito}
          disabled={notasLoading || !conta.proveedor_id}
        >
          {notasLoading ? 'Cargando notas...' : 'Asociar nota de credito'}
        </button>
        {tablaPagoActual?.ruta_pdf && (
          <button
            className="btn btn-outline-success btn-sm"
            type="button"
            onClick={verTablaPagoAsociada}
          >
            Ver tabla de pagos
          </button>
        )}
        {(notaCreditoActual?.ruta_pdf || notaCreditoActual?.ruta_xml) && (
          <button
            className="btn btn-outline-success btn-sm"
            type="button"
            onClick={verNotaCreditoAsociada}
          >
            Ver nota de credito
          </button>
        )}
      </div>

      {tablaPagoActual && (
        <div className="col-12">
          <div className="alert alert-info py-2 mb-0">
            Tabla asociada: {tablaPagoActual.nombre}
          </div>
        </div>
      )}
      {notaCreditoActual && (
        <div className="col-12">
          <div className="alert alert-info py-2 mb-0">
            Nota de credito asociada: {notaCreditoActual.clave || `#${notaCreditoActual.id}`}
          </div>
        </div>
      )}
    </>
  );
}

export default ContaAssociationsActions;
