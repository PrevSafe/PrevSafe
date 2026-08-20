import { useEffect, useState, useTransition } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseServidor } from '@/lib/cipa/supabase';
import { listarVotosCorrigiveis, reverterVoto } from '@/lib/cipa/acoes';
import { formatarCpf } from '@/lib/cipa/cpf';
import { CabecalhoEleicao } from '@/components/cipa/CabecalhoEleicao';
import { Aviso } from '@/components/cipa/Aviso';
import { Botao } from '@/components/ui/Form';
import type { StatusEleicao, TentativaNegada, VotoCorrigivel } from '@/lib/cipa/types';

const ORIGEM_LABEL: Record<VotoCorrigivel['origem'], string> = {
  LINK_MAGICO: 'Link mágico',
  QR_CODE: 'QR Code',
};

const TIPO_LABEL: Record<VotoCorrigivel['tipo_voto'], string> = {
  NOMINAL: 'Nominal',
  BRANCO: 'Branco',
  NULO: 'Nulo',
};

const MOTIVO_LABEL: Record<TentativaNegada['motivo'], string> = {
  CPF_FORA_DA_LISTA: 'CPF fora da lista de aptos',
  CPF_JA_VOTOU: 'CPF já havia votado',
};

function Spinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
        progress_activity
      </span>
    </div>
  );
}

export default function AuditoriaVotos() {
  const { id } = useParams<{ id: string }>();
  const { empresaAtiva } = useAuth();
  const [status, setStatus] = useState<StatusEleicao | null>(null);
  const [votos, setVotos] = useState<VotoCorrigivel[]>([]);
  const [tentativas, setTentativas] = useState<TentativaNegada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);

  const admin = empresaAtiva?.papel === 'admin';

  useEffect(() => {
    if (!id || !admin) return;
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, admin]);

  async function carregar() {
    if (!id) return;
    setCarregando(true);
    setErro(null);
    try {
      const supabase = await supabaseServidor();
      const [{ data: e }, { data: t }] = await Promise.all([
        supabase.from('eleicoes').select('status').eq('id', id).single(),
        supabase.from('cipa_tentativas_negadas')
          .select('id, cpf, nome_declarado, motivo, ip_dispositivo, criado_em')
          .eq('eleicao_id', id)
          .order('criado_em', { ascending: false }),
      ]);
      const statusEleicao = (e as { status: StatusEleicao } | null)?.status ?? null;
      setStatus(statusEleicao);
      setTentativas((t ?? []) as TentativaNegada[]);

      if (statusEleicao && !['ENCERRADA', 'APURADA'].includes(statusEleicao)) {
        setVotos(await listarVotosCorrigiveis(id));
      } else {
        setVotos([]);
      }
    } catch {
      setErro('Não foi possível carregar a auditoria. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  function reverter(voto: VotoCorrigivel) {
    const motivo = window.prompt(
      `Motivo da reversão do voto de ${voto.eleitor_nome} (fica na auditoria):`,
    );
    if (!motivo) return;
    iniciar(async () => {
      const r = await reverterVoto(voto.id, motivo);
      setAviso({ tom: r.ok ? 'ok' : 'erro', texto: r.mensagem });
      if (r.ok) setVotos((atual) => atual.filter((v) => v.id !== voto.id));
    });
  }

  if (!empresaAtiva) return <Spinner />;
  if (!admin) return <Navigate to={`/cipa/${id}`} replace />;
  if (carregando) return <Spinner />;

  const eleicaoEncerrada = status ? ['ENCERRADA', 'APURADA'].includes(status) : false;

  return (
    <div className="px-margin-mobile md:px-md py-6">
      <CabecalhoEleicao eleicaoId={id!} titulo="Auditoria" />
      <p className="mt-6 text-label-sm uppercase tracking-wider text-outline">Admin</p>
      <h1 className="mt-2 text-headline-lg font-extrabold text-on-surface">Auditoria de votos</h1>
      <p className="mt-2 max-w-2xl text-on-surface-variant">
        Correção de votos computados e trilha de tentativas bloqueadas na validação.
      </p>

      {erro && <Aviso tom="erro" texto={erro} />}
      {aviso && <Aviso tom={aviso.tom} texto={aviso.texto} />}

      {!eleicaoEncerrada && (
        <section className="mt-8">
          <h2 className="text-title-lg font-bold text-on-surface">Votos corrigíveis</h2>
          <p className="mt-3 max-w-2xl rounded-xl border border-warning/40 bg-warning-container px-4 py-3 text-label-md text-warning">
            Reverter um voto aqui desfaz o registro por completo — presença e contagem. Isso só é
            possível até o encerramento da eleição; depois disso é irreversível por design, para
            proteger o sigilo do voto.
          </p>

          {votos.length === 0 ? (
            <div className="mt-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 shadow-sm">
              <p className="text-on-surface-variant">Nenhum voto computado até agora.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm">
              <table className="w-full text-left text-body-md">
                <thead>
                  <tr className="border-b border-outline-variant/40 text-label-sm uppercase tracking-wider text-outline">
                    <th className="px-4 py-3">Eleitor</th>
                    <th className="px-4 py-3">CPF</th>
                    <th className="px-4 py-3">Origem</th>
                    <th className="px-4 py-3">Voto</th>
                    <th className="px-4 py-3">Data/hora</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {votos.map((v) => (
                    <tr key={v.id} className="border-b border-outline-variant/20 last:border-0">
                      <td className="px-4 py-3 font-medium text-on-surface">{v.eleitor_nome}</td>
                      <td className="px-4 py-3 font-mono text-on-surface-variant">{formatarCpf(v.eleitor_cpf)}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{ORIGEM_LABEL[v.origem]}</td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {v.tipo_voto === 'NOMINAL' ? (v.candidato_nome ?? '—') : TIPO_LABEL[v.tipo_voto]}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {new Date(v.criado_em).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <Botao
                          type="button"
                          variante="perigo"
                          className="h-9 text-label-sm"
                          disabled={pendente}
                          onClick={() => reverter(v)}
                        >
                          Reverter
                        </Botao>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-title-lg font-bold text-on-surface">Tentativas negadas</h2>
        <p className="mt-2 max-w-2xl text-on-surface-variant">
          Votos bloqueados na validação do QR Code. Não afetam quórum nem contagem.
        </p>

        {tentativas.length === 0 ? (
          <div className="mt-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 shadow-sm">
            <p className="text-on-surface-variant">Nenhuma tentativa bloqueada até agora.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm">
            <table className="w-full text-left text-body-md">
              <thead>
                <tr className="border-b border-outline-variant/40 text-label-sm uppercase tracking-wider text-outline">
                  <th className="px-4 py-3">CPF</th>
                  <th className="px-4 py-3">Nome declarado</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Data/hora</th>
                </tr>
              </thead>
              <tbody>
                {tentativas.map((t) => (
                  <tr key={t.id} className="border-b border-outline-variant/20 last:border-0">
                    <td className="px-4 py-3 font-mono text-on-surface-variant">{formatarCpf(t.cpf)}</td>
                    <td className="px-4 py-3 font-medium text-on-surface">{t.nome_declarado ?? '—'}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{MOTIVO_LABEL[t.motivo]}</td>
                    <td className="px-4 py-3 font-mono text-on-surface-variant">{t.ip_dispositivo ?? '—'}</td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {new Date(t.criado_em).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
