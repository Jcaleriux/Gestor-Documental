import { useCallback, useEffect, useMemo, useState } from 'react';

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const DEFAULT_FACTURAS_SORT_BY = 'fecha_emision';
export const DEFAULT_FACTURAS_SORT_DIR = 'desc';
export const DEFAULT_FACTURAS_PAGE_SIZE = 50;

// --------------------
// Helpers
// --------------------

const normalize = (str) =>
  String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const toUpperTrim = (value) => String(value || '').trim().toUpperCase();

const normalizeNullableNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDateInputOrNull = (value) => {
  if (!value) return null;
  const match = DATE_INPUT_PATTERN.exec(String(value).trim());
  if (!match) return null;

  const [_, y, m, d] = match;
  const date = new Date(`${y}-${m}-${d}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateOrNull = (value, { fromDateInput = false } = {}) => {
  if (!value) return null;

  if (fromDateInput) {
    const parsed = parseDateInputOrNull(value);
    if (parsed) return parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDayOrNull = (value, options) => {
  const parsed = toDateOrNull(value, options);
  if (!parsed) return null;
  const d = new Date(parsed);
  d.setHours(0, 0, 0, 0);
  return d;
};

// --------------------
// Matchers
// --------------------

const matchesDateRange = ({ fechaEmision, fechaDesde, fechaHasta }) => {
  const fecha = toDayOrNull(fechaEmision);
  if (!fecha) return false;

  const desde = toDayOrNull(fechaDesde, { fromDateInput: true });
  const hasta = toDayOrNull(fechaHasta, { fromDateInput: true });

  return (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
};

const matchesMontoRange = ({ monto, montoMin, montoMax }) => {
  const safeMonto = Number(monto) || 0;
  const min = normalizeNullableNumber(montoMin);
  const max = normalizeNullableNumber(montoMax);

  return (min === null || safeMonto >= min) &&
         (max === null || safeMonto <= max);
};

const getNotaMoneda = (nota) =>
  String(
    nota?.resumen?.CodigoTipoMoneda?.CodigoMoneda ||
    nota?.resumen?.CodigoMoneda ||
    nota?.resumen?.codigoMoneda ||
    'CRC'
  ).toUpperCase();

const getNotaMonto = (nota) => {
  const monto = Number(
    nota?.monto ??
    nota?.resumen?.TotalComprobante ??
    nota?.resumen?.totalComprobante ??
    0
  );
  return Number.isFinite(monto) ? monto : 0;
};

const matchesNotaCreditoFiltersForReport = (nota, activeFilters) => {
  // Nota: mantiene tu lógica original
  if (activeFilters.estado) return false;

  const emisor = normalize(nota.emisor?.Nombre || nota.emisor?.nombre);
  const consecutivo = normalize(nota.numero_consecutivo);
  const clave = normalize(nota.clave);

  const monedaNota = getNotaMoneda(nota);
  const totalNota = getNotaMonto(nota);

  // 🔥 búsqueda por palabras
  const words = activeFilters.searchTerm.split(/\s+/).filter(Boolean);

  const matchesSearch =
    words.length === 0 ||
    words.every(word =>
      emisor.includes(word) ||
      consecutivo.includes(word) ||
      clave.includes(word)
    );

  const matchesEmisor =
    !activeFilters.emisorTerm ||
    emisor.includes(activeFilters.emisorTerm);

  const matchesMoneda =
    !activeFilters.monedaTerm ||
    monedaNota === activeFilters.monedaTerm;

  const dateOk = matchesDateRange({
    fechaEmision: nota.fecha_emision,
    fechaDesde: activeFilters.fechaDesde,
    fechaHasta: activeFilters.fechaHasta
  });

  const montoOk = matchesMontoRange({
    monto: totalNota,
    montoMin: activeFilters.montoMin,
    montoMax: activeFilters.montoMax
  });

  return matchesSearch && matchesEmisor && matchesMoneda && dateOk && montoOk;
};

// --------------------
// Hook
// --------------------

export const useFacturasFilters = ({
  debounceMs = 300, 
  dashboardPreset = ''
} = {}) => {

  const [search, setSearchState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [estado, setEstadoState] = useState('');
  const [fechaDesde, setFechaDesdeState] = useState('');
  const [fechaHasta, setFechaHastaState] = useState('');
  const [emisorNombre, setEmisorNombreState] = useState('');
  const [moneda, setMonedaState] = useState('');
  const [montoMin, setMontoMinState] = useState('');
  const [montoMax, setMontoMaxState] = useState('');
  const [sortBy, setSortBy] = useState(DEFAULT_FACTURAS_SORT_BY);
  const [sortDir, setSortDir] = useState(DEFAULT_FACTURAS_SORT_DIR);
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_FACTURAS_PAGE_SIZE);

  // debounce
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, debounceMs);
    return () => clearTimeout(id);
  }, [search, debounceMs]);

  const resetPage = useCallback(() => setPageState(1), []);

  const setSearch = useCallback((value) => {
    resetPage();
    setSearchState(value);
  }, [resetPage]);

  const setEstado = useCallback((value) => {
    resetPage();
    setEstadoState(value);
  }, [resetPage]);

  const setFechaDesde = useCallback((value) => {
    resetPage();
    setFechaDesdeState(value);
  }, [resetPage]);

  const setFechaHasta = useCallback((value) => {
    resetPage();
    setFechaHastaState(value);
  }, [resetPage]);

  const setEmisorNombre = useCallback((value) => {
    resetPage();
    setEmisorNombreState(value);
  }, [resetPage]);

  const setMoneda = useCallback((value) => {
    resetPage();
    setMonedaState(value);
  }, [resetPage]);

  const setMontoMin = useCallback((value) => {
    resetPage();
    setMontoMinState(value);
  }, [resetPage]);

  const setMontoMax = useCallback((value) => {
    resetPage();
    setMontoMaxState(value);
  }, [resetPage]);

  const setPage = useCallback((v) => {
    setPageState(Math.max(1, Number(v) || 1));
  }, []);

  const setPageSize = useCallback((v) => {
    const size = Math.max(1, Number(v) || DEFAULT_FACTURAS_PAGE_SIZE);
    setPageState(1);
    setPageSizeState(size);
  }, []);

  const toggleSort = useCallback((next) => {
    resetPage();
    if (sortBy === next) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(next);
      setSortDir(next === 'emisor' ? 'asc' : 'desc');
    }
  }, [sortBy, resetPage]);

  const resetFilters = useCallback(() => {
    setSearchState('');
    setDebouncedSearch('');
    setEstadoState('');
    setFechaDesdeState('');
    setFechaHastaState('');
    setEmisorNombreState('');
    setMonedaState('');
    setMontoMinState('');
    setMontoMaxState('');
    setPageState(1);
  }, []);

  const resetPaginationAndSort = useCallback(() => {
    setPageState(1);
    setPageSizeState(DEFAULT_FACTURAS_PAGE_SIZE);
    setSortBy(DEFAULT_FACTURAS_SORT_BY);
    setSortDir(DEFAULT_FACTURAS_SORT_DIR);
  }, []);

  const activeFilters = useMemo(() => ({
    searchTerm: normalize(debouncedSearch),
    emisorTerm: normalize(emisorNombre),
    monedaTerm: toUpperTrim(moneda),
    estado,
    fechaDesde,
    fechaHasta,
    montoMin,
    montoMax
  }), [debouncedSearch, emisorNombre, moneda, estado, fechaDesde, fechaHasta, montoMin, montoMax]);

  const query = useMemo(() => {
    const q = { page, pageSize, sortBy, sortDir };

    if (debouncedSearch.trim()) q.search = debouncedSearch.trim();
    if (estado) q.estado = estado;
    if (emisorNombre.trim()) q.emisor = emisorNombre.trim();
    if (moneda) q.moneda = moneda;
    if (fechaDesde) q.fechaDesde = fechaDesde;
    if (fechaHasta) q.fechaHasta = fechaHasta;

    const min = normalizeNullableNumber(montoMin);
    const max = normalizeNullableNumber(montoMax);

    if (min !== null) q.montoMin = min;
    if (max !== null) q.montoMax = max;

    if (dashboardPreset) q.dashboardPreset = dashboardPreset;

    return q;
  }, [
    debouncedSearch, estado, emisorNombre, moneda,
    fechaDesde, fechaHasta, montoMin, montoMax,
    page, pageSize, sortBy, sortDir, dashboardPreset
  ]);

  const hasActiveFilters = useMemo(() =>
    Object.values(activeFilters).some(Boolean) || !!dashboardPreset,
  [activeFilters, dashboardPreset]);

  const filterNotaCreditoForReport = useCallback(
    (nota) => matchesNotaCreditoFiltersForReport(nota, activeFilters),
    [activeFilters]
  );

  return {
    search,
    setSearch,
    estado,
    setEstado,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    emisorNombre,
    setEmisorNombre,
    moneda,
    setMoneda,
    montoMin,
    setMontoMin,
    montoMax,
    setMontoMax,
    sortBy,
    sortDir,
    page,
    setPage,
    pageSize,
    setPageSize,
    dashboardPreset,
    query,
    activeFilters,
    hasActiveFilters,
    resetFilters,
    resetPaginationAndSort,
    toggleSort,
    filterNotaCreditoForReport
  };
};
