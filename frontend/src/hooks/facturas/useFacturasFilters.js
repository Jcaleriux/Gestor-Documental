import { useCallback, useEffect, useMemo, useState } from 'react';

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const DEFAULT_FACTURAS_SORT_BY = 'fecha_emision';
export const DEFAULT_FACTURAS_SORT_DIR = 'desc';
export const DEFAULT_FACTURAS_PAGE_SIZE = 50;

const parseDateInputOrNull = (value) => {
  if (!value) return null;
  const match = DATE_INPUT_PATTERN.exec(String(value).trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const toDateOrNull = (value, { fromDateInput = false } = {}) => {
  if (!value) return null;
  if (fromDateInput) {
    const parsedInput = parseDateInputOrNull(value);
    if (parsedInput) return parsedInput;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDayOrNull = (value, options) => {
  const parsed = toDateOrNull(value, options);
  if (!parsed) return null;
  const day = new Date(parsed);
  day.setHours(0, 0, 0, 0);
  return day;
};

const toUpperTrim = (value) => String(value || '').trim().toUpperCase();

const normalizeNullableNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const matchesDateRange = ({ fechaEmision, fechaDesde, fechaHasta }) => {
  const fecha = toDayOrNull(fechaEmision);
  const desde = toDayOrNull(fechaDesde, { fromDateInput: true });
  const hasta = toDayOrNull(fechaHasta, { fromDateInput: true });
  const desdeOk = !desde || (fecha && fecha >= desde);
  const hastaOk = !hasta || (fecha && fecha <= hasta);
  return desdeOk && hastaOk;
};

const matchesMontoRange = ({ monto, montoMin, montoMax }) => {
  const normalizedMin = normalizeNullableNumber(montoMin);
  const normalizedMax = normalizeNullableNumber(montoMax);
  const minOk = normalizedMin === null || monto >= normalizedMin;
  const maxOk = normalizedMax === null || monto <= normalizedMax;
  return minOk && maxOk;
};

const getNotaMoneda = (nota) => String(
  nota?.resumen?.CodigoTipoMoneda?.CodigoMoneda
  || nota?.resumen?.CodigoMoneda
  || nota?.resumen?.codigoMoneda
  || 'CRC'
).toUpperCase();

const getNotaMonto = (nota) => {
  const monto = Number(
    nota?.monto
    ?? nota?.resumen?.TotalComprobante
    ?? nota?.resumen?.totalComprobante
    ?? 0
  );
  return Number.isFinite(monto) ? monto : 0;
};

const matchesNotaCreditoFiltersForReport = (nota, activeFilters) => {
  if (activeFilters.estado) {
    return false;
  }

  const emisor = String(nota.emisor?.Nombre || nota.emisor?.nombre || '').toLowerCase();
  const consecutivo = String(nota.numero_consecutivo || '').toLowerCase();
  const clave = String(nota.clave || '').toLowerCase();
  const monedaNota = getNotaMoneda(nota);
  const totalNota = getNotaMonto(nota);

  const matchesSearch = !activeFilters.searchTerm
    || emisor.includes(activeFilters.searchTerm)
    || consecutivo.includes(activeFilters.searchTerm)
    || clave.includes(activeFilters.searchTerm);
  const matchesEmisor = !activeFilters.emisorTerm || emisor.includes(activeFilters.emisorTerm);
  const matchesMoneda = !activeFilters.monedaTerm || monedaNota === activeFilters.monedaTerm;
  const dateRangeOk = matchesDateRange({
    fechaEmision: nota.fecha_emision,
    fechaDesde: activeFilters.fechaDesde,
    fechaHasta: activeFilters.fechaHasta
  });
  const montoRangeOk = matchesMontoRange({
    monto: totalNota,
    montoMin: activeFilters.montoMin,
    montoMax: activeFilters.montoMax
  });

  return matchesSearch && matchesEmisor && matchesMoneda && dateRangeOk && montoRangeOk;
};

export const useFacturasFilters = ({
  debounceMs = 250,
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

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, Math.max(0, debounceMs));

    return () => clearTimeout(timeoutId);
  }, [debounceMs, search]);

  const resetPage = useCallback(() => {
    setPageState(1);
  }, []);

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

  const setPage = useCallback((value) => {
    setPageState(Math.max(1, Number(value) || 1));
  }, []);

  const setPageSize = useCallback((value) => {
    const normalized = Math.max(1, Number(value) || DEFAULT_FACTURAS_PAGE_SIZE);
    setPageState(1);
    setPageSizeState(normalized);
  }, []);

  const toggleSort = useCallback((nextSortBy) => {
    resetPage();
    if (sortBy === nextSortBy) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(nextSortBy);
    setSortDir(nextSortBy === 'emisor' ? 'asc' : DEFAULT_FACTURAS_SORT_DIR);
  }, [resetPage, sortBy]);

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
    searchTerm: debouncedSearch.trim().toLowerCase(),
    emisorTerm: emisorNombre.trim().toLowerCase(),
    monedaTerm: toUpperTrim(moneda),
    estado,
    fechaDesde,
    fechaHasta,
    montoMin,
    montoMax
  }), [debouncedSearch, emisorNombre, moneda, estado, fechaDesde, fechaHasta, montoMin, montoMax]);

  const query = useMemo(() => {
    const result = {
      page,
      pageSize,
      sortBy,
      sortDir,
    };

    if (debouncedSearch.trim()) result.search = debouncedSearch.trim();
    if (estado) result.estado = estado;
    if (emisorNombre.trim()) result.emisor = emisorNombre.trim();
    if (moneda) result.moneda = moneda;
    if (fechaDesde) result.fechaDesde = fechaDesde;
    if (fechaHasta) result.fechaHasta = fechaHasta;
    if (montoMin !== '') result.montoMin = montoMin;
    if (montoMax !== '') result.montoMax = montoMax;
    if (dashboardPreset) result.dashboardPreset = dashboardPreset;

    return result;
  }, [
    dashboardPreset,
    debouncedSearch,
    emisorNombre,
    estado,
    fechaDesde,
    fechaHasta,
    moneda,
    montoMin,
    montoMax,
    page,
    pageSize,
    sortBy,
    sortDir,
  ]);

  const hasActiveFilters = Boolean(
    search || estado || fechaDesde || fechaHasta || emisorNombre || moneda || montoMin || montoMax || dashboardPreset
  );

  const filterNotaCreditoForReport = (nota) => matchesNotaCreditoFiltersForReport(nota, activeFilters);

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
