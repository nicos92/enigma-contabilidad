import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'
import base from './vite.config.ts'

// Build autónomo opcional: un único HTML que se puede abrir con doble clic.
// No reemplaza al build principal (`pnpm build`).
export default mergeConfig(
  base,
  defineConfig({
    base: './',
    build: {
      outDir: 'dist-single',
      emptyOutDir: true,
      cssCodeSplit: false,
      assetsInlineLimit: 100_000_000,
      rolldownOptions: {
        output: {
          codeSplitting: false,
        },
      },
    },
  }),
)
