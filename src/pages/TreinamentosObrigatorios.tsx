import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';

type Obrigatoriedade = {
  id: string;
  norma_regulamentadora: string;
  nome_treinamento: string;
  periodicidade_meses: number;
  cargos: { nome: string } | null;
};

export default function TreinamentosObrigatorios() {
  const { empresaAtiva, can } = useAuth();
  const podeCriar = can('treinamentos_obrigatorios', 'criar');

  const [obrigatoriedades, setObrigatoriedades] = useState<Obrigatoriedade[]>([]);
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
        .from('treinamentos_obrigatorios')
        .select('id, norma_regulamentadora, nome_treinamento, periodicidade_meses, cargos(nome)'),
      empresaAtiva.empresa_id
    )
      .then(({ data, error }) => {
        if (error) {
          setErro(error.message);
        } else {
          const lista = ((data ?? []) as unknown as Obrigatoriedade[]).slice().sort((a, b) =>
            (a.cargos?.nome ?? '').localeCompare(b.cargos?.nome ?? '')
          );
          setObrigatoriedades(lista);
        }
        setCarregando(false);
      });
  }, [empresaAtiva]);

  const termo = busca.trim().toLowerCase();

  const filtrados = obrigatoriedades.filter((o) => {
    if (!termo) return true;
    return (
      (o.cargos?.nome ?? '').toLowerCase().includes(termo) ||
      o.norma_regulamentadora.toLowerCase().includes(termo) ||
      o.nome_treinamento.toLowerCase().includes(termo)
    );
  });

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Matriz de Treinamentos Obrigatórios</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Defina, por cargo, quais treinamentos de segurança são obrigatórios e a periodicidade
            de reciclagem exigida
          </p>
        </div>
        {podeCriar && (
          <Link
            to="/treinamentos-obrigatorios/novo"
            className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova Obrigatoriedade
          </Link>
        )}
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
            placeholder="Buscar por cargo, norma ou nome do treinamento"
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
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">
              assignment_turned_in
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo
                ? 'Nenhuma obrigatoriedade encontrada para esta busca.'
                : 'Nenhuma obrigatoriedade de treinamento cadastrada ainda.'}
            </p>
            {!termo && podeCriar && (
              <Link
                to="/treinamentos-obrigatorios/novo"
                className="text-label-md text-primary-container hover:underline"
              >
                Cadastrar a primeira obrigatoriedade
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((o) => (
              <button
                key={o.id}
                onClick={() => navigate(`/treinamentos-obrigatorios/${o.id}`)}
                className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
              >
                <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                  <span className="material-symbols-outlined">assignment_turned_in</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body-lg text-primary font-semibold truncate">
                    {o.cargos?.nome ?? 'Cargo não informado'}
                  </h3>
                  <p className="text-label-sm text-on-surface-variant truncate mt-1">
                    {o.nome_treinamento}
                  </p>
                  <p className="text-label-sm text-outline truncate mt-1">
                    Reciclagem a cada {o.periodicidade_meses}{' '}
                    {o.periodicidade_meses === 1 ? 'mês' : 'meses'}
                  </p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full text-label-sm bg-secondary-container/40 text-on-secondary-container">
                  {o.norma_regulamentadora}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
