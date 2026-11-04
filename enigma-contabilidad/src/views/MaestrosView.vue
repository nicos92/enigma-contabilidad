<script setup lang="ts">
import { Eye, Pencil, Plus, Trash2 } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import CurrencyInput from '@/components/ui/CurrencyInput.vue'
import DataTable from '@/components/ui/DataTable.vue'
import type { ColumnaTabla, OpcionSelect, TabItem } from '@/components/ui/tipos'
import {
  CONDICIONES_IVA,
  TIPOS_PRODUCTO,
  ALICUOTAS_IVA_MAESTRO,
  filtrarClientes,
  filtrarProductos,
  filtrarProveedores,
  filtrosMaestroVacios,
  hayErroresCliente,
  hayErroresProducto,
  hayErroresProveedor,
  validarCliente,
  validarProducto,
  validarProveedor,
  comprasDeProveedor,
  pagosDeProveedor,
  ventasDeCliente,
  cobrosDeCliente,
  asientosVinculadosProveedor,
  asientosVinculadosCliente,
  asientosVinculadosProducto,
  proveedorUsado,
  clienteUsado,
  productoUsado,
} from '@/core/maestros'
import { formatearFecha, formatearMoneda } from '@/core/dinero'
import { useContabilidadStore } from '@/stores/contabilidad'
import { useUiStore } from '@/stores/ui'
import type { Cliente, Producto, Proveedor } from '@/types/contabilidad'

type VistaMaestros = 'proveedores' | 'clientes' | 'productos'

const contabilidad = useContabilidadStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const vista = computed<VistaMaestros>(() => {
  const v = route.query.vista
  if (v === 'clientes') return 'clientes'
  if (v === 'productos') return 'productos'
  return 'proveedores'
})

const tabs = computed<TabItem[]>(() => [
  { id: 'proveedores', etiqueta: 'Proveedores', badge: contabilidad.estado.proveedores.length },
  { id: 'clientes', etiqueta: 'Clientes', badge: contabilidad.estado.clientes.length },
  {
    id: 'productos',
    etiqueta: 'Productos y servicios',
    badge: contabilidad.estado.productos.length,
  },
])

const tabActiva = computed(() => vista.value)

function cambiarTab(id: string): void {
  void router.push({ name: 'maestros', query: { vista: id } })
}

/* -------------------------------------------------------------------------- */
/* Proveedores                                                                */
/* -------------------------------------------------------------------------- */

const filtrosProveedores = reactive(filtrosMaestroVacios())
const proveedoresFiltrados = computed(() =>
  filtrarProveedores(contabilidad.estado.proveedores, filtrosProveedores),
)

const proveedorDetalleId = ref<string | null>(null)
const proveedorDetalle = computed(() =>
  proveedorDetalleId.value
    ? (contabilidad.estado.proveedores.find((p) => p.id === proveedorDetalleId.value) ?? null)
    : null,
)

const proveedorFormAbierto = ref(false)
const proveedorEditandoId = ref<string | null>(null)
const intentoProveedor = ref(false)
const formProveedor = reactive({
  nombre: '',
  cuit: '',
  email: '',
  telefono: '',
  direccion: '',
  condicionIva: 'Responsable Inscripto',
})

function abrirNuevoProveedor(): void {
  proveedorEditandoId.value = null
  intentoProveedor.value = false
  Object.assign(formProveedor, {
    nombre: '',
    cuit: '',
    email: '',
    telefono: '',
    direccion: '',
    condicionIva: 'Responsable Inscripto',
  })
  proveedorFormAbierto.value = true
}

function abrirEditarProveedor(proveedor: Proveedor): void {
  proveedorEditandoId.value = proveedor.id
  intentoProveedor.value = false
  Object.assign(formProveedor, {
    nombre: proveedor.nombre,
    cuit: proveedor.cuit,
    email: proveedor.email,
    telefono: proveedor.telefono,
    direccion: proveedor.direccion,
    condicionIva: proveedor.condicionIva,
  })
  proveedorFormAbierto.value = true
}

const erroresProveedor = computed(() =>
  validarProveedor(
    {
      id: proveedorEditandoId.value ?? undefined,
      nombre: formProveedor.nombre,
      cuit: formProveedor.cuit,
      email: formProveedor.email,
      telefono: formProveedor.telefono,
      direccion: formProveedor.direccion,
      condicionIva: formProveedor.condicionIva,
    },
    contabilidad.estado.proveedores,
    proveedorEditandoId.value ?? undefined,
  ),
)

const historialComprasProveedor = computed(() =>
  proveedorDetalle.value
    ? comprasDeProveedor(proveedorDetalle.value.id, contabilidad.estado.compras)
    : [],
)

const historialPagosProveedor = computed(() =>
  proveedorDetalle.value
    ? pagosDeProveedor(proveedorDetalle.value.id, contabilidad.estado.pagos)
    : [],
)

const saldoProveedorDetalle = computed(() => {
  if (!proveedorDetalle.value) return 0
  const saldo = contabilidad.saldosProveedores.find((s) => s.id === proveedorDetalle.value!.id)
  return saldo?.saldo ?? 0
})

const asientosProveedorDetalle = computed(() =>
  proveedorDetalle.value
    ? asientosVinculadosProveedor(
        proveedorDetalle.value.id,
        contabilidad.estado.compras,
        contabilidad.estado.pagos,
        contabilidad.estado.asientos,
      )
    : [],
)

