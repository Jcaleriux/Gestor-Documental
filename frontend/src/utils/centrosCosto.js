const ROOT_PARENT_CODE = 'ROOT';

const normalizeText = (value) => String(value || '').trim();

const normalizeComparableText = (value) => normalizeText(value).toLowerCase();

const normalizeCode = (value) => normalizeText(value).toUpperCase();

const parseBooleanLike = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = normalizeComparableText(value);
  if (!normalized) {
    return fallback;
  }

  return ['1', 'true', 'si', 'sí', 'yes', 'activo', 'seleccionable'].includes(normalized);
};

const parseNumberLike = (value, fallback = null) => {
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const createLocalId = (prefix = 'cc') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

export const formatCentroCostoLabel = (centro) => {
  const codigo = normalizeCode(centro?.codigo);
  const nombre = normalizeText(centro?.nombre);

  if (codigo && nombre) {
    return `${codigo} - ${nombre}`;
  }

  return codigo || nombre || 'Centro sin nombre';
};

export const createCentroCostoLinea = (overrides = {}) => ({
  local_id: overrides.local_id || createLocalId('linea-cc'),
  centro_costo_id: normalizeText(overrides.centro_costo_id),
  codigo: normalizeCode(overrides.codigo),
  nombre: normalizeText(overrides.nombre),
  usuario_aprobador_id: overrides.usuario_aprobador_id ?? null,
  usuario_aprobador_nombre: normalizeText(overrides.usuario_aprobador_nombre),
  usuario_aprobador_email: normalizeText(overrides.usuario_aprobador_email),
  activo: overrides.activo !== false,
  seleccionable_en_contabilizacion: overrides.seleccionable_en_contabilizacion !== false,
  monto: overrides.monto ?? '',
});

export const normalizeCentroCostoLineas = (lineas = [], { preserveEmpty = false } = {}) => (
  Array.isArray(lineas)
    ? lineas
      .map((linea) => createCentroCostoLinea(linea))
      .filter((linea) => (
        preserveEmpty
          ? true
          : linea.codigo || linea.nombre || linea.centro_costo_id || linea.monto !== ''
      ))
    : []
);

export const ensureCentrosCostoMetadata = (metadata = {}, options = {}) => {
  const nextMetadata = metadata && typeof metadata === 'object' ? { ...metadata } : {};
  nextMetadata.centros_costo_lineas = normalizeCentroCostoLineas(nextMetadata.centros_costo_lineas, options);
  return nextMetadata;
};

export const createCentroCostoSnapshot = (centro, overrides = {}) => createCentroCostoLinea({
  centro_costo_id: centro?.id != null ? String(centro.id) : '',
  codigo: centro?.codigo,
  nombre: centro?.nombre,
  usuario_aprobador_id: centro?.usuario_aprobador_id ?? null,
  usuario_aprobador_nombre: centro?.usuario_aprobador_nombre,
  usuario_aprobador_email: centro?.usuario_aprobador_email,
  activo: centro?.activo !== false,
  seleccionable_en_contabilizacion: centro?.seleccionable_en_contabilizacion !== false,
  ...overrides,
});

export const buildCentroCostoResumen = (lineas = []) => {
  const labels = normalizeCentroCostoLineas(lineas)
    .filter((linea) => linea.centro_costo_id || linea.codigo || linea.nombre)
    .map((linea) => formatCentroCostoLabel(linea))
    .filter(Boolean);

  if (labels.length === 0) {
    return '';
  }

  if (labels.length === 1) {
    return labels[0];
  }

  return `${labels[0]} + ${labels.length - 1} mas`;
};

export const calculateCentrosCostoDistribution = (lineas = []) => {
  const normalizedLineas = normalizeCentroCostoLineas(lineas, { preserveEmpty: true });
  const totalAsignado = normalizedLineas.reduce((total, linea) => (
    total + (parseNumberLike(linea.monto, 0) || 0)
  ), 0);
  const hasIncompleteLines = normalizedLineas.some((linea) => (
    !linea.centro_costo_id
    || !linea.codigo
    || parseNumberLike(linea.monto, null) === null
    || parseNumberLike(linea.monto, 0) <= 0
  ));

  return {
    totalAsignado,
    hasIncompleteLines,
    lineCount: normalizedLineas.length,
  };
};

const compareCentrosCosto = (left, right) => {
  const leftOrden = Number.isFinite(Number(left?.orden)) ? Number(left.orden) : Number.MAX_SAFE_INTEGER;
  const rightOrden = Number.isFinite(Number(right?.orden)) ? Number(right.orden) : Number.MAX_SAFE_INTEGER;
  if (leftOrden !== rightOrden) {
    return leftOrden - rightOrden;
  }

  const leftCode = normalizeCode(left?.codigo);
  const rightCode = normalizeCode(right?.codigo);
  if (leftCode !== rightCode) {
    return leftCode.localeCompare(rightCode, 'es');
  }

  return normalizeText(left?.nombre).localeCompare(normalizeText(right?.nombre), 'es');
};

export const buildCentrosCostoTree = (centros = []) => {
  const nodeMap = new Map();
  const roots = [];

  centros.forEach((centro) => {
    nodeMap.set(String(centro.id), { ...centro, children: [] });
  });

  nodeMap.forEach((node) => {
    if (node.centro_padre_id && nodeMap.has(String(node.centro_padre_id))) {
      nodeMap.get(String(node.centro_padre_id)).children.push(node);
      return;
    }

    roots.push(node);
  });

  const sortNodes = (nodes, depth = 0) => nodes
    .sort(compareCentrosCosto)
    .map((node) => ({
      ...node,
      depth,
      children: sortNodes(node.children || [], depth + 1),
    }));

  return sortNodes(roots);
};

export const flattenCentrosCostoTree = (tree = []) => tree.flatMap((node) => [
  node,
  ...flattenCentrosCostoTree(node.children || []),
]);

export const filterCentrosCosto = (centros = [], {
  query = '',
  includeInactive = true,
  onlySelectable = false,
} = {}) => {
  const normalizedQuery = normalizeComparableText(query);

  return centros.filter((centro) => {
    if (!includeInactive && centro.activo === false) {
      return false;
    }

    if (onlySelectable && centro.seleccionable_en_contabilizacion === false) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      centro.codigo,
      centro.nombre,
      centro.centro_padre_codigo,
      centro.usuario_aprobador_nombre,
      centro.usuario_aprobador_email,
    ].join(' ').toLowerCase();

    return haystack.includes(normalizedQuery);
  });
};

