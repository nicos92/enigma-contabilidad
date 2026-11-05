import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { router } from '@/router'
import { useRecorridoStore } from '@/stores/recorrido'
import { useUiStore } from '@/stores/ui'
import TrazabilidadView from '@/views/TrazabilidadView.vue'

async function montar(ruta = '/trazabilidad') {
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push(ruta)
  await router.isReady()
  const wrapper = mount(TrazabilidadView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, pinia }
}

function botonPorTexto(wrapper: Awaited<ReturnType<typeof montar>>['wrapper'], texto: string) {
  const boton = wrapper.findAll('button').find((actual) => actual.text().includes(texto))
  expect(boton).toBeDefined()
  return boton!
}

describe('TrazabilidadView', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('muestra el recorrido de nueve etapas de la compra demo por defecto', async () => {
    const { wrapper } = await montar()

    expect(wrapper.text()).toContain('Trazabilidad y recorrido guiado')
    expect(wrapper.findAll('.trazabilidad__etapa')).toHaveLength(9)
    expect(wrapper.text()).toContain('Origen en Compras')
    expect(wrapper.text()).toContain('Factura recibida')
    expect(wrapper.text()).toContain('Recepción en Contaduría')
    expect(wrapper.text()).toContain('Autorización y registración')
    expect(wrapper.text()).toContain('Asiento contable')
    expect(wrapper.text()).toContain('Libro Diario')
    expect(wrapper.text()).toContain('Libro Mayor')
    expect(wrapper.text()).toContain('Pago al proveedor')
    expect(wrapper.text()).toContain('Balance de comprobación')
    expect(wrapper.text()).toContain('8 / 9')
    expect(wrapper.text()).toContain('Parcial')
  })

  it('enlaza cada etapa con su pantalla y muestra fecha, referencia e importe', async () => {
    const { wrapper } = await montar()
    const enlaces = wrapper.findAll('.trazabilidad__enlace')
    const destinos = enlaces.map((enlace) => enlace.attributes('href'))

    expect(enlaces).toHaveLength(9)
    expect(destinos.every((destino) => Boolean(destino))).toBe(true)
    expect(destinos).toContain('#/compras?operacion=C-001&tab=factura')
    expect(destinos).toContain('#/contaduria?vista=asientos&asiento=asiento-compra-C-001')
    expect(destinos).toContain('#/tesoreria?vista=pagos&pago=P-001')
    expect(destinos.some((destino) => destino?.includes('/balances?vista=comprobacion'))).toBe(true)

    const primeraEtapa = wrapper.findAll('.trazabilidad__etapa')[0]!
    expect(primeraEtapa.text()).toContain('02/11/2026')
    expect(primeraEtapa.text()).toContain('FC-A-0001-00000101')
    expect(primeraEtapa.findAll('dt').map((termino) => termino.text())).toEqual([
      'Fecha',
      'Referencia',
      'Importe',
    ])
  })

  it('lista el recorrido guiado completo de 13 pasos', async () => {
    const { wrapper } = await montar()

    expect(wrapper.findAll('.trazabilidad__paso')).toHaveLength(13)
    expect(wrapper.text()).toContain('Recorrido guiado de 13 pasos')
    expect(wrapper.text()).toContain('Ingresar al Dashboard')
    expect(wrapper.text()).toContain('Registrar el pago al proveedor')
    expect(wrapper.text()).toContain('Consultar el balance de comprobación')
    expect(wrapper.text()).toContain('Registrar el cobro')
    expect(wrapper.text()).toContain('Comprobar la actualización contable')
  })

  it('permite seguir una venta y su cobro desde la ruta', async () => {
    const { wrapper } = await montar('/trazabilidad?tipo=venta&operacion=V-001')

    expect(wrapper.text()).toContain('Factura emitida')
    expect(wrapper.text()).toContain('Cobro al cliente')
    expect(
      wrapper.findAll('.trazabilidad__enlace').map((enlace) => enlace.attributes('href')),
    ).toContain('#/tesoreria?vista=cobros&cobro=K-001')
  })

  it('inicia el recorrido global desde la operación seleccionada', async () => {
    const { wrapper, pinia } = await montar()
    setActivePinia(pinia)
    const recorrido = useRecorridoStore()

    await botonPorTexto(wrapper, 'Iniciar recorrido').trigger('click')

    expect(recorrido.abierto).toBe(true)
    expect(recorrido.compraId).toBe('C-001')
    expect(recorrido.pasoActual?.clave).toBe('factura-recibida')
    expect(wrapper.find('.recorrido').exists()).toBe(false)
  })

  it('activa el modo presentación y abre el recorrido', async () => {
    const { wrapper, pinia } = await montar()
    setActivePinia(pinia)
    const ui = useUiStore()
    const recorrido = useRecorridoStore()

    await botonPorTexto(wrapper, 'Modo presentación').trigger('click')

    expect(ui.modoPresentacion).toBe(true)

    await botonPorTexto(wrapper, 'Presentar desde esta operación').trigger('click')

    expect(recorrido.abierto).toBe(true)
    expect(recorrido.compraId).toBe('C-001')
  })
})
