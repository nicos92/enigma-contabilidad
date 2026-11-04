import type {
  Cuenta,
  CuentaArbol,
  DocumentoContable,
  Asiento,
  EstadoDocumento,
  OrigenDocumento,
  TipoDocumento,
} from '@/types/contabilidad'

/* -------------------------------------------------------------------------- */
/* Etiquetas                                                                  */
/* -------------------------------------------------------------------------- */

export function etiquetaOrigenDocumento(origen: OrigenDocumento): string {
  switch (origen) {
    case 'apertura':
      return 'Apertura'
    case 'compras':
      return 'Compras'
    case 'ventas':
      return 'Ventas'
    case 'tesoreria':
      return 'Tesorería'
    case 'contaduria':
      return 'Contaduría'
  }
}

export function etiquetaTipoDocumento(tipo: TipoDocumento): string {
  switch (tipo) {
    case 'factura_recibida':
      return 'Factura recibida'
    case 'factura_emitida':
      return 'Factura emitida'
    case 'comprobante_pago':
      return 'Comprobante de pago'
    case 'recibo':
      return 'Recibo'
    case 'transferencia':
      return 'Transferencia'
    case 'asiento_apertura':
      return 'Asiento de apertura'
    case 'asiento_ajuste':
      return 'Asiento de ajuste'
    case 'liquidacion_iva':
      return 'Liquidación de IVA'
    case 'provision_impuesto':
      return 'Provisión de impuesto'
  }
}

export function etiquetaEstadoDocumento(estado: EstadoDocumento): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente'
    case 'en_revision':
      return 'En revisión'
    case 'aprobado':
      return 'Aprobado'
    case 'registrado':
      return 'Registrado'
    case 'observado':
      return 'Observado'
  }
}

export function tipoBadgeEstadoDocumento(estado: EstadoDocumento): string {
  switch (estado) {
    case 'registrado':
      return 'exito'
    case 'aprobado':
      return 'marca'
    case 'en_revision':
      return 'advertencia'
    case 'observado':
      return 'error'
    case 'pendiente':
      return 'info'
    default:
      return 'neutral'
  }
}

/* -------------------------------------------------------------------------- */
/* Filtros de documentos (bandeja)                                             */
/* -------------------------------------------------------------------------- */

export interface FiltrosDocumento {
  texto: string
  origen: OrigenDocumento | ''
  estado: EstadoDocumento | ''
  desde: string
  hasta: string
}

