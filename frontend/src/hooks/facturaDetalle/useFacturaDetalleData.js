import { useCallback, useEffect } from 'react';
import { facturaDetalleApi } from '../../services/facturaDetalleApi.js';
import { centrosCostoApi } from '../../services/centrosCostoApi.js';
import { useFacturaDetalleGeneralState } from './useFacturaDetalleGeneralState.js';
import { useFacturaDetalleContabilizacionState } from './useFacturaDetalleContabilizacionState.js';
import { fetchFacturaDetalleData } from './facturaDetalleLoaders.js';
import { mapFacturaDetalleDataToViewState } from './facturaDetalleMappers.js';

const defaultNowProvider = () => new Date();

const applyFetchedDetalleState = ({
  stateData,
  generalSetters,
  contabilizacionSetters
}) => {
  generalSetters.setFactura(stateData.factura);
  generalSetters.setComentarios(stateData.comentarios);
  generalSetters.setEstados(stateData.estados);

  contabilizacionSetters.setRetencionPagos(stateData.retencionPagos);
  contabilizacionSetters.setProveedoresSociedad(stateData.proveedoresSociedad);
  contabilizacionSetters.setTablaPagoActual(stateData.tablaPagoActual);
  contabilizacionSetters.setOrdenCompraActual(stateData.ordenCompraActual);
  contabilizacionSetters.setNotaCreditoActual(stateData.notaCreditoActual);
  contabilizacionSetters.setDocumentosRespaldoActuales(stateData.documentosRespaldoActuales);
  contabilizacionSetters.setCentrosCostoCatalogo(stateData.centrosCostoCatalogo);
  contabilizacionSetters.setConta(stateData.conta);
  contabilizacionSetters.setRetencionPagoFecha(stateData.retencionPagoFecha);
};

export const useFacturaDetalleData = ({ id, sociedadId, dependencies = {} }) => {
  const {
    facturaApi = facturaDetalleApi,
    centrosApi = centrosCostoApi,
    nowProvider = defaultNowProvider
  } = dependencies;

  const generalState = useFacturaDetalleGeneralState();
  const contabilizacionState = useFacturaDetalleContabilizacionState();

  const {
    setFactura,
    setComentarios,
    setEstados,
    setLoading,
    setError
  } = generalState;

  const {
    setRetencionPagos,
    setProveedoresSociedad,
    setTablaPagoActual,
    setOrdenCompraActual,
    setNotaCreditoActual,
    setDocumentosRespaldoActuales,
    setCentrosCostoCatalogo,
    setConta,
    setRetencionPagoFecha
  } = contabilizacionState;

  const fetchAll = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const remoteData = await fetchFacturaDetalleData({
        id,
        facturaApi
      });

      const centrosCostoCatalogo = await centrosApi.listCentros({
        sociedadId: remoteData.facturaData?.sociedad_id || sociedadId
      });

      const mappedState = mapFacturaDetalleDataToViewState({
        ...remoteData,
        centrosCostoCatalogo,
        now: nowProvider()
      });

      applyFetchedDetalleState({
        stateData: mappedState,
        generalSetters: {
          setFactura,
          setComentarios,
          setEstados
        },
        contabilizacionSetters: {
          setRetencionPagos,
          setProveedoresSociedad,
          setTablaPagoActual,
          setOrdenCompraActual,
          setNotaCreditoActual,
          setDocumentosRespaldoActuales,
          setCentrosCostoCatalogo,
          setConta,
          setRetencionPagoFecha
        }
      });
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el detalle.');
    } finally {
      setLoading(false);
    }
  }, [
    id,
    facturaApi,
    centrosApi,
    nowProvider,
    sociedadId,
    setLoading,
    setError,
    setFactura,
    setComentarios,
    setEstados,
    setRetencionPagos,
    setProveedoresSociedad,
    setTablaPagoActual,
    setOrdenCompraActual,
    setNotaCreditoActual,
    setDocumentosRespaldoActuales,
    setCentrosCostoCatalogo,
    setConta,
    setRetencionPagoFecha
  ]);

  useEffect(() => {
    if (!sociedadId) {
      setLoading(false);
      return;
    }
    fetchAll();
  }, [fetchAll, sociedadId, setLoading]);

  return {
    ...generalState,
    ...contabilizacionState,
    fetchAll
  };
};
