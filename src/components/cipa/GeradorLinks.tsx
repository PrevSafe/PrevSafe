import { useState, useTransition } from 'react';
import { gerarTokens } from '@/lib/cipa/acoes';
import { baixarCsv } from '@/lib/cipa/csv';
import { Botao } from '@/components/ui/Form';
import { Aviso } from './Aviso';

/** O token só existe em claro nesta tela, uma vez. O banco guarda o hash. */
export function GeradorLinks({ eleicaoId }: { eleicaoId: string }) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);

  function baixar(linhas: string[]) {
    const conteudo = 'nome;contato;link\n' + linhas.join('\n');
    baixarCsv(`links-magicos-${eleicaoId.slice(0, 8)}.csv`, conteudo);
  }

  return (
    <div className="mt-6 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm">
      <p className="text-label-sm uppercase tracking-wider text-outline">Links mágicos</p>
      <h2 className="mt-2 text-title-lg font-bold text-on-surface">Gerar e baixar os links</h2>
      <p className="mt-2 max-w-2xl text-on-surface-variant">
        Gera um link por eleitor que ainda não votou e ainda não tem link. O arquivo baixa na
        hora — os links não podem ser recuperados depois, só regerados.
      </p>

      <Botao
        type="button"
        variante="primario"
        className="mt-5"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await gerarTokens(eleicaoId);
            setAviso({ tom: r.ok ? 'ok' : 'erro', texto: r.mensagem });
            if (r.ok && r.links?.length) baixar(r.links);
          })
        }
      >
        {pendente ? 'Gerando…' : 'Gerar links e baixar CSV'}
      </Botao>

      {aviso && <Aviso tom={aviso.tom} texto={aviso.texto} />}
    </div>
  );
}
