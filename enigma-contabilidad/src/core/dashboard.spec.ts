import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  agruparIngresosEgresosPorSemana,
  construirIndicadores,
  construirUltimasOperaciones,
  documentosPendientesAprobacion,
  operacionesPendientesRegistracion,
} from '@/core/dashboard'
import { useContabilidadStore } from '@/stores/contabilidad'

function iniciarStore() {
  localStorage.clear()
  setActivePinia(createPinia())
  return useContabilidadStore()
}

function sumar(importes: readonly number[]): number {
  return importes.reduce((total, importe) => total + importe, 0)
}

describe('dashboard', () => {
  beforeEach(() => {
    iniciarStore()
  })

  it('calcula los seis indicadores desde las operaciones registradas', () => {
    const store = iniciarStore()
    const indicadores = construirIndicadores({
      ventas: store.ventasRegistradas,
      compras: store.comprasRegistradas,
      saldosClientes: store.saldosClientes,
      saldosProveedores: store.saldosProveedores,
      saldosTesoreria: store.saldosTesoreria,
      resultadoEjercicio: store.estadoResultados.resultadoEjercicio,
    })

    expect(indicadores.ventas).toBe(sumar(store.ventasRegistradas.map((venta) => venta.total)))
    expect(indicadores.compras).toBe(sumar(store.comprasRegistradas.map((compra) => compra.total)))
    expect(indicadores.cuentasPorCobrar).toBe(
      sumar(store.saldosClientes.filter((saldo) => saldo.saldo > 0).map((saldo) => saldo.saldo)),
    )
    expect(indicadores.cuentasPorPagar).toBe(
      sumar(store.saldosProveedores.filter((saldo) => saldo.saldo > 0).map((saldo) => saldo.saldo)),
    )
    expect(indicadores.saldoDisponible).toBe(
      sumar(store.saldosTesoreria.map((saldo) => saldo.saldoFinal)),
    )
    expect(indicadores.resultadoEjercicio).toBe(store.estadoResultados.resultadoEjercicio)
  })

  it('agrupa los movimientos reales de caja y banco por semana', () => {
    const store = iniciarStore()
    const semanas = agruparIngresosEgresosPorSemana(
      store.movimientosTesoreria,
      store.estado.periodo,
    )

    expect(semanas).toHaveLength(5)
    expect(semanas[0]).toMatchObject({ desde: '2026-11-01', hasta: '2026-11-07' })
    expect(semanas[4]).toMatchObject({ desde: '2026-11-29', hasta: '2026-11-30' })

    const movimientosDelPeriodo = store.movimientosTesoreria.filter(
      (movimiento) =>
        movimiento.fecha >= store.estado.periodo.desde &&
        movimiento.fecha <= store.estado.periodo.hasta &&
        movimiento.origen !== 'apertura' &&
        movimiento.origen !== 'transferencia',
    )

    expect(sumar(semanas.map((semana) => semana.ingresos))).toBe(
      sumar(
        movimientosDelPeriodo
          .filter((movimiento) => movimiento.tipo === 'ingreso')
          .map((movimiento) => movimiento.importe),
      ),
    )
    expect(sumar(semanas.map((semana) => semana.egresos))).toBe(
      sumar(
        movimientosDelPeriodo
          .filter((movimiento) => movimiento.tipo === 'egreso')
          .map((movimiento) => movimiento.importe),
      ),
    )
    expect(semanas.some((semana) => semana.ingresos > 0)).toBe(true)
    expect(semanas.some((semana) => semana.egresos > 0)).toBe(true)
  })

  it('lista las últimas operaciones en orden cronológico descendente', () => {
    const store = iniciarStore()
    const operaciones = construirUltimasOperaciones(store.estado, 8)

    expect(operaciones).toHaveLength(8)
    expect(new Set(operaciones.map((operacion) => operacion.tipo))).toEqual(
      new Set(['compra', 'venta', 'pago', 'cobro', 'transferencia']),
    )

    for (let indice = 1; indice < operaciones.length; indice += 1) {
      expect(operaciones[indice - 1]!.fecha >= operaciones[indice]!.fecha).toBe(true)
    }
  })

  it('separa documentos por aprobar de asientos por registrar', () => {
    const store = iniciarStore()
    const documentos = documentosPendientesAprobacion(store.estado.documentos)
    const asientos = operacionesPendientesRegistracion(
      store.estado.asientos,
      store.estado.documentos,
    )

    expect(documentos.map((documento) => documento.id)).toEqual([
      'doc-venta-V-008',
      'doc-compra-C-008',
    ])
    expect(asientos).toHaveLength(2)
    expect(asientos.map((asiento) => asiento.asientoId)).toEqual([
      'asiento-venta-V-008',
      'asiento-compra-C-008',
    ])
  })

  it('actualiza los indicadores y pendientes al registrar una operación', () => {
    const store = iniciarStore()
    const antes = construirIndicadores({
      ventas: store.ventasRegistradas,
      compras: store.comprasRegistradas,
      saldosClientes: store.saldosClientes,
      saldosProveedores: store.saldosProveedores,
      saldosTesoreria: store.saldosTesoreria,
      resultadoEjercicio: store.estadoResultados.resultadoEjercicio,
    })

    expect(store.aprobarDocumento('doc-venta-V-008').ok).toBe(true)

    const despues = construirIndicadores({
      ventas: store.ventasRegistradas,
      compras: store.comprasRegistradas,
      saldosClientes: store.saldosClientes,
      saldosProveedores: store.saldosProveedores,
      saldosTesoreria: store.saldosTesoreria,
      resultadoEjercicio: store.estadoResultados.resultadoEjercicio,
    })

    expect(despues.ventas).toBeGreaterThan(antes.ventas)
    expect(despues.cuentasPorCobrar).toBeGreaterThan(antes.cuentasPorCobrar)
    expect(documentosPendientesAprobacion(store.estado.documentos)).toHaveLength(1)
    expect(
      operacionesPendientesRegistracion(store.estado.asientos, store.estado.documentos),
    ).toHaveLength(1)
  })
})
