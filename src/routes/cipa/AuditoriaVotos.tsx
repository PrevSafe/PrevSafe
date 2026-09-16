import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseServidor } from '@/lib/cipa/supabase';
import { formatarCpf } from '@/lib/cipa/cpf';
import { CabecalhoEleicao } from '@/components/cipa/CabecalhoEleicao';
import { Aviso } from '@/components/cipa/Aviso';
import type { TentativaNegada } from '@/lib/cipa/types';

const MOTIVO_LABEL: Record<TentativaNegada['motivo'], string> = {
  CPF_FORA_DA_LISTA: 'CPF fora da lista de aptos',
  CPF_JA_VOTOU: 'CPF já havia votado',
  MUITAS_TENTATIVAS: 'Muitas tentativas seguidas deste dispositivo',
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
  const { empresaAtiva, can } = useAuth();
  const [tentativas, setTentativas] = useState<TentativaNegada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const podeVisualizar = can('cipa.auditoria', 'visualizar');

  useEffect(() => {
    async function carregar() {
      if (!id) return;
      setCarregando(true);
      setErro(null);
      try {
        const supabase = await supabaseServidor();
        const { data: t } = await supabase.from('cipa_tentativas_negadas')
          .select('id, cpf, nome_declarado, motivo, ip_dispositivo, criado_em')
          .eq('eleicao_id', id)
          .order('criado_em', { ascending: false });
        setTentativas((t ?? []) as TentativaNegada[]);
      } catch {
        setErro('Não foi possível carregar a auditoria. Tente novamente.');
      } finally {
        setCarregando(false);
      }
    }

    if (!id || !podeVisualizar) return;
    carregar();
  }, [id, podeVisualizar]);

  if (!empresaAtiva) return <Spinner />;
  if (!podeVisualizar) return <Navigate to={`/cipa/${id}`} replace />;
  if (carregando) return <Spinner />;

  return (
    <div className="px-margin-mobile md:px-md py-6">
      <CabecalhoEleicao eleicaoId={id!} titulo="Auditoria" />
      <p className="mt-6 text-label-sm uppercase tracking-wider text-outline">Admin</p>
      <h1 className="mt-2 text-headline-lg font-extrabold text-on-surface">Auditoria de votos</h1>
      <p className="mt-2 max-w-2xl text-on-surface-variant">
        Trilha de tentativas bloqueadas na validação.
      </p>

      {erro && <Aviso tom="erro" texto={erro} />}

      <section className="mt-8">
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
