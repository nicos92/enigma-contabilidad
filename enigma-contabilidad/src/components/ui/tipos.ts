/**
 * Tipos compartidos por los componentes del UI kit.
 */

export type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'peligro' | 'exito'
export type TamanoBoton = 'sm' | 'md' | 'lg'

export type TipoBadge = 'neutral' | 'marca' | 'exito' | 'advertencia' | 'error' | 'info'

export interface OpcionSelect {
  valor: string | number
  etiqueta: string
  deshabilitada?: boolean
}

export interface ColumnaTabla {
  clave: string
  titulo: string
  alineacion?: 'izquierda' | 'centro' | 'derecha'
  ancho?: string
}

export interface TabItem {
  id: string
  etiqueta: string
  badge?: string | number
  deshabilitada?: boolean
}

export interface ParteDocumentoVista {
  nombre: string
  cuit?: string
  direccion?: string
  condicionIva?: string
  logoSrc?: string | null
}

export interface ItemDocumentoVista {
  descripcion: string
  cantidad: number
  precioUnitario: number
  alicuotaIva?: number
}

export interface DocumentoVista {
  tipoEtiqueta: string
  numero: string
  fecha: string
  estadoEtiqueta?: string
  emisor: ParteDocumentoVista
  receptor: ParteDocumentoVista
  items: readonly ItemDocumentoVista[]
  subtotal: number
  iva: number
  total: number
  observaciones?: string
}

export type EstadoPaso = 'completado' | 'actual' | 'pendiente' | 'observado'

export interface PasoTimeline {
  titulo: string
  descripcion?: string
  fecha?: string
  estado: EstadoPaso
  to?: string
}