function guardarProveedor(): void {
  intentoProveedor.value = true
  if (hayErroresProveedor(erroresProveedor.value)) {
    ui.notificar({
      tipo: 'error',
      titulo: 'Revisá los datos del proveedor',
      mensaje: 'Hay campos inválidos.',
    })
    return
  }

  if (proveedorEditandoId.value) {
    const resultado = contabilidad.actualizarProveedor(proveedorEditandoId.value, {
      nombre: formProveedor.nombre.trim(),
      cuit: formProveedor.cuit.trim(),
      email: formProveedor.email.trim(),
      telefono: formProveedor.telefono.trim(),
      direccion: formProveedor.direccion.trim(),
      condicionIva: formProveedor.condicionIva as Proveedor['condicionIva'],
    })
    if (!resultado.ok) {
      ui.notificar({
        tipo: 'error',
        titulo: 'No se pudo actualizar',
        mensaje: 'Verificá los datos.',
      })
      return
    }
    ui.notificar({ tipo: 'exito', titulo: 'Proveedor actualizado', mensaje: formProveedor.nombre })
  } else {
    const resultado = contabilidad.registrarProveedor({
      nombre: formProveedor.nombre.trim(),
      cuit: formProveedor.cuit.trim(),
      email: formProveedor.email.trim(),
      telefono: formProveedor.telefono.trim(),
      direccion: formProveedor.direccion.trim(),
      condicionIva: formProveedor.condicionIva as Proveedor['condicionIva'],
    })
    if (!resultado.ok) {
      ui.notificar({ tipo: 'error', titulo: 'No se pudo crear', mensaje: 'Verificá los datos.' })
      return
    }
    ui.notificar({ tipo: 'exito', titulo: 'Proveedor creado', mensaje: formProveedor.nombre })
  }

  proveedorFormAbierto.value = false
}

/* -------------------------------------------------------------------------- */
/* Clientes                                                                   */
/* -------------------------------------------------------------------------- */

const filtrosClientes = reactive(filtrosMaestroVacios())
const clientesFiltrados = computed(() =>
  filtrarClientes(contabilidad.estado.clientes, filtrosClientes),
)

const clienteDetalleId = ref<string | null>(null)
const clienteDetalle = computed(() =>
  clienteDetalleId.value
    ? (contabilidad.estado.clientes.find((c) => c.id === clienteDetalleId.value) ?? null)
    : null,
)

const clienteFormAbierto = ref(false)
const clienteEditandoId = ref<string | null>(null)
const intentoCliente = ref(false)
const formCliente = reactive({
  nombre: '',
  cuit: '',
  email: '',
  telefono: '',
  direccion: '',
  condicionIva: 'Responsable Inscripto',
})

function abrirNuevoCliente(): void {
  clienteEditandoId.value = null
  intentoCliente.value = false
  Object.assign(formCliente, {
    nombre: '',
    cuit: '',
    email: '',
    telefono: '',
    direccion: '',
    condicionIva: 'Responsable Inscripto',
  })
  clienteFormAbierto.value = true
}

function abrirEditarCliente(cliente: Cliente): void {
  clienteEditandoId.value = cliente.id
  intentoCliente.value = false
  Object.assign(formCliente, {
    nombre: cliente.nombre,
    cuit: cliente.cuit,
    email: cliente.email,
    telefono: cliente.telefono,
    direccion: cliente.direccion,
    condicionIva: cliente.condicionIva,
  })
  clienteFormAbierto.value = true
}

const erroresCliente = computed(() =>
  validarCliente(
    {
      id: clienteEditandoId.value ?? undefined,
      nombre: formCliente.nombre,
      cuit: formCliente.cuit,
      email: formCliente.email,
      telefono: formCliente.telefono,
      direccion: formCliente.direccion,
      condicionIva: formCliente.condicionIva,
    },
    contabilidad.estado.clientes,
    clienteEditandoId.value ?? undefined,
  ),
)

const historialVentasCliente = computed(() =>
  clienteDetalle.value ? ventasDeCliente(clienteDetalle.value.id, contabilidad.estado.ventas) : [],
)

const historialCobrosCliente = computed(() =>
  clienteDetalle.value ? cobrosDeCliente(clienteDetalle.value.id, contabilidad.estado.cobros) : [],
)

const saldoClienteDetalle = computed(() => {
  if (!clienteDetalle.value) return 0
  const saldo = contabilidad.saldosClientes.find((s) => s.id === clienteDetalle.value!.id)
  return saldo?.saldo ?? 0
})

const asientosClienteDetalle = computed(() =>
  clienteDetalle.value
    ? asientosVinculadosCliente(
        clienteDetalle.value.id,
        contabilidad.estado.ventas,
        contabilidad.estado.cobros,
        contabilidad.estado.asientos,
      )
    : [],
)

function guardarCliente(): void {
  intentoCliente.value = true
  if (hayErroresCliente(erroresCliente.value)) {
    ui.notificar({
      tipo: 'error',
      titulo: 'Revisá los datos del cliente',
      mensaje: 'Hay campos inválidos.',
    })
    return
  }

  if (clienteEditandoId.value) {
    const resultado = contabilidad.actualizarCliente(clienteEditandoId.value, {
      nombre: formCliente.nombre.trim(),
      cuit: formCliente.cuit.trim(),
      email: formCliente.email.trim(),
      telefono: formCliente.telefono.trim(),
      direccion: formCliente.direccion.trim(),
      condicionIva: formCliente.condicionIva as Cliente['condicionIva'],
    })
    if (!resultado.ok) {
      ui.notificar({
        tipo: 'error',
        titulo: 'No se pudo actualizar',
        mensaje: 'Verificá los datos.',
      })
      return
    }
    ui.notificar({ tipo: 'exito', titulo: 'Cliente actualizado', mensaje: formCliente.nombre })
  } else {
    const resultado = contabilidad.registrarCliente({
      nombre: formCliente.nombre.trim(),
      cuit: formCliente.cuit.trim(),
      email: formCliente.email.trim(),
      telefono: formCliente.telefono.trim(),
      direccion: formCliente.direccion.trim(),
      condicionIva: formCliente.condicionIva as Cliente['condicionIva'],
    })
    if (!resultado.ok) {
      ui.notificar({ tipo: 'error', titulo: 'No se pudo crear', mensaje: 'Verificá los datos.' })
      return
    }
    ui.notificar({ tipo: 'exito', titulo: 'Cliente creado', mensaje: formCliente.nombre })
  }

  clienteFormAbierto.value = false
}

