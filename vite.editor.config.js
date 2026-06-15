import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ViteYaml from '@modyfi/vite-plugin-yaml'

export default defineConfig({
  plugins: [vue(), ViteYaml()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: 'build/config-editor',
    rollupOptions: {
      input: {
        editor: 'editor.html'
      }
    }
  },
  base: './'
})
