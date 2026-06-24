import { Suspense, lazy, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import {
  buildExpandedSectionsState,
  buildMobileSidebarOpen,
  buildVisibleExpandedSections,
} from './app/appShellState.js';
import { buildNavigationSections } from './app/buildNavigationSections.js';
import { useAppSession } from './hooks/app/useAppSession.js';
import LoadingState from './components/common/LoadingState.jsx';
import './styles/app.css';

const Dashboard = lazy(() => import('./components/Dashboard.jsx'));
const Sociedades = lazy(() => import('./components/Sociedades.jsx'));
const Usuarios = lazy(() => import('./components/Usuarios.jsx'));
const Facturas = lazy(() => import('./components/Facturas.jsx'));
const FacturaDetalle = lazy(() => import('./components/FacturaDetalle.jsx'));
const ContabilizacionMasivaDiario = lazy(() => import('./components/ContabilizacionMasivaDiario.jsx'));
const RetencionesPendientes = lazy(() => import('./components/RetencionesPendientes.jsx'));
const NotasCredito = lazy(() => import('./components/NotasCredito.jsx'));
const TiquetesElectronicos = lazy(() => import('./components/TiquetesElectronicos.jsx'));
const Login = lazy(() => import('./components/Login.jsx'));
const Tramites = lazy(() => import('./components/Tramites.jsx'));
const TramiteDetalle = lazy(() => import('./components/TramiteDetalle.jsx'));
const Proveedores = lazy(() => import('./components/Proveedores.jsx'));
const CentrosCosto = lazy(() => import('./components/CentrosCosto.jsx'));
const TablasPagoIngenieria = lazy(() => import('./components/TablasPagoIngenieria.jsx'));
const OrdenesCompraIngenieria = lazy(() => import('./components/OrdenesCompraIngenieria.jsx'));
const ReservasOperaciones = lazy(() => import('./components/ReservasOperaciones.jsx'));

const SIDEBAR_COLLAPSED_KEY = 'novogar.sidebar.collapsed';
const SIDEBAR_SECTIONS_KEY = 'novogar.sidebar.sections.v2';
const MOBILE_MEDIA_QUERY = '(max-width: 991.98px)';

const pathMatches = (pathname, target) => {
  if (target === '/') {
    return pathname === '/';
  }

  return pathname === target || pathname.startsWith(`${target}/`);
};

const parseJsonStorage = (key, fallback) => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const readCollapsedPreference = () => parseJsonStorage(SIDEBAR_COLLAPSED_KEY, false) === true;

const readExpandedSectionsPreference = (sections) =>
  buildExpandedSectionsState(sections, parseJsonStorage(SIDEBAR_SECTIONS_KEY, {}));

const getMediaQuerySnapshot = (query) => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia(query).matches;
};

const subscribeToMediaQuery = (query, onStoreChange) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const media = window.matchMedia(query);
  const handleChange = () => onStoreChange();

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }

  media.addListener(handleChange);
  return () => media.removeListener(handleChange);
};

const useMediaQueryValue = (query) => useSyncExternalStore(
  (onStoreChange) => subscribeToMediaQuery(query, onStoreChange),
  () => getMediaQuerySnapshot(query),
  () => false,
);

