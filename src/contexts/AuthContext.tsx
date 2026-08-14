import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type Perfil = {
  id: string;
  empresa_id: string;
  nome: string;
  email: string | null;
  papel: 'admin' | 'tecnico' | 'inspetor' | 'leitura';
  avatar_url: string | null;
};

type AuthContextValue = {
  session: Session | null;
  perfil: Perfil | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  recuperarSenha: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Traduz os erros do Supabase (em inglês) para mensagens úteis ao usuário. */
function traduzirErro(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'E-mail ainda não confirmado. Fale com o administrador.';
  if (m.includes('too many requests') || m.includes('rate limit'))
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Sem conexão com o servidor. Verifique sua internet.';
  return 'Não foi possível entrar. Tente novamente.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);

  async function carregarPerfil(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, empresa_id, nome, email, papel, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Falha ao carregar perfil:', error.message);
      setPerfil(null);
      return;
    }
    setPerfil(data as Perfil | null);
  }

  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      if (data.session?.user) await carregarPerfil(data.session.user.id);
      setCarregando(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, nova) => {
      setSession(nova);
      if (nova?.user) await carregarPerfil(nova.user.id);
      else setPerfil(null);
      setCarregando(false);
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      perfil,
      carregando,

      async entrar(email, senha) {
        const emailNormalizado = email.trim().toLowerCase();

        const { error } = await supabase.auth.signInWithPassword({ email: emailNormalizado, password: senha });
        if (error) throw new Error(traduzirErro(error.message));
      },

      async sair() {
        await supabase.auth.signOut();
      },

      async recuperarSenha(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          { redirectTo: `${window.location.origin}/redefinir-senha` }
        );
        if (error) throw new Error(traduzirErro(error.message));
      },
    }),
    [session, perfil, carregando]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
