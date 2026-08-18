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

const CHAVE_EMPRESA_ATIVA = 'prevsafe:empresa_ativa';

export type Papel = 'admin' | 'tecnico' | 'inspetor' | 'leitura';

export type Perfil = {
  id: string;
  nome: string;
  email: string | null;
  avatar_url: string | null;
};

type EmpresaResumo = {
  razao_social: string;
  nome_fantasia: string | null;
};

export type Vinculo = {
  empresa_id: string;
  papel: Papel;
  padrao: boolean;
  empresa: EmpresaResumo;
};

/** Formato bruto retornado pelo select embutido, antes de normalizar a cardinalidade de `empresa`. */
type VinculoRow = {
  empresa_id: string;
  papel: Papel;
  padrao: boolean;
  empresa: EmpresaResumo | EmpresaResumo[] | null;
};

type AuthContextValue = {
  session: Session | null;
  perfil: Perfil | null;
  vinculos: Vinculo[];
  empresaAtiva: Vinculo | null;
  somenteLeitura: boolean;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  recuperarSenha: (email: string) => Promise<void>;
  trocarEmpresa: (empresaId: string) => void;
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
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [empresaAtivaId, setEmpresaAtivaId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  async function carregarPerfil(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, email, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Falha ao carregar perfil:', error.message);
      setPerfil(null);
      return;
    }
    setPerfil(data as Perfil | null);
  }

  /** Carrega as empresas do usuário e escolhe a empresa ativa da sessão. */
  async function carregarVinculos(userId: string) {
    const { data, error } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id, papel, padrao, empresa:empresas(razao_social, nome_fantasia)')
      .eq('usuario_id', userId)
      .eq('ativo', true);

    if (error) {
      console.warn('Falha ao carregar vínculos:', error.message);
      setVinculos([]);
      setEmpresaAtivaId(null);
      return;
    }

    // O select embutido (`empresa:empresas(...)`) resolve para um único objeto
    // em tempo de execução, mas o tipo inferido do client sem schema é ambíguo
    // quanto à cardinalidade — normalizamos aqui.
    const linhas = (data ?? []) as VinculoRow[];
    const lista: Vinculo[] = linhas
      .map((linha) => ({
        empresa_id: linha.empresa_id,
        papel: linha.papel,
        padrao: linha.padrao,
        empresa: Array.isArray(linha.empresa) ? linha.empresa[0] : linha.empresa,
      }))
      .filter((v): v is Vinculo => v.empresa != null);
    setVinculos(lista);

    const salva = localStorage.getItem(CHAVE_EMPRESA_ATIVA);
    const escolhida =
      (salva ? lista.find((v) => v.empresa_id === salva) : undefined) ??
      lista.find((v) => v.padrao) ??
      lista[0] ??
      null;

    setEmpresaAtivaId(escolhida?.empresa_id ?? null);
    if (escolhida) localStorage.setItem(CHAVE_EMPRESA_ATIVA, escolhida.empresa_id);
  }

  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      if (data.session?.user) {
        await Promise.all([
          carregarPerfil(data.session.user.id),
          carregarVinculos(data.session.user.id),
        ]);
      }
      if (ativo) setCarregando(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, nova) => {
      setSession(nova);
      if (nova?.user) {
        await Promise.all([carregarPerfil(nova.user.id), carregarVinculos(nova.user.id)]);
      } else {
        setPerfil(null);
        setVinculos([]);
        setEmpresaAtivaId(null);
      }
      setCarregando(false);
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const empresaAtiva = useMemo(
    () => vinculos.find((v) => v.empresa_id === empresaAtivaId) ?? null,
    [vinculos, empresaAtivaId]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      perfil,
      vinculos,
      empresaAtiva,
      somenteLeitura: empresaAtiva?.papel === 'leitura',
      carregando,

      async entrar(email, senha) {
        const emailNormalizado = email.trim().toLowerCase();

        const { error } = await supabase.auth.signInWithPassword({ email: emailNormalizado, password: senha });
        if (error) throw new Error(traduzirErro(error.message));
      },

      async sair() {
        await supabase.auth.signOut();
        localStorage.removeItem(CHAVE_EMPRESA_ATIVA);
      },

      async recuperarSenha(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          { redirectTo: `${window.location.origin}/redefinir-senha` }
        );
        if (error) throw new Error(traduzirErro(error.message));
      },

      trocarEmpresa(empresaId) {
        localStorage.setItem(CHAVE_EMPRESA_ATIVA, empresaId);
        setEmpresaAtivaId(empresaId);
      },
    }),
    [session, perfil, vinculos, empresaAtiva, carregando]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
