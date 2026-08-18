import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabaseAnonimo } from '@/lib/cipa/supabase';
import { Urna } from '@/components/cipa/Urna';
import { Comprovante } from '@/components/cipa/Comprovante';
import { TelaAviso } from '@/components/cipa/TelaAviso';
import { mensagemDoErro } from '@/lib/cipa/erros';
import type { Cedula, SessaoEleitor } from '@/lib/cipa/types';

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; titulo: string; descricao: string }
  | { tipo: 'comprovante'; unidade: string; titulo: string }
  | { tipo: 'aviso'; titulo: string; descricao: string }
  | { tipo: 'urna'; cedula: Cedula; saudacao: string };

/** Porta A — rota PÚBLICA. Registrada fora de <Protegida> em App.tsx. */
export default function VotoLink() {
  const { token } = useParams<{ token: string }>();
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });

  useEffect(() => {
    if (!token) return;
    let ativo = true;
    const supabase = supabaseAnonimo();

    (async () => {
      const { data: sessao, error: erroSessao } = await supabase.rpc('cipa_validar_token', { p_token: token });
      if (!ativo) return;
      if (erroSessao || !sessao) {
        setEstado({ tipo: 'erro', titulo: 'Link não reconhecido', descricao: mensagemDoErro(erroSessao) });
        return;
      }
      const eleitor = sessao as SessaoEleitor;

      const { data: cedulaBruta, error: erroCedula } = await supabase.rpc('cipa_obter_cedula', {
        p_eleicao_id: eleitor.eleicao_id,
      });
      if (!ativo) return;
      if (erroCedula || !cedulaBruta) {
        setEstado({ tipo: 'erro', titulo: 'Eleição indisponível', descricao: mensagemDoErro(erroCedula) });
        return;
      }
      const cedula = cedulaBruta as Cedula;
      const unidade = cedula.unidade.nome_fantasia || cedula.unidade.razao_social;

      if (eleitor.ja_votou) {
        setEstado({ tipo: 'comprovante', unidade, titulo: cedula.eleicao.titulo });
        return;
      }

      if (!cedula.eleicao.aceitando_votos) {
        const encerrada = new Date(cedula.eleicao.data_fim) < new Date();
        setEstado({
          tipo: 'aviso',
          titulo: encerrada ? 'Votação encerrada' : 'Votação ainda não começou',
          descricao: encerrada
            ? 'O período de votação terminou. O resultado será divulgado pela comissão eleitoral.'
            : `A urna abre em ${new Date(cedula.eleicao.data_inicio).toLocaleString('pt-BR')}. Guarde este link.`,
        });
        return;
      }

      setEstado({ tipo: 'urna', cedula, saudacao: eleitor.nome });
    })();

    return () => { ativo = false; };
  }, [token]);

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
  if (estado.tipo === 'comprovante') {
    return <Comprovante nomeUnidade={estado.unidade} titulo={estado.titulo} />;
  }
  return (
    <Urna cedula={estado.cedula} saudacao={estado.saudacao} identificacao={{ origem: 'LINK_MAGICO', token: token! }} />
  );
}
