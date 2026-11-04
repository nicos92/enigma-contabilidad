import { crearEstadoDemo } from '@/data/demo'
import { VERSION_ESQUEMA } from '@/core/version'
import type { EstadoContable } from '@/types/contabilidad'

export { VERSION_ESQUEMA }

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
    return envoltorio.estado
  } catch {
    return null
  }
}

export function borrarEstado(): void {
  const almacenamiento = obtenerAlmacenamiento()
  almacenamiento?.removeItem(CLAVE_ALMACENAMIENTO)
}

export function existeEstadoPersistido(): boolean {
  return obtenerAlmacenamiento()?.getItem(CLAVE_ALMACENAMIENTO) !== null
}

/** Reemplaza los datos actuales por el estado demo original. */
export function restaurarEstadoDemo(): EstadoContable {
  const estado = crearEstadoDemo()
  guardarEstado(estado)
  return estado
}
