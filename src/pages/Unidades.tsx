import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';

type Unidade = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  numero_inscricao: string;
  tipo_inscricao: number;
  municipio: string | null;
  uf: string | null;
  grau_risco: number | null;
  ativo: boolean;
};

const TIPO: Record<number, string> = { 1: 'CNPJ', 3: 'CAEPF', 4: 'CNO' };

function formatarDoc(n: string, tipo: number) {
  if (tipo === 1 && n.length === 14)
    return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return n;
}

function corGrau(g: number | null) {
  if (g === 4) return 'bg-error-container text-on-error-container';
  if (g === 3) return 'bg-[#F97316]/15 text-[#9a3412]';
  return 'bg-secondary-container/40 text-on-secondary-container';
}

export default function Unidades() {
  const { empresaAtiva } = useAuth();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    daEmpresa(
      supabase
        .from('unidades')
        .select('id, razao_social, nome_fantasia, numero_inscricao, tipo_inscricao, municipio, uf, grau_risco, ativo'),
      empresaAtiva.empresa_id
    )
      .order('razao_social')
      .then(({ data, error }) => {
        if (error) setErro(error.message);
        else setUnidades(data as Unidade[]);
        setCarregando(false);
      });
  }, [empresaAtiva]);

  const termo = busca.trim().toLowerCase();
  const filtradas = termo
    ? unidades.filter(
        (u) =>
          u.razao_social.toLowerCase().includes(termo) ||
          (u.nome_fantasia ?? '').toLowerCase().includes(termo) ||
          u.numero_inscricao.includes(termo.replace(/\D/g, ''))
      )
    : unidades;

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Unidades</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Estabelecimentos da empresa — base para setores, funcionários, GHE e frota
          </p>
        </div>
        <Link
          to="/unidades/nova"
          className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nova unidade
        </Link>
      </header>

      <div className="px-margin-mobile md:px-md pb-8 flex-1 flex flex-col gap-4">
        {erro && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erro}
          </div>
        )}

        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            type="search"
            placeholder="Buscar por razão social, nome fantasia ou CNPJ"
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
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/40">
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">
              apartment
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo
                ? 'Nenhuma unidade encontrada para esta busca.'
                : 'Nenhuma unidade cadastrada ainda.'}
            </p>
            {!termo && (
              <Link
                to="/unidades/nova"
                className="text-label-md text-primary-container hover:underline"
              >
                Cadastrar a primeira unidade
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtradas.map((u) => (
              <button
                key={u.id}
                onClick={() => navigate(`/unidades/${u.id}`)}
                className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
              >
                <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                  <span className="material-symbols-outlined">apartment</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body-lg text-primary font-semibold truncate">
                    {u.nome_fantasia || u.razao_social}
                  </h3>
                  {u.nome_fantasia && (
                    <p className="text-label-sm text-on-surface-variant truncate">
                      {u.razao_social}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-label-sm text-on-surface-variant">
                    <span>
                      {TIPO[u.tipo_inscricao]} {formatarDoc(u.numero_inscricao, u.tipo_inscricao)}
                    </span>
                    {u.municipio && (
                      <span className="flex items-center">
                        <span className="material-symbols-outlined text-[16px] mr-1">place</span>
                        {u.municipio}
                        {u.uf ? `/${u.uf}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                {u.grau_risco && (
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-label-sm ${corGrau(u.grau_risco)}`}
                  >
                    Grau {u.grau_risco}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
