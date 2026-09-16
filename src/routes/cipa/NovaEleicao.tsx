import { useEffect, useState } from 'react';
import { supabaseServidor } from '@/lib/cipa/supabase';
import { FormNovaEleicao } from '@/components/cipa/FormNovaEleicao';
import type { UnidadeOpcao } from '@/lib/cipa/types';

export default function NovaEleicao() {
  const [liberadas, setLiberadas] = useState<UnidadeOpcao[]>([]);
  const [totalUnidades, setTotalUnidades] = useState(0);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const supabase = await supabaseServidor();

      const { data: unidades } = await supabase
        .from('unidades')
        .select('id, razao_social, nome_fantasia, numero_inscricao, municipio, uf, matriz, empresa_id')
        .eq('ativo', true)
        .order('matriz', { ascending: false })
        .order('razao_social');

      if (!ativo) return;
      setTotalUnidades(unidades?.length ?? 0);

      // Só oferece unidades cujas empresas têm o módulo liberado.
      const lista: UnidadeOpcao[] = [];
      for (const u of unidades ?? []) {
        const { data: ativoModulo } = await supabase.rpc('modulo_ativo', {
          p_empresa_id: u.empresa_id, p_modulo: 'CIPA',
        });
        if (ativoModulo) lista.push(u as unknown as UnidadeOpcao);
      }
      if (!ativo) return;
      setLiberadas(lista);
      setCarregando(false);
    })();
    return () => { ativo = false; };
  }, []);

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
      <p className="text-label-sm uppercase tracking-wider text-outline">Módulo CIPA</p>
      <h1 className="mt-2 text-headline-lg font-extrabold text-on-surface">Nova eleição</h1>
      <p className="mt-2 max-w-2xl text-on-surface-variant">
        A eleição pertence a uma unidade. Empresa com filiais precisa de uma CIPA por
        estabelecimento, cada uma dimensionada pelo CNAE e pelo número de empregados daquele CNPJ.
      </p>

      {!liberadas.length ? (
        <div className="mt-8 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-8 shadow-sm">
          <p className="text-title-lg font-bold text-on-surface">Nenhuma unidade disponível</p>
          <p className="mt-2 max-w-[36rem] text-on-surface-variant">
            {totalUnidades
              ? 'As unidades cadastradas pertencem a empresas sem o módulo CIPA contratado.'
              : 'Cadastre ao menos uma unidade ativa antes de criar uma eleição.'}
          </p>
        </div>
      ) : (
        <FormNovaEleicao unidades={liberadas} />
      )}
    </div>
  );
}
