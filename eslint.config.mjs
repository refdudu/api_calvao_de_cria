import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.node, // habilita variáveis globais do Node (require, process, __dirname, etc.)
      },
      ecmaVersion: 'latest',
      sourceType: 'commonjs', // já que você está usando require()
    },
    plugins: { js },
    extends: ['js/recommended', 'plugin:prettier/recommended'],
    rules: {
      quotes: ['error', 'single'], // força uso de aspas simples 'a'
      semi: ['error', 'always'], // força ponto e vírgula
      'no-unused-vars': ['warn'], // avisa sobre variáveis declaradas mas não usadas
      'no-console': 'off', // desativa bloqueio de console.log
      eqeqeq: ['error', 'always'], // força uso de === em vez de ==
      curly: ['error', 'all'], // força sempre usar chaves em if/while/for
      'no-var': 'error', // proíbe var, use let/const
      'prefer-const': 'error', // sugere const sempre que possível
    },
  },
]);
