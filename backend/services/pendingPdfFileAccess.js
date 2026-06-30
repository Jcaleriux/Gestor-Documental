const fs = require('fs/promises');
const path = require('path');
const { PERMISSIONS } = require('../domain/permissions');
const { permissionsService } = require('./permissionsService');
const usuariosSociedadesRepo = require('../repositories/usuariosSociedadesRepository');
const {
  resolveDocumentPaths,
  toCurrentRelativePath
} = require('../utils/documentPaths');

const PENDING_PDFS_DIR_NAME = 'pdfs_pendientes';
const PENDING_REPORT_SUFFIX = '.pdfs_pendientes.json';

const toPosix = (value) => String(value || '').replace(/\\/g, '/');
const normalizeIdentification = (value) => String(value || '').replace(/\D/g, '');

const tryDecode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
};

const normalizeStoredPath = (rawPath) => toCurrentRelativePath(toPosix(tryDecode(rawPath)).trim());

const isPathInside = (parentPath, childPath) => {
  const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const readReportForPendingPath = async ({ baseDir, normalizedPath }) => {
  const documentPaths = resolveDocumentPaths(baseDir);
  const pendingRoot = path.join(documentPaths.facturasProcesadasDir, PENDING_PDFS_DIR_NAME);
  const absolutePath = path.resolve(baseDir, normalizedPath);

  if (!isPathInside(pendingRoot, absolutePath)) {
    return null;
  }

  const pendingDir = path.dirname(absolutePath);
  let entries = [];
  try {
    entries = await fs.readdir(pendingDir);
  } catch (error) {
    return null;
  }

  const reportFile = entries.find((entry) => entry.endsWith(PENDING_REPORT_SUFFIX));
  if (!reportFile) {
    return null;
  }

  try {
    return JSON.parse(await fs.readFile(path.join(pendingDir, reportFile), 'utf8'));
  } catch (error) {
    return null;
  }
};

const reportContainsPendingPath = ({ report, normalizedPath }) => (
  Array.isArray(report?.pdfs)
  && report.pdfs.some((pdf) => normalizeStoredPath(pdf?.ruta) === normalizedPath)
);

const reportTargetsSociedad = ({ report, sociedad }) => {
  const cedula = normalizeIdentification(sociedad?.cedula_juridica);
  if (!cedula) {
    return false;
  }

  return (report?.target_dirs || []).some((targetDir) => (
    normalizeIdentification(targetDir).includes(cedula)
  ));
};

const resolvePendingPdfAccess = async ({ user, rawPath, baseDir }) => {
  if (!baseDir) {
    return null;
  }

  const normalizedPath = normalizeStoredPath(rawPath);
  if (!normalizedPath || !normalizedPath.includes(`/${PENDING_PDFS_DIR_NAME}/`)) {
    return null;
  }

  const report = await readReportForPendingPath({ baseDir, normalizedPath });
  if (!report || !reportContainsPendingPath({ report, normalizedPath })) {
    return null;
  }

  const permissions = permissionsService.normalizePermissionList(user?.permissions);
  if (
    permissions.includes(PERMISSIONS.ACCESO_TOTAL)
    || permissions.includes(PERMISSIONS.SOCIEDADES_TODAS)
  ) {
    return { resource_type: 'pending_pdf', resource_id: report.ingestion_id || null, sociedad_id: null };
  }

  if (permissions.includes(PERMISSIONS.SOCIEDADES_ASIGNADAS)) {
    const sociedades = await usuariosSociedadesRepo.listSociedadesByUsuarioId(user?.id);
    const matched = sociedades.find((sociedad) => reportTargetsSociedad({ report, sociedad }));
    if (matched) {
      return { resource_type: 'pending_pdf', resource_id: report.ingestion_id || null, sociedad_id: matched.id };
    }
  }

  return null;
};

module.exports = {
  PENDING_PDFS_DIR_NAME,
  PENDING_REPORT_SUFFIX,
  resolvePendingPdfAccess
};
