import { useState, useTransition } from 'react';
import { salvarApuracao } from '@/lib/cipa/acoes';
import { Secao, Botao, Campo, Seletor } from '@/components/ui/Form';
import { Aviso } from './Aviso';
import type { MembroComissao } from '@/lib/cipa/types';

export function ComissaoApuracao({
  eleicaoId, membros, dataReferencia, localSugerido, valores,
}: {
  eleicaoId: string;
  membros: MembroComissao[];
  dataReferencia: string;
  localSugerido: string;
  valores: {
    local_apuracao: string | null;
    hora_inicio: string | null;
    hora_fim: string | null;
    ata_lavrada_por: string | null;
  };
}) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);

  return (
    <Secao icone="gavel" titulo="Dados da sessão de apuração">
      <form
        className="grid gap-4 sm:grid-cols-2"
        action={(dados) =>
          iniciar(async () => {
            const r = await salvarApuracao(eleicaoId, dados);
            setAviso({ tom: r.ok ? 'ok' : 'erro', texto: r.mensagem });
          })
        }
      >
        <input type="hidden" name="data_referencia" value={dataReferencia} readOnly />

        <div className="sm:col-span-2">
          <Campo
            rotulo="Local da apuração"
            name="local_apuracao"
            defaultValue={valores.local_apuracao ?? ''}
            placeholder={localSugerido || 'Município/UF da unidade'}
          />
        </div>

        <Campo rotulo="Início da apuração" name="hora_inicio" type="time"
          defaultValue={valores.hora_inicio ?? ''} />
        <Campo rotulo="Encerramento da apuração" name="hora_fim" type="time"
          defaultValue={valores.hora_fim ?? ''} />

        <div className="sm:col-span-2">
          <Seletor rotulo="Quem lavrou a ata" name="ata_lavrada_por"
            defaultValue={valores.ata_lavrada_por ?? ''}>
            <option value="">Selecione…</option>
            {membros.map((m) => (
              <option key={m.id} value={m.nome}>{m.nome}</option>
            ))}
          </Seletor>
          {membros.length === 0 && (
            <p className="mt-1 text-label-sm text-outline">
              Cadastre ao menos um membro da comissão para escolher quem lavra a ata.
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <Botao type="submit" variante="primario" disabled={pendente}>
            {pendente ? 'Salvando…' : 'Salvar dados da apuração'}
          </Botao>
        </div>
      </form>

      {aviso && <Aviso tom={aviso.tom} texto={aviso.texto} />}
    </Secao>
  );
}
