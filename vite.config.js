import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
const path = require('path')

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap')
        }
    },
    build: {
        rollupOptions: {
            input: {
                pi: 'pi.html',
                plugin: 'plugin.html'
            }
        }
    },
    base: "./"
})
