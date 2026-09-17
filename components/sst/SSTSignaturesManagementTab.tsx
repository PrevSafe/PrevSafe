'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { 
  SSTDocumentSignature, 
  DocumentSigner, 
  SSTDocumentSignatureType, 
  SSTSignatureStatus, 
  SignatureMode, 
  SignerRoleType 
} from '@/types';
import { 
  ShieldCheck, 
  FileCheck, 
  Lock, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Share2, 
  Send, 
  Eye, 
  ExternalLink, 
  PenTool, 
  QrCode, 
  KeyRound, 
  Copy, 
  Check, 
  UserCheck, 
  Calendar, 
  Building2, 
  FileText, 
  Smartphone, 
  Trash2,
  Award,
  Sparkles,
  Layers,
  HelpCircle,
  X
} from 'lucide-react';
import { SSTElectronicSignatureModal } from './SSTElectronicSignatureModal';

interface SSTSignaturesManagementTabProps {
  selectedClientId?: string;
}

export const SSTSignaturesManagementTab: React.FC<SSTSignaturesManagementTabProps> = ({ selectedClientId }) => {
  const {
    sstSignatures,
    createSSTSignatureEnvelope,
    deleteSSTSignature,
    verifySignatureIntegrity,
    clients,
    employees,
    currentProfile
  } = usePrevSafe();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [activeClientFilter, setActiveClientFilter] = useState<string>(selectedClientId || 'ALL');

  // Modals state
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [activeEnvelopeForSigning, setActiveEnvelopeForSigning] = useState<SSTDocumentSignature | null>(null);
  const [activeSignerForSigning, setActiveSignerForSigning] = useState<string | undefined>(undefined);

  const [isNewEnvelopeModalOpen, setIsNewEnvelopeModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ isValid: boolean; message: string; signature?: SSTDocumentSignature } | null>(null);

  // New Envelope Form state
  const [newDocType, setNewDocType] = useState<SSTDocumentSignatureType>('PGR');
  const [newDocTitle, setNewDocTitle] = useState('Programa de Gerenciamento de Riscos - PGR 2026');
  const [newDocNumber, setNewDocNumber] = useState(`PGR-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [newClientId, setNewClientId] = useState(clients[0]?.id || '');
  const [newExpiresDays, setNewExpiresDays] = useState(30);

  const [signersList, setSignersList] = useState<DocumentSigner[]>([
    {
      id: 'sig-tech-01',
      name: 'Eng. Eduardo Vasconcelos',
      email: '',
      phone: '(11) 98765-4321',
      cpf: '234.567.890-11',
      signer_role: 'TECHNICAL_RESPONSIBLE',
      role_type: 'TECHNICAL_RESPONSIBLE',
      role_title: 'Engenheiro de Segurança do Trabalho (CREA 201812345-D)',
      role_description: 'Engenheiro de Segurança do Trabalho (CREA 201812345-D)',
      professional_council_number: 'CREA-SP 201812345-D',
      signature_status: 'PENDING',
      signature_mode: 'DIGITAL_CERTIFICATE_ICP'
    },
    {
      id: 'sig-emp-01',
      name: 'Dr. Marcelo Silva',
      email: 'marcelo.silva@valenca.com.br',
      phone: '(24) 99876-5432',
      cpf: '123.456.789-00',
      signer_role: 'EMPLOYER_REPRESENTATIVE',
      role_type: 'EMPLOYER_REPRESENTATIVE',
      role_title: 'Diretor Administrativo / Representante Legal',
      role_description: 'Diretor Administrativo / Representante Legal',
      signature_status: 'PENDING',
      signature_mode: 'ELECTRONIC_PORTAL'
    }
  ]);

  const [newSignerName, setNewSignerName] = useState('');
  const [newSignerEmail, setNewSignerEmail] = useState('');
  const [newSignerCpf, setNewSignerCpf] = useState('');
  const [newSignerRole, setNewSignerRole] = useState<SignerRoleType>('EMPLOYEE');
  const [newSignerDesc, setNewSignerDesc] = useState('Colaborador / Testemunha');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtered envelopes
  const filteredEnvelopes = sstSignatures.filter(env => {
    const matchesClient = activeClientFilter === 'ALL' || env.client_id === activeClientFilter;
    const matchesStatus = statusFilter === 'ALL' || env.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || env.document_type === typeFilter;
    const matchesSearch = 
      env.document_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      env.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      env.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      env.signers.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.cpf.includes(searchTerm));

    return matchesClient && matchesStatus && matchesType && matchesSearch;
  });

  const handleOpenSigning = (envelope: SSTDocumentSignature, signerId?: string) => {
    setActiveEnvelopeForSigning(envelope);
    setActiveSignerForSigning(signerId);
    setIsSignModalOpen(true);
  };

  const handleAddSignerToForm = () => {
    if (!newSignerName || !newSignerCpf) {
      alert('Preencha ao menos Nome e CPF do signatário.');
      return;
    }

    const newSigner: DocumentSigner = {
      id: `sig-custom-${Date.now()}`,
      name: newSignerName,
      email: newSignerEmail || 'contato@cliente.com.br',
      cpf: newSignerCpf,
      signer_role: newSignerRole,
      role_type: newSignerRole,
      role_title: newSignerDesc,
      role_description: newSignerDesc,
      signature_status: 'PENDING',
      signature_mode: newSignerRole === 'TECHNICAL_RESPONSIBLE' ? 'DIGITAL_CERTIFICATE_ICP' : 'ELECTRONIC_PORTAL'
    };

    setSignersList(prev => [...prev, newSigner]);
    setNewSignerName('');
    setNewSignerEmail('');
    setNewSignerCpf('');
    setNewSignerDesc('');
  };

  const handleRemoveSignerFromForm = (signerId: string) => {
    setSignersList(prev => prev.filter(s => s.id !== signerId));
  };

  const handleCreateEnvelopeSubmit = () => {
    const targetClient = clients.find(c => c.id === newClientId) || clients[0];
    if (signersList.length === 0) {
      alert('Adicione pelo menos 1 signatário ao envelope.');
      return;
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + newExpiresDays);

    createSSTSignatureEnvelope({
      organization_id: currentProfile.organization_id,
      document_type: newDocType,
      document_title: newDocTitle,
      document_number: newDocNumber,
      client_id: targetClient.id,
      client_name: targetClient.trade_name,
      signers: signersList,
      expires_at: expiryDate.toISOString(),
      document_sha256: '',
      legal_framework: 'Lei Federal 14.063/2020, MP 2.200-2/2001, Portaria MTP 672/2021',
      qr_code_verification_url: '',
      status: 'PENDING'
    });

    setIsNewEnvelopeModalOpen(false);
    alert('Envelope de assinatura criado com sucesso! As notificações foram enviadas aos signatários.');
  };

  const handleExecuteVerification = () => {
    if (!verifyInput.trim()) return;
    const result = verifySignatureIntegrity(verifyInput.trim());
    setVerifyResult(result);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Metrics & Action Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden shadow-xl">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-5 h-5" />
            <span>Módulo Oficial de Assinatura Eletrônica & Aceite Digital SST</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Gestão de Envelopes & Assinaturas Digitais (Lei 14.063/2020)
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Formalize laudos técnicos (PGR, PCMSO, LTCAT), ordens de serviço (NR-01) e eventos do eSocial com 
            respaldo probatório completo, carimbo de tempo, validação por QR Code e integração ICP-Brasil.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => {
              setIsVerifyModalOpen(true);
              setVerifyResult(null);
            }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl border border-slate-700 flex items-center space-x-2 transition"
          >
            <QrCode className="w-4 h-4 text-teal-400" />
            <span>Validar Hash / QR Code</span>
          </button>

          <button
            onClick={() => setIsNewEnvelopeModalOpen(true)}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-2xl shadow-lg shadow-teal-500/20 flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Envelope de Assinatura</span>
          </button>
        </div>
      </div>

      {/* Metric Counters Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'ALL' ? 'bg-slate-900 border-teal-500 ring-1 ring-teal-500/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total de Envelopes</span>
            <Layers className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{sstSignatures.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Repositório digital ativo</div>
        </div>

        <div 
          onClick={() => setStatusFilter('PENDING')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'PENDING' ? 'bg-slate-900 border-amber-500 ring-1 ring-amber-500/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Aguardando Assinatura</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">
            {sstSignatures.filter(s => s.status === 'PENDING' || s.status === 'PARTIALLY_SIGNED').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Pendentes de cliente/RT</div>
        </div>

        <div 
          onClick={() => setStatusFilter('SIGNED')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'SIGNED' ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Concluídos / Assinados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">
            {sstSignatures.filter(s => s.status === 'SIGNED').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">100% formalizados</div>
        </div>

        <div 
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'REJECTED' ? 'bg-slate-900 border-rose-500 ring-1 ring-rose-500/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Recusados / Ajuste</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2 font-mono">
            {sstSignatures.filter(s => s.status === 'REJECTED').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Requer revisão do SESMT</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex-1 relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por documento, código, cliente, CPF ou nome do signatário..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Client Filter */}
          <select
            value={activeClientFilter}
            onChange={(e) => setActiveClientFilter(e.target.value)}
            className="bg-slate-950 text-slate-300 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">Todas as Empresas</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.trade_name}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 text-slate-300 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="PGR">PGR (NR-01)</option>
            <option value="PCMSO">PCMSO (NR-07)</option>
            <option value="LTCAT">LTCAT (INSS)</option>
            <option value="ORDEM_SERVICO">Ordem de Serviço (NR-01)</option>
            <option value="ESOCIAL_S2240">eSocial S-2240</option>
            <option value="RELATORIO_ACIDENTE_RIAA">RIAA Acidente</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 text-slate-300 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDING">Aguardando Assinatura</option>
            <option value="PARTIALLY_SIGNED">Parcialmente Assinado</option>
            <option value="SIGNED">Concluído / Assinado</option>
            <option value="REJECTED">Recusado</option>
          </select>
        </div>
      </div>

      {/* Envelopes List */}
      <div className="space-y-4">
        {filteredEnvelopes.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
            <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">Nenhum envelope de assinatura encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente ajustar os filtros de busca ou crie um novo envelope para formalização de documentos de SST.
            </p>
            <button
              onClick={() => setIsNewEnvelopeModalOpen(true)}
              className="px-4 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Envelope</span>
            </button>
          </div>
        ) : (
          filteredEnvelopes.map(envelope => {
            const isSigned = envelope.status === 'SIGNED';
            const isRejected = envelope.status === 'REJECTED';
            const isPending = envelope.status === 'PENDING' || envelope.status === 'PARTIALLY_SIGNED';
            const signedCount = envelope.signers.filter(s => s.signature_status === 'SIGNED').length;
            const totalSigners = envelope.signers.length;

            return (
              <div 
                key={envelope.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-3xl shadow-lg transition space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex-shrink-0">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-white tracking-tight">{envelope.document_title}</h3>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-950 text-teal-300 border border-slate-800 rounded-full">
                          {envelope.document_number}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isSigned ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          isRejected ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                        }`}>
                          {isSigned ? 'CONCLUÍDO / ASSINADO' : isRejected ? 'RECUSADO PELO CLIENTE' : `AGUARDANDO (${signedCount}/${totalSigners})`}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                        <span>Empresa: <strong className="text-slate-300">{envelope.client_name}</strong></span>
                        <span>• CNPJ: <strong className="font-mono text-slate-300">{clients.find(c => c.id === envelope.client_id)?.document_number}</strong></span>
                        <span>• Criado em: <strong>{new Date(envelope.created_at).toLocaleDateString('pt-BR')}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenSigning(envelope)}
                      className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-md shadow-teal-500/20"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>{isSigned ? 'Ver Certificado / Trilha' : 'Gerenciar / Assinar'}</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Deseja excluir o envelope ${envelope.document_number}?`)) {
                          deleteSSTSignature(envelope.id);
                        }
                      }}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
                      title="Excluir Envelope"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Signers Progress Line */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {envelope.signers.map(signer => {
                    const signerIsSigned = signer.signature_status === 'SIGNED';
                    const signerIsRejected = signer.signature_status === 'REJECTED';

                    return (
                      <div
                        key={signer.id}
                        onClick={() => handleOpenSigning(envelope, signer.id)}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition flex flex-col justify-between space-y-2 ${
                          signerIsSigned 
                            ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50' 
                            : signerIsRejected
                            ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                            : 'bg-slate-950 border-slate-800 hover:border-teal-500/40'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-white block">{signer.name}</span>
                            <span className="text-[11px] text-slate-400 block">{signer.role_description}</span>
                          </div>
                          {signerIsSigned ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          ) : signerIsRejected ? (
                            <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono border-t border-slate-800/80 pt-1.5 text-slate-400">
                          <span>CPF: {signer.cpf}</span>
                          <span className={signerIsSigned ? 'text-emerald-400 font-bold' : signerIsRejected ? 'text-rose-400' : 'text-amber-400'}>
                            {signerIsSigned ? 'Assinado' : signerIsRejected ? 'Recusado' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cryptographic Hash Bar & Validation Link */}
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
                    <Lock className="w-3.5 h-3.5 text-teal-400" />
                    <span className="font-bold text-slate-300">Hash SHA-256:</span>
                    <span className="font-mono text-teal-400 truncate max-w-xs">{envelope.document_sha256}</span>
                    <button
                      onClick={() => handleCopyText(envelope.document_sha256, envelope.id)}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Copiar Hash"
                    >
                      {copiedId === envelope.id ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-slate-400 text-[11px]">
                      {envelope.audit_trail.length} evento(s) na trilha de auditoria
                    </span>
                    <button
                      onClick={() => handleOpenSigning(envelope)}
                      className="text-teal-400 hover:text-teal-300 font-bold flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detalhes da Validação</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: SST Electronic Signature Dialog */}
      {isSignModalOpen && activeEnvelopeForSigning && (
        <SSTElectronicSignatureModal
          isOpen={isSignModalOpen}
          onClose={() => {
            setIsSignModalOpen(false);
            setActiveEnvelopeForSigning(null);
            setActiveSignerForSigning(undefined);
          }}
          signatureEnvelope={activeEnvelopeForSigning}
          activeSignerId={activeSignerForSigning}
          onSignComplete={() => {
            // Updated in context
          }}
        />
      )}

      {/* MODAL 2: Create New Signature Envelope */}
      {isNewEnvelopeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Criar Envelope de Assinatura Eletrônica</h2>
                  <p className="text-xs text-slate-400">Conforme Art. 10 MP 2.200-2 e Lei 14.063/2020</p>
                </div>
              </div>

              <button
                onClick={() => setIsNewEnvelopeModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* Client & Document Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Empresa Cliente: *</label>
                  <select
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-teal-500"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.trade_name} ({c.document_number})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Tipo de Documento SST: *</label>
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as SSTDocumentSignatureType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-teal-500"
                  >
                    <option value="PGR">PGR - Programa de Gerenciamento de Riscos (NR-01)</option>
                    <option value="PCMSO">PCMSO - Controle Médico de Saúde Ocupacional (NR-07)</option>
                    <option value="LTCAT">LTCAT - Laudo Técnico das Condições Ambientais</option>
                    <option value="ORDEM_SERVICO">Ordem de Serviço de Segurança (NR-01)</option>
                    <option value="ESOCIAL_S2240">eSocial S-2240 - Condições Ambientais</option>
                    <option value="FICHA_EPI">Ficha de Entrega de EPI (NR-06)</option>
                    <option value="RELATORIO_ACIDENTE_RIAA">RIAA - Investigação de Acidente</option>
                  </select>
                </div>
              </div>

              {/* Title and Code */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Título do Documento: *</label>
                  <input
                    type="text"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Número / Código do Documento: *</label>
                  <input
                    type="text"
                    value={newDocNumber}
                    onChange={(e) => setNewDocNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Signers Configuration List */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Signatários do Envelope ({signersList.length})</span>
                  <span className="text-[11px] text-slate-400">Pelo menos 1 Responsável Técnico e 1 Representante Legal</span>
                </div>

                <div className="space-y-2">
                  {signersList.map((signer, idx) => (
                    <div key={signer.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{signer.name}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                            {signer.role_type}
                          </span>
                        </div>
                        <span className="text-slate-400 block text-[11px]">{signer.role_description} • CPF: {signer.cpf}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSignerFromForm(signer.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Signer Subform */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                  <span className="font-bold text-teal-300 block text-xs">Adicionar Novo Signatário:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newSignerName}
                      onChange={(e) => setNewSignerName(e.target.value)}
                      placeholder="Nome completo..."
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                    />
                    <input
                      type="text"
                      value={newSignerCpf}
                      onChange={(e) => setNewSignerCpf(e.target.value)}
                      placeholder="CPF (000.000.000-00)..."
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-500"
                    />
                    <select
                      value={newSignerRole}
                      onChange={(e) => {
                        const r = e.target.value as SignerRoleType;
                        setNewSignerRole(r);
                        if (r === 'TECHNICAL_RESPONSIBLE') setNewSignerDesc('Responsável Técnico SST');
                        else if (r === 'EMPLOYER_REPRESENTATIVE') setNewSignerDesc('Diretor / RH');
                        else if (r === 'CIPA_REPRESENTATIVE') setNewSignerDesc('Representante CIPA');
                        else setNewSignerDesc('Colaborador / Operador');
                      }}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-teal-500"
                    >
                      <option value="TECHNICAL_RESPONSIBLE">Responsável Técnico</option>
                      <option value="EMPLOYER_REPRESENTATIVE">Empregador / RH</option>
                      <option value="EMPLOYEE">Colaborador</option>
                      <option value="CIPA_REPRESENTATIVE">Membro CIPA</option>
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddSignerToForm}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold rounded-xl text-xs flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Incluir Signatário</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsNewEnvelopeModalOpen(false)}
                className="px-4 py-2 text-slate-400 hover:text-white font-bold text-xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleCreateEnvelopeSubmit}
                className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-2xl text-xs shadow-lg shadow-teal-500/20 flex items-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar & Disparar Envelope</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Hash / QR Code Verification Dialog */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden text-slate-100">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Verificador de Autenticidade SST</h2>
                  <p className="text-xs text-slate-400">Validação criptográfica de hashes SHA-256 e selos digitais</p>
                </div>
              </div>

              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">
                  Cole o Hash SHA-256, URL de Validação ou Código do Documento:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={verifyInput}
                    onChange={(e) => setVerifyInput(e.target.value)}
                    placeholder="Ex: PGR-2026-891 ou 7f8a9e2d4c6b1a0f5e3d7c9b2a4f6e8d1c3b5a7f9e1d3c5b7a9f1e3d5c7b9a1..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={handleExecuteVerification}
                    className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition"
                  >
                    <Search className="w-4 h-4" />
                    <span>Verificar</span>
                  </button>
                </div>
              </div>

              {verifyResult && (
                <div className={`p-4 rounded-2xl border space-y-2 animate-in fade-in ${
                  verifyResult.isValid 
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                }`}>
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    {verifyResult.isValid ? (
                      <>
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <span>Documento Autêntico e Íntegro</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                        <span>Registro Não Encontrado</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">{verifyResult.message}</p>

                  {verifyResult.signature && (
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mt-2 space-y-1 text-[11px] font-mono text-slate-400">
                      <div>Documento: <strong className="text-white">{verifyResult.signature.document_title}</strong></div>
                      <div>Código: <strong className="text-teal-400">{verifyResult.signature.document_number}</strong></div>
                      <div>Empresa: <strong className="text-slate-300">{verifyResult.signature.client_name}</strong></div>
                      <div>Signatários: <strong className="text-slate-300">{verifyResult.signature.signers.length}</strong></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
