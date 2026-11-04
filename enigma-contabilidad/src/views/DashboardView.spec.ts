import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { router } from '@/router'
import DashboardView from '@/views/DashboardView.vue'

async function montarDashboard() {
  const wrapper = mount(DashboardView, {
    global: {
      plugins: [createPinia(), router],
      stubs: {
        GraficoIngresosEgresos: true,
      },
    },
  })

  await flushPromises()
  return wrapper
}

describe('DashboardView', () => {
  beforeEach(async () => {
    localStorage.clear()
    await router.push('/dashboard')
    await router.isReady()
  })

  it('muestra los seis indicadores del período', async () => {
    const wrapper = await montarDashboard()
    const indicadores = wrapper.findAll('.dashboard-kpi')

    expect(indicadores).toHaveLength(6)
    expect(wrapper.text()).toContain('Ventas del mes')
    expect(wrapper.text()).toContain('Compras del mes')
    expect(wrapper.text()).toContain('Cuentas por cobrar')
    expect(wrapper.text()).toContain('Cuentas por pagar')
    expect(wrapper.text()).toContain('Saldo disponible')
    expect(wrapper.text()).toContain('Resultado del ejercicio')
    expect(wrapper.text()).toContain('Contabilidad conciliada')
  })

  it('enlaza los accesos rápidos con el formulario correspondiente', async () => {
    const wrapper = await montarDashboard()
    const accesos = wrapper.findAll('.dashboard-acceso')
    const destinos = accesos.map((acceso) => acceso.attributes('href'))

    expect(accesos).toHaveLength(4)
    expect(destinos).toContain('#/compras?vista=nueva')
    expect(destinos).toContain('#/ventas?vista=nueva')
    expect(destinos).toContain('#/tesoreria?vista=pagos&accion=nuevo')
    expect(destinos).toContain('#/tesoreria?vista=cobros&accion=nuevo')
  })

  it('enlaza los pendientes con la bandeja y los asientos', async () => {
    const wrapper = await montarDashboard()
    const pendientes = wrapper.findAll('.dashboard-pendiente')
    const destinos = pendientes.map((pendiente) => pendiente.attributes('href'))

    expect(pendientes).toHaveLength(4)
    expect(destinos.some((destino) => destino?.includes('documento=doc-venta-V-008'))).toBe(true)
    expect(destinos.some((destino) => destino?.includes('documento=doc-compra-C-008'))).toBe(true)
    expect(destinos.some((destino) => destino?.includes('asiento=asiento-venta-V-008'))).toBe(true)
    expect(destinos.some((destino) => destino?.includes('asiento=asiento-compra-C-008'))).toBe(true)
  })

  it('muestra las últimas operaciones y el acceso al recorrido guiado', async () => {
    const wrapper = await montarDashboard()

    expect(wrapper.findAll('.dashboard-tabla tbody tr')).toHaveLength(8)
    expect(wrapper.text()).toContain('Últimas operaciones')
    expect(wrapper.text()).toContain('Recorrido guiado')
    expect(wrapper.text()).toContain('Ingresos y egresos por semana')
  })
})
