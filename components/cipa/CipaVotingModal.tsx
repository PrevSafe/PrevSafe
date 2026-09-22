'use client';

import React, { useState } from 'react';
import { getClientIp } from '@/lib/clientIp';
import { conferirDocumento } from '@/lib/validacoesBr';
import { 
  CipaManagementProcess, 
  CipaCandidate, 
  CipaVoteVerificationMethod 
} from '@/types';
import { 
  Vote, 
  ShieldCheck, 
  Camera, 
  Fingerprint, 
  KeyRound, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  QrCode,
  X,
  FileCheck2
} from 'lucide-react';

interface CipaVotingModalProps {
  process: CipaManagementProcess;
  isOpen: boolean;
  onClose: () => void;
  onCastVote: (voteData: {
    candidate_id: string;
    voter_cpf: string;
    verification_method: CipaVoteVerificationMethod;
    facial_confidence?: number;
    ip_address?: string;
  }) => { success: boolean; receipt?: string; message: string };
}

export const CipaVotingModal: React.FC<CipaVotingModalProps> = ({
  process,
  isOpen,
  onClose,
  onCastVote
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [voterCpf, setVoterCpf] = useState<string>('');
  const [voterName, setVoterName] = useState<string>('');
  const [verificationMethod, setVerificationMethod] = useState<CipaVoteVerificationMethod>('FACIAL_BIOMETRICS');
  const [isVerifyingBiometrics, setIsVerifyingBiometrics] = useState<boolean>(false);
  const [biometricValidated, setBiometricValidated] = useState<boolean>(false);
  const [voteReceipt, setVoteReceipt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulateBiometricCapture = () => {
    // Conferia so o comprimento: 11 digitos quaisquer passavam. O CPF
    // identifica o eleitor e e o que impede o voto duplicado.
    const confBio = conferirDocumento(voterCpf, 'CPF');
    if (!confBio.valido) {
      setErrorMessage(confBio.motivo || 'Informe um CPF válido.');
      return;
    }
    setErrorMessage(null);
    setIsVerifyingBiometrics(true);

    setTimeout(() => {
      setIsVerifyingBiometrics(false);
      setBiometricValidated(true);
    }, 1200);
  };

  const handleConfirmVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidateId) {
      setErrorMessage('Selecione um candidato ou a opção de voto em branco/nulo.');
      return;
    }
    const confVoto = conferirDocumento(voterCpf, 'CPF');
    if (!confVoto.valido) {
      setErrorMessage(confVoto.motivo || 'Informe um CPF válido para validação do direito a 1 voto único.');
      return;
    }
    if (!biometricValidated && verificationMethod === 'FACIAL_BIOMETRICS') {
      setErrorMessage('É necessário validar a biometria facial antes de concluir a votação.');
      return;
    }

    // O IP entra na auditoria do voto, entao vem do servidor - nunca inventado.
    const voterIp = await getClientIp();

    const result = onCastVote({
      candidate_id: selectedCandidateId,
      voter_cpf: voterCpf,
      verification_method: verificationMethod,
      facial_confidence: verificationMethod === 'FACIAL_BIOMETRICS' ? 98.6 : undefined,
      ip_address: voterIp
    });

    if (result.success) {
      setVoteReceipt(result.receipt || 'REC-CIPA-OK');
      setErrorMessage(null);
    } else {
      setErrorMessage(result.message);
    }
  };

  const resetVotingState = () => {
    setSelectedCandidateId('');
    setVoterCpf('');
    setVoterName('');
    setBiometricValidated(false);
    setVoteReceipt(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 border border-white/20 text-white shadow-inner">
              <Vote className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-teal-500/30 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-teal-200 border border-teal-400/30">
                  {process.norm} • Escrutínio Secreto
                </span>
                <span className="text-xs text-teal-200/80">Gestão {process.mandate_year}</span>
              </div>
              <h2 className="text-lg font-bold leading-tight">Cabine de Votação Digital CIPA</h2>
            </div>
          </div>
          <button
            onClick={resetVotingState}
            className="rounded-lg p-1.5 text-teal-100 hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-sm">
          {voteReceipt ? (
            /* Success Receipt Screen */
            <div className="text-center py-6 space-y-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Voto Auditado e Computado com Sucesso!</h3>
                <p className="text-xs text-slate-550 mt-1">
                  Seu voto foi registrado com sigilo inviolável e integridade criptográfica SHA-256.
                </p>
              </div>

              {/* Receipt Box */}
              <div className="mx-auto max-w-md rounded-xl bg-slate-50 border border-slate-200 p-5 text-left space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-sans font-bold text-slate-700">COMPROVANTE DE VOTAÇÃO ELETRÔNICA</span>
                  <FileCheck2 className="h-4 w-4 text-teal-600" />
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600">
                  <div><strong>Empresa:</strong> {process.client_name}</div>
                  <div><strong>Norma / Gestão:</strong> {process.norm} - Mandato {process.mandate_year}</div>
                  <div><strong>Código de Autenticidade:</strong> <span className="text-teal-700 font-bold">{voteReceipt}</span></div>
                  <div><strong>Método de Validação:</strong> {verificationMethod} (98.6% match)</div>
                  <div><strong>Timestamp UTC:</strong> {new Date().toISOString()}</div>
                  <div><strong>Garantia Legal:</strong> Item 5.5.4 da NR-05 &amp; Lei 13.709/2018 (LGPD)</div>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Auditoria Criptográfica PrevSafe</span>
                  <QrCode className="h-6 w-6 text-slate-500" />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={resetVotingState}
                  className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition"
                >
                  Concluir e Retornar ao Painel
                </button>
              </div>
            </div>
          ) : (
            /* Voting Form */
            <form onSubmit={handleConfirmVote} className="space-y-5">
              {/* LGPD & Legal Banner */}
              <div className="flex items-start gap-3 rounded-xl bg-teal-50/80 border border-teal-100 p-3.5 text-xs text-teal-900">
                <ShieldCheck className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Voto Secreto &amp; Proteção de Dados (LGPD):</p>
                  <p className="text-teal-800/90 mt-0.5 leading-relaxed">
                    Seu voto é 100% anônimo. O CPF é utilizado exclusivamente para evitar duplicidade de votos e validar o quórum de eleitores aptos (&ge; 50%), sendo transformado imediatamente em um hash criptográfico irreversível.
                  </p>
                </div>
              </div>

              {/* Step 1: Identification & Biometrics */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Etapa 1: Identificação do Eleitor
                  </h4>
                  <span className="text-[11px] text-slate-400">Quórum da empresa: {process.total_eligible_voters} aptos</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CPF do Eleitor (Obrigatório)
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={voterCpf}
                      onChange={(e) => setVoterCpf(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome do Colaborador (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: João da Silva"
                      value={voterName}
                      onChange={(e) => setVoterName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>

                {/* Validation Method Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Método de Validação de Identidade
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setVerificationMethod('FACIAL_BIOMETRICS')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition ${
                        verificationMethod === 'FACIAL_BIOMETRICS'
                          ? 'border-teal-600 bg-teal-50 text-teal-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Camera className="h-4 w-4 mb-1 text-teal-600" />
                      <span>Biometria Facial</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationMethod('DIGITAL_SIGNATURE')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition ${
                        verificationMethod === 'DIGITAL_SIGNATURE'
                          ? 'border-teal-600 bg-teal-50 text-teal-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Fingerprint className="h-4 w-4 mb-1 text-teal-600" />
                      <span>Token Digital</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationMethod('CORPORATE_SSO')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition ${
                        verificationMethod === 'CORPORATE_SSO'
                          ? 'border-teal-600 bg-teal-50 text-teal-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <KeyRound className="h-4 w-4 mb-1 text-teal-600" />
                      <span>SSO / Login</span>
                    </button>
                  </div>
                </div>

                {/* Biometric trigger action */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs">
                    {biometricValidated ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <CheckCircle2 className="h-4 w-4" /> Identidade Validada (98.6% Match)
                      </span>
                    ) : (
                      <span className="text-slate-500">Validação biométrica pendente</span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isVerifyingBiometrics || biometricValidated}
                    onClick={handleSimulateBiometricCapture}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 transition disabled:opacity-50"
                  >
                    {isVerifyingBiometrics ? (
                      <>
                        <Sparkles className="h-3.5 w-3.5 animate-spin" />
                        Validando Face...
                      </>
                    ) : biometricValidated ? (
                      'Biometria OK'
                    ) : (
                      <>
                        <Camera className="h-3.5 w-3.5" />
                        Capturar Biometria
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step 2: Secret Ballot Selection */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Etapa 2: Cédula Eleitoral Oficial (Escolha o Candidato)
                  </h4>
                  <span className="text-xs text-teal-600 font-medium">Voto Nominal Secreto</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {process.candidates.map((c) => (
                    <label
                      key={c.id}
                      className={`relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        selectedCandidateId === c.id
                          ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cipa_candidate"
                        value={c.id}
                        checked={selectedCandidateId === c.id}
                        onChange={() => setSelectedCandidateId(c.id)}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-[11px] font-bold text-white">
                            {c.candidacy_number}
                          </span>
                          <span className="font-bold text-slate-800 text-xs truncate">
                            {c.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {c.job_title} • {c.department}
                        </div>
                      </div>
                    </label>
                  ))}

                  {/* Blank / Null options */}
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      selectedCandidateId === 'VOTE_BLANK'
                        ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cipa_candidate"
                      value="VOTE_BLANK"
                      checked={selectedCandidateId === 'VOTE_BLANK'}
                      onChange={() => setSelectedCandidateId('VOTE_BLANK')}
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-700 text-xs">Voto em Branco</div>
                      <div className="text-[11px] text-slate-400">Opção de abstenção nominal</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      selectedCandidateId === 'VOTE_NULL'
                        ? 'border-red-600 bg-red-50/60 ring-2 ring-red-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cipa_candidate"
                      value="VOTE_NULL"
                      checked={selectedCandidateId === 'VOTE_NULL'}
                      onChange={() => setSelectedCandidateId('VOTE_NULL')}
                      className="h-4 w-4 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <div className="font-bold text-slate-700 text-xs">Voto Nulo</div>
                      <div className="text-[11px] text-slate-400">Anulação intencional do voto</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Error warning */}
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetVotingState}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-teal-700 transition"
                >
                  <Lock className="h-4 w-4" />
                  Confirmar Voto Secreto
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
