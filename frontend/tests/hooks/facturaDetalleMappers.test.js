import test from 'node:test';
import assert from 'node:assert/strict';
import { mapFacturaDetalleDataToViewState } from '../../src/hooks/facturaDetalle/facturaDetalleMappers.js';

test('mapFacturaDetalleDataToViewState transforma datos remotos al estado de la vista', () => {
  const mapped = mapFacturaDetalleDataToViewState({
    facturaData: {
      id: 77,
      fecha_emision: '2026-01-20',
      emisor: {
        Identificacion: {
          Numero: '3101122334'
        }
      }
    },
    comentariosData: [{ id: 10, texto: 'ok' }],
    estadosData: [{ id: 1, estado_nuevo: 'en_revision' }],
    contaData: {
      tabla_pago_id: 14,
      tabla_pago_nombre: 'Tabla Febrero',
      orden_compra_id: 20,
      orden_compra_nombre: 'OC-20',
      nota_credito_id: 30,
      nota_credito_clave: 'NC-30',
      retencion_pagos: [{ id: 1, monto: 15 }]
    },
    proveedoresData: [{ id: 5, identificacion_numero: '3101122334' }],
    now: '2026-02-18T12:00:00.000Z'
  });

  assert.equal(mapped.factura.id, 77);
  assert.equal(mapped.comentarios.length, 1);
  assert.equal(mapped.estados.length, 1);
  assert.equal(mapped.retencionPagos.length, 1);
  assert.equal(mapped.proveedoresSociedad.length, 1);
  assert.equal(mapped.tablaPagoActual?.id, 14);
  assert.equal(mapped.ordenCompraActual?.id, 20);
  assert.equal(mapped.notaCreditoActual?.id, 30);
  assert.equal(mapped.conta.proveedor_id, '5');
  assert.equal(mapped.conta.numero_proveedor, '3101122334');
  assert.equal(mapped.retencionPagoFecha, '2026-02-18');
});

test('mapFacturaDetalleDataToViewState aplica defaults cuando no hay datos opcionales', () => {
  const mapped = mapFacturaDetalleDataToViewState({
    facturaData: null,
    comentariosData: [],
    estadosData: [],
    contaData: {},
    proveedoresData: [],
    now: null
  });

  assert.equal(mapped.factura, null);
  assert.deepEqual(mapped.comentarios, []);
  assert.deepEqual(mapped.estados, []);
  assert.deepEqual(mapped.retencionPagos, []);
  assert.equal(mapped.tablaPagoActual, null);
  assert.equal(mapped.ordenCompraActual, null);
  assert.equal(mapped.notaCreditoActual, null);
  assert.equal(mapped.retencionPagoFecha, '');
});
