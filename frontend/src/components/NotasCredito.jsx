import { useMemo, useState } from 'react';
import { withAuthToken } from '../utils/auth';
import { useNotasCredito } from '../hooks/useNotasCredito';
import { formatAmount, formatDate, getMoneda } from '../utils/formatters';
import { FACTURA_DETALLE_LABELS } from '../utils/uiLabels';
import EmptyState from './common/EmptyState';
import PageHeader from './common/PageHeader';
import LoadingState from './common/LoadingState';
import SectionCard from './common/SectionCard';
import SearchInput from './common/SearchInput';
import DataTable from './common/DataTable';

function NotasCredito({ sociedadId }) {
  const [search, setSearch] = useState('');
  const { notasCredito, loading } = useNotasCredito({ sociedadId });

  const filtradas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return notasCredito;

    return notasCredito.filter((nota) => {
      const clave = String(nota.clave || '').toLowerCase();
      const consecutivo = String(nota.numero_consecutivo || '').toLowerCase();
      const emisor = String(nota.emisor?.Nombre || nota.emisor?.nombre || '').toLowerCase();
      return clave.includes(term) || consecutivo.includes(term) || emisor.includes(term);
    });
  }, [notasCredito, search]);

  if (!sociedadId) {
    return <p>Seleccione una sociedad para ver notas de credito.</p>;
  }

  if (loading) return <LoadingState label="Cargando notas de credito..." />;

  return (
    <div className="documents-page">
      <PageHeader
        title="Notas de credito"
        subtitle="Listado de notas de credito de la sociedad seleccionada."
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
            'Monto',
            'Fecha',
            'Acciones'
          ]}
        >
          {filtradas.map((nota) => {
            const xmlUrl = nota.ruta_xml
              ? withAuthToken(`/api/files/xml?path=${encodeURIComponent(nota.ruta_xml)}`)
              : '';
            const pdfUrl = nota.ruta_pdf
              ? withAuthToken(`/api/files/pdf?path=${encodeURIComponent(nota.ruta_pdf)}`)
              : '';
            const manifestUrl = withAuthToken(`/api/notas-credito/${nota.id}/manifest`);
            const manifestDisponible = Boolean(nota.ruta_xml || nota.ruta_pdf);
            return (
              <tr key={nota.id}>
                <td className="fw-semibold">{nota.clave || '-'}</td>
                <td>{nota.numero_consecutivo || '-'}</td>
                <td>{nota.emisor?.Nombre || nota.emisor?.nombre || '-'}</td>
                <td>{getMoneda(nota)}</td>
                <td>{formatAmount(nota.monto)}</td>
                <td>{formatDate(nota.fecha_emision)}</td>
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
                    {manifestDisponible ? (
                      <a
                        className="btn btn-sm btn-outline-dark"
                        href={manifestUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {FACTURA_DETALLE_LABELS.pdf.manifestButton}
                      </a>
                    ) : (
                      <button className="btn btn-sm btn-outline-secondary" type="button" disabled>
                        {FACTURA_DETALLE_LABELS.pdf.manifestUnavailable}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {filtradas.length === 0 && (
            <tr>
              <td colSpan="7" className="py-4">
                <EmptyState className="text-center py-2">
                  No hay notas de credito para los filtros seleccionados.
                </EmptyState>
              </td>
            </tr>
          )}
        </DataTable>
      </SectionCard>
    </div>
  );
}

export default NotasCredito;
