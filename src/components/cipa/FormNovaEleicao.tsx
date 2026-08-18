import { useState, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { criarEleicao } from '@/lib/cipa/acoes';
import { Botao, Campo, Seletor } from '@/components/ui/Form';
import { Aviso } from './Aviso';
import type { UnidadeOpcao } from '@/lib/cipa/types';

function formatarCnpj(v: string) {
  const d = (v || '').replace(/\D/g, '');
  if (d.length !== 14) return v;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

/** Sugere a gestão como o biênio seguinte, que é o padrão da NR-05. */
function gestaoSugerida() {
  const ano = new Date().getFullYear();
  return `${ano}/${ano + 1}`;
}

export function FormNovaEleicao({ unidades }: { unidades: UnidadeOpcao[] }) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);
  const navigate = useNavigate();

  const hoje = new Date();
  const daquiUmaSemana = new Date(hoje.getTime() + 7 * 864e5);
  const paraInput = (d: Date) => d.toISOString().slice(0, 16);

  return (
    <form
      className="mt-8 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm"
      action={(dados) =>
        iniciar(async () => {
          const r = await criarEleicao(dados);
          if (!r.ok) { setAviso({ tom: 'erro', texto: r.mensagem }); return; }
          if (r.id) navigate(`/cipa/${r.id}`);
        })
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Seletor rotulo="Unidade (estabelecimento)" name="unidade_id" required defaultValue="">
            <option value="" disabled>Selecione…</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.matriz ? '★ ' : ''}{u.nome_fantasia || u.razao_social}
                {' — '}{formatarCnpj(u.numero_inscricao)}
                {u.municipio ? ` — ${u.municipio}/${u.uf ?? ''}` : ''}
              </option>
            ))}
          </Seletor>
        </div>

        <div className="sm:col-span-2">
          <Campo rotulo="Título" name="titulo" required defaultValue={`Eleição CIPA ${gestaoSugerida()}`} />
        </div>

        <Seletor rotulo="Norma" name="norma" defaultValue="NR-05">
          <option value="NR-05">NR-05 — CIPA</option>
          <option value="NR-31">NR-31 — CIPATR (rural)</option>
        </Seletor>

        <Campo rotulo="Gestão" name="gestao" defaultValue={gestaoSugerida()} />

        <Campo rotulo="Abertura da urna" name="data_inicio" type="datetime-local" required
          defaultValue={paraInput(hoje)} />

        <Campo rotulo="Fechamento da urna" name="data_fim" type="datetime-local" required
          defaultValue={paraInput(daquiUmaSemana)} />

        <Campo rotulo="Vagas de efetivos" name="vagas_efetivos" type="number" min={1}
          defaultValue={1} className="font-mono" />

        <Campo rotulo="Vagas de suplentes" name="vagas_suplentes" type="number" min={0}
          defaultValue={1} className="font-mono" />

        <label className="flex items-start gap-3 sm:col-span-2">
          <input name="permite_qr_code" type="checkbox" defaultChecked
                 className="mt-1 h-5 w-5 accent-primary-container" />
          <span>
            <span className="font-medium text-on-surface">Permitir voto por QR Code no mural</span>
            <span className="mt-0.5 block text-label-sm text-on-surface-variant">
              Necessário quando há trabalhadores sem e-mail ou telefone cadastrado.
              Esses votos passam por conferência antes de serem computados.
            </span>
          </span>
        </label>
      </div>

      <p className="mt-6 max-w-2xl text-label-sm text-outline">
        O número de vagas deve seguir o Quadro I da NR-05, conforme o CNAE e o número de
        empregados da unidade. Confira antes de abrir a votação — depois de aberta, alterar
        a composição invalida o processo.
      </p>

      <Botao type="submit" variante="primario" className="mt-6" disabled={pendente}>
        {pendente ? 'Criando…' : 'Criar eleição'}
      </Botao>

      {aviso && <Aviso tom={aviso.tom} texto={aviso.texto} />}
    </form>
  );
}
