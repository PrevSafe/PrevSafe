import React from 'react';
import { useAuth } from '../contexts/AuthContext'; // ajuste o caminho conforme sua árvore

type CanProps = {
  recurso: string;
  acao: string;
  /** Renderizado quando o usuário não tem a permissão. Padrão: nada. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Esconde trechos da interface conforme a permissão do usuário.
 *
 *   <Can recurso="cipa" acao="editar">
 *     <BotaoEditar />
 *   </Can>
 *
 * Isto é conveniência de UI, não segurança. Quem controla o acesso de
 * verdade são as políticas de RLS no Postgres — esconder o botão só evita
 * que a pessoa clique em algo que o banco vai recusar de qualquer forma.
 */
export function Can({ recurso, acao, fallback = null, children }: CanProps) {
  const { can, carregando } = useAuth();

  // Enquanto o acesso carrega, não mostramos nem o conteúdo nem o fallback:
  // um botão que aparece e some em seguida é pior que um espaço vazio.
  if (carregando) return null;

  return <>{can(recurso, acao) ? children : fallback}</>;
}
