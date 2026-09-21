'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { Contract } from '@/types';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import { montarTermosDoContrato, resumirServicos } from '@/lib/contratoTermos';
import { exportContractPdf } from '@/lib/pdfExportService';
import { 
  FileSignature, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar, 
  DollarSign, 
  Building2, 
  Eye, 
  Sparkles, 
  ArrowRight,
  Lock,
  Download,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ContractsView: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { 
    contracts = [], 
    clients = [], 
    proposals = [], 
    createManualContract,
    updateContract,
    deleteContract,
    signContract, 
    createContractFromProposal,
    serviceOrders = [], 
    organization,
    currentProfile 
  } = usePrevSafe();

  const [selectedContract, setSelectedContract] = useState<Contract | null>(contracts?.[0] || null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showNewContractModal, setShowNewContractModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deletingContract, setDeletingContract] = useState<Contract | null>(null);

  // Digital signature form
  const [signerName, setSignerName] = useState(currentProfile?.full_name || '');
  const [signerRole, setSignerRole] = useState('Diretor de Operações / RH');
  const [signerCpf, setSignerCpf] = useState('');

  // Contract form state
  // Propostas aceitas que ainda nao viraram contrato. E a partir delas que um
  // contrato deve nascer; criar do zero e a excecao.
  const propostasAceitasSemContrato = React.useMemo(
    () => proposals.filter(
      p => p.status === 'APPROVED' && !contracts.some(c => c.proposal_id === p.id)
    ),
    [proposals, contracts]
  );

  const [contractForm, setContractForm] = useState(() => ({
    client_id: '',
    proposal_id: '',
    title: 'Contrato de Prestação de Serviços SST',
    total_value: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    services_summary: '',
    terms: ''
  }));

  // `proposta` opcional: quando vem, o formulario abre com os dados dela. Antes
  // abria sempre com o primeiro cliente da lista, titulo "...SST 2026" e valor
  // fixo de R$ 12.000 - nada disso tinha relacao com a proposta aceita.
  const handleOpenNewContract = (proposta?: typeof proposals[number]) => {
    const inicio = new Date().toISOString().split('T')[0];
    const fim = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
    const alvo = proposta || propostasAceitasSemContrato[0];
    const client = alvo ? clients.find(c => c.id === alvo.client_id) : null;

    setContractForm({
      client_id: alvo?.client_id || '',
      proposal_id: alvo?.id || '',
      title: alvo
        ? `Contrato de Prestação de Serviços SST - ${alvo.title}`
        : 'Contrato de Prestação de Serviços SST',
      total_value: alvo?.total || 0,
      start_date: inicio,
      end_date: fim,
      services_summary: alvo ? resumirServicos(alvo) : '',
      terms: montarTermosDoContrato({
        client,
        organization,
        proposal: alvo || null,
        valorTotal: alvo?.total,
        inicioVigencia: inicio,
        fimVigencia: fim,
        recorrencia: 'ANNUAL',
      }),
    });
    setShowNewContractModal(true);
  };

  // Gera o contrato direto da proposta aceita, sem passar pelo formulario.
  const handleGerarDaProposta = (proposta: typeof proposals[number]) => {
    try {
      const criado = createContractFromProposal(proposta.id);
      setSelectedContract(criado);
    } catch (err: any) {
      alert(err?.message || 'Não foi possível gerar o contrato.');
    }
  };

  const handleOpenEditContract = (c: Contract) => {
    setEditingContract(c);
    const client = clients.find(cl => cl.id === c.client_id) || null;
    setContractForm({
      client_id: c.client_id,
      proposal_id: c.proposal_id || '',
      title: c.title,
      total_value: c.total_value,
      start_date: c.start_date.split('T')[0],
      end_date: c.end_date.split('T')[0],
      services_summary: c.services_summary || '',
      // Contratos criados antes deste campo existir nao tem minuta gravada:
      // geramos a padrao ja preenchida em vez de abrir o campo vazio.
      terms: c.terms || montarTermosDoContrato({
        client,
        organization,
        proposal: proposals.find(pr => pr.id === c.proposal_id) || null,
        valorTotal: c.total_value,
        inicioVigencia: c.start_date,
        fimVigencia: c.end_date,
        recorrencia: c.recurrence,
      }),
    });
  };

  const handleSaveContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractForm.client_id || !contractForm.title) {
      alert('Preencha os campos obrigatórios do contrato.');
      return;
    }

    if (editingContract) {
      updateContract(editingContract.id, {
        client_id: contractForm.client_id,
        title: contractForm.title,
        total_value: Number(contractForm.total_value) || 0,
        start_date: new Date(contractForm.start_date).toISOString(),
        end_date: new Date(contractForm.end_date).toISOString(),
        // Faltava: o que fosse digitado em Termos e Condicoes era descartado.
        terms: contractForm.terms,
        services_summary: contractForm.services_summary
      });
      setEditingContract(null);
    } else {
      const created = createManualContract({
        client_id: contractForm.client_id,
        proposal_id: contractForm.proposal_id || undefined,
        title: contractForm.title,
        total_value: Number(contractForm.total_value) || 0,
        recurrence: 'ANNUAL',
        start_date: new Date(contractForm.start_date).toISOString(),
        end_date: new Date(contractForm.end_date).toISOString(),
        services_summary: contractForm.services_summary,
        terms: contractForm.terms
      });
      setSelectedContract(created);
      setShowNewContractModal(false);
    }
  };

  const handleDeleteContractConfirm = () => {
    if (!deletingContract) return;
    deleteContract(deletingContract.id);
    setDeletingContract(null);
    const remaining = contracts.filter(c => c.id !== deletingContract.id);
    setSelectedContract(remaining[0] || null);
  };

  const handleSignContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;

    // RN002: Assinatura de contrato ativa e gera automaticamente a Ordem de Serviço
    signContract(selectedContract.id, signerName, `${signerName.toLowerCase().replace(/\s+/g, '.')}@empresa.com`, signerCpf);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    setShowSignModal(false);

    alert(`✅ Contrato ${selectedContract.contract_number} assinado digitalmente com sucesso!\n\n📋 Ordem de Serviço gerada automaticamente com 15 etapas e tarefas técnicas (RN002)!`);
    onNavigate('service-orders');
  };

  return (
    <div id="contracts-view-container" className="space-y-6 pb-12">
      {/* Header Bento Card */}
      <div id="contracts-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Contratos & Assinaturas Digitais</h1>
            <p className="text-xs text-slate-400 mt-0.5">Gestão de vigência jurídica, assinaturas com hash SHA-256 e disparo automático de OS (RN002).</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            id="btn-new-contract"
            onClick={() => handleOpenNewContract()}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Contrato</span>
          </button>
        </div>
      </div>

      {propostasAceitasSemContrato.length > 0 && (
        <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-3xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-300 shrink-0" />
            <span className="text-sm font-bold text-indigo-200">
              {propostasAceitasSemContrato.length === 1
                ? 'Uma proposta aceita ainda sem contrato'
                : `${propostasAceitasSemContrato.length} propostas aceitas ainda sem contrato`}
            </span>
          </div>
          <div className="space-y-2">
            {propostasAceitasSemContrato.map(prop => {
              const client = clients.find(c => c.id === prop.client_id);
              return (
                <div
                  key={prop.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100 truncate">{prop.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {prop.proposal_number} · {client?.trade_name || client?.legal_name || 'Cliente'} ·{' '}
                      <span className="font-mono text-emerald-400">{formatCurrency(prop.total)}</span>
                      {prop.items?.length ? ` · ${prop.items.length} serviço(s)` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenNewContract(prop)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
                      title="Abrir o formulário já preenchido com os dados desta proposta"
                    >
                      Revisar antes
                    </button>
                    <button
                      onClick={() => handleGerarDaProposta(prop)}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <span>Gerar contrato</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Split in Bento Grid style */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Contract List */}
        <div id="contracts-list" className="lg:col-span-5 space-y-3">
          {contracts.map((contract) => {
            const client = clients.find(c => c.id === contract.client_id);
            const isSelected = selectedContract?.id === contract.id;
            const isSigned = contract.status === 'ACTIVE' || contract.status === 'SIGNED';

            return (
              <div
                id={`contract-card-${contract.id}`}
                key={contract.id}
                onClick={() => setSelectedContract(contract)}
                className={`p-5 rounded-3xl border cursor-pointer transition flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40' 
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-200">{contract.contract_number}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isSigned ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {isSigned ? 'ATIVO / VIGENTE' : 'AGUARDANDO ASSINATURA'}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-100 mt-2">{client?.trade_name}</div>
                    <div className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{contract.title}</div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-sm font-bold text-emerald-400 block">
                      R$ {contract.total_value.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Término: {formatDate(contract.end_date)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Contract Details Bento Card */}
        {selectedContract ? (
          <div id="contract-detail-pane" className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center space-x-2 font-mono text-xs text-slate-400">
                    <FileSignature className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-slate-200">{selectedContract.contract_number}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">{selectedContract.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Contratante: <strong className="text-slate-200">{clients.find(c => c.id === selectedContract.client_id)?.legal_name}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEditContract(selectedContract)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center space-x-1"
                    title="Editar Contrato"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => setDeletingContract(selectedContract)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold border border-rose-500/20 transition"
                    title="Excluir Contrato"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    (selectedContract.status === 'ACTIVE' || selectedContract.status === 'SIGNED')
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {(selectedContract.status === 'ACTIVE' || selectedContract.status === 'SIGNED') ? 'Assinado e Válido' : 'Pendente de Assinatura'}
                  </span>
                </div>
              </div>

              {/* Contract Cláusulas & Resumo Jurídico */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Cláusulas e Termos SST</span>
                  {selectedContract.proposal_id && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
                      {proposals.find(pr => pr.id === selectedContract.proposal_id)?.proposal_number || 'Proposta vinculada'}
                    </span>
                  )}
                </div>
                {/* A minuta deste contrato. Antes eram tres paragrafos fixos,
                    identicos em todos os contratos e sem ligacao nenhuma com o
                    que fosse escrito no campo Termos e Condicoes. */}
                <div className="p-4 bg-slate-950/60 border border-slate-800/90 rounded-2xl text-xs text-slate-300 leading-relaxed max-h-72 overflow-y-auto">
                  {selectedContract.terms ? (
                    <pre className="whitespace-pre-wrap break-words font-sans">{selectedContract.terms}</pre>
                  ) : (
                    <p className="text-slate-500">
                      Este contrato foi criado antes da minuta padrão existir. Clique em Editar para gerar as cláusulas já preenchidas com os dados do cliente e revisá-las.
                    </p>
                  )}
                </div>
              </div>

              {/* Financial and Dates Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Valor Total Contratado</span>
                  <span className="font-mono font-bold text-emerald-400 text-base mt-0.5 block">
                    R$ {selectedContract.total_value.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Início da Vigência</span>
                  <span className="font-mono font-semibold text-slate-200 mt-0.5 block">
                    {formatDate(selectedContract.start_date)}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Término da Vigência</span>
                  <span className="font-mono font-semibold text-slate-200 mt-0.5 block">
                    {formatDate(selectedContract.end_date)}
                  </span>
                </div>
              </div>

              {/* Digital Signature Box */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-300 flex items-center">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 mr-1.5" /> Assinatura Eletrônica Certificada
                  </span>
                  {(selectedContract.status === 'ACTIVE' || selectedContract.status === 'SIGNED') ? (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                      VALIDADO JURIDICAMENTE
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                      PENDENTE
                    </span>
                  )}
                </div>

                {(selectedContract.status === 'ACTIVE' || selectedContract.status === 'SIGNED') && selectedContract.signatures && selectedContract.signatures.length > 0 ? (
                  <div className="text-xs text-slate-300 space-y-1 pt-1 font-mono">
                    <div>Assinado por: <strong className="text-white">{selectedContract.signatures[0].signer_name}</strong></div>
                    <div>Data/Hora: {formatDateTime(selectedContract.signatures[0].signed_at)}</div>
                    <div className="text-[10px] text-slate-500 break-all">
                      Hash SHA-256: {selectedContract.signatures[0].signature_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Este contrato aguarda a coleta da assinatura eletrônica do cliente.
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800/80 flex justify-between items-center">
              <button
                onClick={() => {
                  try {
                    exportContractPdf({
                      contract: selectedContract,
                      client: clients.find(c => c.id === selectedContract.client_id) || null,
                      organization,
                      proposal: proposals.find(pr => pr.id === selectedContract.proposal_id) || null,
                    });
                  } catch (err: any) {
                    alert(`Nao foi possivel gerar o PDF.\n\n${err?.message || 'Erro desconhecido'}`);
                  }
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 border border-slate-700"
                title={
                  (selectedContract.status === 'ACTIVE' || selectedContract.status === 'SIGNED')
                    ? 'Baixar o contrato assinado, com os dados e o hash da assinatura'
                    : 'Baixar a minuta para revisao e assinatura'
                }
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {(selectedContract.status === 'ACTIVE' || selectedContract.status === 'SIGNED')
                    ? 'Baixar contrato assinado (PDF)'
                    : 'Baixar minuta (PDF)'}
                </span>
              </button>

              {!(selectedContract.status === 'ACTIVE' || selectedContract.status === 'SIGNED') ? (
                <button
                  id="btn-sign-contract"
                  onClick={() => setShowSignModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition flex items-center space-x-1.5"
                >
                  <FileSignature className="w-4 h-4" />
                  <span>Assinar Digitalmente (Disparar OS - RN002)</span>
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('service-orders')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center space-x-1.5"
                >
                  <span>Ver Ordens de Serviço deste Contrato</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* New / Edit Contract Modal */}
      {(showNewContractModal || editingContract) && (
        <div id="modal-contract-form" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingContract ? 'Editar Contrato SST' : 'Novo Contrato Comercial SST'}
              </h3>
              <button 
                onClick={() => {
                  setShowNewContractModal(false);
                  setEditingContract(null);
                }} 
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveContract} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Cliente Contratante *</label>
                <select
                  value={contractForm.client_id}
                  onChange={(e) => setContractForm({ ...contractForm, client_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.trade_name} ({c.document_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Título do Contrato *</label>
                <input
                  type="text"
                  required
                  value={contractForm.title}
                  onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    value={contractForm.total_value}
                    onChange={(e) => setContractForm({ ...contractForm, total_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Início da Vigência</label>
                  <input
                    type="date"
                    value={contractForm.start_date}
                    onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Término da Vigência</label>
                  <input
                    type="date"
                    value={contractForm.end_date}
                    onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block font-semibold text-slate-300">Termos e Condições (minuta do contrato)</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (contractForm.terms && !confirm('Substituir a minuta atual pela padrão? O texto editado será perdido.')) return;
                      setContractForm(f => ({
                        ...f,
                        terms: montarTermosDoContrato({
                          client: clients.find(c => c.id === f.client_id) || null,
                          organization,
                          proposal: proposals.find(pr => pr.id === f.proposal_id) || null,
                          valorTotal: Number(f.total_value) || 0,
                          inicioVigencia: f.start_date,
                          fimVigencia: f.end_date,
                          recorrencia: 'ANNUAL',
                        }),
                      }));
                    }}
                    className="text-[11px] text-indigo-300 hover:text-indigo-200 font-semibold shrink-0"
                  >
                    Regerar minuta padrão
                  </button>
                </div>
                <textarea
                  rows={16}
                  value={contractForm.terms}
                  onChange={(e) => setContractForm({ ...contractForm, terms: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-white font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Minuta padrão: revise com assessoria jurídica e preencha os campos entre colchetes antes de enviar para assinatura.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewContractModal(false);
                    setEditingContract(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md"
                >
                  {editingContract ? 'Atualizar Contrato' : 'Salvar Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Contract Modal */}
      {deletingContract && (
        <div id="modal-delete-contract" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/20 text-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Contrato</h3>
                <p className="text-xs text-slate-400">Esta ação removerá o contrato do sistema.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Tem certeza de que deseja remover o contrato <strong className="text-white">{deletingContract.contract_number}</strong> ({deletingContract.title})?
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingContract(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteContractConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Simulator Modal */}
      {showSignModal && selectedContract && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Assinar Contrato Digitalmente (RN002)</h3>
              </div>
              <button onClick={() => setShowSignModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              A assinatura com certificado gera o hash SHA-256 e dispara a criação automática da <strong>Ordem de Serviço (OS)</strong> com tarefas técnicas.
            </p>

            <form onSubmit={handleSignContract} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nome do Signatário *</label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Cargo / Papel</label>
                <input
                  type="text"
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">CPF do Signatário</label>
                <input
                  type="text"
                  value={signerCpf}
                  onChange={(e) => setSignerCpf(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300">
                🔒 Certificação eletrônica em conformidade com MP 2.200-2/2001 e Portaria MTE.
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSignModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Confirmar & Assinar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
