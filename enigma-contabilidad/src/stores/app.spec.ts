import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '@/stores/app'

describe('useAppStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('expone los datos institucionales de la demo', () => {
    const store = useAppStore()

    expect(store.nombreEmpresa).toBe('Enigma Solutions')
    expect(store.nombreProducto).toBe('Enigma Gestión')
    expect(store.periodo).toBe('Noviembre 2026')
    expect(store.usuario.rol).toBe('Administración')
  })
})
