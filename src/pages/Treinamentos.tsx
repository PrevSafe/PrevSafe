import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import {
  TIPO_LABEL,
  corTipo,
  formatarCargaHoraria,
  formatarData,
  type TipoTreinamento,
} from '@/lib/treinamentos';

type Treinamento = {
  id: string;
  unidade_id: string;
  tipo: TipoTreinamento;
  tema: string;
  data_evento: string;
  carga_horaria_minutos: number | null;
  instrutor: string | null;
};

type Unidade = { id: string; razao_social: string; nome_fantasia: string | null };
type Participante = { evento_id: string; presente: boolean };

export default function Treinamentos() {
  const { empresaAtiva } = useAuth();
  const navigate = useNavigate();

  const [eventos, setEventos] = useState<Treinamento[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoTreinamento>('todos');

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    setCarregando(true);
    const empresaId = empresaAtiva.empresa_id;
    Promise.all([
      daEmpresa(
        supabase
          .from('treinamentos_eventos')
          .select('id, unidade_id, tipo, tema, data_evento, carga_horaria_minutos, instrutor'),
        empresaId
      ).order('data_evento', { ascending: false }),
      daEmpresa(supabase.from('unidades').select('id, razao_social, nome_fantasia'), empresaId),
      supabase.from('treinamentos_eventos_participantes').select('evento_id, presente'),
    ]).then(([re, ru, rp]) => {
      if (!ativo) return;
      const erroCombinado = re.error ?? ru.error ?? rp.error;
      if (erroCombinado) {
        setErro(erroCombinado.message);
      } else {
        setEventos(re.data as Treinamento[]);
        setUnidades(ru.data as Unidade[]);
        setParticipantes((rp.data ?? []) as Participante[]);
      }
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [empresaAtiva]);

  const unidadesPorId = useMemo(() => new Map(unidades.map((u) => [u.id, u])), [unidades]);

  const presentesPorTreinamento = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const p of participantes) {
      if (!p.presente) continue;
      mapa.set(p.evento_id, (mapa.get(p.evento_id) ?? 0) + 1);
    }
    return mapa;
  }, [participantes]);

  const termo = busca.trim().toLowerCase();

  const filtrados = eventos.filter((ev) => {
    if (tipoFiltro !== 'todos' && ev.tipo !== tipoFiltro) return false;
    if (!termo) return true;
    const temaMatch = ev.tema.toLowerCase().includes(termo);
    const instrutorMatch = (ev.instrutor ?? '').toLowerCase().includes(termo);
    return temaMatch || instrutorMatch;
  });

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">DDS e Treinamentos</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Diálogos de segurança e treinamentos de capacitação (NR-1)
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link
            to="/treinamentos/novo"
            className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo evento
          </Link>
        </div>
      </header>

      <div className="px-margin-mobile md:px-md pb-8 flex-1 flex flex-col gap-4">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erro}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              type="search"
              placeholder="Buscar por tema ou instrutor"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
            />
          </div>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as 'todos' | TipoTreinamento)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-56"
          >
            <option value="todos">Todos os tipos</option>
            <option value="dds">DDS</option>
            <option value="treinamento">Treinamento</option>
          </select>
        </div>

        {carregando ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">
              school
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo || tipoFiltro !== 'todos'
                ? 'Nenhum evento encontrado para este filtro.'
                : 'Nenhum DDS ou treinamento registrado ainda.'}
            </p>
            {!termo && tipoFiltro === 'todos' && (
              <Link to="/treinamentos/novo" className="text-label-md text-primary-container hover:underline">
                Registrar o primeiro evento
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((ev) => {
              const unidade = unidadesPorId.get(ev.unidade_id);
              const presentes = presentesPorTreinamento.get(ev.id) ?? 0;
              return (
                <button
                  key={ev.id}
                  onClick={() => navigate(`/treinamentos/${ev.id}`)}
                  className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
                >
                  <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                    <span className="material-symbols-outlined">school</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-lg text-primary font-semibold truncate">{ev.tema}</h3>
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {unidade ? unidade.nome_fantasia || unidade.razao_social : '—'}
                    </p>
                    <p className="text-label-sm text-on-surface-variant truncate mt-1">
                      {ev.instrutor ? `Instrutor: ${ev.instrutor}` : 'Instrutor não informado'} ·{' '}
                      {formatarCargaHoraria(ev.carga_horaria_minutos)}
                    </p>
                    <p className="text-label-sm text-outline truncate mt-1">
                      {formatarData(ev.data_evento)} · {presentes} participante{presentes === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-label-sm ${corTipo(ev.tipo)}`}>
                      {TIPO_LABEL[ev.tipo]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
