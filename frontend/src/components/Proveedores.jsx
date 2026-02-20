import { useEffect, useMemo, useState } from 'react';
import { proveedoresApi } from '../services/proveedoresApi';
import PageHeader from './common/PageHeader';
import SectionCard from './common/SectionCard';
import LoadingState from './common/LoadingState';
import EmptyState from './common/EmptyState';
import ActionAlerts from './common/ActionAlerts';
import { LOADING_LABELS } from '../utils/uiLabels';

const EMPTY_FORM = {
  identificacion_tipo: '',
  identificacion_numero: '',
  nombre: '',
  nombre_comercial: '',
  correo_electronico: '',
  telefono_codigo_pais: '',
  telefono_numero: ''
};

const toFormFromProveedor = (proveedor) => ({
  identificacion_tipo: proveedor.identificacion_tipo || '',
  identificacion_numero: proveedor.identificacion_numero || '',
  nombre: proveedor.nombre || '',
  nombre_comercial: proveedor.nombre_comercial || '',
  correo_electronico: proveedor.correo_electronico || '',
  telefono_codigo_pais: proveedor.telefono_codigo_pais || '',
  telefono_numero: proveedor.telefono_numero || ''
});

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

function Proveedores({ sociedadId }) {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isEditing = editingId != null;

  const loadProveedores = async ({ showLoader = true } = {}) => {
    if (!sociedadId) {
      setProveedores([]);
      if (showLoader) setLoading(false);
      return;
    }

    try {
      if (showLoader) setLoading(true);
      const res = await proveedoresApi.listProveedores(sociedadId);
      if (res.data?.success) {
        setProveedores(res.data.data || []);
      }
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo cargar la lista de proveedores.';
      setError(apiError);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    setSearch('');
    loadProveedores();
  }, [sociedadId]);

  const filteredProveedores = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return proveedores;
    return proveedores.filter((proveedor) => (
      `${proveedor.id} ${proveedor.identificacion_tipo} ${proveedor.identificacion_numero} ${proveedor.nombre} ${proveedor.nombre_comercial || ''} ${proveedor.correo_electronico || ''} ${proveedor.telefono_numero || ''}`
        .toLowerCase()
        .includes(term)
    ));
  }, [proveedores, search]);

  const updateForm = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startCreate = () => {
    resetForm();
    setError('');
    setMessage('');
  };

  const startEdit = (proveedor) => {
    setEditingId(proveedor.id);
    setForm(toFormFromProveedor(proveedor));
    setError('');
    setMessage('');
  };

  const buildPayload = () => ({
    sociedad_id: Number(sociedadId),
    identificacion_tipo: form.identificacion_tipo.trim() || null,
    identificacion_numero: form.identificacion_numero.trim(),
    nombre: form.nombre.trim(),
    nombre_comercial: form.nombre_comercial.trim() || null,
    correo_electronico: form.correo_electronico.trim().toLowerCase() || null,
    telefono_codigo_pais: form.telefono_codigo_pais.trim() || null,
    telefono_numero: form.telefono_numero.trim() || null
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sociedadId) {
      setError('Seleccione una sociedad para administrar proveedores.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const payload = buildPayload();
      if (isEditing) {
        await proveedoresApi.updateProveedor(editingId, payload);
        setMessage('Proveedor actualizado correctamente.');
      } else {
        await proveedoresApi.createProveedor(payload);
        setMessage('Proveedor creado correctamente.');
      }

      await loadProveedores({ showLoader: false });
      resetForm();
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo guardar el proveedor.';
      setError(apiError);
    } finally {
      setSaving(false);
    }
  };

  if (!sociedadId) {
    return (
      <div className="container-fluid">
        <EmptyState className="py-2">Seleccione una sociedad para administrar proveedores.</EmptyState>
      </div>
    );
  }

  if (loading) return <LoadingState label={LOADING_LABELS.proveedores} />;

  return (
    <div className="container-fluid">
      <PageHeader
        title="Administracion de proveedores"
        subtitle="Crea y edita proveedores para la sociedad seleccionada."
        actions={(
          <button className="btn btn-outline-primary" type="button" onClick={startCreate}>
            Nuevo proveedor
          </button>
        )}
      />

      <ActionAlerts error={error} message={message} />

      <div className="row g-3">
        <div className="col-12 col-xl-4">
          <SectionCard title={isEditing ? `Editar proveedor #${editingId}` : 'Nuevo proveedor'}>
            <form className="d-grid gap-2" onSubmit={handleSubmit}>
              <label className="form-label mb-0">
                Tipo identificacion
                <input
                  className="form-control"
                  value={form.identificacion_tipo}
                  onChange={updateForm('identificacion_tipo')}
                  placeholder="01, 02, 03..."
                />
              </label>

              <label className="form-label mb-0">
                Identificacion
                <input
                  className="form-control"
                  value={form.identificacion_numero}
                  onChange={updateForm('identificacion_numero')}
                  required
                />
              </label>

              <label className="form-label mb-0">
                Nombre
                <input
                  className="form-control"
                  value={form.nombre}
                  onChange={updateForm('nombre')}
                  required
                />
              </label>

              <label className="form-label mb-0">
                Nombre comercial
                <input
                  className="form-control"
                  value={form.nombre_comercial}
                  onChange={updateForm('nombre_comercial')}
                />
              </label>

              <label className="form-label mb-0">
                Correo electronico
                <input
                  className="form-control"
                  type="email"
                  value={form.correo_electronico}
                  onChange={updateForm('correo_electronico')}
                />
              </label>

              <div className="row g-2">
                <div className="col-4">
                  <label className="form-label mb-0">
                    Cod. pais
                    <input
                      className="form-control"
                      value={form.telefono_codigo_pais}
                      onChange={updateForm('telefono_codigo_pais')}
                      placeholder="506"
                    />
                  </label>
                </div>
                <div className="col-8">
                  <label className="form-label mb-0">
                    Telefono
                    <input
                      className="form-control"
                      value={form.telefono_numero}
                      onChange={updateForm('telefono_numero')}
                    />
                  </label>
                </div>
              </div>

              <div className="d-flex gap-2 mt-2">
                <button className="btn btn-primary flex-grow-1" type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : (isEditing ? 'Actualizar proveedor' : 'Crear proveedor')}
                </button>
                {isEditing && (
                  <button className="btn btn-outline-secondary" type="button" onClick={resetForm} disabled={saving}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </SectionCard>
        </div>

        <div className="col-12 col-xl-8">
          <SectionCard
            title="Proveedores registrados"
            actions={(
              <input
                className="form-control"
                style={{ minWidth: '260px' }}
                placeholder="Buscar por identificacion, nombre o correo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}
          >
            {filteredProveedores.length === 0 ? (
              <EmptyState className="py-2">No hay proveedores para mostrar.</EmptyState>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Identificacion</th>
                      <th>Nombre</th>
                      <th>Contacto</th>
                      <th>Actualizado</th>
                      <th className="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProveedores.map((proveedor) => (
                      <tr key={proveedor.id}>
                        <td>{proveedor.id}</td>
                        <td>
                          <div>{proveedor.identificacion_numero}</div>
                          <div className="text-muted small">{proveedor.identificacion_tipo || '-'}</div>
                        </td>
                        <td>
                          <div>{proveedor.nombre}</div>
                          <div className="text-muted small">{proveedor.nombre_comercial || '-'}</div>
                        </td>
                        <td>
                          <div>{proveedor.correo_electronico || '-'}</div>
                          <div className="text-muted small">
                            {[proveedor.telefono_codigo_pais, proveedor.telefono_numero].filter(Boolean).join(' ') || '-'}
                          </div>
                        </td>
                        <td>{formatDate(proveedor.actualizado_en)}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            type="button"
                            onClick={() => startEdit(proveedor)}
                            disabled={saving}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default Proveedores;
