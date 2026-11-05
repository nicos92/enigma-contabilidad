import { describe, expect, it } from 'vitest'
import { construirAsiento } from '@/core/contabilidad/asientos'
import {
  derivarBalanceComprobacion,
  derivarEstadoEvolucionPatrimonioNeto,
  derivarEstadoFlujoEfectivo,
  derivarEstadoResultados,
  derivarEstadoSituacionPatrimonial,
  derivarLibroDiario,
  derivarLibroMayor,
  derivarMovimientosTesoreria,
  derivarSaldosClientes,
  derivarSaldosProveedores,
  derivarSaldosTesoreria,
  derivarStock,
} from '@/core/contabilidad/derivaciones'
import { CUENTAS, CODIGOS } from '@/data/plan-cuentas'
import type {
  Asiento,
  BalanceComprobacion,
  Cliente,
  Cobro,
  Compra,
  DocumentoContable,
  Pago,
  Producto,
  Proveedor,
  Venta,
} from '@/types/contabilidad'

function asientoRegistrado(
  id: string,
  fecha: Asiento['fecha'],
  numero: number,
  debe: string,
  haber: string,
  importe: number,
  origen: Asiento['origen'] = 'ajuste',
): Asiento {
  return construirAsiento({
    id,
    fecha,
    concepto: `Asiento ${id}`,
    origen,
    origenId: id,
    documentoId: null,
    numero,
    estado: 'registrado',
    lineas: [
      { cuentaId: debe, debe: importe, haber: 0 },
      { cuentaId: haber, debe: 0, haber: importe },
    ],
  })
}

function cuentaFila(
  codigo: string,
  tipo: BalanceComprobacion['filas'][number]['tipo'],
  rubro: BalanceComprobacion['filas'][number]['rubro'],
  saldoDeudor: number,
  saldoAcreedor: number,
): BalanceComprobacion['filas'][number] {
  const cuenta = CUENTAS.find((cuentaContable) => cuentaContable.codigo === codigo)!
  return {
    cuentaId: codigo,
    codigo,
    nombre: cuenta.nombre,
    tipo,
    naturaleza: cuenta.naturaleza,
    rubro,
    sumaDebe: saldoDeudor,
    sumaHaber: saldoAcreedor,
    saldoDeudor,
    saldoAcreedor,
  }
}

describe('Libro Diario', () => {
  const registradoA = asientoRegistrado(
    'a',
    '2026-11-01',
    1,
    CODIGOS.CAJA,
    CODIGOS.CAPITAL,
    1_000,
    'apertura',
  )
  const registradoB = asientoRegistrado(
    'b',
    '2026-11-02',
    2,
    CODIGOS.BANCO,
    CODIGOS.CAJA,
    500,
    'transferencia',
  )
  const propuesto = construirAsiento({
    id: 'c',
    fecha: '2026-11-03',
    concepto: 'Propuesto',
    origen: 'ajuste',
    origenId: 'c',
    documentoId: null,
    estado: 'propuesto',
    lineas: [
      { cuentaId: CODIGOS.CAJA, debe: 999, haber: 0 },
      { cuentaId: CODIGOS.CAPITAL, debe: 0, haber: 999 },
    ],
  })
  const anulado = construirAsiento({
    id: 'd',
    fecha: '2026-11-04',
    concepto: 'Anulado',
    origen: 'ajuste',
    origenId: 'd',
    documentoId: null,
    estado: 'anulado',
    lineas: [
      { cuentaId: CODIGOS.CAJA, debe: 777, haber: 0 },
      { cuentaId: CODIGOS.CAPITAL, debe: 0, haber: 777 },
    ],
  })
  const asientos = [propuesto, registradoB, anulado, registradoA]

  it('deriva únicamente asientos registrados', () => {
    const diario = derivarLibroDiario(asientos, CUENTAS)

    expect(diario.asientos.map((asiento) => asiento.id)).toEqual(['a', 'b'])
    expect(diario.filas).toHaveLength(4)
    expect(diario.totalDebe).toBe(1_500)
    expect(diario.totalHaber).toBe(1_500)
    expect(diario.balanceado).toBe(true)
    expect(diario.filas.some((fila) => fila.asientoId === 'c')).toBe(false)
    expect(diario.filas.some((fila) => fila.asientoId === 'd')).toBe(false)
  })

  it('respeta el rango de fechas del diario', () => {
    const diario = derivarLibroDiario(asientos, CUENTAS, { desde: '2026-11-02' })

    expect(diario.asientos.map((asiento) => asiento.id)).toEqual(['b'])
    expect(diario.filas).toHaveLength(2)
    expect(diario.totalDebe).toBe(500)
  })

  it('marca como no balanceado un diario sin movimientos', () => {
    const diario = derivarLibroDiario([propuesto], CUENTAS)

    expect(diario.asientos).toHaveLength(0)
    expect(diario.filas).toHaveLength(0)
    expect(diario.balanceado).toBe(false)
  })
})

