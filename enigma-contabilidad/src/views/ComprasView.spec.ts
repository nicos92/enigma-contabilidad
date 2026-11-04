import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { router } from '@/router'
import ComprasView from '@/views/ComprasView.vue'
import { useContabilidadStore } from '@/stores/contabilidad'

async function montarCompras(ruta = '/compras') {
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push(ruta)
  await router.isReady()
  const wrapper = mount(ComprasView, {
    global: {
      plugins: [pinia, router],
    },
  })
  await flushPromises()
  return { wrapper, pinia }
}

describe('ComprasView', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('muestra el listado inicial de compras', async () => {
    const { wrapper } = await montarCompras()
    expect(wrapper.text()).toContain('Comprobantes recibidos')
    expect(wrapper.findAll('tbody tr').length).toBeGreaterThan(0)
  })

  it('abre el formulario con la ruta vista=nueva', async () => {
    const { wrapper } = await montarCompras('/compras?vista=nueva')
    expect(wrapper.text()).toContain('Registrar compra')
    expect(wrapper.find('form.compras-formulario').exists()).toBe(true)
  })

  it('registra una compra y abre el detalle con factura recibida', async () => {
    const { wrapper, pinia } = await montarCompras('/compras?vista=nueva')
    setActivePinia(pinia)
    const store = useContabilidadStore()
    const proveedorId = store.estado.proveedores[0].id
    const productoId = store.estado.productos[0].id

    await wrapper.find('#compra-proveedor').setValue(proveedorId)
    await wrapper.find('#compra-producto-0').setValue(productoId)
    // description auto-filled; price auto-filled from product cost

    await wrapper.find('form.compras-formulario').trigger('submit.prevent')
    await flushPromises()

    expect(document.body.textContent).toContain('Factura recibida')
    expect(document.body.textContent).toContain(
      'Documento generado con fines exclusivamente demostrativos',
    )
  })
})
