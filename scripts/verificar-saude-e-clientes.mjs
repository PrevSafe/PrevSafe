/**
 * Dado de saude so para o papel Saude, e conta de cliente so na propria
 * empresa.
 *
 *   node scripts/verificar-saude-e-clientes.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * Resultado de exame, observacao clinica e restricao do ASO ficavam dentro do
 * cadastro do funcionario (employees), que toda conta da organizacao le pela
 * API. E as contas de cliente (CLIENTE_ADMIN, CLIENTE_USER) liam os registros
 * de todos os clientes da consultoria. A correcao tem quatro pernas, e cada
 * uma e conferida aqui:
 *
 *   1. o resultado nao fica mais em employees (tipos, gravacao, S-2220);
 *   2. quem nao tem o papel nao o ve na interface ("resultado restrito ao papel
 *      Saude", nunca um campo vazio);
 *   3. o portal e a sincronizacao da conta de cliente ficam na empresa dela;
 *   4. a migracao SQL tem as politicas certas - procuradas pela FORMA do
 *      defeito no SQL (a politica que so confere a organizacao, o GESTOR na
 *      lista de examResults, o ramo do cliente depois do "return true"), e nao
 *      pela palavra.
 *
 * Os detectores de SQL sao testados antes contra trechos defeituosos; se nao
 * acusarem o defeito conhecido, o resultado e INCONCLUSIVO.
 *
 * Saida: 0 tudo passou, 1 houve falha, 2 INCONCLUSIVO.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..'
);
const TMP = path.join(RAIZ, '.tmp-saude-clientes-verificacao');
const MIGRACAO = 'supabase/migrations/20261005120000_papel_saude_e_isolamento_de_clientes.sql';
const ROLLBACK = 'supabase/rollback/20261005120000_papel_saude_e_isolamento_de_clientes.sql';
const TESTE_SQL = 'supabase/testes/rls_saude_e_clientes.sql';

function inconclusivo(motivo, detalhe) {
  console.log('\nINCONCLUSIVO — a verificação não pôde ser executada.');
  console.log(`motivo: ${motivo}`);
  if (detalhe) console.log(String(detalhe).split('\n').slice(0, 20).join('\n'));
  process.exit(2);
}

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

const ler = (rel) => {
  const alvo = path.join(RAIZ, rel);
  if (!fs.existsSync(alvo)) inconclusivo(`${rel} não encontrado`);
  return fs.readFileSync(alvo, 'utf8').replace(/\r\n/g, '\n');
};
/** Sem comentarios, para a explicacao do defeito nao contar como o defeito. */
const semComentarios = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');
const semComentariosSql = (txt) => txt.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, '');
const compacto = (t) => t.replace(/\s+/g, ' ');

/** Indice do fechamento que casa com a abertura em `inicio`. -1 se nao fechar. */
function fechamento(txt, inicio) {
  const abre = txt[inicio];
  const fecha = { '(': ')', '{': '}', '[': ']' }[abre];
  let nivel = 0;
  for (let i = inicio; i < txt.length; i++) {
    if (txt[i] === abre) nivel++;
    else if (txt[i] === fecha && --nivel === 0) return i;
  }
  return -1;
}
/** Os argumentos de cada chamada `nome(` no texto. */
function chamadas(txt, nome) {
  const saida = [];
  const re = new RegExp(`\\b${nome}\\s*\\(`, 'g');
  for (const m of txt.matchAll(re)) {
    const abre = m.index + m[0].length - 1;
    const fim = fechamento(txt, abre);
    if (fim > 0) saida.push(txt.slice(abre + 1, fim));
  }
  return saida;
}

// ===========================================================================
// Compilacao dos modulos puros
// ===========================================================================
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));
fs.writeFileSync(path.join(TMP, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    outDir: TMP, module: 'commonjs', target: 'es2020', moduleResolution: 'node',
    esModuleInterop: true, skipLibCheck: true, baseUrl: RAIZ, paths: { '@/*': ['./*'] },
  },
  files: ['lib/acessoPorPapel.ts', 'lib/resultadosDeExame.ts', 'lib/esocialDados.ts'].map((f) => path.join(RAIZ, f)),
}));
try {
  execFileSync('npx', ['tsc', '-p', path.join(TMP, 'tsconfig.json')], { stdio: 'pipe', shell: true, cwd: RAIZ });
} catch (e) {
  inconclusivo('npx tsc falhou', e.stdout?.toString() || e.message);
}
for (const dir of [path.join(TMP, 'lib'), TMP]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const alvo = path.join(dir, f);
    fs.writeFileSync(alvo, fs.readFileSync(alvo, 'utf8').replace(/require\("@\/lib\/([^"]+)"\)/g, 'require("./$1")'));
  }
}
fs.writeFileSync(path.join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }));
const achar = (n) => [path.join(TMP, 'lib', n), path.join(TMP, n)].find((p) => fs.existsSync(p));
const require_ = createRequire(path.join(RAIZ, 'scripts', 'x.cjs'));
let A, R, E;
try {
  A = require_(achar('acessoPorPapel.js'));
  R = require_(achar('resultadosDeExame.js'));
  E = require_(achar('esocialDados.js'));
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', e.message);
}