describe('Libro Mayor', () => {
  const asientos = [
    asientoRegistrado('a', '2026-11-01', 1, CODIGOS.CAJA, CODIGOS.CAPITAL, 1_000, 'apertura'),
    asientoRegistrado('b', '2026-11-02', 2, CODIGOS.BANCO, CODIGOS.CAJA, 500, 'transferencia'),
    asientoRegistrado('c', '2026-11-03', 3, CODIGOS.CAJA, CODIGOS.CAPITAL, 250, 'ajuste'),
  ]
  const diario = derivarLibroDiario(asientos, CUENTAS)

  it('deriva el mayor exclusivamente del diario', () => {
    const mayor = derivarLibroMayor(diario, CUENTAS)

    expect(mayor[CODIGOS.CAJA]?.saldoInicial).toBe(0)
    expect(mayor[CODIGOS.CAJA]?.totalDebe).toBe(1_250)
    expect(mayor[CODIGOS.CAJA]?.totalHaber).toBe(500)
    expect(mayor[CODIGOS.CAJA]?.saldoFinal).toBe(750)
    expect(mayor[CODIGOS.BANCO]?.saldoFinal).toBe(500)
    expect(mayor[CODIGOS.CAPITAL]?.saldoFinal).toBe(-1_250)
    expect(mayor[CODIGOS.CAJA]?.movimientos.map((movimiento) => movimiento.saldo)).toEqual([
      1_000, 500, 750,
    ])
  })

  it('calcula saldo inicial y excluye movimientos posteriores al rango', () => {
    const mayor = derivarLibroMayor(diario, CUENTAS, {
      desde: '2026-11-02',
      hasta: '2026-11-02',
    })

    expect(mayor[CODIGOS.CAJA]?.saldoInicial).toBe(1_000)
    expect(mayor[CODIGOS.CAJA]?.movimientos).toHaveLength(1)
    expect(mayor[CODIGOS.CAJA]?.saldoFinal).toBe(500)
    expect(mayor[CODIGOS.BANCO]?.saldoFinal).toBe(500)
  })

  it('solo incluye cuentas imputables', () => {
    const mayor = derivarLibroMayor(diario, CUENTAS)

    expect(mayor[CODIGOS.ACTIVO]).toBeUndefined()
    expect(mayor[CODIGOS.PASIVO]).toBeUndefined()
    expect(mayor[CODIGOS.CAJA]).toBeDefined()
  })
})

describe('Balance de comprobación', () => {
  it('se deriva del mayor y conserva la igualdad de sumas y saldos', () => {
    const asientos = [
      asientoRegistrado('a', '2026-11-01', 1, CODIGOS.CAJA, CODIGOS.CAPITAL, 1_000, 'apertura'),
      asientoRegistrado('b', '2026-11-02', 2, CODIGOS.BANCO, CODIGOS.CAJA, 500, 'transferencia'),
      asientoRegistrado('c', '2026-11-03', 3, CODIGOS.CAJA, CODIGOS.CAPITAL, 250, 'ajuste'),
    ]
    const diario = derivarLibroDiario(asientos, CUENTAS)
    const mayor = derivarLibroMayor(diario, CUENTAS)
    const balance = derivarBalanceComprobacion(mayor, CUENTAS)

    expect(balance.filas.map((fila) => fila.codigo)).toEqual([
      CODIGOS.CAJA,
      CODIGOS.BANCO,
      CODIGOS.CAPITAL,
    ])
    expect(balance.totalSumaDebe).toBe(1_750)
    expect(balance.totalSumaHaber).toBe(1_750)
    expect(balance.totalSaldoDeudor).toBe(1_250)
    expect(balance.totalSaldoAcreedor).toBe(1_250)
    expect(balance.balanceado).toBe(true)

    const caja = balance.filas.find((fila) => fila.codigo === CODIGOS.CAJA)
    expect(caja?.saldoDeudor).toBe(750)
    expect(caja?.saldoAcreedor).toBe(0)
  })

  it('omite cuentas sin actividad', () => {
    const diario = derivarLibroDiario(
      [asientoRegistrado('a', '2026-11-01', 1, CODIGOS.CAJA, CODIGOS.CAPITAL, 1_000)],
      CUENTAS,
    )
    const balance = derivarBalanceComprobacion(derivarLibroMayor(diario, CUENTAS), CUENTAS)

    expect(balance.filas).toHaveLength(2)
    expect(balance.filas.some((fila) => fila.codigo === CODIGOS.BANCO)).toBe(false)
  })
})

