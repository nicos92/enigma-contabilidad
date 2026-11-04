import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import pluginVue from 'eslint-plugin-vue'

export default defineConfigWithVueTs(
  {
    name: 'enigma/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  {
    name: 'enigma/files-to-ignore',
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'pnpm-lock.yaml'],
  },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    name: 'enigma/rules',
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  skipFormatting,
)
