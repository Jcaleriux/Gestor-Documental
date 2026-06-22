import { formatDateTime } from '../../utils/formatters.js';

export const MAX_TABLA_PAGO_MB = 10;
export const MAX_TABLA_PAGO_BYTES = MAX_TABLA_PAGO_MB * 1024 * 1024;

export const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const raw = String(reader.result || '');
    const base64 = raw.includes(',') ? raw.split(',')[1] : raw;
    resolve(base64);
  };
  reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
  reader.readAsDataURL(file);
});

export const formatDate = formatDateTime;

export const proveedorLabel = (proveedor) => (
  `${proveedor.nombre} - ${proveedor.identificacion_numero}`
);
