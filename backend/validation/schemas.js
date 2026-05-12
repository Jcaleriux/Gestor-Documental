const Joi = require('joi');

const createComentarioSchema = Joi.object({
  usuario: Joi.string().trim().allow('', null).optional(),
  texto: Joi.string().trim().required()
});

const createAuditoriaSchema = Joi.object({
  accion: Joi.string().trim().required(),
  usuario: Joi.string().trim().required(),
  detalles: Joi.any(),
  ip_address: Joi.string().trim().optional()
});

const createEstadoSchema = Joi.object({
  dominio: Joi.string().trim().valid('contabilizacion', 'workflow_pago', 'mixto').optional(),
  estado_anterior: Joi.string().allow('', null),
  estado_nuevo: Joi.string().trim().required(),
  usuario: Joi.string().trim().required(),
  motivo: Joi.string().allow('', null)
});

const updateEstadoSchema = Joi.object({
  estado: Joi.string().trim().required()
});

const createVersionSchema = Joi.object({
  usuario: Joi.string().trim().required(),
  cambios: Joi.string().trim().required(),
  ruta_archivo: Joi.string().allow('', null)
});

const tesoreriaActionSchema = Joi.object({
  accion: Joi.string().trim().required(),
  destino: Joi.string().trim().optional(),
  motivo: Joi.string().allow('', null),
  usuario: Joi.string().allow('', null)
});

const cambiarEstadoSchema = Joi.object({
  estado: Joi.string().trim().required(),
  usuario: Joi.string().allow('', null),
  motivo: Joi.string().allow('', null),
  force: Joi.boolean().optional(),
  pagos_documentos: Joi.array().items(
    Joi.object({
      factura_id: Joi.number().integer().positive().required(),
      monto_pago: Joi.number().positive().required()
    })
  ).optional()
});

const decisionDocumentoSchema = Joi.object({
  etapa: Joi.string().trim().required(),
  decision: Joi.string().trim().required(),
  motivo: Joi.string().allow('', null),
  usuario: Joi.string().allow('', null)
});

