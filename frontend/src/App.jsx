import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import Usuarios from './components/Usuarios';
import Facturas from './components/Facturas';
import FacturaDetalle from './components/FacturaDetalle';
import RetencionesPendientes from './components/RetencionesPendientes';
import NotasCredito from './components/NotasCredito';
import TiquetesElectronicos from './components/TiquetesElectronicos';
import Login from './components/Login';
import Tramites from './components/Tramites';
import TramiteDetalle from './components/TramiteDetalle';
import Proveedores from './components/Proveedores';
import TablasPagoIngenieria from './components/TablasPagoIngenieria';
import OrdenesCompraIngenieria from './components/OrdenesCompraIngenieria';
import VentasOperaciones from './components/VentasOperaciones';
import {
  clearAuthSession,
  getAuthToken,
  getAuthUser,
  saveAuthSession
} from './utils/auth';
import './App.css';

const setAxiosAuthHeader = (token) => {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common.Authorization;
  }
};

const initialsFromName = (name) => {
  if (!name) return 'US';
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || '')
    .join('') || 'US';
};

const initialAppState = {
  sociedades: [],
  sociedadId: '',
  authToken: '',
  authUser: null,
  authLoading: true
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'applySession':
      return {
        ...state,
        authToken: action.token || '',
        authUser: action.user || null
      };
    case 'clearSession':
      return {
        ...state,
        sociedades: [],
        sociedadId: '',
        authToken: '',
        authUser: null
      };
    case 'setAuthLoading':
      return {
        ...state,
        authLoading: Boolean(action.value)
      };
    case 'setSociedades': {
      const nextSociedades = Array.isArray(action.value) ? action.value : [];
      const hasSelectedSociedad = nextSociedades.some(
        (sociedad) => String(sociedad.id) === String(state.sociedadId)
      );

      return {
        ...state,
        sociedades: nextSociedades,
        sociedadId: hasSelectedSociedad ? state.sociedadId : ''
      };
    }
    case 'setSociedadId':
      return {
        ...state,
        sociedadId: action.value || ''
      };
    default:
      return state;
  }
};

