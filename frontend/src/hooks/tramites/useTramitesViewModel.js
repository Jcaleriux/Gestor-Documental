import { useMemo, useState } from 'react';
import { getMoneda, getMontoDocumento } from '../../utils/formatters';
import { getTramiteSemaforoStatus } from '../../utils/tramitesSemaforo';

const getMontoRetencion = (row) => {
  const monto = Number(row?.monto_retencion_pendiente ?? row?.monto_retencion ?? 0);
  return Number.isFinite(monto) ? monto : 0;
};

const initialCreateFilters = {
  filtroEmisor: '',
  filtroProveedorRetencion: '',
  filtroMontoMin: '',
  filtroMontoMax: '',
  filtroMoneda: ''
};

export const useTramitesViewModel = ({
  tramites,
  facturasDisponibles,
  retencionesDisponibles,
  canCreateTramite,
  actorUsuario,
  fetchFacturasDisponibles,
  crearTramiteApi,
  setActionMessage,
  setActionError
}) => {
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedFacturas, setSelectedFacturas] = useState(new Set());
  const [selectedRetenciones, setSelectedRetenciones] = useState(new Set());
  const [createFilters, setCreateFilters] = useState(initialCreateFilters);

  const updateCreateFilter = (field) => (value) => {
    setCreateFilters((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const resetCreateState = () => {
    setSelectedFacturas(new Set());
    setSelectedRetenciones(new Set());
    setCreateFilters(initialCreateFilters);
  };

  const toggleSeleccionFactura = (facturaId) => {
    setSelectedFacturas((prev) => {
      const next = new Set(prev);
      if (next.has(facturaId)) {
        next.delete(facturaId);
      } else {
        next.add(facturaId);
      }
      return next;
    });
  };

  const toggleSeleccionRetencion = (facturaId) => {
    setSelectedRetenciones((prev) => {
      const next = new Set(prev);
      if (next.has(facturaId)) {
        next.delete(facturaId);
      } else {
        next.add(facturaId);
      }
      return next;
    });
  };

  const openCreate = () => {
    if (!canCreateTramite) return;
    setShowCreate(true);
    setActionMessage('');
    setActionError('');
    resetCreateState();
    fetchFacturasDisponibles();
  };

  const closeCreate = () => {
    setShowCreate(false);
    setActionMessage('');
    setActionError('');
    resetCreateState();
  };

  const crearTramite = async () => {
    if (!canCreateTramite) return;
    setActionMessage('');
    setActionError('');

    const facturaIds = Array.from(selectedFacturas);
    const retencionFacturaIds = Array.from(selectedRetenciones);

    if (facturaIds.length === 0 && retencionFacturaIds.length === 0) {
      setActionError('Selecciona al menos una factura o retencion.');
      return;
    }

    const ok = await crearTramiteApi({
      facturaIds,
      retencionFacturaIds,
      usuario: actorUsuario || 'system'
    });

    if (ok) {
      closeCreate();
    }
  };

  const tramitesFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase();

    return tramites
      .filter((tramite) => {
        const idText = String(tramite.id || '').toLowerCase();
        const creador = (tramite.creado_por || '').toLowerCase();
        const matchesSearch = !term || idText.includes(term) || creador.includes(term);
        const matchesEstado = !estado || tramite.estado === estado;
        return matchesSearch && matchesEstado;
      })
      .map((tramite) => ({
        ...tramite,
        semaforoStatus: getTramiteSemaforoStatus(tramite)
      }));
  }, [tramites, search, estado]);

  const facturasFiltradas = useMemo(() => {
    const emisorTerm = createFilters.filtroEmisor.trim().toLowerCase();
    const min = Number(createFilters.filtroMontoMin);
    const max = Number(createFilters.filtroMontoMax);
    const monedaTerm = createFilters.filtroMoneda.trim().toUpperCase();

    return facturasDisponibles.filter((factura) => {
      const emisor = (factura.emisor?.Nombre || factura.emisor?.nombre || '').toLowerCase();
      const monto = getMontoDocumento(factura, { preferAjustado: true });
      const moneda = getMoneda(factura).toUpperCase();

      const matchEmisor = !emisorTerm || emisor.includes(emisorTerm);
      const matchMin = !createFilters.filtroMontoMin || monto >= min;
      const matchMax = !createFilters.filtroMontoMax || monto <= max;
      const matchMoneda = !monedaTerm || moneda === monedaTerm;

      return matchEmisor && matchMin && matchMax && matchMoneda;
    });
  }, [facturasDisponibles, createFilters]);

  const retencionesFiltradas = useMemo(() => {
    const proveedorTerm = createFilters.filtroProveedorRetencion.trim().toLowerCase();
    const min = Number(createFilters.filtroMontoMin);
    const max = Number(createFilters.filtroMontoMax);
    const monedaTerm = createFilters.filtroMoneda.trim().toUpperCase();

    return retencionesDisponibles.filter((retencion) => {
      const proveedor = (retencion.proveedor_nombre || '').toLowerCase();
      const monto = getMontoRetencion(retencion);
      const moneda = String(retencion.moneda || 'CRC').toUpperCase();

      const matchProveedor = !proveedorTerm || proveedor.includes(proveedorTerm);
      const matchMin = !createFilters.filtroMontoMin || monto >= min;
      const matchMax = !createFilters.filtroMontoMax || monto <= max;
      const matchMoneda = !monedaTerm || moneda === monedaTerm;

      return matchProveedor && matchMin && matchMax && matchMoneda;
    });
  }, [retencionesDisponibles, createFilters]);

  const totalFacturasSeleccionadas = useMemo(() => {
    let total = 0;
    facturasDisponibles.forEach((factura) => {
      if (selectedFacturas.has(factura.id)) {
        total += getMontoDocumento(factura, { preferAjustado: true });
      }
    });
    return total;
  }, [facturasDisponibles, selectedFacturas]);

  const totalRetencionesSeleccionadas = useMemo(() => {
    let total = 0;
    retencionesDisponibles.forEach((retencion) => {
      if (selectedRetenciones.has(retencion.factura_id)) {
        total += getMontoRetencion(retencion);
      }
    });
    return total;
  }, [retencionesDisponibles, selectedRetenciones]);

  const totalSeleccionado = totalFacturasSeleccionadas + totalRetencionesSeleccionadas;

  const totalPorMoneda = useMemo(() => {
    const totals = {};

    facturasDisponibles.forEach((factura) => {
      if (!selectedFacturas.has(factura.id)) return;
      const moneda = getMoneda(factura);
      const monto = getMontoDocumento(factura, { preferAjustado: true });
      totals[moneda] = (totals[moneda] || 0) + monto;
    });

    retencionesDisponibles.forEach((retencion) => {
      if (!selectedRetenciones.has(retencion.factura_id)) return;
      const moneda = retencion.moneda || 'CRC';
      const monto = getMontoRetencion(retencion);
      totals[moneda] = (totals[moneda] || 0) + monto;
    });

    return totals;
  }, [facturasDisponibles, retencionesDisponibles, selectedFacturas, selectedRetenciones]);

  const monedasDisponibles = useMemo(() => {
    const setMonedas = new Set();
    facturasDisponibles.forEach((factura) => setMonedas.add(getMoneda(factura)));
    retencionesDisponibles.forEach((retencion) => setMonedas.add(retencion.moneda || 'CRC'));
    return Array.from(setMonedas).sort();
  }, [facturasDisponibles, retencionesDisponibles]);

  const marcarTodosVisibles = () => {
    setSelectedFacturas((prev) => {
      const next = new Set(prev);
      facturasFiltradas.forEach((factura) => next.add(factura.id));
      return next;
    });

    setSelectedRetenciones((prev) => {
      const next = new Set(prev);
      retencionesFiltradas.forEach((retencion) => next.add(retencion.factura_id));
      return next;
    });
  };

  const desmarcarTodos = () => {
    setSelectedFacturas(new Set());
    setSelectedRetenciones(new Set());
  };

  return {
    search,
    setSearch,
    estado,
    setEstado,
    showCreate,
    selectedFacturas,
    selectedRetenciones,
    createFilters,
    updateCreateFilter,
    openCreate,
    closeCreate,
    crearTramite,
    toggleSeleccionFactura,
    toggleSeleccionRetencion,
    tramitesFiltrados,
    facturasFiltradas,
    retencionesFiltradas,
    totalFacturasSeleccionadas,
    totalRetencionesSeleccionadas,
    totalSeleccionado,
    totalPorMoneda,
    monedasDisponibles,
    marcarTodosVisibles,
    desmarcarTodos
  };
};
