const fs = require('fs');
const path = require('path');
const { createError } = require('../utils/errors');
const { ensureSociedadAccess, toPositiveInt } = require('./sociedadAccessService');
const rolesRepo = require('../repositories/rolesRepository');
const { extractOrdenCompraDataFromPdf } = require('./ordenesCompraAutoImportParser');
const {
  DOCUMENTS_DIR_NAME,
  PURCHASE_ORDERS_DIR_NAME,
  getRelativePathVariants
} = require('../utils/documentPaths');
const { runtimeConfig } = require('../config/runtime');

const MANUAL_STATE_MIN_HIERARCHY = 70;
const ESTADOS_VALIDOS = new Set(['abierta', 'cerrada']);
const MAX_ORDEN_COMPRA_MB = runtimeConfig.maxOrdenCompraMb;
const MAX_ORDEN_COMPRA_BYTES = MAX_ORDEN_COMPRA_MB * 1024 * 1024;

const sanitizeFileName = (value) => {
  const raw = String(value || '').trim();
  const cleaned = raw.replace(/[^0-9A-Za-z._-]/g, '_');
  return cleaned || 'orden_compra.pdf';
};

const sanitizeOrderNumber = (value) => String(value || '').replace(/\D/g, '');

const normalizeEstado = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!ESTADOS_VALIDOS.has(normalized)) {
    throw createError(400, 'estado invalido');
  }
  return normalized;
};

const normalizeMoneda = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{2,10}$/.test(normalized)) {
    throw createError(400, 'moneda invalida');
  }
  return normalized;
};

const normalizeFecha = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createError(400, 'fecha invalida');
  }
  return date.toISOString().slice(0, 10);
};

const normalizeMonto = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createError(400, 'monto invalido');
  }
  return parsed;
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

  if (buffer.length > MAX_ORDEN_COMPRA_BYTES) {
    throw createError(400, `El archivo excede el tamano maximo permitido (${MAX_ORDEN_COMPRA_MB} MB).`);
  }

  const signature = buffer.subarray(0, 4).toString('ascii');
  if (signature !== '%PDF') {
    throw createError(400, 'El archivo no es un PDF valido');
  }

  return buffer;
};

const withSchemaGuard = async (handler) => {
  try {
    return await handler();
  } catch (error) {
    if (error?.code === '42P01' || error?.code === '42703') {
      throw createError(500, 'Falta la migracion de ordenes de compra. Ejecute: npm run db:migrate:ordenes-compra');
    }
    throw error;
  }
};

