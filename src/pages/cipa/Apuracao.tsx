import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabaseServidor } from '@/lib/cipa/supabase';
import { GeradorAta } from '@/components/cipa/GeradorAta';

type Eleicao = { titulo: string; status: string; ata_eleicao_md: string | null };

export default function Apuracao() {
  const { id } = useParams<{ id: string }>();
  const [eleicao, setEleicao] = useState<Eleicao | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    (async () => {
      const supabase = await supabaseServidor();
      const { data } = await supabase
        .from('eleicoes').select('titulo, status, ata_eleicao_md').eq('id', id).single();
      if (!ativo) return;
      setEleicao(data as Eleicao | null);
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
      <p className="nao-imprimir text-label-sm uppercase tracking-wider text-outline">Apuração</p>
      <h1 className="nao-imprimir mt-2 text-headline-lg font-extrabold text-on-surface">Encerramento e atas</h1>
      <p className="nao-imprimir mt-2 max-w-2xl text-on-surface-variant">
        Encerrar exige quarentena zerada. A partir daí o sistema consolida quórum, votos por
        candidato, brancos e nulos, e preenche a ata.
        {eleicao?.status === 'ABERTA' && ' A urna ainda está aberta — encerrar é irreversível.'}
      </p>

      <GeradorAta eleicaoId={id!} ataSalva={eleicao?.ata_eleicao_md ?? null} />
    </div>
  );
}
