import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase project constants for Prev Workflow
export const SUPABASE_PROJECT_REF = 'dnmbwsvdyskbbfvribkb';
export const SUPABASE_PROJECT_NAME = 'Prev Workflow';
export const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns the initialized Supabase client singleton
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined' && !supabaseAnonKey) {
    // In server environment without key
    return null;
  }

  if (!supabaseInstance && supabaseUrl) {
    supabaseInstance = createClient(
      supabaseUrl, 
      supabaseAnonKey || 'placeholder-anon-key-for-initialization',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
  }

  return supabaseInstance;
}

export interface SupabaseConnectionStatus {
  connected: boolean;
  projectRef: string;
  projectName: string;
  supabaseUrl: string;
  hasAnonKey: boolean;
  message: string;
  timestamp: string;
}

/**
 * Checks connection status against the Supabase project
 */
export async function testSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  const timestamp = new Date().toISOString();
  const hasAnonKey = Boolean(supabaseAnonKey && supabaseAnonKey.length > 10 && supabaseAnonKey !== 'placeholder-anon-key-for-initialization');

  try {
    // Ping the Supabase health or rest endpoint
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey || 'anon',
        'Authorization': `Bearer ${supabaseAnonKey || 'anon'}`,
      },
      cache: 'no-store',
    });

    if (res.status === 200 || res.status === 401 || res.status === 404) {
      // Endpoint is reachable
      if (hasAnonKey) {
        return {
          connected: true,
          projectRef: SUPABASE_PROJECT_REF,
          projectName: SUPABASE_PROJECT_NAME,
          supabaseUrl,
          hasAnonKey: true,
          message: `Conectado com sucesso ao projeto ${SUPABASE_PROJECT_NAME} (${SUPABASE_PROJECT_REF}).`,
          timestamp,
        };
      } else {
        return {
          connected: true,
          projectRef: SUPABASE_PROJECT_REF,
          projectName: SUPABASE_PROJECT_NAME,
          supabaseUrl,
          hasAnonKey: false,
          message: `Endpoint alcançado em ${supabaseUrl}. Chave anon/service_role pronta para ser configurada nas variáveis de ambiente.`,
          timestamp,
        };
      }
    }

    return {
      connected: false,
      projectRef: SUPABASE_PROJECT_REF,
      projectName: SUPABASE_PROJECT_NAME,
      supabaseUrl,
      hasAnonKey,
      message: `Resposta inesperada do endpoint Supabase (${res.status}): ${res.statusText}`,
      timestamp,
    };
  } catch (err: any) {
    return {
      connected: false,
      projectRef: SUPABASE_PROJECT_REF,
      projectName: SUPABASE_PROJECT_NAME,
      supabaseUrl,
      hasAnonKey,
      message: `Erro ao conectar com ${supabaseUrl}: ${err.message || 'Falha de rede'}`,
      timestamp,
    };
  }
}