const createOrdenesCompraUseCases = ({
  ordenesCompraRepo,
  proveedoresRepo,
  baseDir
}) => {
  if (!ordenesCompraRepo) {
    throw new Error('ordenesCompraRepo requerido');
  }
  if (!proveedoresRepo) {
    throw new Error('proveedoresRepo requerido');
  }
  if (!baseDir) {
    throw new Error('baseDir requerido');
  }

  const normalizedBaseDir = path.resolve(baseDir);

  const saveOrdenCompraPdf = ({
    sociedadId,
    proveedorId,
    pdfBuffer,
    preferredBaseName,
    fallbackFilename
  }) => {
    const rawBaseName = String(preferredBaseName || '').trim()
      || String(fallbackFilename || '').trim()
      || 'orden_compra';
    const safeBaseName = sanitizeFileName(rawBaseName).replace(/\.pdf$/i, '') || 'orden_compra';

    const relativeDir = path.join(
      DOCUMENTS_DIR_NAME,
      PURCHASE_ORDERS_DIR_NAME,
      String(sociedadId),
      String(proveedorId)
    );
    const fullDir = path.join(normalizedBaseDir, relativeDir);
    fs.mkdirSync(fullDir, { recursive: true });

    let candidateBaseName = safeBaseName;
    let sequence = 2;
    let fullPath = path.join(fullDir, `${candidateBaseName}.pdf`);
    while (fs.existsSync(fullPath)) {
      candidateBaseName = `${safeBaseName}_${sequence}`;
      sequence += 1;
      fullPath = path.join(fullDir, `${candidateBaseName}.pdf`);
    }

    fs.writeFileSync(fullPath, pdfBuffer);

    return path.join(relativeDir, `${candidateBaseName}.pdf`).replace(/\\/g, '/');
  };

  const resolveOrdenCompraFilePath = (rutaPdf) => {
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

  const ensureManualStateRole = async ({ user }) => {
    const role = await rolesRepo.getRoleById(user?.rol);
    const roleHierarchy = Number(role?.nivel_jerarquia || 0);

    if (!role || roleHierarchy < MANUAL_STATE_MIN_HIERARCHY) {
      throw createError(403, 'Solo contabilidad jefe o superior puede cambiar estado manualmente');
    }
  };

  const listOrdenesCompra = async ({ user, sociedadId, proveedorId, estado }) => {
    const normalizedSociedadId = await ensureSociedadAccess({ user, sociedadId });
    let normalizedProveedorId = null;
    let normalizedEstado = null;

    if (proveedorId != null && String(proveedorId).trim() !== '') {
      const proveedor = await ensureProveedorInSociedad({
        proveedorId,
        sociedadId: normalizedSociedadId
      });
      normalizedProveedorId = proveedor.id;
    }

    if (estado != null && String(estado).trim() !== '') {
      normalizedEstado = normalizeEstado(estado);
    }

    return withSchemaGuard(() => ordenesCompraRepo.listOrdenesCompra({
      sociedadId: normalizedSociedadId,
      proveedorId: normalizedProveedorId,
      estado: normalizedEstado
    }));
  };

  const createOrdenCompra = async ({
    user,
    sociedad_id,
    proveedor_id,
    numero_oc,
    nombre,
    monto,
    moneda,
    fecha,
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

    const normalizedMonto = normalizeMonto(monto);
    const normalizedMoneda = normalizeMoneda(moneda);
    const normalizedFecha = normalizeFecha(fecha);
    const pdfBuffer = decodePdfBase64(file_base64);
    const orderNumber = sanitizeOrderNumber(numero_oc) || String(nombre || '').trim() || sanitizeOrderNumber(filename);
    const normalizedOrderNumber = sanitizeOrderNumber(orderNumber);
    if (!normalizedOrderNumber) {
      throw createError(400, 'numero_oc invalido. Use solo numeros');
    }
    const rutaPdf = saveOrdenCompraPdf({
      sociedadId: normalizedSociedadId,
      proveedorId: proveedor.id,
      pdfBuffer,
      preferredBaseName: normalizedOrderNumber,
      fallbackFilename: filename
    });
    const actor = String(usuario || user?.email || '').trim() || null;

    return withSchemaGuard(() => ordenesCompraRepo.createOrdenCompra({
      sociedadId: normalizedSociedadId,
      proveedorId: proveedor.id,
      nombre: normalizedOrderNumber,
      monto: normalizedMonto,
      moneda: normalizedMoneda,
      fecha: normalizedFecha,
      rutaPdf,
      creadoPor: actor,
      metadata: metadata || null
    }));
  };

  const autoImportOrdenCompra = async ({
    user,
    sociedad_id,
    filename,
    file_base64,
    metadata,
    usuario
  }) => {
    const normalizedSociedadId = await ensureSociedadAccess({
      user,
      sociedadId: sociedad_id
    });

    const pdfBuffer = decodePdfBase64(file_base64);
    const proveedores = await withSchemaGuard(() => proveedoresRepo.listProveedoresBySociedad(normalizedSociedadId));
    const extracted = extractOrdenCompraDataFromPdf({
      pdfBuffer,
      proveedores
    });

    const numeroOc = sanitizeOrderNumber(extracted.numeroOc);
    if (!numeroOc) {
      throw createError(422, `No se pudo extraer numero de OC en "${filename}"`);
    }

    if (!extracted.proveedor?.id) {
      throw createError(422, `No se pudo identificar proveedor en "${filename}"`);
    }

    const monto = normalizeMonto(extracted.monto);
    const moneda = normalizeMoneda(extracted.moneda);
    const fecha = normalizeFecha(extracted.fecha);
    const rutaPdf = saveOrdenCompraPdf({
      sociedadId: normalizedSociedadId,
      proveedorId: extracted.proveedor.id,
      pdfBuffer,
      preferredBaseName: numeroOc,
      fallbackFilename: filename
    });
    const actor = String(usuario || user?.email || '').trim() || null;

    const orden = await withSchemaGuard(() => ordenesCompraRepo.createOrdenCompra({
      sociedadId: normalizedSociedadId,
      proveedorId: extracted.proveedor.id,
      nombre: numeroOc,
      monto,
      moneda,
      fecha,
      rutaPdf,
      creadoPor: actor,
      metadata: metadata || null
    }));

    return {
      orden,
      extraido: {
        proveedor_id: extracted.proveedor.id,
        proveedor_nombre: extracted.proveedor.nombre,
        proveedor_match_type: extracted.proveedorMatchType,
        proveedor_match_confidence: extracted.proveedorMatchConfidence,
        numero_oc: numeroOc,
        monto,
        moneda,
        fecha
      }
    };
  };

  const deleteOrdenCompra = async ({ user, sociedadId, ordenCompraId }) => {
    const normalizedSociedadId = await ensureSociedadAccess({ user, sociedadId });
    const normalizedOrdenCompraId = toPositiveInt(ordenCompraId, 'orden_compra_id');

    const ordenCompra = await withSchemaGuard(() => ordenesCompraRepo.getOrdenCompraByIdAndSociedad({
      id: normalizedOrdenCompraId,
      sociedadId: normalizedSociedadId
    }));

    if (!ordenCompra) {
      throw createError(404, 'Orden de compra no encontrada');
    }

    const facturasAsociadas = await withSchemaGuard(() => ordenesCompraRepo.countFacturasAsociadas(normalizedOrdenCompraId));
    if (facturasAsociadas > 0) {
      throw createError(409, 'Orden de compra asociada a factura.');
    }

    const deleted = await withSchemaGuard(() => ordenesCompraRepo.deleteOrdenCompraById(normalizedOrdenCompraId));
    if (!deleted) {
      throw createError(404, 'Orden de compra no encontrada');
    }

    const filePath = resolveOrdenCompraFilePath(deleted.ruta_pdf);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.warn('No se pudo eliminar el archivo de orden de compra:', error.message);
      }
    }

    return {
      id: deleted.id,
      nombre: deleted.nombre,
      eliminado: true
    };
  };

  const updateEstadoManual = async ({ user, sociedadId, ordenCompraId, estado }) => {
    const normalizedSociedadId = await ensureSociedadAccess({ user, sociedadId });
    const normalizedOrdenCompraId = toPositiveInt(ordenCompraId, 'orden_compra_id');
    const normalizedEstado = normalizeEstado(estado);

    await ensureManualStateRole({ user });

    const ordenCompra = await withSchemaGuard(() => ordenesCompraRepo.getOrdenCompraByIdAndSociedad({
      id: normalizedOrdenCompraId,
      sociedadId: normalizedSociedadId
    }));

    if (!ordenCompra) {
      throw createError(404, 'Orden de compra no encontrada');
    }

    return withSchemaGuard(() => ordenesCompraRepo.updateOrdenCompraEstado({
      id: normalizedOrdenCompraId,
      estado: normalizedEstado
    }));
  };

  return {
    listOrdenesCompra,
    createOrdenCompra,
    autoImportOrdenCompra,
    deleteOrdenCompra,
    updateEstadoManual
  };
};

module.exports = { createOrdenesCompraUseCases };
