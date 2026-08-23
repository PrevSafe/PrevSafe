import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { formatarData } from '@/lib/dds';

type Registro = {
  id: string;
  data: string;
  tema: string;
  responsavel: string | null;
  quantidade_participantes: number | null;
};

export default function Dds() {
  const { empresaAtiva } = useAuth();
  const navigate = useNavigate();

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    daEmpresa(
      supabase.from('dds_registros').select('id, data, tema, responsavel, quantidade_participantes'),
      empresaAtiva.empresa_id
    )
      .order('data', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErro(error.message);
        else setRegistros(data as Registro[]);
        setCarregando(false);
      });
  }, [empresaAtiva]);

  const termo = busca.trim().toLowerCase();
  const filtrados = registros.filter(
    (r) =>
      !termo ||
      r.tema.toLowerCase().includes(termo) ||
      (r.responsavel ?? '').toLowerCase().includes(termo)
  );

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-margin-mobile md:px-md py-6">
        <div>
          <h1 className="text-headline-lg text-primary">DDS e Treinamentos</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Diálogos diários/semanais de segurança — registro dos encontros
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link
            to="/dds/treinamentos"
            className="h-12 rounded-lg border border-outline text-on-surface-variant text-label-md flex items-center justify-center gap-2 px-5 hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">school</span>
            Treinamentos
          </Link>
          <Link
            to="/dds/novo"
            className="h-12 rounded-lg bg-primary-container text-white text-label-md flex items-center justify-center gap-2 px-5 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo DDS
          </Link>
        </div>
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
            placeholder="Buscar por tema ou responsável"
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
            <span className="material-symbols-outlined text-5xl text-outline-variant mb-3">forum</span>
            <p className="text-body-md text-on-surface-variant mb-4">
              {termo ? 'Nenhum registro encontrado para este filtro.' : 'Nenhum DDS registrado ainda.'}
            </p>
            {!termo && (
              <Link to="/dds/novo" className="text-label-md text-primary-container hover:underline">
                Registrar o primeiro DDS
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtrados.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/dds/${r.id}`)}
                className="text-left bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 hover:shadow-md transition-shadow flex gap-4 items-start"
              >
                <div className="bg-primary-container/10 text-primary-container p-3 rounded-lg shrink-0">
                  <span className="material-symbols-outlined">forum</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body-lg text-primary font-semibold truncate">{r.tema}</h3>
                  <p className="text-label-sm text-on-surface-variant truncate">
                    {r.responsavel || 'Responsável não informado'}
                  </p>
                  <p className="text-label-sm text-outline truncate mt-1">
                    {formatarData(r.data)}
                    {r.quantidade_participantes != null
                      ? ` · ${r.quantidade_participantes} participante(s)`
                      : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
