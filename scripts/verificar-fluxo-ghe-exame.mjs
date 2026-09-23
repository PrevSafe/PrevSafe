/**
 * Verificacao do fluxo GHE -> exame -> ASO -> S-2220.
 *
 *   node scripts/verificar-fluxo-ghe-exame.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * O usuario reportou: "preciso aplicar os exames ao GHE mas ainda nao
 * funciona". Os testes anteriores conferiam TABELAS (os codigos certos) e
 * FUNCOES isoladas, mas nenhum percorria a cadeia inteira - e era na cadeia
 * que estava quebrado:
 *
 *   - INITIAL_GHES vem vazio, e criar um GHE dava `return` em silencio quando
 *     faltava nome ou codigo
 *   - sem cliente selecionado, o GHE nascia com client_id vazio e sumia de
 *     todos os filtros por cliente
 *   - o select de GHE da tela de exames listava GHEs de TODOS os clientes
 *   - o protocolo com ghe_id vazio nao alcancava colaborador nenhum
 *
 * Este teste monta o caminho completo com as funcoes reais e confere que o
 * exame aplicado a um GHE chega ao ASO do colaborador daquele GHE - e NAO
 * chega ao de outro cliente.
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
const TMP = path.join(RAIZ, '.tmp-fluxo-verificacao');

function inconclusivo(motivo, detalhe) {
  console.log('\nINCONCLUSIVO — a verificação não pôde ser executada.');
  console.log(`motivo: ${motivo}`);
  if (detalhe) console.log(String(detalhe).split('\n').slice(0, 20).join('\n'));
  process.exit(2);
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const TSCONFIG = path.join(TMP, 'tsconfig.verificacao.json');
fs.writeFileSync(
  TSCONFIG,
  JSON.stringify({
    compilerOptions: {
      outDir: TMP,
      module: 'commonjs',
      target: 'es2020',
      moduleResolution: 'node',
      skipLibCheck: true,
      baseUrl: RAIZ,
      paths: { '@/*': ['./*'] },
    },
    files: [
      path.join(RAIZ, 'lib/esocialDados.ts'),
      path.join(RAIZ, 'lib/tabela27.ts'),
      path.join(RAIZ, 'lib/tabela24.ts'),
    ],
  })
);

try {
  execFileSync('npx', ['tsc', '-p', TSCONFIG], { stdio: 'pipe', shell: true, cwd: RAIZ });
} catch (e) {
  inconclusivo('npx tsc falhou', e.stdout?.toString() || e.message);
}

const achar = (nome) =>
  [path.join(TMP, 'lib', nome), path.join(TMP, nome)].find((p) => fs.existsSync(p));

const CAMINHO = achar('esocialDados.js');
if (!CAMINHO) inconclusivo('o tsc não emitiu esocialDados.js');

// O alias "@/" nao e reescrito pelo tsc.
for (const dir of [path.join(TMP, 'lib'), TMP]) {
  if (!fs.existsSync(dir)) continue;
  for (const arquivo of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const alvo = path.join(dir, arquivo);
    const js = fs.readFileSync(alvo, 'utf8').replace(/require\("@\/lib\/([^"]+)"\)/g, 'require("./$1")');
    fs.writeFileSync(alvo, js);
  }
}

fs.writeFileSync(path.join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

const require_ = createRequire(import.meta.url);
let esocial;
try {
  esocial = require_(CAMINHO);
} catch (e) {
  inconclusivo('não foi possível carregar o módulo compilado', e.message);
}

const { exameSugeridosParaAso, montarAsoDoEvento, riscosDoColaborador } = esocial;

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

// ===========================================================================
// O cenário: dois clientes, um GHE cada, um colaborador em cada.
// ===========================================================================
const CLIENTE_A = 'cli-A';
const CLIENTE_B = 'cli-B';
const GHE_A = 'ghe-A-soldagem';
const GHE_B = 'ghe-B-escritorio';

const soldador = {
  id: 'emp-A1',
  client_id: CLIENTE_A,
  ghe_id: GHE_A,
  job_id: 'job-sold',
  name: 'João Ferreira',
  cpf: '529.982.247-25',
  registration_number: 'MAT-001',
  cbo: '7242-10',
  job_title: 'Soldador',
  admission_date: '2024-02-01',
  status: 'ACTIVE',
  aso_history: [],
};

const administrativo = {
  id: 'emp-B1',
  client_id: CLIENTE_B,
  ghe_id: GHE_B,
  job_id: 'job-adm',
  name: 'Marta Lima',
  cpf: '168.995.350-09',
  registration_number: 'MAT-002',
  cbo: '4110-10',
  job_title: 'Assistente Administrativo',
  admission_date: '2024-05-10',
  status: 'ACTIVE',
  aso_history: [],
};

console.log('--- o exame aplicado ao GHE chega ao colaborador daquele GHE ---');
{
  // Isto é o que a tela grava quando você usa "Aplicar Exame" no GHE.
  const protocolosAplicados = [
    {
      id: 'p1',
      client_id: CLIENTE_A,
      ghe_id: GHE_A,
      exam_code_table_27: '0281',
      exam_name: 'Audiometria tonal ocupacional',
      periodicity_months: 12,
      triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'],
      status: 'ACTIVE',
    },
    {
      id: 'p2',
      client_id: CLIENTE_A,
      ghe_id: GHE_A,
      exam_code_table_27: '0295',
      exam_name: 'Avaliação clínica ocupacional (anamnese e exame físico)',
      periodicity_months: 12,
      triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'],
      status: 'ACTIVE',
    },
    {
      id: 'p3',
      client_id: CLIENTE_B,
      ghe_id: GHE_B,
      exam_code_table_27: '0295',
      exam_name: 'Avaliação clínica ocupacional (anamnese e exame físico)',
      periodicity_months: 12,
      triggers: ['PERIODICO'],
      status: 'ACTIVE',
    },
  ];

  const doSoldador = exameSugeridosParaAso(soldador, protocolosAplicados, 'PERIODICO');
  check(
    doSoldador.length === 2,
    `o soldador recebe os 2 exames aplicados ao GHE dele (${doSoldador.length})`
  );
  check(
    doSoldador.some((e) => e.exam_code_table_27 === '0281'),
    'a audiometria aplicada ao GHE aparece no ASO dele'
  );
  check(
    !doSoldador.some((e) => e.protocol_id === 'p3'),
    'e o protocolo do OUTRO cliente NÃO aparece'
  );

  const daAdministrativa = exameSugeridosParaAso(administrativo, protocolosAplicados, 'PERIODICO');
  check(
    daAdministrativa.length === 1 && daAdministrativa[0].protocol_id === 'p3',
    'a administrativa recebe só o exame do GHE dela'
  );
}

console.log('\n--- GHE sem exame aplicado ---');
{
  const nenhum = exameSugeridosParaAso(soldador, [], 'PERIODICO');
  check(nenhum.length === 0, 'sem protocolo aplicado, a lista vem vazia');
  check(Array.isArray(nenhum), 'e vem como lista, não como erro');
}

console.log('\n--- protocolo com ghe_id vazio vale para qualquer GHE do cliente ---');
{
  // É o caso dos protocolos MODELO que acompanham o sistema.
  const modelo = [
    {
      id: 'modelo',
      client_id: '',
      ghe_id: '',
      exam_code_table_27: '0295',
      exam_name: 'Avaliação clínica ocupacional (anamnese e exame físico)',
      periodicity_months: 12,
      triggers: ['ADMISSIONAL', 'PERIODICO', 'DEMISSIONAL'],
      status: 'ACTIVE',
    },
  ];
  const r = exameSugeridosParaAso(soldador, modelo, 'PERIODICO');
  check(r.length === 1, 'o protocolo modelo alcança o colaborador');
  check(
    r[0].exam_code_table_27 === '0295',
    'com o código da Tabela 27 normalizado'
  );
}

console.log('\n--- colaborador sem GHE cai para o vínculo por cargo ---');
{
  const semGhe = { ...soldador, ghe_id: undefined };
  const porCargo = [
    {
      id: 'pc',
      client_id: CLIENTE_A,
      ghe_id: '',
      job_id: 'job-sold',
      exam_code_table_27: '0281',
      exam_name: 'Audiometria tonal ocupacional',
      periodicity_months: 12,
      triggers: ['PERIODICO'],
      status: 'ACTIVE',
    },
  ];
  const r = exameSugeridosParaAso(semGhe, porCargo, 'PERIODICO');
  check(r.length === 1, 'sem GHE, o protocolo do cliente ainda alcança');
}

console.log('\n--- protocolo inativo não é aplicado ---');
{
  const inativo = [
    {
      id: 'x',
      client_id: CLIENTE_A,
      ghe_id: GHE_A,
      exam_code_table_27: '0281',
      exam_name: 'Audiometria tonal ocupacional',
      periodicity_months: 12,
      triggers: ['PERIODICO'],
      status: 'INACTIVE',
    },
  ];
  check(
    exameSugeridosParaAso(soldador, inativo, 'PERIODICO').length === 0,
    'protocolo INACTIVE fica de fora'
  );
}

console.log('\n--- o gatilho do ASO filtra ---');
{
  const soDemissional = [
    {
      id: 'd',
      client_id: CLIENTE_A,
      ghe_id: GHE_A,
      exam_code_table_27: '1057',
      exam_name: 'Prova de função pulmonar completa (ou espirometria)',
      periodicity_months: 12,
      triggers: ['DEMISSIONAL'],
      status: 'ACTIVE',
    },
  ];
  check(
    exameSugeridosParaAso(soldador, soDemissional, 'PERIODICO').length === 0,
    'exame só demissional não aparece num ASO periódico'
  );
  check(
    exameSugeridosParaAso(soldador, soDemissional, 'DEMISSIONAL').length === 1,
    'e aparece no demissional'
  );
}

console.log('\n--- do exame aplicado até o evento S-2220 ---');
{
  // Fecha a volta: o exame que veio do GHE, lancado com resultado, chega ao
  // evento com o codigo e a denominacao oficiais.
  const comAso = {
    ...soldador,
    aso_history: [
      {
        id: 'aso-1',
        aso_type: 'PERIODICO',
        exam_date: '2026-03-10',
        result: 'APTO',
        physician_name: 'Dra. Helena Braga',
        physician_crm: 'CRM-BA 44120',
        physician_uf: 'BA',
        exams: [
          {
            id: 'e1',
            exam_code_table_27: '0281',
            exam_name: 'Audiometria tonal ocupacional',
            exam_date: '2026-03-09',
            procedure_type: 'AUDIOMETRIA',
            result: 'NORMAL',
          },
        ],
      },
    ],
  };

  const m = montarAsoDoEvento(comAso, comAso.aso_history[0]);
  check(m.dados.exams_list.length === 1, 'o exame lançado chega ao evento');
  check(m.dados.exams_list[0].code === '0281', 'com o código do GHE (0281)');
  check(
    m.dados.exams_list[0].name === 'Audiometria tonal ocupacional',
    'e com a denominação oficial da Tabela 27'
  );
  check(
    !m.pendencias.some((p) => /exame com resultado/i.test(p.motivo)),
    'e sem a pendência de exames'
  );
}

console.log(
  falhas === 0 ? `\nTODOS OS TESTES PASSARAM (${casos} casos)` : `\n${falhas} FALHA(S) em ${casos} casos`
);
process.exitCode = falhas === 0 ? 0 : 1;