const crearTramiteSchema = Joi.object({
  sociedad_id: Joi.any(),
  factura_ids: Joi.array().items(Joi.number().integer().positive()).default([]),
  retencion_factura_ids: Joi.array().items(Joi.number().integer().positive()).default([]),
  usuario: Joi.string().allow('', null)
}).custom((value, helpers) => {
  const facturas = Array.isArray(value.factura_ids) ? value.factura_ids : [];
  const retenciones = Array.isArray(value.retencion_factura_ids) ? value.retencion_factura_ids : [];
  if (facturas.length === 0 && retenciones.length === 0) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'tramite selection validation').messages({
  'any.invalid': 'Seleccione al menos una factura o una retencion'
});

const rechazoTesoreriaSchema = Joi.object({
  motivo: Joi.string().allow('', null),
  usuario: Joi.string().allow('', null)
});

const uploadTramiteCaratulasSchema = Joi.object({
  filename: Joi.string().trim().max(255).required(),
  file_base64: Joi.string().trim().required(),
  usuario: Joi.string().allow('', null)
});

const resolveTramiteCaratulasSchema = Joi.object({
  group_key: Joi.string().trim().required(),
  provider_factura_id: Joi.number().integer().positive().allow(null),
  line_matches: Joi.array().items(
    Joi.object({
      line_key: Joi.string().trim().required(),
      factura_id: Joi.number().integer().positive().required()
    })
  ).default([]),
  usuario: Joi.string().allow('', null)
});

const confirmProviderCaratulaOrderSchema = Joi.object({
  factura_ids: Joi.array().items(Joi.number().integer().positive()).required(),
  order_source: Joi.string().trim().valid('auto', 'manual').optional(),
  usuario: Joi.string().allow('', null)
});

const uploadProviderCaratulaSchema = Joi.object({
  filename: Joi.string().trim().max(255).required(),
  file_base64: Joi.string().trim().required(),
  usuario: Joi.string().allow('', null)
});

const confirmProviderCaratulaSchema = Joi.object({
  usuario: Joi.string().allow('', null)
});

const assignOrphanCaratulaSchema = Joi.object({
  provider_key: Joi.string().trim().required(),
  usuario: Joi.string().allow('', null)
});

const discardOrphanCaratulaSchema = Joi.object({
  usuario: Joi.string().allow('', null)
});

const upsertContabilizacionSchema = Joi.object({
  fecha_documento: Joi.date().iso().allow(null, ''),
  fecha_vencimiento: Joi.date().iso().allow(null, ''),
  fecha_contabilizacion: Joi.date().iso().allow(null, ''),
  plazo_credito: Joi.number().integer().allow(null),
  retencion: Joi.number().allow(null),
  descuento: Joi.number().allow(null),
  anticipo_aplicado: Joi.number().allow(null),
  monto_nota_credito: Joi.number().min(0).allow(null),
  centro_costo: Joi.string().allow('', null),
  cuenta_contable: Joi.string().allow('', null),
  proyecto: Joi.string().allow('', null),
  orden_compra: Joi.string().allow('', null),
  orden_compra_id: Joi.number().integer().positive().allow(null),
  numero_proveedor: Joi.string().allow('', null),
  proveedor_id: Joi.number().integer().positive().allow(null),
  tabla_pago_id: Joi.number().integer().positive().allow(null),
  nota_credito_id: Joi.number().integer().positive().allow(null),
  notas: Joi.string().allow('', null),
  workflow_action: Joi.string().trim().valid('save_draft', 'mark_in_review', 'finalize').optional(),
  metadata: Joi.any(),
  usuario: Joi.string().allow('', null)
});

const uploadContabilizacionDocumentoRespaldoSchema = Joi.object({
  filename: Joi.string().trim().max(255).required(),
  file_base64: Joi.string().trim().required(),
  metadata: Joi.any(),
  usuario: Joi.string().allow('', null)
});

const registrarPagoRetencionSchema = Joi.object({
  monto: Joi.number().positive().required(),
  fecha_pago: Joi.date().iso().allow(null, ''),
  notas: Joi.string().allow('', null),
  usuario: Joi.string().allow('', null)
});

const createUsuarioSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email({ tlds: { allow: false } }).max(100).required(),
  password: Joi.string().min(8).max(255).required(),
  rol_id: Joi.number().integer().positive().required(),
  activo: Joi.boolean().optional()
});

const updateUsuarioSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email({ tlds: { allow: false } }).max(100).required(),
  rol_id: Joi.number().integer().positive().required(),
  activo: Joi.boolean().optional(),
  password: Joi.string().min(8).max(255).allow('', null)
});

const setUsuarioSociedadesSchema = Joi.object({
  sociedad_ids: Joi.array().items(Joi.number().integer().positive()).required()
});

const createProveedorSchema = Joi.object({
  sociedad_id: Joi.number().integer().positive().required(),
  identificacion_tipo: Joi.string().trim().max(20).allow('', null),
  identificacion_numero: Joi.string().trim().min(3).max(50).required(),
  nombre: Joi.string().trim().min(2).max(255).required(),
  nombre_comercial: Joi.string().trim().max(255).allow('', null),
  correo_electronico: Joi.string().trim().email({ tlds: { allow: false } }).max(255).allow('', null),
  telefono_codigo_pais: Joi.string().trim().max(10).allow('', null),
  telefono_numero: Joi.string().trim().max(50).allow('', null)
});

const updateProveedorSchema = Joi.object({
  identificacion_tipo: Joi.string().trim().max(20).allow('', null),
  identificacion_numero: Joi.string().trim().min(3).max(50).required(),
  nombre: Joi.string().trim().min(2).max(255).required(),
  nombre_comercial: Joi.string().trim().max(255).allow('', null),
  correo_electronico: Joi.string().trim().email({ tlds: { allow: false } }).max(255).allow('', null),
  telefono_codigo_pais: Joi.string().trim().max(10).allow('', null),
  telefono_numero: Joi.string().trim().max(50).allow('', null)
});

const createTablaPagoSchema = Joi.object({
  sociedad_id: Joi.number().integer().positive().required(),
  proveedor_id: Joi.number().integer().positive().required(),
  nombre: Joi.string().trim().max(255).allow('', null),
  filename: Joi.string().trim().max(255).required(),
  file_base64: Joi.string().trim().required(),
  metadata: Joi.any(),
  usuario: Joi.string().trim().max(100).allow('', null)
});

