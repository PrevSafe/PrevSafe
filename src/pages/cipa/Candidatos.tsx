import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabaseServidor } from '@/lib/cipa/supabase';
import { FormCandidato, type EleitorOpcao } from '@/components/cipa/FormCandidato';

type Candidato = {
  id: string;
  numero_urna: number | null;
  nome_urna: string;
  nome_completo: string;
  cargo: string | null;
  setor: string | null;
  inscricao_status: string;
  data_admissao: string | null;
};

export default function Candidatos() {
  const { id } = useParams<{ id: string }>();
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [urnaAberta, setUrnaAberta] = useState(false);
  const [elegiveis, setElegiveis] = useState<EleitorOpcao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    (async () => {
      const supabase = await supabaseServidor();
      const [{ data: c }, { data: eleicao }, { data: elg }] = await Promise.all([
        supabase.from('candidatos')
          .select('id, numero_urna, nome_urna, nome_completo, cargo, setor, inscricao_status, data_admissao')
          .eq('eleicao_id', id).order('numero_urna', { nullsFirst: false }),
        supabase.from('eleicoes').select('status').eq('id', id).single(),
        supabase.from('eleicao_eleitores')
          .select('funcionario_id, nome, cargo, setor').eq('eleicao_id', id).order('nome'),
      ]);
      if (!ativo) return;
      setCandidatos((c ?? []) as Candidato[]);
      setUrnaAberta(eleicao?.status === 'ABERTA');
      setElegiveis((elg ?? []) as EleitorOpcao[]);
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

  return (
    <div className="px-margin-mobile md:px-md py-6">
      <p className="text-label-sm uppercase tracking-wider text-outline">Inscrições</p>
      <h1 className="mt-2 text-headline-lg font-extrabold text-on-surface">Candidatos</h1>
      <p className="mt-2 max-w-2xl text-on-surface-variant">
        Só candidatos com inscrição deferida aparecem na cédula. A contagem de votos não é
        exibida aqui — nem depois do encerramento, para não misturar cadastro com apuração.
      </p>

      {urnaAberta && (
        <p className="mt-4 rounded-xl bg-warning-container px-4 py-3 text-label-md font-medium text-warning">
          A urna está aberta. Alterar a cédula agora muda o que os eleitores enxergam.
        </p>
      )}

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {candidatos.map((c) => (
          <li key={c.id} className="flex items-center gap-5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm">
            <span className="font-mono text-3xl font-bold leading-none text-on-surface">
              {c.numero_urna !== null ? String(c.numero_urna).padStart(2, '0') : '—'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-title-lg font-bold text-on-surface">{c.nome_urna}</p>
              <p className="truncate text-label-md text-on-surface-variant">{c.nome_completo}</p>
              <p className="mt-1 text-label-sm text-outline">
                {c.cargo ?? '—'}{c.setor ? ` · ${c.setor}` : ''}
                {c.data_admissao ? ` · desde ${new Date(c.data_admissao).toLocaleDateString('pt-BR')}` : ''}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-label-sm font-semibold ${
              c.inscricao_status === 'DEFERIDA'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-warning-container text-warning'}`}>
              {c.inscricao_status}
            </span>
          </li>
        ))}
      </ul>

      <FormCandidato eleicaoId={id!} elegiveis={elegiveis} />
    </div>
  );
}