/* -------------------------------------------------------------------------- */
/* Productos                                                                  */
/* -------------------------------------------------------------------------- */

const filtrosProductos = reactive(filtrosMaestroVacios())
const productosFiltrados = computed(() =>
  filtrarProductos(contabilidad.estado.productos, filtrosProductos),
)

const productoDetalleId = ref<string | null>(null)
const productoDetalle = computed(() =>
  productoDetalleId.value
    ? (contabilidad.estado.productos.find((p) => p.id === productoDetalleId.value) ?? null)
    : null,
)

const productoFormAbierto = ref(false)
const productoEditandoId = ref<string | null>(null)
const intentoProducto = ref(false)
const formProducto = reactive({
  codigo: '',
  nombre: '',
  tipo: 'producto' as Producto['tipo'],
  precioVenta: 0,
  costo: 0,
  alicuotaIva: 21,
  stockInicial: 0,
  puntoReposicion: 0,
  cuentaCompra: '',
  cuentaIngreso: '',
  cuentaCosto: '',
})

function abrirNuevoProducto(): void {
  productoEditandoId.value = null
  intentoProducto.value = false
  Object.assign(formProducto, {
    codigo: '',
    nombre: '',
    tipo: 'producto',
    precioVenta: 0,
    costo: 0,
    alicuotaIva: 21,
    stockInicial: 0,
    puntoReposicion: 0,
    cuentaCompra:
      contabilidad.estado.cuentas.find((c) => c.imputable && c.codigo === '1.1.05')?.codigo ?? '',
    cuentaIngreso:
      contabilidad.estado.cuentas.find((c) => c.imputable && c.codigo === '4.1')?.codigo ?? '',
    cuentaCosto:
      contabilidad.estado.cuentas.find((c) => c.imputable && c.codigo === '5.1.01')?.codigo ?? '',
  })
  productoFormAbierto.value = true
}

function abrirEditarProducto(producto: Producto): void {
  productoEditandoId.value = producto.id
  intentoProducto.value = false
  Object.assign(formProducto, {
    codigo: producto.codigo,
    nombre: producto.nombre,
    tipo: producto.tipo,
    precioVenta: producto.precioVenta,
    costo: producto.costo,
    alicuotaIva: producto.alicuotaIva,
    stockInicial: producto.stockInicial,
    puntoReposicion: producto.puntoReposicion,
    cuentaCompra: producto.cuentaCompra,
    cuentaIngreso: producto.cuentaIngreso,
    cuentaCosto: producto.cuentaCosto,
  })
  productoFormAbierto.value = true
}

const cuentasImputables = computed(() =>
  contabilidad.estado.cuentas.filter((cuenta) => cuenta.imputable),
)

const opcionesCuentas = computed<OpcionSelect[]>(() =>
  cuentasImputables.value.map((cuenta) => ({
    valor: cuenta.codigo,
    etiqueta: `${cuenta.codigo} · ${cuenta.nombre}`,
  })),
)

const opcionesTiposProducto = TIPOS_PRODUCTO.map((t) => ({
  valor: t,
  etiqueta: t === 'producto' ? 'Producto' : 'Servicio',
}))

const erroresProducto = computed(() =>
  validarProducto(
    {
      id: productoEditandoId.value ?? undefined,
      codigo: formProducto.codigo,
      nombre: formProducto.nombre,
      tipo: formProducto.tipo,
      precioVenta: formProducto.precioVenta,
      costo: formProducto.costo,
      alicuotaIva: formProducto.alicuotaIva,
      stockInicial: formProducto.stockInicial,
      puntoReposicion: formProducto.puntoReposicion,
      cuentaCompra: formProducto.cuentaCompra,
      cuentaIngreso: formProducto.cuentaIngreso,
      cuentaCosto: formProducto.cuentaCosto,
    },
    contabilidad.estado.productos,
    productoEditandoId.value ?? undefined,
  ),
)

const stockProductoDetalle = computed(() => {
  if (!productoDetalle.value) return null
  return contabilidad.stockProductos.find((s) => s.productoId === productoDetalle.value!.id) ?? null
})

const asientosProductoDetalle = computed(() =>
  productoDetalle.value
    ? asientosVinculadosProducto(
        productoDetalle.value.id,
        contabilidad.estado.compras,
        contabilidad.estado.ventas,
        contabilidad.estado.asientos,
      )
    : [],
)

