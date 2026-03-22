import { TIQUETES_ELECTRONICOS_LABELS } from '../../utils/uiLabels.js';
import {
  PAGE_SIZE_OPTIONS,
  formatLabel,
} from './tiquetesPageHelpers.js';

function TiquetesPagination({
  meta,
  pageSize,
  pages,
  setPage,
  setPageSize,
}) {
  return (
    <div className="pagination-row facturas-pagination">
      <div className="facturas-pagination-meta">
        <span>{formatLabel(TIQUETES_ELECTRONICOS_LABELS.totalResults, { count: meta.totalItems })}</span>
        <label className="facturas-page-size">
          <span>{TIQUETES_ELECTRONICOS_LABELS.pageSizeLabel}</span>
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
          {TIQUETES_ELECTRONICOS_LABELS.paginationPrevious}
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
          {TIQUETES_ELECTRONICOS_LABELS.paginationNext}
        </button>
      </div>
    </div>
  );
}

export default TiquetesPagination;