export function filtrosDocumentoVacios(): FiltrosDocumento {
  return { texto: '', origen: '', estado: '', desde: '', hasta: '' }
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function filtrarDocumentos(
  documentos: readonly DocumentoContable[],
  filtros: FiltrosDocumento,
): DocumentoContable[] {
  const consulta = normalizarTexto(filtros.texto)

  return documentos
    .filter((documento) => {
      const textoCoincide =
        !consulta ||
        [
          documento.numero,
          documento.descripcion,
          documento.contraparte ?? '',
          etiquetaOrigenDocumento(documento.origen),
          etiquetaTipoDocumento(documento.tipo),
        ]
          .map(normalizarTexto)
          .some((valor) => valor.includes(consulta))

      if (!textoCoincide) return false
      if (filtros.origen && documento.origen !== filtros.origen) return false
      if (filtros.estado && documento.estado !== filtros.estado) return false
      if (filtros.desde && documento.fecha < filtros.desde) return false
      if (filtros.hasta && documento.fecha > filtros.hasta) return false

      return true
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.numero.localeCompare(b.numero))
}

/* -------------------------------------------------------------------------- */
/* Filtros de asientos                                                        */
/* -------------------------------------------------------------------------- */

export interface FiltrosAsiento {
  texto: string
  origen: string
  estado: string
  desde: string
  hasta: string
  cuenta: string
}

export function filtrosAsientoVacios(): FiltrosAsiento {
  return { texto: '', origen: '', estado: '', desde: '', hasta: '', cuenta: '' }
}

export function filtrarAsientos(
  asientos: readonly Asiento[],
  documentos: readonly DocumentoContable[],
  filtros: FiltrosAsiento,
): Asiento[] {
  const consulta = normalizarTexto(filtros.texto)
  const documentosPorAsiento = new Map(documentos.map((doc) => [doc.asientoId, doc]))

  return asientos
    .filter((asiento) => {
      const documento = documentosPorAsiento.get(asiento.id)
      const textoCoincide =
        !consulta ||
        [
          String(asiento.numero ?? ''),
          asiento.concepto,
          asiento.origen,
          asiento.origenId ?? '',
          documento?.numero ?? '',
          documento?.contraparte ?? '',
        ]
          .map(normalizarTexto)
          .some((valor) => valor.includes(consulta))

      if (!textoCoincide) return false
      if (filtros.origen && asiento.origen !== filtros.origen) return false
      if (filtros.estado && asiento.estado !== filtros.estado) return false
      if (filtros.desde && asiento.fecha < filtros.desde) return false
      if (filtros.hasta && asiento.fecha > filtros.hasta) return false
      if (filtros.cuenta) {
        const tieneCuenta = asiento.lineas.some((linea) => linea.cuentaId === filtros.cuenta)
        if (!tieneCuenta) return false
      }

      return true
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.numero ?? 0) - (b.numero ?? 0))
}

/* -------------------------------------------------------------------------- */
/* Plan de cuentas: árbol                                                    */
/* -------------------------------------------------------------------------- */

export function construirArbolCuentas(cuentas: readonly Cuenta[]): CuentaArbol[] {
  const porCodigo = new Map<string, CuentaArbol>()
  for (const cuenta of cuentas) {
    porCodigo.set(cuenta.codigo, { ...cuenta, hijos: [] })
  }

  const raices: CuentaArbol[] = []
  for (const cuenta of cuentas) {
    const nodo = porCodigo.get(cuenta.codigo)!
    if (cuenta.padre && porCodigo.has(cuenta.padre)) {
      porCodigo.get(cuenta.padre)!.hijos.push(nodo)
    } else {
      raices.push(nodo)
    }
  }

  // ordenar hijos por código
  function ordenar(nodo: CuentaArbol): void {
    nodo.hijos.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
    nodo.hijos.forEach(ordenar)
  }
  raices.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
  raices.forEach(ordenar)

  return raices
}

export function aplanarArbolCuentas(arbol: readonly CuentaArbol[]): Cuenta[] {
  const resultado: Cuenta[] = []
  function recorrer(nodo: CuentaArbol): void {
    resultado.push(nodo)
    nodo.hijos.forEach(recorrer)
  }
  arbol.forEach(recorrer)
  return resultado
}

/* -------------------------------------------------------------------------- */
/* Cuenta sugerida / impuestos por documento                                  */
/* -------------------------------------------------------------------------- */

export function cuentasDelAsiento(asiento: Asiento): string[] {
  const conjunto = new Set<string>()
  for (const linea of asiento.lineas) {
    conjunto.add(linea.cuentaId)
  }
  return [...conjunto]
}

export const construirPlanCuentas = construirArbolCuentas
export const arbolPlanCuentas = construirArbolCuentas
export const planCuentasArbol = construirArbolCuentas
export const filtrarBandeja = filtrarDocumentos

export function totalImpuestosDocumento(_documento: DocumentoContable, asiento?: Asiento): number {
  if (!asiento) return 0
  return (
    asiento.lineas
      .filter(
        (linea) =>
          linea.cuentaId.includes('IVA') ||
          linea.cuentaId.includes('1.1.04') ||
          linea.cuentaId.includes('2.1.02'),
      )
      .reduce((total, linea) => total + linea.debe + linea.haber, 0) / 2
  )
}
