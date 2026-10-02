'use client';

/**
 * Resumo do PCMSO para a tela de documentos e para a pre-visualizacao.
 *
 * Le de lib/pcmso.ts (montarPcmso), a mesma fonte do PDF: as duas telas e o
 * documento nao podem dizer coisas diferentes. Nada aqui e preenchido por
 * padrao - antes, a tela afirmava "Vigencia do Programa: 12 Meses", listava os
 * protocolos de TODOS os clientes e completava campo vazio com "Geral",
 * "NR-07" ou "Todos os Colaboradores".
 */
import React from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import {
  montarPcmso,
  OCASIOES,
  codigoDo
} from '@/lib/pcmso';
import { assinaturaDoDocumento, responsaveisDoCliente } from '@/lib/responsabilidadeTecnica';
import { dataDeHoje } from '@/lib/datas';

interface PcmsoResumoProps {
  tema: 'escuro' | 'claro';
  client: any;
  ghes: any[];
  risks: any[];
  examProtocols: any[];
  employees: any[];
  trainingRequirements?: any[];
  jobs?: any[];
}

/** O PCMSO montado e o coordenador deste cliente: a conta que o PDF tambem faz. */
export function usePcmsoMontado({
  client, ghes, risks, examProtocols, employees, trainingRequirements = [], jobs = []
}: Omit<PcmsoResumoProps, 'tema'>) {
  const { technicalProfessionals, technicalResponsibilities } = usePrevSafe();
  const hoje = dataDeHoje();
  const coordenador = assinaturaDoDocumento('PCMSO_COORD', {
    atribuicoes: technicalResponsibilities, profissionais: technicalProfessionals, clientId: client?.id, data: hoje
  });
  const responsavelPgr = assinaturaDoDocumento('PGR_RESP', {
    atribuicoes: technicalResponsibilities, profissionais: technicalProfessionals, clientId: client?.id, data: hoje
  });
  const profissionalCoordenador = responsaveisDoCliente(
    technicalResponsibilities || [], technicalProfessionals || [], client?.id, 'PCMSO_COORD', hoje
  )[0];
  const ghesDoCliente = (ghes || []).filter((g: any) => !g?.client_id || g.client_id === client?.id);
  // Os mesmos argumentos do PDF (lib/pdfExportService.ts): a tela e o
  // documento contam as mesmas faltas.
  const montado = montarPcmso({
    cliente: client,
    ghes: ghesDoCliente,
    riscos: risks,
    protocolos: examProtocols,
    colaboradores: employees,
    treinamentos: trainingRequirements,
    cargos: jobs,
    pendenciaDoCoordenador: coordenador.origem === 'ATRIBUICAO' ? (coordenador.pendencia || null) : (coordenador.pendencia || 'nenhum médico atribuído a este cliente'),
    coordenadorSemRqe: Boolean(profissionalCoordenador) && !String(profissionalCoordenador?.rqe || '').trim(),
    semResponsavelPeloPgr: responsavelPgr.origem !== 'ATRIBUICAO'
  });
  return { coordenador, montado };
}

