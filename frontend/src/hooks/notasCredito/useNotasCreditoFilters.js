import { useEffect, useMemo, useState } from 'react';

export const DEFAULT_NOTAS_CREDITO_SORT_BY = 'fecha_emision';
export const DEFAULT_NOTAS_CREDITO_SORT_DIR = 'desc';
export const DEFAULT_NOTAS_CREDITO_PAGE_SIZE = 50;

export const useNotasCreditoFilters = ({ debounceMs = 250 } = {}) => {
  const [search, setSearchState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [estado, setEstadoState] = useState('');
  const [fechaDesde, setFechaDesdeState] = useState('');
  const [fechaHasta, setFechaHastaState] = useState('');
  const [emisorNombre, setEmisorNombreState] = useState('');
  const [moneda, setMonedaState] = useState('');
  const [montoMin, setMontoMinState] = useState('');
  const [montoMax, setMontoMaxState] = useState('');
  const [sortBy, setSortBy] = useState(DEFAULT_NOTAS_CREDITO_SORT_BY);
  const [sortDir, setSortDir] = useState(DEFAULT_NOTAS_CREDITO_SORT_DIR);
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_NOTAS_CREDITO_PAGE_SIZE);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, Math.max(0, debounceMs));

    return () => clearTimeout(timeoutId);
  }, [debounceMs, search]);

  const resetPage = () => setPageState(1);

  const setSearch = (value) => {
    resetPage();
    setSearchState(value);
  };

  const setEstado = (value) => {
    resetPage();
    setEstadoState(value);
  };

  const setFechaDesde = (value) => {
    resetPage();
    setFechaDesdeState(value);
  };

  const setFechaHasta = (value) => {
    resetPage();
    setFechaHastaState(value);
  };

  const setEmisorNombre = (value) => {
    resetPage();
    setEmisorNombreState(value);
  };

  const setMoneda = (value) => {
    resetPage();
    setMonedaState(value);
  };

  const setMontoMin = (value) => {
    resetPage();
    setMontoMinState(value);
  };

  const setMontoMax = (value) => {
    resetPage();
    setMontoMaxState(value);
  };

  const setPage = (value) => {
    setPageState(Math.max(1, Number(value) || 1));
  };

  const setPageSize = (value) => {
    const normalized = Math.max(1, Number(value) || DEFAULT_NOTAS_CREDITO_PAGE_SIZE);
    setPageState(1);
    setPageSizeState(normalized);
  };

  const toggleSort = (nextSortBy) => {
    resetPage();
    if (sortBy === nextSortBy) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(nextSortBy);
    setSortDir(nextSortBy === 'emisor' ? 'asc' : DEFAULT_NOTAS_CREDITO_SORT_DIR);
  };

  const resetFilters = () => {
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
  };

  const resetPaginationAndSort = () => {
    setPageState(1);
    setPageSizeState(DEFAULT_NOTAS_CREDITO_PAGE_SIZE);
    setSortBy(DEFAULT_NOTAS_CREDITO_SORT_BY);
    setSortDir(DEFAULT_NOTAS_CREDITO_SORT_DIR);
  };

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

    return result;
  }, [
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
    search || estado || fechaDesde || fechaHasta || emisorNombre || moneda || montoMin || montoMax
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
    query,
    hasActiveFilters,
    resetFilters,
    resetPaginationAndSort,
    toggleSort,
  };
};