function guardarProducto(): void {
  intentoProducto.value = true
  if (hayErroresProducto(erroresProducto.value)) {
    ui.notificar({
      tipo: 'error',
      titulo: 'Revisá los datos del producto',
      mensaje: 'Hay campos inválidos.',
    })
    return
  }

  const payload = {
    codigo: formProducto.codigo.trim(),
    nombre: formProducto.nombre.trim(),
    tipo: formProducto.tipo,
    precioVenta: formProducto.precioVenta,
    costo: formProducto.costo,
    alicuotaIva: formProducto.alicuotaIva,
    stockInicial: formProducto.stockInicial,
    puntoReposicion: formProducto.puntoReposicion,
    cuentaCompra: formProducto.cuentaCompra,
    cuentaIngreso: formProducto.cuentaIngreso,
    cuentaCosto: formProducto.cuentaCosto,
  }

  if (productoEditandoId.value) {
    const resultado = contabilidad.actualizarProducto(productoEditandoId.value, payload)
    if (!resultado.ok) {
      ui.notificar({
        tipo: 'error',
        titulo: 'No se pudo actualizar',
        mensaje: 'Verificá los datos.',
      })
      return
    }
    ui.notificar({ tipo: 'exito', titulo: 'Producto actualizado', mensaje: formProducto.nombre })
  } else {
    const resultado = contabilidad.registrarProducto(payload)
    if (!resultado.ok) {
      ui.notificar({ tipo: 'error', titulo: 'No se pudo crear', mensaje: 'Verificá los datos.' })
      return
    }
    ui.notificar({ tipo: 'exito', titulo: 'Producto creado', mensaje: formProducto.nombre })
  }

  productoFormAbierto.value = false
}

/* -------------------------------------------------------------------------- */
/* Eliminación                                                                */
/* -------------------------------------------------------------------------- */

const eliminarProveedorConfirm = ref(false)
const proveedorAEliminar = ref<string | null>(null)
const eliminarClienteConfirm = ref(false)
const clienteAEliminar = ref<string | null>(null)
const eliminarProductoConfirm = ref(false)
const productoAEliminar = ref<string | null>(null)

function solicitarEliminarProveedor(id: string): void {
  if (proveedorUsado(id, contabilidad.estado.compras, contabilidad.estado.pagos)) {
    ui.notificar({
      tipo: 'advertencia',
      titulo: 'No se puede eliminar',
      mensaje: 'El proveedor tiene operaciones asociadas.',
    })
    return
  }
  proveedorAEliminar.value = id
  eliminarProveedorConfirm.value = true
}

function confirmarEliminarProveedor(): void {
  if (!proveedorAEliminar.value) return
  const resultado = contabilidad.eliminarProveedor(proveedorAEliminar.value)
  eliminarProveedorConfirm.value = false
  if (!resultado.ok) {
    ui.notificar({
      tipo: 'error',
      titulo: 'No se pudo eliminar',
      mensaje: 'El proveedor está en uso.',
    })
    return
  }
  ui.notificar({
    tipo: 'exito',
    titulo: 'Proveedor eliminado',
    mensaje: 'Se eliminó correctamente.',
  })
  proveedorAEliminar.value = null
  if (proveedorDetalleId.value === proveedorAEliminar.value) proveedorDetalleId.value = null
}

function solicitarEliminarCliente(id: string): void {
  if (clienteUsado(id, contabilidad.estado.ventas, contabilidad.estado.cobros)) {
    ui.notificar({
      tipo: 'advertencia',
      titulo: 'No se puede eliminar',
      mensaje: 'El cliente tiene operaciones asociadas.',
    })
    return
  }
  clienteAEliminar.value = id
  eliminarClienteConfirm.value = true
}

function confirmarEliminarCliente(): void {
  if (!clienteAEliminar.value) return
  const resultado = contabilidad.eliminarCliente(clienteAEliminar.value)
  eliminarClienteConfirm.value = false
  if (!resultado.ok) {
    ui.notificar({
      tipo: 'error',
      titulo: 'No se pudo eliminar',
      mensaje: 'El cliente está en uso.',
    })
    return
  }
  ui.notificar({ tipo: 'exito', titulo: 'Cliente eliminado', mensaje: 'Se eliminó correctamente.' })
  clienteAEliminar.value = null
}

function solicitarEliminarProducto(id: string): void {
  if (productoUsado(id, contabilidad.estado.compras, contabilidad.estado.ventas)) {
    ui.notificar({
      tipo: 'advertencia',
      titulo: 'No se puede eliminar',
      mensaje: 'El producto tiene operaciones asociadas.',
    })
    return
  }
  productoAEliminar.value = id
  eliminarProductoConfirm.value = true
}

function confirmarEliminarProducto(): void {
  if (!productoAEliminar.value) return
  const resultado = contabilidad.eliminarProducto(productoAEliminar.value)
  eliminarProductoConfirm.value = false
  if (!resultado.ok) {
    ui.notificar({
      tipo: 'error',
      titulo: 'No se pudo eliminar',
      mensaje: 'El producto está en uso.',
    })
    return
  }
  ui.notificar({
    tipo: 'exito',
    titulo: 'Producto eliminado',
    mensaje: 'Se eliminó correctamente.',
  })
  productoAEliminar.value = null
}

/* -------------------------------------------------------------------------- */
/* Errores de campos                                                          */
/* -------------------------------------------------------------------------- */

function errorProveedor(campo: keyof ReturnType<typeof validarProveedor>): string | undefined {
  return intentoProveedor.value ? erroresProveedor.value[campo] : undefined
}

function errorCliente(campo: keyof ReturnType<typeof validarCliente>): string | undefined {
  return intentoCliente.value ? erroresCliente.value[campo] : undefined
}

function errorProducto(campo: keyof ReturnType<typeof validarProducto>): string | undefined {
  return intentoProducto.value ? erroresProducto.value[campo] : undefined
}

const condicionesIvaOpciones: OpcionSelect[] = CONDICIONES_IVA.map((c) => ({
  valor: c,
  etiqueta: c,
}))

const opcionesAlicuotasSelect: OpcionSelect[] = ALICUOTAS_IVA_MAESTRO.map((a) => ({
  valor: a,
  etiqueta: `${a}%`,
}))

