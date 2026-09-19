import { redirect } from 'next/navigation';

/**
 * Atalho em ingles para o sistema.
 *
 * O dominio .com atrai quem digita /system por habito; o caminho canonico e
 * /sistema, para nao existirem dois enderecos indexaveis com o mesmo conteudo.
 */
export default function SystemRedirect() {
  redirect('/sistema');
}
