import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { router } from '@/router'
import BalancesView from '@/views/BalancesView.vue'

async function montar(ruta = '/balances') {
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push(ruta)
  await router.isReady()
  const wrapper = mount(BalancesView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, pinia }
}

describe('BalancesView', () => {
  beforeEach(() => localStorage.clear())

  it('muestra el balance de comprobación por defecto', async () => {
    const { wrapper } = await montar()

    expect(wrapper.find('.balances--comprobacion').exists()).toBe(true)
    expect(wrapper.text()).toContain('Balance de comprobación de sumas y saldos')
    expect(wrapper.text()).toContain('Total sumas Debe')
    expect(wrapper.text()).toContain('Total sumas Haber')
    expect(wrapper.text()).toContain('Verificación Debe = Haber y deudores = acreedores')
    expect(wrapper.findAll('tbody tr').length).toBeGreaterThan(0)
  })

  it('abre el Estado de Situación Patrimonial desde la ruta', async () => {
    const { wrapper } = await montar('/balances?vista=situacion-patrimonial')

    expect(wrapper.find('.balances--situacion-patrimonial').exists()).toBe(true)
    expect(wrapper.text()).toContain('TOTAL DEL ACTIVO')
    expect(wrapper.text()).toContain('TOTAL DEL PASIVO')
    expect(wrapper.text()).toContain('TOTAL PASIVO + PATRIMONIO NETO')
    expect(wrapper.text()).toContain('Verificación Activo = Pasivo + Patrimonio Neto')
    expect(wrapper.text()).toContain('Verificada')
  })

  it('muestra el Estado de Resultados con el resultado del ejercicio', async () => {
    const { wrapper } = await montar('/balances?vista=resultados')

    expect(wrapper.find('.balances--resultados').exists()).toBe(true)
    expect(wrapper.text()).toContain('Ventas netas')
    expect(wrapper.text()).toContain('Costo de ventas')
    expect(wrapper.text()).toContain('Resultado bruto')
    expect(wrapper.text()).toContain('Resultado operativo')
    expect(wrapper.text()).toContain('RESULTADO DEL EJERCICIO')
    expect(wrapper.text()).toContain('Resultado conciliado')
  })

  it('muestra el Estado de Flujo de Efectivo conciliado', async () => {
    const { wrapper } = await montar('/balances?vista=flujo-efectivo')

    expect(wrapper.find('.balances--flujo-efectivo').exists()).toBe(true)
    expect(wrapper.text()).toContain('Efectivo al inicio del período')
    expect(wrapper.text()).toContain('Actividades operativas')
    expect(wrapper.text()).toContain('Actividades de inversión')
    expect(wrapper.text()).toContain('Actividades de financiación')
    expect(wrapper.text()).toContain('EFECTIVO AL CIERRE DEL PERÍODO')
    expect(wrapper.text()).toContain('Conciliado')
  })

  it('muestra la Evolución del Patrimonio Neto', async () => {
    const { wrapper } = await montar('/balances?vista=evolucion-patrimonio')

    expect(wrapper.find('.balances--evolucion-patrimonio').exists()).toBe(true)
    expect(wrapper.text()).toContain('Capital')
    expect(wrapper.text()).toContain('Resultados acumulados')
    expect(wrapper.text()).toContain('Resultado del ejercicio')
    expect(wrapper.text()).toContain('Saldo final')
    expect(wrapper.text()).toContain('Patrimonio neto')
  })

  it('abre el detalle del mayor de una cuenta del balance', async () => {
    const { wrapper } = await montar()

    const boton = wrapper.find('button[aria-label="Consultar detalle de la cuenta"]')
    expect(boton.exists()).toBe(true)

    await boton.trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain(
      'Movimientos del Libro Mayor que explican el saldo del Balance de Comprobación',
    )
  })

  it('abre el detalle de una cuenta desde el enlace profundo', async () => {
    await montar('/balances?vista=comprobacion&cuenta=1.1.02')
    await flushPromises()

    expect(document.body.textContent).toContain('Cuenta 1.1.02')
    expect(document.body.textContent).toContain('Saldo final')
    expect(document.body.textContent).toContain(
      'Movimientos del Libro Mayor que explican el saldo del Balance de Comprobación',
    )
  })
})