const columnasProveedores: ColumnaTabla[] = [
  { clave: 'nombre', titulo: 'Proveedor' },
  { clave: 'cuit', titulo: 'CUIT', ancho: '130px' },
  { clave: 'condicionIva', titulo: 'Condición IVA', ancho: '150px' },
  { clave: 'saldo', titulo: 'Saldo', alineacion: 'derecha' },
  { clave: 'acciones', titulo: '', alineacion: 'derecha', ancho: '120px' },
]

const filasProveedores = computed<Record<string, unknown>[]>(() =>
  proveedoresFiltrados.value.map((proveedor) => {
    const saldo = contabilidad.saldosProveedores.find((s) => s.id === proveedor.id)?.saldo ?? 0
    return {
      id: proveedor.id,
      nombre: proveedor.nombre,
      cuit: proveedor.cuit,
      condicionIva: proveedor.condicionIva,
      saldo: formatearMoneda(saldo),
    }
  }),
)

const columnasClientes: ColumnaTabla[] = [
  { clave: 'nombre', titulo: 'Cliente' },
  { clave: 'cuit', titulo: 'CUIT', ancho: '130px' },
  { clave: 'condicionIva', titulo: 'Condición IVA', ancho: '150px' },
  { clave: 'saldo', titulo: 'Saldo', alineacion: 'derecha' },
  { clave: 'acciones', titulo: '', alineacion: 'derecha', ancho: '120px' },
]

const filasClientes = computed<Record<string, unknown>[]>(() =>
  clientesFiltrados.value.map((cliente) => {
    const saldo = contabilidad.saldosClientes.find((s) => s.id === cliente.id)?.saldo ?? 0
    return {
      id: cliente.id,
      nombre: cliente.nombre,
      cuit: cliente.cuit,
      condicionIva: cliente.condicionIva,
      saldo: formatearMoneda(saldo),
    }
  }),
)

const columnasProductos: ColumnaTabla[] = [
  { clave: 'codigo', titulo: 'Código', ancho: '110px' },
  { clave: 'nombre', titulo: 'Nombre' },
  { clave: 'tipo', titulo: 'Tipo', ancho: '90px' },
  { clave: 'precioVenta', titulo: 'Precio', alineacion: 'derecha' },
  { clave: 'costo', titulo: 'Costo', alineacion: 'derecha' },
  { clave: 'alicuotaIva', titulo: 'IVA', alineacion: 'centro', ancho: '60px' },
  { clave: 'acciones', titulo: '', alineacion: 'derecha', ancho: '120px' },
]

const filasProductos = computed<Record<string, unknown>[]>(() =>
  productosFiltrados.value.map((producto) => ({
    id: producto.id,
    codigo: producto.codigo,
    nombre: producto.nombre,
    tipo: producto.tipo,
    precioVenta: formatearMoneda(producto.precioVenta),
    costo: formatearMoneda(producto.costo),
    alicuotaIva: `${producto.alicuotaIva}%`,
  })),
)
</script>

