import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabaseServidor } from '@/lib/cipa/supabase';
import { CabecalhoEleicao } from '@/components/cipa/CabecalhoEleicao';
import { ComissaoMembros } from '@/components/cipa/ComissaoMembros';
import { ComissaoIndicados } from '@/components/cipa/ComissaoIndicados';
import { ComissaoApuracao } from '@/components/cipa/ComissaoApuracao';
import type { Indicado, MembroComissao } from '@/lib/cipa/types';

type Eleicao = {
  data_fim: string;
  encerrada_em: string | null;
  apuracao_iniciada_em: string | null;
  apuracao_encerrada_em: string | null;
  ata_lavrada_por: string | null;
  local_apuracao: string | null;
  unidades: { municipio: string | null; uf: string | null } | null;
};

/** Extrai "HH:MM" no fuso local a partir de um timestamptz vindo do banco. */
function paraHora(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toTimeString().slice(0, 5);
}

export default function Comissao() {
  const { id } = useParams<{ id: string }>();
  const [eleicao, setEleicao] = useState<Eleicao | null>(null);
  const [membros, setMembros] = useState<MembroComissao[]>([]);
  const [indicados, setIndicados] = useState<Indicado[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    (async () => {
      const supabase = await supabaseServidor();
      const [{ data: e }, { data: m }, { data: ind }] = await Promise.all([
        supabase.from('eleicoes')
          .select('data_fim, encerrada_em, apuracao_iniciada_em, apuracao_encerrada_em, ata_lavrada_por, local_apuracao, unidades(municipio, uf)')
          .eq('id', id).single(),
        supabase.from('cipa_comissao')
          .select('id, nome, cpf, cargo, papel').eq('eleicao_id', id).order('criado_em'),
        supabase.from('cipa_indicados')
          .select('id, nome, cargo, setor, condicao, ordem').eq('eleicao_id', id)
          .order('condicao').order('ordem'),
      ]);
      if (!ativo) return;
      setEleicao(e as unknown as Eleicao | null);
      setMembros((m ?? []) as MembroComissao[]);
      setIndicados((ind ?? []) as Indicado[]);
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
    return (
      <p className="px-margin-mobile md:px-md py-6 text-on-surface-variant">
        Eleição não encontrada ou fora do seu acesso.
      </p>
    );
  }

  const unidade = eleicao.unidades;
  const localSugerido = unidade?.municipio ? `${unidade.municipio}${unidade.uf ? `/${unidade.uf}` : ''}` : '';
  const dataReferencia = (eleicao.apuracao_encerrada_em ?? eleicao.encerrada_em ?? eleicao.data_fim).slice(0, 10);

  return (
    <div className="px-margin-mobile md:px-md py-6">
      <CabecalhoEleicao eleicaoId={id!} titulo="Comissão eleitoral" />
      <p className="mt-6 text-label-sm uppercase tracking-wider text-outline">Comissão</p>
      <h1 className="mt-2 text-headline-lg font-extrabold text-on-surface">Comissão eleitoral</h1>
      <p className="mt-2 max-w-2xl text-on-surface-variant">
        Estes dados alimentam a ata narrativa — quem compôs a comissão, quem o empregador indicou
        e onde e quando a apuração aconteceu.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        <ComissaoMembros eleicaoId={id!} membros={membros} aoAlterar={setMembros} />
        <ComissaoIndicados eleicaoId={id!} indicados={indicados} aoAlterar={setIndicados} />
        <ComissaoApuracao
          eleicaoId={id!}
          membros={membros}
          dataReferencia={dataReferencia}
          localSugerido={localSugerido}
          valores={{
            local_apuracao: eleicao.local_apuracao,
            hora_inicio: paraHora(eleicao.apuracao_iniciada_em),
            hora_fim: paraHora(eleicao.apuracao_encerrada_em),
            ata_lavrada_por: eleicao.ata_lavrada_por,
          }}
        />
      </div>
    </div>
  );
}
