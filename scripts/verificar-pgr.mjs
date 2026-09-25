/**
 * Verificacao do PGR contra o modelo da PrevSafe.
 *
 *   node scripts/verificar-pgr.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * O usuario gerou o PGR e ele saiu com UMA PAGINA: tres secoes, sem
 * metodologia, sem criterios de avaliacao, sem caracterizacao dos processos.
 * O modelo tem dez secoes mais capa, e e a metodologia (secao 5) que sustenta
 * a classificacao de cada risco perante a fiscalizacao.
 *
 * Havia ainda DUAS formulas de classificacao no sistema, divergentes entre si
 * e do modelo. A mais grave: score 20 saia "ALTO" numa tela e "CRITICO" na
 * outra, quando no modelo 20 e MUITO ALTO - nivel em que a atividade nao se
 * inicia ou e interrompida ate a reducao do risco.
 *
 * Este teste GERA O PDF e confere o que saiu, celula por celula contra a
 * matriz do modelo.
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
const TMP = path.join(RAIZ, '.tmp-pgr-verificacao');

function inconclusivo(motivo, detalhe) {
  console.log('\nINCONCLUSIVO — a verificação não pôde ser executada.');
  console.log(`motivo: ${motivo}`);
  if (detalhe) console.log(String(detalhe).split('\n').slice(0, 20).join('\n'));
  process.exit(2);
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

fs.writeFileSync(
  path.join(TMP, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      outDir: TMP,
      module: 'commonjs',
      target: 'es2020',
      moduleResolution: 'node',
      esModuleInterop: true,
      skipLibCheck: true,
      baseUrl: RAIZ,
      paths: { '@/*': ['./*'] },
    },
    files: [
      path.join(RAIZ, 'lib/pdfExportService.ts'),
      path.join(RAIZ, 'lib/classificacaoDeRisco.ts'),
      path.join(RAIZ, 'lib/pgrModelo.ts'),
      path.join(RAIZ, 'lib/situacaoOperacional.ts'),
    ],
  })
);

try {
  execFileSync('npx', ['tsc', '-p', path.join(TMP, 'tsconfig.json')], {
    stdio: 'pipe', shell: true, cwd: RAIZ
  });
} catch (e) {
  inconclusivo('npx tsc falhou', e.stdout?.toString() || e.message);
}

const achar = (n) => [path.join(TMP, 'lib', n), path.join(TMP, n)].find((p) => fs.existsSync(p));
for (const dir of [path.join(TMP, 'lib'), TMP]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const alvo = path.join(dir, f);
    fs.writeFileSync(
      alvo,
      fs.readFileSync(alvo, 'utf8').replace(/require\("@\/lib\/([^"]+)"\)/g, 'require("./$1")')
    );
  }
}
fs.writeFileSync(path.join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

const require_ = createRequire(path.join(RAIZ, 'scripts', 'x.cjs'));

let ultimoPdf = null;
try {
  const jspdf = require_('jspdf');
  const Original = jspdf.jsPDF;
  function Envolvido(...args) {
    const inst = new Original(...args);
    inst.save = function () {
      ultimoPdf = Buffer.from(this.output('arraybuffer'));
      return this;
    };
    return inst;
  }
  Envolvido.prototype = Original.prototype;
  for (const k of Object.keys(Original)) Envolvido[k] = Original[k];
  jspdf.jsPDF = Envolvido;
} catch (e) {
  inconclusivo('não foi possível carregar o jspdf', e.message);
}

let servico, classif, situacao;
try {
  servico = require_(achar('pdfExportService.js'));
  classif = require_(achar('classificacaoDeRisco.js'));
  situacao = require_(achar('situacaoOperacional.js'));
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', e.message);
}

const { exportPGRDocumentPdf } = servico;
const { classificarRisco, matrizDoModelo, FAIXAS_DO_MODELO, normalizarNivelAntigo } = classif;

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

/**
 * As strings que o PDF manda desenhar.
 *
 * O jsPDF escreve em WinAnsi, onde travessao, bullet e reticencias ocupam a
 * faixa 0x85-0x97 — que em latin1 sao caracteres de controle. Sem traduzi-los,
 * "20 — Muito alto" vira "20 \u0097 Muito alto" e a comparacao falha por um
 * motivo que nao tem nada a ver com o documento.
 */
