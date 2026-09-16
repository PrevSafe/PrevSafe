import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabaseServidor } from '@/lib/cipa/supabase';
import { PainelAcoes } from '@/components/cipa/PainelAcoes';
import { CabecalhoEleicao } from '@/components/cipa/CabecalhoEleicao';
import type { Painel } from '@/lib/cipa/types';

type Eleicao = {
  id: string;
  titulo: string;
  norma: string;
  gestao: string | null;
  status: string;
  data_inicio: string;
  data_fim: string;
  vagas_efetivos: number;
  vagas_suplentes: number;
  unidades: { razao_social: string; nome_fantasia: string | null; municipio: string | null; uf: string | null } | null;
};

function Indicador({ rotulo, valor, detalhe, destaque }: {
  rotulo: string; valor: string; detalhe?: string; destaque?: 'ok' | 'atencao';
}) {
  const cor = destaque === 'ok' ? 'text-secondary' : destaque === 'atencao' ? 'text-warning' : 'text-on-surface';
  return (
    <div className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm">
      <p className="text-label-sm uppercase tracking-wider text-outline">{rotulo}</p>
      <p className={`mt-2 font-mono text-4xl font-bold leading-none ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-2 text-label-sm text-on-surface-variant">{detalhe}</p>}
    </div>
  );
}

export default function PainelEleicao() {
  const { id } = useParams<{ id: string }>();
  const [eleicao, setEleicao] = useState<Eleicao | null>(null);
  const [painel, setPainel] = useState<Painel | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    (async () => {
      const supabase = await supabaseServidor();
      const [{ data: e }, { data: painelBruto }] = await Promise.all([
        supabase.from('eleicoes')
          .select('id, titulo, norma, gestao, status, data_inicio, data_fim, vagas_efetivos, vagas_suplentes, unidades(razao_social, nome_fantasia, numero_inscricao, municipio, uf)')
          .eq('id', id).single(),
        supabase.rpc('cipa_painel', { p_eleicao_id: id }),
      ]);
      if (!ativo) return;
      setEleicao(e as unknown as Eleicao | null);
      setPainel(painelBruto as Painel | null);
      setCarregando(false);
    })();
    return () => { ativo = false; };
  }, [id]);

  if (carregando) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
          progress_activity
        </span>
      </div>
    );
  }

  if (!eleicao) {
    return <p className="px-margin-mobile md:px-md py-6 text-on-surface-variant">Eleição não encontrada ou fora do seu acesso.</p>;
  }

  const u = eleicao.unidades;

  return (
    <div className="px-margin-mobile md:px-md py-6">
      <Link to="/cipa" className="text-label-sm uppercase tracking-wider text-outline hover:text-primary">
        ← Eleições
      </Link>
      <p className="mt-4 text-label-sm uppercase tracking-wider text-outline">
        {u?.nome_fantasia || u?.razao_social}
        {u?.municipio ? ` · ${u.municipio}/${u.uf ?? ''}` : ''} · {eleicao.norma}
      </p>
      <h1 className="mt-2 text-headline-lg font-extrabold text-on-surface">{eleicao.titulo}</h1>
      <p className="mt-2 text-on-surface-variant">
        {new Date(eleicao.data_inicio).toLocaleString('pt-BR')} até{' '}
        {new Date(eleicao.data_fim).toLocaleString('pt-BR')} · {eleicao.vagas_efetivos} efetivo(s)
        e {eleicao.vagas_suplentes} suplente(s)
      </p>

      <div className="mt-6">
        <CabecalhoEleicao eleicaoId={id!} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Quórum" valor={`${painel?.quorum_percent ?? 0}%`}
          detalhe={`${painel?.votantes ?? 0} de ${painel?.aptos ?? 0} aptos`}
          destaque={painel?.quorum_atingido ? 'ok' : 'atencao'} />
        <Indicador rotulo="Por link" valor={String(painel?.por_origem?.LINK_MAGICO ?? 0)}
          detalhe="Link mágico" />
        <Indicador rotulo="Pelo mural" valor={String(painel?.por_origem?.QR_CODE ?? 0)}
          detalhe="QR Code aprovado" />
        <Indicador rotulo="Aguardando conferência"
          valor={String(painel?.quarentena_pendente ?? 0)}
          detalhe="Precisa zerar para encerrar"
          destaque={painel?.quarentena_pendente ? 'atencao' : 'ok'} />
      </div>

      <div className="mt-6 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm">
        <p className="text-label-sm uppercase tracking-wider text-outline">Situação</p>
        <p className="mt-2 text-headline-md font-bold text-on-surface">{eleicao.status}</p>
        <p className="mt-2 max-w-2xl text-on-surface-variant">
          {painel?.resultado_disponivel
            ? 'A apuração está liberada. Gere as atas na aba Apuração.'
            : 'A contagem de votos fica oculta enquanto a urna estiver aberta — inclusive para a comissão.'}
        </p>
        {painel && !painel.modulo_ativo && (
          <p className="mt-4 rounded-xl bg-warning-container px-4 py-3 text-label-md font-medium text-warning">
            A licença do módulo CIPA está inativa para esta empresa. Esta eleição segue normalmente
            até o fim, mas não será possível criar ou abrir novas.
          </p>
        )}
        <PainelAcoes eleicaoId={id!} status={eleicao.status} aptos={painel?.aptos ?? 0} />
      </div>
    </div>
  );
}