// ===========================================================================
// Detectores de SQL, e o autoteste deles
// ===========================================================================
/** A decisao: quem le resultado de exame, e quem le as colecoes de saude. */
const DECISAO = { resultados: ['ADMIN', 'SAUDE'], saude: ['ADMIN', 'GESTOR', 'SAUDE'] };
/** Corpo ($$ ... $$) de uma funcao da migracao. */
function corpoDaFuncao(sql, nome) {
  const i = sql.search(new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${nome}\\s*\\(`, 'i'));
  if (i < 0) return null;
  const abre = sql.indexOf('$$', i);
  const fecha = sql.indexOf('$$', abre + 2);
  return abre < 0 || fecha < 0 ? null : sql.slice(abre + 2, fecha);
}
/** Texto (compactado) de cada `create policy` sobre a tabela, por nome. */
function politicas(sql, tabela) {
  const saida = {};
  const re = new RegExp(`create\\s+policy\\s+(\\w+)\\s+on\\s+${tabela.replace('.', '\\.')}\\b([^;]*);`, 'gi');
  for (const m of sql.matchAll(re)) saida[m[1]] = compacto(m[2]);
  return saida;
}
/**
 * Defeitos nas politicas de prevsafe_records. Cada um e a forma que o defeito
 * teria no SQL, nao a palavra que o descreve.
 */
function defeitosDasPoliticas(pols) {
  const d = [];
  const esperadas = { prevsafe_records_select: 'select', prevsafe_records_insert: 'insert', prevsafe_records_update: 'update', prevsafe_records_delete: 'delete' };
  for (const [nome, op] of Object.entries(esperadas)) {
    const p = pols[nome];
    if (!p) { d.push(`${nome} ausente`); continue; }
    if (!new RegExp(`\\bfor\\s+${op}\\b`, 'i').test(p)) d.push(`${nome} nao e for ${op}`);
    if (!/\bto\s+authenticated\b/i.test(p)) d.push(`${nome} sem "to authenticated" (vale para public)`);
    if (/\(\s*true\s*\)/i.test(p)) d.push(`${nome} com (true)`);
    // So pertencer a organizacao: o defeito original.
    if (/exists\s*\(\s*select\s+1\s+from\s+public\.prevsafe_members/i.test(p)) d.push(`${nome} so confere a organizacao`);
    if (/prevsafe_pode_acessar\s*\(/i.test(p)) d.push(`${nome} usa a regra antiga (so organizacao e colecoes de saude)`);
    if (op === 'select') {
      if (!/using\s*\(\s*public\.prevsafe_pode_ler\s*\(\s*organization_id\s*,\s*collection\s*,\s*record_id\s*,\s*data\s*,\s*updated_by\s*\)\s*\)/i.test(p)) {
        d.push(`${nome} nao usa prevsafe_pode_ler(organization_id, collection, record_id, data, updated_by)`);
      }
    } else {
      const operacao = op.toUpperCase();
      const chamada = new RegExp(`public\\.prevsafe_pode_gravar\\s*\\(\\s*organization_id\\s*,\\s*collection\\s*,\\s*record_id\\s*,\\s*data\\s*,\\s*updated_by\\s*,\\s*'${operacao}'\\s*\\)`, 'gi');
      const vezes = (p.match(chamada) || []).length;
      const outra = /prevsafe_pode_gravar\s*\([^)]*'(INSERT|UPDATE|DELETE)'/gi;
      const operacoes = [...p.matchAll(outra)].map((m) => m[1].toUpperCase());
      if (vezes === 0 || operacoes.some((o) => o !== operacao)) d.push(`${nome} nao confere a gravacao como '${operacao}'`);
      if (op === 'update' && !(/\busing\s*\(/i.test(p) && /\bwith\s+check\s*\(/i.test(p) && vezes === 2)) {
        d.push(`${nome} sem using e with check (a linha poderia ser movida para outro cliente)`);
      }
    }
  }
  return d;
}
/** Papeis da lista `v_papel in (...)` que segue a condicao dada, no corpo da funcao. */
function papeisDoRamo(corpo, condicao) {
  const i = corpo.search(condicao);
  if (i < 0) return null;
  const m = corpo.slice(i).match(/return\s+v_papel\s+in\s*\(([^)]*)\)/i);
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort() : null;
}
/** Defeitos na funcao de leitura/gravacao: a ordem dos ramos e os papeis de cada um. */
function defeitosDaRegra(corpo, nome, esperado = DECISAO) {
  const d = [];
  if (!corpo) return [`${nome} ausente`];
  const iCliente = corpo.search(/if\s+public\.prevsafe_papel_de_cliente\s*\(\s*v_papel\s*\)/i);
  const iTrue = corpo.search(/return\s+true\s*;/i);
  if (iCliente < 0) d.push(`${nome} sem o ramo da conta de cliente`);
  else if (iTrue >= 0 && iTrue < iCliente) d.push(`${nome}: o "return true" da equipe vem antes do ramo do cliente`);
  if (!/where\s+m\.auth_user_id\s*=\s*auth\.uid\(\)\s+and\s+m\.organization_id\s*=\s*org/i.test(corpo)) d.push(`${nome} nao amarra o vinculo ao usuario e a organizacao`);
  if (!/if\s+not\s+found\s+then\s+return\s+false/i.test(corpo)) d.push(`${nome}: sem vinculo nao recusa`);
  const resultados = papeisDoRamo(corpo, /prevsafe_colecao_de_resultado_de_exame\s*\(\s*colecao\s*\)/i);
  if (JSON.stringify(resultados) !== JSON.stringify([...esperado.resultados].sort())) d.push(`${nome}: examResults para ${resultados}`);
  const saude = papeisDoRamo(corpo, /prevsafe_colecao_de_saude\s*\(\s*colecao\s*\)/i);
  if (JSON.stringify(saude) !== JSON.stringify([...esperado.saude].sort())) d.push(`${nome}: colecoes de saude para ${saude}`);
  const iRes = corpo.search(/prevsafe_colecao_de_resultado_de_exame\s*\(/i);
  if (iTrue >= 0 && iRes >= 0 && iTrue < iRes) d.push(`${nome}: o "return true" vem antes do ramo de examResults`);
  return d;
}
/** Colecoes do CASE do portal, e o que cada ramo exige. */
function ramosDoPortal(corpo) {
  const ramos = {};
  for (const m of (corpo || '').matchAll(/when\s+'(\w+)'\s+then\s+([\s\S]*?)(?=\bwhen\s+'|\belse\b)/gi)) ramos[m[1]] = compacto(m[2]).trim();
  return ramos;
}
function defeitosDoPortalLeitura(corpo) {
  const d = [];
  if (!corpo) return ['prevsafe_portal_pode_ler ausente'];
  if (!/select\s+cliente\s+is\s+not\s+null\s+and\s+case\s+colecao/i.test(corpo)) d.push('portal: sem client_id no vinculo a leitura nao falha fechada');
  if (!/\belse\s+false\b/i.test(corpo)) d.push('portal: colecao fora da lista nao cai em false');
  const ramos = ramosDoPortal(corpo);
  const lista = Object.keys(ramos).sort();
  const esperada = Object.keys(A.COLECOES_DO_PORTAL).sort();
  if (JSON.stringify(lista) !== JSON.stringify(esperada)) d.push(`portal le ${lista.join(',')} (esperado ${esperada.join(',')})`);
  for (const [colecao, cond] of Object.entries(ramos)) {
    if (colecao === 'organization') continue;
    const restrito = /dados->>'client_id'\s*=\s*cliente/.test(cond) || /registro\s*=\s*cliente/.test(cond)
      || /autor\s*=\s*auth\.uid\(\)/.test(cond) || /dados->>'auth_user_id'\s*=\s*auth\.uid\(\)::text/.test(cond);
    if (!restrito || /^true$/i.test(cond)) d.push(`portal: ${colecao} sem filtro pelo cliente ou pelo autor (${cond})`);
  }
  if (ramos.documents && !/is_client_released'\s*=\s*'true'/.test(ramos.documents)) d.push('portal: documento nao liberado ao cliente aparece');
  if (ramos.clients && !/registro\s*=\s*cliente/.test(ramos.clients)) d.push('portal: clients sem ser o proprio registro');
  return d;
}
function defeitosDoPortalGravacao(corpo) {
  const d = [];
  if (!corpo) return ['prevsafe_portal_pode_gravar ausente'];
  if (!/select\s+cliente\s+is\s+not\s+null\s+and\s+case/i.test(corpo)) d.push('portal: sem client_id no vinculo a gravacao nao falha fechada');
  const ramos = [...corpo.matchAll(/when\s+colecao\s+(?:in\s*\(([^)]*)\)|=\s*'(\w+)')\s+then\s+([\s\S]*?)(?=\bwhen\s+colecao|\belse\b)/gi)]
    .map((m) => ({ colecoes: (m[1] ? [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1]) : [m[2]]), cond: compacto(m[3]) }));
  const modo = {};
  for (const r of ramos) {
    const soInclui = /operacao\s*=\s*'INSERT'/.test(r.cond) && !/'UPDATE'/.test(r.cond);
    const edita = /operacao\s+in\s*\(\s*'INSERT'\s*,\s*'UPDATE'\s*\)/.test(r.cond);
    if (/'DELETE'/.test(r.cond)) d.push(`portal: ${r.colecoes} aceita DELETE`);
    if (!/dados->>'client_id'\s*=\s*cliente/.test(r.cond) && !/autor\s*=\s*auth\.uid\(\)/.test(r.cond)) d.push(`portal: gravacao em ${r.colecoes} sem filtro`);
    r.colecoes.forEach((c) => { modo[c] = edita ? 'EDICAO' : soInclui ? 'INCLUSAO' : '?'; });
  }
  const esperado = Object.fromEntries(Object.entries(A.COLECOES_DO_PORTAL).filter(([, m]) => m !== 'LEITURA'));
  if (JSON.stringify(Object.keys(modo).sort().map((k) => `${k}:${modo[k]}`)) !== JSON.stringify(Object.keys(esperado).sort().map((k) => `${k}:${esperado[k]}`))) {
    d.push(`portal grava ${JSON.stringify(modo)} (esperado ${JSON.stringify(esperado)})`);
  }
  return d;
}

console.log('\n--- 0. Autoteste dos detectores de SQL ---');
{
  const BOA = `create policy prevsafe_records_select on public.prevsafe_records for select to authenticated
      using (public.prevsafe_pode_ler(organization_id, collection, record_id, data, updated_by));
    create policy prevsafe_records_insert on public.prevsafe_records for insert to authenticated
      with check (public.prevsafe_pode_gravar(organization_id, collection, record_id, data, updated_by, 'INSERT'));
    create policy prevsafe_records_update on public.prevsafe_records for update to authenticated
      using (public.prevsafe_pode_gravar(organization_id, collection, record_id, data, updated_by, 'UPDATE'))
      with check (public.prevsafe_pode_gravar(organization_id, collection, record_id, data, updated_by, 'UPDATE'));
    create policy prevsafe_records_delete on public.prevsafe_records for delete to authenticated
      using (public.prevsafe_pode_gravar(organization_id, collection, record_id, data, updated_by, 'DELETE'));`;
  if (defeitosDasPoliticas(politicas(BOA, 'public.prevsafe_records')).length) {
    inconclusivo('o detector acusou as políticas corretas', defeitosDasPoliticas(politicas(BOA, 'public.prevsafe_records')).join('\n'));
  }
  const DEFEITUOSAS = {
    'a politica original, so pela organizacao': BOA.replace(/using \(public\.prevsafe_pode_ler\([^;]*\)\);/,
      `using (exists (select 1 from public.prevsafe_members m where m.auth_user_id = auth.uid() and m.organization_id = prevsafe_records.organization_id));`),
    'a regra de 20260921 (organizacao + colecoes de saude)': BOA.replace(/using \(public\.prevsafe_pode_ler\([^;]*\)\);/,
      'using (public.prevsafe_pode_acessar(organization_id, collection));'),
    'sem "to authenticated"': BOA.replace('for select to authenticated', 'for select'),
    'update sem with check': BOA.replace(/\n\s*with check \(public\.prevsafe_pode_gravar\(organization_id, collection, record_id, data, updated_by, 'UPDATE'\)\);/, ';'),
    'insert conferido como UPDATE': BOA.replace("updated_by, 'INSERT'", "updated_by, 'UPDATE'"),
    'delete com (true)': BOA.replace(/for delete to authenticated\s+using \([^;]*;/, 'for delete to authenticated using (true);'),
  };
  for (const [nome, sql] of Object.entries(DEFEITUOSAS)) {
    if (defeitosDasPoliticas(politicas(sql, 'public.prevsafe_records')).length === 0) inconclusivo(`o detector não acusou: ${nome}`);
  }

  const REGRA_BOA = `select upper(btrim(coalesce(m.role, ''))) into v_papel, v_cliente from public.prevsafe_members m
    where m.auth_user_id = auth.uid() and m.organization_id = org;
    if not found then return false; end if;
    if public.prevsafe_papel_de_cliente(v_papel) then return x; end if;
    if public.prevsafe_colecao_de_resultado_de_exame(colecao) then return v_papel in ('ADMIN', 'SAUDE'); end if;
    if public.prevsafe_colecao_de_saude(colecao) then return v_papel in ('ADMIN', 'GESTOR', 'SAUDE'); end if;
    return true;`;
  if (defeitosDaRegra(REGRA_BOA, 'regra').length) inconclusivo('o detector acusou a regra correta', defeitosDaRegra(REGRA_BOA, 'regra').join('\n'));
  const REGRAS_RUINS = {
    'GESTOR lendo examResults': REGRA_BOA.replace("in ('ADMIN', 'SAUDE')", "in ('ADMIN', 'GESTOR', 'SAUDE')"),
    'ramo do cliente depois do "return true"': REGRA_BOA.replace('if public.prevsafe_papel_de_cliente(v_papel) then return x; end if;', '')
      .replace('return true;', 'return true;\n if public.prevsafe_papel_de_cliente(v_papel) then return x; end if;'),
    'sem o ramo do cliente': REGRA_BOA.replace('if public.prevsafe_papel_de_cliente(v_papel) then return x; end if;', ''),
    'sem recusar quem nao tem vinculo': REGRA_BOA.replace('if not found then return false; end if;', ''),
    'SAUDE fora das colecoes de saude': REGRA_BOA.replace("in ('ADMIN', 'GESTOR', 'SAUDE')", "in ('ADMIN', 'GESTOR')"),
  };
  for (const [nome, corpo] of Object.entries(REGRAS_RUINS)) {
    if (defeitosDaRegra(corpo, 'regra').length === 0) inconclusivo(`o detector não acusou: ${nome}`);
  }

  const PORTAL_BOM = `select cliente is not null and case colecao
    when 'organization' then true when 'clients' then registro = cliente
    when 'profiles' then dados->>'auth_user_id' = auth.uid()::text
    when 'contracts' then dados->>'client_id' = cliente when 'serviceOrders' then dados->>'client_id' = cliente
    when 'requests' then dados->>'client_id' = cliente when 'evaluations' then dados->>'client_id' = cliente
    when 'sstSignatures' then dados->>'client_id' = cliente
    when 'documents' then dados->>'client_id' = cliente and dados->>'is_client_released' = 'true'
    when 'auditLogs' then autor = auth.uid() when 'notifications' then autor = auth.uid() else false end;`;
  if (defeitosDoPortalLeitura(PORTAL_BOM).length) inconclusivo('o detector acusou o portal correto', defeitosDoPortalLeitura(PORTAL_BOM).join('\n'));
  const PORTAIS_RUINS = {
    'funcionarios no portal': PORTAL_BOM.replace("else false", "when 'employees' then dados->>'client_id' = cliente else false"),
    'OS de todos os clientes': PORTAL_BOM.replace("when 'serviceOrders' then dados->>'client_id' = cliente", "when 'serviceOrders' then true"),
    'documento em rascunho': PORTAL_BOM.replace(" and dados->>'is_client_released' = 'true'", ''),
    'sem client_id no vinculo, le assim mesmo': PORTAL_BOM.replace('cliente is not null and ', ''),
    'colecao fora da lista liberada': PORTAL_BOM.replace('else false', 'else true'),
  };
  for (const [nome, corpo] of Object.entries(PORTAIS_RUINS)) {
    if (defeitosDoPortalLeitura(corpo).length === 0) inconclusivo(`o detector não acusou: ${nome}`);
  }
  check(true, `os detectores acusam ${Object.keys(DEFEITUOSAS).length + Object.keys(REGRAS_RUINS).length + Object.keys(PORTAIS_RUINS).length} formas de defeito e não acusam o SQL correto`);
}

// ===========================================================================
// 1. A migracao SQL
// ===========================================================================
console.log('\n--- 1. Migração SQL ---');
const sqlBruto = ler(MIGRACAO);
const sql = semComentariosSql(sqlBruto);
{
  const nomes = fs.readdirSync(path.join(RAIZ, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();
  check(nomes[nomes.length - 1] === path.basename(MIGRACAO), 'a migração é a última da pasta (timestamp depois das existentes)');

  const pols = politicas(sql, 'public.prevsafe_records');
  const dPol = defeitosDasPoliticas(pols);
  check(dPol.length === 0, 'prevsafe_records: 4 políticas, todas para authenticated, leitura e gravação pela regra nova' + (dPol.length ? ` — ${dPol.join('; ')}` : ''));
  for (const nome of Object.keys(pols)) {
    check(new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+${nome}\\s+on\\s+public\\.prevsafe_records`, 'i').test(sql), `${nome}: drop policy if exists antes (idempotente)`);
  }

  const iguais = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  check(iguais(A.PAPEIS_COM_RESULTADO_DE_EXAME, DECISAO.resultados) && iguais(A.PAPEIS_COM_COLECOES_DE_SAUDE, DECISAO.saude)
    && iguais(A.COLECOES_DE_SAUDE, ['examProtocols', 'workAbsences', 'catRecords']),
    'o espelho do app (lib/acessoPorPapel.ts) diz o mesmo que a decisão: examResults só ADMIN e SAUDE');
  const dLer = defeitosDaRegra(corpoDaFuncao(sql, 'prevsafe_pode_ler'), 'prevsafe_pode_ler');
  check(dLer.length === 0, 'leitura: cliente antes da equipe, examResults só ADMIN e SAUDE, saúde ADMIN/GESTOR/SAUDE' + (dLer.length ? ` — ${dLer.join('; ')}` : ''));
  const dGravar = defeitosDaRegra(corpoDaFuncao(sql, 'prevsafe_pode_gravar'), 'prevsafe_pode_gravar');
  check(dGravar.length === 0, 'gravação: a mesma regra de papéis' + (dGravar.length ? ` — ${dGravar.join('; ')}` : ''));
  const dPortalL = defeitosDoPortalLeitura(corpoDaFuncao(sql, 'prevsafe_portal_pode_ler'));
  check(dPortalL.length === 0, 'portal (leitura): só as coleções do portal, cada uma presa ao cliente ou ao autor' + (dPortalL.length ? ` — ${dPortalL.join('; ')}` : ''));
  const dPortalG = defeitosDoPortalGravacao(corpoDaFuncao(sql, 'prevsafe_portal_pode_gravar'));
  check(dPortalG.length === 0, 'portal (gravação): edita OS, pendências e assinaturas; só inclui avaliação, notificação e auditoria; nunca apaga' + (dPortalG.length ? ` — ${dPortalG.join('; ')}` : ''));

  const papelCliente = corpoDaFuncao(sql, 'prevsafe_papel_de_cliente') || '';
  check(/in\s*\(\s*'CLIENTE_ADMIN'\s*,\s*'CLIENTE_USER'\s*\)/.test(papelCliente) && /upper\(btrim\(/.test(papelCliente),
    'papel de cliente comparado em maiúsculas e sem espaços, como o app');
  check(/create\s+or\s+replace\s+function\s+public\.prevsafe_colecao_de_resultado_de_exame[\s\S]*?select\s+colecao\s*=\s*'examResults'/i.test(sql),
    'examResults é a coleção de resultado de exame');

  check(/alter\s+table\s+public\.prevsafe_members\s+add\s+column\s+if\s+not\s+exists\s+client_id\s+text/i.test(sql), 'prevsafe_members ganha client_id');
  check(/constraint\s+prevsafe_members_cliente_coerente[\s\S]*?not\s+valid/i.test(sql) && /constraint\s+prevsafe_members_papel_conhecido[\s\S]*?'SAUDE'[\s\S]*?not\s+valid/i.test(sql),
    'restrições de vínculo (cliente coerente, papel conhecido) NOT VALID: não travam as contas que já existem');
  // Ninguem alem da service role grava o vinculo: nenhuma migracao abre escrita.
  const todas = fs.readdirSync(path.join(RAIZ, 'supabase/migrations')).filter((f) => f.endsWith('.sql'))
    .map((f) => semComentariosSql(fs.readFileSync(path.join(RAIZ, 'supabase/migrations', f), 'utf8'))).join('\n');
  check(!/create\s+policy\s+\w+\s+on\s+public\.prevsafe_members\s+for\s+(insert|update|delete|all)/i.test(todas)
    && !/grant\s+[^;]*\b(insert|update|all)\b[^;]*on\s+(table\s+)?public\.prevsafe_members\s+to\s+[^;]*authenticated/i.test(todas),
    'nenhuma migração abre escrita em prevsafe_members para authenticated (o client_id só a service role grava)');

  const portaGatilho = corpoDaFuncao(sql, 'prevsafe_funcionario_sem_resultado_de_exame') || '';
  check(/create\s+trigger\s+prevsafe_funcionario_sem_resultado_trg\s+before\s+insert\s+or\s+update\s+on\s+public\.prevsafe_records[\s\S]*?when\s*\(\s*new\.collection\s*=\s*'employees'\s*\)/i.test(sql),
    'gatilho BEFORE INSERT OR UPDATE em employees');
  check(/if\s+auth\.uid\(\)\s+is\s+null\s+then\s+return\s+new/i.test(portaGatilho) && /v_antigo[\s\S]*@>\s*v_novo/.test(portaGatilho.replace(/coalesce\(v_antigo,\s*'\[\]'::jsonb\)/, 'v_antigo'))
    && /tg_op\s*=\s*'UPDATE'[\s\S]*else[\s\S]*from\s+public\.prevsafe_records\s+r/i.test(portaGatilho) && /raise\s+exception/i.test(portaGatilho),
    'o gatilho recusa dado clínico novo, deixa passar o legado igual e procura a versão anterior também no upsert');
  const clinicos = corpoDaFuncao(sql, 'prevsafe_dados_clinicos_do_funcionario') || '';
  check(["'restrictions_notes'", "'APTO_COM_RESTRICAO'", "'result'", "'observation'"].every((c) => clinicos.includes(c)),
    'o gatilho olha restrição, "apto com restrição", resultado e observação');

  const equipe = corpoDaFuncao(sql, 'prevsafe_eh_equipe') || '';
  check(/not\s+public\.prevsafe_papel_de_cliente\s*\(\s*m\.role\s*\)/i.test(equipe), 'prevsafe_eh_equipe exclui as contas de cliente');
  const polStorage = politicas(sql, 'storage.objects');
  const nomesStorage = ['prevsafe_evidencias_select', 'prevsafe_evidencias_insert', 'prevsafe_evidencias_update', 'prevsafe_evidencias_delete', 'prevsafe_site_insert', 'prevsafe_site_update', 'prevsafe_site_delete'];
  check(nomesStorage.every((n) => polStorage[n] && /prevsafe_eh_equipe\s*\(\s*\(storage\.foldername\(name\)\)\[1\]\s*\)/.test(polStorage[n]) && !/prevsafe_members/.test(polStorage[n])),
    'buckets de evidências e do site: só a equipe (foto da planta de um cliente não vai para outro)');
  const polSite = politicas(sql, 'public.site_posts');
  check(['site_posts_membros_leitura', 'site_posts_membros_insert', 'site_posts_membros_update', 'site_posts_membros_delete']
    .every((n) => polSite[n] && /prevsafe_eh_equipe\s*\(\s*organization_id\s*\)/.test(polSite[n])) && !polSite.site_posts_leitura_publica,
    'site_posts: rascunho e escrita só da equipe; a leitura pública do publicado não muda');

  const novas = ['prevsafe_pode_ler', 'prevsafe_pode_gravar', 'prevsafe_portal_pode_ler', 'prevsafe_portal_pode_gravar', 'prevsafe_eh_equipe'];
  check(novas.every((f) => new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${f}\\([^)]*\\)\\s+from\\s+public\\s*,\\s*anon`, 'i').test(sql)),
    'as funções novas não ficam executáveis por anon');
  {
    // Cada create precisa poder rodar de novo: funcao por "or replace",
    // politica e gatilho com o drop ... if exists do mesmo nome antes, coluna
    // e restricao so se nao existirem.
    const naoIdempotentes = [];
    if (/create\s+function\b/i.test(sql)) naoIdempotentes.push('create function sem or replace');
    if (/create\s+table\s+(?!if\s+not\s+exists)/i.test(sql)) naoIdempotentes.push('create table sem if not exists');
    if (/add\s+column\s+(?!if\s+not\s+exists)/i.test(sql)) naoIdempotentes.push('add column sem if not exists');
    for (const m of sql.matchAll(/create\s+(policy|trigger)\s+(\w+)/gi)) {
      const antes = sql.slice(0, m.index);
      if (!new RegExp(`drop\\s+${m[1]}\\s+if\\s+exists\\s+${m[2]}\\b`, 'i').test(antes)) naoIdempotentes.push(`${m[1]} ${m[2]} sem drop if exists antes`);
    }
    for (const m of sql.matchAll(/add\s+constraint\s+(\w+)/gi)) {
      if (!new RegExp(`if\\s+not\\s+exists\\s*\\(\\s*select\\s+1\\s+from\\s+pg_constraint\\s+where\\s+conname\\s*=\\s*'${m[1]}'`, 'i').test(sql)) {
        naoIdempotentes.push(`constraint ${m[1]} sem conferir se existe`);
      }
    }
    check(naoIdempotentes.length === 0, 'idempotente: create or replace, drop ... if exists, if not exists'
      + (naoIdempotentes.length ? ` — ${naoIdempotentes.join('; ')}` : ''));
  }

  const rb = semComentariosSql(ler(ROLLBACK));
  check(!fs.existsSync(path.join(RAIZ, 'supabase/migrations', path.basename(ROLLBACK).replace('.sql', '_rollback.sql'))) && !ROLLBACK.startsWith('supabase/migrations'),
    'o rollback fica fora de supabase/migrations (o db push não o aplica)');
  check(/'examResults'/.test(corpoDaFuncao(rb, 'prevsafe_colecao_de_saude') || ''),
    'o rollback mantém examResults como coleção de saúde (sem isso, voltar a regra antiga abriria os resultados a todos)');
  check(/^\s*begin\s*;/i.test(rb) && /commit\s*;\s*$/i.test(rb), 'o rollback roda numa transação');

  const t = semComentariosSql(ler(TESTE_SQL));
  check(/^\s*begin\s*;/i.test(t) && /rollback\s*;\s*$/i.test(t) && !/\bcommit\b/i.test(t), 'o teste SQL roda em begin ... rollback e não tem commit');
  check(/set\s+local\s+role\s+authenticated/i.test(t) && /request\.jwt\.claims/.test(t), 'o teste simula o usuário como o PostgREST (role authenticated e JWT)');
  const papeisNoTeste = [...t.matchAll(/'org-teste-rls-20261005'\s*,\s*'([A-ZÉ_]+)'/g)].map((m) => m[1]);
  check(['ADMIN', 'GESTOR', 'SAUDE', 'TÉCNICO', 'CLIENTE_USER', 'CLIENTE_ADMIN'].every((p) => papeisNoTeste.includes(p)),
    'o teste cobre ADMIN, GESTOR, SAUDE, TÉCNICO e contas de dois clientes');
}

// ===========================================================================
// 2. O resultado nao fica mais em employees
// ===========================================================================
console.log('\n--- 2. Resultado fora de employees ---');
{
  const tipos = semComentarios(ler('types/index.ts'));
  const corpoDe = (nome) => {
    const i = tipos.search(new RegExp(`export\\s+interface\\s+${nome}\\s*\\{`));
    if (i < 0) return null;
    const abre = tipos.indexOf('{', i);
    return tipos.slice(abre, fechamento(tipos, abre) + 1);
  };
  const exame = corpoDe('EmployeeExamRecord');
  const aso = corpoDe('EmployeeASOHistory');
  if (!exame || !aso) inconclusivo('EmployeeExamRecord ou EmployeeASOHistory não encontrados em types/index.ts');
  check(!/\b(result|observation)\??\s*:/.test(exame), 'o exame do cadastro (EmployeeExamRecord) não tem resultado nem observação');
  check(!/\brestrictions_notes\??\s*:/.test(aso) && !/APTO_COM_RESTRICAO/.test(aso) && /\bresult\s*:\s*'APTO'\s*\|\s*'INAPTO'\s*;/.test(aso),
    'o ASO do cadastro só tem apto ou inapto, sem restrição');
  const resultadoDoExame = corpoDe('ExamResultItem') || '';
  check(/\bresult\s*:/.test(resultadoDoExame) && /\bobservation\??\s*:/.test(resultadoDoExame), 'o resultado e a observação estão em ExamResultItem (examResults)');

  // Pela execucao: o que entra no cadastro, mesmo com campo clinico na entrada
  // - inclusive um que ninguem lembrou de proibir.
  const entrada = {
    id: 'a1', aso_type: 'PERIODICO', exam_date: '2026-01-01', valid_until: '2027-01-01', result: 'APTO_COM_RESTRICAO',
    restrictions_notes: 'X', physician_name: 'Dra', physician_crm: '1', physician_uf: 'BA', notas_do_medico: 'Y',
    exams: [{ id: 'e1', exam_code_table_27: '0281', exam_name: 'Audio', exam_date: '2026-01-01', procedure_type: 'AUDIOMETRIA', result: 'ALTERADO', observation: 'Z', achado: 'W' }],
  };
  const saida = R.asoParaOCadastro(entrada);
  const texto = JSON.stringify(saida);
  check(saida.result === 'APTO' && !/"(restrictions_notes|observation|notas_do_medico|achado)"/.test(texto) && !('result' in saida.exams[0]),
    'asoParaOCadastro deixa só o permitido: "apto com restrição" vira apto, e campo clínico desconhecido também sai');
  check(saida.physician_name === 'Dra' && saida.exams[0].exam_code_table_27 === '0281' && saida.exams[0].exam_date === '2026-01-01' && saida.valid_until === '2027-01-01',
    'e mantém o que o ASO entregue ao empregador traz');
  check(R.conclusaoDoAso({}) === '' && R.conclusaoDoAso({ result: 'INAPTO' }) === 'INAPTO', 'ASO sem conclusão não vira apto');

  const ctx = semComentarios(ler('context/PrevSafeContext.tsx'));
  const iAso = ctx.indexOf('const addEmployeeAso = useCallback(');
  if (iAso < 0) inconclusivo('addEmployeeAso não encontrado no contexto');
  const abre = ctx.indexOf('{', ctx.indexOf('=>', iAso));
  const corpoAso = ctx.slice(abre, fechamento(ctx, abre) + 1);
  check(/const\s+newAso\s*:\s*EmployeeASO\s*=\s*asoParaOCadastro\s*\(/.test(corpoAso) && /aso_history:\s*\[\s*newAso\s*,/.test(corpoAso),
    'addEmployeeAso grava no cadastro só o que passa por asoParaOCadastro');
  // Toda gravacao no cadastro vinda das telas: nada de campo clinico no argumento.
  const telas = ['components/sst/ExamPCMSOTab.tsx', 'components/sst/EmployeesTab.tsx', 'components/sst/ResultadosDoAso.tsx']
    .map((f) => [f, semComentarios(ler(f))]);
  const argumentos = telas.flatMap(([f, src]) => ['addEmployeeAso', 'updateEmployee', 'addEmployee']
    .flatMap((n) => chamadas(src, n).map((a) => [f, n, a])));
  const ruins = argumentos.filter(([, , a]) => /\b(restrictions_notes|observation)\s*:|APTO_COM_RESTRICAO|\bas\s+any\s*$/.test(a.trim()) || /\bas\s+any\b/.test(a));
  check(argumentos.length >= 2 && ruins.length === 0,
    `nenhuma tela grava restrição, observação ou "apto com restrição" no cadastro${ruins.length ? ` — ${ruins.map(([f, n]) => `${f}: ${n}`).join(', ')}` : ''}`);
  const tab = telas[0][1];
  const chamadaAso = chamadas(tab, 'addEmployeeAso')[0] || '';
  check(/exams:\s*examesDoAso\.map\(\s*exameParaOCadastro\s*\)/.test(chamadaAso) && /result:\s*asoForm\.result\s*===\s*'INAPTO'\s*\?\s*'INAPTO'\s*:\s*'APTO'/.test(chamadaAso),
    'a emissão de ASO grava os exames por exameParaOCadastro e a conclusão como apto ou inapto');

  // S-2220: o evento, lido por toda a equipe, nao copia o resultado.
  const m = E.montarAsoDoEvento({ id: 'c', name: 'X', aso_history: [] }, entrada);
  check(m.dados.exams_list.length === 1 && !('result' in m.dados.exams_list[0]) && !('observation' in m.dados.exams_list[0]) && m.dados.result === 'APTO',
    'S-2220: com o resultado legado ainda no cadastro, o evento não o copia; apto/inapto e o exame continuam');
}

// ===========================================================================
// 3. Quem nao tem o papel nao ve o resultado
// ===========================================================================
console.log('\n--- 3. Interface: resultado restrito ao papel Saúde ---');
{
  check(R.RESULTADO_RESTRITO === 'Resultado restrito ao papel Saúde', 'o texto do que fica no lugar do resultado');

  const ctx = semComentarios(ler('context/PrevSafeContext.tsx'));
  const acesso = ctx.match(/const\s+acessoAResultadosDeExame\s*=\s*([^;]*);/);
  check(Boolean(acesso) && /Boolean\(acessoDaConta\)/.test(acesso[1]) && /podeLerResultadosDeExame\(\s*acessoDaConta\?\.papel\s*\)/.test(acesso[1])
    && /podeLerResultadosDeExame\(\s*currentProfile\.role\s*\)/.test(acesso[1]) && !/\|\|/.test(acesso[1]),
    'o acesso exige o papel real (prevsafe_members) E o papel em uso — quem visualiza como GESTOR vê como o GESTOR');
  const iSalvar = ctx.indexOf('const salvarResultadosDoAso = useCallback(');
  check(iSalvar > 0 && /if\s*\(\s*!acessoAResultadosDeExame\s*\)\s*\{\s*return\s*\{\s*ok:\s*false/.test(ctx.slice(iSalvar, iSalvar + 800)),
    'salvarResultadosDoAso recusa quem não tem o papel');
  check(A.podeLerResultadosDeExame('SAUDE') && A.podeLerResultadosDeExame(' admin ') && !A.podeLerResultadosDeExame('GESTOR')
    && !A.podeLerResultadosDeExame('TÉCNICO') && !A.podeLerResultadosDeExame('CLIENTE_ADMIN') && !A.podeLerResultadosDeExame(null),
    'só SAUDE e ADMIN leem resultado (o mesmo que a RLS)');

  // Toda tela que pega examResults do contexto confere o papel.
  const arquivos = [];
  const varrer = (dir) => fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true }).forEach((d) => {
    const rel = `${dir}/${d.name}`;
    if (d.isDirectory()) varrer(rel);
    else if (/\.tsx?$/.test(d.name)) arquivos.push(rel);
  });
  ['components', 'app'].forEach(varrer);
  const usam = arquivos.filter((f) => /\bexamResults\b/.test(semComentarios(ler(f))));
  const semPortao = usam.filter((f) => !/\bacessoAResultadosDeExame\b/.test(semComentarios(ler(f))));
  check(usam.length >= 3 && semPortao.length === 0, `toda tela que lê examResults confere o papel (${usam.length} telas)${semPortao.length ? ` — sem conferir: ${semPortao.join(', ')}` : ''}`);
  const pcmso = arquivos.flatMap((f) => chamadas(semComentarios(ler(f)), 'exportPCMSODocumentPdf').map((a) => [f, a]));
  check(pcmso.length >= 2 && pcmso.every(([, a]) => /examResults\s*:\s*acessoAResultadosDeExame\s*\?\s*examResults\s*:\s*null/.test(a)),
    'o PCMSO só recebe os resultados de quem tem o papel; sem ele a alínea "c" sai restrita');

  const ficha = semComentarios(ler('components/sst/ResultadosDoAso.tsx'));
  const iPortao = ficha.search(/if\s*\(\s*!acessoAResultadosDeExame\s*\)\s*\{/);
  const iLeitura = Math.min(...['resultadosDoAso(', '.results', 'restrictions_notes'].map((s) => ficha.indexOf(s)).filter((i) => i >= 0));
  const portao = iPortao >= 0 ? ficha.slice(iPortao, fechamento(ficha, ficha.indexOf('{', iPortao)) + 1) : '';
  check(iPortao >= 0 && iPortao < iLeitura && /return\s*\(/.test(portao) && /\{\s*RESULTADO_RESTRITO\s*\}/.test(portao),
    'ficha do colaborador: sem o papel, sai "resultado restrito" antes de qualquer leitura do resultado');

  const tab = semComentarios(ler('components/sst/ExamPCMSOTab.tsx'));
  const iOpcao = tab.indexOf('<option value="APTO_COM_RESTRICAO"');
  check(iOpcao > 0 && /\{\s*acessoAResultadosDeExame\s*&&\s*\(\s*$/.test(tab.slice(0, iOpcao).trimEnd().slice(-60)),
    'emissão de ASO: "apto com restrição" só aparece para quem tem o papel');
  const iSelect = tab.indexOf("alterarExame(ex.id, 'result'");
  const antes = tab.slice(Math.max(0, iSelect - 400), iSelect);
  const depois = tab.slice(iSelect, iSelect + 1500);
  check(iSelect > 0 && /\{\s*acessoAResultadosDeExame\s*\?\s*\(\s*<select/.test(antes) && /\)\s*:\s*\([\s\S]*?\{\s*RESULTADO_RESTRITO\s*\}/.test(depois),
    'emissão de ASO: o campo de resultado só existe com o papel; sem ele, "resultado restrito" no lugar');

  const relatorios = semComentarios(ler('components/reports/ReportsCenterView.tsx'));
  check(/Object\.entries\(\s*registroParaExibir\(\s*selectedRowDetail\s*\)\s*\)/.test(relatorios) && !/Object\.entries\(\s*selectedRowDetail\s*\)/.test(relatorios),
    'o detalhe da central de relatórios mostra o registro sem dado clínico');
  const exibido = R.registroParaExibir({
    name: 'X', aso_history: [{ id: 'a', result: 'APTO_COM_RESTRICAO', restrictions_notes: 'R', exams: [{ id: 'e', result: 'ALTERADO', observation: 'O' }] }],
    selectedAso: { id: 'a', result: 'APTO_COM_RESTRICAO', restrictions_notes: 'R' },
    aso_data: { exams_list: [{ code: '0281', result: 'ALTERADO', observation: 'O' }] },
  });
  check(!/ALTERADO|"R"|"O"|APTO_COM_RESTRICAO|restrictions_notes/.test(JSON.stringify(exibido)) && exibido.name === 'X',
    'registroParaExibir tira o dado clínico do funcionário, do ASO escolhido e do evento S-2220');
}

// ===========================================================================
// 4. Conta de cliente: portal e sincronizacao
// ===========================================================================
console.log('\n--- 4. Conta de cliente presa à própria empresa ---');
{
  const portal = semComentarios(ler('components/client-portal/ClientPortalView.tsx'));
  check(/const\s+contaDeCliente\s*=\s*ehPapelDeCliente\(\s*currentRole\s*\)/.test(portal)
    && /clientesDoPortal\s*=\s*contaDeCliente\s*\?\s*\(clients\s*\|\|\s*\[\]\)\.filter\(\s*c\s*=>\s*c\?\.id\s*===\s*clienteFixo\s*\)/.test(portal)
    && /clienteFixo\s*=\s*contaDeCliente\s*\?\s*\(\s*clienteDaConta\b/.test(portal),
    'portal: a conta de cliente vê só a empresa do vínculo (clienteDaConta)');
  check(!/\bclients\.map\(/.test(portal) && /if\s*\(\s*contaDeCliente\s*\)\s*return;/.test(portal),
    'portal: nenhum seletor percorre todos os clientes, e a conta de cliente não troca de empresa');
  const listas = ['contracts', 'serviceOrders', 'documents', 'requests', 'evaluations', 'sstSignatures'];
  check(listas.every((l) => new RegExp(`\\(${l}\\s*\\|\\|\\s*\\[\\]\\)\\.filter\\([^)]*client_id\\s*===\\s*currentClient\\.id`).test(portal)),
    'portal: OS, contratos, documentos, pendências, avaliações e assinaturas filtradas pelo cliente');

  const ctx = semComentarios(ler('context/PrevSafeContext.tsx'));
  // O efeito de envio: do useEffect que arma o debounce ate a chamada de pushRecords.
  const iDebounce = ctx.indexOf('pendingSync.current = setTimeout');
  const efeito = ctx.slice(ctx.lastIndexOf('useEffect(() => {', iDebounce), ctx.indexOf('pushRecords(syncOrganizationId, changes)') + 60);
  check(/if\s*\([^)]*!acessoDaConta\s*\)\s*return;/.test(efeito) && /envioPermitido\(\s*acessoDaConta\s*,\s*collection\s*,\s*previous\s*,/.test(efeito)
    && !/rows\.push\(/.test(efeito),
    'a sincronização só envia o que envioPermitido libera, e espera o vínculo carregar');
  const carga = ctx.slice(ctx.indexOf('const vinculo = await fetchMemberVinculo();'), ctx.indexOf('fetchRemoteSnapshot(orgId)'));
  check(/setAcessoDaConta\(\s*\{\s*papel\s*,\s*clienteId:\s*vinculo\.clientId\s*\}\s*\)/.test(carga), 'o vínculo (papel e cliente) vem de prevsafe_members');
  const sync = semComentarios(ler('lib/supabaseSync.ts'));
  const iLista = sync.indexOf('export const SYNCED_COLLECTIONS = [');
  check(/select\('organization_id, role, client_id'\)/.test(sync) && iLista > 0 && /'examResults'/.test(sync.slice(iLista, sync.indexOf('] as const', iLista))),
    'examResults é sincronizada, e o client_id é lido do vínculo');
  check(/ignoreDuplicates:\s*true/.test(sync), 'inclusão só de inclusão: ON CONFLICT DO NOTHING (o banco recusa a reescrita)');

  // Pela execucao.
  const ent = (registros) => new Map(registros.map((r) => [String(r.id), { registro: r, json: JSON.stringify(r) }]));
  const cli = { papel: 'CLIENTE_USER', clienteId: 'cli-a' };
  const os = A.envioPermitido(cli, 'serviceOrders', new Map(), ent([{ id: 'os-a', client_id: 'cli-a' }, { id: 'os-b', client_id: 'cli-b' }]));
  check(os.rows.length === 1 && os.rows[0].id === 'os-a', 'conta de cliente: só envia OS da própria empresa');
  const anterior = new Map([['os-b', JSON.stringify({ id: 'os-b', client_id: 'cli-b' })], ['os-a2', JSON.stringify({ id: 'os-a2', client_id: 'cli-a' })]]);
  const apagadas = A.envioPermitido(cli, 'serviceOrders', anterior, new Map());
  check(apagadas.deletedIds.join() === 'os-a2', 'conta de cliente: só marca como excluído o que é dela');
  check(['employees', 'examResults', 'catRecords', 'transactions', 'leads', 'proposals', 'clients', 'documents', 'organization']
    .every((c) => A.envioPermitido(cli, c, new Map(), ent([{ id: 'x', client_id: 'cli-a' }])).rows.length === 0),
    'conta de cliente: não envia nada em coleção de saúde, interna ou só de leitura');
  const aud = A.envioPermitido(cli, 'auditLogs', new Map([['velho', '{"id":"velho"}']]), ent([{ id: 'velho', mudou: true }, { id: 'novo' }]));
  check(aud.somenteInclusao && aud.rows.length === 1 && aud.rows[0].id === 'novo' && aud.deletedIds.length === 0,
    'conta de cliente: auditoria só inclui, sem reescrever nem apagar');
  check(A.envioPermitido({ papel: 'CLIENTE_ADMIN', clienteId: null }, 'requests', new Map(), ent([{ id: 'r', client_id: '' }])).rows.length === 0,
    'conta de cliente sem client_id no vínculo: nada sobe');
  const exres = ent([{ id: 'exres-1' }]);
  check(A.envioPermitido({ papel: 'GESTOR', clienteId: null }, 'examResults', new Map(), exres).rows.length === 0
    && A.envioPermitido({ papel: 'SAUDE', clienteId: null }, 'examResults', new Map(), exres).rows.length === 1
    && A.envioPermitido({ papel: 'TÉCNICO', clienteId: null }, 'examProtocols', new Map(), ent([{ id: 'proto-modelo' }])).rows.length === 0
    && A.envioPermitido({ papel: 'TÉCNICO', clienteId: null }, 'employees', new Map(), ent([{ id: 'e' }])).rows.length === 1,
    'equipe: GESTOR não envia examResults, SAUDE envia, TÉCNICO não envia protocolo e envia funcionário');

  const rota = semComentarios(ler('lib/autorizacaoApi.ts'));
  const criar = semComentarios(ler('app/api/admin/create-user/route.ts'));
  const trocar = semComentarios(ler('app/api/admin/update-member/route.ts'));
  check(/\.eq\('collection',\s*'clients'\)[\s\S]*?\.eq\('record_id',\s*cliente\)[\s\S]*?\.is\('deleted_at',\s*null\)/.test(rota)
    && /if\s*\(\s*!ehPapelDeCliente\(papel\)\s*\)\s*return\s*\{\s*ok:\s*true,\s*role:\s*papel,\s*clientId:\s*null\s*\}/.test(rota),
    'o vínculo só leva client_id de um cliente vivo da própria organização, e a equipe não leva cliente');
  check(/client_id:\s*vinculo\.clientId/.test(criar) && criar.indexOf('conferirPapelECliente(') < criar.indexOf('auth.admin.createUser('),
    'criar usuário: papel e cliente conferidos antes do login, e o client_id gravado no vínculo');
  check(/exigirAdminDaOrganizacao\(req\)/.test(trocar) && /update\(\{\s*role:\s*vinculo\.role,\s*client_id:\s*vinculo\.clientId\s*\}\)/.test(trocar)
    && /admins\s*<=\s*1/.test(trocar),
    'trocar papel: só ADMIN, grava papel e cliente em prevsafe_members, e não deixa a organização sem administrador');
  const usuarios = semComentarios(ler('components/users/UsersManagementView.tsx'));
  check(/fetch\('\/api\/admin\/update-member'/.test(usuarios) && /<option value="SAUDE">/.test(usuarios) && /\bSAUDE:\s*\{/.test(usuarios),
    'tela de usuários: o papel Saúde pode ser atribuído, e a troca vai ao servidor');
}

// ===========================================================================
console.log(`\n${casos - falhas}/${casos} casos passaram.`);
if (falhas > 0) {
  console.log(`${falhas} FALHA(S).`);
  process.exit(1);
}
console.log('Saúde e clientes: resultado só para o papel Saúde, conta de cliente só na própria empresa.');
process.exit(0);
