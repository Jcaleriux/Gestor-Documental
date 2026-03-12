const zlib = require('zlib');

const normalizeWhitespace = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim();

const stripDiacritics = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const normalizeIdentification = (value) => String(value || '')
  .replace(/[^0-9A-Za-z]/g, '')
  .toUpperCase();

const normalizeName = (value) => stripDiacritics(value)
  .toUpperCase()
  .replace(/[^0-9A-Z ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const decodePdfLiteral = (literal) => {
  const source = literal.startsWith('(') && literal.endsWith(')')
    ? literal.slice(1, -1)
    : literal;
  let result = '';

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char !== '\\') {
      result += char;
      continue;
    }

    const next = source[i + 1];
    if (next == null) {
      break;
    }

    if (next === '\r') {
      i += 1;
      if (source[i + 1] === '\n') {
        i += 1;
      }
      continue;
    }

    if (next === '\n') {
      i += 1;
      continue;
    }

    if (/[0-7]/.test(next)) {
      let octal = next;
      let j = i + 2;
      while (j < source.length && octal.length < 3 && /[0-7]/.test(source[j])) {
        octal += source[j];
        j += 1;
      }
      result += String.fromCharCode(parseInt(octal, 8));
      i = j - 1;
      continue;
    }

    const escapedMap = {
      n: '\n',
      r: '\r',
      t: '\t',
      b: '\b',
      f: '\f',
      '(': '(',
      ')': ')',
      '\\': '\\'
    };

    result += escapedMap[next] || next;
    i += 1;
  }

  return normalizeWhitespace(result);
};

const extractLiteralStrings = (content) => {
  const matches = content.match(/\((?:\\.|[^\\()])*?\)/g) || [];
  return matches
    .map(decodePdfLiteral)
    .filter((segment) => /[0-9A-Za-z]/.test(segment));
};

const tryInflateBuffer = (buffer) => {
  try {
    return zlib.inflateSync(buffer);
  } catch (error) {
    try {
      return zlib.inflateRawSync(buffer);
    } catch (errorRaw) {
      return null;
    }
  }
};

const extractStreamBlocks = (pdfBuffer) => {
  const binary = pdfBuffer.toString('latin1');
  const blocks = [];
  let cursor = 0;

  while (cursor < binary.length) {
    const streamIndex = binary.indexOf('stream', cursor);
    if (streamIndex === -1) {
      break;
    }

    let dataStart = streamIndex + 'stream'.length;
    if (binary[dataStart] === '\r' && binary[dataStart + 1] === '\n') {
      dataStart += 2;
    } else if (binary[dataStart] === '\n') {
      dataStart += 1;
    }

    const endIndex = binary.indexOf('endstream', dataStart);
    if (endIndex === -1) {
      break;
    }

    const dictStart = binary.lastIndexOf('<<', streamIndex);
    const dictionary = dictStart === -1 ? '' : binary.slice(dictStart, streamIndex);
    let rawStream = binary.slice(dataStart, endIndex);
    rawStream = rawStream.replace(/\r?\n$/, '');

    blocks.push({
      dictionary,
      rawBuffer: Buffer.from(rawStream, 'latin1')
    });

    cursor = endIndex + 'endstream'.length;
  }

  return blocks;
};

const extractPdfTextHeuristic = (pdfBuffer) => {
  const segments = [];
  const streamBlocks = extractStreamBlocks(pdfBuffer);

  streamBlocks.forEach(({ dictionary, rawBuffer }) => {
    let contentBuffer = rawBuffer;
    if (/\/FlateDecode/i.test(dictionary)) {
      contentBuffer = tryInflateBuffer(rawBuffer);
    }
    if (!contentBuffer) {
      return;
    }

    const streamText = contentBuffer.toString('latin1');
    segments.push(...extractLiteralStrings(streamText));
  });

  if (segments.length < 20) {
    segments.push(...extractLiteralStrings(pdfBuffer.toString('latin1')));
  }

  const uniqueSegments = [...new Set(segments
    .map(normalizeWhitespace)
    .filter((segment) => segment.length >= 2))];

  return {
    text: uniqueSegments.join('\n'),
    lines: uniqueSegments
  };
};

