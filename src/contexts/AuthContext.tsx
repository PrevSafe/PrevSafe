import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase'; // ajuste o caminho se o client estiver em outro lugar

/* -------------------------------------------------------------------------- */
/* Tipos                                                                       */
/* -------------------------------------------------------------------------- */

export type Acesso = {
  empresa_id: string;
  perfil_id: string;
  perfil_nome: string;
  is_admin: boolean;
  /** Lista achatada no formato "recurso:acao" — ex.: "documentos:ler" */
  permissoes: string[];
};

export type Perfil = {
  id: string;
  nome: string;
  email: string | null;
  avatar_url: string | null;
};

type EmpresaResumo = { razao_social: string; nome_fantasia: string | null };

/** Uma das empresas do usuário, para o seletor — sem as permissões (essas só vêm da empresa ativa, via `acesso`). */
export type Vinculo = {
  empresa_id: string;
  perfil_nome: string;
  is_admin: boolean;
  empresa: EmpresaResumo;
};

/** `acesso` + nome da empresa, para exibição no cabeçalho do menu. */
export type EmpresaAtiva = {
  empresa_id: string;
  perfil_nome: string;
  is_admin: boolean;
  empresa: EmpresaResumo;
};

type AuthContextValue = {
  session: Session | null;
  usuarioId: string | null;
  perfil: Perfil | null;
  vinculos: Vinculo[];
  empresaAtiva: EmpresaAtiva | null;
  acesso: Acesso | null;
  /** true enquanto a sessão ou o acesso ainda não terminaram de carregar */
  carregando: boolean;
  /** Preenchido quando a busca de acesso falha (rede, RLS, função ausente) */
  erro: string | null;
  can: (recurso: string, acao: string) => boolean;
  trocarEmpresa: (empresaId: string) => void;
  recarregarAcesso: () => Promise<void>;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  recuperarSenha: (email: string) => Promise<void>;
};

const CHAVE_EMPRESA_ATIVA = 'prevsafe:empresa_ativa';

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

