import { crearEstadoDemo } from '@/data/demo'
import { USUARIO_DEMO } from '@/data/catalogos'
import { VERSION_ESQUEMA } from '@/core/version'
import type { EstadoContable } from '@/types/contabilidad'

export { VERSION_ESQUEMA }

/** Límite aproximado de localStorage en navegadores de escritorio. */
export const LIMITE_ESTIMADO_ALMACENAMIENTO = 5 * 1024 * 1024

/** Clave versionada para no mezclar datos de versiones incompatibles. */
export const CLAVE_ALMACENAMIENTO = `enigma-gestion:estado:v${VERSION_ESQUEMA}`

interface EnvoltorioPersistencia {
  version: number
  actualizadoEn: string
  estado: EstadoContable
}

function obtenerAlmacenamiento(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

function esEstadoValido(valor: unknown): valor is EstadoContable {
  if (!valor || typeof valor !== 'object') return false
  const estado = valor as Partial<EstadoContable>

  return (
    estado.version === VERSION_ESQUEMA &&
    Array.isArray(estado.cuentas) &&
    Array.isArray(estado.proveedores) &&
    Array.isArray(estado.clientes) &&
    Array.isArray(estado.productos) &&
    Array.isArray(estado.compras) &&
    Array.isArray(estado.ventas) &&
    Array.isArray(estado.pagos) &&
    Array.isArray(estado.cobros) &&
    Array.isArray(estado.transferencias) &&
    Array.isArray(estado.movimientos) &&
    Array.isArray(estado.documentos) &&
    Array.isArray(estado.asientos)
  )
}

/** Guarda el estado completo. Devuelve `false` si el almacenamiento no está disponible. */
export function guardarEstado(estado: EstadoContable): boolean {
  const almacenamiento = obtenerAlmacenamiento()
  if (!almacenamiento) return false

  const envoltorio: EnvoltorioPersistencia = {
    version: VERSION_ESQUEMA,
    actualizadoEn: new Date().toISOString(),
    estado,
  }

  try {
    almacenamiento.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(envoltorio))
    return true
  } catch {
    return false
  }
}

/** Recupera el estado persistido o `null` si no existe o es incompatible. */
export function cargarEstado(): EstadoContable | null {
  const almacenamiento = obtenerAlmacenamiento()
  if (!almacenamiento) return null

  const crudo = almacenamiento.getItem(CLAVE_ALMACENAMIENTO)
  if (!crudo) return null

  try {
    const envoltorio = JSON.parse(crudo) as Partial<EnvoltorioPersistencia>
    if (envoltorio.version !== VERSION_ESQUEMA) return null
    if (!esEstadoValido(envoltorio.estado)) return null
    return completarEstado(envoltorio.estado)
  } catch {
    return null
  }
}

/**
 * Completa campos incorporados después de la primera versión del esquema sin
 * invalidar los datos ya guardados en el navegador.
 */
function completarEstado(estado: EstadoContable): EstadoContable {
  if (!estado.usuario || typeof estado.usuario !== 'object') {
    estado.usuario = { ...USUARIO_DEMO }
  }
  return estado
}

export function borrarEstado(): void {
  const almacenamiento = obtenerAlmacenamiento()
  almacenamiento?.removeItem(CLAVE_ALMACENAMIENTO)
}

export function existeEstadoPersistido(): boolean {
  return obtenerAlmacenamiento()?.getItem(CLAVE_ALMACENAMIENTO) !== null
}

export interface UsoAlmacenamiento {
  disponible: boolean
  clave: string
  bytesEstado: number
  bytesTotales: number
  limiteEstimado: number
  porcentajeTotal: number
}

function bytesDeTexto(texto: string): number {
  if (typeof Blob !== 'undefined') return new Blob([texto]).size
  return texto.length * 2
}

/**
 * Devuelve el espacio ocupado por el estado de la demo y por el resto de las
 * claves del navegador. Es una estimación útil para la pantalla de configuración.
 */
export function obtenerUsoAlmacenamiento(): UsoAlmacenamiento {
  const almacenamiento = obtenerAlmacenamiento()
  if (!almacenamiento) {
    return {
      disponible: false,
      clave: CLAVE_ALMACENAMIENTO,
      bytesEstado: 0,
      bytesTotales: 0,
      limiteEstimado: LIMITE_ESTIMADO_ALMACENAMIENTO,
      porcentajeTotal: 0,
    }
  }

  const crudo = almacenamiento.getItem(CLAVE_ALMACENAMIENTO) ?? ''
  let bytesTotales = 0
  for (let indice = 0; indice < almacenamiento.length; indice += 1) {
    const clave = almacenamiento.key(indice)
    if (clave === null) continue
    const valor = almacenamiento.getItem(clave) ?? ''
    bytesTotales += bytesDeTexto(clave) + bytesDeTexto(valor)
  }

  return {
    disponible: true,
    clave: CLAVE_ALMACENAMIENTO,
    bytesEstado: bytesDeTexto(crudo),
    bytesTotales,
    limiteEstimado: LIMITE_ESTIMADO_ALMACENAMIENTO,
    porcentajeTotal: Math.min(100, (bytesTotales / LIMITE_ESTIMADO_ALMACENAMIENTO) * 100),
  }
}

/** Reemplaza los datos actuales por el estado demo original. */
export function restaurarEstadoDemo(): EstadoContable {
  const estado = crearEstadoDemo()
  guardarEstado(estado)
  return estado
}
