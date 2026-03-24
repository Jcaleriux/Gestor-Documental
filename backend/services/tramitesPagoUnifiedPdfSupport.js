const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const stripDiacritics = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const normalizeProviderLabel = (value) => stripDiacritics(value)
  .toUpperCase()
  .trim();

const normalizeSortDirection = (value) => (
  String(value || 'asc').trim().toLowerCase() === 'desc' ? 'desc' : 'asc'
);

const SIDEBAR_TEXT_COLOR = rgb(0.1, 0.1, 0.1);
const SIDEBAR_VALUE_COLOR = rgb(0.08, 0.2, 0.72);
const SIDEBAR_BORDER_COLOR = rgb(0, 0, 0);
const SIDEBAR_BACKGROUND_COLOR = rgb(1, 1, 1);
const SIDEBAR_FIELDS = Object.freeze([
  { key: 'proyecto', label: 'Proyecto' },
  { key: 'fecha', label: 'Fecha' },
  { key: 'orden_compra', label: 'Orden de compra' },
  { key: 'contabilizada_por', label: 'Contabilizada por' },
  { key: 'centro_costo', label: 'Centro de costo' },
  { key: 'asiento', label: 'Asiento #' },
  { key: 'aprobada_por', label: 'Aprobada por' },
]);

const normalizeString = (value) => String(value || '').trim();

const toSidebarText = (value) => (
  value === undefined || value === null
    ? ''
    : String(value).replace(/\s+/g, ' ').trim()
);