/* -------------------------------------------------------------------------- */
/* Provider                                                                    */
/* -------------------------------------------------------------------------- */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessaoCarregada, setSessaoCarregada] = useState(false);

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);

  const [acesso, setAcesso] = useState<Acesso | null>(null);
  const [acessoCarregando, setAcessoCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [empresaSelecionada, setEmpresaSelecionada] = useState<string | null>(null);

  // Descarta respostas de requisições antigas quando o usuário troca de
  // empresa rápido — sem isso a resposta lenta sobrescreve a recente.
  const requisicaoAtual = useRef(0);

  const usuarioId = session?.user?.id ?? null;

  /* --- 1. Sessão ---------------------------------------------------------- */
  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      setSessaoCarregada(true);
    });

    // Importante: nada de chamada assíncrona ao Supabase dentro deste callback.
    // O supabase-js segura um lock interno enquanto ele roda, e uma chamada
    // aninhada trava. Só guardamos a sessão; o efeito abaixo reage a ela.
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSession(novaSessao);
      setSessaoCarregada(true);
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /* --- 2. Perfil + empresas vinculadas (para cabeçalho e seletor) --------- */
  useEffect(() => {
    let ativo = true;

    if (!usuarioId) {
      setPerfil(null);
      setVinculos([]);
      setEmpresaSelecionada(null);
      return;
    }

    supabase
      .from('profiles')
      .select('id, nome, email, avatar_url')
      .eq('id', usuarioId)
      .maybeSingle()
      .then(({ data }) => {
        if (ativo) setPerfil((data as Perfil | null) ?? null);
      });

    supabase.rpc('minhas_empresas').then(async ({ data: linhas }) => {
      if (!ativo) return;
      const empresaIds = (linhas ?? []).map((l: { empresa_id: string }) => l.empresa_id);
      const { data: empresas } = empresaIds.length
        ? await supabase.from('empresas').select('id, razao_social, nome_fantasia').in('id', empresaIds)
        : { data: [] as { id: string; razao_social: string; nome_fantasia: string | null }[] };
      if (!ativo) return;

      const porId = new Map((empresas ?? []).map((e) => [e.id, e]));
      const lista: Vinculo[] = (linhas ?? [])
        .map((l: { empresa_id: string; perfil_nome: string; is_admin: boolean }) => {
          const empresa = porId.get(l.empresa_id);
          return empresa
            ? {
                empresa_id: l.empresa_id,
                perfil_nome: l.perfil_nome,
                is_admin: l.is_admin,
                empresa: { razao_social: empresa.razao_social, nome_fantasia: empresa.nome_fantasia },
              }
            : null;
        })
        .filter((v: Vinculo | null): v is Vinculo => v != null);

      setVinculos(lista);

      const salva = localStorage.getItem(CHAVE_EMPRESA_ATIVA);
      const escolhida = (salva && lista.some((v) => v.empresa_id === salva) ? salva : lista[0]?.empresa_id) ?? null;
      setEmpresaSelecionada(escolhida);
      if (escolhida) localStorage.setItem(CHAVE_EMPRESA_ATIVA, escolhida);
    });

    return () => {
      ativo = false;
    };
  }, [usuarioId]);

  /* --- 3. Acesso (perfil de acesso + permissões da empresa ativa) --------- */
  const buscarAcesso = useCallback(
    async (empresaId: string | null) => {
      if (!usuarioId) {
        setAcesso(null);
        setErro(null);
        return;
      }

      const id = ++requisicaoAtual.current;
      setAcessoCarregando(true);
      setErro(null);

      const { data, error } = await supabase.rpc('get_my_access', {
        p_empresa_id: empresaId,
      });

      if (id !== requisicaoAtual.current) return; // resposta obsoleta

      if (error) {
        setAcesso(null);
        setErro(error.message);
      } else {
        setAcesso((data as Acesso | null) ?? null);
      }
      setAcessoCarregando(false);
    },
    [usuarioId],
  );

  useEffect(() => {
    void buscarAcesso(empresaSelecionada);
  }, [buscarAcesso, empresaSelecionada]);

  /* --- 4. Ações ----------------------------------------------------------- */
  const trocarEmpresa = useCallback((empresaId: string) => {
    localStorage.setItem(CHAVE_EMPRESA_ATIVA, empresaId);
    setEmpresaSelecionada(empresaId); // o efeito acima recarrega o acesso
  }, []);

  const recarregarAcesso = useCallback(async () => {
    await buscarAcesso(empresaSelecionada);
  }, [buscarAcesso, empresaSelecionada]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const emailNormalizado = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({ email: emailNormalizado, password: senha });
    if (error) throw new Error(traduzirErro(error.message));
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(CHAVE_EMPRESA_ATIVA);
    setPerfil(null);
    setVinculos([]);
    setAcesso(null);
    setEmpresaSelecionada(null);
    setErro(null);
  }, []);

  const recuperarSenha = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) throw new Error(traduzirErro(error.message));
  }, []);

  /* --- 5. Checagem de permissão ------------------------------------------ */
  // Set em vez de array: `can` é chamado em toda renderização de tela
  // protegida, e includes() em lista longa vira gargalo perceptível.
  const conjuntoPermissoes = useMemo(
    () => new Set(acesso?.permissoes ?? []),
    [acesso],
  );

  const can = useCallback(
    (recurso: string, acao: string) => {
      if (!acesso) return false;
      if (acesso.is_admin) return true;
      return conjuntoPermissoes.has(`${recurso}:${acao}`);
    },
    [acesso, conjuntoPermissoes],
  );

  // Nome da empresa vem de `vinculos` (não muda com a troca de perfil);
  // permissões e perfil_nome vêm de `acesso`, que é a fonte de verdade da empresa ativa.
  const empresaAtiva = useMemo<EmpresaAtiva | null>(() => {
    if (!acesso) return null;
    const vinculo = vinculos.find((v) => v.empresa_id === acesso.empresa_id);
    return {
      empresa_id: acesso.empresa_id,
      perfil_nome: acesso.perfil_nome,
      is_admin: acesso.is_admin,
      empresa: vinculo?.empresa ?? { razao_social: '', nome_fantasia: null },
    };
  }, [acesso, vinculos]);

  const valor = useMemo<AuthContextValue>(
    () => ({
      session,
      usuarioId,
      perfil,
      vinculos,
      empresaAtiva,
      acesso,
      carregando: !sessaoCarregada || acessoCarregando,
      erro,
      can,
      trocarEmpresa,
      recarregarAcesso,
      entrar,
      sair,
      recuperarSenha,
    }),
    [
      session,
      usuarioId,
      perfil,
      vinculos,
      empresaAtiva,
      acesso,
      sessaoCarregada,
      acessoCarregando,
      erro,
      can,
      trocarEmpresa,
      recarregarAcesso,
      entrar,
      sair,
      recuperarSenha,
    ],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return ctx;
}

/** Atalho para uma checagem única: const podeEditar = usePermissao('cipa', 'editar'); */
export function usePermissao(recurso: string, acao: string) {
  const { can } = useAuth();
  return can(recurso, acao);
}
