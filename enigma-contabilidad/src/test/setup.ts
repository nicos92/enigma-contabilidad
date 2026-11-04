// jsdom no implementa window.scrollTo; el router lo invoca en scrollBehavior.
Object.defineProperty(window, 'scrollTo', {
  value: () => undefined,
  writable: true,
})

// jsdom no implementa el contexto 2D de canvas. Devolver null permite que los
// componentes de gráficos detecten la ausencia y muestren su alternativa
// accesible, sin ruido de errores durante los tests.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => null,
  writable: true,
})
