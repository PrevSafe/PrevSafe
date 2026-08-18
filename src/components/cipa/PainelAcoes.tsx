import { useState, useTransition } from 'react';
import { abrirEleicao, montarEleitores } from '@/lib/cipa/acoes';
import { Botao } from '@/components/ui/Form';
import { Aviso } from './Aviso';

export function PainelAcoes({
  eleicaoId, status, aptos,
}: {
  eleicaoId: string;
  status: string;
  aptos: number;
}) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);

  if (status !== 'RASCUNHO' && status !== 'AGENDADA') return null;

  function executar(acao: () => Promise<{ ok: boolean; mensagem: string }>) {
    iniciar(async () => {
      const r = await acao();
      setAviso({ tom: r.ok ? 'ok' : 'erro', texto: r.mensagem });
    });
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <Botao
          type="button"
          variante="secundario"
          disabled={pendente}
          onClick={() => executar(() => montarEleitores(eleicaoId, true))}
        >
          {pendente ? 'Processando…' : 'Montar lista de eleitores'}
        </Botao>
        <Botao
          type="button"
          variante="primario"
          disabled={pendente}
          onClick={() => executar(() => abrirEleicao(eleicaoId))}
        >
          Abrir votação
        </Botao>
      </div>

      <p className="mt-3 max-w-2xl text-label-md text-on-surface-variant">
        Montar a lista congela quem está ativo na unidade neste momento — admissões e
        desligamentos posteriores não entram, para que o quórum e a ata reflitam a folha do dia
        da abertura. Abrir exige ao menos um candidato deferido; montar a lista é opcional.
      </p>

      {aptos === 0 && (
        <p className="mt-3 rounded-xl bg-warning-container px-4 py-3 text-label-md font-medium text-warning">
          Sem lista de eleitores, a votação funciona apenas pelo QR Code do mural e todos os votos
          passam por conferência na quarentena. O quórum da NR-05 não poderá ser calculado
          enquanto a relação de empregados não for importada.
        </p>
      )}

      {aviso && <Aviso tom={aviso.tom} texto={aviso.texto} />}
    </div>
  );
}
