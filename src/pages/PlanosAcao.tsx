import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import {
  STATUS_PLANO_ACAO_EFETIVO_LABEL,
  corStatusPlanoAcao,
  formatarData,
  formatarMoeda,
  statusEfetivoPlanoAcao,
  type StatusPlanoAcaoEfetivo,
} from '@/lib/inspecoes';

type Plano = {
  id: string;
  unidade_id: string;
  o_que: string;
  onde: string | null;
  quando: string;
  quem: string;
  quanto_custa: number | null;
  status: string;
};

type Unidade = { id: string; razao_social: string; nome_fantasia: string | null };

export default function PlanosAcao() {
  const { empresaAtiva } = useAuth();
  const navigate = useNavigate();

  const [planos, setPlanos] = useState<Plano[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusPlanoAcaoEfetivo>('todos');

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
          .from('planos_acao_5w2h')
          .select('id, unidade_id, o_que, onde, quando, quem, quanto_custa, status'),
        empresaId
      ).order('quando', { ascending: true }),
      daEmpresa(supabase.from('unidades').select('id, razao_social, nome_fantasia'), empresaId),
    ]).then(([rp, ru]) => {
      if (!ativo) return;
      const erroBase = rp.error ?? ru.error;
      if (erroBase) {
        setErro(erroBase.message);
      } else {
        setPlanos((rp.data ?? []) as Plano[]);
        setUnidades((ru.data ?? []) as Unidade[]);
      }
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [empresaAtiva]);

  const unidadesPorId = useMemo(() => new Map(unidades.map((u) => [u.id, u])), [unidades]);

  const termo = busca.trim().toLowerCase();

  const filtrados = planos.filter((p) => {
    const efetivo = statusEfetivoPlanoAcao(p.status, p.quando);
    if (statusFiltro !== 'todos' && efetivo !== statusFiltro) return false;
    if (!termo) return true;
    const unidade = unidadesPorId.get(p.unidade_id);
    const nomeUnidade = unidade ? unidade.nome_fantasia || unidade.razao_social : '';
    return (
      p.o_que.toLowerCase().includes(termo) ||
      p.quem.toLowerCase().includes(termo) ||
      nomeUnidade.toLowerCase().includes(termo)
    );
  });

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Planos de Ação (5W2H)</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Ações corretivas e preventivas, vinculadas ou não a uma inspeção
          </p>
        </div>
        <Link
          to="/planos-acao/novo"
          className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Novo plano de ação
        </Link>
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
              placeholder="Buscar por ação, responsável ou unidade"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
            />
          </div>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as 'todos' | StatusPlanoAcaoEfetivo)}
            className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-body-md text-on-surface focus:outline-none focus:border-2 focus:border-primary-container sm:w-56"
          >
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
            <option value="atrasado">Atrasado</option>
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
              checklist
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo || statusFiltro !== 'todos'
                ? 'Nenhum plano de ação encontrado para este filtro.'
                : 'Nenhum plano de ação registrado ainda.'}
            </p>
            {!termo && statusFiltro === 'todos' && (
              <Link to="/planos-acao/novo" className="text-label-md text-primary-container hover:underline">
                Criar o primeiro plano de ação
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((p) => {
              const unidade = unidadesPorId.get(p.unidade_id);
              const efetivo = statusEfetivoPlanoAcao(p.status, p.quando);
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/planos-acao/${p.id}`)}
                  className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
                >
                  <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                    <span className="material-symbols-outlined">checklist</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-lg text-primary font-semibold truncate">{p.o_que}</h3>
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {unidade ? unidade.nome_fantasia || unidade.razao_social : '—'}
                      {p.onde ? ` · ${p.onde}` : ''}
                    </p>
                    <p className="text-label-sm text-outline truncate mt-1">
                      Responsável: {p.quem}
                      {p.quanto_custa != null ? ` · ${formatarMoeda(p.quanto_custa)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-label-sm ${corStatusPlanoAcao(efetivo)}`}>
                      {STATUS_PLANO_ACAO_EFETIVO_LABEL[efetivo]}
                    </span>
                    <span className="text-label-sm text-outline">Prazo: {formatarData(p.quando)}</span>
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