const formatSidebarDate = (value) => {
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return '';
  }

  const match = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${Number(match[3])}/${Number(match[2])}/${match[1]}`;
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return rawValue;
  }

  return `${parsed.getUTCDate()}/${parsed.getUTCMonth() + 1}/${parsed.getUTCFullYear()}`;
};

const normalizeContaMetadata = (metadata) => (
  metadata && typeof metadata === 'object' ? metadata : {}
);

const formatCentroCostoLabel = (linea = {}) => {
  const codigo = normalizeString(linea?.codigo).toUpperCase();
  const nombre = normalizeString(linea?.nombre);

  if (codigo && nombre) {
    return `${codigo} - ${nombre}`;
  }

  return codigo || nombre || '';
};

const buildCentroCostoLabels = (documento = {}) => {
  const metadata = normalizeContaMetadata(documento?.conta_metadata);
  const labels = Array.isArray(metadata.centros_costo_lineas)
    ? metadata.centros_costo_lineas
      .filter((linea) => linea?.centro_costo_id || linea?.codigo || linea?.nombre)
      .map((linea) => formatCentroCostoLabel(linea))
      .filter(Boolean)
    : [];
  const uniqueLabels = Array.from(new Set(labels));

  if (uniqueLabels.length > 0) {
    return uniqueLabels;
  }

  if (documento?.conta_centro_costo) {
    return [toSidebarText(documento.conta_centro_costo)];
  }

  return [];
};

const buildApprovedByLabel = (documento = {}) => {
  const approvedUsers = (Array.isArray(documento?.gerencia_aprobadores) ? documento.gerencia_aprobadores : [])
    .filter((item) => String(item?.estado || '').trim().toLowerCase() === 'aprobado')
    .map((item) => toSidebarText(item?.usuario_aprobador_nombre || item?.usuario_aprobador_email))
    .filter(Boolean);

  return Array.from(new Set(approvedUsers)).join(', ');
};

const buildSocietyProjectLabel = (society = null) => (
  toSidebarText(society?.nombre_proyecto || society?.razon_social || '')
);

const buildFacturaSidebarData = (documento = {}, { society = null } = {}) => {
  const metadata = normalizeContaMetadata(documento?.conta_metadata);
  const centerCostLabels = buildCentroCostoLabels(documento);
  const societyProjectLabel = buildSocietyProjectLabel(society);

  return {
    facturaId: Number(documento?.factura_id) || null,
    consecutivo: getConsecutivoLabel(documento),
    fields: SIDEBAR_FIELDS.map((field) => {
      switch (field.key) {
        case 'proyecto':
          return { ...field, value: societyProjectLabel || toSidebarText(documento?.conta_proyecto) };
        case 'fecha':
          return { ...field, value: formatSidebarDate(documento?.conta_fecha_contabilizacion) };
        case 'orden_compra':
          return {
            ...field,
            value: toSidebarText(documento?.conta_orden_compra || documento?.conta_orden_compra_nombre)
          };
        case 'contabilizada_por':
          return { ...field, value: toSidebarText(documento?.conta_creado_por) };
        case 'centro_costo':
          return { ...field, value: centerCostLabels.join(', ') };
        case 'asiento':
          return {
            ...field,
            value: toSidebarText(documento?.conta_cuenta_contable || metadata?.asiento)
          };
        case 'aprobada_por':
          return { ...field, value: buildApprovedByLabel(documento) };
        default:
          return { ...field, value: '' };
      }
    })
  };
};

const getProviderLabelFromGroup = (group) => (
  group?.proveedor_nombre
  || group?.provider_raw_name
  || ''
);

const getConsecutivoLabel = (documento) => (
  documento?.consecutivo
  || documento?.clave
  || documento?.factura_id
  || 'sin_identificador'
);

const sortUnifiedPdfProviderGroups = ({
  providerGroups = [],
  direction = 'asc',
}) => {
  const normalizedDirection = normalizeSortDirection(direction);
  const factor = normalizedDirection === 'desc' ? -1 : 1;

  return [...(Array.isArray(providerGroups) ? providerGroups : [])]
    .sort((left, right) => (
      normalizeProviderLabel(getProviderLabelFromGroup(left))
        .localeCompare(normalizeProviderLabel(getProviderLabelFromGroup(right)))
    ) * factor);
};

const buildFacturaPrefix = (documento) => `Factura ${getConsecutivoLabel(documento)}`;

const buildUnifiedPdfResourcePlan = ({
  providerGroups = [],
  documents = [],
  society = null,
  direction = 'asc',
}) => {
  const documentsByFacturaId = new Map(
    (Array.isArray(documents) ? documents : [])
      .map((documento) => [Number(documento?.factura_id), documento])
      .filter((entry) => Number.isInteger(entry[0]) && entry[0] > 0)
  );

  return sortUnifiedPdfProviderGroups({
    providerGroups,
    direction,
  }).flatMap((group) => {
    const providerLabel = getProviderLabelFromGroup(group) || 'Proveedor sin nombre';
    const resources = [];

    if (group?.pdf_path) {
      resources.push({
        key: `caratula-${group.group_key || providerLabel}`,
        path: group.pdf_path,
        omissionLabel: `Caratula ${providerLabel}`,
      });
    }

    (Array.isArray(group?.documents) ? group.documents : []).forEach((groupDocument, documentIndex) => {
      const facturaId = Number(groupDocument?.factura_id);
      const documentData = documentsByFacturaId.get(facturaId) || groupDocument;
      if (!documentData) {
        return;
      }

      const facturaPrefix = buildFacturaPrefix(documentData);

      if (documentData?.ruta_pdf) {
        resources.push({
          key: `factura-${facturaId}-${documentIndex}`,
          path: documentData.ruta_pdf,
          resourceType: 'factura_pdf',
          sidebarData: buildFacturaSidebarData(documentData, { society }),
          omissionLabel: `${facturaPrefix} - PDF factura`,
        });
      }

      if (documentData?.conta_tabla_pago_ruta_pdf) {
        resources.push({
          key: `tabla-${facturaId}-${documentIndex}`,
          path: documentData.conta_tabla_pago_ruta_pdf,
          resourceType: 'attachment_pdf',
          omissionLabel: `${facturaPrefix} - Tabla de pagos`,
        });
      }

      if (documentData?.conta_orden_compra_ruta_pdf) {
        resources.push({
          key: `orden-${facturaId}-${documentIndex}`,
          path: documentData.conta_orden_compra_ruta_pdf,
          resourceType: 'attachment_pdf',
          omissionLabel: `${facturaPrefix} - Orden de compra`,
        });
      }

      if (documentData?.conta_nota_credito_ruta_pdf) {
        resources.push({
          key: `nota-${facturaId}-${documentIndex}`,
          path: documentData.conta_nota_credito_ruta_pdf,
          resourceType: 'attachment_pdf',
          omissionLabel: `${facturaPrefix} - Nota de credito`,
        });
      }

      (Array.isArray(documentData?.conta_documentos_respaldo)
        ? documentData.conta_documentos_respaldo
        : []
      )
        .filter((item) => item?.ruta_pdf)
        .forEach((item, respaldoIndex) => {
          resources.push({
            key: `respaldo-${facturaId}-${item.id || respaldoIndex}`,
            path: item.ruta_pdf,
            resourceType: 'attachment_pdf',
            omissionLabel: `${facturaPrefix} - Documento de respaldo ${item.nombre_archivo || item.id || respaldoIndex + 1}`,
          });
        });
    });

    return resources;
  });
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const resolveSidebarLayout = ({ width, height }) => {
  const scale = 0.75;
  const boxWidth = clamp(width * 0.22, 125, 155) * scale;
  const boxHeight = clamp(height * 0.34, 250, 315) * scale;
  const x = width * 0.10;
  const y = height * 0.05;

  return {
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    rowHeight: boxHeight / SIDEBAR_FIELDS.length,
    paddingX: 6 * scale,
    labelFontSize: 7 * scale,
    valueFontSize: 11 * scale,
    labelTopOffset: 11 * scale,
    valueTopOffset: 24 * scale,
    lineGap: 2 * scale,
  };
};

const ellipsizeTextToWidth = ({ text = '', font, fontSize, maxWidth }) => {
  const normalizedText = String(text || '');
  if (!normalizedText || !font || !maxWidth || maxWidth <= 0) {
    return normalizedText;
  }

  if (font.widthOfTextAtSize(normalizedText, fontSize) <= maxWidth) {
    return normalizedText;
  }

  const ellipsis = '...';
  const ellipsisWidth = font.widthOfTextAtSize(ellipsis, fontSize);
  let result = normalizedText;
  while (result && font.widthOfTextAtSize(result, fontSize) + ellipsisWidth > maxWidth) {
    result = result.slice(0, -1);
  }

  return result ? `${result}${ellipsis}` : ellipsis;
};

const wrapTextToWidth = ({
  text = '',
  font,
  fontSize,
  maxWidth,
  maxLines = 2,
}) => {
  const normalizedText = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalizedText || !font || !maxWidth || maxWidth <= 0 || maxLines <= 0) {
    return [];
  }

  const words = normalizedText.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      lines.push(ellipsizeTextToWidth({ text: word, font, fontSize, maxWidth }));
      currentLine = '';
    }

    if (lines.length === maxLines) {
      return lines;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const visibleLines = lines.slice(0, maxLines);
  visibleLines[maxLines - 1] = ellipsizeTextToWidth({
    text: visibleLines[maxLines - 1],
    font,
    fontSize,
    maxWidth,
  });
  return visibleLines;
};

const applyFacturaAccountingSidebar = async ({
  pdfDocument,
  sidebarData = {},
  embedFont = (fontName) => pdfDocument.embedFont(fontName),
}) => {
  const [firstPage] = typeof pdfDocument?.getPages === 'function' ? pdfDocument.getPages() : [];
  if (!firstPage || typeof firstPage.getSize !== 'function') {
    throw new Error('PDF de factura sin primera pagina disponible');
  }

  const boldFont = await embedFont(StandardFonts.HelveticaBold);
  const regularFont = await embedFont(StandardFonts.Helvetica);
  const { width, height } = firstPage.getSize();
  const layout = resolveSidebarLayout({ width, height });

  firstPage.drawRectangle({
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
    color: SIDEBAR_BACKGROUND_COLOR,
    borderColor: SIDEBAR_BORDER_COLOR,
    borderWidth: 1,
    opacity: 1,
  });

  SIDEBAR_FIELDS.forEach((field, index) => {
    const rowTopY = layout.y + layout.height - (layout.rowHeight * index);
    const rowBottomY = rowTopY - layout.rowHeight;
    if (index > 0) {
      firstPage.drawLine({
        start: { x: layout.x, y: rowTopY },
        end: { x: layout.x + layout.width, y: rowTopY },
        thickness: 0.75,
        color: SIDEBAR_BORDER_COLOR,
      });
    }

    const fieldValue = (Array.isArray(sidebarData?.fields) ? sidebarData.fields : [])
      .find((item) => item?.key === field.key)?.value || '';

    firstPage.drawText(field.label, {
      x: layout.x + layout.paddingX,
      y: rowTopY - layout.labelTopOffset,
      size: layout.labelFontSize,
      font: boldFont,
      color: SIDEBAR_TEXT_COLOR,
    });

    const lineHeight = layout.valueFontSize + layout.lineGap;
    const availableHeight = layout.rowHeight - layout.valueTopOffset - 4;
    const maxLines = Math.max(1, Math.floor(availableHeight / lineHeight));
    const wrappedLines = wrapTextToWidth({
      text: fieldValue,
      font: regularFont,
      fontSize: layout.valueFontSize,
      maxWidth: layout.width - (layout.paddingX * 2),
      maxLines,
    });

    wrappedLines.forEach((line, lineIndex) => {
      firstPage.drawText(line, {
        x: layout.x + layout.paddingX,
        y: rowTopY - layout.valueTopOffset - (lineIndex * lineHeight),
        size: layout.valueFontSize,
        font: regularFont,
        color: SIDEBAR_VALUE_COLOR,
      });
    });

    if (index === SIDEBAR_FIELDS.length - 1) {
      firstPage.drawLine({
        start: { x: layout.x, y: rowBottomY },
        end: { x: layout.x + layout.width, y: rowBottomY },
        thickness: 0.75,
        color: SIDEBAR_BORDER_COLOR,
      });
    }
  });
};

const mergeUnifiedPdfResources = async ({
  resources = [],
  loadResourceBuffer,
  createPdfDocument = () => PDFDocument.create(),
  loadPdfDocument = (buffer) => PDFDocument.load(buffer, { ignoreEncryption: true }),
  applyFacturaSidebarImpl = applyFacturaAccountingSidebar,
}) => {
  const normalizedResources = Array.isArray(resources) ? resources : [];
  const mergedPdf = await createPdfDocument();
  const includedResources = [];
  const omittedItems = [];

  for (const resource of normalizedResources) {
    if (!resource?.path) {
      continue;
    }

    try {
      const buffer = await loadResourceBuffer(resource);
      if (!buffer || buffer.length === 0) {
        throw new Error('PDF vacio');
      }

      let sourcePdf = await loadPdfDocument(buffer);
      const pageIndices = sourcePdf.getPageIndices();
      if (pageIndices.length === 0) {
        throw new Error('PDF sin paginas');
      }

      if (resource?.resourceType === 'factura_pdf') {
        try {
          await applyFacturaSidebarImpl({
            pdfDocument: sourcePdf,
            sidebarData: resource?.sidebarData || {},
            resource,
          });
        } catch (sidebarError) {
          sourcePdf = await loadPdfDocument(buffer);
        }
      }

      const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);
      copiedPages.forEach((page) => mergedPdf.addPage(page));
      includedResources.push(resource);
    } catch (error) {
      omittedItems.push(resource.omissionLabel || resource.key || 'PDF omitido');
    }
  }

  if (includedResources.length === 0) {
    return {
      buffer: null,
      includedResources,
      omittedItems,
    };
  }

  return {
    buffer: Buffer.from(await mergedPdf.save()),
    includedResources,
    omittedItems,
  };
};

const sanitizeHeaderValue = (value) => stripDiacritics(value)
  .replace(/[^\x20-\x7E]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const buildOmittedItemsHeader = (items = [], { maxItems = 6, maxLength = 240 } = {}) => {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item) => sanitizeHeaderValue(item))
    .filter(Boolean);

  if (normalizedItems.length === 0) {
    return '';
  }

  const visibleItems = normalizedItems.slice(0, maxItems);
  let summary = visibleItems.join(' | ');

  if (normalizedItems.length > visibleItems.length) {
    summary = `${summary} | +${normalizedItems.length - visibleItems.length} mas`;
  }

  if (summary.length > maxLength) {
    summary = `${summary.slice(0, Math.max(maxLength - 3, 0)).trim()}...`;
  }

  return summary;
};

const buildUnifiedPdfDownloadFilename = ({ tramiteId }) => {
  const safeTramiteId = String(tramiteId || 'sin_tramite').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `tramite_${safeTramiteId}_vista_unificada.pdf`;
};

module.exports = {
  normalizeSortDirection,
  sortUnifiedPdfProviderGroups,
  buildFacturaSidebarData,
  buildUnifiedPdfResourcePlan,
  applyFacturaAccountingSidebar,
  mergeUnifiedPdfResources,
  buildOmittedItemsHeader,
  buildUnifiedPdfDownloadFilename,
};
