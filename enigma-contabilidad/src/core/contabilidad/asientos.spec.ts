import { describe, expect, it } from 'vitest'
import {
  asientoBalanceado,
  construirAsiento,
  generarAsientoAmortizacion,
  generarAsientoCobro,
  generarAsientoCompra,
  generarAsientoPago,
  generarAsientoTransferencia,
  generarAsientoVenta,
  numerarAsientos,
  siguienteNumeroAsiento,
  validarAsiento,
} from '@/core/contabilidad/asientos'
import { CODIGOS } from '@/data/plan-cuentas'
import type { Asiento, Cobro, Compra, Pago, Transferencia, Venta } from '@/types/contabilidad'

const compra: Compra = {
  id: 'C-TEST',
  numero: 'FC-TEST',
  fecha: '2026-11-01',
  vencimiento: '2026-12-01',
  proveedorId: 'PRV-TEST',
  tipoComprobante: 'Factura A',
  condicionPago: 'cuenta_corriente',
  items: [
    {
      productoId: 'PROD-TEST',
      descripcion: 'Producto de prueba',
      cantidad: 2,
      precioUnitario: 100_000,
      alicuotaIva: 21,
      cuentaContable: CODIGOS.MERCADERIAS,
    },
  ],
  subtotal: 200_000,
  iva: 42_000,
  total: 242_000,
  estado: 'pendiente',
  documentoId: 'doc-compra-test',
  asientoId: 'asiento-compra-test',
}

const venta: Venta = {
  id: 'V-TEST',
  numero: 'FA-TEST',
  fecha: '2026-11-02',
  vencimiento: '2026-12-02',
  clienteId: 'CLI-TEST',
  tipoComprobante: 'Factura A',
  condicionVenta: 'cuenta_corriente',
  items: [
    {
      productoId: 'PROD-TEST',
      descripcion: 'Producto de prueba',
      cantidad: 2,
      precioUnitario: 150_000,
      alicuotaIva: 21,
      costoUnitario: 100_000,
      cuentaIngreso: CODIGOS.VENTAS,
      cuentaCosto: CODIGOS.CMV,
    },
  ],
  subtotal: 300_000,
  iva: 63_000,
  total: 363_000,
  estado: 'pendiente',
  documentoId: 'doc-venta-test',
  asientoId: 'asiento-venta-test',
}

const pago: Pago = {
  id: 'P-TEST',
  numero: 'CP-TEST',
  fecha: '2026-11-03',
  compraId: compra.id,
  proveedorId: compra.proveedorId,
  importe: 100_000,
  medio: 'banco',
  cuentaId: CODIGOS.BANCO,
  observaciones: '',
  documentoId: 'doc-pago-test',
  asientoId: 'asiento-pago-test',
}

const cobro: Cobro = {
  id: 'K-TEST',
  numero: 'RC-TEST',
  fecha: '2026-11-04',
  ventaId: venta.id,
  clienteId: venta.clienteId,
  importe: 100_000,
  medio: 'caja',
  cuentaId: CODIGOS.CAJA,
  observaciones: '',
  documentoId: 'doc-cobro-test',
  asientoId: 'asiento-cobro-test',
}

const transferencia: Transferencia = {
  id: 'T-TEST',
  numero: 'TR-TEST',
  fecha: '2026-11-05',
  cuentaOrigenId: CODIGOS.BANCO,
  cuentaDestinoId: CODIGOS.CAJA,
  importe: 50_000,
  descripcion: 'Transferencia de prueba',
  documentoId: 'doc-transferencia-test',
  asientoId: 'asiento-transferencia-test',
}