describe('Estados contables', () => {
  it('deriva resultados y situación patrimonial desde el balance', () => {
    const balance: BalanceComprobacion = {
      filas: [
        cuentaFila(CODIGOS.CAJA, 'activo', 'activo_corriente', 1_000, 0),
        cuentaFila(CODIGOS.PROVEEDORES, 'pasivo', 'pasivo_corriente', 0, 300),
        cuentaFila(CODIGOS.CAPITAL, 'patrimonio', 'patrimonio', 0, 500),
        cuentaFila(CODIGOS.VENTAS, 'ingreso', 'ingreso', 0, 400),
        cuentaFila(CODIGOS.SUELDOS, 'gasto', 'gasto_operativo', 200, 0),
      ],
      totalSumaDebe: 1_200,
      totalSumaHaber: 1_200,
      totalSaldoDeudor: 1_200,
      totalSaldoAcreedor: 1_200,
      balanceado: true,
    }

    const resultado = derivarEstadoResultados(balance, CUENTAS)
    expect(resultado.ingresos).toEqual([{ codigo: CODIGOS.VENTAS, nombre: 'Ventas', importe: 400 }])
    expect(resultado.ventasNetas).toBe(400)
    expect(resultado.totalIngresos).toBe(400)
    expect(resultado.costoVentas).toBe(0)
    expect(resultado.gastosOperativos).toEqual([
      { codigo: CODIGOS.SUELDOS, nombre: 'Sueldos y jornales', importe: 200 },
    ])
    expect(resultado.resultadoAntesImpuestos).toBe(200)
    expect(resultado.impuestoGanancias).toBe(0)
    expect(resultado.resultadoEjercicio).toBe(200)

    const situacion = derivarEstadoSituacionPatrimonial(balance, CUENTAS, resultado)
    expect(situacion.totalActivo).toBe(1_000)
    expect(situacion.totalPasivo).toBe(300)
    // Capital 500 + resultado del ejercicio 200.
    expect(situacion.totalPatrimonioNeto).toBe(700)
    expect(situacion.totalPasivoYPatrimonioNeto).toBe(1_000)
    expect(situacion.diferencia).toBe(0)
    expect(situacion.ecuacionVerificada).toBe(true)
  })

  it('detecta una ecuación patrimonial que no cierra', () => {
    const balance: BalanceComprobacion = {
      filas: [cuentaFila(CODIGOS.CAJA, 'activo', 'activo_corriente', 1_000, 0)],
      totalSumaDebe: 1_000,
      totalSumaHaber: 0,
      totalSaldoDeudor: 1_000,
      totalSaldoAcreedor: 0,
      balanceado: false,
    }
    const resultado = derivarEstadoResultados(balance, CUENTAS)
    const situacion = derivarEstadoSituacionPatrimonial(balance, CUENTAS, resultado)

    expect(situacion.totalActivo).toBe(1_000)
    expect(situacion.totalPasivoYPatrimonioNeto).toBe(0)
    expect(situacion.diferencia).toBe(1_000)
    expect(situacion.ecuacionVerificada).toBe(false)
  })
})

