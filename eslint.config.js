import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue'
import path from "node:path";
import skipFormattingConfig from "@vue/eslint-config-prettier/skip-formatting";

import { includeIgnoreFile } from "@eslint/compat";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  includeIgnoreFile(gitignorePath),
  skipFormattingConfig,
  {
    files: ["**/*.vue", "**/*.js", "**/*.jsx", "**/*.cjs", "**/*.mjs"],
  }
]