const ICONS = Object.freeze({
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </>
  ),
  collapse: (
    <>
      <path d="M9 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 5v14" strokeLinecap="round" />
    </>
  ),
  expand: (
    <>
      <path d="M15 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 5v14" strokeLinecap="round" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </>
  ),
  chevronDown: (
    <>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  chevronRight: (
    <>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  general: (
    <>
      <path d="M4 11l8-6 8 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9h12v-9" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  compras: (
    <>
      <path d="M3 6h2l2.4 9.5a1 1 0 0 0 1 .75h8.6a1 1 0 0 0 .96-.73L21 8H7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </>
  ),
  facturas: (
    <>
      <path d="M7 3h7l5 5v13H7z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3v5h5M10 13h6M10 17h6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  retenciones: (
    <>
      <path d="M19 5L5 19" strokeLinecap="round" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </>
  ),
  notas: (
    <>
      <path d="M7 4h10v16l-5-3-5 3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 9h4M10 12h4" strokeLinecap="round" />
    </>
  ),
  tiquetes: (
    <>
      <path d="M4 8a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 6v12" strokeLinecap="round" strokeDasharray="2.5 2.5" />
    </>
  ),
  tesoreria: (
    <>
      <path d="M4 7h16v10H4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 10h16M16 15h2" strokeLinecap="round" />
    </>
  ),
  tramites: (
    <>
      <path d="M7 7h10M7 12h10M7 17h6" strokeLinecap="round" />
      <path d="M5 7l-1 1 1 1M19 16l1 1-1 1" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  ventas: (
    <>
      <path d="M5 19V9l7-4 7 4v10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 19v-4h6v4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  reservas: (
    <>
      <path d="M7 11a5 5 0 1 1 9.4 2.4L21 18l-3 3-4.6-4.6A5 5 0 0 1 7 11z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9v3l2 1" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  ingenieria: (
    <>
      <path d="M14 4l6 6-3 3-6-6z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 11l-8 8H2v-3l8-8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  tablasPago: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16M9 5v14M15 5v14" strokeLinecap="round" />
    </>
  ),
  ordenesCompra: (
    <>
      <path d="M8 4h8l3 3v13H5V7z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 4v4h8V4M9 13h6M9 17h4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  administracion: (
    <>
      <path d="M12 3l7 4v5c0 4.5-2.7 7-7 9-4.3-2-7-4.5-7-9V7z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 12l1.5 1.5 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  sociedades: (
    <>
      <path d="M5 19V8l7-4 7 4v11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 19v-5h6v5M8 10h1M12 10h1M16 10h1" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  usuarios: (
    <>
      <path d="M16 19a4 4 0 0 0-8 0" strokeLinecap="round" />
      <circle cx="12" cy="9" r="3" />
      <path d="M20 18a3 3 0 0 0-2.5-2.95M4 18a3 3 0 0 1 2.5-2.95" strokeLinecap="round" />
    </>
  ),
  proveedores: (
    <>
      <path d="M3 8h11v8H3zM14 11h3l3 3v2h-6z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.5" cy="18" r="1.5" />
      <circle cx="17.5" cy="18" r="1.5" />
    </>
  ),
  centrosCosto: (
    <>
      <path d="M12 5v4" strokeLinecap="round" />
      <path d="M6 11h12" strokeLinecap="round" />
      <path d="M7 11v4M17 11v4" strokeLinecap="round" />
      <rect x="9" y="3" width="6" height="3.5" rx="1" />
      <rect x="4" y="15" width="6" height="4" rx="1" />
      <rect x="14" y="15" width="6" height="4" rx="1" />
    </>
  ),
});

const AppIcon = ({ name, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className={['app-icon', className].filter(Boolean).join(' ')}
    aria-hidden="true"
  >
    {ICONS[name] || ICONS.general}
  </svg>
);

function RouteLoadingFallback({ fullPage = false }) {
  return (
    <div
      style={fullPage
        ? { minHeight: '100vh', display: 'grid', placeItems: 'center' }
        : { padding: '1rem 1.25rem' }}
    >
      <LoadingState label="Cargando página..." />
    </div>
  );
}

function AuthenticatedAppShell({
  sociedades,
  sociedadId,
  selectedSociedad,
  setSociedadId,
  handleLogout,
  userInitials,
  userName,
  userRole,
  canManageSociedades,
  canManageUsers,
  canUseTablasPago,
  canUseOrdenesCompra,
  canViewTramites,
  canTramitarPago,
  canUseReservas,
  canManageReservasDocumentos,
  canEditContabilizacion,
  authUser,
  userPermissions,
  refreshSociedades,
}) {
  const location = useLocation();
  const isMobileView = useMediaQueryValue(MOBILE_MEDIA_QUERY);

  const navigationSections = useMemo(() => {
    return buildNavigationSections({
      canManageSociedades,
      canManageUsers,
      canUseOrdenesCompra,
      canUseReservas,
      canUseTablasPago,
      canViewTramites,
      canEditContabilizacion,
    });
  }, [
    canManageSociedades,
    canManageUsers,
    canUseOrdenesCompra,
    canUseReservas,
    canUseTablasPago,
    canViewTramites,
    canEditContabilizacion,
  ]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(readCollapsedPreference);
  const [expandedSectionsState, setExpandedSectionsState] = useState(() => ({
    pathname: '',
    values: readExpandedSectionsPreference(navigationSections),
  }));
  const [mobileSidebarState, setMobileSidebarState] = useState(() => ({
    pathname: '',
    open: false,
  }));
  const [sidebarTooltip, setSidebarTooltip] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const activeSectionId = useMemo(() => {
    const activeSection = navigationSections.find((section) =>
      section.items.some((item) => pathMatches(location.pathname, item.to))
    );

    return activeSection?.id || null;
  }, [location.pathname, navigationSections]);
  const expandedSections = useMemo(() => buildVisibleExpandedSections({
    sections: navigationSections,
    storedValue: expandedSectionsState.values,
  }), [
    expandedSectionsState.values,
    navigationSections,
  ]);
  const mobileSidebarOpen = useMemo(() => buildMobileSidebarOpen({
    isMobileView,
    pathname: location.pathname,
    state: mobileSidebarState,
  }), [isMobileView, location.pathname, mobileSidebarState]);

  useEffect(() => {
    if (!sidebarCollapsed || isMobileView) {
      setSidebarTooltip(null);
    }
  }, [isMobileView, sidebarCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SIDEBAR_SECTIONS_KEY, JSON.stringify(expandedSections));
  }, [expandedSections]);

  const toggleSidebar = useCallback(() => {
    if (isMobileView) {
      setMobileSidebarState({
        pathname: location.pathname,
        open: !mobileSidebarOpen,
      });
      return;
    }

    setSidebarCollapsed((previous) => !previous);
  }, [isMobileView, location.pathname, mobileSidebarOpen]);

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarState({
      pathname: location.pathname,
      open: false,
    });
  }, [location.pathname]);

  const openMobileSidebar = useCallback(() => {
    setMobileSidebarState({
      pathname: location.pathname,
      open: true,
    });
  }, [location.pathname]);

  const showSidebarTooltip = useCallback((event, label) => {
    if (!sidebarCollapsed || isMobileView || !label) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setSidebarTooltip({
      label,
      left: rect.right + 10,
      top: rect.top + rect.height / 2,
    });
  }, [isMobileView, sidebarCollapsed]);

  const hideSidebarTooltip = useCallback(() => {
    setSidebarTooltip(null);
  }, []);

  const toggleSection = useCallback((sectionId) => {
    setExpandedSectionsState({
      pathname: location.pathname,
      values: {
        ...buildExpandedSectionsState(navigationSections, expandedSections),
        [sectionId]: !(expandedSections[sectionId] ?? false),
      },
    });
  }, [expandedSections, location.pathname, navigationSections]);

  return (
    <div className="app-shell">
      {mobileSidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Cerrar menú lateral"
          onClick={closeMobileSidebar}
        />
      )}

      {sidebarTooltip && (
        <div
          className="sidebar-tooltip"
          style={{
            left: `${sidebarTooltip.left}px`,
            top: `${sidebarTooltip.top}px`,
          }}
          role="tooltip"
        >
          {sidebarTooltip.label}
        </div>
      )}

      <aside className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}${mobileSidebarOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">N</div>
            <div className="brand-copy">
              <div className="brand-title">Proyecto Gestión documental</div>
              <div className="brand-sub">Sistema de Gestión</div>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-toggle"
            aria-label={isMobileView ? 'Cerrar menú lateral' : sidebarCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
            onClick={toggleSidebar}
            onMouseEnter={(event) => showSidebarTooltip(event, sidebarCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral')}
            onMouseLeave={hideSidebarTooltip}
            onFocus={(event) => showSidebarTooltip(event, sidebarCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral')}
            onBlur={hideSidebarTooltip}
          >
            <AppIcon name={isMobileView ? 'close' : sidebarCollapsed ? 'expand' : 'collapse'} />
          </button>
        </div>

        <div className="sidebar-scroll">
          {navigationSections.map((section) => {
            const isOpen = expandedSections[section.id] ?? false;
            const isActiveSection = activeSectionId === section.id;

            return (
              <section
                key={section.id}
                className={`sidebar-section${isOpen ? ' is-open' : ''}${isActiveSection ? ' active-section' : ''}`}
              >
                <button
                  type="button"
                  className="section-toggle"
                  aria-expanded={isOpen}
                  aria-label={section.label}
                  onMouseEnter={(event) => showSidebarTooltip(event, section.label)}
                  onMouseLeave={hideSidebarTooltip}
                  onFocus={(event) => showSidebarTooltip(event, section.label)}
                  onBlur={hideSidebarTooltip}
                  onClick={() => toggleSection(section.id)}
                >
                  <span className="section-toggle-main">
                    <span className="menu-link-icon" aria-hidden="true">
                      <AppIcon name={section.icon} />
                    </span>
                    <span className="section-label">{section.label}</span>
                  </span>
                  <span className="section-chevron" aria-hidden="true">
                    <AppIcon name={isOpen ? 'chevronDown' : 'chevronRight'} />
                  </span>
                </button>

                {isOpen && (
                  <nav className="section-items">
                    {section.items.map((item) => (
                      <NavLink
                        key={item.id}
                        to={item.to}
                        end={item.to === '/'}
                        aria-label={item.label}
                        onClick={() => {
                          hideSidebarTooltip();
                          closeMobileSidebar();
                        }}
                        onMouseEnter={(event) => showSidebarTooltip(event, item.label)}
                        onMouseLeave={hideSidebarTooltip}
                        onFocus={(event) => showSidebarTooltip(event, item.label)}
                        onBlur={hideSidebarTooltip}
                        className={({ isActive }) => ['menu-link', isActive ? 'active' : ''].filter(Boolean).join(' ')}
                      >
                        <span className="menu-link-icon" aria-hidden="true">
                          <AppIcon name={item.icon} />
                        </span>
                        <span className="menu-link-label">{item.label}</span>
                      </NavLink>
                    ))}
                  </nav>
                )}
              </section>
            );
          })}
        </div>

        <div
          className="sidebar-footer"
          aria-label={`${userName} · ${userRole}`}
          onMouseEnter={(event) => showSidebarTooltip(event, `${userName} · ${userRole}`)}
          onMouseLeave={hideSidebarTooltip}
          onFocus={(event) => showSidebarTooltip(event, `${userName} · ${userRole}`)}
          onBlur={hideSidebarTooltip}
        >
          <div className="avatar">{userInitials}</div>
          <div className="sidebar-footer-copy">
            <div className="user-name">{userName}</div>
            <div className="user-role">{userRole}</div>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-leading">
            <button
              className="mobile-menu-btn"
              type="button"
              aria-label="Abrir menú lateral"
              onClick={openMobileSidebar}
            >
              <AppIcon name="menu" />
            </button>
            <div className="company">
              {selectedSociedad ? selectedSociedad.cedula_juridica : 'Seleccione sociedad'}
            </div>
          </div>

          <div className="topbar-actions">
            <div className="sociedad-picker">
              <label className="sociedad-label" htmlFor="sociedad-select">Sociedad</label>
              <select
                id="sociedad-select"
                className="sociedad-select"
                value={sociedadId}
                onChange={(event) => setSociedadId(event.target.value)}
              >
                <option value="">Seleccionar</option>
                {sociedades.map((sociedad) => (
                  <option key={sociedad.id} value={sociedad.id}>
                    {sociedad.nombre_proyecto || sociedad.razon_social}
                  </option>
                ))}
              </select>
            </div>
            <button className="icon-btn" type="button" aria-label="Notificaciones">
              <span className="badge">1</span>
              N
            </button>
            <button className="btn btn-sm btn-outline-secondary" type="button" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </header>

        <main className="content">
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route
                path="/"
                element={(
                  <Dashboard
                    sociedadId={sociedadId}
                    selectedSociedadName={selectedSociedad?.nombre_proyecto || selectedSociedad?.razon_social || ''}
                    authUser={authUser}
                    userPermissions={userPermissions}
                  />
                )}
              />
              <Route
                path="/sociedades"
                element={canManageSociedades ? (
                  <Sociedades onSociedadesChange={refreshSociedades} />
                ) : <Navigate to="/" replace />}
              />
              <Route path="/usuarios" element={canManageUsers ? <Usuarios /> : <Navigate to="/" replace />} />
              <Route
                path="/facturas"
                element={<Facturas sociedadId={sociedadId} canEditContabilizacion={canEditContabilizacion} />}
              />
              <Route path="/retenciones-pendientes" element={<RetencionesPendientes sociedadId={sociedadId} />} />
              <Route path="/facturas/:id" element={<LegacyFacturaDetalleRedirect />} />
              <Route
                path="/facturas/:id/contabilizacion"
                element={(
                  <FacturaDetalle
                    sociedadId={sociedadId}
                    selectedSociedadName={selectedSociedad?.nombre_proyecto || selectedSociedad?.razon_social || ''}
                    canEditContabilizacion={canEditContabilizacion}
                  />
                )}
              />
              <Route path="/notas-credito" element={<NotasCredito sociedadId={sociedadId} />} />
              <Route path="/tiquetes-electronicos" element={<TiquetesElectronicos sociedadId={sociedadId} />} />
              <Route
                path="/contabilizacion-masiva"
                element={canEditContabilizacion
                  ? <ContabilizacionMasivaDiario sociedadId={sociedadId} />
                  : <Navigate to="/" replace />}
              />
              <Route
                path="/tramites"
                element={(
                  <Tramites
                    sociedadId={sociedadId}
                    canCreateTramite={canTramitarPago}
                    authUser={authUser}
                  />
                )}
              />
              <Route
                path="/tramites/:id"
                element={(
                  <TramiteDetalle
                    sociedadId={sociedadId}
                    authUser={authUser}
                    userPermissions={userPermissions}
                  />
                )}
              />
              <Route path="/ventas" element={<Navigate to="/reservas" replace />} />
              <Route
                path="/reservas"
                element={canUseReservas
                  ? <ReservasOperaciones sociedadId={sociedadId} canManageDocuments={canManageReservasDocumentos} />
                  : <Navigate to="/" replace />}
              />
              <Route path="/proveedores" element={canManageUsers ? <Proveedores sociedadId={sociedadId} /> : <Navigate to="/" replace />} />
              <Route path="/centros-costo" element={canManageUsers ? <CentrosCosto sociedadId={sociedadId} /> : <Navigate to="/" replace />} />
              <Route path="/tablas-pago" element={canUseTablasPago ? <TablasPagoIngenieria sociedadId={sociedadId} /> : <Navigate to="/" replace />} />
              <Route path="/ordenes-compra" element={canUseOrdenesCompra ? <OrdenesCompraIngenieria sociedadId={sociedadId} /> : <Navigate to="/" replace />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function LegacyFacturaDetalleRedirect() {
  const { id } = useParams();
  return <Navigate to={`/facturas/${id}/contabilizacion`} replace />;
}

function App() {
  const {
    sociedades,
    sociedadId,
    authLoading,
    authUser,
    canEditContabilizacion,
    canManageReservasDocumentos,
    canManageSociedades,
    canManageUsers,
    canTramitarPago,
    canUseOrdenesCompra,
    canUseReservas,
    canUseTablasPago,
    canViewTramites,
    handleLoginSuccess,
    handleLogout,
    isAuthenticated,
    refreshSociedades,
    selectedSociedad,
    setSociedadId,
    userInitials,
    userName,
    userPermissions,
    userRole,
  } = useAppSession();

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        Validando sesión...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Router>
        <Suspense fallback={<RouteLoadingFallback fullPage />}>
          <Routes>
            <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    );
  }

  return (
    <Router>
      <AuthenticatedAppShell
        sociedades={sociedades}
        sociedadId={sociedadId}
        selectedSociedad={selectedSociedad}
        setSociedadId={setSociedadId}
        handleLogout={handleLogout}
        userInitials={userInitials}
        userName={userName}
        userRole={userRole}
        canManageSociedades={canManageSociedades}
        canManageUsers={canManageUsers}
        canUseTablasPago={canUseTablasPago}
        canUseOrdenesCompra={canUseOrdenesCompra}
        canViewTramites={canViewTramites}
        canTramitarPago={canTramitarPago}
        canUseReservas={canUseReservas}
        canManageReservasDocumentos={canManageReservasDocumentos}
        canEditContabilizacion={canEditContabilizacion}
        authUser={authUser}
        userPermissions={userPermissions}
        refreshSociedades={refreshSociedades}
      />
    </Router>
  );
}

export default App;
