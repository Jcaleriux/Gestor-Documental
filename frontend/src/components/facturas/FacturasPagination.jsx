import { FACTURAS_LABELS } from '../../utils/uiLabels.js';
import {
  PAGE_SIZE_OPTIONS,
  formatLabel,
} from './facturasPageHelpers.js';

function FacturasPagination({
  meta,
  pageSize,
  pages,
  setPage,
  setPageSize,
}) {
  return (
    <div className="pagination-row facturas-pagination">
      <div className="facturas-pagination-meta">
        <span>{formatLabel(FACTURAS_LABELS.totalResults, { count: meta.totalItems })}</span>
        <label className="facturas-page-size">
          <span>{FACTURAS_LABELS.pageSizeLabel}</span>
          <select
            className="form-select form-select-sm"
            value={pageSize}
            onChange={(event) => setPageSize(event.target.value)}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="pagination-pages facturas-pagination-pages">
        <button
          className="btn btn-light"
          type="button"
          onClick={() => setPage(meta.page - 1)}
          disabled={!meta.hasPrev}
        >
          {FACTURAS_LABELS.paginationPrevious}
        </button>

        {pages.map((pageItem) => (
          typeof pageItem === 'string' ? (
            <span key={pageItem} className="facturas-pagination-ellipsis">...</span>
          ) : (
            <button
              key={pageItem}
              className={`btn ${pageItem === meta.page ? 'btn-primary' : 'btn-outline-secondary'}`}
              type="button"
              onClick={() => setPage(pageItem)}
            >
              {pageItem}
            </button>
          )
        ))}

        <button
          className="btn btn-light"
          type="button"
          onClick={() => setPage(meta.page + 1)}
          disabled={!meta.hasNext}
        >
          {FACTURAS_LABELS.paginationNext}
        </button>
      </div>
    </div>
  );
}

export default FacturasPagination;
