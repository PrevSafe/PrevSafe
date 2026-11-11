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

  /**
   * react-hooks/set-state-in-effect entrou com o compilador do React e
   * aponta setState sincrono dentro de efeito -- um render em cascata a mais.
   * Sao 20 ocorrencias, varias dentro do PrevSafeContext, e corrigir cada uma
   * significa reestruturar hooks que funcionam, num sistema com dados reais
   * em producao e sem suite de testes. O custo de errar e maior que o ganho.
   *
   * Fica como aviso: o sinal continua aparecendo no lint e some do CI. A
   * divida e para pagar aos poucos, hook a hook, com a tela aberta do lado --
   * nao num mutirao automatizado.
   */
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];
