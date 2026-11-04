<template>
  <section class="page">
    <div class="page__header">
      <div>
        <h2>Página no encontrada</h2>
        <p class="page__lead">
          La dirección solicitada no corresponde a ninguna sección del sistema.
        </p>
      </div>
      <span class="badge badge--error">Error 404</span>
    </div>

    <div class="card card--vacia">
      <p>Volver al panel general para continuar.</p>
      <RouterLink class="button" to="/dashboard">Ir al panel general</RouterLink>
    </div>
  </section>
</template>
