import { useState, useTransition } from 'react';
import { criarMembroComissao, removerMembroComissao } from '@/lib/cipa/acoes';
import { Secao, Botao, Campo, Seletor } from '@/components/ui/Form';
import { Aviso } from './Aviso';
import { cpfValido, formatarCpf, somenteDigitos } from '@/lib/cipa/cpf';
import type { MembroComissao, PapelComissao } from '@/lib/cipa/types';

const ROTULO_PAPEL: Record<PapelComissao, string> = {
  presidente: 'Presidente',
  vice_presidente: 'Vice-presidente',
  secretario: 'Secretário(a)',
  membro: 'Membro',
};

export function ComissaoMembros({
  eleicaoId, membros, aoAlterar,
}: {
  eleicaoId: string;
  membros: MembroComissao[];
  aoAlterar: (membros: MembroComissao[]) => void;
}) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);
  const [cpf, setCpf] = useState('');

  const presidenteAtual = membros.find((m) => m.papel === 'presidente');
  const viceAtual = membros.find((m) => m.papel === 'vice_presidente');

  function adicionar(dados: FormData) {
    iniciar(async () => {
      if (cpf && !cpfValido(cpf)) {
        setAviso({ tom: 'erro', texto: 'CPF inválido. Confira os números.' });
        return;
      }
      const r = await criarMembroComissao(eleicaoId, dados);
      setAviso({ tom: r.ok ? 'ok' : 'erro', texto: r.mensagem });
      if (r.ok && r.membro) {
        aoAlterar([...membros, r.membro]);
        setCpf('');
      }
    });
  }

  function remover(id: string) {
    iniciar(async () => {
      const r = await removerMembroComissao(id);
      if (r.ok) aoAlterar(membros.filter((m) => m.id !== id));
      else setAviso({ tom: 'erro', texto: r.mensagem });
    });
  }

  return (
    <Secao icone="groups" titulo="Membros da comissão">
      <form className="grid gap-4 sm:grid-cols-2" action={adicionar} key={membros.length}>
        <Campo rotulo="Nome" name="nome" required />
        <Campo
          rotulo="CPF (opcional)"
          name="cpf"
          className="font-mono"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={formatarCpf(cpf)}
          onChange={(e) => setCpf(somenteDigitos(e.target.value).slice(0, 11))}
        />
        <Campo rotulo="Cargo (opcional)" name="cargo" />
        <Seletor rotulo="Papel" name="papel" required defaultValue="membro">
          <option value="presidente" disabled={!!presidenteAtual}>
            {presidenteAtual ? `Presidente — ocupado por ${presidenteAtual.nome}` : 'Presidente'}
          </option>
          <option value="vice_presidente" disabled={!!viceAtual}>
            {viceAtual ? `Vice-presidente — ocupado por ${viceAtual.nome}` : 'Vice-presidente'}
          </option>
          <option value="secretario">Secretário(a)</option>
          <option value="membro">Membro</option>
        </Seletor>

        <div className="sm:col-span-2">
          <Botao type="submit" variante="primario" disabled={pendente}>
            {pendente ? 'Salvando…' : 'Adicionar membro'}
          </Botao>
        </div>
      </form>

      {aviso && <Aviso tom={aviso.tom} texto={aviso.texto} />}

      {membros.length === 0 ? (
        <p className="text-label-sm text-outline">Nenhum membro cadastrado ainda.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {membros.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/40 bg-surface p-4">
              <div className="min-w-0">
                <p className="truncate text-title-md font-bold text-on-surface">{m.nome}</p>
                <p className="text-label-sm text-on-surface-variant">
                  {ROTULO_PAPEL[m.papel]}{m.cargo ? ` · ${m.cargo}` : ''}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remover ${m.nome}`}
                disabled={pendente}
                onClick={() => remover(m.id)}
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
