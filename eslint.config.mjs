import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

/**
 * eslint-config-next 15 ainda e config no formato antigo (eslintrc), entao
 * precisa do FlatCompat para rodar no ESLint 9. Spread direto do pacote,
 * como estava antes, carrega o patch do rushstack fora de contexto e o lint
 * morre antes de olhar qualquer arquivo.
 */
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  // src/ e o app Vite anterior a migracao para Next; nao entra no lint.
  { ignores: ['src/**', '.next/**', 'dist/**', 'node_modules/**', 'scripts/**', '*.config.*'] },
  ...compat.extends('next/core-web-vitals'),
];
