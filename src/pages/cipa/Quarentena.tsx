import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabaseServidor } from '@/lib/cipa/supabase';
import { FilaQuarentena } from '@/components/cipa/FilaQuarentena';
import type { EnvelopeQuarentena } from '@/lib/cipa/types';

export default function Quarentena() {
  const { id } = useParams<{ id: string }>();
  const [envelopes, setEnvelopes] = useState<EnvelopeQuarentena[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    (async () => {
      const supabase = await supabaseServidor();
      const { data } = await supabase.rpc('cipa_fila_quarentena', {
        p_eleicao_id: id, p_status: 'PENDENTE',
      });
      if (!ativo) return;
      setEnvelopes((data ?? []) as EnvelopeQuarentena[]);
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
      <p className="text-label-sm uppercase tracking-wider text-outline">Conferência</p>
      <h1 className="mt-2 text-headline-lg font-extrabold text-on-surface">Votos do mural em quarentena</h1>
      <p className="mt-2 max-w-2xl text-on-surface-variant">
        Cada envelope traz a identidade declarada no QR Code cruzada com a lista de aptos.
        Ao aprovar, o voto é computado e o vínculo com a pessoa é apagado na mesma transação.
      </p>

      <FilaQuarentena envelopes={envelopes} />
    </div>
  );
}