export const collectDescendantIds = (centros = [], centroId) => {
  if (!centroId) {
    return new Set();
  }

  const descendants = new Set();
  const visit = (parentId) => {
    centros.forEach((centro) => {
      if (String(centro.centro_padre_id || '') !== String(parentId)) {
        return;
      }

      descendants.add(String(centro.id));
      visit(centro.id);
    });
  };

  visit(centroId);
  return descendants;
};

export const suggestParentByCode = (centros = [], codigo, currentId = null) => {
  const normalizedCodigo = normalizeCode(codigo);
  if (!normalizedCodigo) {
    return null;
  }

  return centros
    .filter((centro) => String(centro.id) !== String(currentId || ''))
    .filter((centro) => {
      const candidateCode = normalizeCode(centro.codigo);
      return candidateCode && normalizedCodigo.startsWith(candidateCode) && candidateCode !== normalizedCodigo;
    })
    .sort((left, right) => normalizeCode(right.codigo).length - normalizeCode(left.codigo).length)[0] || null;
};

const parseCsvText = (text) => {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return [];
  }

  const delimiter = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length
    ? ';'
    : ',';

  return lines.map((line) => line.split(delimiter).map((cell) => cell.trim()));
};

const parseLegacyCell = (cellValue) => {
  const value = normalizeText(cellValue);
  if (!value) {
    return null;
  }

  const patterns = [
    /^\s*([0-9A-Za-z]+)\s*-\s*(.+)\s*$/,
    /^\s*([0-9A-Za-z]+)\s+(.+)\s*$/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      return {
        codigo: normalizeCode(match[1]),
        nombre: normalizeText(match[2]),
      };
    }
  }

  return null;
};

