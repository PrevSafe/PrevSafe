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
import { conferirDocumento } from '@/lib/validacoesBr';
import { novoId } from '@/lib/datas';

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
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocNumber, setNewDocNumber] = useState(`PGR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [newClientId, setNewClientId] = useState(clients[0]?.id || '');
  const [newExpiresDays, setNewExpiresDays] = useState(30);

  // O envelope nasce sem assinantes: cada signatário é adicionado pelo formulário abaixo,
  // com nome e CPF reais, porque é o que fica gravado no carimbo de autenticidade.
  const [signersList, setSignersList] = useState<DocumentSigner[]>([]);

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
    if (!newSignerName) {
      alert('Informe o nome do signatário.');
      return;
    }
    // O CPF do signatario vai para o documento assinado e para a trilha de
    // auditoria. So se conferia se o campo estava preenchido.
    const confSig = conferirDocumento(newSignerCpf, 'CPF');
    if (!confSig.valido) {
      alert(`CPF do signatário: ${confSig.motivo}`);
      return;
    }

    const newSigner: DocumentSigner = {
      id: novoId('sig-custom'),
      name: newSignerName,
      // Sem e-mail de fachada: 'contato@cliente.com.br' viraria o endereco
      // registrado para onde o convite de assinatura foi enviado.
      email: newSignerEmail || '',
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
    if (!newDocTitle.trim()) {
      alert('Informe o título do documento que será assinado.');
      return;
    }

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
      <div className="bg-superficie border border-borda p-6 rounded-3xl text-tinta flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden shadow-sm">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center space-x-2 text-teal-700 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-5 h-5" />
            <span>Módulo Oficial de Assinatura Eletrônica & Aceite Digital SST</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta">
            Gestão de Envelopes & Assinaturas Digitais (Lei 14.063/2020)
          </h1>
          <p className="text-xs text-tinta-2 max-w-2xl leading-relaxed">
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
            className="px-4 py-2.5 bg-superficie-2 hover:bg-superficie-3 text-tinta text-xs font-bold rounded-2xl border border-borda flex items-center space-x-2 transition"
          >
            <QrCode className="w-4 h-4 text-teal-700" />
            <span>Validar Hash / QR Code</span>
          </button>

          <button
            onClick={() => setIsNewEnvelopeModalOpen(true)}
            className="bg-marca-escura text-white px-5 py-2.5 text-xs font-bold rounded-2xl shadow-sm flex items-center space-x-2 transition hover:opacity-90"
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
            statusFilter === 'ALL' ? 'bg-superficie border-teal-200 ring-1 ring-teal-500/30' : 'bg-superficie border-borda hover:border-borda'
          }`}
        >
          <div className="flex items-center justify-between text-tinta-2 text-xs font-semibold">
            <span>Total de Envelopes</span>
            <Layers className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-2xl font-bold text-tinta mt-2 font-mono">{sstSignatures.length}</div>
          <div className="text-[11px] text-tinta-2 mt-0.5">Repositório digital ativo</div>
        </div>

        <div 
          onClick={() => setStatusFilter('PENDING')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'PENDING' ? 'bg-superficie border-amber-200 ring-1 ring-amber-500/30' : 'bg-superficie border-borda hover:border-borda'
          }`}
        >
          <div className="flex items-center justify-between text-tinta-2 text-xs font-semibold">
            <span>Aguardando Assinatura</span>
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2 font-mono">
            {sstSignatures.filter(s => s.status === 'PENDING' || s.status === 'PARTIALLY_SIGNED').length}
          </div>
          <div className="text-[11px] text-tinta-2 mt-0.5">Pendentes de cliente/RT</div>
        </div>

        <div 
          onClick={() => setStatusFilter('SIGNED')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'SIGNED' ? 'bg-superficie border-borda ring-1 ring-marca-escura' : 'bg-superficie border-borda hover:border-borda'
          }`}
        >
          <div className="flex items-center justify-between text-tinta-2 text-xs font-semibold">
            <span>Concluídos / Assinados</span>
            <CheckCircle2 className="w-4 h-4 text-marca-escura" />
          </div>
          <div className="text-2xl font-bold text-marca-escura mt-2 font-mono">
            {sstSignatures.filter(s => s.status === 'SIGNED').length}
          </div>
          <div className="text-[11px] text-tinta-2 mt-0.5">100% formalizados</div>
        </div>

        <div 
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'REJECTED' ? 'bg-superficie border-rose-200 ring-1 ring-rose-500/30' : 'bg-superficie border-borda hover:border-borda'
          }`}
        >
          <div className="flex items-center justify-between text-tinta-2 text-xs font-semibold">
            <span>Recusados / Ajuste</span>
            <AlertTriangle className="w-4 h-4 text-rose-700" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2 font-mono">
            {sstSignatures.filter(s => s.status === 'REJECTED').length}
          </div>
          <div className="text-[11px] text-tinta-2 mt-0.5">Requer revisão do SESMT</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-superficie p-4 rounded-2xl border border-borda flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex-1 relative w-full">
          <Search className="w-4 h-4 text-tinta-2 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por documento, código, cliente, CPF ou nome do signatário..."
            className="w-full bg-fundo border border-borda rounded-xl pl-10 pr-4 py-2 text-tinta placeholder-tinta-3 focus:outline-none focus:border-teal-500 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Client Filter */}
          <select
            value={activeClientFilter}
            onChange={(e) => setActiveClientFilter(e.target.value)}
            className="bg-fundo text-tinta border border-borda rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-teal-500"
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
            className="bg-fundo text-tinta border border-borda rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-teal-500"
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
            className="bg-fundo text-tinta border border-borda rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-teal-500"
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
          <div className="bg-superficie border border-borda rounded-3xl p-12 text-center space-y-3">
            <ShieldCheck className="w-12 h-12 text-tinta-2 mx-auto" />
            <h3 className="text-base font-bold text-tinta">Nenhum envelope de assinatura encontrado</h3>
            <p className="text-xs text-tinta-2 max-w-sm mx-auto">
              Tente ajustar os filtros de busca ou crie um novo envelope para formalização de documentos de SST.
            </p>
            <button
              onClick={() => setIsNewEnvelopeModalOpen(true)}
              className="bg-marca-escura text-white px-4 py-2 font-bold rounded-xl text-xs inline-flex items-center space-x-1.5"
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
                className="bg-superficie border border-borda hover:border-borda p-5 rounded-3xl shadow-sm transition space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-borda pb-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-800 flex-shrink-0">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-tinta tracking-tight">{envelope.document_title}</h3>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-fundo text-teal-700 border border-borda rounded-full">
                          {envelope.document_number}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isSigned ? 'bg-marca-suave text-marca-escura border-marca-borda' :
                          isRejected ? 'bg-rose-500/10 text-rose-700 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-800 border-amber-500/20 animate-pulse'
                        }`}>
                          {isSigned ? 'CONCLUÍDO / ASSINADO' : isRejected ? 'RECUSADO PELO CLIENTE' : `AGUARDANDO (${signedCount}/${totalSigners})`}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tinta-2 mt-1">
                        <span>Empresa: <strong className="text-tinta">{envelope.client_name}</strong></span>
                        <span>• CNPJ: <strong className="font-mono text-tinta">{clients.find(c => c.id === envelope.client_id)?.document_number}</strong></span>
                        <span>• Criado em: <strong>{new Date(envelope.created_at).toLocaleDateString('pt-BR')}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenSigning(envelope)}
                      className="bg-marca-escura text-white px-4 py-2 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-sm hover:opacity-90"
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
                      className="p-2 text-tinta-2 hover:text-rose-700 hover:bg-superficie-2 rounded-xl transition"
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
                            ? 'bg-marca-suave border-marca-borda hover:border-marca-borda' 
                            : signerIsRejected
                            ? 'bg-rose-50 border-rose-200 hover:border-rose-500/50'
                            : 'bg-fundo border-borda hover:border-teal-500/40'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-tinta block">{signer.name}</span>
                            <span className="text-[11px] text-tinta-2 block">{signer.role_description}</span>
                          </div>
                          {signerIsSigned ? (
                            <CheckCircle2 className="w-4 h-4 text-marca-escura flex-shrink-0" />
                          ) : signerIsRejected ? (
                            <XCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-700 flex-shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono border-t border-borda pt-1.5 text-tinta-2">
                          <span>CPF: {signer.cpf}</span>
                          <span className={signerIsSigned ? 'text-marca-escura font-bold' : signerIsRejected ? 'text-rose-700' : 'text-amber-700'}>
                            {signerIsSigned ? 'Assinado' : signerIsRejected ? 'Recusado' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cryptographic Hash Bar & Validation Link */}
                <div className="bg-fundo p-3 rounded-2xl border border-borda flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-tinta-2 text-[11px]">
                    <Lock className="w-3.5 h-3.5 text-teal-700" />
                    <span className="font-bold text-tinta">Hash SHA-256:</span>
                    <span className="font-mono text-teal-700 truncate max-w-xs">{envelope.document_sha256}</span>
                    <button
                      onClick={() => handleCopyText(envelope.document_sha256, envelope.id)}
                      className="p-1 text-tinta-2 hover:text-tinta"
                      title="Copiar Hash"
                    >
                      {copiedId === envelope.id ? <Check className="w-3 h-3 text-teal-700" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-tinta-2 text-[11px]">
                      {envelope.audit_trail.length} evento(s) na trilha de auditoria
                    </span>
                    <button
                      onClick={() => handleOpenSigning(envelope)}
                      className="text-teal-700 hover:text-teal-700 font-bold flex items-center space-x-1"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fundo backdrop-blur-sm overflow-y-auto">
          <div className="bg-superficie border border-borda rounded-3xl shadow-sm w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-tinta">
            <div className="bg-fundo px-6 py-4 border-b border-borda flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-800">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-tinta">Criar Envelope de Assinatura Eletrônica</h2>
                  <p className="text-xs text-tinta-2">Conforme Art. 10 MP 2.200-2 e Lei 14.063/2020</p>
                </div>
              </div>

              <button
                onClick={() => setIsNewEnvelopeModalOpen(false)}
                className="p-2 rounded-xl text-tinta-2 hover:text-tinta hover:bg-superficie-2 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* Client & Document Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-tinta-2 font-bold block mb-1">Empresa Cliente: *</label>
                  <select
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="w-full bg-fundo border border-borda rounded-xl px-3 py-2 text-tinta font-bold focus:outline-none focus:border-teal-500"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.trade_name} ({c.document_number})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-tinta-2 font-bold block mb-1">Tipo de Documento SST: *</label>
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as SSTDocumentSignatureType)}
                    className="w-full bg-fundo border border-borda rounded-xl px-3 py-2 text-tinta font-bold focus:outline-none focus:border-teal-500"
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
                  <label className="text-tinta-2 font-bold block mb-1">Título do Documento: *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: Programa de Gerenciamento de Riscos - PGR 2026"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    className="w-full bg-fundo border border-borda rounded-xl px-3 py-2 text-tinta focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-tinta-2 font-bold block mb-1">Número / Código do Documento: *</label>
                  <input
                    type="text"
                    value={newDocNumber}
                    onChange={(e) => setNewDocNumber(e.target.value)}
                    className="w-full bg-fundo border border-borda rounded-xl px-3 py-2 text-tinta font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Signers Configuration List */}
              <div className="space-y-3 pt-2 border-t border-borda">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-tinta text-sm">Signatários do Envelope ({signersList.length})</span>
                  <span className="text-[11px] text-tinta-2">Pelo menos 1 Responsável Técnico e 1 Representante Legal</span>
                </div>

                <div className="space-y-2">
                  {signersList.map((signer, idx) => (
                    <div key={signer.id} className="bg-fundo p-3 rounded-2xl border border-borda flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-tinta">{signer.name}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-teal-500/10 text-teal-800 border border-teal-500/20">
                            {signer.role_type}
                          </span>
                        </div>
                        <span className="text-tinta-2 block text-[11px]">{signer.role_description} • CPF: {signer.cpf}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSignerFromForm(signer.id)}
                        className="p-1.5 text-tinta-2 hover:text-rose-700 hover:bg-superficie rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Signer Subform */}
                <div className="bg-fundo p-4 rounded-2xl border border-borda space-y-3">
                  <span className="font-bold text-teal-700 block text-xs">Adicionar Novo Signatário:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newSignerName}
                      onChange={(e) => setNewSignerName(e.target.value)}
                      placeholder="Nome completo..."
                      className="bg-superficie border border-borda rounded-xl px-3 py-2 text-tinta focus:outline-none focus:border-teal-500"
                    />
                    <input
                      type="text"
                      value={newSignerCpf}
                      onChange={(e) => setNewSignerCpf(e.target.value)}
                      placeholder="CPF (000.000.000-00)..."
                      className="bg-superficie border border-borda rounded-xl px-3 py-2 text-tinta font-mono focus:outline-none focus:border-teal-500"
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
                      className="bg-superficie border border-borda rounded-xl px-3 py-2 text-tinta font-bold focus:outline-none focus:border-teal-500"
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
                      className="px-3.5 py-1.5 bg-superficie-2 hover:bg-superficie-3 text-teal-700 font-bold rounded-xl text-xs flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Incluir Signatário</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-fundo px-6 py-4 border-t border-borda flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsNewEnvelopeModalOpen(false)}
                className="px-4 py-2 text-tinta-2 hover:text-tinta font-bold text-xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleCreateEnvelopeSubmit}
                className="bg-marca-escura text-white px-6 py-2.5 font-bold rounded-2xl text-xs shadow-sm flex items-center space-x-2 hover:opacity-90"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fundo backdrop-blur-sm overflow-y-auto">
          <div className="bg-superficie border border-borda rounded-3xl shadow-sm w-full max-w-2xl overflow-hidden text-tinta">
            <div className="bg-fundo px-6 py-4 border-b border-borda flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-800">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-tinta">Verificador de Autenticidade SST</h2>
                  <p className="text-xs text-tinta-2">Validação criptográfica de hashes SHA-256 e selos digitais</p>
                </div>
              </div>

              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="p-2 rounded-xl text-tinta-2 hover:text-tinta hover:bg-superficie-2 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-tinta-2 font-bold block mb-1">
                  Cole o Hash SHA-256, URL de Validação ou Código do Documento:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={verifyInput}
                    onChange={(e) => setVerifyInput(e.target.value)}
                    placeholder="Ex: PGR-2026-891 ou 7f8a9e2d4c6b1a0f5e3d7c9b2a4f6e8d1c3b5a7f9e1d3c5b7a9f1e3d5c7b9a1..."
                    className="flex-1 bg-fundo border border-borda rounded-xl px-3 py-2.5 text-tinta font-mono text-xs focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={handleExecuteVerification}
                    className="bg-marca-escura text-white px-5 py-2.5 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition hover:opacity-90"
                  >
                    <Search className="w-4 h-4" />
                    <span>Verificar</span>
                  </button>
                </div>
              </div>

              {verifyResult && (
                <div className={`p-4 rounded-2xl border space-y-2 animate-in fade-in ${
                  verifyResult.isValid 
                    ? 'bg-marca-suave border-marca-borda text-marca-escura' 
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    {verifyResult.isValid ? (
                      <>
                        <ShieldCheck className="w-5 h-5 text-marca-escura" />
                        <span>Documento Autêntico e Íntegro</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 text-rose-700" />
                        <span>Registro Não Encontrado</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-tinta">{verifyResult.message}</p>

                  {verifyResult.signature && (
                    <div className="bg-fundo p-3 rounded-xl border border-borda mt-2 space-y-1 text-[11px] font-mono text-tinta-2">
                      <div>Documento: <strong className="text-tinta">{verifyResult.signature.document_title}</strong></div>
                      <div>Código: <strong className="text-teal-700">{verifyResult.signature.document_number}</strong></div>
                      <div>Empresa: <strong className="text-tinta">{verifyResult.signature.client_name}</strong></div>
                      <div>Signatários: <strong className="text-tinta">{verifyResult.signature.signers.length}</strong></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-fundo px-6 py-4 border-t border-borda flex justify-end">
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="px-5 py-2 bg-superficie-2 hover:bg-superficie-3 text-tinta font-bold rounded-xl text-xs"
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