const centroCostoBaseSchema = {
  codigo: Joi.string().trim().max(50).required(),
  nombre: Joi.string().trim().max(255).required(),
  centro_padre_id: Joi.number().integer().positive().allow(null),
  codigo_padre: Joi.string().trim().max(50).allow('', null),
  centro_padre_codigo: Joi.string().trim().max(50).allow('', null),
  usuario_aprobador_id: Joi.number().integer().positive().allow(null),
  rol_aprobador_id: Joi.number().integer().positive().allow(null),
  seleccionable_en_contabilizacion: Joi.boolean().optional(),
  activo: Joi.boolean().optional(),
  orden: Joi.number().integer().min(0).allow(null),
  metadata: Joi.any(),
};

const validateCentroCostoAprobador = (value, helpers) => {
  const hasUsuarioAprobador = Number.isInteger(value?.usuario_aprobador_id) && value.usuario_aprobador_id > 0;
  const hasRolAprobador = Number.isInteger(value?.rol_aprobador_id) && value.rol_aprobador_id > 0;

  if (hasUsuarioAprobador === hasRolAprobador) {
    return helpers.error('any.invalid');
  }

  return value;
};

const createCentroCostoSchema = Joi.object({
  sociedad_id: Joi.number().integer().positive().required(),
  ...centroCostoBaseSchema,
}).custom(validateCentroCostoAprobador, 'centro costo approver validation').messages({
  'any.invalid': 'Debe indicar usuario_aprobador_id o rol_aprobador_id, pero no ambos'
});

const updateCentroCostoSchema = Joi.object({
  ...centroCostoBaseSchema,
}).custom(validateCentroCostoAprobador, 'centro costo approver validation').messages({
  'any.invalid': 'Debe indicar usuario_aprobador_id o rol_aprobador_id, pero no ambos'
});

const bulkUpsertCentrosCostoSchema = Joi.object({
  sociedad_id: Joi.number().integer().positive().required(),
  centros: Joi.array().items(
    Joi.object({
      id: Joi.alternatives().try(
        Joi.number().integer().positive(),
        Joi.string().trim().allow('', null)
      ).optional(),
      ...centroCostoBaseSchema,
    }).custom(validateCentroCostoAprobador, 'centro costo approver validation').messages({
      'any.invalid': 'Debe indicar usuario_aprobador_id o rol_aprobador_id, pero no ambos'
    })
  ).required(),
});

const createOrdenCompraSchema = Joi.object({
  sociedad_id: Joi.number().integer().positive().required(),
  proveedor_id: Joi.number().integer().positive().required(),
  numero_oc: Joi.string().trim().max(255).allow('', null),
  nombre: Joi.string().trim().max(255).allow('', null),
  monto: Joi.number().positive().required(),
  moneda: Joi.string().trim().max(10).required(),
  fecha: Joi.date().iso().required(),
  filename: Joi.string().trim().max(255).required(),
  file_base64: Joi.string().trim().required(),
  metadata: Joi.any(),
  usuario: Joi.string().trim().max(100).allow('', null)
}).or('numero_oc', 'nombre');

const autoImportOrdenCompraSchema = Joi.object({
  sociedad_id: Joi.number().integer().positive().required(),
  filename: Joi.string().trim().max(255).required(),
  file_base64: Joi.string().trim().required(),
  metadata: Joi.any(),
  usuario: Joi.string().trim().max(100).allow('', null)
});

const updateOrdenCompraEstadoSchema = Joi.object({
  estado: Joi.string().trim().valid('abierta', 'cerrada').required()
});

const createReservaOperacionSchema = Joi.object({
  sociedad_id: Joi.number().integer().positive().required(),
  proyecto_codigo: Joi.string().trim().max(20).required(),
  unidad_codigo: Joi.string().trim().max(20).required(),
  cliente_nombre: Joi.string().trim().max(255).required(),
  cliente_identificacion: Joi.string().trim().max(50).allow('', null),
  metadata: Joi.any(),
  usuario: Joi.string().trim().max(100).allow('', null),
});

const cancelReservaOperacionSchema = Joi.object({
  motivo: Joi.string().trim().max(1000).allow('', null),
  usuario: Joi.string().trim().max(100).allow('', null),
});

