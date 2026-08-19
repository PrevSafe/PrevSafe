import { useState, useTransition } from 'react';
import { criarIndicado, removerIndicado } from '@/lib/cipa/acoes';
import { Secao, Botao, Campo, Seletor } from '@/components/ui/Form';
import { Aviso } from './Aviso';
import type { CondicaoIndicado, Indicado } from '@/lib/cipa/types';

const ROTULO_CONDICAO: Record<CondicaoIndicado, string> = { titular: 'Titular', suplente: 'Suplente' };

export function ComissaoIndicados({
  eleicaoId, indicados, aoAlterar,
}: {
  eleicaoId: string;
  indicados: Indicado[];
  aoAlterar: (indicados: Indicado[]) => void;
}) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);

  function adicionar(dados: FormData) {
    iniciar(async () => {
      const r = await criarIndicado(eleicaoId, dados);
      setAviso({ tom: r.ok ? 'ok' : 'erro', texto: r.mensagem });
      if (r.ok && r.indicado) aoAlterar([...indicados, r.indicado]);
    });
  }

  function remover(id: string) {
    iniciar(async () => {
      const r = await removerIndicado(id);
      if (r.ok) aoAlterar(indicados.filter((i) => i.id !== id));
      else setAviso({ tom: 'erro', texto: r.mensagem });
    });
  }

  return (
    <Secao icone="badge" titulo="Representantes indicados pelo empregador">
      <p className="max-w-2xl text-on-surface-variant">
        A NR-05 exige composição paritária — o empregador indica o mesmo número de
        representantes que os eleitos pelos empregados.
      </p>

      <form className="grid gap-4 sm:grid-cols-2" action={adicionar} key={indicados.length}>
        <Campo rotulo="Nome" name="nome" required />
        <Campo rotulo="Cargo (opcional)" name="cargo" />
        <Campo rotulo="Setor (opcional)" name="setor" />
        <Seletor rotulo="Condição" name="condicao" required defaultValue="titular">
          <option value="titular">Titular</option>
          <option value="suplente">Suplente</option>
        </Seletor>

        <div className="sm:col-span-2">
          <Botao type="submit" variante="primario" disabled={pendente}>
            {pendente ? 'Salvando…' : 'Adicionar indicado'}
          </Botao>
        </div>
      </form>

      {aviso && <Aviso tom={aviso.tom} texto={aviso.texto} />}

      {indicados.length === 0 ? (
        <p className="text-label-sm text-outline">Nenhum representante indicado ainda.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {indicados.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/40 bg-surface p-4">
              <div className="min-w-0">
                <p className="truncate text-title-md font-bold text-on-surface">{i.nome}</p>
                <p className="text-label-sm text-on-surface-variant">
                  {ROTULO_CONDICAO[i.condicao]}{i.cargo ? ` · ${i.cargo}` : ''}{i.setor ? ` · ${i.setor}` : ''}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remover ${i.nome}`}
                disabled={pendente}
                onClick={() => remover(i.id)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Secao>
  );
}
