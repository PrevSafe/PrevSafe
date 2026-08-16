import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { GFIP, corGfip, formatarCbo } from '@/lib/gfip';

type Cargo = {
  id: string;
  codigo: string | null;
  nome: string;
  cbo: string | null;
  codigo_gfip: number;
  ativo: boolean;
};

export default function Cargos() {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from('cargos')
      .select('id, codigo, nome, cbo, codigo_gfip, ativo')
      .order('nome')
      .then(({ data, error }) => {
        if (error) setErro(error.message);
        else setCargos(data as Cargo[]);
        setCarregando(false);
      });
  }, []);

  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? cargos.filter(
        (c) =>
          c.nome.toLowerCase().includes(termo) ||
          (c.codigo ?? '').toLowerCase().includes(termo) ||
          (c.cbo ?? '').includes(termo.replace(/\D/g, ''))
      )
    : cargos;

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">Cargos</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Catálogo de cargos da empresa — usado para montar a estrutura organizacional
          </p>
        </div>
        <Link
          to="/cargos/novo"
          className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Novo cargo
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
            placeholder="Buscar por nome, código ou CBO"
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
              badge
            </span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo
                ? 'Nenhum cargo encontrado para esta busca.'
                : 'Nenhum cargo cadastrado ainda.'}
            </p>
            {!termo && (
              <Link to="/cargos/novo" className="text-label-md text-primary-container hover:underline">
                Cadastrar o primeiro cargo
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/cargos/${c.id}`)}
                className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
              >
                <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                  <span className="material-symbols-outlined">badge</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body-lg text-primary font-semibold truncate">{c.nome}</h3>
                  <p className="text-label-sm text-on-surface-variant truncate">
                    CBO {formatarCbo(c.cbo)}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-label-sm ${corGfip(c.codigo_gfip)}`}
                >
                  {GFIP[c.codigo_gfip]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
