<script setup lang="ts">
import { computed } from 'vue'
import { formatearFecha, formatearMoneda } from '@/core/dinero'
import type { DocumentoVista, ItemDocumentoVista } from './tipos'

const props = defineProps<{
  documento: DocumentoVista
}>()

const inicialesEmisor = computed(() => {
  const partes = props.documento.emisor.nombre.split(/\s+/).filter(Boolean)
  return partes
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('')
})

function importeLinea(item: ItemDocumentoVista): number {
  return item.cantidad * item.precioUnitario
}
</script>

<template>
  <article class="documento" aria-label="Visor de documento">
    <div class="documento__marca-agua" aria-hidden="true"></div>

    <header class="documento__cabecera">
      <div class="documento__emisor">
        <span class="documento__logo">
          <img
            v-if="documento.emisor.logoSrc"
            :src="documento.emisor.logoSrc"
            alt=""
            aria-hidden="true"
          />
          <template v-else>{{ inicialesEmisor }}</template>
        </span>
        <div>
          <strong>{{ documento.emisor.nombre }}</strong>
          <span v-if="documento.emisor.cuit">CUIT {{ documento.emisor.cuit }}</span>
          <span v-if="documento.emisor.direccion">{{ documento.emisor.direccion }}</span>
          <span v-if="documento.emisor.condicionIva">
            {{ documento.emisor.condicionIva }}
          </span>
        </div>
      </div>

      <div class="documento__tipo">
        <strong>{{ documento.tipoEtiqueta }}</strong>
        <span>N.º {{ documento.numero }}</span>
        <span>Fecha {{ formatearFecha(documento.fecha) }}</span>
        <span v-if="documento.estadoEtiqueta">{{ documento.estadoEtiqueta }}</span>
      </div>
    </header>

    <div class="documento__partes">
      <div class="documento__parte">
        <h4>Emisor</h4>
        <p>
          <strong>{{ documento.emisor.nombre }}</strong>
          <template v-if="documento.emisor.cuit"><br />CUIT {{ documento.emisor.cuit }}</template>
          <template v-if="documento.emisor.direccion">
            <br />{{ documento.emisor.direccion }}
          </template>
          <template v-if="documento.emisor.condicionIva">
            <br />{{ documento.emisor.condicionIva }}
          </template>
        </p>
      </div>
      <div class="documento__parte">
        <h4>Receptor</h4>
        <p>
          <strong>{{ documento.receptor.nombre }}</strong>
          <template v-if="documento.receptor.cuit">
            <br />CUIT {{ documento.receptor.cuit }}
          </template>
          <template v-if="documento.receptor.direccion">
            <br />{{ documento.receptor.direccion }}
          </template>
          <template v-if="documento.receptor.condicionIva">
            <br />{{ documento.receptor.condicionIva }}
          </template>
        </p>
      </div>
    </div>

    <div class="documento__detalle">
      <table class="documento__tabla">
        <thead>
          <tr>
            <th scope="col">Descripción</th>
            <th scope="col" class="derecha">Cantidad</th>
            <th scope="col" class="derecha">Precio unitario</th>
            <th scope="col" class="derecha">IVA</th>
            <th scope="col" class="derecha">Importe</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, indice) in documento.items" :key="indice">
            <td>{{ item.descripcion }}</td>
            <td class="derecha">{{ item.cantidad }}</td>
            <td class="derecha">{{ formatearMoneda(item.precioUnitario) }}</td>
            <td class="derecha">{{ item.alicuotaIva ?? 0 }}%</td>
            <td class="derecha">{{ formatearMoneda(importeLinea(item)) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="documento__totales">
        <div class="documento__total-fila">
          <span>Subtotal</span>
          <strong>{{ formatearMoneda(documento.subtotal) }}</strong>
        </div>
        <div class="documento__total-fila">
          <span>IVA</span>
          <strong>{{ formatearMoneda(documento.iva) }}</strong>
        </div>
        <div class="documento__total-fila documento__total-fila--destacada">
          <span>Total</span>
          <strong>{{ formatearMoneda(documento.total) }}</strong>
        </div>
      </div>
    </div>

    <p v-if="documento.observaciones" class="documento__observaciones">
      {{ documento.observaciones }}
    </p>

    <footer class="documento__pie">
      <p class="documento__leyenda">
        Documento generado con fines exclusivamente demostrativos. No constituye un comprobante
        fiscal válido ni respalda operaciones reales.
      </p>
      <span class="documento__sello">Demostración</span>
    </footer>
  </article>
</template>