function App() {
  const [{
    sociedades,
    sociedadId,
    authToken,
    authUser,
    authLoading
  }, dispatch] = useReducer(appReducer, initialAppState);

  const selectedSociedad = sociedades.find((s) => String(s.id) === String(sociedadId));
  const isAuthenticated = Boolean(authToken);
  const userPermissions = useMemo(
    () => (Array.isArray(authUser?.permissions) ? authUser.permissions : []),
    [authUser]
  );
  const canManageUsers = userPermissions.includes('acceso_total')
    || userPermissions.includes('usuarios_administrar');
  const canUseTablasPago = userPermissions.includes('acceso_total')
    || userPermissions.includes('usuarios_administrar')
    || userPermissions.includes('documentos_subir')
    || userPermissions.includes('documentos_contabilizar');
  const canUseOrdenesCompra = canUseTablasPago;
  const canTramitarPago = userPermissions.includes('acceso_total')
    || userPermissions.includes('documentos_tramitar_pago');
  const canUseVentas = userPermissions.includes('acceso_total')
    || userPermissions.includes('ventas_ver')
    || userPermissions.includes('ventas_crear')
    || userPermissions.includes('ventas_gestionar');
  const canManageVentasDocumentos = userPermissions.includes('acceso_total')
    || userPermissions.includes('ventas_gestionar');

  const userName = authUser?.nombre || 'Usuario';
  const userRole = authUser?.rol != null ? `Rol ${authUser.rol}` : 'Usuario';
  const userInitials = useMemo(() => initialsFromName(userName), [userName]);

  const clearSession = useCallback(() => {
    clearAuthSession();
    dispatch({ type: 'clearSession' });
    setAxiosAuthHeader('');
  }, []);

  const applySession = useCallback(({ token, user }) => {
    saveAuthSession({ token, user });
    dispatch({ type: 'applySession', token, user });
    setAxiosAuthHeader(token || '');
  }, []);

  const bootstrapAuth = useCallback(async () => {
    const token = getAuthToken();
    const storedUser = getAuthUser();

    if (!token) {
      dispatch({ type: 'setAuthLoading', value: false });
      return;
    }

    setAxiosAuthHeader(token);

    try {
      const res = await axios.get('/api/auth/me');
      const meUser = res.data?.data?.user || storedUser;
      applySession({ token, user: meUser || null });
    } catch {
      clearSession();
    } finally {
      dispatch({ type: 'setAuthLoading', value: false });
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    bootstrapAuth();
  }, [bootstrapAuth]);

  const fetchSociedades = useCallback(async () => {
    try {
      const res = await axios.get('/api/sociedades');
      if (res.data.success) {
        dispatch({ type: 'setSociedades', value: res.data.data || [] });
      }
    } catch (err) {
      if (err.response?.status === 401) {
        clearSession();
      }
      console.error(err);
    }
  }, [clearSession]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    fetchSociedades();
  }, [isAuthenticated, fetchSociedades]);

  const handleLoginSuccess = useCallback(({ token, user }) => {
    applySession({ token, user });
  }, [applySession]);

  const handleLogout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        Validando sesion...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">N</div>
            <div>
              <div className="brand-title">Proyecto Novogar</div>
              <div className="brand-sub">Sistema de Gestion</div>
            </div>
          </div>

          <div className="menu-group">
            <div className="menu-title">Menu Principal</div>
            <nav className="menu">
              <NavLink to="/" className="menu-link">Dashboard</NavLink>
              <NavLink to="/facturas" className="menu-link">Facturas</NavLink>
              <NavLink to="/retenciones-pendientes" className="menu-link">Retenciones pendientes</NavLink>
              <NavLink to="/notas-credito" className="menu-link">Notas de credito</NavLink>
              <NavLink to="/tiquetes-electronicos" className="menu-link">Tiquetes electronicos</NavLink>
              <NavLink to="/tramites" className="menu-link">Tramites de pago</NavLink>
              {canUseVentas && <NavLink to="/ventas" className="menu-link">Ventas</NavLink>}
            </nav>
          </div>

          <div className="menu-group">
            <div className="menu-title">Ingenieria</div>
            <nav className="menu">
              {canUseTablasPago && <NavLink to="/tablas-pago" className="menu-link">Tablas de pago</NavLink>}
              {canUseOrdenesCompra && <NavLink to="/ordenes-compra" className="menu-link">Ordenes de compra</NavLink>}
            </nav>
          </div>

          <div className="menu-group">
            <div className="menu-title">Administracion</div>
            <nav className="menu">
              {canManageUsers && <NavLink to="/usuarios" className="menu-link">Usuarios</NavLink>}
              {canManageUsers && <NavLink to="/proveedores" className="menu-link">Proveedores</NavLink>}
              <span className="menu-link muted">Empresas</span>
              <span className="menu-link muted">Roles &amp; Permisos</span>
              <span className="menu-link muted">Auditoria</span>
              <span className="menu-link muted">Analiticas</span>
            </nav>
          </div>

          <div className="sidebar-footer">
            <div className="avatar">{userInitials}</div>
            <div>
              <div className="user-name">{userName}</div>
              <div className="user-role">{userRole}</div>
            </div>
          </div>
        </aside>

        <div className="main-area">
          <header className="topbar">
            <div className="company">
              {selectedSociedad ? selectedSociedad.cedula_juridica : 'Seleccione sociedad'}
            </div>
            <div className="topbar-actions">
              <div className="sociedad-picker">
                <label className="sociedad-label" htmlFor="sociedad-select">Sociedad</label>
                <select
                  id="sociedad-select"
                  className="sociedad-select"
                  value={sociedadId}
                  onChange={(e) => dispatch({ type: 'setSociedadId', value: e.target.value })}
                >
                  <option value="">Seleccionar</option>
                  {sociedades.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre_proyecto || s.razon_social}
                    </option>
                  ))}
                </select>
              </div>
              <button className="icon-btn" type="button" aria-label="Notificaciones">
                <span className="badge">1</span>
                N
              </button>
              <button className="btn btn-sm btn-outline-secondary" type="button" onClick={handleLogout}>
                Cerrar sesion
              </button>
              <div className="user-chip">
                <div className="avatar small">{userInitials}</div>
                <div>
                  <div className="user-name">{userName}</div>
                  <div className="user-role">{userRole}</div>
                </div>
              </div>
            </div>
          </header>

          <main className="content">
            <Routes>
              <Route path="/" element={<Dashboard sociedadId={sociedadId} />} />
              <Route path="/usuarios" element={canManageUsers ? <Usuarios /> : <Navigate to="/" replace />} />
              <Route path="/facturas" element={<Facturas sociedadId={sociedadId} />} />
              <Route path="/retenciones-pendientes" element={<RetencionesPendientes sociedadId={sociedadId} />} />
              <Route path="/facturas/:id" element={<FacturaDetalle sociedadId={sociedadId} />} />
              <Route path="/notas-credito" element={<NotasCredito sociedadId={sociedadId} />} />
              <Route path="/tiquetes-electronicos" element={<TiquetesElectronicos sociedadId={sociedadId} />} />
              <Route path="/tramites" element={<Tramites sociedadId={sociedadId} canCreateTramite={canTramitarPago} />} />
              <Route path="/tramites/:id" element={<TramiteDetalle sociedadId={sociedadId} />} />
              <Route
                path="/ventas"
                element={canUseVentas
                  ? <VentasOperaciones sociedadId={sociedadId} canManageDocuments={canManageVentasDocumentos} />
                  : <Navigate to="/" replace />}
              />
              <Route path="/proveedores" element={canManageUsers ? <Proveedores sociedadId={sociedadId} /> : <Navigate to="/" replace />} />
              <Route path="/tablas-pago" element={canUseTablasPago ? <TablasPagoIngenieria sociedadId={sociedadId} /> : <Navigate to="/" replace />} />
              <Route path="/ordenes-compra" element={canUseOrdenesCompra ? <OrdenesCompraIngenieria sociedadId={sociedadId} /> : <Navigate to="/" replace />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
