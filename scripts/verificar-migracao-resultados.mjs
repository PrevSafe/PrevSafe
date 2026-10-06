/**
 * Verificacao do script que move o resultado de exame de employees para
 * examResults (scripts/migrar-resultados-de-exame.mjs).
 *
 *   node scripts/verificar-migracao-resultados.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * O script vai rodar contra o banco de producao, com dado de saude de
 * trabalhador real, e este teste nao pode toca-lo. Ele roda o script inteiro
 * contra um Supabase FALSO, em memoria, com trabalhadores ficticios, e prova:
 *
 *   1. sem --aplicar, nada e gravado (nem o backup);
 *   2. com --aplicar, o backup JSON e gravado e relido ANTES da primeira
 *      gravacao, e traz as linhas como estavam;
 *   3. o cadastro fica sem resultado, observacao, restricao e "apto com
 *      restricao", e o resto dele intacto; examResults recebe o que saiu;
 *   4. rodar de novo nao duplica nem regrava nada;
 *   5. o que ja esta em examResults (lancado pela Saude) prevalece sobre o
 *      legado;
 *   6. linha gravada por outra pessoa no meio da migracao nao e sobrescrita, e
 *      o cadastro so e limpo depois que os resultados dele chegaram;
 *   7. a copia do resultado nos eventos S-2220 sai; a trilha de auditoria so
 *      com --incluir-auditoria;
 *   8. o terminal mostra contagens, nunca o conteudo clinico;
 *   9. credencial so do ambiente.
 *
 * Saida: 0 tudo passou, 1 houve falha, 2 INCONCLUSIVO.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..'
);
const TMP = path.join(RAIZ, '.tmp-migracao-resultados-verificacao');
const SCRIPT = path.join(RAIZ, 'scripts', 'migrar-resultados-de-exame.mjs');

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

if (!fs.existsSync(SCRIPT)) inconclusivo('scripts/migrar-resultados-de-exame.mjs não encontrado');
let M;
/** executar() protegido: se o script lancar, o caso falha com o motivo. */
async function executar(args) {
  try {
    return await M.executar(args);
  } catch (e) {
    check(false, `o script não lança exceção (${e.message})`);
    return { resumo: {}, gravados: {}, conflitos: [], backup: null };
  }
}
try {
  M = await import(pathToFileURL(SCRIPT).href);
} catch (e) {
  inconclusivo('não foi possível carregar o script', e.message);
}
for (const f of ['executar', 'planejar', 'funcionarioTemDadoClinico', 'credenciais', 'lerOpcoes']) {
  if (typeof M[f] !== 'function') inconclusivo(`o script não exporta ${f}`);
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

// ===========================================================================
// Supabase falso: so o que o script usa de prevsafe_records
// ===========================================================================
const clone = (x) => JSON.parse(JSON.stringify(x));
const chave = (r) => `${r.organization_id}|${r.collection}|${r.record_id}`;

function bancoFalso(linhas, { antesDeGravar } = {}) {
  const tabela = new Map();
  let relogio = 0;
  const carimbo = () => `2026-10-06T00:00:00.${String(++relogio).padStart(6, '0')}+00:00`;
  linhas.forEach((l) => tabela.set(chave(l), { deleted_at: null, ...clone(l), updated_at: carimbo() }));
  const gravacoes = [];

  const consulta = () => {
    const filtros = [];
    let faixa = [0, Infinity];
    const b = {
      in(c, v) { filtros.push((r) => v.includes(r[c])); return b; },
      eq(c, v) { filtros.push((r) => r[c] === v); return b; },
      order() { return b; },
      range(a, z) { faixa = [a, z]; return b; },
      then(ok, erro) {
        const data = [...tabela.values()]
          .filter((r) => filtros.every((f) => f(r)))
          .sort((x, y) => chave(x).localeCompare(chave(y)))
          .slice(faixa[0], faixa[1] + 1)
          .map(clone);
        return Promise.resolve({ data, error: null }).then(ok, erro);
      },
    };
    return b;
  };

  const atualizacao = (patch) => {
    const filtros = [];
    const b = {
      eq(c, v) { filtros.push([c, v]); return b; },
      select() {
        antesDeGravar?.({ tipo: 'update', filtros, tabela, carimbo });
        const alvo = [...tabela.values()].filter((r) => filtros.every(([c, v]) => r[c] === v));
        alvo.forEach((r) => {
          Object.assign(r, clone(patch), { updated_at: carimbo() });
          gravacoes.push({ tipo: 'update', chave: chave(r) });
        });
        return Promise.resolve({ data: alvo.map((r) => ({ record_id: r.record_id })), error: null });
      },
    };
    return b;
  };

  const cliente = {
    from(nome) {
      if (nome !== 'prevsafe_records') throw new Error(`tabela inesperada: ${nome}`);
      return {
        select: () => consulta(),
        update: (patch) => atualizacao(patch),
        insert(linha) {
          antesDeGravar?.({ tipo: 'insert', linha, tabela, carimbo });
          if (tabela.has(chave(linha))) {
            return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
          }
          tabela.set(chave(linha), { deleted_at: null, ...clone(linha), updated_at: carimbo() });
          gravacoes.push({ tipo: 'insert', chave: chave(linha) });
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return { cliente, tabela, gravacoes };
}

// ===========================================================================
// Cenario ficticio (nenhum dado real)
// ===========================================================================
const ORG = 'org-teste';
const OBS = 'OBSERVACAO-FICTICIA-PERDA-4KHZ';
const RESTRICAO = 'RESTRICAO-FICTICIA-SEM-ALTURA';
const OBS_SAUDE = 'OBSERVACAO-LANCADA-PELA-SAUDE';
const exame = (id, codigo, extra = {}) => ({ id, exam_code_table_27: codigo, exam_name: `Exame ${codigo}`, exam_date: '2026-03-01', procedure_type: 'OUTRO', ...extra });

const CENARIO = [
  {
    organization_id: ORG, collection: 'employees', record_id: 'emp-1',
    data: {
      id: 'emp-1', client_id: 'cli-1', name: 'TRABALHADOR FICTICIO 1', cpf: '00000000191',
      aso_history: [
        {
          id: 'aso-1', aso_type: 'PERIODICO', exam_date: '2026-03-01', valid_until: '2027-03-01',
          result: 'APTO_COM_RESTRICAO', restrictions_notes: RESTRICAO,
          physician_name: 'Dra. Ficticia', physician_crm: '000', physician_uf: 'XX',
          exams: [exame('ex-1', '0281', { result: 'ALTERADO', observation: OBS }), exame('ex-2', '0295', { result: 'NORMAL' })],
        },
        // ASO sem dado clinico: nao gera registro em examResults.
        { id: 'aso-0', aso_type: 'ADMISSIONAL', exam_date: '2025-01-01', result: 'APTO', exams: [exame('ex-0', '0295')] },
      ],
    },
  },
  {
    // ASO e exames sem id (gravados antes de o app gerar ids).
    organization_id: ORG, collection: 'employees', record_id: 'emp-2',
    data: {
      id: 'emp-2', client_id: 'cli-1', name: 'TRABALHADOR FICTICIO 2',
      aso_history: [{ aso_type: 'ADMISSIONAL', exam_date: '2026-02-01', result: 'INAPTO', exams: [{ exam_code_table_27: '0281', exam_date: '2026-02-01', result: 'AGRAVAMENTO' }] }],
    },
  },
  {
    // Funcionario ja excluido: o resultado sai do cadastro do mesmo jeito.
    organization_id: ORG, collection: 'employees', record_id: 'emp-3', deleted_at: '2026-05-01T00:00:00+00:00',
    data: { id: 'emp-3', client_id: 'cli-2', aso_history: [{ id: 'aso-3', result: 'APTO', exams: [exame('ex-3', '0281', { result: 'NORMAL' })] }] },
  },
  {
    // A Saude ja lancou este ASO pelo app novo; o legado so completa.
    organization_id: ORG, collection: 'employees', record_id: 'emp-4',
    data: { id: 'emp-4', client_id: 'cli-1', aso_history: [{ id: 'aso-4', result: 'APTO', exams: [exame('ex-4a', '0281', { result: 'ALTERADO' }), exame('ex-4b', '0295', { result: 'NORMAL' })] }] },
  },
  {
    organization_id: ORG, collection: 'examResults', record_id: 'exres-emp-4-aso-4',
    data: { id: 'exres-emp-4-aso-4', employee_id: 'emp-4', aso_id: 'aso-4', aso_result: 'APTO', results: [{ exam_id: 'ex-4a', exam_code_table_27: '0281', result: 'ESTAVEL', observation: OBS_SAUDE }], created_at: '2026-09-01T00:00:00Z' },
  },
  // Funcionario limpo: nao muda.
  { organization_id: ORG, collection: 'employees', record_id: 'emp-limpo', data: { id: 'emp-limpo', aso_history: [{ id: 'a', result: 'APTO', exams: [exame('e', '0295')] }] } },
  {
    organization_id: ORG, collection: 'esocialEvents', record_id: 'evt-1',
    data: { id: 'evt-1', event_type: 'S-2220', xml_content: '<eSocial/>', aso_data: { result: 'APTO', exams_list: [{ code: '0281', date: '2026-03-01', result: 'ALTERADO', observation: OBS }] } },
  },
  {
    organization_id: ORG, collection: 'auditLogs', record_id: 'aud-1',
    data: { id: 'aud-1', action: 'UPDATE_EMPLOYEE', new_data: { aso_history: [{ id: 'aso-1', result: 'APTO_COM_RESTRICAO', restrictions_notes: RESTRICAO, exams: [{ id: 'ex-1', result: 'ALTERADO' }] }] } },
  },
  // Outra organizacao, para --org.
  { organization_id: 'org-outra', collection: 'employees', record_id: 'emp-x', data: { id: 'emp-x', aso_history: [{ id: 'ax', exams: [exame('ey', '0281', { result: 'NORMAL' })] }] } },
];

const opcoes = (extra = {}) => ({ ...M.lerOpcoes([]), backupDir: path.join(TMP, 'backups'), ...extra });
const backups = () => (fs.existsSync(path.join(TMP, 'backups')) ? fs.readdirSync(path.join(TMP, 'backups')) : []);
const naoClinico = (texto) => ![OBS, RESTRICAO, OBS_SAUDE, 'ALTERADO', 'AGRAVAMENTO', 'ESTAVEL'].some((s) => texto.includes(s));

// ===========================================================================
// 1. Simulacao
// ===========================================================================
console.log('\n--- 1. Simulação (padrão) ---');
{
  const banco = bancoFalso(CENARIO);
  const saida = [];
  const r = await executar({ supabase: banco.cliente, opcoes: opcoes(), projeto: 'falso', log: (l) => saida.push(l) });
  check(M.lerOpcoes([]).aplicar === false, 'sem --aplicar a opção padrão é simular');
  check(banco.gravacoes.length === 0, 'simulação não grava nada no banco');
  check(backups().length === 0, 'simulação não grava backup (não há o que proteger)');
  check(r.resumo.funcionarios_com_dado_clinico === 5 && r.resumo.asos_com_dado_clinico === 5,
    `conta 5 funcionários e 5 ASOs com dado clínico (veio ${r.resumo.funcionarios_com_dado_clinico}/${r.resumo.asos_com_dado_clinico})`);
  check(r.resumo.restricoes === 1 && r.resumo.conclusoes_apto_com_restricao === 1 && r.resumo.exames_com_observacao === 1,
    'conta restrição, "apto com restrição" e observação');
  check(saida.some((l) => /SIMULACAO/.test(l)), 'a saída diz que foi simulação');
  check(naoClinico(saida.join('\n')), 'a saída da simulação não mostra conteúdo clínico, só contagens');
}

// ===========================================================================
// 2 a 8. Aplicacao
// ===========================================================================
console.log('\n--- 2. Aplicação, backup e resultado ---');
{
  let backupAntesDaPrimeiraGravacao = null;
  const banco = bancoFalso(CENARIO, {
    antesDeGravar: () => {
      if (backupAntesDaPrimeiraGravacao === null) backupAntesDaPrimeiraGravacao = backups().length === 1;
    },
  });
  const saida = [];
  const r = await executar({ supabase: banco.cliente, opcoes: opcoes({ aplicar: true, org: ORG }), projeto: 'falso', log: (l) => saida.push(l) });

  check(backupAntesDaPrimeiraGravacao === true, 'o backup existe antes da primeira gravação no banco');
  const arquivo = backups()[0] ? path.join(TMP, 'backups', backups()[0]) : null;
  const backup = arquivo ? JSON.parse(fs.readFileSync(arquivo, 'utf8')) : null;
  const doBackup = (k) => backup?.linhas_antes?.find((l) => `${l.collection}/${l.record_id}` === k);
  check(Boolean(backup) && doBackup('employees/emp-1')?.data?.aso_history?.[0]?.restrictions_notes === RESTRICAO,
    'o backup traz o cadastro como estava, com o dado clínico (para restaurar)');
  check(Boolean(doBackup('examResults/exres-emp-4-aso-4')) && Boolean(doBackup('esocialEvents/evt-1')),
    'o backup traz também o examResults que será fundido e o evento que será limpo');
  check(backup?.incluidos?.some((l) => l.record_id === 'exres-emp-1-aso-1'), 'o backup lista os registros que serão criados');
  check(!backup?.linhas_antes?.some((l) => l.organization_id === 'org-outra'), '--org: a outra organização não entra');

  const linha = (k) => banco.tabela.get(`${ORG}|${k}`);
  const emp1 = linha('employees|emp-1').data;
  check(!M.funcionarioTemDadoClinico(emp1) && !JSON.stringify(emp1).includes(RESTRICAO) && !JSON.stringify(emp1).includes(OBS),
    'o cadastro fica sem resultado, observação e restrição');
  check(emp1.aso_history[0].result === 'APTO', '"apto com restrição" vira "apto" no cadastro');
  check(emp1.aso_history[0].physician_name === 'Dra. Ficticia' && emp1.aso_history[0].exams[0].exam_code_table_27 === '0281'
    && emp1.aso_history[0].exams[0].exam_date === '2026-03-01' && emp1.name === 'TRABALHADOR FICTICIO 1' && emp1.cpf === '00000000191',
    'o resto do cadastro fica intacto (médico, exames feitos, datas, nome, CPF)');

  const res1 = linha('examResults|exres-emp-1-aso-1')?.data;
  check(res1?.aso_result === 'APTO_COM_RESTRICAO' && res1?.restrictions_notes === RESTRICAO,
    'examResults recebe a conclusão "apto com restrição" e a restrição');
  check(res1?.results?.length === 2 && res1.results.find((x) => x.exam_id === 'ex-1')?.observation === OBS
    && res1.results.find((x) => x.exam_id === 'ex-2')?.result === 'NORMAL' && res1.employee_id === 'emp-1' && res1.client_id === 'cli-1',
    'examResults recebe o resultado e a observação de cada exame, ligados ao funcionário e ao cliente');
  check(!linha('examResults|exres-emp-1-aso-0'), 'ASO sem dado clínico não gera registro');

  const emp2 = linha('employees|emp-2').data;
  const asoId2 = emp2.aso_history[0].id;
  check(Boolean(asoId2) && Boolean(emp2.aso_history[0].exams[0].id) && linha(`examResults|exres-emp-2-${asoId2}`)?.data?.results?.[0]?.result === 'AGRAVAMENTO',
    'ASO e exame sem id ganham id, e o resultado fica ligado a eles');

  check(linha('examResults|exres-emp-3-aso-3')?.deleted_at === '2026-05-01T00:00:00+00:00' && !M.funcionarioTemDadoClinico(linha('employees|emp-3').data),
    'funcionário excluído: o cadastro é limpo e o registro novo nasce excluído também');

  const res4 = linha('examResults|exres-emp-4-aso-4')?.data;
  check(res4?.results?.find((x) => x.exam_id === 'ex-4a')?.result === 'ESTAVEL' && res4.results.find((x) => x.exam_id === 'ex-4a')?.observation === OBS_SAUDE,
    'o que a Saúde já lançou prevalece sobre o legado');
  check(res4?.results?.find((x) => x.exam_id === 'ex-4b')?.result === 'NORMAL' && res4.results.length === 2 && res4.created_at === '2026-09-01T00:00:00Z',
    'o legado só completa o que faltava, e a data de criação é mantida');

  const evt = linha('esocialEvents|evt-1').data;
  check(!('result' in evt.aso_data.exams_list[0]) && !('observation' in evt.aso_data.exams_list[0])
    && evt.aso_data.exams_list[0].code === '0281' && evt.xml_content === '<eSocial/>' && evt.aso_data.result === 'APTO',
    'o evento S-2220 perde a cópia do resultado e da observação; código, XML e apto/inapto ficam');
  check(linha('auditLogs|aud-1').data.new_data.aso_history[0].restrictions_notes === RESTRICAO,
    'sem --incluir-auditoria, a trilha de auditoria não é tocada');
  check(linha('employees|emp-limpo').updated_at === bancoFalso(CENARIO).tabela.get(`${ORG}|employees|emp-limpo`).updated_at
    && !banco.gravacoes.some((g) => g.chave.endsWith('emp-limpo')),
    'funcionário sem dado clínico não é regravado');
  check(banco.tabela.get('org-outra|employees|emp-x').data.aso_history[0].exams[0].result === 'NORMAL', '--org: a outra organização fica como estava');
  check(r.conflitos.length === 0, 'sem concorrência, nenhum conflito');
  check(naoClinico(saida.join('\n')), 'a saída da aplicação não mostra conteúdo clínico');

  console.log('\n--- 3. Segunda rodada (idempotência) ---');
  const total = banco.tabela.size;
  const gravadas = banco.gravacoes.length;
  const saida2 = [];
  const r2 = await executar({ supabase: banco.cliente, opcoes: opcoes({ aplicar: true, org: ORG }), projeto: 'falso', log: (l) => saida2.push(l) });
  check(r2.resumo.funcionarios_com_dado_clinico === 0 && saida2.some((l) => /Nada a migrar/.test(l)), 'segunda rodada: nada a migrar');
  check(banco.tabela.size === total && banco.gravacoes.length === gravadas, 'segunda rodada: nenhuma linha nova, nenhuma gravação');
  check(backups().length === 1, 'segunda rodada: sem gravação, sem novo backup');
}

console.log('\n--- 4. Gravação concorrente durante a migração ---');
{
  // Alguem salva o funcionario emp-1 entre a leitura e a gravacao do script.
  let mexido = false;
  const banco = bancoFalso(CENARIO, {
    antesDeGravar: ({ tipo, filtros, tabela, carimbo }) => {
      if (mexido || tipo !== 'update') return;
      if (!filtros.some(([c, v]) => c === 'record_id' && v === 'emp-1')) return;
      tabela.get(`${ORG}|employees|emp-1`).updated_at = carimbo();
      mexido = true;
    },
  });
  fs.rmSync(path.join(TMP, 'backups'), { recursive: true, force: true });
  const r = await executar({ supabase: banco.cliente, opcoes: opcoes({ aplicar: true, org: ORG }), projeto: 'falso', log: () => {} });
  const emp1 = banco.tabela.get(`${ORG}|employees|emp-1`).data;
  check(r.conflitos.some((c) => c.startsWith('employees/emp-1')) && M.funcionarioTemDadoClinico(emp1),
    'linha gravada por outra pessoa no meio não é sobrescrita: fica para a próxima rodada');
  check(Boolean(banco.tabela.get(`${ORG}|examResults|exres-emp-1-aso-1`)), 'o resultado já chegou a examResults antes de se tentar limpar o cadastro');
  const r2 = await executar({ supabase: banco.cliente, opcoes: opcoes({ aplicar: true, org: ORG }), projeto: 'falso', log: () => {} });
  const registros = [...banco.tabela.keys()].filter((k) => k.startsWith(`${ORG}|examResults|exres-emp-1-`));
  check(r2.conflitos.length === 0 && !M.funcionarioTemDadoClinico(banco.tabela.get(`${ORG}|employees|emp-1`).data) && registros.length === 1,
    'na rodada seguinte o cadastro é limpo, sem duplicar o registro de resultados');
}

console.log('\n--- 5. Opções de limpeza ---');
{
  const banco = bancoFalso(CENARIO);
  fs.rmSync(path.join(TMP, 'backups'), { recursive: true, force: true });
  await executar({ supabase: banco.cliente, opcoes: opcoes({ aplicar: true, org: ORG, semEsocial: true, incluirAuditoria: true }), projeto: 'falso', log: () => {} });
  check(banco.tabela.get(`${ORG}|esocialEvents|evt-1`).data.aso_data.exams_list[0].result === 'ALTERADO', '--sem-esocial: o evento fica como estava');
  const aud = banco.tabela.get(`${ORG}|auditLogs|aud-1`).data;
  check(!JSON.stringify(aud).includes(RESTRICAO) && aud.new_data.aso_history[0].result === 'APTO' && aud.action === 'UPDATE_EMPLOYEE',
    '--incluir-auditoria: o dado clínico sai da trilha e o registro do evento fica');
}

console.log('\n--- 6. Credenciais ---');
{
  check(M.credenciais({}) === null, 'sem variável de ambiente, sem credencial');
  const c = M.credenciais({ SUPABASE_URL: 'https://exemplo.invalid', SUPABASE_SERVICE_ROLE_KEY: 'chave-falsa' });
  check(c?.url === 'https://exemplo.invalid' && c?.chave === 'chave-falsa', 'a credencial vem do ambiente');
  const fonte = fs.readFileSync(SCRIPT, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/gm, '$1');
  // A forma do defeito: um JWT (eyJ...) ou a URL de um projeto escritos no
  // codigo, ou a leitura de arquivo .env.
  check(!/eyJ[A-Za-z0-9_-]{10,}/.test(fonte) && !/https:\/\/[a-z0-9]+\.supabase\.co/.test(fonte),
    'nenhuma chave nem URL de projeto escrita no script');
  check(!/readFileSync\([^)]*\.env/.test(fonte) && !/['"`]\.env(\.local)?['"`]/.test(fonte), 'o script não lê .env de arquivo');
  check(/process\.env/.test(fonte) && /--aplicar/.test(fonte), 'lê process.env e só grava com --aplicar');
}

// ===========================================================================
console.log(`\n${casos - falhas}/${casos} casos passaram.`);
if (falhas > 0) {
  console.log(`${falhas} FALHA(S).`);
  process.exit(1);
}
console.log('Migração dos resultados: simulação por padrão, backup antes, idempotente, sem sobrescrever concorrência.');
process.exit(0);