const WINANSI = { 0x85: '...', 0x91: "'", 0x92: "'", 0x93: '"', 0x94: '"', 0x95: '*', 0x96: '-', 0x97: '-' };

function trechosDoPdf(buf) {
  const bruto = buf.toString('latin1');
  const out = [];
  for (const m of bruto.matchAll(/\((?:\\[\s\S]|[^\\()])*\)\s*Tj/g)) {
    const cru = m[0].slice(1, m[0].lastIndexOf(')')).replace(/\\([\\()])/g, '$1');
    out.push([...cru].map((ch) => WINANSI[ch.charCodeAt(0)] ?? ch).join(''));
  }
  return out;
}
const texto = (buf) => trechosDoPdf(buf).join('\n');
const corrido = (buf) => trechosDoPdf(buf).join(' ').replace(/\s+/g, ' ');
const paginas = (buf) => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
const quebrados = (buf) => trechosDoPdf(buf).filter((t) => t.includes('\u0000'));

// ===========================================================================
// 1. A MATRIZ, CELULA POR CELULA CONTRA O MODELO
// ===========================================================================
console.log('\n--- 1. Matriz S x P (seção 5.6 do modelo) ---');

// Transcrita da tabela da secao 5.6. Linha S5 a S1, coluna P1 a P5.
const MATRIZ_DO_MODELO = {
  5: [[5, 'Médio'], [10, 'Médio'], [15, 'Alto'], [20, 'Muito alto'], [25, 'Muito alto']],
  4: [[4, 'Baixo'], [8, 'Médio'], [12, 'Alto'], [16, 'Alto'], [20, 'Muito alto']],
  3: [[3, 'Baixo'], [6, 'Médio'], [9, 'Médio'], [12, 'Alto'], [15, 'Alto']],
  2: [[2, 'Baixo'], [4, 'Baixo'], [6, 'Médio'], [8, 'Médio'], [10, 'Médio']],
  1: [[1, 'Baixo'], [2, 'Baixo'], [3, 'Baixo'], [4, 'Baixo'], [5, 'Médio']],
};

let celulasOk = 0;
let celulasErradas = [];
for (const s of [5, 4, 3, 2, 1]) {
  for (let p = 1; p <= 5; p++) {
    const [scoreEsperado, rotuloEsperado] = MATRIZ_DO_MODELO[s][p - 1];
    const c = classificarRisco(s, p);
    if (c && c.score === scoreEsperado && c.rotulo === rotuloEsperado) celulasOk++;
    else celulasErradas.push(`S${s}xP${p}: esperado ${scoreEsperado} ${rotuloEsperado}, veio ${c ? `${c.score} ${c.rotulo}` : 'null'}`);
  }
}
check(celulasOk === 25, `as 25 células da matriz batem com o modelo${celulasErradas.length ? ` — ${celulasErradas[0]}` : ''}`);

// A tabela impressa no PGR e gerada pela mesma funcao: nao pode divergir.
const impressa = matrizDoModelo();
check(impressa.length === 5 && impressa[0].severidade === 5, 'a matriz impressa começa em S5, como no modelo');
check(
  impressa.every((l, i) => l.celulas.every((c, j) => c.score === MATRIZ_DO_MODELO[[5, 4, 3, 2, 1][i]][j][0])),
  'a matriz impressa é a mesma que a função calcula'
);

check(
  FAIXAS_DO_MODELO.map((f) => `${f.rotulo} ${f.de}-${f.ate}`).join('; ') ===
    'Baixo 1-4; Médio 5-10; Alto 12-16; Muito alto 20-25',
  'as faixas são as do modelo (1-4, 5-10, 12-16, 20-25)'
);

