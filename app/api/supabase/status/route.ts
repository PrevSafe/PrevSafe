import { NextResponse } from 'next/server';
import { testSupabaseConnection, SUPABASE_PROJECT_REF, SUPABASE_PROJECT_NAME, supabaseUrl } from '@/lib/supabase';

export async function GET() {
  try {
    const status = await testSupabaseConnection();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      {
        connected: false,
        projectRef: SUPABASE_PROJECT_REF,
        projectName: SUPABASE_PROJECT_NAME,
        supabaseUrl,
        hasAnonKey: false,
        message: error.message || 'Falha ao verificar conexão com o Supabase',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
