import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { formatarCpf } from '@/lib/funcionarios';
import { formatarData } from '@/lib/aso';
import { MOTIVO_AFASTAMENTO_LABEL, acidentario, corMotivo, type MotivoAfastamento } from '@/lib/afastamentos';

type Afastamento = {
  id: string;
  funcionario_id: string;
  data_inicio: string;
  data_fim: string | null;
  motivo: MotivoAfastamento;
};

type Funcionario = { id: string; nome: string; cpf: string };

export default function Afastamentos() {
  const { empresaAtiva } = useAuth();
  const navigate = useNavigate();

  const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [afastamentosComCat, setAfastamentosComCat] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    setCarregando(true);
    const empresaId = empresaAtiva.empresa_id;

    async function carregar() {
      const [ra, rf] = await Promise.all([
        daEmpresa(
          supabase.from('funcionarios_afastamentos').select('id, funcionario_id, data_inicio, data_fim, motivo'),
          empresaId
        ).order('data_inicio', { ascending: false }),
        daEmpresa(supabase.from('funcionarios').select('id, nome, cpf'), empresaId),
      ]);
      if (!ativo) return;

      const erroCombinado = ra.error ?? rf.error;
      if (erroCombinado) {
        setErro(erroCombinado.message);
        setCarregando(false);
        return;
      }
      setAfastamentos((ra.data ?? []) as Afastamento[]);
      setFuncionarios((rf.data ?? []) as Funcionario[]);

      const ids = (ra.data ?? []).map((a) => a.id);
      if (ids.length > 0) {
        const { data: cats } = await supabase.from('cat_comunicacoes').select('afastamento_id').in('afastamento_id', ids);
        setAfastamentosComCat(new Set((cats ?? []).map((c) => c.afastamento_id)));
      }

      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [empresaAtiva]);

  const funcionariosPorId = useMemo(() => new Map(funcionarios.map((f) => [f.id, f])), [funcionarios]);

  const termo = busca.trim().toLowerCase();
  const filtrados = afastamentos.filter((a) => {
    if (!termo) return true;
    const funcionario = funcionariosPorId.get(a.funcionario_id);
    return (funcionario?.nome ?? '').toLowerCase().includes(termo);
  });

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Afastamentos</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Histórico de afastamentos e Comunicação de Acidente de Trabalho (CAT)
          </p>
        </div>
        <Link
          to="/afastamentos/novo"
          className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Novo afastamento
        </Link>
      </header>

      <div className="px-margin-mobile md:px-md pb-8 flex-1 flex flex-col gap-4">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">{erro}</div>
        )}

        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input
            type="search"
            placeholder="Buscar por funcionário"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full h-12 rounded-lg border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
          />
        </div>

        {carregando ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">event_busy</span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo ? 'Nenhum afastamento encontrado para este filtro.' : 'Nenhum afastamento registrado ainda.'}
            </p>
            {!termo && (
              <Link to="/afastamentos/novo" className="text-label-md text-primary-container hover:underline">
                Registrar o primeiro afastamento
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((a) => {
              const funcionario = funcionariosPorId.get(a.funcionario_id);
              const precisaCat = acidentario(a.motivo) && !afastamentosComCat.has(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => navigate(`/afastamentos/${a.id}`)}
                  className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
                >
                  <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                    <span className="material-symbols-outlined">event_busy</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body-lg text-primary font-semibold truncate">{funcionario?.nome ?? '—'}</h3>
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {funcionario ? formatarCpf(funcionario.cpf) : '—'}
                    </p>
                    <p className="text-label-sm text-outline truncate mt-1">
                      Desde {formatarData(a.data_inicio)}
                      {a.data_fim ? ` até ${formatarData(a.data_fim)}` : ' (em aberto)'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-label-sm ${corMotivo(a.motivo)}`}>
                      {MOTIVO_AFASTAMENTO_LABEL[a.motivo]}
                    </span>
                    {precisaCat && (
                      <span className="px-2.5 py-1 rounded-full text-label-sm bg-[#F97316]/15 text-[#9a3412]">
                        Sem CAT
                      </span>
                    )}
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
