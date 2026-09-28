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
      path.join(RAIZ, 'lib/protocolosDeExame.ts'),
      path.join(RAIZ, 'lib/datas.ts'),
      path.join(RAIZ, 'lib/ghesDoCargo.ts'),
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

let protocolosLib;
try {
  protocolosLib = require_(achar('protocolosDeExame.js'));
} catch (e) {
  inconclusivo('não foi possível carregar protocolosDeExame', e.message);
}
const {
  ehProtocoloModelo,
  protocolosDoCliente,
  periodicidadeDoTrabalhador,
  validadeSugeridaDoAso,
} = protocolosLib;

let datasLib;
try {
  datasLib = require_(achar('datas.js'));
} catch (e) {
  inconclusivo('não foi possível carregar datas', e.message);
}
const { somarMesesISO } = datasLib;

let cargosLib;
try {
  cargosLib = require_(achar('ghesDoCargo.js'));
} catch (e) {
  inconclusivo('não foi possível carregar ghesDoCargo', e.message);
}
const { ghesDosCargos, avisoDeCargosSemGhe } = cargosLib;

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

// ===========================================================================
// A MATRIZ GOVERNA O VENCIMENTO DO ASO
//
// Antes a validade era "um ano" escrito no formulario: uma audiometria
// semestral saia semestral no PCMSO impresso e o alerta de vencimento
// continuava contando doze meses.
// ===========================================================================
console.log('\n--- a periodicidade cadastrada governa a validade do ASO ---');
{
  const semestralEAnual = [
    {
      id: 'p-audio', client_id: CLIENTE_A, ghe_id: GHE_A,
      exam_code_table_27: '0281', exam_name: 'Audiometria tonal ocupacional',
      periodicity_months: 6, triggers: ['ADMISSIONAL', 'PERIODICO'], status: 'ACTIVE',
    },
    {
      id: 'p-hemo', client_id: CLIENTE_A, ghe_id: GHE_A,
      exam_code_table_27: '0693', exam_name: 'Hemograma',
      periodicity_months: 12, triggers: ['ADMISSIONAL', 'PERIODICO'], status: 'ACTIVE',
    },
  ];

  const p = periodicidadeDoTrabalhador(semestralEAnual, soldador);
  check(p?.meses === 6, `vale a MENOR periodicidade, 6 meses (veio ${p?.meses})`);
  check(/Audiometria/.test(p?.origem || ''), 'e a tela pode dizer de qual exame ela veio');

  const v = validadeSugeridaDoAso('2026-03-09', semestralEAnual, soldador);
  check(v?.data === '2026-09-09', `a validade sai em 09/09/2026 (veio ${v?.data})`);

  // Sem periodicidade na matriz o sistema NAO arbitra prazo: quem define e o
  // medico coordenador. Devolver 12 meses aqui seria inventar um numero.
  check(periodicidadeDoTrabalhador([], soldador) === null,
    'matriz vazia: nenhuma periodicidade presumida');
  check(validadeSugeridaDoAso('2026-03-09', [], soldador) === null,
    'e nenhuma validade sugerida — o campo fica com o médico');

  const soPeriodico = [{
    id: 'p-adm', client_id: CLIENTE_A, ghe_id: GHE_A,
    exam_code_table_27: '0295', exam_name: 'Avaliação clínica',
    periodicity_months: 12, triggers: ['ADMISSIONAL'], status: 'ACTIVE',
  }];
  check(periodicidadeDoTrabalhador(soPeriodico, soldador) === null,
    'exame só admissional não define o vencimento do periódico');

  const inativo = [{
    id: 'p-off', client_id: CLIENTE_A, ghe_id: GHE_A,
    exam_code_table_27: '0281', exam_name: 'Audiometria', periodicity_months: 6,
    triggers: ['PERIODICO'], status: 'INACTIVE',
  }];
  check(periodicidadeDoTrabalhador(inativo, soldador) === null,
    'protocolo inativo não governa nada');

  const zerado = [{
    id: 'p-zero', client_id: CLIENTE_A, ghe_id: GHE_A,
    exam_code_table_27: '0281', exam_name: 'Audiometria', periodicity_months: 0,
    triggers: ['PERIODICO'], status: 'ACTIVE',
  }];
  check(periodicidadeDoTrabalhador(zerado, soldador) === null,
    'periodicidade zero não vira validade no mesmo dia');

  // 31/01 + 1 mes nao existe. Rolar para 03/03 daria ao trabalhador tres
  // dias a mais de prazo do que o protocolo cadastrado diz.
  check(somarMesesISO('2026-01-31', 1) === '2026-02-28',
    `31/01 + 1 mês vence em 28/02, e não em março (${somarMesesISO('2026-01-31', 1)})`);
  check(somarMesesISO('2026-03-31', 6) === '2026-09-30',
    `31/03 + 6 meses vence em 30/09 (${somarMesesISO('2026-03-31', 6)})`);
  check(somarMesesISO('2026-03-09', 6) === '2026-09-09', 'dia que existe nos dois meses é preservado');
  check(somarMesesISO('', 6) === null, 'data vazia não vira validade');
  check(somarMesesISO('2026-03-09', 0) === null, 'periodicidade zero não vira validade');
}

