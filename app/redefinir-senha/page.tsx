'use client';

import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

type Status = 'VERIFICANDO' | 'PRONTO' | 'LINK_INVALIDO' | 'CONCLUIDO';

export default function RedefinirSenhaPage() {
  const [status, setStatus] = useState<Status>('VERIFICANDO');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // O Supabase entrega o token no fragmento da URL e o cliente o converte em
  // sessão automaticamente (detectSessionInUrl). Só liberamos o formulário
  // quando essa sessão de recuperação existir.
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setStatus('LINK_INVALIDO');
      return;
    }

    let resolved = false;

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        resolved = true;
        setStatus('PRONTO');
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        resolved = true;
        setStatus('PRONTO');
      }
    });

    // Sem sessão após o processamento do link, ele expirou ou já foi usado
    const timer = setTimeout(() => {
      if (!resolved) setStatus('LINK_INVALIDO');
    }, 3000);

    return () => {
      clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage('A nova senha precisa ter ao menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('As senhas não conferem.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMessage('Serviço de autenticação indisponível no momento.');
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSaving(false);

    if (error) {
      setErrorMessage(
        /same.*password/i.test(error.message)
          ? 'A nova senha precisa ser diferente da anterior.'
          : 'Não foi possível redefinir a senha. Solicite um novo link e tente de novo.'
      );
      return;
    }

    setStatus('CONCLUIDO');
    setTimeout(() => { window.location.href = '/'; }, 2500);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8">
        <div className="mb-6">
          <div>
            <div className="text-lg font-bold text-white tracking-tight">PrevSafe</div>
            <p className="text-xs text-slate-400">Redefinição de senha</p>
          </div>
        </div>

        {status === 'VERIFICANDO' && (
          <div className="py-10 flex flex-col items-center text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
            <p className="text-xs text-slate-400">Validando seu link de redefinição...</p>
          </div>
        )}

        {status === 'LINK_INVALIDO' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>
                Este link de redefinição é inválido, expirou ou já foi utilizado. Volte à tela de acesso e
                solicite um novo.
              </span>
            </div>
            <a
              href="/"
              className="block w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl text-center transition"
            >
              Voltar para o acesso
            </a>
          </div>
        )}

        {status === 'CONCLUIDO' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              <span>Senha redefinida com sucesso! Redirecionando para o sistema...</span>
            </div>
          </div>
        )}

        {status === 'PRONTO' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-400">
              Defina sua nova senha de acesso. Use ao menos 8 caracteres.
            </p>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nova senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirmar nova senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Redefinir senha</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
