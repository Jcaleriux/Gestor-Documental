import { useMemo, useState } from 'react';
import { withAuthToken } from '../utils/auth';
import { useTiquetesElectronicos } from '../hooks/useTiquetesElectronicos';
import { formatAmount, formatDate, getMoneda } from '../utils/formatters';
import EmptyState from './common/EmptyState';
import PageHeader from './common/PageHeader';
import LoadingState from './common/LoadingState';
import SectionCard from './common/SectionCard';
import SearchInput from './common/SearchInput';
import DataTable from './common/DataTable';

function TiquetesElectronicos({ sociedadId }) {
  const [search, setSearch] = useState('');
  const { tiquetes, loading } = useTiquetesElectronicos({ sociedadId });

  const filtrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tiquetes;

    return tiquetes.filter((tiquete) => {
      const clave = String(tiquete.clave || '').toLowerCase();
      const consecutivo = String(tiquete.consecutivo || '').toLowerCase();
      const emisor = String(tiquete.emisor?.Nombre || tiquete.emisor?.nombre || '').toLowerCase();
      return clave.includes(term) || consecutivo.includes(term) || emisor.includes(term);
    });
  }, [tiquetes, search]);

  if (!sociedadId) {
    return <p>Seleccione una sociedad para ver tiquetes electronicos.</p>;
  }

  if (loading) return <LoadingState label="Cargando tiquetes electronicos..." />;

  return (
    <div className="documents-page">
      <PageHeader
        title="Tiquetes electronicos"
        subtitle="Listado de tiquetes electronicos de la sociedad seleccionada."
      />

      <div className="mb-3">
        <SearchInput
          placeholder="Buscar por clave, consecutivo o emisor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <SectionCard className="table-card" bodyClassName="p-0">
        <DataTable
          headers={[
            'Clave',
            'Consecutivo',
            'Emisor',
            'Moneda',
            'Monto total',
            'Fecha',
            'Acciones'
          ]}
        >
          {filtrados.map((tiquete) => {
            const xmlUrl = tiquete.ruta_xml
              ? withAuthToken(`/api/files/xml?path=${encodeURIComponent(tiquete.ruta_xml)}`)
              : '';
            const pdfUrl = tiquete.ruta_pdf
              ? withAuthToken(`/api/files/pdf?path=${encodeURIComponent(tiquete.ruta_pdf)}`)
              : '';
            return (
              <tr key={tiquete.id}>
                <td className="fw-semibold">{tiquete.clave || '-'}</td>
                <td>{tiquete.consecutivo || '-'}</td>
                <td>{tiquete.emisor?.Nombre || tiquete.emisor?.nombre || '-'}</td>
                <td>{getMoneda(tiquete)}</td>
                <td>{formatAmount(tiquete.resumen?.TotalComprobante)}</td>
                <td>{formatDate(tiquete.fecha_emision)}</td>
                <td className="text-end">
                  <div className="d-inline-flex gap-2">
                    <a
                      className={`btn btn-sm ${pdfUrl ? 'btn-outline-success' : 'btn-outline-secondary disabled'}`}
                      href={pdfUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF
                    </a>
                    <a
                      className={`btn btn-sm ${xmlUrl ? 'btn-outline-primary' : 'btn-outline-secondary disabled'}`}
                      href={xmlUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      XML
                    </a>
                  </div>
                </td>
              </tr>
            );
          })}
          {filtrados.length === 0 && (
            <tr>
              <td colSpan="7" className="py-4">
                <EmptyState className="text-center py-2">
                  No hay tiquetes electronicos para los filtros seleccionados.
                </EmptyState>
              </td>
            </tr>
          )}
        </DataTable>
      </SectionCard>
    </div>
  );
}

export default TiquetesElectronicos;