// ===========================================================================
// MODELO E O FILTRO POR CLIENTE
// ===========================================================================
console.log('\n--- protocolo modelo, e a contagem por cliente ---');
{
  const modelo = {
    id: 'modelo-1', client_id: '', ghe_id: '',
    exam_code_table_27: '0295', exam_name: 'Avaliação clínica ocupacional',
    periodicity_months: 12, triggers: ['PERIODICO'], status: 'ACTIVE',
  };
  const doClienteA = {
    id: 'p-A', client_id: CLIENTE_A, ghe_id: GHE_A,
    exam_code_table_27: '0281', exam_name: 'Audiometria tonal ocupacional',
    periodicity_months: 6, triggers: ['PERIODICO'], status: 'ACTIVE',
  };
  const doClienteB = {
    id: 'p-B', client_id: CLIENTE_B, ghe_id: GHE_B,
    exam_code_table_27: '0295', exam_name: 'Avaliação clínica ocupacional',
    periodicity_months: 12, triggers: ['PERIODICO'], status: 'ACTIVE',
  };
  const ghes = [
    { id: GHE_A, client_id: CLIENTE_A },
    { id: GHE_B, client_id: CLIENTE_B },
  ];

  check(ehProtocoloModelo(modelo), 'sem cliente e sem GHE: é modelo');
  check(!ehProtocoloModelo(doClienteA), 'com cliente e GHE: não é modelo');
  check(!ehProtocoloModelo({ ...modelo, ghe_id: GHE_A }),
    'com GHE mas sem cliente: também não é modelo — já foi endereçado');

  const todos = [modelo, doClienteA, doClienteB];
  const deA = protocolosDoCliente(todos, ghes, CLIENTE_A);
  check(deA.length === 2, `o cliente A vê 2: o dele e o modelo (viu ${deA.length})`);
  check(!deA.some((p) => p.id === 'p-B'), 'e NÃO vê o protocolo do cliente B');

  const deB = protocolosDoCliente(todos, ghes, CLIENTE_B);
  check(deB.length === 2, 'o cliente B vê o dele e o modelo');
  check(protocolosDoCliente(todos, ghes, null).length === 3,
    'sem cliente selecionado, vê os três');

  // Era aqui que o card do painel e a lista discordavam: um contava todos.
  check(protocolosDoCliente(todos, ghes, CLIENTE_A).length !== todos.length,
    'a contagem por cliente é MENOR que o total — é o que o card mostrava errado');

  check(protocolosDoCliente([...todos, { ...doClienteA, id: 'off', status: 'INACTIVE' }],
    ghes, CLIENTE_A).length === 2, 'protocolo inativo não entra na conta');
}