const parseDateCandidate = (rawDate) => {
  const parts = String(rawDate || '').split(/[/-]/).map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part <= 0)) {
    return null;
  }

  let year;
  let month;
  let day;

  if (String(parts[0]).length === 4) {
    [year, month, day] = parts;
  } else {
    [day, month, year] = parts;
  }

  if (year < 100) {
    year += 2000;
  }

  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

const parseNumberToken = (token) => {
  const cleaned = String(token || '').replace(/[^0-9,.-]/g, '');
  if (!cleaned) {
    return null;
  }

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  let normalized = cleaned;

  if (lastDot !== -1 && lastComma !== -1) {
    const decimalSeparator = lastDot > lastComma ? '.' : ',';
    const thousandsSeparator = decimalSeparator === '.' ? ',' : '.';
    normalized = normalized
      .replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '')
      .replace(decimalSeparator, '.');
  } else if (lastComma !== -1) {
    if (/,\d{1,2}$/.test(normalized)) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (lastDot !== -1) {
    if (!/\.\d{1,2}$/.test(normalized)) {
      normalized = normalized.replace(/\./g, '');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const resolveNumeroOc = ({ text, lines }) => {
  const patterns = [
    /orden\s*de\s*compra\s*(?:n(?:[°ºo.]|ro|umero)?\s*)?[:#]?\s*([0-9][0-9.,]*)/i,
    /\b(?:oc|orden)\s*[:#-]?\s*([0-9][0-9.,]*)\b/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const digits = String(match[1] || '').replace(/\D/g, '');
    if (digits) {
      return digits;
    }
  }

  const line = lines.find((entry) => /orden\s*de\s*compra/i.test(entry));
  if (!line) {
    return null;
  }
  const matchLine = line.match(/([0-9][0-9.,]*)/);
  if (!matchLine) {
    return null;
  }
  const digits = String(matchLine[1]).replace(/\D/g, '');
  return digits || null;
};

const resolveFecha = ({ text }) => {
  const preferred = text.match(/fecha\s*[:\s]*([0-9]{1,4}[/-][0-9]{1,2}[/-][0-9]{1,4})/i);
  if (preferred) {
    const parsed = parseDateCandidate(preferred[1]);
    if (parsed) {
      return parsed;
    }
  }

  const candidates = text.match(/[0-9]{1,4}[/-][0-9]{1,2}[/-][0-9]{1,4}/g) || [];
  for (const candidate of candidates) {
    const parsed = parseDateCandidate(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const resolveMoneda = ({ text }) => {
  const normalized = stripDiacritics(text).toLowerCase();
  if (/colones|colon|crc|₡/.test(normalized)) {
    return 'CRC';
  }
  if (/dolares|dolar|usd|us\$/.test(normalized)) {
    return 'USD';
  }
  return null;
};

const resolveMonto = ({ text, lines }) => {
  const amountTokens = [];

  const totalLines = lines.filter((line) => /total/i.test(line));
  totalLines.forEach((line) => {
    const matches = line.match(/[0-9][0-9.,]+/g) || [];
    amountTokens.push(...matches);
  });

  if (amountTokens.length === 0) {
    const matches = text.match(/total[\s:₡crcusd$]*([0-9][0-9.,]+)/ig) || [];
    matches.forEach((entry) => {
      const tokenMatch = entry.match(/[0-9][0-9.,]+/);
      if (tokenMatch) {
        amountTokens.push(tokenMatch[0]);
      }
    });
  }

  if (amountTokens.length === 0) {
    amountTokens.push(...(text.match(/[0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{1,2})?/g) || []));
  }

  const parsedNumbers = amountTokens
    .map(parseNumberToken)
    .filter((value) => value != null);

  if (parsedNumbers.length === 0) {
    return null;
  }

  return Math.max(...parsedNumbers);
};

const collectCandidateProviderNames = (lines) => {
  const candidates = [];

  lines.forEach((line, index) => {
    if (!/proveedor/i.test(line)) {
      return;
    }

    const inline = line.replace(/.*proveedor\s*[:\-]?\s*/i, '').trim();
    if (inline) {
      candidates.push(inline);
    }

    const next1 = lines[index + 1];
    const next2 = lines[index + 2];
    if (next1) candidates.push(next1);
    if (next2 && !/cedula|juridica|telefono|atencion|direccion/i.test(next2)) {
      candidates.push(next2);
    }
  });

  return [...new Set(candidates
    .map((value) => value.replace(/\([^)]*\)/g, ' ').trim())
    .map(normalizeWhitespace)
    .filter((value) => value.length >= 3))];
};

const scoreNameSimilarity = (candidate, providerName) => {
  const candidateNorm = normalizeName(candidate);
  const providerNorm = normalizeName(providerName);

  if (!candidateNorm || !providerNorm) {
    return 0;
  }

  if (candidateNorm === providerNorm) {
    return 1;
  }

  if (providerNorm.includes(candidateNorm) || candidateNorm.includes(providerNorm)) {
    return 0.85;
  }

  const candidateTokens = new Set(candidateNorm.split(' ').filter((token) => token.length >= 3));
  const providerTokens = new Set(providerNorm.split(' ').filter((token) => token.length >= 3));

  if (candidateTokens.size === 0 || providerTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  candidateTokens.forEach((token) => {
    if (providerTokens.has(token)) {
      intersection += 1;
    }
  });

  return intersection / Math.max(candidateTokens.size, providerTokens.size);
};

const resolveProveedor = ({ text, lines, proveedores }) => {
  const providers = Array.isArray(proveedores) ? proveedores : [];
  if (providers.length === 0) {
    return { proveedor: null, matchType: null, confidence: 0 };
  }

  const providersById = new Map();
  providers.forEach((provider) => {
    const normalized = normalizeIdentification(
      provider.identificacion_numero_normalizado || provider.identificacion_numero
    );
    if (normalized) {
      providersById.set(normalized, provider);
    }
  });

  const idCandidates = [];
  const idRegexes = [
    /cedula\s*juridica\s*[:\s]*([0-9][0-9 .-]{6,})/ig,
    /identificacion\s*[:\s]*([0-9][0-9 .-]{6,})/ig,
    /\b[0-9]-[0-9]{3}-[0-9]{6,}\b/g
  ];

  idRegexes.forEach((regex) => {
    let match;
    while ((match = regex.exec(stripDiacritics(text))) !== null) {
      const raw = match[1] || match[0] || '';
      const normalized = normalizeIdentification(raw);
      if (normalized) {
        idCandidates.push(normalized);
      }
    }
  });

  for (const candidateId of idCandidates) {
    const provider = providersById.get(candidateId);
    if (provider) {
      return {
        proveedor: provider,
        matchType: 'identificacion',
        confidence: 1
      };
    }
  }

  const nameCandidates = collectCandidateProviderNames(lines);
  let bestMatch = null;
  let bestScore = 0;

  nameCandidates.forEach((candidate) => {
    providers.forEach((provider) => {
      const score = scoreNameSimilarity(candidate, provider.nombre || provider.nombre_comercial || '');
      if (score > bestScore) {
        bestScore = score;
        bestMatch = provider;
      }
    });
  });

  if (bestMatch && bestScore >= 0.45) {
    return {
      proveedor: bestMatch,
      matchType: 'nombre',
      confidence: Number(bestScore.toFixed(3))
    };
  }

  return {
    proveedor: null,
    matchType: null,
    confidence: 0
  };
};

const extractOrdenCompraDataFromPdf = ({ pdfBuffer, proveedores }) => {
  const { text, lines } = extractPdfTextHeuristic(pdfBuffer);
  const numeroOc = resolveNumeroOc({ text, lines });
  const fecha = resolveFecha({ text });
  const moneda = resolveMoneda({ text });
  const monto = resolveMonto({ text, lines });
  const proveedorMatch = resolveProveedor({ text, lines, proveedores });

  return {
    numeroOc,
    fecha,
    moneda,
    monto,
    proveedor: proveedorMatch.proveedor,
    proveedorMatchType: proveedorMatch.matchType,
    proveedorMatchConfidence: proveedorMatch.confidence
  };
};

module.exports = {
  extractOrdenCompraDataFromPdf
};
