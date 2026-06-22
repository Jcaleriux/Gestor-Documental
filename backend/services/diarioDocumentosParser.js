const fs = require('fs');
const path = require('path');

const DEFAULT_DIARIO_DOCUMENTOS_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'docs',
  'datos',
  'Documentos',
  'Diario de documentos (1).csv'
);

const ALLOWED_DIARIO_DOCUMENTOS_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'docs',
  'datos',
  'Documentos'
);

const normalizeText = (value) => String(value || '').trim();
const normalizeCode = (value) => normalizeText(value).toUpperCase();

const extractLast11Digits = (value) => {
  const digits = normalizeText(value).replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  return digits.length >= 11 ? digits.slice(-11) : digits.padStart(11, '0');
};

const readTextFile = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString('utf16le').replace(/^\uFEFF/, '');
  }

  return buffer.toString('utf8').replace(/^\uFEFF/, '');
};

const resolveDiarioDocumentosPath = (inputPath) => {
  const resolvedPath = inputPath
    ? path.resolve(inputPath)
    : DEFAULT_DIARIO_DOCUMENTOS_PATH;

  const relative = path.relative(ALLOWED_DIARIO_DOCUMENTOS_DIR, resolvedPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    const error = new Error('El archivo debe estar dentro de docs/datos/Documentos');
    error.status = 400;
    throw error;
  }

  return resolvedPath;
};

const getTailFields = (cells) => {
  let normalizedCells = cells;
  if (normalizedCells[normalizedCells.length - 1] === '') {
    normalizedCells = normalizedCells.slice(0, -1);
  }

  return {
    referencia2: normalizeText(normalizedCells[normalizedCells.length - 1]),
    referencia1: normalizeText(normalizedCells[normalizedCells.length - 2]),
    centroCosto: normalizeCode(normalizedCells[normalizedCells.length - 3])
  };
};

const getProveedorFields = (cells) => {
  const codigo = normalizeCode(cells[8]);
  const nombre = normalizeText(cells[9]);

  if (!/^P\d+/i.test(codigo) || !nombre) {
    return null;
  }

  return { codigo, nombre };
};

const parseDiarioDocumentosText = (text) => {
  const lines = String(text || '')
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length === 0) {
    return {
      headers: [],
      malformedRows: 0,
      asientos: []
    };
  }

  const headers = lines[0].split(',');
  const asientos = [];
  let current = null;
  let malformedRows = 0;

  lines.slice(1).forEach((line, index) => {
    const cells = line.split(',');
    if (cells.length !== headers.length) {
      malformedRows += 1;
    }

    const asiento = normalizeText(cells[1]);
    const fechaContabilizacion = normalizeText(cells[2]);
    const tailFields = getTailFields(cells);

    if (asiento) {
      if (current) {
        asientos.push(current);
      }

      current = {
        rowIndex: index + 2,
        asiento,
        fecha_contabilizacion: fechaContabilizacion,
        referencia2: tailFields.referencia2,
        referencias2: [],
        proveedor_codigos: [],
        proveedor_nombres: [],
        centros_costo_codigos: [],
        filas: 0
      };
    }

    if (!current) {
      return;
    }

    current.filas += 1;

    if (tailFields.referencia2) {
      current.referencias2.push(tailFields.referencia2);
    }

    if (tailFields.centroCosto) {
      current.centros_costo_codigos.push(tailFields.centroCosto);
    }

    const proveedor = getProveedorFields(cells);
    if (proveedor) {
      current.proveedor_codigos.push(proveedor.codigo);
      current.proveedor_nombres.push(proveedor.nombre);
    }
  });

  if (current) {
    asientos.push(current);
  }

  return {
    headers,
    malformedRows,
    asientos: asientos.map((asiento) => {
      const referencias2 = [...new Set(asiento.referencias2)];
      const referencia2 = asiento.referencia2 || referencias2[0] || '';

      return {
        ...asiento,
        referencia2,
        factura11: extractLast11Digits(referencia2),
        referencias2,
        proveedor_codigos: [...new Set(asiento.proveedor_codigos)].sort(),
        proveedor_nombres: [...new Set(asiento.proveedor_nombres)].sort(),
        centros_costo_codigos: [...new Set(asiento.centros_costo_codigos)].sort()
      };
    })
  };
};

const parseDiarioDocumentosFile = (filePath) => {
  const resolvedPath = resolveDiarioDocumentosPath(filePath);
  const text = readTextFile(resolvedPath);

  return {
    filePath: resolvedPath,
    ...parseDiarioDocumentosText(text)
  };
};

module.exports = {
  DEFAULT_DIARIO_DOCUMENTOS_PATH,
  extractLast11Digits,
  parseDiarioDocumentosFile,
  parseDiarioDocumentosText,
  resolveDiarioDocumentosPath
};