const closeReservaOperacionSchema = Joi.object({
  motivo: Joi.string().trim().max(1000).allow('', null),
  usuario: Joi.string().trim().max(100).allow('', null),
});

const transferReservaOperacionSchema = Joi.object({
  destino_sociedad_id: Joi.number().integer().positive().allow(null),
  destino_proyecto_codigo: Joi.string().trim().max(20).required(),
  destino_unidad_codigo: Joi.string().trim().max(20).required(),
  cliente_nombre: Joi.string().trim().max(255).allow('', null),
  cliente_identificacion: Joi.string().trim().max(50).allow('', null),
  motivo: Joi.string().trim().max(1000).allow('', null),
  usuario: Joi.string().trim().max(100).allow('', null),
  metadata: Joi.any(),
});

const upsertReservaOperacionDocumentoSchema = Joi.object({
  codigo_documento: Joi.string().trim().max(50).required(),
  nombre_archivo: Joi.string().trim().max(255).required(),
  ruta_archivo: Joi.string().trim().max(2000).required(),
  mime_type: Joi.string().trim().max(150).allow('', null),
  tamanio_bytes: Joi.number().integer().min(0).allow(null),
  hash_sha256: Joi.string().trim().max(128).allow('', null),
  metadata: Joi.any(),
  usuario: Joi.string().trim().max(100).allow('', null),
});

const syncReservaDocumentoSchema = Joi.object({
  sociedad_id: Joi.number().integer().positive().allow(null),
  proyecto_codigo: Joi.string().trim().max(20).required(),
  unidad_codigo: Joi.string().trim().max(20).required(),
  cliente_nombre: Joi.string().trim().max(255).required(),
  cliente_identificacion: Joi.string().trim().max(50).allow('', null),
  codigo_documento: Joi.string().trim().max(50).required(),
  nombre_archivo: Joi.string().trim().max(255).required(),
  ruta_archivo: Joi.string().trim().max(2000).required(),
  mime_type: Joi.string().trim().max(150).allow('', null),
  tamanio_bytes: Joi.number().integer().min(0).allow(null),
  hash_sha256: Joi.string().trim().max(128).allow('', null),
  metadata: Joi.any(),
  usuario: Joi.string().trim().max(100).allow('', null),
});

const replaceReservaOperacionDocumentoSchema = Joi.object({
  filename: Joi.string().trim().max(255).required(),
  file_base64: Joi.string().trim().required(),
  mime_type: Joi.string().trim().max(150).allow('', null),
  motivo: Joi.string().trim().max(1000).allow('', null),
  metadata: Joi.any(),
  usuario: Joi.string().trim().max(100).allow('', null),
});

module.exports = {
  createComentarioSchema,
  createAuditoriaSchema,
  createEstadoSchema,
  updateEstadoSchema,
  createVersionSchema,
  tesoreriaActionSchema,
  cambiarEstadoSchema,
  decisionDocumentoSchema,
  crearTramiteSchema,
  rechazoTesoreriaSchema,
  uploadTramiteCaratulasSchema,
  resolveTramiteCaratulasSchema,
  confirmProviderCaratulaOrderSchema,
  uploadProviderCaratulaSchema,
  confirmProviderCaratulaSchema,
  assignOrphanCaratulaSchema,
  discardOrphanCaratulaSchema,
  upsertContabilizacionSchema,
  uploadContabilizacionDocumentoRespaldoSchema,
  registrarPagoRetencionSchema,
  createUsuarioSchema,
  updateUsuarioSchema,
  setUsuarioSociedadesSchema,
  createProveedorSchema,
  updateProveedorSchema,
  createCentroCostoSchema,
  updateCentroCostoSchema,
  bulkUpsertCentrosCostoSchema,
  createTablaPagoSchema,
  createOrdenCompraSchema,
  autoImportOrdenCompraSchema,
  updateOrdenCompraEstadoSchema,
  createReservaOperacionSchema,
  cancelReservaOperacionSchema,
  closeReservaOperacionSchema,
  transferReservaOperacionSchema,
  upsertReservaOperacionDocumentoSchema,
  syncReservaDocumentoSchema,
  replaceReservaOperacionDocumentoSchema,
};







