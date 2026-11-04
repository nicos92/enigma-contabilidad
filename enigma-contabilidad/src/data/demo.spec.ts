import { describe, expect, it } from 'vitest'
import {
  asientoBalanceado,
  validarAsiento,
  totalDebe,
  totalHaber,
} from '@/core/contabilidad/asientos'
import {
  derivarBalanceComprobacion,
  derivarEstadoResultados,
  derivarEstadoSituacionPatrimonial,
  derivarLibroDiario,
  derivarLibroMayor,
  derivarMovimientosTesoreria,
  derivarSaldosClientes,
  derivarSaldosProveedores,
  derivarSaldosTesoreria,
  derivarStock,
  estadoCobroVenta,
  estadoPagoCompra,
} from '@/core/contabilidad/derivaciones'
import { AMORTIZACION_MENSUAL_EQUIPOS } from '@/data/catalogos'
import { crearEstadoDemo } from '@/data/demo'
import { CODIGOS } from '@/data/plan-cuentas'
import { VERSION_ESQUEMA } from '@/core/version'
import type { Compra, EstadoContable, Venta } from '@/types/contabilidad'

function crearEstado(): EstadoContable {
  return crearEstadoDemo()
}

function documentosRegistrados(estado: EstadoContable): Set<string> {
  return new Set(
    estado.documentos
      .filter((documento) => documento.estado === 'registrado')
      .map((documento) => documento.id),
  )
}

function comprasRegistradas(estado: EstadoContable): Compra[] {
  const registrados = documentosRegistrados(estado)
  return estado.compras.filter((compra) => registrados.has(compra.documentoId))
}

function ventasRegistradas(estado: EstadoContable): Venta[] {
  const registrados = documentosRegistrados(estado)
  return estado.ventas.filter((venta) => registrados.has(venta.documentoId))
}