// ===========================================================================
// A TELA USA ESSAS REGRAS
// ===========================================================================
console.log('\n--- ligação com as telas (conferência no código) ---');
{
  const semComentarios = (txt) => txt
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');

  const aba = semComentarios(fs.readFileSync(path.join(RAIZ, 'components/sst/ExamPCMSOTab.tsx'), 'utf8'));
  const painel = semComentarios(fs.readFileSync(path.join(RAIZ, 'components/sst/SSTUnifiedEngineeringView.tsx'), 'utf8'));
  const dados = semComentarios(fs.readFileSync(path.join(RAIZ, 'lib/esocialDados.ts'), 'utf8'));

  check(/protocolosDoCliente\(/.test(aba), 'a lista da aba usa o filtro único');
  check(/protocolosDoCliente\(/.test(painel), 'o card do painel usa o MESMO filtro');
  check(!/examProtocols\.length\} exames/.test(painel),
    'o card não conta mais os protocolos de todos os clientes');
  check(/protocolosDoTrabalhador\(/.test(dados),
    'a sugestão de exames do ASO usa o mesmo filtro de alcance');

  check(/validadeSugeridaDoAso\(/.test(aba), 'a validade do ASO vem da matriz');
  check(!/validity_date: addYearsISO\(1\)/.test(aba),
    'o "um ano" fixo saiu do formulário');
  check(/ehProtocoloModelo\(/.test(aba), 'a aba identifica o protocolo modelo');
  check(/Copiar para este cliente/.test(aba), 'e oferece copiá-lo para o cliente');
  check(/Modelo do sistema/.test(aba), 'dizendo, na lista, que ele não é o PCMSO deste cliente');
}

// ===========================================================================
// CARGO -> GHE: O ATALHO SILENCIOSO
//
// Risco e exame ligam-se a GHE, nao a cargo. Quando a tela deixava marcar
// CARGOS e o cargo nao estava em GHE nenhum, o sistema aplicava no PRIMEIRO
// GHE do cliente e dizia "sucesso": exame num grupo que ninguem escolheu, e
// dali para o ASO daqueles trabalhadores e para o S-2220.
// ===========================================================================
console.log('\n--- de qual GHE faz parte o cargo ---');
{
  const RECEPCIONISTA = 'job-recep';
  const SOLDADOR = 'job-sold';
  const AUXILIAR = 'job-aux';

  const cargos = [
    { id: RECEPCIONISTA, client_id: CLIENTE_A, name: 'Recepcionista' },
    { id: SOLDADOR, client_id: CLIENTE_A, name: 'Soldador' },
    { id: AUXILIAR, client_id: CLIENTE_A, name: 'Auxiliar de produção' },
    { id: 'job-outro', client_id: CLIENTE_B, name: 'Recepcionista' },
  ];

  const ghesDoCenario = [
    { id: 'ghe-adm', client_id: CLIENTE_A, name: 'Administrativo', job_ids: [RECEPCIONISTA] },
    { id: 'ghe-sold', client_id: CLIENTE_A, name: 'Soldagem', job_ids: [SOLDADOR, AUXILIAR] },
    { id: 'ghe-mont', client_id: CLIENTE_A, name: 'Montagem', job_ids: [AUXILIAR] },
    { id: 'ghe-b', client_id: CLIENTE_B, name: 'Recepção B', job_ids: ['job-outro'] },
  ];

  const r1 = ghesDosCargos(ghesDoCenario, cargos, CLIENTE_A, [RECEPCIONISTA]);
  check(r1.gheIds.length === 1 && r1.gheIds[0] === 'ghe-adm',
    'o cargo cai no GHE que o lista, e só nele');
  check(r1.cargosSemGhe.length === 0, 'e nada fica de fora');

  // `find` devolvia so o primeiro: o segundo GHE ficava sem o exame.
  const r2 = ghesDosCargos(ghesDoCenario, cargos, CLIENTE_A, [AUXILIAR]);
  check(r2.gheIds.length === 2,
    `cargo em dois GHE alcança os DOIS (alcançou ${r2.gheIds.length})`);

  // O caso que produzia o defeito.
  const semGhe = [{ id: 'ghe-sold', client_id: CLIENTE_A, name: 'Soldagem', job_ids: [SOLDADOR] }];
  const r3 = ghesDosCargos(semGhe, cargos, CLIENTE_A, [RECEPCIONISTA]);
  check(r3.gheIds.length === 0,
    'cargo fora de qualquer GHE NÃO cai no primeiro GHE do cliente');
  check(r3.cargosSemGhe.length === 1 && r3.cargosSemGhe[0] === 'Recepcionista',
    'ele volta pelo nome, para o usuário ser avisado');
  check(/Recepcionista/.test(avisoDeCargosSemGhe(r3.cargosSemGhe))
    && /nenhum GHE/.test(avisoDeCargosSemGhe(r3.cargosSemGhe)),
    'e o aviso diz qual cargo ficou de fora');
  check(/[Vv]incule/.test(avisoDeCargosSemGhe(r3.cargosSemGhe)),
    'dizendo também o que fazer a respeito');
  check(avisoDeCargosSemGhe([]) === '', 'sem cargo de fora, nenhum aviso');

  // Aplicacao parcial: o que entrou entra, o que ficou de fora e dito.
  const r4 = ghesDosCargos(semGhe, cargos, CLIENTE_A, [SOLDADOR, RECEPCIONISTA]);
  check(r4.gheIds.length === 1 && r4.cargosSemGhe.length === 1,
    'aplicação parcial: aplica no que dá e conta o que não deu');

  // Cargo de outro cliente com o MESMO nome nao alcanca GHE deste.
  const r5 = ghesDosCargos(ghesDoCenario, cargos, CLIENTE_A, ['job-outro']);
  check(r5.gheIds.length === 0,
    'cargo de outro cliente não alcança GHE deste — mesmo com nome idêntico');

  // GHE com nome parecido com o cargo nao conta: era um dos casamentos
  // "espertos" da aplicacao de riscos.
  const soNome = [{ id: 'ghe-x', client_id: CLIENTE_A, name: 'Recepcionista e portaria', job_ids: [] }];
  check(ghesDosCargos(soNome, cargos, CLIENTE_A, [RECEPCIONISTA]).gheIds.length === 0,
    'nome de GHE parecido com o do cargo NÃO vale como vínculo');

  check(ghesDosCargos([], cargos, CLIENTE_A, [RECEPCIONISTA]).gheIds.length === 0,
    'cliente sem GHE nenhum: nada é aplicado');
  check(ghesDosCargos(ghesDoCenario, cargos, CLIENTE_A, []).cargosSemGhe.length === 0,
    'nenhum cargo marcado: nada a avisar');
}

console.log('\n--- as duas aplicações em lote usam essa regra ---');
{
  const semComentarios = (txt) => txt
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');

  const ctx = semComentarios(fs.readFileSync(path.join(RAIZ, 'context/PrevSafeContext.tsx'), 'utf8'));
  const aba = semComentarios(fs.readFileSync(path.join(RAIZ, 'components/sst/GHERiskInventoryTab.tsx'), 'utf8'));

  check((ctx.match(/ghesDosCargos\(/g) || []).length === 2,
    'riscos e exames resolvem o cargo pela mesma função');
  check((ctx.match(/avisoDeCargosSemGhe\(/g) || []).length >= 4,
    'e as duas avisam quando um cargo fica de fora');

  // O defeito, pela forma: o fallback para o primeiro GHE do cliente.
  check(!/targetGheIds\.push\(clientGhes\[0\]\.id\)/.test(ctx),
    'o atalho para o primeiro GHE do cliente saiu da aplicação de exames');
  check(!/resolvedGheIds\.push\(matchingGhes\[0\]\.id\)/.test(ctx),
    'e da aplicação de riscos');
  check(!/const clientGhe = ghes\.find\(g => g\.client_id === payload\.client_id\)/.test(ctx),
    'e o fallback final também');
  check(!/g\.name\.toLowerCase\(\)\.includes\(job\.name\.toLowerCase\(\)\)/.test(ctx),
    'casar cargo com GHE pelo NOME saiu de vez');

  check(/const clientJobs = hierarchyJobs\.filter\(/.test(aba),
    'a tela lista só os cargos deste cliente');
  check(!/\{hierarchyJobs\.map\(job =>/.test(aba),
    'nenhuma lista de cargos mostra os de todos os clientes');
  check(!/\{hierarchySectors\.map\(sec =>/.test(aba),
    'nem a de setores');
  check(!/job_ids: hierarchyJobs\.slice\(0, 2\)/.test(aba),
    'GHE novo não nasce com cargos pré-marcados');
  check(!/sector_ids: hierarchySectors\.slice\(0, 1\)/.test(aba),
    'nem com setor pré-marcado');
}

console.log(
  falhas === 0 ? `\nTODOS OS TESTES PASSARAM (${casos} casos)` : `\n${falhas} FALHA(S) em ${casos} casos`
);
process.exitCode = falhas === 0 ? 0 : 1;