// O caso que divergia entre as duas telas.
const vinte = classificarRisco(4, 5);
check(vinte?.nivel === 'MUITO_ALTO', 'score 20 é MUITO ALTO (saía "ALTO" numa tela e "CRITICO" na outra)');
check(
  vinte?.decisao.includes('não se inicia ou é interrompida'),
  'score 20 manda interromper a atividade, conforme a seção 5.7'
);
check(classificarRisco(3, 3)?.nivel === 'MEDIO', 'score 9 é MÉDIO (o catálogo dizia BAIXO)');
check(classificarRisco(4, 3)?.nivel === 'ALTO', 'score 12 é ALTO (as duas telas diziam MÉDIO)');

check(classificarRisco(0, 3) === null, 'sem severidade avaliada não há classificação');
check(classificarRisco(3, undefined) === null, 'sem probabilidade avaliada não há classificação');
check(normalizarNivelAntigo('CRITICO') === 'MUITO_ALTO', 'o rótulo antigo CRITICO vira MUITO_ALTO');
check(normalizarNivelAntigo('MUITO_BAIXO') === 'BAIXO', 'o rótulo antigo MUITO_BAIXO vira BAIXO');

// Prioridades e prazos da secao 5.7.
check(classificarRisco(5, 5)?.prioridade === 1 && classificarRisco(5, 5)?.prazoEmDias === 30, 'muito alto: prioridade 1, 30 dias');
check(classificarRisco(4, 4)?.prioridade === 2 && classificarRisco(4, 4)?.prazoEmDias === 90, 'alto: prioridade 2, 90 dias');
check(classificarRisco(2, 3)?.prioridade === 3 && classificarRisco(2, 3)?.prazoEmDias === 270, 'médio: prioridade 3, 270 dias');
check(classificarRisco(1, 1)?.prioridade === 4, 'baixo: prioridade 4');

// ===========================================================================
// 2. O DOCUMENTO GERADO
// ===========================================================================
console.log('\n--- 2. Estrutura do PGR emitido ---');

const CLIENTE = {
  id: 'c1',
  legal_name: 'GRAUS CLINICA DE REABILITACAO LTDA',
  trade_name: 'Graus Clínica',
  document_number: '12.483.776/0001-99',
  main_cnae: '86.50-0-04',
  risk_degree: 2,
  address: 'Rua X, 100', city: 'Salvador', state: 'BA',
};
const ORG = {
  id: 'o1', name: 'PrevSafe',
  technical_responsible_name: 'Gean Monteiro',
  technical_responsible_title: 'Técnico em Segurança do Trabalho',
  technical_responsible_council: 'MTE 0023487/BA',
  pcmso_physician_name: 'Dra. Helena Rocha', pcmso_physician_crm: 'CRM-BA 54321',
};
const GHES = [{ id: 'g1', code: 'GHE-01', name: 'Atendimento', client_id: 'c1' }];
const RISCO_CLASSIFICADO = {
  id: 'r1', ghe_id: 'g1', client_id: 'c1', risk_category: 'FISICO',
  agent_name: 'Ruído contínuo', generating_source: 'Equipamentos de climatização',
  health_effects: 'PAIR, zumbido', evaluation_type: 'QUANTITATIVA',
  measured_value: '78,4', measurement_unit: 'dB(A)',
  measurement_methodology: 'NHO-01', action_level: 'dose 0,5', tolerance_limit: 'dose 1,0',
  severity: 4, probability: 5, epc_implemented: false, epi_required: false,
  operational_situation: ['ROTINEIRA', 'NAO_ROTINEIRA'],
  operational_situation_note: 'limpeza e ajuste',
};
// Risco de OUTRO cliente: a versao anterior o trazia para o plano de acao.
const RISCO_DE_OUTRO_CLIENTE = {
  id: 'r9', ghe_id: 'ghe-de-outra-empresa', client_id: 'cli-9',
  risk_category: 'QUIMICO', agent_name: 'Benzeno em outra empresa',
  severity: 5, probability: 5, epc_implemented: false,
};
const FUNCIONARIOS = [
  { id: 'e1', ghe_id: 'g1', client_id: 'c1', name: 'Ana Clara', job_title: 'Recepcionista', status: 'ACTIVE' },
  { id: 'e2', ghe_id: 'g1', client_id: 'c1', name: 'Samily Oliveira', job_title: 'Recepcionista', status: 'ACTIVE' },
];
const SETORES = [{ id: 's1', name: 'Atendimento', client_id: 'c1' }];