describe('Tesorería derivada', () => {
  it('solo considera asientos registrados y separa apertura de movimientos', () => {
    const asientos = [
      asientoRegistrado('a', '2026-11-01', 1, CODIGOS.CAJA, CODIGOS.CAPITAL, 1_000, 'apertura'),
      asientoRegistrado('b', '2026-11-02', 2, CODIGOS.BANCO, CODIGOS.CAJA, 500, 'transferencia'),
      asientoRegistrado('c', '2026-11-03', 3, CODIGOS.PROVEEDORES, CODIGOS.BANCO, 200, 'pago'),
      construirAsiento({
        id: 'd',
        fecha: '2026-11-04',
        concepto: 'Propuesto',
        origen: 'cobro',
        origenId: 'd',
        documentoId: null,
        estado: 'propuesto',
        lineas: [
          { cuentaId: CODIGOS.CAJA, debe: 900, haber: 0 },
          { cuentaId: CODIGOS.DEUDORES, debe: 0, haber: 900 },
        ],
      }),
    ]

    const movimientos = derivarMovimientosTesoreria(asientos)
    expect(movimientos.map((movimiento) => movimiento.asientoId)).toEqual(['a', 'b', 'b', 'c'])
    expect(movimientos.some((movimiento) => movimiento.asientoId === 'd')).toBe(false)

    const saldos = derivarSaldosTesoreria(movimientos)
    const caja = saldos.find((saldo) => saldo.cuentaId === CODIGOS.CAJA)!
    const banco = saldos.find((saldo) => saldo.cuentaId === CODIGOS.BANCO)!

    expect(caja).toEqual({
      cuentaId: CODIGOS.CAJA,
      saldoInicial: 1_000,
      ingresos: 0,
      egresos: 500,
      saldoFinal: 500,
    })
    expect(banco).toEqual({
      cuentaId: CODIGOS.BANCO,
      saldoInicial: 0,
      ingresos: 500,
      egresos: 200,
      saldoFinal: 300,
    })
  })
})

describe('Stock derivado', () => {
  it('calcula existencias y valor por producto', () => {
    const productos: Producto[] = [
      {
        id: 'p1',
        codigo: 'P1',
        nombre: 'Producto 1',
        tipo: 'producto',
        precioVenta: 200,
        costo: 100,
        alicuotaIva: 21,
        stockInicial: 10,
        puntoReposicion: 2,
        cuentaCompra: CODIGOS.MERCADERIAS,
        cuentaIngreso: CODIGOS.VENTAS,
        cuentaCosto: CODIGOS.CMV,
      },
      {
        id: 'p2',
        codigo: 'P2',
        nombre: 'Producto 2',
        tipo: 'producto',
        precioVenta: 100,
        costo: 50,
        alicuotaIva: 21,
        stockInicial: 0,
        puntoReposicion: 0,
        cuentaCompra: CODIGOS.MERCADERIAS,
        cuentaIngreso: CODIGOS.VENTAS,
        cuentaCosto: CODIGOS.CMV,
      },
    ]

    const compras = [
      {
        items: [
          { productoId: 'p1', cantidad: 5 },
          { productoId: 'p2', cantidad: 2 },
        ],
      },
    ] as Compra[]
    const ventas = [{ items: [{ productoId: 'p1', cantidad: 3 }] }] as Venta[]

    const stock = derivarStock(productos, compras, ventas)

    expect(stock[0]).toMatchObject({
      productoId: 'p1',
      stockInicial: 10,
      compras: 5,
      ventas: 3,
      stockFinal: 12,
      costoUnitario: 100,
      valorStock: 1_200,
    })
    expect(stock[1]).toMatchObject({
      productoId: 'p2',
      stockInicial: 0,
      compras: 2,
      ventas: 0,
      stockFinal: 2,
      valorStock: 100,
    })
  })
})

