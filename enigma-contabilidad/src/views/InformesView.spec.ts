import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '@/router'
import { useUiStore } from '@/stores/ui'
import InformesView from '@/views/InformesView.vue'

async function montar(ruta = '/informes') {
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push(ruta)
  await router.isReady()
  const wrapper = mount(InformesView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, pinia }
}

function tabSeleccionada(wrapper: Awaited<ReturnType<typeof montar>>['wrapper']): string {
  return wrapper.find('.ui-tabs__tab[aria-selected="true"]').text()
}

describe('InformesView', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('muestra el resumen y el reporte de ventas por cliente', async () => {
    const { wrapper } = await montar()

    expect(wrapper.text()).toContain('Informes')
    expect(wrapper.text()).toContain('Solo operaciones registradas')
    expect(wrapper.text()).toContain('Ventas registradas')
    expect(wrapper.text()).toContain('Compras registradas')
    expect(wrapper.text()).toContain('Posición de IVA')
    expect(tabSeleccionada(wrapper)).toBe('Ventas por cliente')

    const panelVentas = wrapper.findAll('[role="tabpanel"]')[0]!
    expect(panelVentas.findAll('tbody tr').length).toBeGreaterThan(0)
    expect(panelVentas.text()).toContain('Clínica San Rafael S.R.L.')
  })

  it('abre la vista indicada por la ruta', async () => {
    const { wrapper } = await montar('/informes?vista=iva')

    expect(tabSeleccionada(wrapper)).toBe('IVA del período')
    expect(wrapper.text()).toContain('IVA débito fiscal')
    expect(wrapper.text()).toContain('IVA crédito fiscal')
    expect(wrapper.text()).toContain('IVA por alícuota')
  })

  it('filtra las operaciones por el período elegido', async () => {
    const { wrapper } = await montar()
    const fechas = wrapper.findAll('input[type="date"]')

    await fechas[0]!.setValue('2026-11-04')
    await fechas[1]!.setValue('2026-11-04')
    await flushPromises()

    expect(wrapper.find('.informes-filtros__ayuda').text()).toContain(
      'Mostrando operaciones desde el 2026-11-04 hasta el 2026-11-04.',
    )

    const panelVentas = wrapper.findAll('[role="tabpanel"]')[0]!
    expect(panelVentas.findAll('tbody tr')).toHaveLength(1)
    expect(panelVentas.text()).toContain('Clínica San Rafael S.R.L.')
  })

  it('avisa cuando el rango de fechas es inválido', async () => {
    const { wrapper } = await montar()
    const fechas = wrapper.findAll('input[type="date"]')

    await fechas[0]!.setValue('2026-12-01')
    await fechas[1]!.setValue('2026-11-01')
    await flushPromises()

    expect(wrapper.find('.informes-filtros__error').text()).toBe(
      'La fecha desde no puede ser posterior a la fecha hasta.',
    )
  })

  it('restablece el período de la demo', async () => {
    const { wrapper } = await montar()
    const fechas = wrapper.findAll('input[type="date"]')

    await fechas[0]!.setValue('2026-11-04')
    await fechas[1]!.setValue('2026-11-04')
    await flushPromises()

    const restablecer = wrapper
      .findAll('button')
      .find((boton) => boton.text().includes('Restablecer período'))
    expect(restablecer).toBeDefined()
    await restablecer!.trigger('click')
    await flushPromises()

    expect((fechas[0]!.element as HTMLInputElement).value).toBe('2026-11-01')
    expect((fechas[1]!.element as HTMLInputElement).value).toBe('2026-11-30')
  })

  it('exporta el informe activo como CSV', async () => {
    const crearUrl = vi.fn(() => 'blob:informe')
    const liberarUrl = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    Object.defineProperty(URL, 'createObjectURL', { value: crearUrl, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: liberarUrl, configurable: true })

    const { wrapper, pinia } = await montar()
    const exportar = wrapper
      .findAll('button')
      .find((boton) => boton.text().includes('Exportar CSV'))

    expect(exportar).toBeDefined()
    await exportar!.trigger('click')
    await flushPromises()

    setActivePinia(pinia)
    const ui = useUiStore()
    expect(crearUrl).toHaveBeenCalledTimes(1)
    expect(liberarUrl).toHaveBeenCalledWith('blob:informe')
    expect(ui.notificaciones.at(-1)).toMatchObject({
      tipo: 'exito',
      titulo: 'CSV generado',
    })
  })
})
