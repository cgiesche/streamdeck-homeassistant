import path from 'node:path'
import url from 'node:url'

import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import yaml from '@rollup/plugin-yaml'
import fg from 'fast-glob'
import type { RollupOptions } from 'rollup'
import { cleandir } from 'rollup-plugin-cleandir'
import copy from 'rollup-plugin-copy'

const isWatching = !!process.env.ROLLUP_WATCH
const sdPlugin = 'de.perdoctus.streamdeck.homeassistant.sdPlugin'

const config: RollupOptions = {
  input: 'src/plugin.ts',
  output: {
    file: `${sdPlugin}/bin/plugin.js`,
    sourcemap: isWatching,
    sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
      return url.pathToFileURL(path.resolve(path.dirname(sourcemapPath), relativeSourcePath)).href
    }
  },
  plugins: [
    {
      name: 'watch-externals',
      async buildStart() {
        const publicFiles = await fg('public/**/*')
        for (const file of publicFiles) {
          this.addWatchFile(file)
        }
        const vueFiles = await fg('src/view/components/**/*.vue')
        for (const file of vueFiles) {
          this.addWatchFile(file)
        }
      }
    },
    cleandir(`./${sdPlugin}`),
    copy({
      targets: [{ src: 'public/*', dest: sdPlugin }]
    }),
    alias({
      entries: [
        {
          find: '@',
          replacement: path.resolve('./src')
        }
      ]
    }),
    json(),
    yaml(),
    typescript({
      mapRoot: isWatching ? './' : undefined,
      exclude: ['src/pi/main.ts', 'src/plugin/main.ts', '**/*.test.ts', 'test/**', '*.config.ts']
    }),
    nodeResolve({
      browser: false,
      exportConditions: ['node'],
      preferBuiltins: true
    }),
    commonjs(),
    !isWatching && terser(),
    {
      name: 'emit-module-package-file',
      generateBundle() {
        this.emitFile({ fileName: 'package.json', source: `{ "type": "module" }`, type: 'asset' })
      }
    }
  ]
}

// noinspection JSUnusedGlobalSymbols
export default config
