const fs = require('fs');
const path = require('path');
const { createError } = require('../utils/errors');
const { ensureSociedadAccess, toPositiveInt } = require('./sociedadAccessService');
const {
  DOCUMENTS_DIR_NAME,
  PAYMENT_TABLES_DIR_NAME,
  getRelativePathVariants
} = require('../utils/documentPaths');
const { runtimeConfig } = require('../config/runtime');

const MAX_TABLA_PAGO_MB = runtimeConfig.maxTablaPagoMb;
const MAX_TABLA_PAGO_BYTES = MAX_TABLA_PAGO_MB * 1024 * 1024;

const sanitizeFileName = (value) => {
  const raw = String(value || '').trim();
  const cleaned = raw.replace(/[^0-9A-Za-z._-]/g, '_');
  return cleaned || 'tabla_pago.pdf';
};

const decodePdfBase64 = (rawBase64) => {
  if (!rawBase64 || typeof rawBase64 !== 'string') {
    throw createError(400, 'Archivo PDF requerido');
  }

  const withoutPrefix = rawBase64.replace(/^data:application\/pdf;base64,/i, '');
  let buffer;

  try {
    buffer = Buffer.from(withoutPrefix, 'base64');
  } catch (error) {
    throw createError(400, 'PDF en base64 invalido');
  }

  if (!buffer || buffer.length === 0) {
    throw createError(400, 'PDF vacio');
  }

  if (buffer.length > MAX_TABLA_PAGO_BYTES) {
    throw createError(400, `El archivo excede el tamano maximo permitido (${MAX_TABLA_PAGO_MB} MB).`);
  }

  const signature = buffer.subarray(0, 4).toString('ascii');
  if (signature !== '%PDF') {
    throw createError(400, 'El archivo no es un PDF valido');
  }

  return buffer;
};

const createTablasPagoUseCases = ({ tablasPagoRepo, proveedoresRepo, baseDir }) => {
  if (!tablasPagoRepo) {
    throw new Error('tablasPagoRepo requerido');
  }
  if (!proveedoresRepo) {
    throw new Error('proveedoresRepo requerido');
  }
  if (!baseDir) {
    throw new Error('baseDir requerido');
  }

  const normalizedBaseDir = path.resolve(baseDir);

  const resolveTablaPagoFilePath = (rutaPdf) => {
    if (!rutaPdf) {
      return null;
    }

    const allowedBase = normalizedBaseDir.endsWith(path.sep)
      ? normalizedBaseDir
      : `${normalizedBaseDir}${path.sep}`;
    const variants = getRelativePathVariants(rutaPdf);
    let fallbackPath = null;

    for (const variant of variants) {
      if (variant.includes('..')) {
        continue;
      }

      const absolutePath = path.resolve(normalizedBaseDir, variant);
      if (absolutePath !== normalizedBaseDir && !absolutePath.startsWith(allowedBase)) {
        continue;
      }

      if (!fallbackPath) {
        fallbackPath = absolutePath;
      }

      if (fs.existsSync(absolutePath)) {
        return absolutePath;
      }
    }

    return fallbackPath;
  };

  const ensureProveedorInSociedad = async ({ proveedorId, sociedadId }) => {
    const normalizedProveedorId = toPositiveInt(proveedorId, 'proveedor_id');
    const proveedor = await proveedoresRepo.getProveedorByIdAndSociedad({
      id: normalizedProveedorId,
      sociedadId
    });
    if (!proveedor) {
      throw createError(400, 'Proveedor invalido para la sociedad seleccionada');
    }
    return proveedor;
  };

  const listTablasPago = async ({ user, sociedadId, proveedorId }) => {
    const normalizedSociedadId = await ensureSociedadAccess({ user, sociedadId });
    let normalizedProveedorId = null;

    if (proveedorId != null && String(proveedorId).trim() !== '') {
      const proveedor = await ensureProveedorInSociedad({
        proveedorId,
        sociedadId: normalizedSociedadId
      });
      normalizedProveedorId = proveedor.id;
    }

    return tablasPagoRepo.listTablasPago({
      sociedadId: normalizedSociedadId,
      proveedorId: normalizedProveedorId
    });
  };

  const createTablaPago = async ({
    user,
    sociedad_id,
    proveedor_id,
    nombre,
    filename,
    file_base64,
    metadata,
    usuario
  }) => {
    const normalizedSociedadId = await ensureSociedadAccess({
      user,
      sociedadId: sociedad_id
    });

    const proveedor = await ensureProveedorInSociedad({
      proveedorId: proveedor_id,
      sociedadId: normalizedSociedadId
    });

    const pdfBuffer = decodePdfBase64(file_base64);
    const safeFileName = sanitizeFileName(filename).replace(/\.pdf$/i, '');
    const finalName = `${Date.now()}_${safeFileName}.pdf`;
    const relativeDir = path.join(
      DOCUMENTS_DIR_NAME,
      PAYMENT_TABLES_DIR_NAME,
      String(normalizedSociedadId),
      String(proveedor.id)
    );
    const fullDir = path.join(normalizedBaseDir, relativeDir);
    const fullPath = path.join(fullDir, finalName);

    fs.mkdirSync(fullDir, { recursive: true });
    fs.writeFileSync(fullPath, pdfBuffer);

    const rutaPdf = path.join(relativeDir, finalName).replace(/\\/g, '/');
    const tablaName = String(nombre || '').trim() || filename;
    const actor = String(usuario || user?.email || '').trim() || null;

    return tablasPagoRepo.createTablaPago({
      sociedadId: normalizedSociedadId,
      proveedorId: proveedor.id,
      nombre: tablaName,
      rutaPdf,
      creadoPor: actor,
      metadata: metadata || null
    });
  };

  const deleteTablaPago = async ({ user, sociedadId, tablaPagoId }) => {
    const normalizedSociedadId = await ensureSociedadAccess({ user, sociedadId });
    const normalizedTablaPagoId = toPositiveInt(tablaPagoId, 'tabla_pago_id');

    const tablaPago = await tablasPagoRepo.getTablaPagoByIdAndSociedad({
      id: normalizedTablaPagoId,
      sociedadId: normalizedSociedadId
    });

    if (!tablaPago) {
      throw createError(404, 'Tabla de pago no encontrada');
    }

    const facturasAsociadas = await tablasPagoRepo.countFacturasAsociadas(normalizedTablaPagoId);
    if (facturasAsociadas > 0) {
      throw createError(409, 'Tabla de pagos asociada a factura.');
    }

    const deleted = await tablasPagoRepo.deleteTablaPagoById(normalizedTablaPagoId);
    if (!deleted) {
      throw createError(404, 'Tabla de pago no encontrada');
    }

    const filePath = resolveTablaPagoFilePath(deleted.ruta_pdf);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.warn('No se pudo eliminar el archivo de tabla de pago:', error.message);
      }
    }

    return {
      id: deleted.id,
      nombre: deleted.nombre,
      eliminado: true
    };
  };

  return {
    listTablasPago,
    createTablaPago,
    deleteTablaPago
  };
};

module.exports = { createTablasPagoUseCases };
