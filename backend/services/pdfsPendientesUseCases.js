const fs = require('fs/promises');
const path = require('path');
const { runtimeConfig } = require('../config/runtime');
const {
  DOCUMENTS_DIR_NAME,
  toCurrentRelativePath,
  resolveDocumentPaths
} = require('../utils/documentPaths');
const { createError } = require('../utils/errors');

const PENDING_PDFS_DIR_NAME = 'pdfs_pendientes';
const PENDING_REPORT_SUFFIX = '.pdfs_pendientes.json';

const toPosix = (value) => String(value || '').replace(/\\/g, '/');

const normalizeStoredPath = (rawPath) => toCurrentRelativePath(toPosix(rawPath).trim());

const relativeFromBase = (baseDir, absolutePath) => toPosix(path.relative(baseDir, absolutePath));

const normalizeIdentification = (value) => String(value || '').replace(/\D/g, '');

const unique = (values) => [...new Set(values.filter(Boolean))];

const isPathInside = (parentPath, childPath) => {
  const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const pathExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const statOrNull = async (targetPath) => {
  try {
    return await fs.stat(targetPath);
  } catch {
    return null;
  }
};

const readJsonFile = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const writeJsonFile = async (filePath, payload) => {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const normalizeIngestionId = (ingestionId) => {
  const value = String(ingestionId || '').trim();
  if (!value || value.includes('/') || value.includes('\\') || value.includes('..')) {
    throw createError(400, 'Lote de importacion invalido.');
  }
  return value;
};

const resolveStoredPath = ({ baseDir, rawPath }) => {
  const relativePath = normalizeStoredPath(rawPath);
  if (!relativePath || relativePath.includes('\0')) {
    throw createError(400, 'Ruta de documento invalida.');
  }

  const resolvedPath = path.resolve(baseDir, relativePath);
  if (!isPathInside(baseDir, resolvedPath)) {
    throw createError(400, 'Ruta de documento fuera del almacenamiento permitido.');
  }

  return resolvedPath;
};

const buildUniqueDestinationPath = async (targetDir, filename) => {
  const parsed = path.parse(filename || 'pdf_pendiente.pdf');
  const baseName = parsed.name || 'pdf_pendiente';
  const extension = parsed.ext || '.pdf';
  let candidate = path.join(targetDir, `${baseName}${extension}`);
  let counter = 2;

  while (await pathExists(candidate)) {
    candidate = path.join(targetDir, `${baseName}_asociado_${counter}${extension}`);
    counter += 1;
  }

  return candidate;
};

const createReportResolver = ({ baseDir }) => {
  const documentPaths = resolveDocumentPaths(baseDir);
  const pendingRoot = path.join(documentPaths.facturasProcesadasDir, PENDING_PDFS_DIR_NAME);

  const resolvePendingPdfPath = (rawPath) => {
    const resolvedPath = resolveStoredPath({ baseDir, rawPath });
    if (!isPathInside(pendingRoot, resolvedPath)) {
      throw createError(400, 'El PDF seleccionado no pertenece a pendientes.');
    }
    return resolvedPath;
  };

  const findReportPath = async (ingestionId) => {
    const safeIngestionId = normalizeIngestionId(ingestionId);
    const pendingDir = path.join(pendingRoot, safeIngestionId);

    if (!isPathInside(pendingRoot, pendingDir)) {
      throw createError(400, 'Lote de importacion invalido.');
    }

    const expectedPath = path.join(pendingDir, `${safeIngestionId}${PENDING_REPORT_SUFFIX}`);
    if (await pathExists(expectedPath)) {
      return expectedPath;
    }

    let entries = [];
    try {
      entries = await fs.readdir(pendingDir);
    } catch {
      throw createError(404, 'No se encontro el lote de PDFs pendientes.');
    }

    const reportFile = entries.find((entry) => entry.endsWith(PENDING_REPORT_SUFFIX));
    if (!reportFile) {
      throw createError(404, 'No se encontro el reporte de PDFs pendientes.');
    }

    return path.join(pendingDir, reportFile);
  };

  return {
    documentPaths,
    pendingRoot,
    findReportPath,
    resolvePendingPdfPath
  };
};

const normalizeReport = (report, reportPath) => ({
  ...(report && typeof report === 'object' ? report : {}),
  ingestion_id: report?.ingestion_id || path.basename(path.dirname(reportPath)),
  target_dirs: Array.isArray(report?.target_dirs) ? report.target_dirs : [],
  pdfs: Array.isArray(report?.pdfs) ? report.pdfs : [],
  resueltos: Array.isArray(report?.resueltos) ? report.resueltos : []
});

const findPendingPdfEntry = (report, pdfRuta) => {
  const normalizedRuta = normalizeStoredPath(pdfRuta);
  return report.pdfs.find((pdf) => normalizeStoredPath(pdf?.ruta) === normalizedRuta) || null;
};

const buildPendingItem = async ({ baseDir, reportPath, report, pdf }) => {
  const absolutePath = resolveStoredPath({ baseDir, rawPath: pdf.ruta });
  const fileStat = await statOrNull(absolutePath);

  return {
    ingestion_id: report.ingestion_id,
    report_path: relativeFromBase(baseDir, reportPath),
    savedAs: pdf.savedAs || path.basename(pdf.ruta || ''),
    originalName: pdf.originalName || pdf.savedAs || path.basename(pdf.ruta || ''),
    ruta: normalizeStoredPath(pdf.ruta),
    motivo: pdf.motivo || report.motivo || '',
    target_dirs: report.target_dirs,
    exists: Boolean(fileStat),
    sizeBytes: fileStat?.size || 0,
    lastModified: fileStat?.mtime ? fileStat.mtime.toISOString() : null
  };
};

const buildPendingPdfSearchTerms = (item, sociedad) => {
  const sociedadCedula = normalizeIdentification(sociedad?.cedula_juridica);
  const source = [
    item?.originalName,
    item?.savedAs,
    item?.ruta,
  ].filter(Boolean).join(' ');
  const longNumbers = String(source).match(/\d{10,50}/g) || [];
  const filenameStem = String(item?.originalName || item?.savedAs || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_.-]+/g, ' ')
    .trim();

  return unique([
    ...longNumbers
      .map((value) => normalizeIdentification(value))
      .filter((value) => value && value !== sociedadCedula),
    filenameStem.length >= 8 ? filenameStem : '',
  ]).slice(0, 4);
};

const targetDirsMatchSociedad = (targetDirs, sociedad) => {
  const sociedadCedula = normalizeIdentification(sociedad?.cedula_juridica);
  if (!sociedadCedula) {
    return false;
  }

  return (targetDirs || []).some((targetDir) => {
    const normalizedDir = normalizeIdentification(targetDir);
    return normalizedDir.includes(sociedadCedula);
  });
};

const pendingItemMatchesSociedad = async ({ item, sociedad, repo }) => {
  if (!sociedad) {
    return true;
  }

  if (targetDirsMatchSociedad(item.target_dirs, sociedad)) {
    return true;
  }

  if (typeof repo.searchFacturaCandidates !== 'function') {
    return false;
  }

  const terms = buildPendingPdfSearchTerms(item, sociedad);
  for (const term of terms) {
    const candidates = await repo.searchFacturaCandidates({
      sociedadId: sociedad.id,
      query: term,
      limit: 1
    });

    if (Array.isArray(candidates) && candidates.length > 0) {
      return true;
    }
  }

  return false;
};

const resolveTargetDirForFactura = async ({ baseDir, documentsRootDir, factura }) => {
  const referencePath = factura?.ruta_xml || factura?.ruta_pdf;
  if (!referencePath) {
    throw createError(409, 'La factura destino no tiene ruta XML o PDF para ubicar la carpeta.');
  }

  const absoluteReferencePath = resolveStoredPath({ baseDir, rawPath: referencePath });
  if (!isPathInside(documentsRootDir, absoluteReferencePath)) {
    throw createError(400, 'La ruta de la factura destino no es valida.');
  }

  const targetDir = path.dirname(absoluteReferencePath);
  await fs.mkdir(targetDir, { recursive: true });
  return targetDir;
};

const markReportPdfResolved = ({
  report,
  pdfEntry,
  factura,
  rutaDestino,
  usuario
}) => {
  const normalizedRuta = normalizeStoredPath(pdfEntry.ruta);
  const remainingPdfs = report.pdfs.filter((pdf) => normalizeStoredPath(pdf?.ruta) !== normalizedRuta);

  return {
    ...report,
    pdfs: remainingPdfs,
    resueltos: [
      ...report.resueltos,
      {
        ...pdfEntry,
        ruta_origen: normalizedRuta,
        ruta_destino: rutaDestino,
        factura_id: factura.id,
        factura_clave: factura.clave || null,
        factura_consecutivo: factura.consecutivo || null,
        sociedad_id: factura.sociedad_id || null,
        usuario: usuario || null,
        resuelto_en: new Date().toISOString()
      }
    ]
  };
};

const createPdfsPendientesUseCases = ({
  repo,
  baseDir = runtimeConfig.storageBaseDir,
  runInTransaction = async (handler) => handler()
} = {}) => {
  if (!repo) {
    throw new Error('repo requerido');
  }

  const resolvedBaseDir = path.resolve(baseDir);
  const {
    documentPaths,
    pendingRoot,
    findReportPath,
    resolvePendingPdfPath
  } = createReportResolver({ baseDir: resolvedBaseDir });

  const listPendingPdfs = async ({ sociedadId } = {}) => {
    if (!await pathExists(pendingRoot)) {
      return {
        items: [],
        summary: { totalPdfs: 0, totalLotes: 0 }
      };
    }

    const sociedad = sociedadId && typeof repo.getSociedadById === 'function'
      ? await repo.getSociedadById(Number(sociedadId))
      : null;
    if (sociedadId && !sociedad) {
      return {
        items: [],
        summary: { totalPdfs: 0, totalLotes: 0 }
      };
    }

    const loteEntries = await fs.readdir(pendingRoot, { withFileTypes: true });
    const items = [];

    for (const loteEntry of loteEntries) {
      if (!loteEntry.isDirectory()) {
        continue;
      }

      const loteDir = path.join(pendingRoot, loteEntry.name);
      const reportFiles = (await fs.readdir(loteDir))
        .filter((entry) => entry.endsWith(PENDING_REPORT_SUFFIX));

      for (const reportFile of reportFiles) {
        const reportPath = path.join(loteDir, reportFile);
        const report = normalizeReport(await readJsonFile(reportPath), reportPath);

        for (const pdf of report.pdfs) {
          const item = await buildPendingItem({
            baseDir: resolvedBaseDir,
            reportPath,
            report,
            pdf
          });

          if (await pendingItemMatchesSociedad({ item, sociedad, repo })) {
            items.push(item);
          }
        }
      }
    }

    items.sort((a, b) => String(b.lastModified || '').localeCompare(String(a.lastModified || '')));

    return {
      items,
      summary: {
        totalPdfs: items.length,
        totalLotes: new Set(items.map((item) => item.ingestion_id)).size
      }
    };
  };

  const searchFacturaCandidates = ({ sociedadId, query, limit } = {}) => (
    repo.searchFacturaCandidates({
      sociedadId: sociedadId ? Number(sociedadId) : undefined,
      query,
      limit
    })
  );

  const assignPendingPdf = async ({
    ingestionId,
    pdfRuta,
    facturaId,
    sociedadId,
    overwrite = false,
    usuario
  } = {}) => {
    let movedFile = null;
    let reportSnapshot = null;
    let reportPathForRollback = null;

    try {
      return await runInTransaction(async (client) => {
        const reportPath = await findReportPath(ingestionId);
        const report = normalizeReport(await readJsonFile(reportPath), reportPath);
        const pdfEntry = findPendingPdfEntry(report, pdfRuta);

        if (!pdfEntry) {
          throw createError(404, 'El PDF pendiente ya no existe en el reporte.');
        }

        const sourcePath = resolvePendingPdfPath(pdfEntry.ruta);
        if (!await pathExists(sourcePath)) {
          throw createError(404, 'El archivo PDF pendiente no existe en disco.');
        }

        const factura = await repo.getFacturaForPdfAssignment(Number(facturaId), client);
        if (!factura) {
          throw createError(404, 'Factura destino no encontrada.');
        }

        if (sociedadId && Number(factura.sociedad_id) !== Number(sociedadId)) {
          throw createError(400, 'La factura destino no pertenece a la sociedad seleccionada.');
        }

        if (factura.ruta_pdf && !overwrite) {
          throw createError(409, 'La factura destino ya tiene PDF. Confirma el reemplazo de la ruta.', {
            requiresOverwrite: true,
            currentRutaPdf: factura.ruta_pdf
          });
        }

        const targetDir = await resolveTargetDirForFactura({
          baseDir: resolvedBaseDir,
          documentsRootDir: path.join(resolvedBaseDir, DOCUMENTS_DIR_NAME),
          factura
        });
        const destinationPath = await buildUniqueDestinationPath(
          targetDir,
          pdfEntry.savedAs || path.basename(sourcePath)
        );
        const rutaDestino = relativeFromBase(resolvedBaseDir, destinationPath);

        reportPathForRollback = reportPath;
        reportSnapshot = JSON.stringify(report, null, 2);

        await fs.rename(sourcePath, destinationPath);
        movedFile = { sourcePath, destinationPath };

        const updatedFactura = await repo.updateFacturaRutaPdf({
          facturaId: factura.id,
          rutaPdf: rutaDestino
        }, client);

        const nextReport = markReportPdfResolved({
          report,
          pdfEntry,
          factura,
          rutaDestino,
          usuario
        });
        await writeJsonFile(reportPath, nextReport);

        return {
          pdf: {
            ...pdfEntry,
            ruta_destino: rutaDestino
          },
          factura: {
            ...factura,
            ...(updatedFactura || {}),
            ruta_pdf: rutaDestino
          },
          pending: {
            remaining: nextReport.pdfs.length
          }
        };
      });
    } catch (error) {
      if (movedFile && await pathExists(movedFile.destinationPath) && !await pathExists(movedFile.sourcePath)) {
        try {
          await fs.rename(movedFile.destinationPath, movedFile.sourcePath);
        } catch {
          // Preserve the original error; the operator can reconcile the file manually if rollback fails.
        }
      }

      if (reportSnapshot && reportPathForRollback) {
        try {
          await fs.writeFile(reportPathForRollback, `${reportSnapshot}\n`, 'utf8');
        } catch {
          // Preserve the original error.
        }
      }

      throw error;
    }
  };

  return {
    listPendingPdfs,
    searchFacturaCandidates,
    assignPendingPdf
  };
};

module.exports = {
  PENDING_PDFS_DIR_NAME,
  PENDING_REPORT_SUFFIX,
  createPdfsPendientesUseCases
};
