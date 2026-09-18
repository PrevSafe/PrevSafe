#!/usr/bin/env node
/**
 * Restauracao de um backup do PrevSafe.
 *
 *   node scripts/restore.mjs <arquivo.json> [--wipe] [--yes]
 *
 * --wipe  apaga os registros da organizacao antes de restaurar. Sem isto a
 *         restauracao e um merge: o que esta no backup sobrescreve, o que foi
 *         criado depois permanece.
 * --yes   nao pergunta. Use com cuidado.
 *
 * Restaura tambem as linhas com deleted_at: sem elas, catalogos que o usuario
 * apagou de proposito voltariam a aparecer depois da restauracao.
 *
 * As fotos do bucket nao sao restauradas por aqui - o backup guarda o
 * inventario delas, usado no fim para apontar o que estiver faltando.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const wipe = args.includes('--wipe');
const assumeYes = args.includes('--yes');

if (!file) {
  console.error('Uso: node scripts/restore.mjs <arquivo.json> [--wipe] [--yes]');
  process.exit(1);
}

function loadEnv() {
  const envPath = path.resolve('.env.local');
  const parsed = fs.existsSync(envPath)
    ? Object.fromEntries(
        fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
          .filter(l => l.includes('=') && !l.trim().startsWith('#'))
          .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
      )
    : {};
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || parsed.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || parsed.SUPABASE_SERVICE_ROLE_KEY,
  };
}

const { url, key } = loadEnv();
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
if (backup.formato !== 'prevsafe-backup/v1') {
  console.error(`Formato desconhecido: ${backup.formato}`);
  process.exit(1);
}

const records = backup.prevsafe_records || [];
const members = backup.prevsafe_members || [];
const orgs = [...new Set(records.map(r => r.organization_id))];

console.log(`Backup de ${backup.gerado_em}`);
console.log(`  registros: ${records.length} | vinculos: ${members.length}`);
console.log(`  organizacoes: ${orgs.join(', ') || '(nenhuma)'}`);
console.log(`  modo: ${wipe ? 'WIPE (apaga antes de restaurar)' : 'merge (sobrescreve o que coincidir)'}`);

if (!assumeYes) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(res => rl.question('\nConfirma a restauracao? (digite SIM) ', res));
  rl.close();
  if (answer.trim().toUpperCase() !== 'SIM') {
    console.log('Cancelado.');
    process.exit(0);
  }
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

try {
  if (wipe) {
    for (const org of orgs) {
      const { error } = await supabase.from('prevsafe_records').delete().eq('organization_id', org);
      if (error) throw new Error(`limpeza de ${org}: ${error.message}`);
      console.log(`  limpo: ${org}`);
    }
  }

  let written = 0;
  for (const batch of chunk(records, 200)) {
    const { error } = await supabase.from('prevsafe_records').upsert(
      batch.map(r => ({
        organization_id: r.organization_id,
        collection: r.collection,
        record_id: r.record_id,
        data: r.data,
        deleted_at: r.deleted_at,
      })),
      { onConflict: 'organization_id,collection,record_id' }
    );
    if (error) throw new Error(`gravacao: ${error.message}`);
    written += batch.length;
  }

  for (const batch of chunk(members, 200)) {
    const { error } = await supabase.from('prevsafe_members').upsert(batch, { onConflict: 'auth_user_id,organization_id' });
    // Um vinculo cujo usuario nao existe mais no Auth falha na FK: e esperado
    // apos restaurar num projeto novo, e nao invalida o resto.
    if (error) console.warn(`  aviso nos vinculos: ${error.message}`);
  }

  console.log(`\nRestaurados ${written} registros e ${members.length} vinculos.`);

  const inventario = backup.evidencias_inventario || [];
  if (inventario.length > 0) {
    const { data: atuais } = await supabase.storage.from('prevsafe-evidencias').list(orgs[0] || '', { limit: 1000 });
    console.log(`\nEvidencias no backup: ${inventario.length}. As imagens ficam no bucket e nao sao restauradas por este script.`);
    if (!atuais || atuais.length === 0) {
      console.log('  Atencao: o bucket esta vazio. As fotos precisam ser recuperadas do backup do Storage.');
    }
  }
  // Ver a nota em backup.mjs sobre nao chamar process.exit no caminho de
  // sucesso: no Windows isso mascara o codigo de retorno.
} catch (err) {
  console.error(`\nFALHA na restauracao: ${err.message}`);
  process.exitCode = 1;
}
