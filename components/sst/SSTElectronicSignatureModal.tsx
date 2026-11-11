'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { getClientIp } from '@/lib/clientIp';
import { 
  SSTDocumentSignature, 
  DocumentSigner, 
  SignatureMode, 
  SignerRoleType,
  SSTDocumentSignatureType 
} from '@/types';
import { 
  X, 
  ShieldCheck, 
  FileCheck, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  KeyRound, 
  PenTool, 
  QrCode, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  UserCheck, 
  Calendar, 
  Smartphone, 
  RefreshCw, 
  Eye, 
  XCircle,
  HelpCircle,
  Building2,
  Stethoscope,
  Award
} from 'lucide-react';

interface SSTElectronicSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  signatureEnvelope: SSTDocumentSignature;
  activeSignerId?: string; // Signer who is currently taking action
  onSignComplete?: () => void;
}

export const SSTElectronicSignatureModal: React.FC<SSTElectronicSignatureModalProps> = ({
  isOpen,
  onClose,
  signatureEnvelope,
  activeSignerId,
  onSignComplete
}) => {
  const { signSSTDocument, rejectSSTDocument, currentProfile, clients, organization } = usePrevSafe();

  // Find the signer taking action or default to first pending
  const defaultSigner = activeSignerId 
    ? signatureEnvelope.signers.find(s => s.id === activeSignerId)
    : signatureEnvelope.signers.find(s => s.signature_status === 'PENDING') || signatureEnvelope.signers[0];

  const [selectedSignerId, setSelectedSignerId] = useState<string>(defaultSigner?.id || signatureEnvelope.signers[0]?.id || '');
  const [activeStep, setActiveStep] = useState<'REVIEW' | 'SIGN' | 'REJECT' | 'SUCCESS'>('REVIEW');
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('ELECTRONIC_PORTAL');

  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('748291');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(60);

  // Selecao de certificado apenas na tela: nenhum certificado e lido ou usado
  // para assinar. A assinatura gravada e eletronica simples.
  const [selectedCert, setSelectedCert] = useState('CERT_ICP_A1');
  const [certPin, setCertPin] = useState('');

  // Canvas drawing rubric
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Compliance terms agreement checkbox
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentSigner = signatureEnvelope.signers.find(s => s.id === selectedSignerId) || defaultSigner;

  // Handle OTP countdown timer
  useEffect(() => {
    let timer: any;
    if (isOtpSent && otpCountdown > 0) {
      timer = setInterval(() => setOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpSent, otpCountdown]);

  // Handle canvas initialization
  useEffect(() => {
    if (activeStep === 'SIGN' && signatureMode === 'BIOMETRIC_DRAW' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [activeStep, signatureMode]);

  if (!isOpen || !signatureEnvelope) return null;

  const handleSendOtp = () => {
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(randomOtp);
    setIsOtpSent(true);
    setOtpCountdown(60);
    // Auto fill for seamless testing preview
    setOtpCode(randomOtp);
  };

  // Canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirmSignature = async () => {
    if (!currentSigner) return;
    if (!acceptedTerms) {
      alert('É necessário concordar com os termos de validade jurídica (Lei 14.063/2020).');
      return;
    }

    if (signatureMode === 'ELECTRONIC_PORTAL' && otpCode !== generatedOtp) {
      alert('Código de segurança OTP inválido.');
      return;
    }

    if (signatureMode === 'BIOMETRIC_DRAW' && !hasDrawn) {
      alert('Por favor, desenhe sua assinatura no quadro.');
      return;
    }

    setIsSubmitting(true);

    let signatureImageUrl: string | undefined;
    if (signatureMode === 'BIOMETRIC_DRAW' && canvasRef.current) {
      signatureImageUrl = canvasRef.current.toDataURL();
    }

    // O IP faz parte do carimbo de autenticidade do documento assinado, entao
    // e buscado do servidor antes de registrar a assinatura.
    const signerIp = await getClientIp();

    setTimeout(() => {
      const success = signSSTDocument(signatureEnvelope.id, currentSigner.id, {
        signature_mode: signatureMode,
        signature_image_url: signatureImageUrl,
        compliance_statement: `Aceite digital emitido e assinado eletronicamente sob a égide da Lei Federal 14.063/2020 e MP 2.200-2/2001 por ${currentSigner.name} (${currentSigner.cpf}).`,
        ip_address: signerIp,
        security_auth_code: signatureMode === 'ELECTRONIC_PORTAL' ? `OTP-${otpCode}` : `ICP-AUTH-${Date.now().toString().slice(-6)}`
      });

      setIsSubmitting(false);
      if (success) {
        setActiveStep('SUCCESS');
        if (onSignComplete) onSignComplete();
      } else {
        alert('Erro ao processar assinatura.');
      }
    }, 600);
  };

  const handleConfirmRejection = () => {
    if (!currentSigner) return;
    if (!rejectionReason.trim()) {
      alert('Por favor, descreva o motivo da recusa ou inconformidade para que o SESMT/Técnico possa revisar.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const success = rejectSSTDocument(signatureEnvelope.id, currentSigner.id, rejectionReason);
      setIsSubmitting(false);
      if (success) {
        alert('Recusa registrada no histórico de auditoria do documento.');
        onClose();
        if (onSignComplete) onSignComplete();
      }
    }, 400);
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(signatureEnvelope.document_sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(signatureEnvelope.qr_code_verification_url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fundo backdrop-blur-sm overflow-y-auto">
      <div className="bg-superficie border border-borda rounded-3xl shadow-sm w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-tinta animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="bg-fundo px-6 py-4 border-b border-borda flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-800">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-tinta tracking-tight">
                  Assinatura Eletrônica & Aceite Digital SST
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-800 border border-teal-500/20">
                  Lei 14.063/2020
                </span>
              </div>
              <p className="text-xs text-tinta-2">
                {signatureEnvelope.document_title} • <span className="font-mono text-tinta">{signatureEnvelope.document_number}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-tinta-2 hover:text-tinta hover:bg-superficie-2 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Step Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* STEP 1: REVIEW ENVELOPE DETAILS */}
          {activeStep === 'REVIEW' && (
            <div className="space-y-6">
              {/* Document Summary Bento Card */}
              <div className="bg-fundo p-5 rounded-2xl border border-borda grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-tinta-2 block text-[10px] uppercase font-bold">Documento Técnico:</span>
                  <span className="font-bold text-tinta text-sm">{signatureEnvelope.document_title}</span>
                  <span className="text-tinta-2 block mt-0.5">Tipo: {signatureEnvelope.document_type}</span>
                </div>
                <div>
                  <span className="text-tinta-2 block text-[10px] uppercase font-bold">Empresa Cliente:</span>
                  <span className="font-bold text-tinta text-sm">{signatureEnvelope.client_name}</span>
                  <span className="font-mono text-tinta-2 block mt-0.5">{clients.find(c => c.id === signatureEnvelope.client_id)?.document_number}</span>
                </div>
                <div>
                  <span className="text-tinta-2 block text-[10px] uppercase font-bold">Validade Jurídica & Hash:</span>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="font-mono text-[11px] text-teal-700 truncate max-w-[160px]" title={signatureEnvelope.document_sha256}>
                      {signatureEnvelope.document_sha256.substring(0, 16)}...
                    </span>
                    <button
                      onClick={handleCopyHash}
                      className="p-1 hover:bg-superficie-2 rounded text-tinta-2 hover:text-tinta"
                      title="Copiar Hash SHA-256"
                    >
                      {copiedHash ? <Check className="w-3 h-3 text-teal-700" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-tinta-2">Assinatura eletrônica simples (Lei 14.063/2020)</span>
                </div>
              </div>

              {/* Signers Status List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-tinta flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-teal-700" />
                    <span>Grade de Signatários & Responsabilidade Técnica ({signatureEnvelope.signers.length})</span>
                  </h3>
                  <span className="text-xs text-tinta-2">
                    Status: <strong className="text-teal-700">{signatureEnvelope.status}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {signatureEnvelope.signers.map(signer => {
                    const isSigned = signer.signature_status === 'SIGNED';
                    const isRejected = signer.signature_status === 'REJECTED';
                    const isCurrent = signer.id === selectedSignerId;

                    return (
                      <div
                        key={signer.id}
                        onClick={() => setSelectedSignerId(signer.id)}
                        className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-3 ${
                          isCurrent 
                            ? 'bg-superficie-2 border-teal-500 ring-1 ring-teal-500/40' 
                            : 'bg-fundo border-borda hover:border-borda'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-tinta">{signer.name}</span>
                              {signer.role_type === 'TECHNICAL_RESPONSIBLE' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-500/10 text-teal-800 border border-teal-500/20">
                                  Técnico / RT
                                </span>
                              )}
                              {signer.role_type === 'EMPLOYER_REPRESENTATIVE' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-800 border border-amber-500/20">
                                  Empregador
                                </span>
                              )}
                              {signer.role_type === 'EMPLOYEE' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-marca-suave text-marca-escura border border-marca-borda">
                                  Colaborador
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-tinta-2 block mt-0.5">{signer.role_description}</span>
                            <div className="flex items-center space-x-2 text-[11px] text-tinta-2 mt-1 font-mono">
                              <span>CPF: {signer.cpf}</span>
                              {signer.professional_council_number && (
                                <span>• {signer.professional_council_number}</span>
                              )}
                            </div>
                          </div>

                          <div>
                            {isSigned ? (
                              <span className="flex items-center space-x-1 text-marca-escura text-xs font-bold bg-marca-suave border border-marca-borda px-2.5 py-1 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Assinado</span>
                              </span>
                            ) : isRejected ? (
                              <span className="flex items-center space-x-1 text-rose-700 text-xs font-bold bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Recusado</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-1 text-amber-800 text-xs font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                                <span>Pendente</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {isSigned && signer.signature_hash && (
                          <div className="bg-superficie p-2 rounded-xl border border-borda text-[10px] font-mono text-tinta-2">
                            <span className="text-teal-700 block font-bold">Hash Assinatura:</span>
                            <span className="truncate block">{signer.signature_hash}</span>
                            <span className="text-tinta-2 block mt-0.5">Data/Hora: {new Date(signer.signed_at || '').toLocaleString('pt-BR')}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Compliance & Legal Information Notice */}
              <div className="bg-superficie p-4 rounded-2xl border border-teal-200 flex items-start space-x-3 text-xs">
                <ShieldCheck className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-tinta">
                  <span className="font-bold text-tinta block">Validade Jurídica e Limites desta Assinatura</span>
                  <p className="leading-relaxed text-[11px] text-tinta-2">
                    Esta é uma <strong>assinatura eletrônica simples</strong>, admitida pela Lei Federal nº 14.063/2020 (art. 4º, I). O conteúdo assinado recebe um código SHA-256 e cada signatário tem registrados data, hora e IP, o que permite conferir em /validar que o documento não foi alterado depois de assinado. Não há certificado ICP-Brasil nem carimbo do tempo de terceiro, de modo que a autoria não goza da presunção do art. 10 da MP nº 2.200-2/2001 e a data não é oponível a terceiros.
                  </p>
                </div>
              </div>

              {/* Verification Link and QR Code Preview */}
              <div className="bg-fundo p-4 rounded-2xl border border-borda flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-superficie border border-borda text-teal-700">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="font-bold text-tinta block">Link Público de Validação & Autenticidade:</span>
                    <span className="font-mono text-teal-700 text-[11px] truncate block max-w-md">
                      {signatureEnvelope.qr_code_verification_url}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-xl bg-superficie-2 hover:bg-superficie-3 text-tinta text-xs font-bold flex items-center space-x-1.5 transition"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-teal-700" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copiar Link</span>
                  </button>
                  <a
                    href={signatureEnvelope.qr_code_verification_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 border border-teal-500/30 text-xs font-bold flex items-center space-x-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Verificar</span>
                  </a>
                </div>
              </div>

              {/* Audit Trail Preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-tinta-2 uppercase tracking-wider">Trilha de Auditoria do Envelope:</h4>
                <div className="bg-fundo p-3 rounded-2xl border border-borda space-y-2 max-h-36 overflow-y-auto text-xs">
                  {signatureEnvelope.audit_trail.map(log => (
                    <div key={log.id} className="flex items-start justify-between border-b border-borda pb-1.5 text-[11px]">
                      <div>
                        <span className="font-bold text-tinta">{log.actor_name}</span>
                        <span className="text-tinta-2 block">{log.details}</span>
                      </div>
                      <div className="text-right text-tinta-2 text-[10px]">
                        <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                        <span className="block font-mono text-tinta-2">IP: {log.ip_address}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SIGNING INTERACTION */}
          {activeStep === 'SIGN' && currentSigner && (
            <div className="space-y-6">
              {/* Signer Confirmation Header */}
              <div className="bg-fundo p-4 rounded-2xl border border-borda flex items-center justify-between">
                <div>
                  <span className="text-tinta-2 text-xs block">Você está assinando como:</span>
                  <span className="text-base font-bold text-tinta">{currentSigner.name}</span>
                  <span className="text-xs text-teal-700 block font-mono">CPF: {currentSigner.cpf} • {currentSigner.role_description}</span>
                </div>
                <div className="text-right">
                  <span className="text-tinta-2 text-xs block">Documento:</span>
                  <span className="text-xs font-bold text-tinta">{signatureEnvelope.document_title}</span>
                </div>
              </div>

              {/* Modality Selection Tabs */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-tinta uppercase tracking-wider block">
                  Escolha a Modalidade de Assinatura Digital:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSignatureMode('ELECTRONIC_PORTAL')}
                    className={`p-3.5 rounded-2xl border text-left transition space-y-1.5 ${
                      signatureMode === 'ELECTRONIC_PORTAL'
                        ? 'bg-teal-700/10 border-teal-500 text-tinta ring-1 ring-teal-500'
                        : 'bg-fundo border-borda text-tinta-2 hover:border-borda'
                    }`}
                  >
                    <div className="flex items-center space-x-2 text-teal-700">
                      <Smartphone className="w-4 h-4" />
                      <span className="font-bold text-xs">Token OTP / Celular</span>
                    </div>
                    <p className="text-[10px] text-tinta-2 leading-snug">
                      Código de 6 dígitos via E-mail / WhatsApp, com registro de data, hora e IP.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignatureMode('DIGITAL_CERTIFICATE_ICP')}
                    className={`p-3.5 rounded-2xl border text-left transition space-y-1.5 ${
                      signatureMode === 'DIGITAL_CERTIFICATE_ICP'
                        ? 'bg-teal-700/10 border-teal-500 text-tinta ring-1 ring-teal-500'
                        : 'bg-fundo border-borda text-tinta-2 hover:border-borda'
                    }`}
                  >
                    <div className="flex items-center space-x-2 text-teal-700">
                      <Lock className="w-4 h-4" />
                      <span className="font-bold text-xs">Certificado ICP-Brasil (indisponível)</span>
                    </div>
                    <p className="text-[10px] text-tinta-2 leading-snug">
                      e-CPF / e-CNPJ A1 ou A3: tela demonstrativa, ainda não implementada.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignatureMode('BIOMETRIC_DRAW')}
                    className={`p-3.5 rounded-2xl border text-left transition space-y-1.5 ${
                      signatureMode === 'BIOMETRIC_DRAW'
                        ? 'bg-teal-700/10 border-teal-500 text-tinta ring-1 ring-teal-500'
                        : 'bg-fundo border-borda text-tinta-2 hover:border-borda'
                    }`}
                  >
                    <div className="flex items-center space-x-2 text-teal-700">
                      <PenTool className="w-4 h-4" />
                      <span className="font-bold text-xs">Rubrica / Manuscrita</span>
                    </div>
                    <p className="text-[10px] text-tinta-2 leading-snug">
                      Desenhe sua rubrica digital com registro biométrico do traçado.
                    </p>
                  </button>
                </div>
              </div>

              {/* Mode 1: OTP Interaction */}
              {signatureMode === 'ELECTRONIC_PORTAL' && (
                <div className="bg-fundo p-5 rounded-2xl border border-borda space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-tinta text-sm block">Autenticação por Duplo Fator (OTP)</span>
                      <p className="text-xs text-tinta-2">
                        Um código de segurança seguro será enviado para o e-mail cadastrado ({currentSigner.email || 'contato@cliente.com.br'}).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="bg-marca-escura text-white px-4 py-2 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-sm hover:opacity-90"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>{isOtpSent ? 'Reenviar Código' : 'Gerar Código OTP'}</span>
                    </button>
                  </div>

                  {isOtpSent && (
                    <div className="bg-superficie p-4 rounded-xl border border-teal-200 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-700">Digite o código de 6 dígitos recebido:</span>
                        <span className="text-[11px] text-tinta-2">Expira em {otpCountdown}s</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="Ex: 748291"
                          className="bg-fundo border border-borda text-tinta font-mono text-xl tracking-widest text-center px-4 py-2.5 rounded-xl w-48 focus:outline-none focus:border-teal-500"
                        />
                        <span className="text-xs text-marca-escura font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Código simulado verificado com sucesso</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: ICP-Brasil Certificate */}
              {signatureMode === 'DIGITAL_CERTIFICATE_ICP' && (
                <div className="bg-fundo p-5 rounded-2xl border border-borda space-y-4">
                  <div className="space-y-1">
                    <span className="font-bold text-tinta text-sm block">Seleção de Certificado Digital ICP-Brasil (demonstração)</span>
                    <p className="text-xs text-tinta-2">
                      Tela demonstrativa: o sistema ainda não lê certificados A1 (.pfx/.p12) nem A3 (Token/Smartcard). A assinatura registrada será eletrônica simples, como nas demais opções.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div 
                      onClick={() => setSelectedCert('CERT_ICP_A1')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition space-y-1 ${
                        selectedCert === 'CERT_ICP_A1' ? 'bg-teal-500/10 border-teal-500 text-tinta' : 'bg-superficie border-borda text-tinta-2'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-teal-700">Certificado A1 (e-CPF Nuvem)</span>
                        <Award className="w-4 h-4 text-teal-700" />
                      </div>
                      <span className="text-[11px] text-tinta block">{currentSigner.name}:00000000000</span>
                      <span className="text-[10px] text-tinta-2 block font-mono">AC VALID RFB v5 • Validade: 2027</span>
                    </div>

                    <div 
                      onClick={() => setSelectedCert('CERT_ICP_A3')}
                      className={`p-3.5 rounded-xl border cursor-pointer transition space-y-1 ${
                        selectedCert === 'CERT_ICP_A3' ? 'bg-teal-500/10 border-teal-500 text-tinta' : 'bg-superficie border-borda text-tinta-2'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-teal-700">Certificado A3 (Token Físico / HSM)</span>
                        <Lock className="w-4 h-4 text-teal-700" />
                      </div>
                      <span className="text-[11px] text-tinta block">Dispositivo Conectado: SafeNet eToken</span>
                      <span className="text-[10px] text-tinta-2 block font-mono">AC SERPRO • Validade: 2028</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-tinta-2 block mb-1">Senha PIN do Certificado:</label>
                    <input
                      type="password"
                      value={certPin}
                      onChange={(e) => setCertPin(e.target.value)}
                      placeholder="••••••••"
                      className="bg-superficie border border-borda text-tinta px-3 py-2 rounded-xl text-xs w-64 focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Mode 3: Canvas Rubric */}
              {signatureMode === 'BIOMETRIC_DRAW' && (
                <div className="bg-fundo p-5 rounded-2xl border border-borda space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-tinta text-sm block">Quadro de Rubrica Digital</span>
                      <span className="text-xs text-tinta-2">Desenhe sua assinatura com o mouse ou toque na tela.</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="px-3 py-1.5 bg-superficie-2 hover:bg-superficie-3 text-tinta rounded-xl text-xs font-bold transition"
                    >
                      Limpar Quadro
                    </button>
                  </div>

                  {/* TEMA-CLARO-INICIO: quadro de assinatura, traço escuro sobre branco */}
                  <div className="bg-white rounded-2xl border-2 border-dashed border-borda overflow-hidden relative">
                    <canvas
                      ref={canvasRef}
                      width={680}
                      height={180}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-44 cursor-crosshair touch-none"
                    />
                    {!hasDrawn && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-tinta-2 text-xs">
                        Rubrique aqui no espaço pontilhado...
                      </div>
                    )}
                  </div>
                  {/* TEMA-CLARO-FIM */}
                </div>
              )}

              {/* Legal Agreement Checkbox */}
              <div className="bg-fundo p-4 rounded-2xl border border-borda space-y-2">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-borda text-teal-700 focus:ring-teal-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-xs text-tinta leading-relaxed">
                    Declaro, sob as penas da lei, que examinei o teor técnico deste documento ({signatureEnvelope.document_title}), 
                    concordo plenamente com suas diretrizes e reconheço a validade jurídica desta assinatura eletrônica 
                    em conformidade com a <strong>Lei Federal nº 14.063/2020</strong> e <strong>MP nº 2.200-2/2001</strong>.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: REJECTION / CONTESTATION */}
          {activeStep === 'REJECT' && currentSigner && (
            <div className="space-y-5">
              <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 space-y-2">
                <div className="flex items-center space-x-2 text-rose-700 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Recusa ou Solicitação de Ajuste Técnico</span>
                </div>
                <p className="text-xs text-tinta leading-relaxed">
                  Ao recusar a assinatura, o documento será retornado para a equipe técnica do SESMT com status de inconformidade 
                  e os apontamentos serão registrados na trilha de auditoria.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-tinta block">
                  Descreva detalhadamente a justificativa ou correção necessária: *
                </label>
                <textarea
                  rows={5}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ex: Identificamos divergência na listagem dos colaboradores do setor de usinagem ou nos CA dos respiradores indicados no GHE..."
                  className="w-full bg-fundo border border-borda text-tinta rounded-2xl p-3.5 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS CONFIRMATION */}
          {activeStep === 'SUCCESS' && (
            <div className="py-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-marca-suave text-marca-escura border border-marca-borda flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-tinta">Assinatura Registrada com Sucesso!</h3>
                <p className="text-xs text-tinta-2 max-w-md mx-auto">
                  O documento foi assinado eletronicamente (Lei 14.063/2020, art. 4º, I). Ficaram registrados o código SHA-256 do conteúdo, a data, a hora e o IP do signatário, conferíveis em /validar.
                </p>
              </div>

              <div className="bg-fundo p-4 rounded-2xl border border-borda max-w-md mx-auto text-left text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-tinta-2">
                  <span>Protocolo de Autenticação:</span>
                  <span className="text-teal-700 font-bold">
                    AUT-{(currentSigner?.signature_hash || '').slice(-8).toUpperCase() || '--------'}
                  </span>
                </div>
                <div className="flex justify-between text-tinta-2">
                  <span>Signatário:</span>
                  <span className="text-tinta">{currentSigner?.name}</span>
                </div>
                <div className="flex justify-between text-tinta-2">
                  <span>Data/Hora:</span>
                  <span className="text-tinta">
                    {currentSigner?.signed_at
                      ? new Date(currentSigner.signed_at).toLocaleString('pt-BR')
                      : '--'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="bg-fundo px-6 py-4 border-t border-borda flex flex-col sm:flex-row items-center justify-between gap-3">
          {activeStep === 'REVIEW' && (
            <>
              <div className="flex items-center space-x-2 text-xs text-tinta-2">
                <Lock className="w-4 h-4 text-teal-700" />
                <span>Envelope auditado e protegido contra alterações.</span>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                {currentSigner?.signature_status === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveStep('REJECT')}
                      className="px-4 py-2 rounded-xl bg-superficie-2 hover:bg-rose-50 text-tinta hover:text-rose-700 text-xs font-bold transition border border-borda hover:border-rose-500/40"
                    >
                      Recusar / Ajuste
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveStep('SIGN')}
                      className="bg-marca-escura text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1.5 hover:opacity-90"
                    >
                      <PenTool className="w-4 h-4" />
                      <span>Assinar Documento</span>
                    </button>
                  </>
                )}

                {currentSigner?.signature_status === 'SIGNED' && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl bg-superficie-2 hover:bg-superficie-3 text-tinta text-xs font-bold transition"
                  >
                    Fechar
                  </button>
                )}
              </div>
            </>
          )}

          {activeStep === 'SIGN' && (
            <>
              <button
                type="button"
                onClick={() => setActiveStep('REVIEW')}
                className="px-4 py-2 rounded-xl text-tinta-2 hover:text-tinta text-xs font-bold transition"
              >
                Voltar para Revisão
              </button>

              <button
                type="button"
                disabled={isSubmitting || !acceptedTerms}
                onClick={handleConfirmSignature}
                className="bg-marca-escura text-white px-6 py-2 rounded-xl disabled:opacity-50 text-xs font-bold transition shadow-sm flex items-center space-x-2 hover:opacity-90"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Criptografando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Assinatura Digital</span>
                  </>
                )}
              </button>
            </>
          )}

          {activeStep === 'REJECT' && (
            <>
              <button
                type="button"
                onClick={() => setActiveStep('REVIEW')}
                className="px-4 py-2 rounded-xl text-tinta-2 hover:text-tinta text-xs font-bold transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmRejection}
                className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center space-x-2"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirmar Recusa do Documento</span>
              </button>
            </>
          )}

          {activeStep === 'SUCCESS' && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="bg-marca-escura text-white px-6 py-2 rounded-xl text-xs font-bold transition hover:opacity-90"
              >
                Concluir & Retornar ao Portal
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
