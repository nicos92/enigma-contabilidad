import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = dirname(dirname(fileURLToPath(import.meta.url)))
const salida = join(raiz, 'dist-single')

function ejecutarBuild() {
  const comando = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const resultado = spawnSync(
    comando,
    ['exec', 'vite', 'build', '--config', 'vite.single.config.ts'],
    {
      cwd: raiz,
      stdio: 'inherit',
    },
  )

  if (resultado.status !== 0) {
    process.exit(resultado.status ?? 1)
  }
}

function archivoDesdeHtml(referencia) {
  return join(salida, referencia.replace(/^\.\//, ''))
}

function leerComoTexto(ruta) {
  return readFileSync(ruta, 'utf8')
}

function incrustarCss(html) {
  return html.replace(
    /<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
    (_coincidencia, referencia) => {
      const css = leerComoTexto(archivoDesdeHtml(referencia))
      return `<style>\n${css}\n</style>`
    },
  )
}

function incrustarJs(html) {
  return html.replace(
    /<script[^>]+type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g,
    (_coincidencia, referencia) => {
      const js = leerComoTexto(archivoDesdeHtml(referencia)).replace(/<\/script/gi, '<\\/script')
      return `<script type="module">\n${js}\n</script>`
    },
  )
}

function incrustarFavicon(html) {
  const favicon = readFileSync(join(raiz, 'public', 'favicon.svg'))
  const dataUri = `data:image/svg+xml;base64,${favicon.toString('base64')}`
  return html.replace(
    /<link[^>]+rel="icon"[^>]*>/,
    `<link rel="icon" type="image/svg+xml" href="${dataUri}" />`,
  )
}

ejecutarBuild()

const indice = join(salida, 'index.html')
let html = leerComoTexto(indice)
html = incrustarFavicon(html)
html = incrustarCss(html)
html = incrustarJs(html)
html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/g, '')
writeFileSync(indice, html)

const referenciasPendientes = html.match(/(?:src|href)="\.?\/?assets\//g)
if (referenciasPendientes) {
  console.error('El HTML todavía referencia archivos en assets/: no se puede eliminar la carpeta.')
  process.exit(1)
}

rmSync(join(salida, 'assets'), { recursive: true, force: true })

const peso = statSync(indice).size / 1024 / 1024
console.log(`\nBuild autónomo generado: dist-single/index.html (${peso.toFixed(2)} MB)`)
