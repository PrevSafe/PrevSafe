'use client';

/**
 * Conteudo que as NR setoriais (NR-32, NR-36, NR-38) mandam constar do PCMSO
 * e que o sistema nao redige.
 *
 * O medico redige. Esta tela registra o que foi informado - o texto, ou a
 * referencia a um documento anexo ao PCMSO - com o medico que redigiu e a
 * data, e o PDF o imprime na secao 5.8. As regras ficam em lib/pcmso.ts
 * (faltasDoConteudoSetorial, montarPcmso): a tela e o documento conferem com
 * a mesma conta.
 *
 * NADA VEM PREENCHIDO. Um calendario vacinal ou um procedimento sugerido
 * sairia no PCMSO como se o medico o tivesse escrito. E nenhum campo tem
 * placeholder: o exemplo cinza ja foi lido como dado preenchido. A orientacao
 * fica abaixo do campo.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import type { ConteudoSetorialDoPcmso, TechnicalProfessional } from '@/types';
import {
  faltasDoConteudoSetorial,
  registroDoItem,
  RASCUNHO_VAZIO_DO_CONTEUDO_SETORIAL,
  type ItemARedigir,
  type RascunhoDoConteudoSetorial
} from '@/lib/pcmso';
import { linhaDeAssinatura, responsaveisDoCliente } from '@/lib/responsabilidadeTecnica';
import { dataDeHoje } from '@/lib/datas';
import { formatDate } from '@/lib/utils';
import { usePcmsoMontado } from './PcmsoResumo';
import { CheckCircle2, AlertTriangle, Edit3, Trash2, FileText, Paperclip } from 'lucide-react';

interface PcmsoConteudoSetorialProps {
  selectedClientId: string;
}

// Os controles levam a classe por extenso: scripts/verificar-tema.mjs le o
// className literal de cada input, select e textarea.
const DICA = 'text-[11px] text-slate-500 mt-1';

export const PcmsoConteudoSetorial: React.FC<PcmsoConteudoSetorialProps> = ({ selectedClientId }) => {
  const {
    clients = [],
    ghes = [],
    environmentalRisks = [],
    examProtocols = [],
    employees = [],
    trainingRequirements = [],
    hierarchyJobs = [],
    technicalProfessionals = [],
    technicalResponsibilities = [],
    currentProfile,
    updateClient
  } = usePrevSafe();

  const cliente = clients.find((c) => c.id === selectedClientId);
  const hoje = dataDeHoje();
  // A mesma conta do PDF: o que esta tela chama de registrado e o que sai impresso.
  const { montado } = usePcmsoMontado({
    client: cliente, ghes, risks: environmentalRisks, examProtocols, employees, trainingRequirements, jobs: hierarchyJobs
  });
  const colaboradores = useMemo(() => employees.filter((e) => e.client_id === selectedClientId), [employees, selectedClientId]);

  // O PCMSO e do medico: quem redige e o coordenador ou o elaborador atribuido
  // a este cliente (NR-07, 7.4.1 "c"), e nao um nome digitado.
  const medicos = useMemo(() => {
    const lista = [
      ...responsaveisDoCliente(technicalResponsibilities, technicalProfessionals, selectedClientId, 'PCMSO_COORD', hoje),
      ...responsaveisDoCliente(technicalResponsibilities, technicalProfessionals, selectedClientId, 'PCMSO_ELABORADOR', hoje)
    ];
    return lista.filter((p, i) => lista.findIndex((x) => x.id === p.id) === i);
  }, [technicalResponsibilities, technicalProfessionals, selectedClientId, hoje]);

  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<RascunhoDoConteudoSetorial>({ ...RASCUNHO_VAZIO_DO_CONTEUDO_SETORIAL });
  const [erros, setErros] = useState<string[]>([]);
  // As chaves dos itens se repetem entre clientes: sem isto, o rascunho aberto
  // para um cliente seria gravado no proximo selecionado.
  useEffect(() => {
    setEditando(null);
    setErros([]);
  }, [selectedClientId]);

  if (!cliente) return null;
  const registros = cliente.pcmso_sectoral_content || {};
  const comConteudo = montado.setoriais.filter((e) => e.aRedigir.length > 0);

  const abrir = (item: ItemARedigir) => {
    const r = registroDoItem(item, registros);
    setRascunho(r
      ? {
        forma: r.forma || '',
        texto: r.texto || '',
        anexo_titulo: r.anexo_titulo || '',
        anexo_local: r.anexo_local || '',
        data: r.data || '',
        autor_id: r.autor_id || '',
        autor: r.autor || ''
      }
      : { ...RASCUNHO_VAZIO_DO_CONTEUDO_SETORIAL });
    setErros([]);
    setEditando(item.chave);
  };

  const salvar = (item: ItemARedigir) => {
    const anterior = registroDoItem(item, registros);
    const medico = medicos.find((m) => m.id === rascunho.autor_id) as TechnicalProfessional | undefined;
    // Medico que ja nao esta atribuido continua sendo o autor do que redigiu.
    const autor = medico
      ? linhaDeAssinatura(medico)
      : (anterior && anterior.autor_id === rascunho.autor_id ? anterior.autor || '' : '');
    // So os campos da forma escolhida: texto de uma forma abandonada nao fica guardado.
    const registro: ConteudoSetorialDoPcmso = {
      forma: rascunho.forma || undefined,
      ...(rascunho.forma === 'TEXTO' ? { texto: rascunho.texto } : {}),
      ...(rascunho.forma === 'ANEXO' ? { anexo_titulo: rascunho.anexo_titulo, anexo_local: rascunho.anexo_local } : {}),
      data: rascunho.data,
      autor_id: rascunho.autor_id,
      autor,
      registrado_em: new Date().toISOString(),
      registrado_por: currentProfile?.full_name || ''
    };
    const faltam = faltasDoConteudoSetorial(registro, { colaboradores, hoje });
    if (faltam.length > 0) {
      setErros(faltam);
      return;
    }
    updateClient(cliente.id, { pcmso_sectoral_content: { ...registros, [item.chave]: registro } });
    setEditando(null);
    setErros([]);
  };

  const apagar = (item: ItemARedigir) => {
    if (!window.confirm('Apagar este registro? O item volta a ser pendência no PCMSO.')) return;
    const resto = { ...registros };
    delete resto[item.chave];
    updateClient(cliente.id, { pcmso_sectoral_content: resto });
    if (editando === item.chave) setEditando(null);
  };

  if (comConteudo.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
        O CNAE principal deste cliente não indica NR setorial que acrescente conteúdo ao PCMSO.
      </div>
    );
  }

  const medicoAnteriorForaDaLista = (chave: string) => {
    const r = registros[chave];
    return r && r.autor_id && !medicos.some((m) => m.id === r.autor_id) ? r : null;
  };

  return (
    <div className="space-y-4" id="pcmso-conteudo-setorial">
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-1">
        <p className="font-semibold text-slate-100">Conteúdo que a NR setorial manda constar do PCMSO</p>
        <p className="text-slate-400">
          O sistema não redige este conteúdo: é ato do médico responsável pelo PCMSO. Registre aqui o que ele
          redigiu, ou identifique o documento anexo ao PCMSO que o contém. O PDF imprime cada item na seção 5.8,
          atribuído ao médico e com a data; o item sem registro completo continua pendência na seção 11.1.
        </p>
      </div>

      {comConteudo.map((e) => (
        <div key={e.nr} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100">{e.nr} — {e.titulo}</h3>
            <p className="text-[11px] text-amber-300 mt-1">{e.motivo}</p>
          </div>

          {e.aRedigir.map((item) => {
            const valido = montado.conteudosSetoriais[item.chave];
            const guardado = registroDoItem(item, registros);
            const faltamNoGuardado = guardado && !valido ? faltasDoConteudoSetorial(guardado, { colaboradores, hoje }) : [];
            const aberto = editando === item.chave;
            const antigo = medicoAnteriorForaDaLista(item.chave);
            return (
              <div key={item.chave} className="border border-slate-800 rounded-lg p-3 bg-slate-950/60 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <p className="text-xs text-slate-200 font-semibold">{item.texto}</p>
                  {valido ? (
                    <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Registrado
                    </span>
                  ) : (
                    <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {guardado ? 'Registro incompleto' : 'Pendente'}
                    </span>
                  )}
                </div>

                {valido && !aberto && (
                  <div className="text-[11px] text-slate-400 space-y-1">
                    {valido.forma === 'ANEXO' ? (
                      <p className="flex items-start gap-1">
                        <Paperclip className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>Documento anexo: <strong className="text-slate-200">{valido.anexo_titulo}</strong>, de {formatDate(valido.data)}. Arquivado em: {valido.anexo_local}.</span>
                      </p>
                    ) : (
                      <p className="whitespace-pre-wrap text-slate-300 bg-slate-950 border border-slate-800 rounded p-2 max-h-[160px] overflow-y-auto">{valido.texto}</p>
                    )}
                    <p>Redigido por {valido.autor}{valido.forma === 'ANEXO' ? '' : ` em ${formatDate(valido.data)}`}.
                      {valido.registrado_por ? ` Registrado por ${valido.registrado_por}.` : ''}</p>
                  </div>
                )}

                {faltamNoGuardado.length > 0 && !aberto && (
                  <p className="text-[11px] text-amber-300">Não sai no PCMSO até completar: falta {faltamNoGuardado.join('; ')}.</p>
                )}

                {!aberto && (
                  <div className="flex items-center justify-end gap-2">
                    {guardado && (
                      <button
                        type="button"
                        onClick={() => apagar(item)}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Apagar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => abrir(item)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> {guardado ? 'Editar registro' : 'Registrar conteúdo'}
                    </button>
                  </div>
                )}

                {aberto && (
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-300 mb-1">Como o conteúdo integra o PCMSO</p>
                      <div className="flex flex-wrap gap-2">
                        {([['TEXTO', 'Texto redigido pelo médico', FileText], ['ANEXO', 'Documento anexo ao PCMSO', Paperclip]] as const).map(([valor, rotulo, Icone]) => (
                          <button
                            key={valor}
                            type="button"
                            onClick={() => setRascunho({ ...rascunho, forma: valor })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${
                              rascunho.forma === valor
                                ? 'bg-teal-500/15 border-teal-500/50 text-teal-300'
                                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Icone className="w-3.5 h-3.5" /> {rotulo}
                          </button>
                        ))}
                      </div>
                      <p className={DICA}>
                        Texto: sai impresso no PCMSO como está aqui. Documento anexo: o PCMSO o cita pelo título, pela data e
                        por onde fica arquivado.
                      </p>
                    </div>

                    {rascunho.forma === 'TEXTO' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1" htmlFor={`setorial-texto-${item.chave}`}>
                          Conteúdo redigido pelo médico
                        </label>
                        <textarea
                          id={`setorial-texto-${item.chave}`}
                          rows={10}
                          value={rascunho.texto}
                          onChange={(ev) => setRascunho({ ...rascunho, texto: ev.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                        />
                        <p className={DICA}>
                          Transcreva o que o médico redigiu, sem resumir. É conteúdo do programa: sem nome, CPF ou resultado
                          de trabalhador, que ficam no prontuário. Símbolos como ≥ ou → não saem no PDF; escreva-os por extenso.
                        </p>
                      </div>
                    )}

                    {rascunho.forma === 'ANEXO' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1" htmlFor={`setorial-titulo-${item.chave}`}>
                            Título do documento anexo
                          </label>
                          <input
                            id={`setorial-titulo-${item.chave}`}
                            type="text"
                            value={rascunho.anexo_titulo}
                            onChange={(ev) => setRascunho({ ...rascunho, anexo_titulo: ev.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                          />
                          <p className={DICA}>Como o documento está intitulado. Sem nome ou CPF de trabalhador.</p>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1" htmlFor={`setorial-local-${item.chave}`}>
                            Onde fica arquivado
                          </label>
                          <input
                            id={`setorial-local-${item.chave}`}
                            type="text"
                            value={rascunho.anexo_local}
                            onChange={(ev) => setRascunho({ ...rascunho, anexo_local: ev.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                          />
                          <p className={DICA}>Local físico ou sistema em que o anexo fica guardado e pode ser consultado.</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1" htmlFor={`setorial-autor-${item.chave}`}>
                          Médico que redigiu
                        </label>
                        <select
                          id={`setorial-autor-${item.chave}`}
                          value={rascunho.autor_id}
                          onChange={(ev) => setRascunho({ ...rascunho, autor_id: ev.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                        >
                          <option value="">Selecione</option>
                          {medicos.map((m) => (
                            <option key={m.id} value={m.id}>{linhaDeAssinatura(m)}</option>
                          ))}
                          {antigo && (
                            <option value={antigo.autor_id}>{antigo.autor} (sem atribuição vigente)</option>
                          )}
                        </select>
                        <p className={DICA}>
                          {medicos.length > 0
                            ? 'Coordenador ou elaborador do PCMSO deste cliente. Outro médico se atribui em Engenharia SST > 14. Responsabilidade Técnica.'
                            : 'Nenhum médico atribuído ao PCMSO deste cliente. Atribua o coordenador ou o elaborador em Engenharia SST > 14. Responsabilidade Técnica.'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1" htmlFor={`setorial-data-${item.chave}`}>
                          {rascunho.forma === 'ANEXO' ? 'Data do documento anexo' : 'Data da redação'}
                        </label>
                        <input
                          id={`setorial-data-${item.chave}`}
                          type="date"
                          max={hoje}
                          value={rascunho.data}
                          onChange={(ev) => setRascunho({ ...rascunho, data: ev.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                        />
                        <p className={DICA}>
                          {rascunho.forma === 'ANEXO' ? 'A data que consta do documento.' : 'Quando o médico redigiu este conteúdo.'}
                        </p>
                      </div>
                    </div>

                    {erros.length > 0 && (
                      <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[11px] text-rose-300">
                        <p className="font-bold">Não registrado. Falta:</p>
                        <ul className="list-disc list-inside">
                          {erros.map((x, i) => <li key={i}>{x}</li>)}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setEditando(null); setErros([]); }}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => salvar(item)}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950"
                      >
                        Salvar registro
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
