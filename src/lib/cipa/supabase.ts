/**
 * ADAPTADOR — único ponto de acoplamento do módulo CIPA com o resto do PrevSafe.
 * O PrevSafe é um SPA (Vite + React Router), sem servidor próprio: não existe
 * cookie de sessão para ler no backend, então "servidor" aqui significa apenas
 * "o client do browser já autenticado, com RLS decidindo o que ele vê".
 */
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/** Sessão da comissão. Mantido `async` para não exigir editar cada `await supabaseServidor()`. */
export async function supabaseServidor() {
  return supabase;
}

/**
 * Cliente SEM sessão, para as RPCs públicas do eleitor.
 * Usado pelas páginas /v e /q e pela function /api/cipa/votar.
 */
export function supabaseAnonimo() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
