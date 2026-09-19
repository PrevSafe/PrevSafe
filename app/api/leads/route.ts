import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { supabaseUrl } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Recebe os contatos do site publico.
 *
 * O lead entra direto na colecao `leads` do CRM, no mesmo formato que a tela
 * de Leads & Oportunidades ja usa. Nao existe uma "caixa de leads do site"
 * separada de proposito: quem preenche o formulario aparece no mesmo funil de
 * quem veio por indicacao, e segue para Oportunidade e Proposta sem retrabalho.
 *
 * A gravacao usa a service role porque `prevsafe_records` exige vinculo com a
 * organizacao, e o visitante do site nao tem nenhum. Por isso a rota valida
 * tudo o que recebe e nunca devolve dado do banco.
 */

const ORGANIZATION_ID = 'org-prevsafe-01';

/** Envios por IP na janela, antes de recusar. */
const LIMITE_POR_JANELA = 5;
const JANELA_MINUTOS = 30;

function hashIp(ip: string): string {
  // Hash com sal fixo do projeto: serve para contar repeticao, nao para
  // identificar a pessoa. O IP em si nunca e gravado.
  return createHash('sha256').update(`prevsafe-lead:${ip}`).digest('hex');
}

function texto(valor: unknown, max = 200): string {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export async function POST(req: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { ok: false, message: 'Formulário indisponível no momento. Tente pelo WhatsApp.' },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, message: 'Requisição inválida.' }, { status: 400 });
  }

  // Campo isca: fica escondido no formulario. Humano nunca preenche; robo sim.
  // Responde sucesso para o robo nao descobrir que foi barrado.
  if (texto((body as any).website)) {
    return NextResponse.json({ ok: true });
  }

  const nome = texto((body as any).nome, 120);
  const email = texto((body as any).email, 160).toLowerCase();
  const telefone = texto((body as any).telefone, 40);
  const empresa = texto((body as any).empresa, 160);
  const mensagem = texto((body as any).mensagem, 2000);
  const funcionarios = Number((body as any).funcionarios) || undefined;
  const interesse = texto((body as any).interesse, 120);
  const origemPagina = texto((body as any).pagina, 200);
  const utmSource = texto((body as any).utm_source, 80);
  const utmMedium = texto((body as any).utm_medium, 80);
  const utmCampaign = texto((body as any).utm_campaign, 120);

  if (!nome || nome.length < 2) {
    return NextResponse.json({ ok: false, message: 'Informe seu nome.' }, { status: 400 });
  }
  if (!emailValido(email)) {
    return NextResponse.json({ ok: false, message: 'Informe um e-mail válido.' }, { status: 400 });
  }
  if (!telefone || telefone.replace(/\D/g, '').length < 10) {
    return NextResponse.json({ ok: false, message: 'Informe um telefone com DDD.' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    'desconhecido';
  const ipHash = hashIp(ip);
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60_000).toISOString();

  const { count } = await supabase
    .from('site_lead_throttle')
    .select('ip_hash', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('criado_em', desde);

  if ((count ?? 0) >= LIMITE_POR_JANELA) {
    return NextResponse.json(
      { ok: false, message: 'Recebemos vários envios deste acesso. Tente novamente mais tarde ou fale pelo WhatsApp.' },
      { status: 429 }
    );
  }

  const agora = new Date().toISOString();
  const id = `lead-site-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Formato identico ao que a tela de Leads cria, mais o contexto de marketing:
  // sem isso nao da para saber qual pagina ou campanha converteu.
  const lead = {
    id,
    organization_id: ORGANIZATION_ID,
    name: nome,
    company: empresa || 'Não informada',
    email,
    phone: telefone,
    source: 'SITE' as const,
    status: 'NEW' as const,
    estimated_employees: funcionarios,
    notes: [
      interesse ? `Interesse: ${interesse}` : '',
      mensagem ? `Mensagem: ${mensagem}` : '',
    ].filter(Boolean).join('\n'),
    landing_page: origemPagina || undefined,
    utm_source: utmSource || undefined,
    utm_medium: utmMedium || undefined,
    utm_campaign: utmCampaign || undefined,
    created_at: agora,
  };

  const { error } = await supabase.from('prevsafe_records').upsert(
    {
      organization_id: ORGANIZATION_ID,
      collection: 'leads',
      record_id: id,
      data: lead,
      deleted_at: null,
    },
    { onConflict: 'organization_id,collection,record_id' }
  );

  if (error) {
    console.error('[leads] falha ao gravar:', error.message);
    return NextResponse.json(
      { ok: false, message: 'Não foi possível enviar agora. Tente pelo WhatsApp.' },
      { status: 502 }
    );
  }

  await supabase.from('site_lead_throttle').insert({ ip_hash: ipHash });
  await supabase.rpc('site_lead_throttle_limpar');

  return NextResponse.json({ ok: true });
}
