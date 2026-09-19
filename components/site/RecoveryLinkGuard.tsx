'use client';

import { useEffect } from 'react';

/**
 * Encaminha para a tela de senha um link de recuperacao que caia na raiz.
 *
 * O Supabase usa a Site URL quando o redirect pedido nao esta na lista
 * autorizada, e a raiz agora e o site publico. Sem este desvio, o token no
 * fragmento viraria uma sessao silenciosa e a pessoa nunca definiria a nova
 * senha - ficaria olhando a home sem entender o que aconteceu.
 */
function ehLinkDeRecuperacao(hash: string) {
  return hash.includes('type=recovery') && (hash.includes('access_token=') || hash.includes('error='));
}

export function RecoveryLinkGuard() {
  useEffect(() => {
    if (ehLinkDeRecuperacao(window.location.hash)) {
      window.location.replace(`/redefinir-senha${window.location.hash}`);
    }
  }, []);

  return null;
}
