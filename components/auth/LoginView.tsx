'use client';

import React, { useState } from 'react';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { getSupabaseClient } from '@/lib/supabase';
import { INATIVIDADE_MINUTOS } from '@/lib/sessaoInativa';
import {
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Building2,
  Smartphone,
  FileText,
  RefreshCw,
  HelpCircle,
  Clock,
  Fingerprint
} from 'lucide-react';

interface LoginViewProps {
  onSuccess?: () => void;
  onNavigateHelp?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess, onNavigateHelp }) => {
  const { login, organization, encerradaPorInatividade } = usePrevSafe();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password recovery (Supabase sends a reset link to the user's e-mail)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySent, setRecoverySent] = useState(false);
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);

  const closeRecoveryModal = () => {
    setShowRecoveryModal(false);
    setRecoveryError(null);
    setRecoverySent(false);
    setIsSendingRecovery(false);
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    const target = recoveryEmail.trim().toLowerCase();
    if (!target) {
      setRecoveryError('Informe o e-mail cadastrado.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setRecoveryError('Serviço de autenticação indisponível no momento.');
      return;
    }

    setIsSendingRecovery(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setIsSendingRecovery(false);

    if (error) {
      setRecoveryError(
        /rate limit|too many/i.test(error.message)
          ? 'Muitas solicitações em pouco tempo. Aguarde alguns minutos e tente novamente.'
          : 'Não foi possível enviar o link agora. Tente novamente em instantes.'
      );
      return;
    }

    // Resposta genérica de propósito: não revela se o e-mail existe na base
    setRecoverySent(true);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Por favor, informe seu e-mail de acesso.');
      return;
    }

    if (!password) {
      setErrorMessage('Por favor, informe sua senha.');
      return;
    }

    setIsLoading(true);
    const res = await login(email.trim(), password);
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage('Login efetuado com sucesso!');
      if (onSuccess) onSuccess();
    } else {
      setErrorMessage(res.message || 'E-mail ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-fundo flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-marca-suave rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-superficie rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-6xl bg-superficie border border-borda rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 z-10 relative">

        {/* Left Side: Brand Showcase & Compliance Highlights (Desktop) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 p-6 sm:p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-borda flex flex-col justify-between relative">

          {/* Top Brand Info */}
          <div>
            <div className="mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xl font-bold tracking-tight text-tinta">PrevSafe</span>
                  <span className="text-[10px] uppercase font-mono tracking-wider bg-marca-suave text-marca-escura border border-marca-escura px-2 py-0.5 rounded-full">
                    V1.0 SST
                  </span>
                </div>
                <p className="text-xs text-tinta-2">Segurança & Medicina do Trabalho</p>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-tinta tracking-tight leading-snug">
              Gestão Ocupacional & eSocial Integrada
            </h1>
            <p className="text-sm text-tinta mt-2.5 leading-relaxed">
              Ambiente unificado para controle de Ordens de Serviço, laudos técnicos com bloqueio regulatório RN009 e transmissão dos eventos eSocial.
            </p>

            {/* Core Capabilities List */}
            <div className="mt-8 space-y-3.5">
              <div className="flex items-start space-x-3 p-3 rounded-xl bg-superficie border border-borda">
                <div className="w-8 h-8 rounded-lg bg-marca-suave text-marca-escura flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-tinta">Automação de Prazos & SLA RN004</div>
                  <div className="text-[11px] text-tinta-2 mt-0.5">Alertas automáticos D-3, D-1 e D0 com Pausa de SLA para pendências de clientes.</div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-xl bg-superficie border border-borda">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-tinta">Eventos eSocial S-2210/2220/2230/2240</div>
                  <div className="text-[11px] text-tinta-2 mt-0.5">XML no leiaute S-1.3 com os campos conferidos. Sem assinatura nem transmissão.</div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-xl bg-superficie border border-borda">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-tinta">App de Campo PWA com Coleta Offline</div>
                  <div className="text-[11px] text-tinta-2 mt-0.5">Vistorias, dosimetrias e evidências fotográficas sincronizadas em tempo real.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Badges */}
          <div className="mt-8 pt-6 border-t border-borda">
            <div className="flex items-center justify-between text-tinta-2 text-xs">
              <div className="flex items-center space-x-2">
                <Lock className="w-3.5 h-3.5 text-marca-escura" />
                <span>Criptografia AES-256</span>
              </div>
              <div className="flex items-center space-x-2">
                <Fingerprint className="w-3.5 h-3.5 text-marca-escura" />
                <span>Auditoria RN011</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-marca-escura" />
                <span>LGPD Brasil</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Control Panel */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-superficie">

          {/* Header & Tenant Info */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-borda">
              <div>
                <div className="text-xs font-semibold text-tinta-2 uppercase tracking-wider">Acesso ao Sistema</div>
                <h2 className="text-xl sm:text-2xl font-bold text-tinta tracking-tight mt-0.5">
                  Autenticação Corporativa
                </h2>
              </div>

              {/* Organization Pill */}
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-superficie-2 border border-borda text-xs">
                <Building2 className="w-4 h-4 text-marca-escura flex-shrink-0" />
                <div className="truncate max-w-[200px]">
                  <span className="font-semibold text-tinta block truncate">{organization.name}</span>
                  <span className="text-[10px] text-tinta-2 font-mono">{organization.document_number}</span>
                </div>
              </div>
            </div>

            {/* Feedback Alerts */}
            {encerradaPorInatividade && !errorMessage && !successMessage && (
              <div className="mt-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs flex items-start space-x-2.5">
                <Clock className="w-4 h-4 flex-shrink-0 text-amber-700 mt-0.5" />
                <span>
                  Sua sessão foi encerrada após {INATIVIDADE_MINUTOS} minutos sem atividade.
                  Entre novamente para continuar.
                </span>
              </div>
            )}

            {errorMessage && (
              <div className="mt-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs flex items-center space-x-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-700" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mt-6 p-3.5 rounded-xl bg-marca-suave border border-marca-escura text-marca-escura text-xs flex items-center space-x-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-marca-escura" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Email & Password Form */}
            <form onSubmit={handleCredentialsSubmit} className={`space-y-4 ${errorMessage || successMessage || encerradaPorInatividade ? 'mt-4' : 'mt-6'}`}>

              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold text-tinta mb-1.5">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-tinta-2">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@empresa.com.br"
                    className="w-full pl-10 pr-4 py-2.5 bg-fundo border border-borda rounded-xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-marca-escura focus:ring-1 focus:ring-marca-escura transition"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-tinta">
                    Senha de Acesso
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(true)}
                    className="text-[11px] text-marca-escura hover:text-marca-escura font-medium transition"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-tinta-2">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-fundo border border-borda rounded-xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-marca-escura focus:ring-1 focus:ring-marca-escura transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-tinta-2 hover:text-tinta transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-fundo border-borda text-marca-escura focus:ring-marca-escura"
                  />
                  <span className="text-xs text-tinta">Lembrar credenciais neste dispositivo</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-marca-escura to-teal-600 hover:from-marca-escura hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Autenticando sessão...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Acessar Plataforma PrevSafe</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Assistance & Tutorials link */}
          <div className="mt-8 pt-4 border-t border-borda flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-tinta-2">
            <div>
              Dúvidas no acesso? Contate o suporte SST: <span className="text-marca-escura font-mono">evoluaevenca@gmail.com</span>
            </div>
            {onNavigateHelp && (
              <button
                type="button"
                onClick={onNavigateHelp}
                className="text-marca-escura hover:text-marca-escura font-medium underline flex items-center space-x-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Central de Ajuda & Tutoriais</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Password Recovery: envia link de redefinicao por e-mail (Supabase Auth) */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-superficie border border-borda rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center space-x-3 pb-4 border-b border-borda">
              <div className="w-10 h-10 rounded-xl bg-marca-suave text-marca-escura flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-tinta">Recuperação de Acesso</h3>
                <p className="text-xs text-tinta-2">Enviamos um link de redefinição por e-mail</p>
              </div>
            </div>

            {recoverySent ? (
              <div className="mt-4 space-y-4">
                <div className="p-3 rounded-xl bg-marca-suave border border-marca-escura text-marca-escura text-xs flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-marca-escura mt-0.5" />
                  <span>
                    Se houver uma conta com esse e-mail, o link de redefinição chegará em instantes.
                    Confira também a caixa de spam — o link vale por 1 hora.
                  </span>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeRecoveryModal}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-marca hover:bg-marca-escura transition shadow"
                  >
                    Entendi
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRecoverySubmit} className="mt-4 space-y-4">
                <p className="text-xs text-tinta-2">
                  Informe o e-mail cadastrado e enviaremos um link para você criar uma nova senha.
                </p>

                {recoveryError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs flex items-center space-x-2.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-700" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-tinta mb-1.5">E-mail cadastrado</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-tinta-2">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="seu.email@empresa.com.br"
                      className="w-full pl-10 pr-4 py-2.5 bg-fundo border border-borda rounded-xl text-xs text-tinta placeholder-tinta-3 focus:outline-none focus:border-marca-escura"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={closeRecoveryModal}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-tinta-2 hover:text-tinta bg-superficie-2 hover:bg-superficie-3 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingRecovery}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-marca hover:bg-marca-escura transition shadow disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    {isSendingRecovery && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSendingRecovery ? 'Enviando...' : 'Enviar link'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
