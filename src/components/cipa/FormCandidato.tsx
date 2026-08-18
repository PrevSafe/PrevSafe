import { useState, useTransition } from 'react';
import { criarCandidato } from '@/lib/cipa/acoes';
import { Botao, Campo, Seletor } from '@/components/ui/Form';
import { Aviso } from './Aviso';

export type EleitorOpcao = {
  funcionario_id: string | null;
  nome: string;
  cargo: string | null;
  setor: string | null;
};

export function FormCandidato({
  eleicaoId, elegiveis,
}: {
  eleicaoId: string;
  elegiveis: EleitorOpcao[];
}) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);
  const [escolhido, setEscolhido] = useState('');

  const atual = elegiveis.find((e) => e.funcionario_id === escolhido);

  return (
    <form
      className="mt-8 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm"
      action={(dados) =>
        iniciar(async () => {
          const r = await criarCandidato(eleicaoId, dados);
          setAviso({ tom: r.ok ? 'ok' : 'erro', texto: r.mensagem });
        })
      }
    >
      <p className="text-label-sm uppercase tracking-wider text-outline">Inscrição</p>
      <h2 className="mt-2 text-title-lg font-bold text-on-surface">Cadastrar candidato</h2>
      <p className="mt-2 max-w-2xl text-on-surface-variant">
        Escolher um funcionário da lista traz nome, CPF e data de admissão automaticamente —
        a admissão é o critério de desempate.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Seletor
            rotulo="Funcionário"
            name="funcionario_id"
            value={escolhido}
            onChange={(e) => setEscolhido(e.target.value)}
          >
            <option value="">Cadastrar manualmente…</option>
            {elegiveis.filter((e) => e.funcionario_id).map((e) => (
              <option key={e.funcionario_id!} value={e.funcionario_id!}>
                {e.nome}{e.cargo ? ` — ${e.cargo}` : ''}
              </option>
            ))}
          </Seletor>
        </div>

        <Campo rotulo="Número na urna" name="numero_urna" inputMode="numeric"
          className="font-mono" placeholder="10" />

        <Campo rotulo="Nome na urna" name="nome_urna" required placeholder="Como é conhecido"
          defaultValue={atual?.nome.split(' ')[0] ?? ''} key={escolhido + 'u'} />

        {!escolhido && (
          <div className="sm:col-span-2">
            <Campo rotulo="Nome completo" name="nome_completo" required={!escolhido} />
          </div>
        )}

        <Campo rotulo="Função" name="cargo" defaultValue={atual?.cargo ?? ''} key={escolhido + 'c'} />

        <Campo rotulo="Setor" name="setor" defaultValue={atual?.setor ?? ''} key={escolhido + 's'} />
      </div>

      <Botao type="submit" variante="primario" className="mt-5" disabled={pendente}>
        {pendente ? 'Salvando…' : 'Cadastrar candidato'}
      </Botao>

      {aviso && <Aviso tom={aviso.tom} texto={aviso.texto} />}
    </form>
  );
}
