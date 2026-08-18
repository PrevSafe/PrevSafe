import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabaseServidor } from '@/lib/cipa/supabase';
import { ImportadorCsv } from '@/components/cipa/ImportadorCsv';
import { GeradorLinks } from '@/components/cipa/GeradorLinks';

type Eleitor = {
  id: string;
  nome: string;
  cpf: string;
  cargo: string | null;
  setor: string | null;
  email: string | null;
  telefone: string | null;
  token_hash: string | null;
  status_voto: string | null;
};

export default function Eleitores() {
  const { id } = useParams<{ id: string }>();
  const [eleitores, setEleitores] = useState<Eleitor[]>([]);
  const [count, setCount] = useState(0);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    (async () => {
      const supabase = await supabaseServidor();
      const { data, count: total } = await supabase
        .from('eleicao_eleitores')
        .select('id, nome, cpf, cargo, setor, email, telefone, token_hash, status_voto', { count: 'exact' })
        .eq('eleicao_id', id)
        .order('nome')
        .limit(200);
      if (!ativo) return;
      setEleitores((data ?? []) as Eleitor[]);
      setCount(total ?? 0);
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

  const comLink = eleitores.filter((e) => e.token_hash).length;
  const votaram = eleitores.filter((e) => e.status_voto).length;

  return (
    <div className="px-margin-mobile md:px-md py-6">
      <p className="text-label-sm uppercase tracking-wider text-outline">Lista de aptos</p>
      <h1 className="mt-2 text-headline-lg font-extrabold text-on-surface">Eleitores</h1>
      <p className="mt-2 text-on-surface-variant">
        {count} na lista · {comLink} com link gerado · {votaram} já votaram
      </p>
      <p className="mt-2 max-w-2xl text-label-sm text-outline">
        Esta lista é um retrato da folha no momento em que foi montada. Admissões e desligamentos
        posteriores não alteram o quórum desta eleição.
      </p>

      <GeradorLinks eleicaoId={id!} />
      <ImportadorCsv eleicaoId={id!} />

      <div className="mt-6 overflow-hidden overflow-x-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm">
        <table className="w-full text-label-md">
          <thead className="bg-surface">
            <tr className="text-left">
              {['Nome', 'CPF', 'Função', 'Contato', 'Situação'].map((h) => (
                <th key={h} className="px-5 py-3 text-label-sm uppercase tracking-wider text-outline">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {eleitores.map((e) => (
              <tr key={e.id} className="border-t border-outline-variant/40">
                <td className="px-5 py-3 font-medium text-on-surface">{e.nome}</td>
                <td className="px-5 py-3 font-mono text-on-surface-variant">
                  {`***.${String(e.cpf).slice(3, 6)}.${String(e.cpf).slice(6, 9)}-**`}
                </td>
                <td className="px-5 py-3 text-on-surface-variant">{e.cargo ?? '—'}</td>
                <td className="px-5 py-3 text-on-surface-variant">
                  {e.email ?? e.telefone ?? <span className="text-warning">sem contato · usa o mural</span>}
                </td>
                <td className="px-5 py-3">
                  {e.status_voto
                    ? <span className="rounded-full bg-secondary-container px-3 py-1 text-label-sm font-semibold text-on-secondary-container">Votou</span>
                    : <span className="rounded-full bg-surface px-3 py-1 text-label-sm font-semibold text-on-surface-variant">Aguardando</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {count > 200 && (
        <p className="mt-4 text-label-sm text-outline">Mostrando os 200 primeiros nomes.</p>
      )}
    </div>
  );
}
