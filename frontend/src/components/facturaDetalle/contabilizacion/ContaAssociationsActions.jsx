import { useRef, useState } from 'react';

function DocumentoRespaldoAlert({
  documento,
  canEditContabilizacion,
  deletingId,
  onOpen,
  onDelete
}) {
  return (
    <div className="alert alert-info py-2 mb-0 d-flex flex-wrap justify-content-between align-items-center gap-2">
      <span>
        Documento de respaldo: {documento.nombre_archivo}
      </span>
      <div className="d-flex flex-wrap gap-2">
        <button
          className="btn btn-outline-success btn-sm"
          type="button"
          onClick={() => onOpen(documento)}
        >
          Ver documento de respaldo
        </button>
        {canEditContabilizacion ? (
          <button
            className="btn btn-outline-danger btn-sm"
            type="button"
            onClick={() => onDelete(documento)}
            disabled={deletingId === documento.id}
          >
            {deletingId === documento.id ? 'Eliminando...' : 'Eliminar'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ContaAssociationsActions({ viewModel }) {
  const {
    conta,
    canEditContabilizacion,
    tablasLoading,
    ordenesLoading,
    notasLoading,
    tablaPagoActual,
    ordenCompraActual,
    notaCreditoActual,
    documentosRespaldoActuales,
    abrirAsociarTablaPago,
    abrirAsociarOrdenCompra,
    abrirAsociarNotaCredito,
    desenlazarOrdenCompra,
    verTablaPagoAsociada,
    verOrdenCompraAsociada,
    verNotaCreditoAsociada,
    verDocumentoRespaldo,
    subirDocumentosRespaldo,
    eliminarDocumentoRespaldo
  } = viewModel;

  const respaldoInputRef = useRef(null);
  const [uploadingRespaldo, setUploadingRespaldo] = useState(false);
  const [deletingRespaldoId, setDeletingRespaldoId] = useState(null);

  const handleOpenRespaldoPicker = () => {
    respaldoInputRef.current?.click();
  };

  const handleRespaldoFilesChange = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    setUploadingRespaldo(true);
    try {
      await subirDocumentosRespaldo(files);
    } finally {
      setUploadingRespaldo(false);
    }
  };

  const handleDeleteRespaldo = async (documento) => {
    setDeletingRespaldoId(documento.id);
    try {
      await eliminarDocumentoRespaldo(documento);
    } finally {
      setDeletingRespaldoId(null);
    }
  };

  return (
    <>
      {canEditContabilizacion ? (
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
            onClick={abrirAsociarOrdenCompra}
            disabled={ordenesLoading || !conta.proveedor_id}
          >
            {ordenesLoading ? 'Cargando OCs...' : 'Asociar orden de compra'}
          </button>
          <button
            className="btn btn-outline-primary btn-sm"
            type="button"
            onClick={abrirAsociarNotaCredito}
            disabled={notasLoading || !conta.proveedor_id}
          >
            {notasLoading ? 'Cargando notas...' : 'Asociar nota de credito'}
          </button>
          <button
            className="btn btn-outline-primary btn-sm"
            type="button"
            onClick={handleOpenRespaldoPicker}
            disabled={uploadingRespaldo}
          >
            {uploadingRespaldo ? 'Subiendo respaldos...' : 'Agregar documentos de respaldo'}
          </button>
          <input
            ref={respaldoInputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="d-none"
            onChange={handleRespaldoFilesChange}
          />
        </div>
      ) : null}

      <div className="col-12 d-flex flex-wrap gap-2">
        {tablaPagoActual?.ruta_pdf && (
          <button
            className="btn btn-outline-success btn-sm"
            type="button"
            onClick={verTablaPagoAsociada}
          >
            Ver tabla de pagos
          </button>
        )}
        {ordenCompraActual?.ruta_pdf && (
          <button
            className="btn btn-outline-success btn-sm"
            type="button"
            onClick={verOrdenCompraAsociada}
          >
            Ver orden de compra
          </button>
        )}
        {canEditContabilizacion && ordenCompraActual && (
          <button
            className="btn btn-outline-danger btn-sm"
            type="button"
            onClick={desenlazarOrdenCompra}
          >
            Desenlazar orden de compra
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
      {ordenCompraActual && (
        <div className="col-12">
          <div className="alert alert-info py-2 mb-0 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span>Orden de compra asociada: {ordenCompraActual.nombre}</span>
            {canEditContabilizacion ? (
              <span className="small text-muted">
                Si fue una seleccion incorrecta, puedes desenlazarla y luego guardar.
              </span>
            ) : null}
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
      {Array.isArray(documentosRespaldoActuales) && documentosRespaldoActuales.map((documento) => (
        <div className="col-12" key={documento.id}>
          <DocumentoRespaldoAlert
            documento={documento}
            canEditContabilizacion={canEditContabilizacion}
            deletingId={deletingRespaldoId}
            onOpen={verDocumentoRespaldo}
            onDelete={handleDeleteRespaldo}
          />
        </div>
      ))}
    </>
  );
}

export default ContaAssociationsActions;