describe('Saldos de terceros', () => {
  const proveedores: Proveedor[] = [
    {
      id: 'prv1',
      nombre: 'Proveedor 1',
      cuit: '1',
      email: '',
      telefono: '',
      direccion: '',
      condicionIva: 'Responsable Inscripto',
    },
    {
      id: 'prv2',
      nombre: 'Proveedor 2',
      cuit: '2',
      email: '',
      telefono: '',
      direccion: '',
      condicionIva: 'Responsable Inscripto',
    },
  ]
  const clientes: Cliente[] = [
    {
      id: 'cli1',
      nombre: 'Cliente 1',
      cuit: '3',
      email: '',
      telefono: '',
      direccion: '',
      condicionIva: 'Responsable Inscripto',
    },
  ]

  const documentos: DocumentoContable[] = [
    {
      id: 'd1',
      numero: '1',
      tipo: 'factura_recibida',
      origen: 'compras',
      fecha: '2026-11-01',
      descripcion: '',
      contraparte: null,
      importe: 1_000,
      estado: 'registrado',
      asientoId: 'a1',
      operacionId: 'c1',
    },
    {
      id: 'd2',
      numero: '2',
      tipo: 'factura_recibida',
      origen: 'compras',
      fecha: '2026-11-01',
      descripcion: '',
      contraparte: null,
      importe: 500,
      estado: 'pendiente',
      asientoId: 'a2',
      operacionId: 'c2',
    },
    {
      id: 'd3',
      numero: '3',
      tipo: 'comprobante_pago',
      origen: 'tesoreria',
      fecha: '2026-11-02',
      descripcion: '',
      contraparte: null,
      importe: 400,
      estado: 'registrado',
      asientoId: 'a3',
      operacionId: 'p1',
    },
    {
      id: 'd4',
      numero: '4',
      tipo: 'factura_emitida',
      origen: 'ventas',
      fecha: '2026-11-02',
      descripcion: '',
      contraparte: null,
      importe: 800,
      estado: 'registrado',
      asientoId: 'a4',
      operacionId: 'v1',
    },
    {
      id: 'd5',
      numero: '5',
      tipo: 'recibo',
      origen: 'tesoreria',
      fecha: '2026-11-03',
      descripcion: '',
      contraparte: null,
      importe: 300,
      estado: 'registrado',
      asientoId: 'a5',
      operacionId: 'k1',
    },
  ]

  const compras = [
    { id: 'c1', proveedorId: 'prv1', documentoId: 'd1', total: 1_000 },
    { id: 'c2', proveedorId: 'prv2', documentoId: 'd2', total: 500 },
  ] as Compra[]
  const pagos = [{ id: 'p1', proveedorId: 'prv1', documentoId: 'd3', importe: 400 }] as Pago[]
  const ventas = [{ id: 'v1', clienteId: 'cli1', documentoId: 'd4', total: 800 }] as Venta[]
  const cobros = [{ id: 'k1', clienteId: 'cli1', documentoId: 'd5', importe: 300 }] as Cobro[]

  it('solo computa operaciones registradas', () => {
    const saldos = derivarSaldosProveedores(proveedores, compras, pagos, documentos)

    expect(saldos).toEqual([
      { id: 'prv1', nombre: 'Proveedor 1', saldo: 600 },
      { id: 'prv2', nombre: 'Proveedor 2', saldo: 0 },
    ])
  })

  it('solo computa ventas y cobros registrados', () => {
    const saldos = derivarSaldosClientes(clientes, ventas, cobros, documentos)

    expect(saldos).toEqual([{ id: 'cli1', nombre: 'Cliente 1', saldo: 500 }])
  })
})

describe('Estado de Flujo de Efectivo', () => {
  const asientos = [
    asientoRegistrado(
      'apertura',
      '2026-11-01',
      1,
      CODIGOS.CAJA,
      CODIGOS.CAPITAL,
      1_000,
      'apertura',
    ),
    asientoRegistrado('cobro', '2026-11-02', 2, CODIGOS.BANCO, CODIGOS.DEUDORES, 500, 'cobro'),
    asientoRegistrado('pago', '2026-11-03', 3, CODIGOS.PROVEEDORES, CODIGOS.BANCO, 200, 'pago'),
    asientoRegistrado('gasto', '2026-11-04', 4, CODIGOS.SUELDOS, CODIGOS.CAJA, 100, 'gasto'),
    asientoRegistrado('equipos', '2026-11-05', 5, CODIGOS.EQUIPOS, CODIGOS.BANCO, 300, 'compra'),
    asientoRegistrado('prestamo', '2026-11-06', 6, CODIGOS.BANCO, CODIGOS.PRESTAMOS, 400, 'ajuste'),
    asientoRegistrado('aporte', '2026-11-07', 7, CODIGOS.BANCO, CODIGOS.CAPITAL, 600, 'ajuste'),
    asientoRegistrado(
      'transferencia',
      '2026-11-08',
      8,
      CODIGOS.CAJA,
      CODIGOS.BANCO,
      50,
      'transferencia',
    ),
  ]

  const diario = derivarLibroDiario(asientos, CUENTAS)
  const mayor = derivarLibroMayor(diario, CUENTAS)
  const balance = derivarBalanceComprobacion(mayor, CUENTAS)

  it('clasifica los flujos y excluye las transferencias internas', () => {
    const flujo = derivarEstadoFlujoEfectivo(balance, CUENTAS, asientos)

    expect(flujo.saldoInicial).toBe(1_000)
    expect(flujo.actividadesOperativas).toEqual([
      { codigo: 'FO-1', nombre: 'Cobros de clientes', importe: 500 },
      { codigo: 'FO-2', nombre: 'Pagos a proveedores', importe: -200 },
      { codigo: 'FO-3', nombre: 'Pagos de gastos operativos', importe: -100 },
    ])
    expect(flujo.totalActividadesOperativas).toBe(200)
    expect(flujo.actividadesInversion).toEqual([
      { codigo: 'FI-1', nombre: 'Compras de bienes de uso', importe: -300 },
    ])
    expect(flujo.totalActividadesInversion).toBe(-300)
    expect(flujo.actividadesFinanciacion).toEqual([
      { codigo: 'FF-1', nombre: 'Aportes de capital', importe: 600 },
      { codigo: 'FF-2', nombre: 'Préstamos obtenidos', importe: 400 },
    ])
    expect(flujo.totalActividadesFinanciacion).toBe(1_000)
    expect(flujo.variacionNeta).toBe(900)
    expect(flujo.saldoFinal).toBe(1_900)
    expect(flujo.saldoContable).toBe(1_900)
    expect(flujo.diferencia).toBe(0)
    expect(flujo.conciliado).toBe(true)
  })

  it('no cuenta la apertura como flujo del período', () => {
    const flujo = derivarEstadoFlujoEfectivo(balance, CUENTAS, asientos)

    expect(flujo.actividadesFinanciacion.some((linea) => linea.importe === 1_000)).toBe(false)
  })
})

