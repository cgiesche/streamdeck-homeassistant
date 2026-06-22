// Flat ESLint config for ESLint v9+
// Docs: https://eslint.org/docs/latest/use/configure/configuration-files-new

import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import globals from 'globals'

export default [
  // Ignore generated and bundled artifacts
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'logs/**',
      '.eslintrc.cjs'
    ]
  },

  // Base JS rules
  js.configs.recommended,

  // Vue 3 recommended rules
  ...vue.configs['flat/recommended'],

  // Browser context for application source files
  {
    files: ['src/**/*.{js,mjs,cjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser
    }
  },

  // Node.js context for config and tooling files
  {
    files: [
      'eslint.config.{js,cjs,mjs}',
      'vite.config.{js,cjs,mjs}',
      '**/*.config.{js,cjs,mjs}',
      'src/vite/**/*.js'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node
    }
  },

  // Disable rules that conflict with Prettier formatting
  skipFormatting
]
