import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { CLAVE_ALMACENAMIENTO, cargarEstado, guardarEstado } from '@/core/persistencia'
import { EMPRESA_DEMO, USUARIO_DEMO } from '@/data/catalogos'
import { crearEstadoDemo } from '@/data/demo'
import { useContabilidadStore } from '@/stores/contabilidad'
import type { EstadoContable } from '@/types/contabilidad'

function iniciarPinia(): void {
  localStorage.clear()
  setActivePinia(createPinia())
}

describe('useContabilidadStore', () => {
  beforeEach(() => {
    iniciarPinia()
  })

  it('carga la demo y la persiste con la clave versionada', () => {
    const store = useContabilidadStore()

    expect(store.estado.asientos).toHaveLength(37)
    expect(store.asientosPropuestos).toHaveLength(2)
    expect(store.documentosPendientes).toHaveLength(2)
    expect(CLAVE_ALMACENAMIENTO).toBe('enigma-gestion:estado:v1')

    const persistido = cargarEstado()
    expect(persistido).not.toBeNull()
    expect(persistido?.asientos).toHaveLength(37)

    const envoltorio = JSON.parse(localStorage.getItem(CLAVE_ALMACENAMIENTO)!) as {
      version: number
      estado: { version: number }
    }
    expect(envoltorio.version).toBe(1)
    expect(envoltorio.estado.version).toBe(1)
  })

  it('deriva los libros solo de los asientos registrados', () => {
    const store = useContabilidadStore()

    expect(store.libroDiario.asientos).toHaveLength(35)
    expect(store.libroDiario.asientos.some((asiento) => asiento.id === 'asiento-venta-V-008')).toBe(
      false,
    )
    expect(store.libroDiario.balanceado).toBe(true)
    expect(store.balanceComprobacion.balanceado).toBe(true)
  })

  it('aprueba un documento propuesto y lo registra en los libros', () => {
    const store = useContabilidadStore()
    const filasAntes = store.libroDiario.filas.length
    const registradosAntes = store.asientosRegistrados.length

    const resultado = store.aprobarDocumento('doc-venta-V-008')

    expect(resultado.ok).toBe(true)
    expect(resultado.duplicado).toBe(false)
    expect(resultado.asientoId).toBe('asiento-venta-V-008')
    expect(resultado.numero).toBe(36)

    expect(store.asientosRegistrados.length).toBe(registradosAntes + 1)
    expect(store.libroDiario.asientos).toHaveLength(registradosAntes + 1)
    expect(store.libroDiario.filas.length).toBeGreaterThan(filasAntes)
    expect(store.libroDiario.asientos.some((asiento) => asiento.id === 'asiento-venta-V-008')).toBe(
      true,
    )

    const documento = store.estado.documentos.find(
      (documentoActual) => documentoActual.id === 'doc-venta-V-008',
    )
    const asiento = store.estado.asientos.find(
      (asientoActual) => asientoActual.id === 'asiento-venta-V-008',
    )
    expect(documento?.estado).toBe('registrado')
    expect(asiento?.estado).toBe('registrado')
    expect(asiento?.numero).toBe(36)

    expect(cargarEstado()?.documentos.find((doc) => doc.id === 'doc-venta-V-008')?.estado).toBe(
      'registrado',
    )
  })

  it('no duplica el asiento al aprobar dos veces el mismo documento', () => {
    const store = useContabilidadStore()

    const primero = store.aprobarDocumento('doc-compra-C-008')
    const registrados = store.asientosRegistrados.length
    const filas = store.libroDiario.filas.length

    const segundo = store.aprobarDocumento('doc-compra-C-008')

    expect(primero).toMatchObject({ ok: true, duplicado: false })
    expect(segundo).toMatchObject({
      ok: true,
      duplicado: true,
      asientoId: 'asiento-compra-C-008',
    })
    expect(store.asientosRegistrados.length).toBe(registrados)
    expect(store.libroDiario.filas.length).toBe(filas)
    expect(
      store.asientosRegistrados.filter(
        (asiento) => asiento.origenId === 'C-008' && asiento.origen === 'compra',
      ),
    ).toHaveLength(1)
    expect(
      store.estado.asientos.filter((asiento) => asiento.id === 'asiento-compra-C-008'),
    ).toHaveLength(1)
  })

  it('mantiene la ecuación patrimonial al registrar los pendientes', () => {
    const store = useContabilidadStore()

    expect(store.estadoSituacionPatrimonial.ecuacionVerificada).toBe(true)
    expect(store.estadoResultados.resultadoEjercicio).toBe(87_875_000)
    expect(store.estadoFlujoEfectivo.conciliado).toBe(true)
    expect(store.estadoEvolucionPatrimonioNeto.conciliado).toBe(true)
    expect(store.estadoEvolucionPatrimonioNeto.resultadoEjercicio).toBe(
      store.estadoResultados.resultadoEjercicio,
    )
    expect(store.estadoEvolucionPatrimonioNeto.totalPatrimonioNeto).toBe(
      store.estadoSituacionPatrimonial.totalPatrimonioNeto,
    )

    store.aprobarDocumento('doc-compra-C-008')
    store.aprobarDocumento('doc-venta-V-008')

    expect(store.balanceComprobacion.balanceado).toBe(true)
    expect(store.estadoSituacionPatrimonial.ecuacionVerificada).toBe(true)
    expect(store.estadoSituacionPatrimonial.diferencia).toBe(0)
    expect(store.estadoFlujoEfectivo.conciliado).toBe(true)
    expect(store.estadoEvolucionPatrimonioNeto.conciliado).toBe(true)
    expect(store.coherenciaEstados).toEqual({
      balanceCierra: true,
      ecuacionPatrimonial: true,
      resultadoCoincide: true,
      evolucionConciliada: true,
      flujoConciliado: true,
    })
  })

  it('rechaza documentos inexistentes', () => {
    const store = useContabilidadStore()

    const resultado = store.aprobarDocumento('doc-inexistente')

    expect(resultado).toEqual({
      ok: false,
      duplicado: false,
      motivo: 'documento_no_encontrado',
    })
  })

  it('persiste el estado y lo recupera al crear otro store', () => {
    const store = useContabilidadStore()
    store.aprobarDocumento('doc-venta-V-008')

    setActivePinia(createPinia())
    const nuevoStore = useContabilidadStore()

    expect(nuevoStore.estado.documentos).toHaveLength(store.estado.documentos.length)
    expect(nuevoStore.estado.documentos.find((doc) => doc.id === 'doc-venta-V-008')?.estado).toBe(
      'registrado',
    )
    expect(nuevoStore.asientosRegistrados).toHaveLength(36)
    expect(nuevoStore.libroDiario.balanceado).toBe(true)
  })

  it('restaura los datos demo originales', () => {
    const store = useContabilidadStore()
    store.aprobarDocumento('doc-venta-V-008')
    expect(store.asientosRegistrados).toHaveLength(36)

    store.restaurarDemo()

    expect(store.asientosRegistrados).toHaveLength(35)
    expect(store.asientosPropuestos).toHaveLength(2)
    expect(store.documentosPendientes).toHaveLength(2)
    expect(store.estado.documentos.find((doc) => doc.id === 'doc-venta-V-008')?.estado).toBe(
      'pendiente',
    )
    expect(
      store.estado.asientos.find((asiento) => asiento.id === 'asiento-venta-V-008')?.estado,
    ).toBe('propuesto')

    expect(cargarEstado()?.asientos).toHaveLength(37)
    expect(cargarEstado()?.documentos.find((doc) => doc.id === 'doc-venta-V-008')?.estado).toBe(
      'pendiente',
    )
  })

  it('reinicia en memoria sin modificar la persistencia', () => {
    const store = useContabilidadStore()
    store.aprobarDocumento('doc-venta-V-008')

    store.reiniciarEnMemoria()

    expect(store.asientosRegistrados).toHaveLength(35)
    expect(cargarEstado()?.documentos.find((doc) => doc.id === 'doc-venta-V-008')?.estado).toBe(
      'registrado',
    )
  })

  it('vuelve a la demo si el almacenamiento está corrupto', () => {
    localStorage.setItem(CLAVE_ALMACENAMIENTO, '{esto no es json')

    const store = useContabilidadStore()

    expect(store.estado.asientos).toHaveLength(37)
    expect(store.asientosRegistrados).toHaveLength(35)
    expect(cargarEstado()).not.toBeNull()
  })

  it('descarta un estado persistido de una versión incompatible', () => {
    const estado = crearEstadoDemo()
    localStorage.setItem(
      CLAVE_ALMACENAMIENTO,
      JSON.stringify({ version: 999, actualizadoEn: '', estado: { ...estado, version: 999 } }),
    )

    expect(cargarEstado()).toBeNull()

    const store = useContabilidadStore()
    expect(store.estado.version).toBe(1)
    expect(store.estado.asientos).toHaveLength(37)
  })

  it('persiste cambios manuales del estado', () => {
    expect(guardarEstado(crearEstadoDemo())).toBe(true)

    const store = useContabilidadStore()
    store.estado.empresa.razonSocial = 'Empresa de prueba'
    expect(store.persistir()).toBe(true)
  })

  it('actualiza y persiste los datos de la empresa y del usuario', () => {
    const store = useContabilidadStore()
    const logo = 'data:image/png;base64,AAAA'

    store.actualizarEmpresa({
      razonSocial: 'Empresa Editada S.A.',
      nombreComercial: 'Empresa Editada',
      logoDataUrl: logo,
    })
    store.actualizarUsuario({
      nombre: 'Usuario de Prueba',
      rol: 'Contador',
      email: 'usuario@empresa.test',
      area: 'Contabilidad',
    })

    const persistido = cargarEstado()
    expect(persistido?.empresa.razonSocial).toBe('Empresa Editada S.A.')
    expect(persistido?.empresa.nombreComercial).toBe('Empresa Editada')
    expect(persistido?.empresa.logoDataUrl).toBe(logo)
    expect(persistido?.usuario).toEqual({
      nombre: 'Usuario de Prueba',
      rol: 'Contador',
      email: 'usuario@empresa.test',
      area: 'Contabilidad',
    })

    setActivePinia(createPinia())
    const nuevoStore = useContabilidadStore()
    expect(nuevoStore.estado.empresa.razonSocial).toBe('Empresa Editada S.A.')
    expect(nuevoStore.estado.empresa.logoDataUrl).toBe(logo)
    expect(nuevoStore.estado.usuario.nombre).toBe('Usuario de Prueba')
  })

  it('restaura la empresa, el usuario y el logo originales de la demo', () => {
    const store = useContabilidadStore()
    store.actualizarEmpresa({
      razonSocial: 'Empresa Editada S.A.',
      logoDataUrl: 'data:image/png;base64,AAAA',
    })
    store.actualizarUsuario({ nombre: 'Usuario de Prueba', rol: 'Contador' })

    store.restaurarDemo()

    expect(store.estado.empresa).toEqual(EMPRESA_DEMO)
    expect(store.estado.usuario).toEqual(USUARIO_DEMO)
    expect(store.estado.empresa.logoDataUrl).toBeNull()
    expect(cargarEstado()?.empresa).toEqual(EMPRESA_DEMO)
    expect(cargarEstado()?.usuario).toEqual(USUARIO_DEMO)
  })

  it('completa el usuario cuando un estado guardado no lo incluye', () => {
    const estadoSinUsuario = crearEstadoDemo() as Partial<EstadoContable>
    delete estadoSinUsuario.usuario
    expect(guardarEstado(estadoSinUsuario as EstadoContable)).toBe(true)

    expect(cargarEstado()?.usuario).toEqual(USUARIO_DEMO)

    const store = useContabilidadStore()
    expect(store.estado.usuario).toEqual(USUARIO_DEMO)
  })
})
