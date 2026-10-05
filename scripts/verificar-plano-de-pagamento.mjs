/**
 * Verificacao do plano de pagamento da proposta e do contrato.
 *
 *   node scripts/verificar-plano-de-pagamento.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * A proposta nao guardava condicao de pagamento, e o contrato gerado dela
 * escrevia "em parcelas anuais" na clausula 7 por um valor padrao do codigo:
 * a cliente que pagaria por mes saiu com contrato de parcela anual. O
 * faturamento do Financeiro lancava o valor TOTAL do contrato a cada mes. E a
 * proposta nova abria com cliente, servicos, precos e "condicao padrao de
 * pagamento" que ninguem tinha escolhido.
 *
 * O que este teste persegue:
 *   1. Cronograma exato ate o centavo, vencimentos contados do primeiro.
 *   2. Validacao: soma igual ao total, campos obrigatorios, cartao so em
 *      parcelas iguais e mensais.
 *   3. Clausula 7 escrita do plano; sem plano, lacuna visivel - nunca uma
 *      periodicidade presumida.
 *   4. Contas a receber: uma por parcela, sem duplicar, e nenhuma sem plano.
 *   5. No codigo: nada de 'ANNUAL' fixo, de valor total como mensalidade, de
 *      proposta pre-preenchida ou de motivo de recusa inventado.
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
const TMP = path.join(RAIZ, '.tmp-plano-de-pagamento-verificacao');

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
      path.join(RAIZ, 'lib/planoDePagamento.ts'),
      path.join(RAIZ, 'lib/contratoTermos.ts'),
    ],
  })
);

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
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

const require_ = createRequire(path.join(RAIZ, 'scripts', 'x.cjs'));
const achar = (n) => [path.join(TMP, 'lib', n), path.join(TMP, n)].find((p) => fs.existsSync(p));
let P, T;
try {
  P = require_(achar('planoDePagamento.js'));
  T = require_(achar('contratoTermos.js'));
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', e.message);
}

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

// Formatacao do proprio sistema: as asercoes de texto nao dependem do ICU.
const brl = (v) => require_(achar('utils.js')).formatCurrency(v);

// ===========================================================================
// 1. CRONOGRAMA
// ===========================================================================
console.log('\n--- 1. Cronograma ---');

check(JSON.stringify(P.dividirEmParcelas(100000, 3)) === '[33333,33333,33334]', '1.000,00 em 3: 333,33 + 333,33 + 333,34');
check(P.dividirEmParcelas(90000, 12).every((c) => c === 7500), '900,00 em 12 parcelas iguais de 75,00');

const fimDeMes = P.cronogramaDoPlano({ partes: [{ id: 'a', tipo: 'FIXAS', forma: 'BOLETO', valor: 400, quantidade: 4, periodicidade: 'MENSAL', vencimento: '2026-01-31' }] });
check(
  fimDeMes.map((p) => p.vencimento).join(',') === '2026-01-31,2026-02-28,2026-03-31,2026-04-30',
  'dia 31: 31/01, 28/02, 31/03, 30/04 (contado do primeiro vencimento, e nao da parcela anterior)'
);

const PLANO_FISIOMED = {
  partes: [
    { id: 'e', tipo: 'UNICA', forma: 'PIX', descricao: 'Entrada', valor: 1000, vencimento: '2026-10-10' },
    { id: 'f', tipo: 'FIXAS', forma: 'BOLETO', valor: 10800, quantidade: 12, periodicidade: 'MENSAL', vencimento: '2026-11-10' },
  ],
};
const crono = P.cronogramaDoPlano(PLANO_FISIOMED);
check(crono.length === 13 && crono.every((p, i) => p.numero === i + 1 && p.total === 13), 'entrada + 12 fixas: 13 parcelas numeradas de 1 a 13');
check(crono[0].forma === 'PIX' && crono[0].valor === 1000 && crono[0].rotulo === 'Entrada', 'a 1ª parcela é a entrada no Pix');
check(crono[12].vencimento === '2027-10-10' && crono[12].valor === 900 && crono[12].forma === 'BOLETO', 'a 13ª vence em 10/10/2027, R$ 900,00 no boleto');
check(P.totalDoPlano(PLANO_FISIOMED) === 11800, 'o plano soma R$ 11.800,00');

const variaveis = P.cronogramaDoPlano({ partes: [{ id: 'v', tipo: 'VARIAVEIS', forma: 'PIX', parcelas: [{ vencimento: '2026-12-01', valor: 300 }, { vencimento: '2026-11-01', valor: 700 }] }] });
check(variaveis[0].vencimento === '2026-11-01' && variaveis[0].valor === 700, 'parcelas variáveis saem em ordem de vencimento');

// ===========================================================================
// 2. VALIDACAO
// ===========================================================================
console.log('\n--- 2. Validação ---');

check(P.faltasDoPlano(PLANO_FISIOMED, 11800).length === 0, 'plano completo e somando o total: nada falta');
const faltam = P.faltasDoPlano(PLANO_FISIOMED, 12000);
check(faltam.length === 1 && faltam[0].includes('faltam') && faltam[0].includes(brl(200)), 'soma menor que o total: diz quanto falta');
check(P.faltasDoPlano(PLANO_FISIOMED, 11000)[0]?.includes('sobram'), 'soma maior que o total: diz quanto sobra');
check(P.faltasDoPlano({ partes: [] }, 100)[0] === 'Inclua ao menos uma forma de pagamento.', 'sem parte nenhuma: pede uma forma de pagamento');
check(P.faltasDoPlano(undefined, 100).length === 1, 'sem plano: uma falta só, a do plano');

const nova = P.novaParte('FIXAS');
check(nova.forma === undefined && nova.valor === undefined && nova.vencimento === undefined
  && nova.quantidade === undefined && nova.periodicidade === undefined, 'parte nova nasce vazia: nada combinado sem o usuário');
check(P.faltasDoPlano({ partes: [nova] }, 100)[0]?.includes('a forma de pagamento'), 'parte vazia: aponta a forma, o valor, as parcelas e a data');

check(P.faltasDoPlano({ partes: [{ id: 'c', tipo: 'VARIAVEIS', forma: 'CARTAO_CREDITO', parcelas: [{ vencimento: '2026-11-01', valor: 100 }] }] }, 100)[0]?.includes('no cartão de crédito as parcelas são iguais'),
  'cartão não aceita parcelas de valor variável');
check(P.faltasDoPlano({ partes: [{ id: 'c', tipo: 'FIXAS', forma: 'CARTAO_CREDITO', valor: 600, quantidade: 2, periodicidade: 'TRIMESTRAL', vencimento: '2026-11-01' }] }, 600)[0]?.includes('periodicidade mensal'),
  'cartão só em parcelas mensais');
check(P.faltasDoPlano({ partes: [{ id: 'u', tipo: 'UNICA', forma: 'PIX', valor: 100, vencimento: '2026-02-30' }] }, 100)[0]?.includes('a data de vencimento'),
  '30/02 não é data');
check(P.cronogramaDoPlano({ partes: [{ id: 'u', tipo: 'UNICA', forma: 'PIX', valor: 100, vencimento: '2026-02-30' }] }).length === 0,
  'parte inválida não entra no cronograma');

// ===========================================================================
// 3. CLAUSULA 7
// ===========================================================================
console.log('\n--- 3. Cláusula 7 ---');

const PROPOSTA = { proposal_number: 'PROP-2026-000007', total: 11800, items: [], payment_plan: PLANO_FISIOMED };
const termos = T.montarTermosDoContrato({ proposal: PROPOSTA, valorTotal: 11800, inicioVigencia: '2026-10-05', fimVigencia: '2027-10-05' });
const c7 = termos.slice(termos.indexOf('CLÁUSULA 7ª'), termos.indexOf('CLÁUSULA 8ª'));
check(c7.includes('pago da seguinte forma:'), 'com plano: a 7.1 diz "pago da seguinte forma"');
check(c7.includes(`a) entrada de ${brl(1000)} via Pix, com vencimento em 10/10/2026;`), 'alínea a): a entrada no Pix com a data');
check(c7.includes(`b) ${brl(10800)} em 12 parcelas mensais de ${brl(900)}, via boleto bancário, com vencimentos de 10/11/2026 a 10/10/2027.`),
  'alínea b): 12 parcelas mensais, valor, forma e período');
check(c7.includes(`13ª parcela — 10/10/2027 — ${brl(900)} — Boleto bancário (Parcela 12/12)`), 'a 7.2 traz o cronograma até a 13ª parcela');
// A forma do defeito era "em parcelas anuais"; o "Reajuste anual" da 7.4 e
// clausula legitima e nao pode ser confundido com ela.
check(!/parcelas? anua(l|is)/i.test(c7), 'nenhuma "parcela anual" num plano mensal');

const semPlano = T.montarTermosDoContrato({ valorTotal: 5000, recorrencia: 'ANNUAL' });
const c7SemPlano = semPlano.slice(semPlano.indexOf('CLÁUSULA 7ª'), semPlano.indexOf('CLÁUSULA 8ª'));
check(c7SemPlano.includes('[forma de pagamento') && c7SemPlano.includes('[cronograma de pagamento]'), 'sem plano: forma e cronograma ficam como lacuna visível');
check(!/parcelas (anuais|mensais|trimestrais|semestrais)/.test(c7SemPlano), 'sem plano: nenhuma periodicidade presumida, nem com recorrência ANNUAL');

const incompleto = T.montarTermosDoContrato({ valorTotal: 12000, plano: PLANO_FISIOMED });
check(incompleto.includes('[forma de pagamento'), 'plano que não soma o total: a cláusula fica em aberto, e não com o plano errado');

const editado = termos.replace('3.1. Elaborar os documentos', '3.1. [TEXTO EDITADO] Elaborar os documentos');
const novoPlano = { partes: [{ id: 'x', tipo: 'FIXAS', forma: 'PIX', valor: 11800, quantidade: 4, periodicidade: 'TRIMESTRAL', vencimento: '2026-11-05' }] };
const trocado = T.substituirClausulaDoPagamento(editado, T.clausulaDoPagamento(11800, novoPlano));
check(trocado && trocado.includes('[TEXTO EDITADO]'), 'atualizar a cláusula 7 preserva o resto da minuta editada');
check(trocado && trocado.includes('4 parcelas trimestrais') && !trocado.includes('12 parcelas mensais'), 'atualizar a cláusula 7 troca só ela, pelo plano novo');
check(trocado && (trocado.match(/CLÁUSULA 8ª/g) || []).length === 1, 'a cláusula 8 continua lá, uma vez só');
check(T.substituirClausulaDoPagamento('texto sem cláusulas', 'x') === null, 'minuta sem as cláusulas 7 e 8: não troca às cegas');

check(T.divergenciasDaClausulaDoPagamento(termos, PLANO_FISIOMED, 11800).length === 0, 'cláusula gerada do plano confere com o plano');
check(T.divergenciasDaClausulaDoPagamento(semPlano, PLANO_FISIOMED, 11800).length > 0, 'cláusula em aberto não confere com o plano: a assinatura recusa');
check(T.divergenciasDaClausulaDoPagamento(trocado, PLANO_FISIOMED, 11800).length > 0, 'cláusula de outro plano não confere');

// ===========================================================================
// 4. CONTAS A RECEBER
// ===========================================================================
console.log('\n--- 4. Contas a receber ---');

const CONTRATO = { id: 'cont-1', contract_number: 'CONT-2026-000003', title: 'Contrato SST', client_id: 'cli-1', payment_plan: PLANO_FISIOMED };
const contas = P.contasAReceberDoContrato(CONTRATO, { organizationId: 'org-1', nomeDoCliente: 'FISIOMED', existentes: [] });
check(contas.length === 13, 'uma conta a receber por parcela (13)');
check(contas[0].amount === 1000 && contas[0].payment_method === 'PIX' && contas[0].due_date === '2026-10-10', 'a entrada vai com valor, forma e vencimento próprios');
check(contas.every((t, i) => t.contract_id === 'cont-1' && t.contract_installment === i + 1), 'cada conta leva o contrato e o número da parcela');
check(contas.reduce((s, t) => s + Math.round(t.amount * 100), 0) === 1180000, 'as contas somam o valor do contrato, e não 13 vezes ele');
check(contas[1].category === 'MENSALIDADE_SST', 'plano mensal: categoria de mensalidade');

const deNovo = P.contasAReceberDoContrato(CONTRATO, { organizationId: 'org-1', nomeDoCliente: 'FISIOMED', existentes: contas.slice(0, 5) });
check(deNovo.length === 8 && deNovo[0].contract_installment === 6, 'lançar de novo só completa as que faltam');
check(P.contasAReceberDoContrato({ ...CONTRATO, payment_plan: undefined }, { organizationId: 'o', nomeDoCliente: '', existentes: [] }).length === 0,
  'contrato sem plano não gera conta: o valor total não é parcela');

const cartao = P.contasAReceberDoContrato({ ...CONTRATO, payment_plan: { partes: [{ id: 'k', tipo: 'FIXAS', forma: 'CARTAO_CREDITO', valor: 6000, quantidade: 6, periodicidade: 'MENSAL', vencimento: '2026-11-15' }] } },
  { organizationId: 'o', nomeDoCliente: '', existentes: [] });
check(cartao.length === 6 && cartao.every((t) => t.payment_method === 'CARTAO_CREDITO' && t.amount === 1000), 'cartão em 6x: seis contas mensais, uma por parcela');

check(P.recorrenciaDoPlano(PLANO_FISIOMED) === 'MONTHLY', 'entrada + parcelas mensais: contrato mensal');
check(P.recorrenciaDoPlano({ partes: [{ id: 'u', tipo: 'UNICA', forma: 'PIX', valor: 10, vencimento: '2026-10-10' }] }) === 'ONE_TIME', 'pagamento único: contrato de parcela única');
check(P.recorrenciaDoPlano(undefined) === undefined, 'sem plano: a recorrência não é presumida');

// ===========================================================================
// 5. NO CODIGO: OS DEFEITOS ANTIGOS NAO VOLTAM
// ===========================================================================
console.log('\n--- 5. Conferência no código ---');

const ctx = ler('context/PrevSafeContext.tsx');
const contratos = ler('components/commercial/ContractsView.tsx');
const propostas = ler('components/commercial/ProposalsView.tsx');
const termosFonte = ler('lib/contratoTermos.ts');
const financeiro = ler('components/financial/FinancialView.tsx');

check(!/recurrence:\s*'ANNUAL'/.test(ctx) && !/recurrence:\s*'ANNUAL'/.test(contratos), 'nenhum contrato nasce com recorrência ANNUAL escrita no código');
check(!/recorrencia:\s*'ANNUAL'/.test(ctx) && !/recorrencia:\s*'ANNUAL'/.test(contratos), 'nenhuma minuta é montada com recorrência ANNUAL fixa');
check(!/\|\|\s*'ANNUAL'\]/.test(termosFonte) && !/PERIODICIDADE\[dados\.recorrencia/.test(termosFonte), 'a minuta não deriva a periodicidade da recorrência');
check(!/const amount = contract\.total_value/.test(ctx), 'o faturamento não lança o valor total do contrato como parcela');
// O corpo da assinatura vai de "const signContract" ate o proximo callback.
const corpoDaAssinatura = (() => {
  const i = ctx.indexOf('const signContract = useCallback');
  const j = ctx.indexOf('const createServiceOrderFromContract', i);
  return i >= 0 && j > i ? ctx.slice(i, j) : '';
})();
check(corpoDaAssinatura.includes('contasAReceberDoContrato('), 'a assinatura lança as parcelas do plano');
check(
  corpoDaAssinatura.includes('divergenciasDaClausulaDoPagamento(')
  && corpoDaAssinatura.indexOf('divergenciasDaClausulaDoPagamento(') < corpoDaAssinatura.indexOf('const signature = {'),
  'a assinatura confere a cláusula 7 com o plano ANTES de assinar'
);
check(/payment_plan:\s*planoInformado\(proposal\.payment_plan\)/.test(ctx), 'o contrato gerado copia o plano da proposta');
check(!/t\.title\.includes\(refMonth\)/.test(financeiro), 'o faturamento em lote não decide por título do mês');

check(!/setBuilderClientId\(clients\[0\]/.test(propostas) && !/useState\(clients\?\.\[0\]\?\.id/.test(propostas), 'proposta nova não pré-seleciona o primeiro cliente');
check(!/initialTmpl1 = serviceTemplates\[0\]/.test(propostas), 'proposta nova não inclui serviços do catálogo sozinha');
check(!/unit_price: 6500/.test(propostas) && !/useState<number>\(200\)/.test(propostas), 'sem preço nem desconto de exemplo no formulário');
check(!/setBuilderNotes\('Condi/.test(propostas), 'sem "condição padrão de pagamento" escrita no código');
check(!/rejectProposal\([^)]*'Pre[cç]o acima/.test(propostas), 'a recusa não grava motivo inventado');
check(!/\|\| 'Condi[cç][aã]o padr[aã]o\.'/.test(propostas), 'a proposta sem observação não mostra "Condição padrão."');
check(/<PlanoDePagamentoEditor/.test(propostas) && /<PlanoDePagamentoEditor/.test(contratos), 'proposta e contrato editam o plano com o mesmo componente');
check(/exportProposalPdf\(/.test(propostas), 'a proposta tem PDF para baixar e imprimir');

const editor = ler('components/commercial/PlanoDePagamentoEditor.tsx');
check(!/placeholder=/.test(editor), 'o editor do plano não tem placeholder com cara de valor');

// ===========================================================================
// 6. DATAS: O MESMO DIA NA TELA, NO CONTRATO E NO PDF
// ===========================================================================
// O aceite as 22h30 de 05/10 (Brasilia) e gravado 2026-10-06T01:30Z. A tela e
// o contrato cortavam os 10 primeiros caracteres e diziam 06/10; o PDF da
// proposta dizia 05/10.
console.log('\n--- 6. Datas ---');

const D = require_(achar('datas.js'));
check(D.diaDoRegistro('2026-10-06T01:30:00.000Z') === '2026-10-05', 'carimbo das 22h30 de Brasília é do dia 05/10, e não 06/10');
check(D.diaDoRegistro('2026-10-05') === '2026-10-05', 'dia de calendário volta como está');
check(D.dataDoRegistro('2026-10-06T01:30:00.000Z') === '05/10/2026', 'dd/mm/aaaa do dia de Brasília');
check(D.dataHoraDoRegistro('2026-10-06T01:30:00.000Z') === '05/10/2026 22:30', 'hora da assinatura em Brasília, e não em UTC');
check(D.dataDoRegistro('') === '' && D.dataDoRegistro(undefined) === '', 'sem data: vazio, e não "Invalid Date"');

const aceiteNoite = T.montarTermosDoContrato({
  proposal: { ...PROPOSTA, approved_at: '2026-10-06T01:30:00.000Z' },
  valorTotal: 11800,
  inicioVigencia: '2026-10-05T00:00:00.000Z',
  fimVigencia: '2027-10-05T00:00:00.000Z'
});
check(aceiteNoite.includes('aceita pela CONTRATANTE em 05/10/2026'), 'o contrato diz o dia do aceite em Brasília');
check(aceiteNoite.includes('Vigência de 05/10/2026 a 05/10/2027'), 'a vigência (dia gravado como meia-noite UTC) não volta um dia');

check(!/formatDate\((prop|selectedProposal)\.(valid_until|created_at|approved_at)\)/.test(propostas), 'a tela da proposta não corta o carimbo em UTC');
check(!/formatDate\(proposal\.approved_at\)/.test(termosFonte), 'a minuta não corta o aceite em UTC');
check(!/formatDateTime\([^)]*signed_at/.test(contratos), 'a tela do contrato não mostra a assinatura em UTC');
check(!/formatDate\(proposal\.approved_at\)/.test(ler('lib/pdfExportService.ts')), 'o PDF do contrato não corta o aceite em UTC');
check(!/toLocale(Date|Time)String\('pt-BR'/.test(ler('lib/pdfExportService.ts').slice(ler('lib/pdfExportService.ts').indexOf('export function exportContractPdf'))),
  'o PDF do contrato não usa o relógio de quem o gera');

console.log(`\n${casos - falhas}/${casos} casos passaram.`);
if (falhas > 0) {
  console.log(`${falhas} FALHA(S).`);
  process.exit(1);
}
console.log('Plano de pagamento: proposta, cláusula 7 e Financeiro dizem a mesma coisa, sem valor presumido.');
process.exit(0);
