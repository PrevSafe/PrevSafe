#!/usr/bin/env node
/**
 * Backup dos dados do PrevSafe.
 *
 * Exporta tudo que a aplicacao grava - registros, vinculos de usuario e a
 * listagem das evidencias fotograficas - para um JSON com data no nome.
 *
 * Por que existe, se o Supabase ja faz backup: no plano gratuito a retencao e
 * curta e nao ha restauracao para um ponto no tempo. Para dados de SST, que
 * sustentam documentos com valor legal, uma copia propria fora da plataforma
 * vale o pouco que custa.
 *
 * Inclui as linhas com deleted_at preenchido: elas sao a diferenca entre
 * "colecao nunca usada" e "colecao esvaziada de proposito", e sem elas uma
 * restauracao traria de volta catalogos que o usuario apagou.
 *
 *   node scripts/backup.mjs [--out <pasta>] [--keep <n>]
 *
 * --out   pasta de destino (padrao: ./backups)
 * --keep  quantos backups manter, os mais antigos sao apagados (padrao: 30)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const outDir = path.resolve(argValue('--out', 'backups'));
const keep = Number(argValue('--keep', '30'));

function loadEnv() {
  const fromProcess = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  if (fromProcess.url && fromProcess.key) return fromProcess;

  // Em execucao manual na maquina do desenvolvedor, le do .env.local.
  const envPath = path.resolve('.env.local');
  if (!fs.existsSync(envPath)) return fromProcess;

  const parsed = Object.fromEntries(
    fs.readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .filter(l => l.includes('=') && !l.trim().startsWith('#'))
      .map(l => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      })
  );
  return {
    url: fromProcess.url || parsed.NEXT_PUBLIC_SUPABASE_URL,
    key: fromProcess.key || parsed.SUPABASE_SERVICE_ROLE_KEY,
  };
}

const { url, key } = loadEnv();
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (no ambiente ou em .env.local).');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

/** Pagina a leitura: uma organizacao ativa passa do limite de linhas por resposta. */
async function fetchAll(table, select) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

/** Percorre o bucket recursivamente: o caminho e <org>/<os>/<arquivo>. */
async function listEvidence(prefix = '', depth = 0) {
  if (depth > 3) return [];
  const { data, error } = await supabase.storage.from('prevsafe-evidencias').list(prefix, { limit: 1000 });
  if (error) return [];
  const out = [];
  for (const entry of data || []) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id) {
      out.push({ path: full, size: entry.metadata?.size ?? null, created_at: entry.created_at ?? null });
    } else {
      out.push(...await listEvidence(full, depth + 1));
    }
  }
  return out;
}

function rotate() {
  if (!Number.isFinite(keep) || keep <= 0) return;
  const files = fs.readdirSync(outDir)
    .filter(f => /^prevsafe-backup-.*\.json$/.test(f))
    .sort();
  const excess = files.length - keep;
  for (let i = 0; i < excess; i++) {
    fs.unlinkSync(path.join(outDir, files[i]));
    console.log(`  removido backup antigo: ${files[i]}`);
  }
}

try {
  console.log('Lendo dados do Supabase...');
  const [records, members, evidence] = await Promise.all([
    fetchAll('prevsafe_records', 'organization_id, collection, record_id, data, updated_at, updated_by, deleted_at'),
    fetchAll('prevsafe_members', 'auth_user_id, organization_id, role, created_at'),
    listEvidence(),
  ]);

  const byCollection = {};
  for (const r of records) {
    byCollection[r.collection] = (byCollection[r.collection] || 0) + (r.deleted_at ? 0 : 1);
  }

  const backup = {
    formato: 'prevsafe-backup/v1',
    gerado_em: new Date().toISOString(),
    projeto: url,
    resumo: {
      registros_totais: records.length,
      registros_vivos: records.filter(r => !r.deleted_at).length,
      vinculos: members.length,
      evidencias: evidence.length,
      por_colecao: byCollection,
    },
    // As fotos em si ficam no bucket; aqui vai o inventario, para conferir
    // depois de uma restauracao se algum arquivo se perdeu.
    prevsafe_records: records,
    prevsafe_members: members,
    evidencias_inventario: evidence,
  };

  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const file = path.join(outDir, `prevsafe-backup-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2), 'utf8');

  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log(`\nBackup gravado: ${file} (${kb} KB)`);
  console.log(`  registros vivos: ${backup.resumo.registros_vivos} de ${records.length}`);
  console.log(`  vinculos: ${members.length} | evidencias: ${evidence.length}`);

  rotate();
  // Sem process.exit(0) aqui: no Windows, sair com escrita ainda pendente no
  // stdout faz o node terminar com 0xC0000409, e o Agendador de Tarefas
  // registra isso como falha mesmo tendo gravado o backup. Deixar o processo
  // encerrar sozinho devolve 0 e torna o codigo de retorno confiavel.
} catch (err) {
  console.error(`\nFALHA no backup: ${err.message}`);
  process.exitCode = 1;
}
