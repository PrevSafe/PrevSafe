import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabaseAnonimo } from '@/lib/cipa/supabase';
import { FluxoQrCode } from '@/components/cipa/FluxoQrCode';
import { TelaAviso } from '@/components/cipa/TelaAviso';
import { mensagemDoErro } from '@/lib/cipa/erros';
import type { Cedula } from '@/lib/cipa/types';

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; titulo: string; descricao: string }
  | { tipo: 'aviso'; titulo: string; descricao: string }
  | { tipo: 'fluxo'; cedula: Cedula };

/** Porta B — rota PÚBLICA. Registrada fora de <Protegida> em App.tsx. */
export default function VotoQr() {
  const { eleicaoId } = useParams<{ eleicaoId: string }>();
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });

  useEffect(() => {
    if (!eleicaoId) return;
    let ativo = true;
    const supabase = supabaseAnonimo();

    (async () => {
      const { data, error } = await supabase.rpc('cipa_obter_cedula', { p_eleicao_id: eleicaoId });
      if (!ativo) return;
      if (error || !data) {
        setEstado({ tipo: 'erro', titulo: 'Eleição não encontrada', descricao: mensagemDoErro(error) });
        return;
      }
      const cedula = data as Cedula;

      if (!cedula.eleicao.permite_qr_code) {
        setEstado({
          tipo: 'aviso',
          titulo: 'Votação por QR Code desativada',
          descricao: 'Nesta eleição o voto é feito apenas pelo link enviado a cada trabalhador.',
        });
        return;
      }

      if (!cedula.eleicao.aceitando_votos) {
        const encerrada = new Date(cedula.eleicao.data_fim) < new Date();
        setEstado({
          tipo: 'aviso',
          titulo: encerrada ? 'Votação encerrada' : 'Votação ainda não começou',
          descricao: encerrada
            ? 'O período de votação terminou. O resultado será divulgado pela comissão eleitoral.'
            : `A urna abre em ${new Date(cedula.eleicao.data_inicio).toLocaleString('pt-BR')}.`,
        });
        return;
      }

      setEstado({ tipo: 'fluxo', cedula });
    })();

    return () => { ativo = false; };
  }, [eleicaoId]);

  if (estado.tipo === 'carregando') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
          progress_activity
        </span>
      </div>
    );
  }
  if (estado.tipo === 'erro') {
    return <TelaAviso tom="erro" titulo={estado.titulo} descricao={estado.descricao} />;
  }
  if (estado.tipo === 'aviso') {
    return <TelaAviso tom="atencao" titulo={estado.titulo} descricao={estado.descricao} />;
  }
  return <FluxoQrCode cedula={estado.cedula} />;
}
