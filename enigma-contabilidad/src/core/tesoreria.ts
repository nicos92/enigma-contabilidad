export * from '@/core/pagos'
export * from '@/core/transferencias'
export {
  MEDIOS_COBRO,
  etiquetaMedioCobro,
  siguienteIdCobro,
  siguienteNumeroCobro,
  siguienteNumeroComprobanteCobro,
  siguienteIdComprobanteCobro,
  siguienteNumeroRecibo,
  filtrosCobroVacios,
  estadoContableCobro,
  filtrarCobros,
  resumirCobros,
  validarCobro,
  hayErroresCobro,
  generarCobro,
} from '@/core/cobros'
export { cuentaIdPorMedio as cuentaIdPorMedioCobro } from '@/core/cobros'