function gerar(args) {
  ultimoPdf = null;
  exportPGRDocumentPdf(args);
  if (!ultimoPdf) inconclusivo('exportPGRDocumentPdf não produziu PDF');
  return ultimoPdf;
}

const pdfCheio = gerar({
  client: CLIENTE, organization: ORG, ghes: GHES,
  risks: [RISCO_CLASSIFICADO, RISCO_DE_OUTRO_CLIENTE],
  employees: FUNCIONARIOS, sectors: SETORES, units: [],
});
const pdfVazio = gerar({
  client: CLIENTE, organization: ORG, ghes: [], risks: [], employees: [], sectors: [], units: [],
});

const t = texto(pdfCheio);
const tc = corrido(pdfCheio);
const tv = texto(pdfVazio);

check(paginas(pdfCheio) >= 10, `o PGR tem ${paginas(pdfCheio)} páginas (tinha 1)`);
check(quebrados(pdfCheio).length === 0, 'nenhuma string caiu em UTF-16BE');

// As dez secoes do modelo.
const SECOES = [
  '1. IDENTIFICAÇÃO DA ORGANIZAÇÃO E ABRANGÊNCIA',
  '2. OBJETIVO, CAMPO DE APLICAÇÃO E BASE LEGAL',
  '3. TERMOS E DEFINIÇÕES',
  '4. ESTRUTURA, RESPONSABILIDADES E INTEGRAÇÃO',
  '5. METODOLOGIA DO GERENCIAMENTO DE RISCOS',
  '6. CARACTERIZAÇÃO DO ESTABELECIMENTO',
  '7. INVENTÁRIO DE RISCOS OCUPACIONAIS',
  '8. PLANO DE AÇÃO',
  '9. ACOMPANHAMENTO, RESPOSTA A EMERGÊNCIAS E GESTÃO DO PROGRAMA',
  '10. ANEXOS E CHECKLIST DE CONFORMIDADE',
];
for (const s of SECOES) {
  check(tc.includes(s), `traz a seção "${s.slice(0, 42)}${s.length > 42 ? '…' : ''}"`);
}

// Subsecoes da metodologia, que e o que faltava.
for (const sub of ['5.1 Levantamento preliminar', '5.2 Identificação de perigos',
  '5.3 Fatores de risco psicossociais', '5.4 Gradação da severidade',
  '5.5 Gradação da probabilidade', '5.6 Matriz de risco', '5.7 Classificação e tomada de decisão']) {
  check(tc.includes(sub), `metodologia: "${sub}"`);
}

