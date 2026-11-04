import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/**
 * Ejecuta un callback cuando el usuario hace clic fuera del elemento indicado.
 * Se usa para cerrar menús y popovers del topbar.
 */
export function useClickOutside(
  elemento: Ref<HTMLElement | null>,
  alHacerClicFuera: () => void,
): void {
  function manejarClic(evento: MouseEvent): void {
    const destino = evento.target
    if (!(destino instanceof Node)) return
    if (elemento.value && !elemento.value.contains(destino)) {
      alHacerClicFuera()
    }
  }

  onMounted(() => document.addEventListener('mousedown', manejarClic))
  onBeforeUnmount(() => document.removeEventListener('mousedown', manejarClic))
}
