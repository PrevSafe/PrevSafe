/**
 * Carimbo da versao que gerou um documento PDF.
 *
 * POR QUE ISTO EXISTE
 *
 * Depois de uma correcao no Kit Admissional, o usuario gerou o kit de novo e
 * recebeu exatamente o PDF antigo. O codigo novo ESTAVA publicado - o
 * navegador e que rodou um bundle guardado em cache. Do PDF na mao nao havia
 * como distinguir uma coisa da outra, e a conversa girou em falso.
 *
 * Todo PDF passa a sair com a versao no rodape. Se o carimbo nao bater com o
 * que esta publicado, o problema e cache, nao o gerador.
 *
 * O SHA vem do Vercel, que expoe NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA aos
 * projetos Next.js. Em desenvolvimento ele nao existe e o carimbo sai so com
 * a versao.
 */
export const VERSAO_PUBLICADA = '2026.09.23';

const SHA = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || '').slice(0, 7);

export const VERSAO_DO_DOCUMENTO = SHA
  ? `v${VERSAO_PUBLICADA}-${SHA}`
  : `v${VERSAO_PUBLICADA}`;