const parseNormalizedImportRows = (matrix) => {
  const [headers, ...rows] = matrix;
  const fieldMap = new Map(
    headers.map((header, index) => [normalizeComparableText(header), index])
  );

  if (!fieldMap.has('codigo') || !fieldMap.has('nombre')) {
    return null;
  }

  return rows
    .map((row, index) => ({
      codigo: normalizeCode(row[fieldMap.get('codigo')]),
      nombre: normalizeText(row[fieldMap.get('nombre')]),
      codigo_padre: normalizeCode(row[fieldMap.get('codigo_padre')]) || ROOT_PARENT_CODE,
      email_aprobador: normalizeComparableText(row[fieldMap.get('email_aprobador')]),
      seleccionable_en_contabilizacion: parseBooleanLike(
        row[fieldMap.get('seleccionable_en_contabilizacion')],
        true
      ),
      activo: parseBooleanLike(row[fieldMap.get('activo')], true),
      orden: parseNumberLike(row[fieldMap.get('orden')], index + 1) || index + 1,
    }))
    .filter((item) => item.codigo && item.nombre);
};

const parseLegacyImportRows = (matrix) => {
  const [, ...rows] = matrix;
  const entriesByCode = new Map();

  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    let previousCode = ROOT_PARENT_CODE;

    rows.forEach((row, rowIndex) => {
      const parsed = parseLegacyCell(row[columnIndex]);
      if (!parsed?.codigo) {
        return;
      }

      const existing = entriesByCode.get(parsed.codigo) || {
        codigo: parsed.codigo,
        nombre: parsed.nombre,
        codigo_padre: previousCode,
        email_aprobador: '',
        seleccionable_en_contabilizacion: true,
        activo: true,
        orden: rowIndex + 1 + columnIndex,
      };

      if (!existing.nombre && parsed.nombre) {
        existing.nombre = parsed.nombre;
      }

      if (!existing.codigo_padre || existing.codigo_padre === ROOT_PARENT_CODE) {
        existing.codigo_padre = previousCode;
      }

      entriesByCode.set(parsed.codigo, existing);
      previousCode = parsed.codigo;
    });
  }

  const childrenCodes = new Set();
  entriesByCode.forEach((entry) => {
    if (entry.codigo_padre && entry.codigo_padre !== ROOT_PARENT_CODE) {
      childrenCodes.add(entry.codigo_padre);
    }
  });

  return Array.from(entriesByCode.values())
    .map((entry) => ({
      ...entry,
      seleccionable_en_contabilizacion: !childrenCodes.has(entry.codigo),
    }))
    .filter((entry) => entry.codigo && entry.nombre);
};

export const parseCentrosCostoCsv = (text) => {
  const matrix = parseCsvText(text);
  if (matrix.length === 0) {
    return [];
  }

  return parseNormalizedImportRows(matrix) || parseLegacyImportRows(matrix);
};

export const buildCentrosCostoTemplateCsv = () => (
  [
    'codigo;nombre;codigo_padre;email_aprobador;seleccionable_en_contabilizacion;activo;orden',
    '11ROOT;11 - PROYECTO DEMO;ROOT;gerencia.proyecto@novogar.local;false;true;1',
    '1100000;COSTOS DIRECTOS E INDIRECTOS DE OBRA;11ROOT;gerencia.proyecto@novogar.local;false;true;2',
    '11Z0000;COSTOS DIRECTOS COMUNES DE OBRA;1100000;gerencia.proyecto@novogar.local;false;true;3',
    '11Z0100;DIRECTOS COMUNES - TERRENOS;11Z0000;gerencia.proyecto@novogar.local;true;true;4',
  ].join('\n')
);

export {
  ROOT_PARENT_CODE,
  normalizeText,
  normalizeComparableText,
  normalizeCode,
  parseBooleanLike,
  parseNumberLike,
  createLocalId,
};
