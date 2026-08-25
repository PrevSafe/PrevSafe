import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Este endpoint é acionado pelo Vercel Cron (ver vercel.json). Endpoints de
// cron ficam acessíveis por URL pública por padrão, então protegemos com
// CRON_SECRET: a Vercel injeta automaticamente o header
// `Authorization: Bearer ${CRON_SECRET}` em execuções agendadas quando essa
// variável está configurada nas Environment Variables do projeto. IMPORTANTE:
// CRON_SECRET precisa ser configurado manualmente no painel da Vercel — isso
// não pode ser feito por código.
function autorizado(req: VercelRequest): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  const auth = req.headers.authorization ?? '';
  return auth === `Bearer ${segredo}`;
}

type PendenciaRaw = {
  empresa_id: string;
  funcionario_id: string;
  norma_regulamentadora: string;
  nome_treinamento: string;
  situacao: 'ausente' | 'vencido' | 'em_dia';
  data_validade: string | null;
};

function situacaoLabel(situacao: PendenciaRaw['situacao']): string {
  return situacao === 'vencido' ? 'Vencido' : 'Ausente';
}

function formatarData(data: string | null): string {
  if (!data) return '—';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

function montarHtml(nomesPorFuncionario: Map<string, string>, pendencias: PendenciaRaw[]): string {
  const linhas = pendencias
    .map((p) => {
      const nome = nomesPorFuncionario.get(p.funcionario_id) ?? 'Funcionário não encontrado';
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${nome}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${p.nome_treinamento}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${p.norma_regulamentadora}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${situacaoLabel(p.situacao)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${formatarData(p.data_validade)}</td>
      </tr>`;
    })
    .join('');

  return `<div style="font-family:sans-serif;color:#111827;">
    <p>Olá,</p>
    <p>O PrevSafe identificou <strong>${pendencias.length}</strong> pendência(s) de treinamento obrigatório na sua empresa:</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead>
        <tr style="background:#f3f4f6;text-align:left;">
          <th style="padding:6px 10px;">Funcionário</th>
          <th style="padding:6px 10px;">Treinamento</th>
          <th style="padding:6px 10px;">NR</th>
          <th style="padding:6px 10px;">Situação</th>
          <th style="padding:6px 10px;">Validade</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
    <p style="margin-top:16px;">Acesse o PrevSafe para regularizar essas pendências.</p>
  </div>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!autorizado(req)) {
    res.status(401).json({ ok: false, mensagem: 'Não autorizado.' });
    return;
  }

  const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: pendencias, error: erroPendencias } = await supabaseAdmin
    .from('treinamentos_pendencias')
    .select('empresa_id, funcionario_id, norma_regulamentadora, nome_treinamento, situacao, data_validade')
    .in('situacao', ['ausente', 'vencido']);

  if (erroPendencias) {
    console.error('Falha ao buscar treinamentos_pendencias:', erroPendencias);
    res.status(500).json({ ok: false, mensagem: 'Falha ao buscar pendências.' });
    return;
  }

  const lista = (pendencias ?? []) as PendenciaRaw[];

  if (lista.length === 0) {
    res.status(200).json({ empresas_notificadas: 0, emails_enviados: 0, pendencias_total: 0 });
    return;
  }

  // N+1 proposital: uma query por funcionário para pegar o nome. Roda 1x/dia
  // sobre um volume pequeno de pendências, não vale a pena otimizar agora.
  const funcionarioIds = [...new Set(lista.map((p) => p.funcionario_id))];
  const nomesPorFuncionario = new Map<string, string>();
  for (const funcionarioId of funcionarioIds) {
    const { data: funcionario } = await supabaseAdmin
      .from('funcionarios')
      .select('nome')
      .eq('id', funcionarioId)
      .maybeSingle();
    if (funcionario?.nome) nomesPorFuncionario.set(funcionarioId, funcionario.nome);
  }

  const pendenciasPorEmpresa = new Map<string, PendenciaRaw[]>();
  for (const p of lista) {
    const grupo = pendenciasPorEmpresa.get(p.empresa_id) ?? [];
    grupo.push(p);
    pendenciasPorEmpresa.set(p.empresa_id, grupo);
  }

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!resend) {
    console.warn('RESEND_API_KEY não configurada — alertas de treinamento não serão enviados por e-mail.');
  }

  let empresasNotificadas = 0;
  let emailsEnviados = 0;

  for (const [empresaId, pendenciasEmpresa] of pendenciasPorEmpresa) {
    try {
      const emails = await buscarEmailsGestores(supabaseAdmin, empresaId);

      if (emails.length === 0 || !resend) {
        continue;
      }

      const html = montarHtml(nomesPorFuncionario, pendenciasEmpresa);
      let algumEnvioOk = false;

      for (const email of emails) {
        try {
          await resend.emails.send({
            from: process.env.OTP_EMAIL_REMETENTE ?? 'PrevSafe <notificacoes@prevsafe.com.br>',
            to: email,
            subject: `PrevSafe — Treinamentos pendentes (${pendenciasEmpresa.length})`,
            html,
          });
          emailsEnviados += 1;
          algumEnvioOk = true;
        } catch (erroEnvio) {
          console.error(`Falha ao enviar e-mail de treinamentos pendentes para ${email} (empresa ${empresaId}):`, erroEnvio);
        }
      }

      if (algumEnvioOk) empresasNotificadas += 1;
    } catch (erroEmpresa) {
      console.error(`Falha ao processar alerta de treinamentos da empresa ${empresaId}:`, erroEmpresa);
    }
  }

  res.status(200).json({
    empresas_notificadas: empresasNotificadas,
    emails_enviados: emailsEnviados,
    pendencias_total: lista.length,
  });
}

/**
 * E-mails dos gestores (perfis com is_admin) ativos da empresa. Não há FK
 * direta entre usuarios_empresas e profiles (ambos apontam para
 * auth.users), então o PostgREST não embeda profiles automaticamente —
 * mesmo padrão de duas consultas usado em src/lib/acessos.ts
 * (listarVinculos). perfis_acesso já tem FK direta via perfil_id, então
 * esse embed funciona normalmente.
 */
async function buscarEmailsGestores(supabaseAdmin: SupabaseClient, empresaId: string): Promise<string[]> {
  const { data: vinculos, error: erroVinculos } = await supabaseAdmin
    .from('usuarios_empresas')
    .select('usuario_id, perfis_acesso!inner(is_admin)')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .eq('perfis_acesso.is_admin', true);

  if (erroVinculos) {
    console.error(`Falha ao buscar vínculos de gestores da empresa ${empresaId}:`, erroVinculos);
    return [];
  }

  const usuarioIds = [...new Set((vinculos ?? []).map((v) => v.usuario_id as string))];
  if (usuarioIds.length === 0) return [];

  const { data: profiles, error: erroProfiles } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .in('id', usuarioIds)
    .not('email', 'is', null);

  if (erroProfiles) {
    console.error(`Falha ao buscar e-mails dos gestores da empresa ${empresaId}:`, erroProfiles);
    return [];
  }

  const emails = new Set<string>();
  for (const p of profiles ?? []) {
    if (p.email) emails.add(p.email as string);
  }
  return [...emails];
}
