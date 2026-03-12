export const MAX_ORDEN_COMPRA_MB = 10;
export const MAX_ORDEN_COMPRA_BYTES = MAX_ORDEN_COMPRA_MB * 1024 * 1024;
export const MONEDAS_OPCIONES = ['CRC', 'USD'];

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

export const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

export const formatDateOnly = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toISOString().slice(0, 10);
};

export const formatAmount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '-';
  }
  return parsed.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const proveedorLabel = (proveedor) => (
  `${proveedor.nombre} - ${proveedor.identificacion_numero}`
);
