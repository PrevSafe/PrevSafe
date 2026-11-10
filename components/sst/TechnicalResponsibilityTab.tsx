'use client';

/**
 * Responsabilidade tecnica por cliente.
 *
 * O sistema tinha UM responsavel tecnico e UM medico, na organizacao inteira,
 * e todo documento de todo cliente saia com esses dois nomes. Assinar como
 * responsavel tecnico de um contrato que nao e seu tem consequencia legal, e a
 * NR-07 ainda separa duas figuras que o sistema tratava como uma: o medico
 * COORDENADOR do PCMSO (item 7.4.1 "c") e o medico que REALIZOU o exame
 * clinico (item 7.5.19.1 "g"). O ASO pede os dois nomes, em campos diferentes.
 *
 * Esta tela tem duas partes:
 *   1. o cadastro do profissional - uma vez, com conselho, numero, UF e CPF
 *   2. as atribuicoes DESTE cliente - um papel de cada vez, com vigencia
 *
 * Nao ha "responsavel padrao". A regra e a de lib/responsabilidadeTecnica.ts.
 */

import React, { useMemo, useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import {
  CONSELHOS,
  PAPEIS_TECNICOS,
  definicaoDoPapel,
  habilitacaoParaPapel,
  linhaDeAssinatura,
  registroDoProfissional,
  responsaveisDoCliente,
  atribuicaoVigente,
} from '@/lib/responsabilidadeTecnica';
import { ConselhoProfissional, TechnicalProfessional, TechnicalRoleCode } from '@/types';
import { conferirDocumento } from '@/lib/validacoesBr';
import { dataDeHoje } from '@/lib/datas';
import { formatDate } from '@/lib/utils';
import {
  BadgeCheck,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  UserCog,
  Scale,
  X,
  CalendarX2,
  Users,
} from 'lucide-react';

interface TechnicalResponsibilityTabProps {
  selectedClientId: string;
}

const FORM_VAZIO = {
  full_name: '',
  cpf: '',
  council: 'CREA' as ConselhoProfissional,
  council_other: '',
  council_number: '',
  council_uf: '',
  rqe: '',
  specialty: '',
  email: '',
  phone: '',
  notes: '',
};

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export const TechnicalResponsibilityTab: React.FC<TechnicalResponsibilityTabProps> = ({
  selectedClientId,
}) => {
  const {
    clients = [],
    technicalProfessionals = [],
    technicalResponsibilities = [],
    addTechnicalProfessional,
    updateTechnicalProfessional,
    deleteTechnicalProfessional,
    atribuirResponsabilidade,
    encerrarResponsabilidade,
    organization,
  } = usePrevSafe();

  const hoje = dataDeHoje();

  const [modalProfissional, setModalProfissional] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...FORM_VAZIO });
  const [erro, setErro] = useState('');

  const [modalAtribuir, setModalAtribuir] = useState<TechnicalRoleCode | null>(null);
  const [profissionalEscolhido, setProfissionalEscolhido] = useState('');
  const [inicio, setInicio] = useState(hoje);
  const [fim, setFim] = useState('');
  const [clientesAlvo, setClientesAlvo] = useState<string[]>([]);
  const [resultado, setResultado] = useState('');

  const ativos = useMemo(
    () => technicalProfessionals.filter((p) => p.status !== 'INACTIVE'),
    [technicalProfessionals]
  );

  const cliente = clients.find((c) => c.id === selectedClientId);

  /** Papel -> quem responde hoje neste cliente. */
  const porPapel = useMemo(() => {
    const mapa = new Map<TechnicalRoleCode, TechnicalProfessional[]>();
    for (const papel of PAPEIS_TECNICOS) {
      mapa.set(
        papel.codigo,
        responsaveisDoCliente(
          technicalResponsibilities, technicalProfessionals, selectedClientId, papel.codigo, hoje
        )
      );
    }
    return mapa;
  }, [technicalResponsibilities, technicalProfessionals, selectedClientId, hoje]);

  const atribuicoesDoCliente = useMemo(
    () => technicalResponsibilities
      .filter((r) => r.client_id === selectedClientId)
      .sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || ''))),
    [technicalResponsibilities, selectedClientId]
  );

  const semResponsavel = PAPEIS_TECNICOS.filter((p) => (porPapel.get(p.codigo) || []).length === 0);

  const abrirCadastro = (profissional?: TechnicalProfessional) => {
    setErro('');
    if (profissional) {
      setEditandoId(profissional.id);
      setForm({
        full_name: profissional.full_name || '',
        cpf: profissional.cpf || '',
        council: profissional.council || 'CREA',
        council_other: profissional.council_other || '',
        council_number: profissional.council_number || '',
        council_uf: profissional.council_uf || '',
        rqe: profissional.rqe || '',
        specialty: profissional.specialty || '',
        email: profissional.email || '',
        phone: profissional.phone || '',
        notes: profissional.notes || '',
      });
    } else {
      setEditandoId(null);
      setForm({ ...FORM_VAZIO });
    }
    setModalProfissional(true);
  };

  const salvarProfissional = (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    // O CPF e o unico campo do grupo [respReg] do S-2240 e identifica o
    // medico no [respMonit] do S-2220. Gravar um CPF invalido aqui e garantir
    // recusa do evento la na frente.
    const conferencia = conferirDocumento(form.cpf, 'CPF');
    if (!conferencia.valido) {
      setErro(`CPF: ${conferencia.motivo}`);
      return;
    }
    if (form.council === 'OUTRO' && !form.council_other.trim()) {
      setErro('Informe a sigla do conselho.');
      return;
    }

    const dados = {
      ...form,
      full_name: form.full_name.trim(),
      council_number: form.council_number.trim(),
      council_uf: form.council_uf.trim().toUpperCase(),
      status: 'ACTIVE' as const,
    };

    if (editandoId) {
      updateTechnicalProfessional(editandoId, dados);
    } else {
      addTechnicalProfessional(dados);
    }
    setModalProfissional(false);
  };

  const removerProfissional = (profissional: TechnicalProfessional) => {
    const r = deleteTechnicalProfessional(profissional.id);
    setResultado(r.message);
  };

  const abrirAtribuicao = (papel: TechnicalRoleCode) => {
    setModalAtribuir(papel);
    setProfissionalEscolhido('');
    setInicio(hoje);
    setFim('');
    setClientesAlvo(selectedClientId ? [selectedClientId] : []);
    setResultado('');
  };

  const confirmarAtribuicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAtribuir) return;
    const r = atribuirResponsabilidade({
      professional_id: profissionalEscolhido,
      role: modalAtribuir,
      client_ids: clientesAlvo,
      start_date: inicio,
      end_date: fim || undefined,
    });
    setResultado(r.message);
    if (r.criadas > 0) setModalAtribuir(null);
  };

  const candidato = ativos.find((p) => p.id === profissionalEscolhido);
  const habilitacao = modalAtribuir && candidato
    ? habilitacaoParaPapel(candidato, modalAtribuir)
    : null;

  if (!selectedClientId) {
    return (
      <div className="bg-superficie border border-borda rounded-2xl p-8 text-center">
        <BadgeCheck className="w-8 h-8 text-tinta-2 mx-auto mb-3" />
        <p className="text-sm text-tinta-2">
          Selecione um cliente para definir quem responde tecnicamente por ele.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------ cabecalho */}
      <div className="bg-superficie border border-borda rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-tinta flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-teal-700" />
              Responsabilidade Técnica
              <span className="text-[11px] font-semibold text-tinta-2">
                NR-07 7.4.1 • NR-01 1.5.7.2 • CLT art. 195
              </span>
            </h3>
            <p className="text-xs text-tinta-2 mt-1 max-w-[52rem]">
              Quem assina cada documento <strong className="text-tinta">deste cliente</strong>.
              Não existe responsável padrão da organização: o profissional só aparece no documento
              do cliente em que foi atribuído, e a vigência diz desde quando.
            </p>
          </div>
          <button
            type="button"
            onClick={() => abrirCadastro()}
            className="bg-marca-escura text-white px-4 py-2 font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 text-sm shrink-0 hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Profissional
          </button>
        </div>
      </div>

      {resultado && (
        <div className="bg-superficie border border-teal-200 rounded-2xl p-4 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
          <p className="text-xs text-tinta flex-1">{resultado}</p>
          <button
            type="button"
            onClick={() => setResultado('')}
            className="text-tinta-2 hover:text-tinta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------ quem responde por este cliente */}
      <div className="bg-superficie border border-borda rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-borda flex items-center justify-between gap-3 flex-wrap">
          <h4 className="text-sm font-bold text-tinta flex items-center gap-2">
            <Scale className="w-4 h-4 text-teal-700" />
            Papéis em {cliente?.trade_name || cliente?.legal_name || 'cliente'}
          </h4>
          {semResponsavel.length > 0 && (
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1">
              {semResponsavel.length} papel(éis) sem responsável
            </span>
          )}
        </div>

        <div className="divide-y divide-borda">
          {PAPEIS_TECNICOS.map((papel) => {
            const titulares = porPapel.get(papel.codigo) || [];
            const vazio = titulares.length === 0;
            return (
              <div key={papel.codigo} className="px-5 py-3.5 flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-[16rem]">
                  <p className="text-sm font-semibold text-tinta">{papel.nome}</p>
                  <p className="text-[11px] text-tinta-2 mt-0.5">{papel.descricao}</p>
                  <p className="text-[10px] text-tinta-2 mt-1">{papel.baseLegal}</p>
                </div>

                <div className="min-w-[18rem] flex-1">
                  {vazio ? (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">
                        Sem responsável neste cliente.
                        {papel.codigo === 'PGR_RESP' && organization?.technical_responsible_name
                          ? ` O documento sai com ${organization.technical_responsible_name}, da configuração geral, e com essa pendência impressa.`
                          : ''}
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {titulares.map((t) => (
                        <li key={t.id} className="text-xs text-tinta">
                          <span className="font-semibold text-tinta">{t.full_name}</span>
                          <span className="text-tinta-2"> · {registroDoProfissional(t)}</span>
                          {!habilitacaoParaPapel(t, papel.codigo).apto && (
                            <span className="ml-2 text-[10px] font-bold text-red-700 bg-red-500/10 border border-red-500/30 rounded px-1.5 py-0.5">
                              registro incompatível
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => abrirAtribuicao(papel.codigo)}
                  className="px-3 py-1.5 bg-superficie-2 hover:bg-superficie-3 text-tinta text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0"
                >
                  <UserCog className="w-3.5 h-3.5" />
                  Atribuir
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------ vigencias */}
      {atribuicoesDoCliente.length > 0 && (
        <div className="bg-superficie border border-borda rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-borda">
            <h4 className="text-sm font-bold text-tinta">Histórico de vigências deste cliente</h4>
            <p className="text-[11px] text-tinta-2 mt-0.5">
              Encerrar não apaga: o documento emitido no ano passado foi assinado por quem
              respondia no ano passado.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-fundo text-tinta-2">
                <tr>
                  <th className="text-left px-5 py-2.5 font-semibold">Papel</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Profissional</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Início</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Fim</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Situação</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {atribuicoesDoCliente.map((r) => {
                  const p = technicalProfessionals.find((x) => x.id === r.professional_id);
                  const vigente = atribuicaoVigente(r, hoje);
                  return (
                    <tr key={r.id}>
                      <td className="px-5 py-2.5 text-tinta">
                        {definicaoDoPapel(r.role)?.nome || r.role}
                      </td>
                      <td className="px-3 py-2.5 text-tinta">
                        {p?.full_name || 'Profissional removido'}
                        <span className="block text-[10px] text-tinta-2">
                          {p ? registroDoProfissional(p) : ''}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-tinta-2 font-mono">
                        {r.start_date ? formatDate(r.start_date) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-tinta-2 font-mono">
                        {r.end_date ? formatDate(r.end_date) : 'indeterminado'}
                      </td>
                      <td className="px-3 py-2.5">
                        {vigente ? (
                          <span className="text-marca-escura font-semibold">vigente</span>
                        ) : (
                          <span className="text-tinta-2">encerrada</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {vigente && (
                          <button
                            type="button"
                            onClick={() => encerrarResponsabilidade(r.id, hoje)}
                            className="text-tinta-2 hover:text-amber-700 text-[11px] font-bold flex items-center gap-1 ml-auto"
                          >
                            <CalendarX2 className="w-3.5 h-3.5" />
                            Encerrar hoje
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ cadastro de profissionais */}
      <div className="bg-superficie border border-borda rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-borda">
          <h4 className="text-sm font-bold text-tinta flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-700" />
            Profissionais cadastrados
            <span className="text-[11px] font-normal text-tinta-2">
              valem para toda a organização; a responsabilidade é que é por cliente
            </span>
          </h4>
        </div>

        {technicalProfessionals.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-tinta-2">
              Nenhum profissional cadastrado. Enquanto não houver, os documentos continuam saindo
              com o responsável geral de Configurações › Responsabilidade Técnica.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-fundo text-tinta-2">
                <tr>
                  <th className="text-left px-5 py-2.5 font-semibold">Nome</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Registro</th>
                  <th className="text-left px-3 py-2.5 font-semibold">CPF</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Especialidade / RQE</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Clientes</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {technicalProfessionals.map((p) => {
                  const clientesDele = new Set(
                    technicalResponsibilities
                      .filter((r) => r.professional_id === p.id && atribuicaoVigente(r, hoje))
                      .map((r) => r.client_id)
                  );
                  return (
                    <tr key={p.id} className={p.status === 'INACTIVE' ? 'opacity-50' : ''}>
                      <td className="px-5 py-2.5 text-tinta font-semibold">
                        {p.full_name}
                        {p.status === 'INACTIVE' && (
                          <span className="ml-2 text-[10px] text-tinta-2">(inativo)</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-tinta font-mono">
                        {registroDoProfissional(p)}
                      </td>
                      <td className="px-3 py-2.5 text-tinta-2 font-mono">{p.cpf || '—'}</td>
                      <td className="px-3 py-2.5 text-tinta-2">
                        {p.specialty || '—'}
                        {p.rqe ? ` · RQE ${p.rqe}` : ''}
                      </td>
                      <td className="px-3 py-2.5 text-tinta-2">
                        {clientesDele.size === 0 ? (
                          <span className="text-tinta-2">nenhum</span>
                        ) : (
                          `${clientesDele.size} cliente(s)`
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => abrirCadastro(p)}
                            className="text-tinta-2 hover:text-teal-700"
                            title="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removerProfissional(p)}
                            className="text-tinta-2 hover:text-red-700"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------ modal: profissional */}
      {modalProfissional && (
        <div className="fixed inset-0 bg-fundo backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-superficie border border-borda rounded-2xl max-w-[46rem] w-full p-6 space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-borda pb-3">
              <h3 className="text-base font-bold text-tinta flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-teal-700" />
                {editandoId ? 'Editar profissional' : 'Cadastrar profissional'}
              </h3>
              <button
                type="button"
                onClick={() => setModalProfissional(false)}
                className="text-tinta-2 hover:text-tinta text-sm font-bold"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={salvarProfissional} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-tinta-2 font-semibold mb-1">Nome completo</label>
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 text-tinta"
                  />
                </div>
                <div>
                  <label className="block text-tinta-2 font-semibold mb-1">CPF</label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 text-tinta font-mono"
                  />
                  <p className="text-[10px] text-tinta-2 mt-1">
                    É o campo do grupo [respReg] do S-2240 e identifica o médico no [respMonit] do S-2220.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="block text-tinta-2 font-semibold mb-1">Conselho</label>
                  <select
                    value={form.council}
                    onChange={(e) => setForm({ ...form, council: e.target.value as ConselhoProfissional })}
                    className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 text-tinta"
                  >
                    {CONSELHOS.map((c) => (
                      <option key={c.codigo} value={c.codigo}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-tinta-2 font-semibold mb-1">Número</label>
                  <input
                    type="text"
                    required
                    value={form.council_number}
                    onChange={(e) => setForm({ ...form, council_number: e.target.value })}
                    className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 text-tinta font-mono"
                  />
                </div>
                <div>
                  <label className="block text-tinta-2 font-semibold mb-1">UF</label>
                  <select
                    value={form.council_uf}
                    onChange={(e) => setForm({ ...form, council_uf: e.target.value })}
                    className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 text-tinta"
                  >
                    <option value="">—</option>
                    {UFS.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>

              {form.council === 'OUTRO' && (
                <div>
                  <label className="block text-tinta-2 font-semibold mb-1">Sigla do conselho</label>
                  <input
                    type="text"
                    value={form.council_other}
                    onChange={(e) => setForm({ ...form, council_other: e.target.value })}
                    className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 text-tinta"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-tinta-2 font-semibold mb-1">Especialidade</label>
                  <input
                    type="text"
                    placeholder="Ex.: Medicina do Trabalho"
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 text-tinta"
                  />
                </div>
                <div>
                  <label className="block text-tinta-2 font-semibold mb-1">RQE (opcional)</label>
                  <input
                    type="text"
                    value={form.rqe}
                    onChange={(e) => setForm({ ...form, rqe: e.target.value })}
                    className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 text-tinta font-mono"
                  />
                  <p className="text-[10px] text-tinta-2 mt-1">
                    Registro de Qualificação de Especialista. Sai na assinatura quando preenchido.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-tinta-2 font-semibold mb-1">E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 text-tinta"
                  />
                </div>
                <div>
                  <label className="block text-tinta-2 font-semibold mb-1">Telefone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 text-tinta"
                  />
                </div>
              </div>

              {erro && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">{erro}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-borda">
                <button
                  type="button"
                  onClick={() => setModalProfissional(false)}
                  className="px-4 py-2 text-tinta-2 hover:text-tinta font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-marca-escura text-white px-4 py-2 font-bold rounded-lg hover:opacity-90"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ modal: atribuir papel */}
      {modalAtribuir && (
        <div className="fixed inset-0 bg-fundo backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-superficie border border-borda rounded-2xl max-w-[46rem] w-full p-6 space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-borda pb-3">
              <div>
                <h3 className="text-base font-bold text-tinta flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-teal-700" />
                  {definicaoDoPapel(modalAtribuir)?.nome}
                </h3>
                <p className="text-[11px] text-tinta-2 mt-1 max-w-[36rem]">
                  {definicaoDoPapel(modalAtribuir)?.baseLegal}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAtribuir(null)}
                className="text-tinta-2 hover:text-tinta text-sm font-bold"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={confirmarAtribuicao} className="space-y-4 text-xs">
              <div>
                <label className="block text-tinta-2 font-semibold mb-1">Profissional</label>
                <select
                  required
                  value={profissionalEscolhido}
                  onChange={(e) => setProfissionalEscolhido(e.target.value)}
                  className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 text-tinta"
                >
                  <option value="">Selecione</option>
                  {ativos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} — {registroDoProfissional(p)}
                    </option>
                  ))}
                </select>
                {ativos.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    Cadastre um profissional antes de atribuir.
                  </p>
                )}
              </div>

              {candidato && habilitacao && !habilitacao.apto && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">{habilitacao.motivo}</p>
                </div>
              )}

              {candidato && habilitacao?.apto && (
                <div className="bg-fundo border border-borda rounded-lg p-3">
                  <p className="text-[11px] text-tinta-2 mb-1">Sai assim no documento:</p>
                  <p className="text-xs text-tinta font-semibold">{linhaDeAssinatura(candidato)}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-tinta-2 font-semibold mb-1">Início da vigência</label>
                  <input
                    type="date"
                    required
                    value={inicio}
                    onChange={(e) => setInicio(e.target.value)}
                    className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 text-tinta"
                  />
                </div>
                <div>
                  <label className="block text-tinta-2 font-semibold mb-1">Fim (opcional)</label>
                  <input
                    type="date"
                    value={fim}
                    onChange={(e) => setFim(e.target.value)}
                    className="w-full bg-fundo border border-borda rounded-lg px-3 py-2 text-tinta"
                  />
                </div>
              </div>

              <div>
                <label className="block text-tinta-2 font-semibold mb-1">
                  Clientes em que este profissional responde por este papel
                </label>
                <p className="text-[10px] text-tinta-2 mb-2">
                  Marcar vários cria um registro por cliente. É o contrário de um responsável
                  padrão: cada vínculo fica explícito e datado.
                </p>
                <div className="max-h-[14rem] overflow-y-auto border border-borda rounded-lg divide-y divide-borda">
                  {clients.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-fundo"
                    >
                      <input
                        type="checkbox"
                        checked={clientesAlvo.includes(c.id)}
                        onChange={(e) => setClientesAlvo(
                          e.target.checked
                            ? [...clientesAlvo, c.id]
                            : clientesAlvo.filter((id) => id !== c.id)
                        )}
                        className="accent-teal-500"
                      />
                      <span className="text-xs text-tinta">
                        {c.trade_name || c.legal_name}
                        {c.id === selectedClientId && (
                          <span className="ml-2 text-[10px] text-teal-700 font-bold">atual</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-borda">
                <button
                  type="button"
                  onClick={() => setModalAtribuir(null)}
                  className="px-4 py-2 text-tinta-2 hover:text-tinta font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!candidato || !habilitacao?.apto || clientesAlvo.length === 0}
                  className="bg-marca-escura text-tinta px-4 py-2 disabled:bg-superficie-2 disabled:text-tinta font-bold rounded-lg hover:opacity-90"
                >
                  Atribuir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
