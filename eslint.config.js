import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import path from 'node:path'
import skipFormattingConfig from '@vue/eslint-config-prettier/skip-formatting'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import eslintConfigPrettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

import { includeIgnoreFile } from '@eslint/compat'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const gitignorePath = path.resolve(__dirname, '.gitignore')

export default tseslint.config(
  {
    files: ['**/*.{ts,js,mts,tsx,vue}']
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  ...vueTsEslintConfig(),
  includeIgnoreFile(gitignorePath),
  eslintConfigPrettier,
  skipFormattingConfig
)