describe('estado demo', () => {
  it('contiene exactamente los maestros y operaciones requeridos', () => {
    const estado = crearEstado()

    expect(estado.version).toBe(VERSION_ESQUEMA)
    expect(estado.proveedores).toHaveLength(5)
    expect(estado.clientes).toHaveLength(5)
    expect(estado.productos).toHaveLength(10)
    expect(estado.compras).toHaveLength(8)
    expect(estado.ventas).toHaveLength(8)
    expect(estado.pagos).toHaveLength(5)
    expect(estado.cobros).toHaveLength(5)
    expect(estado.transferencias.length).toBeGreaterThanOrEqual(1)

    expect(estado.productos.filter((producto) => producto.tipo === 'producto')).toHaveLength(7)
    expect(estado.productos.filter((producto) => producto.tipo === 'servicio')).toHaveLength(3)
  })

  it('incluye apertura, amortización y asientos propuestos y registrados', () => {
    const estado = crearEstado()

    expect(estado.asientos.some((asiento) => asiento.origen === 'apertura')).toBe(true)
    expect(estado.asientos.some((asiento) => asiento.origen === 'amortizacion')).toBe(true)
    expect(estado.asientos.some((asiento) => asiento.estado === 'registrado')).toBe(true)
    expect(estado.asientos.some((asiento) => asiento.estado === 'propuesto')).toBe(true)

    const apertura = estado.asientos.find((asiento) => asiento.origen === 'apertura')
    expect(totalDebe(apertura!)).toBe(2_004_500_000)
    expect(totalHaber(apertura!)).toBe(2_004_500_000)

    const amortizacion = estado.asientos.find((asiento) => asiento.origen === 'amortizacion')
    expect(totalDebe(amortizacion!)).toBe(AMORTIZACION_MENSUAL_EQUIPOS)
    expect(AMORTIZACION_MENSUAL_EQUIPOS).toBe(3_333_333)
  })

  it('mantiene todos los asientos balanceados y con cuentas imputables', () => {
    const estado = crearEstado()
    const cuentas = new Map(estado.cuentas.map((cuenta) => [cuenta.codigo, cuenta]))

    for (const asiento of estado.asientos) {
      expect(asientoBalanceado(asiento), `${asiento.id} debe estar balanceado`).toBe(true)
      expect(validarAsiento(asiento), `${asiento.id} debe ser válido`).toEqual([])

      for (const linea of asiento.lineas) {
        const cuenta = cuentas.get(linea.cuentaId)
        expect(cuenta, `Cuenta inexistente ${linea.cuentaId} en ${asiento.id}`).toBeDefined()
        expect(cuenta!.imputable, `Cuenta no imputable ${linea.cuentaId}`).toBe(true)
        expect(Number.isInteger(linea.debe)).toBe(true)
        expect(Number.isInteger(linea.haber)).toBe(true)
      }
    }
  })

  it('vincula documentos, asientos y operaciones sin referencias huérfanas', () => {
    const estado = crearEstado()
    const documentos = new Map(estado.documentos.map((documento) => [documento.id, documento]))
    const asientos = new Map(estado.asientos.map((asiento) => [asiento.id, asiento]))

    for (const documento of estado.documentos) {
      expect(asientos.has(documento.asientoId), `Documento ${documento.id}`).toBe(true)
    }

    for (const asiento of estado.asientos) {
      if (asiento.documentoId) {
        expect(documentos.has(asiento.documentoId), `Asiento ${asiento.id}`).toBe(true)
      }
    }

    const operaciones = [
      ...estado.compras.map((compra) => ({
        documentoId: compra.documentoId,
        asientoId: compra.asientoId,
        operacionId: compra.id,
      })),
      ...estado.ventas.map((venta) => ({
        documentoId: venta.documentoId,
        asientoId: venta.asientoId,
        operacionId: venta.id,
      })),
      ...estado.pagos.map((pago) => ({
        documentoId: pago.documentoId,
        asientoId: pago.asientoId,
        operacionId: pago.id,
      })),
      ...estado.cobros.map((cobro) => ({
        documentoId: cobro.documentoId,
        asientoId: cobro.asientoId,
        operacionId: cobro.id,
      })),
      ...estado.transferencias.map((transferencia) => ({
        documentoId: transferencia.documentoId,
        asientoId: transferencia.asientoId,
        operacionId: transferencia.id,
      })),
    ]

    for (const operacion of operaciones) {
      const documento = documentos.get(operacion.documentoId)
      expect(documento, `Documento ${operacion.documentoId}`).toBeDefined()
      expect(documento!.asientoId).toBe(operacion.asientoId)
      expect(documento!.operacionId).toBe(operacion.operacionId)
      expect(asientos.has(operacion.asientoId)).toBe(true)
    }
  })

  it('deja como propuestos solo los comprobantes pendientes C-008 y V-008', () => {
    const estado = crearEstado()
    const propuestos = estado.asientos.filter((asiento) => asiento.estado === 'propuesto')
    const pendientes = estado.documentos.filter((documento) => documento.estado !== 'registrado')

    expect(propuestos).toHaveLength(2)
    expect(pendientes).toHaveLength(2)
    expect(pendientes.map((documento) => documento.id).sort()).toEqual([
      'doc-compra-C-008',
      'doc-venta-V-008',
    ])

    expect(propuestos.map((asiento) => asiento.id).sort()).toEqual([
      'asiento-compra-C-008',
      'asiento-venta-V-008',
    ])
    for (const asiento of propuestos) {
      expect(asiento.numero).toBeNull()
    }

    const c008 = estado.documentos.find((documento) => documento.id === 'doc-compra-C-008')
    const v008 = estado.documentos.find((documento) => documento.id === 'doc-venta-V-008')
    expect(c008?.estado).toBe('en_revision')
    expect(v008?.estado).toBe('pendiente')
  })

  it('numera de forma correlativa solo los asientos registrados', () => {
    const estado = crearEstado()
    const registrados = estado.asientos.filter((asiento) => asiento.estado === 'registrado')
    const numeros = registrados.map((asiento) => asiento.numero).sort((a, b) => a! - b!)

    expect(new Set(numeros).size).toBe(numeros.length)
    expect(numeros[0]).toBe(1)
    expect(numeros[numeros.length - 1]).toBe(registrados.length)
    expect(numeros.every((numero) => Number.isInteger(numero))).toBe(true)
  })

  it('incluye un pago parcial y un cobro parcial', () => {
    const estado = crearEstado()

    for (const compra of estado.compras) {
      expect(compra.estado).toBe(estadoPagoCompra(compra, estado.pagos))
    }
    for (const venta of estado.ventas) {
      expect(venta.estado).toBe(estadoCobroVenta(venta, estado.cobros))
    }

    const compraParcial = estado.compras.filter((compra) => compra.estado === 'parcial')
    const ventaParcial = estado.ventas.filter((venta) => venta.estado === 'parcial')

    expect(compraParcial).toHaveLength(1)
    expect(compraParcial[0]!.id).toBe('C-001')
    expect(ventaParcial).toHaveLength(1)
    expect(ventaParcial[0]!.id).toBe('V-001')

    const pagosC001 = estado.pagos.filter((pago) => pago.compraId === 'C-001')
    const cobrosV001 = estado.cobros.filter((cobro) => cobro.ventaId === 'V-001')
    expect(pagosC001).toHaveLength(1)
    expect(cobrosV001).toHaveLength(1)
    expect(pagosC001[0]!.importe).toBeLessThan(compraParcial[0]!.total)
    expect(cobrosV001[0]!.importe).toBeLessThan(ventaParcial[0]!.total)
  })

  it('valoriza el stock final exactamente igual al saldo de Mercaderías', () => {
    const estado = crearEstado()
    const diario = derivarLibroDiario(estado.asientos, estado.cuentas)
    const mayor = derivarLibroMayor(diario, estado.cuentas)
    const stock = derivarStock(
      estado.productos,
      comprasRegistradas(estado),
      ventasRegistradas(estado),
    )
    const valorStock = stock.reduce((total, producto) => total + producto.valorStock, 0)

    expect(stock.reduce((total, producto) => total + producto.stockInicial, 0)).toBe(39)
    expect(valorStock).toBe(1_476_500_000)
    expect(mayor[CODIGOS.MERCADERIAS]?.saldoFinal).toBe(valorStock)
  })

  it('hace coincidir la tesorería almacenada con la derivada de los asientos', () => {
    const estado = crearEstado()
    const diario = derivarLibroDiario(estado.asientos, estado.cuentas)
    const mayor = derivarLibroMayor(diario, estado.cuentas)
    const movimientos = derivarMovimientosTesoreria(estado.asientos)
    const saldos = derivarSaldosTesoreria(movimientos)

    expect(estado.movimientos).toEqual(movimientos)

    const caja = saldos.find((saldo) => saldo.cuentaId === CODIGOS.CAJA)
    const banco = saldos.find((saldo) => saldo.cuentaId === CODIGOS.BANCO)

    expect(caja?.saldoFinal).toBe(170_000_000)
    expect(banco?.saldoFinal).toBe(477_460_000)
    expect(mayor[CODIGOS.CAJA]?.saldoFinal).toBe(caja?.saldoFinal)
    expect(mayor[CODIGOS.BANCO]?.saldoFinal).toBe(banco?.saldoFinal)
  })

  it('liquida el IVA del período y deja los saldos fiscales cerrados', () => {
    const estado = crearEstado()
    const diario = derivarLibroDiario(estado.asientos, estado.cuentas)
    const mayor = derivarLibroMayor(diario, estado.cuentas)

    const ivaCredito = comprasRegistradas(estado).reduce((total, compra) => total + compra.iva, 0)
    const ivaDebito = ventasRegistradas(estado).reduce((total, venta) => total + venta.iva, 0)

    expect(ivaCredito).toBe(299_355_000)
    expect(ivaDebito).toBe(193_725_000)
    expect(mayor[CODIGOS.IVA_CREDITO]?.saldoFinal).toBe(0)
    expect(mayor[CODIGOS.IVA_DEBITO]?.saldoFinal).toBe(0)
    expect(mayor[CODIGOS.IVA_SALDO_FAVOR]?.saldoFinal).toBe(105_630_000)
    expect(mayor[CODIGOS.IVA_A_PAGAR]?.saldoFinal).toBe(0)
  })

  it('cierra el Estado de Resultados con el impuesto provisionado', () => {
    const estado = crearEstado()
    const diario = derivarLibroDiario(estado.asientos, estado.cuentas)
    const mayor = derivarLibroMayor(diario, estado.cuentas)
    const balance = derivarBalanceComprobacion(mayor, estado.cuentas)
    const resultado = derivarEstadoResultados(balance, estado.cuentas)

    expect(resultado.ventasNetas).toBe(797_500_000)
    expect(resultado.totalIngresos).toBe(922_500_000)
    expect(resultado.costoVentas).toBe(518_500_000)
    expect(resultado.resultadoBruto).toBe(404_000_000)
    expect(resultado.totalGastosOperativos).toBe(286_833_333)
    expect(resultado.resultadoOperativo).toBe(117_166_667)
    expect(resultado.resultadoAntesImpuestos).toBe(117_166_667)
    expect(resultado.impuestoGanancias).toBe(29_291_667)
    expect(resultado.resultadoEjercicio).toBe(87_875_000)
  })

  it('verifica la ecuación patrimonial del estado demo', () => {
    const estado = crearEstado()
    const diario = derivarLibroDiario(estado.asientos, estado.cuentas)
    const mayor = derivarLibroMayor(diario, estado.cuentas)
    const balance = derivarBalanceComprobacion(mayor, estado.cuentas)
    const resultado = derivarEstadoResultados(balance, estado.cuentas)
    const situacion = derivarEstadoSituacionPatrimonial(balance, estado.cuentas, resultado)

    expect(situacion.ecuacionVerificada).toBe(true)
    expect(situacion.diferencia).toBe(0)
    expect(situacion.totalActivo).toBe(situacion.totalPasivo + situacion.totalPatrimonioNeto)
    expect(situacion.totalActivo).toBe(2_981_431_667)
    expect(situacion.totalPasivo).toBe(889_056_667)
    expect(situacion.totalPatrimonioNeto).toBe(2_092_375_000)
  })

  it('concilla los saldos de terceros con las cuentas de control', () => {
    const estado = crearEstado()
    const diario = derivarLibroDiario(estado.asientos, estado.cuentas)
    const mayor = derivarLibroMayor(diario, estado.cuentas)

    const saldosProveedores = derivarSaldosProveedores(
      estado.proveedores,
      estado.compras,
      estado.pagos,
      estado.documentos,
    )
    const saldosClientes = derivarSaldosClientes(
      estado.clientes,
      estado.ventas,
      estado.cobros,
      estado.documentos,
    )

    expect(saldosProveedores.reduce((total, proveedor) => total + proveedor.saldo, 0)).toBe(
      -(mayor[CODIGOS.PROVEEDORES]?.saldoFinal ?? 0),
    )
    expect(saldosClientes.reduce((total, cliente) => total + cliente.saldo, 0)).toBe(
      mayor[CODIGOS.DEUDORES]?.saldoFinal,
    )
  })

  it('no comparte referencias entre dos construcciones del estado', () => {
    const primero = crearEstado()
    const segundo = crearEstado()

    primero.documentos[0]!.estado = 'observado'
    primero.asientos[0]!.lineas[0]!.debe = 1

    expect(segundo.documentos[0]!.estado).not.toBe('observado')
    expect(segundo.asientos[0]!.lineas[0]!.debe).not.toBe(1)
  })
})
