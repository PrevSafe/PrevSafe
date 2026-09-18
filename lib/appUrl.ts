/**
 * URL publica da aplicacao.
 *
 * Usada em links de convite e, principalmente, na URL de validacao que entra no
 * QR Code dos documentos assinados. Se ela apontar para um dominio errado, o QR
 * impresso num PGR assinado leva o fiscal a lugar nenhum - por isso o valor vem
 * de configuracao, e nao de um dominio chumbado no codigo.
 *
 * No navegador, a origem real da pagina sempre vence: e a verdade sobre onde o
 * sistema esta rodando. NEXT_PUBLIC_APP_URL cobre a renderizacao no servidor.
 */
export function getAppUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  return configured ? configured.replace(/\/+$/, '') : '';
}

/** URL de verificacao de autenticidade impressa no QR Code do documento. */
export function buildDocumentVerificationUrl(documentNumber: string, hash: string): string {
  const base = getAppUrl();
  const query = `validar?doc=${encodeURIComponent(documentNumber)}&hash=${encodeURIComponent(hash)}`;
  return base ? `${base}/${query}` : `/${query}`;
}
