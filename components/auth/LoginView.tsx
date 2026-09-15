'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { usePrevSafe } from '@/context/PrevSafeContext';
import { Profile, RoleType } from '@/types';
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
  User, 
  ArrowRight, 
  Smartphone, 
  Sparkles, 
  Briefcase, 
  FileText, 
  CheckSquare, 
  RefreshCw,
  HelpCircle,
  Clock,
  ChevronRight,
  Fingerprint,
  Info
} from 'lucide-react';

interface LoginViewProps {
  onSuccess?: () => void;
  onNavigateHelp?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess, onNavigateHelp }) => {
  const { profiles, login, requestPasswordReset, resetPasswordWithToken, organization } = usePrevSafe();

  // Authentication mode: 'quick' (Perfis Rápidos) or 'credentials' (Email & Senha)
  const [authMode, setAuthMode] = useState<'quick' | 'credentials'>('quick');
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 2FA / MFA state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pendingProfile, setPendingProfile] = useState<Profile | null>(null);

  // Password Recovery state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'verify'>('request');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [generatedDemoToken, setGeneratedDemoToken] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  // Quick Persona Profiles Mapping with role metadata
  const roleBadges: Record<RoleType, { label: string; color: string; desc: string; icon: any }> = {
    'ADMIN': {
      label: 'Admin Geral SaaS',
      color: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      desc: 'Gestão integral do sistema, tenants e auditoria',
      icon: ShieldCheck
    },
    'GESTOR': {
      label: 'Gestora de Operações',
      color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      desc: 'Supervisão de OS, controle de prazos SLA e laudos',
      icon: Clock
    },
    'COMERCIAL': {
      label: 'Executivo Comercial',
      color: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      desc: 'CRM de clientes, funil de propostas e contratos',
      icon: Briefcase
    },
    'TÉCNICO': {
      label: 'Engenheiro / Técnico',
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      desc: 'App de campo PWA, vistorias e dosimetrias',
      icon: Smartphone
    },
    'FINANCEIRO': {
      label: 'Financeiro & Faturamento',
      color: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      desc: 'Contas a receber, notas fiscais e fluxo D-3',
      icon: FileText
    },
    'CLIENTE_ADMIN': {
      label: 'Cliente (Diretoria/RH)',
      color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      desc: 'Portal do cliente, aceite formal de laudos e ASO',
      icon: Building2
    },
    'CLIENTE_USER': {
      label: 'Cliente (Colaborador)',
      color: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
      desc: 'Consulta de ASOs, comprovantes e EPIs',
      icon: User
    }
  };

  // Perform quick login with 1 click
  const handleQuickLogin = (profile: Profile) => {
    setIsLoading(true);
    setErrorMessage(null);

    // If role is ADMIN or GESTOR, simulate optional 2FA check or direct login
    setTimeout(() => {
      const res = login(profile.email, undefined, profile.id);
      setIsLoading(false);
      if (res.success) {
        setSuccessMessage(`Bem-vindo, ${profile.full_name}!`);
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.message || 'Erro ao autenticar');
      }
    }, 400);
  };

  // Form Submit Login
  const handleCredentialsSubmit = (e: React.FormEvent) => {
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

    setTimeout(() => {
      const res = login(email.trim(), password);
      setIsLoading(false);

      if (res.success) {
        setSuccessMessage(`Login efetuado com sucesso!`);
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.message || 'E-mail ou senha incorretos.');
      }
    }, 600);
  };

  // Password Recovery Handlers
  const handleSendRecoveryCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      setRecoveryMessage('Informe seu e-mail cadastrado.');
      return;
    }

    const res = requestPasswordReset(recoveryEmail);
    setGeneratedDemoToken(res.tempCode);
    setRecoveryStep('verify');
    setRecoveryMessage(res.message);
  };

  const handleVerifyRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryToken) {
      setRecoveryMessage('Informe o código de 6 dígitos.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setRecoveryMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    const res = resetPasswordWithToken(recoveryEmail, recoveryToken, newPassword);
    if (res.success) {
      setSuccessMessage(res.message);
      setShowRecoveryModal(false);
      setRecoveryStep('request');
      setRecoveryEmail('');
      setRecoveryToken('');
      setNewPassword('');
    } else {
      setRecoveryMessage(res.message);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-slate-900/40 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-6xl bg-slate-900/90 border border-slate-800/90 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 z-10 relative">
        
        {/* Left Side: Brand Showcase & Compliance Highlights (Desktop) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 p-6 sm:p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between relative">
          
          {/* Top Brand Info */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/50 flex-shrink-0">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-bold tracking-tight text-white">PrevSafe</span>
                  <span className="text-[10px] uppercase font-mono tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    V1.0 SST
                  </span>
                </div>
                <p className="text-xs text-slate-400">Segurança & Medicina do Trabalho</p>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
              Gestão Ocupacional & eSocial Integrada
            </h1>
            <p className="text-sm text-slate-300 mt-2.5 leading-relaxed">
              Ambiente unificado para controle de Ordens de Serviço, laudos técnicos com bloqueio regulatório RN009 e transmissão dos eventos eSocial.
            </p>

            {/* Core Capabilities List */}
            <div className="mt-8 space-y-3.5">
              <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Automação de Prazos & SLA RN004</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Alertas automáticos D-3, D-1 e D0 com Pausa de SLA para pendências de clientes.</div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Transmissão eSocial S-2210/2220/2240</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Validação estrita de esquemas XSD, lotes e armazenamento de recibos oficiais.</div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">App de Campo PWA com Coleta Offline</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Vistorias, dosimetrias e evidências fotográficas sincronizadas em tempo real.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Badges */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <div className="flex items-center space-x-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Criptografia AES-256</span>
              </div>
              <div className="flex items-center space-x-2">
                <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auditoria RN011</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>LGPD Brasil</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Control Panel */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-slate-900/70">
          
          {/* Header & Tenant Info */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-800">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Acesso ao Sistema</div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
                  Autenticação Corporativa
                </h2>
              </div>

              {/* Organization Pill */}
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs">
                <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div className="truncate max-w-[200px]">
                  <span className="font-semibold text-slate-200 block truncate">{organization.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{organization.document_number}</span>
                </div>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800 mt-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('quick');
                  setErrorMessage(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                  authMode === 'quick'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Acesso Rápido por Perfil</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('credentials');
                  setErrorMessage(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                  authMode === 'credentials'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>E-mail & Senha</span>
              </button>
            </div>

            {/* Feedback Alerts */}
            {errorMessage && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Mode 1: Quick Select Personas (1-Click Login for Demo/Roles) */}
            {authMode === 'quick' && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-300">
                    Selecione um usuário para entrar instantaneamente:
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    {profiles.length} Perfis Disponíveis
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {profiles.map((p) => {
                    const meta = roleBadges[p.role] || {
                      label: p.role,
                      color: 'bg-slate-700 text-slate-300 border-slate-600',
                      desc: 'Acesso padrão',
                      icon: User
                    };
                    const IconComponent = meta.icon;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleQuickLogin(p)}
                        disabled={isLoading}
                        className="w-full text-left p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 transition-all duration-200 group flex items-center justify-between relative overflow-hidden"
                      >
                        <div className="flex items-center space-x-3 truncate">
                          {p.avatar_url ? (
                            <Image 
                              src={p.avatar_url} 
                              alt={p.full_name} 
                              width={40}
                              height={40}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-full object-cover border border-slate-700 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-emerald-800/60 border border-emerald-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {p.full_name.charAt(0)}
                            </div>
                          )}

                          <div className="truncate">
                            <div className="text-xs font-bold text-slate-100 group-hover:text-white truncate">
                              {p.full_name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {p.email}
                            </div>
                            <div className="mt-1.5 flex items-center space-x-1.5">
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${meta.color}`}>
                                {meta.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode 2: Traditional Email & Password Form */}
            {authMode === 'credentials' && (
              <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-4">
                
                {/* Email Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    E-mail Corporativo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ex: carlos.mendes@prevsafe.com.br"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Senha de Acesso
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRecoveryModal(true)}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
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
                      className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-300">Lembrar credenciais neste dispositivo</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition flex items-center justify-center space-x-2 disabled:opacity-50"
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

                {/* Quick Autofill Chips */}
                <div className="pt-3 border-t border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-2">Sugestões de preenchimento rápido:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {profiles.slice(0, 4).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setEmail(p.email);
                          setPassword('prevsafe2026');
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                      >
                        {p.full_name.split(' ')[0]} ({p.role})
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Footer Assistance & Tutorials link */}
          <div className="mt-8 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
            <div>
              Dúvidas no acesso? Contate o suporte SST: <span className="text-emerald-400 font-mono">suporte@prevsafe.com.br</span>
            </div>
            {onNavigateHelp && (
              <button
                type="button"
                onClick={onNavigateHelp}
                className="text-emerald-400 hover:text-emerald-300 font-medium underline flex items-center space-x-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Central de Ajuda & Tutoriais</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Password Recovery Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Recuperação de Acesso</h3>
                <p className="text-xs text-slate-400">Redefinição segura de senha PrevSafe</p>
              </div>
            </div>

            {recoveryMessage && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <Info className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>{recoveryMessage}</span>
              </div>
            )}

            {recoveryStep === 'request' ? (
              <form onSubmit={handleSendRecoveryCode} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Informe seu e-mail cadastrado
                  </label>
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="carlos.mendes@prevsafe.com.br"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecoveryModal(false);
                      setRecoveryMessage(null);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow"
                  >
                    Enviar Código PIN
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyRecovery} className="mt-4 space-y-4">
                {generatedDemoToken && (
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-emerald-500/30 text-xs text-slate-300 flex items-center justify-between font-mono">
                    <span>PIN Demo Gerado:</span>
                    <span className="font-bold text-emerald-400 text-sm tracking-wider">{generatedDemoToken}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Código de 6 dígitos
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={recoveryToken}
                    onChange={(e) => setRecoveryToken(e.target.value)}
                    placeholder="Ex: 123456"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white tracking-widest font-mono text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setRecoveryStep('request')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Voltar
                  </button>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowRecoveryModal(false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow"
                    >
                      Redefinir e Salvar
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