describe('generadores de asientos', () => {
  it('genera un asiento balanceado por compra con IVA', () => {
    const asiento = generarAsientoCompra(compra)

    expect(asientoBalanceado(asiento)).toBe(true)
    expect(asiento.origen).toBe('compra')
    expect(asiento.origenId).toBe(compra.id)
    expect(asiento.lineas).toContainEqual({
      cuentaId: CODIGOS.IVA_CREDITO,
      debe: 42_000,
      haber: 0,
      detalle: 'IVA crédito FC-TEST',
    })
    expect(asiento.lineas).toContainEqual({
      cuentaId: CODIGOS.PROVEEDORES,
      debe: 0,
      haber: 242_000,
      detalle: 'Proveedor FC-TEST',
    })
  })

  it('genera un asiento balanceado por venta e incluye el costo de ventas', () => {
    const asiento = generarAsientoVenta(venta)

    expect(asientoBalanceado(asiento)).toBe(true)
    expect(asiento.lineas).toContainEqual({
      cuentaId: CODIGOS.CMV,
      debe: 200_000,
      haber: 0,
      detalle: 'Costo de ventas FA-TEST',
    })
    expect(asiento.lineas).toContainEqual({
      cuentaId: CODIGOS.MERCADERIAS,
      debe: 0,
      haber: 200_000,
      detalle: 'Salida de stock FA-TEST',
    })
  })

  it('genera asientos balanceados de pago, cobro, transferencia y amortización', () => {
    const asientos = [
      generarAsientoPago(pago),
      generarAsientoCobro(cobro),
      generarAsientoTransferencia(transferencia),
      generarAsientoAmortizacion({
        fecha: '2026-11-30',
        importe: 33_333,
        documentoId: 'doc-amortizacion-test',
      }),
    ]

    for (const asiento of asientos) {
      expect(asientoBalanceado(asiento)).toBe(true)
      expect(validarAsiento(asiento)).toEqual([])
    }
  })
})

describe('validación de partida doble', () => {
  it('rechaza un asiento desbalanceado', () => {
    expect(() =>
      construirAsiento({
        id: 'asiento-invalido',
        fecha: '2026-11-01',
        concepto: 'Asiento inválido',
        origen: 'ajuste',
        origenId: null,
        documentoId: null,
        lineas: [
          { cuentaId: CODIGOS.CAJA, debe: 100_000, haber: 0 },
          { cuentaId: CODIGOS.CAPITAL, debe: 0, haber: 90_000 },
        ],
      }),
    ).toThrow(/no está balanceado/)
  })

  it('rechaza importes negativos y líneas con Debe y Haber simultáneos', () => {
    const errores = validarAsiento({
      lineas: [
        { cuentaId: CODIGOS.CAJA, debe: -100, haber: 0 },
        { cuentaId: CODIGOS.CAPITAL, debe: 100, haber: 100 },
        { cuentaId: CODIGOS.BANCO, debe: 0, haber: 0 },
      ],
    })

    expect(errores.length).toBeGreaterThanOrEqual(3)
  })
})

describe('numeración de asientos', () => {
  it('numera solo los registrados y conserva los propuestos sin número', () => {
    const asientos: Asiento[] = [
      {
        id: 'b',
        numero: null,
        fecha: '2026-11-02',
        concepto: 'B',
        origen: 'ajuste',
        origenId: null,
        documentoId: null,
        estado: 'registrado',
        fechaRegistro: null,
        lineas: [{ cuentaId: CODIGOS.CAJA, debe: 100, haber: 0 }],
      },
      {
        id: 'a',
        numero: null,
        fecha: '2026-11-01',
        concepto: 'A',
        origen: 'ajuste',
        origenId: null,
        documentoId: null,
        estado: 'registrado',
        fechaRegistro: null,
        lineas: [{ cuentaId: CODIGOS.CAJA, debe: 100, haber: 0 }],
      },
      {
        id: 'c',
        numero: null,
        fecha: '2026-11-03',
        concepto: 'C',
        origen: 'ajuste',
        origenId: null,
        documentoId: null,
        estado: 'propuesto',
        fechaRegistro: null,
        lineas: [{ cuentaId: CODIGOS.CAJA, debe: 100, haber: 0 }],
      },
    ]

    numerarAsientos(asientos)

    expect(asientos.find((asiento) => asiento.id === 'a')?.numero).toBe(1)
    expect(asientos.find((asiento) => asiento.id === 'b')?.numero).toBe(2)
    expect(asientos.find((asiento) => asiento.id === 'c')?.numero).toBeNull()
    expect(siguienteNumeroAsiento(asientos)).toBe(3)
  })
})
