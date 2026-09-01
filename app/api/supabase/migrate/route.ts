import { NextRequest, NextResponse } from 'next/server';
import { supabaseUrl, SUPABASE_PROJECT_REF, SUPABASE_PROJECT_NAME } from '@/lib/supabase';
import { SUPABASE_MIGRATIONS } from '@/lib/supabaseSchema';

export async function GET() {
  return NextResponse.json({
    projectRef: SUPABASE_PROJECT_REF,
    projectName: SUPABASE_PROJECT_NAME,
    migrations: SUPABASE_MIGRATIONS.map(m => ({
      version: m.version,
      name: m.name,
      description: m.description,
      statementsCount: m.sql.split(';').filter(s => s.trim().length > 0).length,
    }))
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const serviceRoleKey = body.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json({
        success: false,
        message: 'SUPABASE_SERVICE_ROLE_KEY não configurada. Você pode executar o script SQL diretamente no SQL Editor do Supabase ou fornecer a chave de serviço.',
        cliInstructions: `supabase link --project-ref ${SUPABASE_PROJECT_REF}\nsupabase db push`,
        migrations: SUPABASE_MIGRATIONS.map(m => ({
          version: m.version,
          name: m.name,
          sql: m.sql
        }))
      }, { status: 400 });
    }

    // If service role key is provided, attempt execution via Supabase SQL endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: SUPABASE_MIGRATIONS.map(m => m.sql).join('\n\n')
      }),
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: `Todas as ${SUPABASE_MIGRATIONS.length} migrations foram executadas com sucesso no projeto ${SUPABASE_PROJECT_NAME}!`,
        executedMigrations: SUPABASE_MIGRATIONS.map(m => m.name)
      });
    } else {
      const errText = await response.text();
      return NextResponse.json({
        success: false,
        message: `Não foi possível executar automaticamente via RPC (exec_sql não habilitado no Supabase). Copie e execute o script SQL das migrations no SQL Editor do Supabase ou utilize a CLI com "supabase db push".`,
        details: errText,
        cliCommand: `supabase db push`,
        migrations: SUPABASE_MIGRATIONS
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: `Erro ao processar migration: ${error.message}`,
    }, { status: 500 });
  }
}
