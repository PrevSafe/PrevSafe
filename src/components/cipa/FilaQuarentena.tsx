import { useState, useTransition } from 'react';
import { aprovarEnvelope, aprovarLote, rejeitarEnvelope } from '@/lib/cipa/acoes';
import { Botao } from '@/components/ui/Form';
import { Aviso } from './Aviso';
import type { EnvelopeQuarentena } from '@/lib/cipa/types';

const ALERTAS: Record<EnvelopeQuarentena['alerta'], { texto: string; classe: string }> = {
  OK: { texto: 'Confere com o cadastro', classe: 'bg-secondary-container text-on-secondary-container' },
  CPF_NAO_ENCONTRADO_RH: { texto: 'CPF fora da lista de aptos', classe: 'bg-warning-container text-warning' },
  DIVERGENCIA_NOME: { texto: 'Nome diverge do cadastro', classe: 'bg-warning-container text-warning' },
  TENTATIVA_DUPLICADA: { texto: 'CPF já assinou a lista', classe: 'bg-error-container text-on-error-container' },
  MULTIPLOS_VOTOS_MESMO_IP: { texto: 'Muitos votos do mesmo aparelho', classe: 'bg-warning-container text-warning' },
};

export function FilaQuarentena({ envelopes }: { envelopes: EnvelopeQuarentena[] }) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);

  const conferem = envelopes.filter((e) => e.alerta === 'OK').map((e) => e.id);

  function executar(acao: () => Promise<{ ok: boolean; mensagem: string }>) {
    iniciar(async () => {
      const r = await acao();
      setAviso({ tom: r.ok ? 'ok' : 'erro', texto: r.mensagem });
    });
  }

  if (!envelopes.length) {
    return (
      <div className="mt-8 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 shadow-sm">
        <p className="text-title-lg font-bold text-on-surface">Nada para conferir</p>
        <p className="mt-2 text-on-surface-variant">
          Votos enviados pelo QR Code do mural aparecem aqui até você aprovar ou rejeitar.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {conferem.length > 1 && (
        <Botao type="button" variante="primario" disabled={pendente}
               onClick={() => executar(() => aprovarLote(conferem))}>
          Aprovar os {conferem.length} que conferem
        </Botao>
      )}

      {aviso && <Aviso tom={aviso.tom} texto={aviso.texto} />}

      <ul className="mt-6 grid gap-3">
        {envelopes.map((e) => {
          const alerta = ALERTAS[e.alerta];
          return (
            <li key={e.id} className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-title-lg font-bold text-on-surface">{e.nome_declarado}</p>
                  <p className="mt-1 font-mono text-label-md text-on-surface-variant">{e.cpf_mascara}</p>
                  <p className="mt-1 text-label-md text-on-surface-variant">
                    {e.cargo_declarado ?? 'Função não informada'} ·{' '}
                    {new Date(e.data_hora).toLocaleString('pt-BR')}
                  </p>
                  {e.nome_rh && (
                    <p className="mt-2 text-label-md">
                      <span className="text-outline">No cadastro:</span>{' '}
                      <span className="font-medium text-on-surface">{e.nome_rh}</span>
                      {e.cargo_rh ? ` · ${e.cargo_rh}` : ''}
                    </p>
                  )}
                </div>
                <span className={`rounded-full px-3 py-1 text-label-sm font-semibold ${alerta.classe}`}>
                  {alerta.texto}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Botao type="button" variante="primario" className="h-10 text-label-sm" disabled={pendente}
                       onClick={() => executar(() => aprovarEnvelope(e.id))}>
                  Aprovar e computar
                </Botao>
                <Botao type="button" variante="perigo" className="h-10 text-label-sm" disabled={pendente}
                       onClick={() => {
                         const motivo = window.prompt('Motivo da rejeição (fica na auditoria):');
                         if (motivo) executar(() => rejeitarEnvelope(e.id, motivo));
                       }}>
                  Rejeitar
                </Botao>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 max-w-2xl text-label-sm text-outline">
        Você confere identidade, nunca escolha. Em quem cada pessoa votou não é legível neste
        painel — o banco não concede permissão de leitura nessa coluna.
      </p>
    </div>
  );
}