export const PcmsoResumo: React.FC<PcmsoResumoProps> = (props) => {
  const { tema } = props;
  const { coordenador, montado } = usePcmsoMontado(props);

  const escuro = tema === 'escuro';
  const c = {
    caixa: escuro ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300',
    cabeca: escuro ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-300',
    texto: escuro ? 'text-slate-300' : 'text-slate-800',
    forte: escuro ? 'text-slate-100' : 'text-slate-900',
    fraco: escuro ? 'text-slate-500' : 'text-slate-500',
    linha: escuro ? 'divide-slate-800/60' : 'divide-slate-200',
    pendente: escuro ? 'text-amber-400' : 'text-amber-700'
  };

  return (
    <div className="space-y-4">
      <div className={`text-xs ${c.texto}`}>
        Médico responsável pelo PCMSO:{' '}
        {coordenador.origem === 'ATRIBUICAO'
          ? <strong className={c.forte}>{coordenador.linha}</strong>
          : <span className={`${c.pendente} font-semibold`}>PENDENTE — atribua em Engenharia SST &gt; Responsabilidade Técnica</span>}
        <span className={c.fraco}> · {montado.empregadosAtivos} empregado(s) ativo(s) · {montado.grupos.length} GHE</span>
      </div>

      {montado.grupos.length === 0 ? (
        <p className={`text-xs ${c.pendente}`}>
          Nenhum GHE com inventário de riscos: o PCMSO é elaborado considerando os riscos identificados e
          classificados pelo PGR (subitem 7.5.1 da NR-07).
        </p>
      ) : (
        <div className={`border rounded-xl overflow-x-auto ${c.caixa}`}>
          <table className={`w-full text-left text-xs ${c.texto}`}>
            <thead className={`uppercase text-[10px] border-b ${c.cabeca}`}>
              <tr>
                <th className="py-2.5 px-3">GHE</th>
                <th className="py-2.5 px-3">Exame (Tabela 27)</th>
                <th className="py-2.5 px-3">Ocasiões</th>
                <th className="py-2.5 px-3">Periodicidade</th>
                <th className="py-2.5 px-3">Fundamento</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${c.linha}`}>
              {montado.grupos.flatMap((g) => (g.protocolos.length === 0
                ? [(
                  <tr key={g.ghe.id}>
                    <td className={`py-2 px-3 font-semibold ${c.forte}`}>{g.nome}</td>
                    <td colSpan={4} className={`py-2 px-3 ${c.pendente}`}>PENDENTE — nenhum exame planejado para este GHE</td>
                  </tr>
                )]
                : g.protocolos.map((p: any, i: number) => (
                  <tr key={`${g.ghe.id}-${p.id}`}>
                    <td className={`py-2 px-3 font-semibold ${c.forte}`}>
                      {i === 0 ? (
                        <>
                          {g.nome}
                          <div className={`text-[10px] font-normal ${c.fraco}`}>clínico no máximo a cada {g.periodicidade.meses} meses</div>
                        </>
                      ) : ''}
                    </td>
                    <td className="py-2 px-3"><span className="font-mono">{codigoDo(p)}</span> {p.exam_name}</td>
                    <td className="py-2 px-3">
                      {(Array.isArray(p.triggers) && p.triggers.length > 0)
                        ? p.triggers.map((t: string) => OCASIOES.find((o) => o.valor === t)?.sigla || t).join(', ')
                        : <span className={c.pendente}>PENDENTE</span>}
                    </td>
                    <td className="py-2 px-3">
                      {Array.isArray(p.triggers) && p.triggers.includes('PERIODICO')
                        ? (Number(p.periodicity_months) > 0 ? `${p.periodicity_months} meses` : <span className={c.pendente}>PENDENTE</span>)
                        : '—'}
                    </td>
                    <td className="py-2 px-3">
                      {p.mandatory_by_standard === 'CRITERIO_MEDICO'
                        ? (String(p.technical_justification || '').trim()
                          ? `A critério do médico: ${p.technical_justification}`
                          : <span className={c.pendente}>A critério do médico — PENDENTE justificativa (7.5.18)</span>)
                        : (p.mandatory_by_standard || <span className={c.pendente}>PENDENTE</span>)}
                    </td>
                  </tr>
                ))))}
            </tbody>
          </table>
        </div>
      )}

      {montado.modelosNaoAdotados > 0 && (
        <p className={`text-[11px] ${c.fraco}`}>
          {montado.modelosNaoAdotados} protocolo(s)-modelo do sistema não integram este PCMSO até o médico
          responsável adotá-los para o cliente.
        </p>
      )}

      {montado.faltas.length > 0 ? (
        <div className={`text-xs ${c.pendente}`}>
          <p className="font-semibold">{montado.faltas.length} pendência(s) — o PDF lista cada uma na seção 11:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            {montado.faltas.slice(0, 8).map((f, i) => <li key={i}>Seção {f.secao}: {f.curto}</li>)}
            {montado.faltas.length > 8 && <li>e mais {montado.faltas.length - 8}</li>}
          </ul>
        </div>
      ) : (
        <p className={`text-xs ${escuro ? 'text-emerald-400' : 'text-emerald-700'}`}>Nenhuma pendência no cadastro.</p>
      )}
    </div>
  );
};

/** So as pendencias, para a aba de protocolos de exame: e onde elas se corrigem. */
export const PcmsoPendencias: React.FC<Omit<PcmsoResumoProps, 'tema'>> = (props) => {
  const { montado } = usePcmsoMontado(props);
  if (!props.client) return null;
  if (montado.faltas.length === 0) {
    return (
      <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-300">
        PCMSO sem pendência no cadastro deste cliente.
      </div>
    );
  }
  return (
    <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 space-y-1">
      <p className="font-bold text-amber-300">
        {montado.faltas.length} pendência(s) no PCMSO deste cliente — saem impressas no documento, com o item da NR-07
      </p>
      <ul className="list-disc list-inside space-y-0.5">
        {montado.faltas.map((f, i) => <li key={i}>{f.longo}</li>)}
      </ul>
    </div>
  );
};