<template>
  <section class="page maestros">
    <div class="page__header">
      <div>
        <h2>Maestros</h2>
        <p class="page__lead">
          Administrá proveedores, clientes y el catálogo de productos y servicios de
          {{ contabilidad.estado.empresa.nombreComercial }}.
        </p>
      </div>
    </div>

    <AppTabs :tabs="tabs" :model-value="tabActiva" @update:model-value="cambiarTab">
      <template #panel-proveedores>
        <div class="maestros-seccion">
          <div class="page__section-header">
            <div>
              <h3>Proveedores</h3>
              <p>Datos fiscales, saldo y operaciones asociadas.</p>
            </div>
            <AppButton @click="abrirNuevoProveedor">
              <Plus :size="16" aria-hidden="true" />
              Nuevo proveedor
            </AppButton>
          </div>

          <AppCard compacta>
            <AppInput
              v-model="filtrosProveedores.texto"
              label="Buscar"
              type="search"
              placeholder="Nombre, CUIT o email"
            />
          </AppCard>

          <AppCard
            titulo="Listado de proveedores"
            :descripcion="`${proveedoresFiltrados.length} proveedores`"
          >
            <div class="maestros-tabla">
              <DataTable
                :columnas="columnasProveedores"
                :filas="filasProveedores"
                clave-fila="id"
                compacta
                vacio-titulo="Sin proveedores"
                vacio-mensaje="Creá un proveedor para comenzar."
              >
                <template #celda-acciones="{ fila }">
                  <div class="maestros-acciones">
                    <AppButton
                      variante="fantasma"
                      tamano="sm"
                      solo-icono
                      aria-label="Ver ficha"
                      @click="proveedorDetalleId = String(fila.id)"
                    >
                      <Eye :size="16" aria-hidden="true" />
                    </AppButton>
                    <AppButton
                      variante="fantasma"
                      tamano="sm"
                      solo-icono
                      aria-label="Editar"
                      @click="
                        abrirEditarProveedor(
                          contabilidad.estado.proveedores.find((p) => p.id === fila.id)!,
                        )
                      "
                    >
                      <Pencil :size="16" aria-hidden="true" />
                    </AppButton>
                    <AppButton
                      variante="fantasma"
                      tamano="sm"
                      solo-icono
                      aria-label="Eliminar"
                      @click="solicitarEliminarProveedor(String(fila.id))"
                    >
                      <Trash2 :size="16" aria-hidden="true" />
                    </AppButton>
                  </div>
                </template>
              </DataTable>
            </div>
          </AppCard>
        </div>
      </template>

      <template #panel-clientes>
        <div class="maestros-seccion">
          <div class="page__section-header">
            <div>
              <h3>Clientes</h3>
              <p>Datos fiscales, saldo y operaciones asociadas.</p>
            </div>
            <AppButton @click="abrirNuevoCliente">
              <Plus :size="16" aria-hidden="true" />
              Nuevo cliente
            </AppButton>
          </div>

          <AppCard compacta>
            <AppInput
              v-model="filtrosClientes.texto"
              label="Buscar"
              type="search"
              placeholder="Nombre, CUIT o email"
            />
          </AppCard>

          <AppCard
            titulo="Listado de clientes"
            :descripcion="`${clientesFiltrados.length} clientes`"
          >
            <div class="maestros-tabla">
              <DataTable
                :columnas="columnasClientes"
                :filas="filasClientes"
                clave-fila="id"
                compacta
                vacio-titulo="Sin clientes"
                vacio-mensaje="Creá un cliente para comenzar."
              >
                <template #celda-acciones="{ fila }">
                  <div class="maestros-acciones">
                    <AppButton
                      variante="fantasma"
                      tamano="sm"
                      solo-icono
                      aria-label="Ver ficha"
                      @click="clienteDetalleId = String(fila.id)"
                    >
                      <Eye :size="16" aria-hidden="true" />
                    </AppButton>
                    <AppButton
                      variante="fantasma"
                      tamano="sm"
                      solo-icono
                      aria-label="Editar"
                      @click="
                        abrirEditarCliente(
                          contabilidad.estado.clientes.find((c) => c.id === fila.id)!,
                        )
                      "
                    >
                      <Pencil :size="16" aria-hidden="true" />
                    </AppButton>
                    <AppButton
                      variante="fantasma"
                      tamano="sm"
                      solo-icono
                      aria-label="Eliminar"
                      @click="solicitarEliminarCliente(String(fila.id))"
                    >
                      <Trash2 :size="16" aria-hidden="true" />
                    </AppButton>
                  </div>
                </template>
              </DataTable>
            </div>
          </AppCard>
        </div>
      </template>

      <template #panel-productos>
        <div class="maestros-seccion">
          <div class="page__section-header">
            <div>
              <h3>Productos y servicios</h3>
              <p>Precios, costos y alícuotas de IVA.</p>
            </div>
            <AppButton @click="abrirNuevoProducto">
              <Plus :size="16" aria-hidden="true" />
              Nuevo producto
            </AppButton>
          </div>

          <AppCard compacta>
            <AppInput
              v-model="filtrosProductos.texto"
              label="Buscar"
              type="search"
              placeholder="Código o nombre"
            />
          </AppCard>

          <AppCard titulo="Catálogo" :descripcion="`${productosFiltrados.length} ítems`">
            <div class="maestros-tabla">
              <DataTable
                :columnas="columnasProductos"
                :filas="filasProductos"
                clave-fila="id"
                compacta
                vacio-titulo="Sin productos"
                vacio-mensaje="Creá un producto o servicio para comenzar."
              >
                <template #celda-acciones="{ fila }">
                  <div class="maestros-acciones">
                    <AppButton
                      variante="fantasma"
                      tamano="sm"
                      solo-icono
                      aria-label="Ver ficha"
                      @click="productoDetalleId = String(fila.id)"
                    >
                      <Eye :size="16" aria-hidden="true" />
                    </AppButton>
                    <AppButton
                      variante="fantasma"
                      tamano="sm"
                      solo-icono
                      aria-label="Editar"
                      @click="
                        abrirEditarProducto(
                          contabilidad.estado.productos.find((p) => p.id === fila.id)!,
                        )
                      "
                    >
                      <Pencil :size="16" aria-hidden="true" />
                    </AppButton>
                    <AppButton
                      variante="fantasma"
                      tamano="sm"
                      solo-icono
                      aria-label="Eliminar"
                      @click="solicitarEliminarProducto(String(fila.id))"
                    >
                      <Trash2 :size="16" aria-hidden="true" />
                    </AppButton>
                  </div>
                </template>
              </DataTable>
            </div>
          </AppCard>
        </div>
      </template>
    </AppTabs>

    <!-- Proveedor detalle -->
    <AppModal
      :model-value="Boolean(proveedorDetalle)"
      :titulo="proveedorDetalle ? `Proveedor ${proveedorDetalle.nombre}` : 'Proveedor'"
      tamano="xl"
      @update:model-value="
        (v) => {
          if (!v) proveedorDetalleId = null
        }
      "
    >
      <template v-if="proveedorDetalle">
        <div class="maestros-detalle">
          <dl class="maestros-datos">
            <div>
              <dt>CUIT</dt>
              <dd>{{ proveedorDetalle.cuit }}</dd>
            </div>
            <div>
              <dt>Condición IVA</dt>
              <dd>{{ proveedorDetalle.condicionIva }}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{{ proveedorDetalle.email || '—' }}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{{ proveedorDetalle.telefono || '—' }}</dd>
            </div>
            <div>
              <dt>Dirección</dt>
              <dd>{{ proveedorDetalle.direccion || '—' }}</dd>
            </div>
            <div>
              <dt>Saldo</dt>
              <dd class="texto-mono">{{ formatearMoneda(saldoProveedorDetalle) }}</dd>
            </div>
          </dl>

          <h4>Compras asociadas ({{ historialComprasProveedor.length }})</h4>
          <ul class="maestros-lista">
            <li v-for="compra in historialComprasProveedor" :key="compra.id">
              {{ formatearFecha(compra.fecha) }} · {{ compra.numero }} ·
              {{ formatearMoneda(compra.total) }}
            </li>
          </ul>

          <h4>Pagos asociados ({{ historialPagosProveedor.length }})</h4>
          <ul class="maestros-lista">
            <li v-for="pago in historialPagosProveedor" :key="pago.id">
              {{ formatearFecha(pago.fecha) }} · {{ pago.numero }} ·
              {{ formatearMoneda(pago.importe) }}
            </li>
          </ul>

          <h4>Asientos vinculados ({{ asientosProveedorDetalle.length }})</h4>
          <ul class="maestros-lista">
            <li v-for="asiento in asientosProveedorDetalle" :key="asiento.id">
              N.º {{ asiento.numero ?? '—' }} · {{ formatearFecha(asiento.fecha) }} ·
              {{ asiento.concepto }}
            </li>
          </ul>
        </div>
      </template>
    </AppModal>

    <!-- Cliente detalle -->
    <AppModal
      :model-value="Boolean(clienteDetalle)"
      :titulo="clienteDetalle ? `Cliente ${clienteDetalle.nombre}` : 'Cliente'"
      tamano="xl"
      @update:model-value="
        (v) => {
          if (!v) clienteDetalleId = null
        }
      "
    >
      <template v-if="clienteDetalle">
        <div class="maestros-detalle">
          <dl class="maestros-datos">
            <div>
              <dt>CUIT</dt>
              <dd>{{ clienteDetalle.cuit }}</dd>
            </div>
            <div>
              <dt>Condición IVA</dt>
              <dd>{{ clienteDetalle.condicionIva }}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{{ clienteDetalle.email || '—' }}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{{ clienteDetalle.telefono || '—' }}</dd>
            </div>
            <div>
              <dt>Dirección</dt>
              <dd>{{ clienteDetalle.direccion || '—' }}</dd>
            </div>
            <div>
              <dt>Saldo</dt>
              <dd class="texto-mono">{{ formatearMoneda(saldoClienteDetalle) }}</dd>
            </div>
          </dl>

          <h4>Ventas asociadas ({{ historialVentasCliente.length }})</h4>
          <ul class="maestros-lista">
            <li v-for="venta in historialVentasCliente" :key="venta.id">
              {{ formatearFecha(venta.fecha) }} · {{ venta.numero }} ·
              {{ formatearMoneda(venta.total) }}
            </li>
          </ul>

          <h4>Cobros asociados ({{ historialCobrosCliente.length }})</h4>
          <ul class="maestros-lista">
            <li v-for="cobro in historialCobrosCliente" :key="cobro.id">
              {{ formatearFecha(cobro.fecha) }} · {{ cobro.numero }} ·
              {{ formatearMoneda(cobro.importe) }}
            </li>
          </ul>

          <h4>Asientos vinculados ({{ asientosClienteDetalle.length }})</h4>
          <ul class="maestros-lista">
            <li v-for="asiento in asientosClienteDetalle" :key="asiento.id">
              N.º {{ asiento.numero ?? '—' }} · {{ formatearFecha(asiento.fecha) }} ·
              {{ asiento.concepto }}
            </li>
          </ul>
        </div>
      </template>
    </AppModal>

    <!-- Producto detalle -->
    <AppModal
      :model-value="Boolean(productoDetalle)"
      :titulo="productoDetalle ? `Producto ${productoDetalle.nombre}` : 'Producto'"
      tamano="lg"
      @update:model-value="
        (v) => {
          if (!v) productoDetalleId = null
        }
      "
    >
      <template v-if="productoDetalle">
        <div class="maestros-detalle">
          <dl class="maestros-datos">
            <div>
              <dt>Código</dt>
              <dd>{{ productoDetalle.codigo }}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{{ productoDetalle.tipo }}</dd>
            </div>
            <div>
              <dt>Precio de venta</dt>
              <dd class="texto-mono">{{ formatearMoneda(productoDetalle.precioVenta) }}</dd>
            </div>
            <div>
              <dt>Costo</dt>
              <dd class="texto-mono">{{ formatearMoneda(productoDetalle.costo) }}</dd>
            </div>
            <div>
              <dt>IVA</dt>
              <dd>{{ productoDetalle.alicuotaIva }}%</dd>
            </div>
            <div>
              <dt>Stock inicial</dt>
              <dd>{{ productoDetalle.stockInicial }}</dd>
            </div>
            <div>
              <dt>Punto de reposición</dt>
              <dd>{{ productoDetalle.puntoReposicion }}</dd>
            </div>
            <div v-if="stockProductoDetalle">
              <dt>Stock final</dt>
              <dd>{{ stockProductoDetalle.stockFinal }}</dd>
            </div>
          </dl>

          <h4>Asientos vinculados ({{ asientosProductoDetalle.length }})</h4>
          <ul class="maestros-lista">
            <li v-for="asiento in asientosProductoDetalle" :key="asiento.id">
              N.º {{ asiento.numero ?? '—' }} · {{ formatearFecha(asiento.fecha) }} ·
              {{ asiento.concepto }}
            </li>
          </ul>
        </div>
      </template>
    </AppModal>

    <!-- Form proveedor -->
    <AppModal
      :model-value="proveedorFormAbierto"
      :titulo="proveedorEditandoId ? 'Editar proveedor' : 'Nuevo proveedor'"
      tamano="lg"
      @update:model-value="
        (v) => {
          proveedorFormAbierto = v
        }
      "
    >
      <div class="maestros-form">
        <AppInput
          v-model="formProveedor.nombre"
          label="Nombre"
          :error="errorProveedor('nombre')"
          required
        />
        <AppInput
          v-model="formProveedor.cuit"
          label="CUIT"
          placeholder="00-00000000-0"
          :error="errorProveedor('cuit')"
          required
        />
        <AppInput v-model="formProveedor.email" label="Email" :error="errorProveedor('email')" />
        <AppInput
          v-model="formProveedor.telefono"
          label="Teléfono"
          :error="errorProveedor('telefono')"
        />
        <AppInput
          v-model="formProveedor.direccion"
          label="Dirección"
          :error="errorProveedor('direccion')"
        />
        <AppSelect
          label="Condición IVA"
          :model-value="formProveedor.condicionIva"
          :opciones="condicionesIvaOpciones"
          :error="errorProveedor('condicionIva')"
          required
          @update:model-value="(v) => (formProveedor.condicionIva = v)"
        />
      </div>
      <template #pie>
        <AppButton variante="secundario" @click="proveedorFormAbierto = false">Cancelar</AppButton>
        <AppButton @click="guardarProveedor">Guardar</AppButton>
      </template>
    </AppModal>

    <!-- Form cliente -->
    <AppModal
      :model-value="clienteFormAbierto"
      :titulo="clienteEditandoId ? 'Editar cliente' : 'Nuevo cliente'"
      tamano="lg"
      @update:model-value="
        (v) => {
          clienteFormAbierto = v
        }
      "
    >
      <div class="maestros-form">
        <AppInput
          v-model="formCliente.nombre"
          label="Nombre"
          :error="errorCliente('nombre')"
          required
        />
        <AppInput
          v-model="formCliente.cuit"
          label="CUIT"
          placeholder="00-00000000-0"
          :error="errorCliente('cuit')"
          required
        />
        <AppInput v-model="formCliente.email" label="Email" :error="errorCliente('email')" />
        <AppInput
          v-model="formCliente.telefono"
          label="Teléfono"
          :error="errorCliente('telefono')"
        />
        <AppInput
          v-model="formCliente.direccion"
          label="Dirección"
          :error="errorCliente('direccion')"
        />
        <AppSelect
          label="Condición IVA"
          :model-value="formCliente.condicionIva"
          :opciones="condicionesIvaOpciones"
          :error="errorCliente('condicionIva')"
          required
          @update:model-value="(v) => (formCliente.condicionIva = v)"
        />
      </div>
      <template #pie>
        <AppButton variante="secundario" @click="clienteFormAbierto = false">Cancelar</AppButton>
        <AppButton @click="guardarCliente">Guardar</AppButton>
      </template>
    </AppModal>

    <!-- Form producto -->
    <AppModal
      :model-value="productoFormAbierto"
      :titulo="productoEditandoId ? 'Editar producto' : 'Nuevo producto'"
      tamano="lg"
      @update:model-value="
        (v) => {
          productoFormAbierto = v
        }
      "
    >
      <div class="maestros-form">
        <AppInput
          v-model="formProducto.codigo"
          label="Código"
          :error="errorProducto('codigo')"
          required
        />
        <AppInput
          v-model="formProducto.nombre"
          label="Nombre"
          :error="errorProducto('nombre')"
          required
        />
        <AppSelect
          label="Tipo"
          :model-value="formProducto.tipo"
          :opciones="opcionesTiposProducto"
          :error="errorProducto('tipo')"
          required
          @update:model-value="(v) => (formProducto.tipo = v as Producto['tipo'])"
        />
        <CurrencyInput
          v-model="formProducto.precioVenta"
          label="Precio de venta"
          :error="errorProducto('precioVenta')"
        />
        <CurrencyInput v-model="formProducto.costo" label="Costo" :error="errorProducto('costo')" />
        <AppSelect
          label="Alícuota IVA"
          :model-value="formProducto.alicuotaIva"
          :opciones="opcionesAlicuotasSelect"
          :error="errorProducto('alicuotaIva')"
          required
          @update:model-value="(v) => (formProducto.alicuotaIva = Number(v))"
        />
        <AppInput
          v-model.number="formProducto.stockInicial"
          label="Stock inicial"
          type="number"
          :error="errorProducto('stockInicial')"
        />
        <AppInput
          v-model.number="formProducto.puntoReposicion"
          label="Punto de reposición"
          type="number"
          :error="errorProducto('puntoReposicion')"
        />
        <AppSelect
          label="Cuenta de compra"
          :model-value="formProducto.cuentaCompra"
          :opciones="opcionesCuentas"
          :error="errorProducto('cuentaCompra')"
          required
          @update:model-value="(v) => (formProducto.cuentaCompra = v)"
        />
        <AppSelect
          label="Cuenta de ingreso"
          :model-value="formProducto.cuentaIngreso"
          :opciones="opcionesCuentas"
          :error="errorProducto('cuentaIngreso')"
          required
          @update:model-value="(v) => (formProducto.cuentaIngreso = v)"
        />
        <AppSelect
          label="Cuenta de costo"
          :model-value="formProducto.cuentaCosto"
          :opciones="opcionesCuentas"
          :error="errorProducto('cuentaCosto')"
          required
          @update:model-value="(v) => (formProducto.cuentaCosto = v)"
        />
      </div>
      <template #pie>
        <AppButton variante="secundario" @click="productoFormAbierto = false">Cancelar</AppButton>
        <AppButton @click="guardarProducto">Guardar</AppButton>
      </template>
    </AppModal>

    <ConfirmDialog
      v-model="eliminarProveedorConfirm"
      titulo="Eliminar proveedor"
      mensaje="Esta acción no se puede deshacer."
      peligro
      confirmar-texto="Eliminar"
      @confirmar="confirmarEliminarProveedor"
    />
    <ConfirmDialog
      v-model="eliminarClienteConfirm"
      titulo="Eliminar cliente"
      mensaje="Esta acción no se puede deshacer."
      peligro
      confirmar-texto="Eliminar"
      @confirmar="confirmarEliminarCliente"
    />
    <ConfirmDialog
      v-model="eliminarProductoConfirm"
      titulo="Eliminar producto"
      mensaje="Esta acción no se puede deshacer."
      peligro
      confirmar-texto="Eliminar"
      @confirmar="confirmarEliminarProducto"
    />
  </section>
</template>

<script lang="ts">
// computed rows/columns placed here to keep template references valid
</script>
