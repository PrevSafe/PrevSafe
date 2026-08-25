import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Acionado pelo Vercel Cron (ver vercel.json). Mesma proteção usada em
// api/cron/treinamentos-vencendo.ts: a Vercel injeta automaticamente o
// header `Authorization: Bearer ${CRON_SECRET}` em execuções agendadas
// quando essa variável está configurada nas Environment Variables do
// projeto. IMPORTANTE: CRON_SECRET precisa ser configurado manualmente no
// painel da Vercel — isso não pode ser feito por código.
function autorizado(req: VercelRequest): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  const auth = req.headers.authorization ?? '';
  return auth === `Bearer ${segredo}`;
}

type PlanoFaturamento = {
  id: string;
  empresa_id: string;
  tipo_cobranca: 'vidas_ativas' | 'por_exame';
  valor_unitario: number;
};

/** Primeiro dia do mês anterior ao mês corrente, no formato YYYY-MM-DD. */
function competenciaMesAnterior(referencia: Date): string {
  const ano = referencia.getUTCFullYear();
  const mes = referencia.getUTCMonth(); // 0-indexado; mês anterior = mes - 1
  const inicioMesAnterior = new Date(Date.UTC(ano, mes - 1, 1));
  return inicioMesAnterior.toISOString().slice(0, 10);
}

/** Primeiro e último dia (YYYY-MM-DD) do mês de uma competência (YYYY-MM-01). */
function limitesDoMes(competencia: string): { inicio: string; fimExclusivo: string } {
  const [ano, mes] = competencia.split('-').map(Number);
  const inicio = new Date(Date.UTC(ano, mes - 1, 1)).toISOString().slice(0, 10);
  const fimExclusivo = new Date(Date.UTC(ano, mes, 1)).toISOString().slice(0, 10);
  return { inicio, fimExclusivo };
}

function arredondar2Casas(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!autorizado(req)) {
    res.status(401).json({ ok: false, mensagem: 'Não autorizado.' });
    return;
  }

  const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: planos, error: erroPlanos } = await supabaseAdmin
    .from('planos_faturamento')
    .select('id, empresa_id, tipo_cobranca, valor_unitario')
    .eq('ativo', true)
    .not('empresa_id', 'is', null);

  if (erroPlanos) {
    console.error('Falha ao buscar planos_faturamento:', erroPlanos);
    res.status(500).json({ ok: false, mensagem: 'Falha ao buscar planos de faturamento.' });
    return;
  }

  const listaPlanos = (planos ?? []) as PlanoFaturamento[];
  const competencia = competenciaMesAnterior(new Date());
  const { inicio, fimExclusivo } = limitesDoMes(competencia);

  let faturasCriadas = 0;
  let faturasAtualizadas = 0;
  let faturasIgnoradasJaProcessadas = 0;

  for (const plano of listaPlanos) {
    try {
      let quantidadeApurada = 0;

      if (plano.tipo_cobranca === 'vidas_ativas') {
        // Situação atual dos funcionários (status = 'ativo' hoje), não a
        // situação histórica do mês de competência — limitação conhecida
        // da v1: não há um snapshot histórico de status por competência.
        const { count, error: erroCount } = await supabaseAdmin
          .from('funcionarios')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', plano.empresa_id)
          .eq('status', 'ativo');

        if (erroCount) throw erroCount;
        quantidadeApurada = count ?? 0;
      } else {
        const { count, error: erroCount } = await supabaseAdmin
          .from('aso_exames')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', plano.empresa_id)
          .gte('data_exame', inicio)
          .lt('data_exame', fimExclusivo);

        if (erroCount) throw erroCount;
        quantidadeApurada = count ?? 0;
      }

      const valorTotal = arredondar2Casas(quantidadeApurada * plano.valor_unitario);

      const { data: faturaExistente, error: erroBusca } = await supabaseAdmin
        .from('faturas')
        .select('id, status')
        .eq('empresa_id', plano.empresa_id)
        .eq('plano_id', plano.id)
        .eq('competencia', competencia)
        .maybeSingle();

      if (erroBusca) throw erroBusca;

      if (!faturaExistente) {
        const { error: erroInsercao } = await supabaseAdmin.from('faturas').insert({
          empresa_id: plano.empresa_id,
          plano_id: plano.id,
          competencia,
          quantidade_apurada: quantidadeApurada,
          valor_total: valorTotal,
          status: 'aberta',
        });

        if (erroInsercao) throw erroInsercao;
        faturasCriadas += 1;
        continue;
      }

      if (faturaExistente.status !== 'aberta') {
        // Fatura já emitida/paga/cancelada: nunca reabrir nem alterar valor.
        faturasIgnoradasJaProcessadas += 1;
        continue;
      }

      const { error: erroAtualizacao } = await supabaseAdmin
        .from('faturas')
        .update({ quantidade_apurada: quantidadeApurada, valor_total: valorTotal })
        .eq('id', faturaExistente.id)
        .eq('status', 'aberta');

      if (erroAtualizacao) throw erroAtualizacao;
      faturasAtualizadas += 1;
    } catch (erroPlano) {
      console.error(`Falha ao apurar fatura do plano ${plano.id} (empresa ${plano.empresa_id}):`, erroPlano);
    }
  }

  res.status(200).json({
    faturas_criadas: faturasCriadas,
    faturas_atualizadas: faturasAtualizadas,
    faturas_ignoradas_ja_processadas: faturasIgnoradasJaProcessadas,
  });
}
