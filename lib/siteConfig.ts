/**
 * Dados institucionais exibidos no site publico.
 *
 * Ficam em um lugar so para nao se espalharem pelas paginas: telefone e e-mail
 * mudam, e trocar em um arquivo e melhor do que cacar por doze componentes.
 * Os valores vêm do cadastro real da empresa no sistema.
 */

const TELEFONE = '(73) 99918-9499';

export const EMPRESA = {
  nome: 'PrevSafe',
  razaoSocial: 'G Monteiro Empreendimentos LTDA',
  cnpj: '69.133.606/0001-00',
  email: 'evoluaevenca@gmail.com',
  telefone: TELEFONE,
  telefoneLimpo: `+55${TELEFONE.replace(/\D/g, '')}`,
  whatsapp: `55${TELEFONE.replace(/\D/g, '')}`,
  atuacao: 'Atendimento em todo o Brasil',
};

/** Mensagem que ja abre preenchida ao clicar no WhatsApp. */
export function linkWhatsApp(contexto?: string): string {
  const texto = contexto
    ? `Olá! Vim pelo site da PrevSafe e gostaria de falar sobre ${contexto}.`
    : 'Olá! Vim pelo site da PrevSafe e gostaria de falar com um especialista.';
  return `https://wa.me/${EMPRESA.whatsapp}?text=${encodeURIComponent(texto)}`;
}