describe('Estado de Evolución del Patrimonio Neto', () => {
  const asientos = [
    asientoRegistrado(
      'apertura',
      '2026-11-01',
      1,
      CODIGOS.CAJA,
      CODIGOS.CAPITAL,
      1_000,
      'apertura',
    ),
    asientoRegistrado('aporte', '2026-11-02', 2, CODIGOS.BANCO, CODIGOS.CAPITAL, 500, 'ajuste'),
    asientoRegistrado(
      'resultados',
      '2026-11-03',
      3,
      CODIGOS.CAJA,
      CODIGOS.RESULTADOS_ACUMULADOS,
      100,
      'ajuste',
    ),
    asientoRegistrado('venta', '2026-11-04', 4, CODIGOS.CAJA, CODIGOS.VENTAS, 300, 'venta'),
    asientoRegistrado('gasto', '2026-11-05', 5, CODIGOS.SUELDOS, CODIGOS.CAJA, 100, 'gasto'),
  ]

  const diario = derivarLibroDiario(asientos, CUENTAS)
  const balance = derivarBalanceComprobacion(derivarLibroMayor(diario, CUENTAS), CUENTAS)
  const resultado = derivarEstadoResultados(balance, CUENTAS)

  it('expone capital, resultados acumulados y resultado del ejercicio', () => {
    const evolucion = derivarEstadoEvolucionPatrimonioNeto(balance, CUENTAS, resultado, asientos)

    expect(evolucion.saldoInicial).toBe(0)
    expect(evolucion.aportesCapital).toBe(1_500)
    expect(evolucion.movimientosResultados).toBe(100)
    expect(evolucion.resultadoEjercicio).toBe(200)
    expect(evolucion.capitalFinal).toBe(1_500)
    expect(evolucion.resultadosAcumuladosFinales).toBe(100)
    expect(evolucion.saldoFinal).toBe(1_800)
    expect(evolucion.filas.at(-1)).toMatchObject({
      concepto: 'Saldo final',
      capital: 1_500,
      resultadosAcumulados: 100,
      resultadoEjercicio: 200,
      total: 1_800,
      tipo: 'saldo_final',
    })
  })

  it('se concilia con el patrimonio neto del Estado de Situación Patrimonial', () => {
    const evolucion = derivarEstadoEvolucionPatrimonioNeto(balance, CUENTAS, resultado, asientos)
    const situacion = derivarEstadoSituacionPatrimonial(balance, CUENTAS, resultado)

    expect(evolucion.totalPatrimonioNeto).toBe(situacion.totalPatrimonioNeto)
    expect(evolucion.diferencia).toBe(0)
    expect(evolucion.conciliado).toBe(true)
  })
})
