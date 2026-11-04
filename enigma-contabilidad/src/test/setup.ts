// jsdom no implementa window.scrollTo; el router lo invoca en scrollBehavior.
Object.defineProperty(window, 'scrollTo', {
  value: () => undefined,
  writable: true,
})