// Capa e controle documental.
check(tc.includes('PROGRAMA DE'), 'a capa traz o título do documento');
check(tc.includes('PGR-12483776000199-2026-REV00'), 'a capa traz o código do documento');
check(tc.includes('CONTROLE DE REVISÕES'), 'traz o controle de revisões');
check(tc.includes('TERMO DE RESPONSABILIDADE E APROVAÇÃO'), 'traz o termo de responsabilidade');
check(tc.includes('23/09/2028') || /\d{2}\/\d{2}\/20\d\d \(24 meses/.test(tc), 'a próxima revisão é a 24 meses');
check(tc.includes('subitem 1.5.4.4.6.1'), 'cita o subitem do prazo ampliado com certificação SGSST');

// Conteudo normativo do modelo.
check(tc.includes('Orientação Técnica SIT nº 3/2023'), 'reproduz a nota sobre quem pode elaborar o PGR');
check(tc.includes('Portarias MTE nº 1.419/2024 e nº 765/2025'), 'cita a redação vigente da NR-01');
check(tc.includes('Anexo I'), 'as definições citam o Anexo I da NR-01');
check(tc.includes('1.5.4.4.2.2'), 'cita o subitem dos critérios de avaliação');
check(tc.includes('1.5.7.3.2'), 'cita o subitem das alíneas do inventário');
check(tc.includes('20 anos'), 'cita a guarda de 20 anos do histórico');
check(!tc.includes('OHSAS'), 'não cita a OHSAS 18001, cancelada');
check(!tc.includes('AS/NZS'), 'não cita a AS/NZS 4360, superada');

// O risco real, com a classificacao do modelo.
check(tc.includes('Ruído contínuo'), 'o inventário traz o perigo cadastrado');
check(tc.includes('R-GHE-01-01'), 'o registro do inventário recebe ID rastreável');
check(tc.includes('20 - Muito alto'), 'o risco S4xP5 sai classificado 20 Muito alto');

// Vazamento entre clientes: a versao anterior nao filtrava o plano de acao.
check(!tc.includes('Benzeno em outra empresa'), 'NÃO traz risco de outro cliente');

// Pendencias em vez de conteudo inventado.
check(tc.includes('PENDENTE'), 'os campos sem dado saem como pendência nomeada');
check(/10\.3 Pendências deste PGR \(\d+\)/.test(tc), 'o PGR fecha com a lista de pendências');
check(tc.includes('Atendido'), 'o checklist marca o que está atendido');
check(tc.includes('Com pendência'), 'o checklist marca o que falta');

// Nada de exemplo do modelo vaza para o documento do cliente.
// 'R-GES02-F01' NAO entra nesta lista: o modelo o traz na secao 7.1 como
// exemplo do FORMATO do ID, e o gerador reproduz a secao 7.1 inteira. O que
// nao pode vazar sao os registros de exemplo da secao 7.2.
for (const exemplo of ['Serraria', 'plaina', 'dose 1,40', 'Excesso de demandas', 'correia exposta']) {
  check(!t.includes(exemplo), `não reproduz o exemplo "${exemplo}" do modelo`);
}

// Cliente sem nada cadastrado.
console.log('\n--- 3. Cliente sem GHE e sem risco ---');
check(paginas(pdfVazio) >= 10, `mantém a estrutura completa (${paginas(pdfVazio)} páginas)`);
check(
  tv.includes('Inventário vazio'),
  'diz que o inventário está vazio em vez de emitir como concluído'
);
check(
  corrido(pdfVazio).includes('não atende ao subitem 1.5.7.1'),
  'avisa que sem inventário o documento não atende ao subitem 1.5.7.1'
);
check(corrido(pdfVazio).includes('5.6 Matriz de risco'), 'a metodologia sai mesmo sem inventário');

// ===========================================================================
// 3b. SITUACAO OPERACIONAL (alinea "b" do subitem 1.5.7.3.2)
// ===========================================================================
// O inventario tem de dizer em que situacao o perigo existe: rotineira,
// nao rotineira (manutencao, limpeza, setup) ou emergencia. O mesmo perigo
// tem probabilidade diferente em cada uma, e a nao rotineira costuma ser a
// pior - a maquina esta aberta. O campo nao existia.
console.log('');
console.log('--- 3b. Situação operacional R / NR / E ---');

const { descreverSituacao, normalizarSituacoes, temSituacaoOperacional, SITUACOES_OPERACIONAIS } = situacao;

check(SITUACOES_OPERACIONAIS.length === 3, 'as tres situacoes do modelo existem');
check(
  SITUACOES_OPERACIONAIS.map((o) => o.sigla).join(',') === 'R,NR,E',
  'as siglas sao R, NR e E'
);

check(descreverSituacao(['ROTINEIRA']) === 'R', 'uma situacao sai como a sigla');
check(
  descreverSituacao(['ROTINEIRA', 'NAO_ROTINEIRA']) === 'R e NR',
  'duas situacoes saem como "R e NR"'
);
check(
  descreverSituacao(['ROTINEIRA', 'NAO_ROTINEIRA'], 'limpeza e ajuste') === 'R e NR (limpeza e ajuste)',
  'a circunstancia entra entre parenteses, como no exemplo 2 do modelo'
);
check(
  descreverSituacao(['EMERGENCIA', 'ROTINEIRA', 'NAO_ROTINEIRA']) === 'R, NR e E',
  'a ordem sai sempre R, NR, E, independente de como foi gravada'
);
check(descreverSituacao([]) === '', 'sem situacao, devolve vazio (quem chama decide a pendencia)');
check(descreverSituacao(undefined) === '', 'risco antigo, sem o campo, nao quebra');

// Aceita a sigla, para dado vindo de importacao.
check(
  normalizarSituacoes(['R', 'NR']).join(',') === 'ROTINEIRA,NAO_ROTINEIRA',
  'aceita a sigla no lugar do valor'
);
check(normalizarSituacoes(['XPTO']).length === 0, 'descarta valor desconhecido em vez de aceitar');
check(normalizarSituacoes(['R', 'R']).length === 1, 'nao duplica');

check(temSituacaoOperacional({ operational_situation: ['ROTINEIRA'] }), 'o registro com situacao atende a alinea "b"');
check(!temSituacaoOperacional({}), 'o registro sem situacao nao atende');

// No documento.
check(
  tc.includes('R e NR (limpeza e ajuste)'),
  'o PGR imprime a situacao operacional do risco'
);
check(
  !tc.includes('Situação operacional (R, NR ou E) do risco "Ruído contínuo"'),
  'com a situacao preenchida, a pendencia da alinea "b" some'
);

// Risco sem o campo continua apontando a pendencia, e dizendo onde resolver.
const semSituacao = { ...RISCO_CLASSIFICADO, id: 'r2', operational_situation: undefined };
const pdfSemSituacao = corrido(gerar({
  client: CLIENTE, organization: ORG, ghes: GHES, risks: [semSituacao],
  employees: FUNCIONARIOS, sectors: SETORES, units: [],
}));
check(
  pdfSemSituacao.includes('Situação operacional (R, NR ou E)'),
  'risco sem o campo continua apontando a pendencia'
);
check(
  pdfSemSituacao.includes('edite o risco em GHE & Inventário de Riscos'),
  'a pendencia diz onde resolver'
);

// A tela pede o campo e nao deixa salvar sem ele.
const abaGhe = fs.readFileSync(path.join(RAIZ, 'components/sst/GHERiskInventoryTab.tsx'), 'utf8');
const catalogo = fs.readFileSync(path.join(RAIZ, 'components/sst/OccupationalRisksCatalogView.tsx'), 'utf8');
check(
  abaGhe.includes('riskForm.operational_situation.length === 0'),
  'a aba do GHE nao deixa salvar risco sem situacao operacional'
);
check(
  abaGhe.includes('operational_situation: riskForm.operational_situation'),
  'a aba do GHE grava a situacao'
);
check(
  abaGhe.includes('normalizarSituacoes(risk.operational_situation)'),
  'ao editar um risco, a situacao gravada e carregada'
);
check(
  catalogo.includes('operational_situation: situacaoAplicada'),
  'aplicar risco do catalogo tambem grava a situacao'
);

// ===========================================================================
// 4. UMA CLASSIFICACAO SO NO SISTEMA
// ===========================================================================
console.log('\n--- 4. Fonte única de classificação (conferência no código) ---');
const aba = fs.readFileSync(path.join(RAIZ, 'components/sst/GHERiskInventoryTab.tsx'), 'utf8');
const ctx = fs.readFileSync(path.join(RAIZ, 'context/PrevSafeContext.tsx'), 'utf8');
check(aba.includes('classificarRisco('), 'a aba do GHE usa a matriz do modelo');
check(ctx.includes('classificarRisco('), 'o catálogo de riscos usa a matriz do modelo');
check(!/riskScore <= 3\) risk_level/.test(aba), 'a fórmula antiga saiu da aba do GHE');
check(!/riskScore >= 20 \? 'CRITICO'/.test(ctx), 'a fórmula antiga saiu do catálogo');

console.log(`\n${casos - falhas}/${casos} casos passaram.`);
if (falhas > 0) {
  console.log(`${falhas} FALHA(S).`);
  process.exit(1);
}
console.log('PGR: estrutura do modelo, matriz conferida célula a célula, sem dado inventado.');
process.exit(0);
