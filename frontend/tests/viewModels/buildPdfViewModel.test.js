import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockFn } from '../utils/mockFn.js';
import {
  buildPdfDocumentLinksViewModel,
  buildPdfMhViewModel,
  buildPdfAssociationsViewModel,
  buildPdfViewModel
} from '../../src/components/facturaDetalle/viewModels/buildPdfViewModel.js';
import { AUTH_TOKEN_KEY } from '../../src/utils/auth.js';

const setLocalStorageMock = ({ token = '' } = {}) => {
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem(key) {
      if (key === AUTH_TOKEN_KEY) return token;
      return null;
    },
    setItem() {},
    removeItem() {}
  };

  return () => {
    globalThis.localStorage = previous;
  };
};

const createDetalleFixture = () => ({
  mhLoading: false,
  mhError: '',
  verMensajeHacienda: createMockFn(),
  verManifest: createMockFn(),
  tablaPagoActual: { id: 11, ruta_pdf: 'docs/tabla.pdf' },
  verTablaPagoAsociada: createMockFn(),
  ordenCompraActual: { id: 21, ruta_pdf: 'docs/oc.pdf' },
  verOrdenCompraAsociada: createMockFn(),
  notaCreditoActual: { id: 31, ruta_pdf: 'docs/nc.pdf', ruta_xml: 'docs/nc.xml' },
  verNotaCreditoAsociada: createMockFn()
});

test('sub-builders de pdf conservan links, estado MH y asociaciones', () => {
  const restore = setLocalStorageMock({ token: 'token-pdf' });
  try {
    const factura = {
      ruta_pdf: 'docs/factura.pdf',
      ruta_xml: 'docs/factura.xml',
      has_mensaje_hacienda: true
    };
    const detalle = createDetalleFixture();

    const links = buildPdfDocumentLinksViewModel({ id: 50, factura });
    const mh = buildPdfMhViewModel({ factura, detalle });
    const associations = buildPdfAssociationsViewModel({ detalle });

    assert.equal(links.id, 50);
    assert.equal(links.pdfUrl, '/api/files/pdf?path=docs%2Ffactura.pdf');
    assert.equal(links.xmlUrl, '/api/files/xml?path=docs%2Ffactura.xml');
    assert.equal(mh.mhDisponible, true);
    assert.equal(mh.verManifest, detalle.verManifest);
    assert.equal(associations.tablaPagoActual.id, 11);
    assert.equal(associations.ordenCompraPdfUrl, '/api/files/pdf?path=docs%2Foc.pdf');
    assert.equal(associations.notaCreditoXmlUrl, '/api/files/xml?path=docs%2Fnc.xml');
  } finally {
    restore();
  }
});

test('buildPdfViewModel compone salida final de PDF', () => {
  const restore = setLocalStorageMock({ token: 'token-pdf' });
  try {
    const factura = {
      ruta_pdf: 'docs/factura.pdf',
      ruta_xml: 'docs/factura.xml',
      has_mensaje_hacienda: false
    };
    const detalle = createDetalleFixture();

    const pdfVm = buildPdfViewModel({ id: 77, factura, detalle });

    assert.equal(pdfVm.id, 77);
    assert.equal(pdfVm.mhDisponible, false);
    assert.equal(pdfVm.manifestDisponible, true);
    assert.equal(pdfVm.tablaPagoActual.id, 11);
    assert.equal(pdfVm.notaCreditoActual.id, 31);
  } finally {
    restore();
  }
});
