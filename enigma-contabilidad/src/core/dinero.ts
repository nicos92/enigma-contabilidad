/**
 * Todos los importes de la aplicación se guardan en centavos enteros.
 * Este módulo concentra las operaciones para evitar diferencias de redondeo.
 */

export const CENTAVOS_POR_PESO = 100

export function sumar(...importes: number[]): number {
  return importes.reduce((total, importe) => total + importe, 0)
}

export function sumarImportes(importes: readonly number[]): number {
  return importes.reduce((total, importe) => total + importe, 0)
}

/** Convierte pesos con decimales a centavos enteros. */
export function desdePesos(pesos: number): number {
  return Math.round(pesos * CENTAVOS_POR_PESO)
}

/** Convierte centavos a pesos (solo para cálculo o presentación). */
export function aPesos(centavos: number): number {
  return centavos / CENTAVOS_POR_PESO
}

/**
 * Calcula un porcentaje redondeando al centavo más cercano.
 * Se usa, por ejemplo, para IVA y amortizaciones.
 */
export function calcularPorcentaje(importe: number, porcentaje: number): number {
  return Math.round((importe * porcentaje) / 100)
}

export function calcularIva(subtotal: number, alicuota: number): number {
  return calcularPorcentaje(subtotal, alicuota)
}

export interface TotalesOperacion {
  subtotal: number
  iva: number
  total: number
}

export interface LineaCalculable {
  cantidad: number
  precioUnitario: number
  alicuotaIva: number
}

/** Calcula subtotal, IVA y total de un conjunto de ítems. */
export function calcularTotales(items: readonly LineaCalculable[]): TotalesOperacion {
  let subtotal = 0
  let iva = 0

  for (const item of items) {
    const importeLinea = item.cantidad * item.precioUnitario
    subtotal += importeLinea
    iva += calcularIva(importeLinea, item.alicuotaIva)
  }

  return {
    subtotal,
    iva,
    total: subtotal + iva,
  }
}

const formateadorMoneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const formateadorNumero = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formatea centavos como `$ 1.250.000,00`. */
export function formatearMoneda(centavos: number): string {
  return formateadorMoneda.format(aPesos(centavos))
}

/** Formatea centavos sin símbolo de moneda. */
export function formatearImporte(centavos: number): string {
  return formateadorNumero.format(aPesos(centavos))
}

/** Formatea una fecha ISO `YYYY-MM-DD` como `DD/MM/AAAA`. */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-')
  if (!anio || !mes || !dia) return fecha
  return `${dia}/${mes}/${anio}`
}

/** Devuelve un número con signo explícito, útil para diferencias. */
export function formatearDiferencia(centavos: number): string {
  const signo = centavos > 0 ? '+' : ''
  return `${signo}${formatearMoneda(centavos)}`
}
