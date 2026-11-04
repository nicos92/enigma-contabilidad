import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  asientoBalanceado,
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
  siguienteNumeroAsiento,
} from '@/core/contabilidad'
import { cargarEstado, guardarEstado, restaurarEstadoDemo } from '@/core/persistencia'
import { crearEstadoDemo } from '@/data/demo'
import type {
  Asiento,
  DatosEmpresa,
  EstadoContable,
  ResultadoAprobacion,
} from '@/types/contabilidad'

/**
 * Estado central de la demo. Toda la información contable se deriva de los
 * asientos registrados; las operaciones comerciales conservan su documento de
 * origen para la trazabilidad.
 */
export const useContabilidadStore = defineStore('contabilidad', () => {
  const estadoPersistido = cargarEstado()
  const estado = ref<EstadoContable>(estadoPersistido ?? crearEstadoDemo())

  if (!estadoPersistido) {
    guardarEstado(estado.value)
  }

  function persistir(): boolean {
    return guardarEstado(estado.value)
  }

  /* Asientos --------------------------------------------------------------- */
  const asientosRegistrados = computed(() =>
    estado.value.asientos.filter((asiento) => asiento.estado === 'registrado'),
  )
  const asientosPropuestos = computed(() =>
    estado.value.asientos.filter((asiento) => asiento.estado === 'propuesto'),
  )

  const documentosRegistrados = computed(
    () =>
      new Set(
        estado.value.documentos.filter((doc) => doc.estado === 'registrado').map((doc) => doc.id),
      ),
  )

  const documentosPendientes = computed(() =>
    estado.value.documentos.filter((documento) => documento.estado !== 'registrado'),
  )

  /* Libros y estados ------------------------------------------------------- */
  const libroDiario = computed(() =>
    derivarLibroDiario(estado.value.asientos, estado.value.cuentas),
  )

  const libroMayor = computed(() => derivarLibroMayor(libroDiario.value, estado.value.cuentas))

  const balanceComprobacion = computed(() =>
    derivarBalanceComprobacion(libroMayor.value, estado.value.cuentas),
  )

  const estadoResultados = computed(() =>
    derivarEstadoResultados(balanceComprobacion.value, estado.value.cuentas),
  )

  const estadoSituacionPatrimonial = computed(() =>
    derivarEstadoSituacionPatrimonial(
      balanceComprobacion.value,
      estado.value.cuentas,
      estadoResultados.value,
    ),
  )

  /* Tesorería -------------------------------------------------------------- */
  const movimientosTesoreria = computed(() =>
    [...estado.value.movimientos].sort(
      (a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id),
    ),
  )

  const saldosTesoreria = computed(() => derivarSaldosTesoreria(estado.value.movimientos))

  /* Maestros y stock ------------------------------------------------------- */
  const comprasRegistradas = computed(() =>
    estado.value.compras.filter((compra) => documentosRegistrados.value.has(compra.documentoId)),
  )
  const ventasRegistradas = computed(() =>
    estado.value.ventas.filter((venta) => documentosRegistrados.value.has(venta.documentoId)),
  )

  const stockProductos = computed(() =>
    derivarStock(estado.value.productos, comprasRegistradas.value, ventasRegistradas.value),
  )

  const saldosProveedores = computed(() =>
    derivarSaldosProveedores(
      estado.value.proveedores,
      estado.value.compras,
      estado.value.pagos,
      estado.value.documentos,
    ),
  )

  const saldosClientes = computed(() =>
    derivarSaldosClientes(
      estado.value.clientes,
      estado.value.ventas,
      estado.value.cobros,
      estado.value.documentos,
    ),
  )

  /* Acciones --------------------------------------------------------------- */

  function saldoCuenta(codigo: string): number {
    return libroMayor.value[codigo]?.saldoFinal ?? 0
  }

  /**
   * Agrega los movimientos de tesorería que correspondan a un asiento recién
   * registrado, sin duplicar los que ya existan para ese comprobante.
   */
  function asegurarMovimientosTesoreria(asiento: Asiento): void {
    for (const movimiento of derivarMovimientosTesoreria([asiento])) {
      const existe = estado.value.movimientos.some(
        (actual) =>
          actual.asientoId === movimiento.asientoId &&
          actual.cuentaId === movimiento.cuentaId &&
          actual.tipo === movimiento.tipo &&
          actual.importe === movimiento.importe,
      )
      if (!existe) {
        estado.value.movimientos.push(movimiento)
      }
    }
  }

  /**
   * Aprueba y registra el asiento de un documento. Es idempotente: si el
   * documento ya fue registrado, no genera un segundo asiento.
   */
  function aprobarDocumento(documentoId: string): ResultadoAprobacion {
    const documento = estado.value.documentos.find((doc) => doc.id === documentoId)
    if (!documento) {
      return { ok: false, duplicado: false, motivo: 'documento_no_encontrado' }
    }

    const asiento = estado.value.asientos.find(
      (asientoContable) => asientoContable.id === documento.asientoId,
    )
    if (!asiento) {
      return { ok: false, duplicado: false, motivo: 'asiento_no_encontrado' }
    }

    if (documento.estado === 'registrado' || asiento.estado === 'registrado') {
      return {
        ok: true,
        duplicado: true,
        asientoId: asiento.id,
        numero: asiento.numero,
      }
    }

    if (documento.estado === 'observado') {
      return { ok: false, duplicado: false, motivo: 'documento_observado' }
    }

    if (!asientoBalanceado(asiento)) {
      return { ok: false, duplicado: false, motivo: 'asiento_desbalanceado' }
    }

    const registracionPrevia = estado.value.asientos.some(
      (asientoContable) =>
        asientoContable.id !== asiento.id &&
        asientoContable.estado === 'registrado' &&
        asientoContable.origen === asiento.origen &&
        asientoContable.origenId === asiento.origenId,
    )

    if (registracionPrevia) {
      return { ok: true, duplicado: true, asientoId: asiento.id, numero: null }
    }

    asiento.estado = 'registrado'
    asiento.numero = siguienteNumeroAsiento(estado.value.asientos)
    asiento.fechaRegistro = asiento.fecha
    documento.estado = 'registrado'

    asegurarMovimientosTesoreria(asiento)
    persistir()

    return {
      ok: true,
      duplicado: false,
      asientoId: asiento.id,
      numero: asiento.numero,
    }
  }

  /** Actualiza los datos institucionales de la empresa y los persiste. */
  function actualizarEmpresa(cambios: Partial<DatosEmpresa>): void {
    estado.value.empresa = { ...estado.value.empresa, ...cambios }
    persistir()
  }

  /** Reemplaza el estado actual por los datos demo originales. */
  function restaurarDemo(): void {
    estado.value = restaurarEstadoDemo()
  }

  /** Vuelve al estado en memoria sin tocar la persistencia. Útil para pruebas. */
  function reiniciarEnMemoria(): void {
    estado.value = crearEstadoDemo()
  }

  return {
    estado,
    asientosRegistrados,
    asientosPropuestos,
    documentosPendientes,
    libroDiario,
    libroMayor,
    balanceComprobacion,
    estadoResultados,
    estadoSituacionPatrimonial,
    movimientosTesoreria,
    saldosTesoreria,
    comprasRegistradas,
    ventasRegistradas,
    stockProductos,
    saldosProveedores,
    saldosClientes,
    saldoCuenta,
    aprobarDocumento,
    actualizarEmpresa,
    restaurarDemo,
    reiniciarEnMemoria,
    persistir,
  }
})
