const { PDFDocument } = require('pdf-lib');
const {
  applyFacturaAccountingSidebar,
  buildFacturaSidebarData,
  buildUnifiedPdfResourcePlan,
  mergeUnifiedPdfResources
} = require('../services/tramitesPagoUnifiedPdfSupport');

const createPdfBuffer = async (pageCount = 1) => {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    pdf.addPage([200, 200]);
  }
  return Buffer.from(await pdf.save());
};

describe('tramitesPagoUnifiedPdfSupport', () => {
  test('buildFacturaSidebarData consolida los datos del recuadro contable', () => {
    const sidebarData = buildFacturaSidebarData({
      factura_id: 1,
      consecutivo: 'F-001',
      conta_proyecto: 'EMO',
      conta_fecha_contabilizacion: '2026-01-20',
      conta_orden_compra: '',
      conta_orden_compra_nombre: 'OC-123',
      conta_creado_por: 'DSJ',
      conta_cuenta_contable: '3263',
      conta_centro_costo: 'CC-FALLBACK',
      conta_metadata: {
        asiento: '5535',
        centros_costo_lineas: [
          { codigo: '11Y0801', nombre: 'Centro 1' },
          { codigo: '11Y0802', nombre: 'Centro 2' },
          { codigo: '11Y0801', nombre: 'Centro 1' }
        ]
      },
      gerencia_aprobadores: [
        { usuario_aprobador_nombre: 'Gerencia 1', estado: 'aprobado' },
        { usuario_aprobador_email: 'g2@sendadocs.local', estado: 'aprobado' },
        { usuario_aprobador_nombre: 'Pendiente', estado: 'pendiente' }
      ]
    }, {
      society: {
        nombre_proyecto: 'BSP (Bio San Pablo)',
        razon_social: 'Bio San Pablo S.A.'
      }
    });

    const fieldsMap = Object.fromEntries(
      sidebarData.fields.map((field) => [field.key, field.value])
    );

    expect(sidebarData.facturaId).toBe(1);
    expect(sidebarData.consecutivo).toBe('F-001');
    expect(fieldsMap.proyecto).toBe('BSP (Bio San Pablo)');
    expect(fieldsMap.fecha).toBe('20/1/2026');
    expect(fieldsMap.orden_compra).toBe('OC-123');
    expect(fieldsMap.contabilizada_por).toBe('DSJ');
    expect(fieldsMap.centro_costo).toBe('11Y0801 - Centro 1, 11Y0802 - Centro 2');
    expect(fieldsMap.asiento).toBe('3263');
    expect(fieldsMap.aprobada_por).toBe('Gerencia 1, g2@sendadocs.local');
  });

  test('buildUnifiedPdfResourcePlan respeta el orden visible y agrupa caratula, factura y anexos', () => {
    const resources = buildUnifiedPdfResourcePlan({
      direction: 'asc',
      providerGroups: [
        {
          group_key: 'zeta',
          proveedor_nombre: 'Zeta',
          pdf_path: 'caratulas/zeta.pdf',
          documents: [{ factura_id: 2 }]
        },
        {
          group_key: 'alfa',
          proveedor_nombre: 'Alfa',
          pdf_path: 'caratulas/alfa.pdf',
          documents: [{ factura_id: 1 }]
        }
      ],
      documents: [
        {
          factura_id: 1,
          consecutivo: 'F-001',
          ruta_pdf: 'facturas/f1.pdf',
          conta_tabla_pago_ruta_pdf: 'tablas/f1.pdf',
          conta_orden_compra_ruta_pdf: 'ocs/f1.pdf',
          conta_nota_credito_ruta_pdf: 'notas/f1.pdf',
          conta_documentos_respaldo: [
            { id: 41, nombre_archivo: 'respaldo-a.pdf', ruta_pdf: 'respaldos/f1-a.pdf' },
            { id: 42, nombre_archivo: 'respaldo-b.pdf', ruta_pdf: 'respaldos/f1-b.pdf' }
          ]
        },
        {
          factura_id: 2,
          consecutivo: 'F-002',
          ruta_pdf: 'facturas/f2.pdf'
        }
      ],
      society: {
        nombre_proyecto: 'BSP (Bio San Pablo)',
      }
    });

    expect(resources.map((item) => item.path)).toEqual([
      'caratulas/alfa.pdf',
      'facturas/f1.pdf',
      'tablas/f1.pdf',
      'ocs/f1.pdf',
      'notas/f1.pdf',
      'respaldos/f1-a.pdf',
      'respaldos/f1-b.pdf',
      'caratulas/zeta.pdf',
      'facturas/f2.pdf'
    ]);
    expect(resources[1]).toMatchObject({
      path: 'facturas/f1.pdf',
      resourceType: 'factura_pdf',
      sidebarData: {
        facturaId: 1,
        fields: expect.arrayContaining([
          expect.objectContaining({
            key: 'proyecto',
            value: 'BSP (Bio San Pablo)'
          })
        ])
      }
    });
    expect(resources[2]).toMatchObject({
      path: 'tablas/f1.pdf',
      resourceType: 'attachment_pdf',
    });
  });

  test('buildUnifiedPdfResourcePlan preserva archivos repetidos cuando pertenecen a varias facturas', () => {
    const sharedPurchaseOrder = 'ocs/compartida.pdf';
    const resources = buildUnifiedPdfResourcePlan({
      direction: 'desc',
      providerGroups: [
        {
          group_key: 'grupo-1',
          proveedor_nombre: 'Proveedor Demo',
          documents: [{ factura_id: 20 }, { factura_id: 10 }]
        }
      ],
      documents: [
        {
          factura_id: 20,
          consecutivo: 'F-020',
          ruta_pdf: 'facturas/f20.pdf',
          conta_orden_compra_ruta_pdf: sharedPurchaseOrder
        },
        {
          factura_id: 10,
          consecutivo: 'F-010',
          ruta_pdf: 'facturas/f10.pdf',
          conta_orden_compra_ruta_pdf: sharedPurchaseOrder
        }
      ]
    });

    expect(resources.filter((item) => item.path === sharedPurchaseOrder)).toHaveLength(2);
    expect(resources.map((item) => item.path)).toEqual([
      'facturas/f20.pdf',
      'ocs/compartida.pdf',
      'facturas/f10.pdf',
      'ocs/compartida.pdf'
    ]);
  });

  test('mergeUnifiedPdfResources omite PDFs invalidos y conserva los validos', async () => {
    const firstPdf = await createPdfBuffer(1);
    const secondPdf = await createPdfBuffer(2);
    const { buffer, omittedItems } = await mergeUnifiedPdfResources({
      resources: [
        { key: 'ok-1', path: 'docs/1.pdf', omissionLabel: 'Factura F-001 - PDF factura' },
        { key: 'bad-1', path: 'docs/bad.pdf', omissionLabel: 'Factura F-001 - Tabla de pagos' },
        { key: 'ok-2', path: 'docs/2.pdf', omissionLabel: 'Factura F-002 - PDF factura' }
      ],
      loadResourceBuffer: async (resource) => {
        if (resource.path === 'docs/bad.pdf') {
          return Buffer.from('no-es-un-pdf');
        }
        if (resource.path === 'docs/2.pdf') {
          return secondPdf;
        }
        return firstPdf;
      }
    });

    expect(omittedItems).toEqual(['Factura F-001 - Tabla de pagos']);
    expect(Buffer.isBuffer(buffer)).toBe(true);

    const mergedPdf = await PDFDocument.load(buffer);
    expect(mergedPdf.getPageCount()).toBe(3);
  });

  test('applyFacturaAccountingSidebar dibuja el recuadro solo en la primera pagina', async () => {
    const createPageMock = () => ({
      getSize: jest.fn(() => ({ width: 612, height: 792 })),
      drawRectangle: jest.fn(),
      drawLine: jest.fn(),
      drawText: jest.fn(),
    });
    const firstPage = createPageMock();
    const secondPage = createPageMock();
    const fontMock = {
      widthOfTextAtSize(text, fontSize) {
        return String(text || '').length * fontSize * 0.45;
      }
    };
    const pdfDocument = {
      getPages: () => [firstPage, secondPage],
      embedFont: jest.fn(async () => fontMock),
    };

    await applyFacturaAccountingSidebar({
      pdfDocument,
      sidebarData: buildFacturaSidebarData({
        factura_id: 1,
        conta_proyecto: 'EMO',
        conta_fecha_contabilizacion: '2026-01-20',
        conta_creado_por: 'DSJ',
      })
    });

    expect(pdfDocument.embedFont).toHaveBeenCalledTimes(2);
    expect(firstPage.drawRectangle).toHaveBeenCalledTimes(1);
    expect(firstPage.drawText).toHaveBeenCalled();
    expect(firstPage.drawText.mock.calls.some((call) => call[0] === 'Proyecto')).toBe(true);
    expect(firstPage.drawText.mock.calls.some((call) => call[0] === 'EMO')).toBe(true);
    expect(secondPage.drawRectangle).not.toHaveBeenCalled();
    expect(secondPage.drawText).not.toHaveBeenCalled();
  });

  test('mergeUnifiedPdfResources usa el PDF original cuando falla el estampado de la factura', async () => {
    const facturaPdf = await createPdfBuffer(2);
    const applyFacturaSidebarImpl = jest.fn(async () => {
      throw new Error('fallo de overlay');
    });

    const { buffer, omittedItems, includedResources } = await mergeUnifiedPdfResources({
      resources: [
        {
          key: 'factura-1',
          path: 'docs/factura-1.pdf',
          resourceType: 'factura_pdf',
          sidebarData: buildFacturaSidebarData({ factura_id: 1 }),
          omissionLabel: 'Factura F-001 - PDF factura'
        }
      ],
      loadResourceBuffer: async () => facturaPdf,
      applyFacturaSidebarImpl,
    });

    expect(applyFacturaSidebarImpl).toHaveBeenCalledTimes(1);
    expect(omittedItems).toEqual([]);
    expect(includedResources).toHaveLength(1);

    const mergedPdf = await PDFDocument.load(buffer);
    expect(mergedPdf.getPageCount()).toBe(2);
  });
});
