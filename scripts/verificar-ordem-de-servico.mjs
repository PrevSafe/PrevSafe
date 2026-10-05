/**
 * Verificacao da ordem de servico de SST (NR-01, 1.4.1, "c").
 *
 *   node scripts/verificar-ordem-de-servico.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * As OS saiam sem os riscos do inventario: o gerador comparava a categoria
 * sem acento ('FISICO') e o inventario grava com acento ('FÍSICO'). Todo risco
 * fisico, quimico, biologico e ergonomico sumia, sem aviso. O resto da OS era
 * texto fixo igual para todo cargo - procedimentos, proibicoes, emergencia,
 * "CAT em ate 24 horas" - e o filtro por setor trazia risco de outro cliente
 * quando o setor estava vazio dos dois lados.
 *
 * O que este teste persegue (NR-01, 1.4.1, "b" I, II e IV, e "e"):
 *   1. Os riscos do inventario do GHE chegam a OS, com ou sem acento.
 *   2. So os do GHE do trabalhador, ativos, do mesmo cliente.
 *   3. Medidas adotadas: EPC implantado, EPI com CA, acao concluida do plano.
 *   4. Emergencia do estabelecimento; o que faltar vira pendencia nomeada.
 *   5. Nada inventado - no conteudo, no gerador e no PDF.
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
const TMP = path.join(RAIZ, '.tmp-ordem-de-servico-verificacao');

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
      outDir: TMP, module: 'commonjs', target: 'es2020', moduleResolution: 'node',
      esModuleInterop: true, skipLibCheck: true, baseUrl: RAIZ, paths: { '@/*': ['./*'] },
    },
    files: [path.join(RAIZ, 'lib/ordemDeServico.ts'), path.join(RAIZ, 'lib/pdfExportService.ts')],
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
let OS, PDF;
try {
  OS = require_(achar('ordemDeServico.js'));
  PDF = require_(achar('pdfExportService.js'));
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

// ---------------------------------------------------------------------------
// Fixtures: um GHE de clinica, com o inventario gravado como a tela grava
// (categoria COM acento).
// ---------------------------------------------------------------------------
const TRAB = { id: 'e1', client_id: 'c1', ghe_id: 'g1', name: 'Ana Clara', job_title: 'Recepcionista', epis: [] };
const risco = (id, cat, nome, extra = {}) => ({
  id, client_id: 'c1', ghe_id: 'g1', status: 'ACTIVE', risk_category: cat, agent_name: nome, ...extra,
});
const RISCOS = [
  risco('r1', 'FÍSICO', 'Ruído contínuo', {
    generating_source: 'Climatização', health_effects: 'PAIR', measured_value: '78.4', measurement_unit: 'dB(A)', tolerance_limit: '85 dB(A)',
    epi_required: true, epis: [{ epi_name: 'Protetor auricular', ca_number: '12345', uninterrupted_use: true }, { epi_name: 'Sem CA', ca_number: '' }],
  }),
  risco('r2', 'QUÍMICO', 'Álcool etílico', { generating_source: 'Desinfecção de superfícies', epc_implemented: true, epc_description: 'Ventilação natural cruzada' }),
  risco('r3', 'BIOLÓGICO', 'Contato com pacientes'),
  risco('r4', 'ERGONÔMICO', 'Postura sentada prolongada', { origin_psychosocial_factor: '' }),
  risco('r5', 'ACIDENTES', 'Queda no mesmo nível'),
  risco('r6', 'ERGONÔMICO', 'Baixa demanda no trabalho', { origin_psychosocial_factor: 'subcarga' }),
  // Fora do alcance do trabalhador:
  risco('x1', 'FÍSICO', 'Ruído de outro GHE', { ghe_id: 'g2' }),
  risco('x2', 'QUÍMICO', 'Benzeno de outro cliente', { client_id: 'c9' }),
  risco('x3', 'FÍSICO', 'Risco inativado', { status: 'INACTIVE' }),
];
const ESTAB = {
  emergency_scenarios: 'Incêndio no prédio', emergency_resources: 'Extintores; Hospital Regional',
  emergency_evacuation: 'Rota sinalizada até a calçada; ponto de encontro no estacionamento',
};
const CARGO = { name: 'Recepcionista', activities_description: 'Atendimento ao público em posto informatizado' };
const ACOES = [
  { risk_id: 'r4', status: 'CONCLUIDA', hierarchy: 'ADMINISTRATIVA', measure: 'Pausas de 10 minutos a cada 2 horas' },
  { risk_id: 'r4', status: 'EM_ANDAMENTO', hierarchy: 'ADMINISTRATIVA', measure: 'Rodízio de tarefas' },
  { risk_id: 'r1', status: 'EFICACIA_VERIFICADA', hierarchy: 'PROTECAO_COLETIVA', measure: 'Enclausuramento do compressor' },
  { risk_id: 'x1', status: 'CONCLUIDA', hierarchy: 'ADMINISTRATIVA', measure: 'Medida de outro GHE' },
];

// ===========================================================================
console.log('\n--- 1. Categorias com e sem acento ---');
for (const [entrada, esperado] of [
  ['FÍSICO', 'FISICO'], ['FISICO', 'FISICO'], ['Físico', 'FISICO'], ['QUÍMICO', 'QUIMICO'],
  ['BIOLÓGICO', 'BIOLOGICO'], ['ERGONÔMICO', 'ERGONOMICO'], ['ACIDENTES', 'ACIDENTES'], ['AUSÊNCIA_RISCO', 'AUSENCIA'],
]) {
  check(OS.categoriaDoRisco({ risk_category: entrada }) === esperado, `"${entrada}" é ${esperado}`);
}

// ===========================================================================
console.log('\n--- 2. Os riscos do inventário chegam à OS ---');
const c = OS.conteudoDaOS({ trabalhador: TRAB, riscos: RISCOS, ghe: { code: 'GHE-01' }, cargo: CARGO, estabelecimento: ESTAB, acoes: ACOES });
check(c.physical_risks.includes('Ruído contínuo'), 'risco FÍSICO (com acento) está na OS');
check(c.chemical_risks.includes('Álcool etílico'), 'risco QUÍMICO (com acento) está na OS');
check(c.biological_risks.includes('Contato com pacientes'), 'risco BIOLÓGICO (com acento) está na OS');
check(c.ergonomic_risks.includes('Postura sentada prolongada'), 'risco ERGONÔMICO (com acento) está na OS');
check(c.accident_mechanical_risks.includes('Queda no mesmo nível'), 'risco de ACIDENTES está na OS');
check(c.risks_detail.length === 6, 'um item de detalhe por risco do GHE (6)');
const ruido = c.risks_detail.find((d) => d.agente === 'Ruído contínuo');
check(ruido?.fonte === 'Climatização' && ruido?.danos === 'PAIR', 'o detalhe traz a fonte e os possíveis danos registrados');
check(ruido?.avaliacao === '78,4 dB(A) (limite: 85 dB(A))', 'o resultado da avaliação ambiental vai à OS (1.4.1, "b", IV)');
check(c.risks_detail.find((d) => d.agente === 'Baixa demanda no trabalho')?.categoria === 'Psicossocial', 'fator psicossocial sai como Psicossocial');
const todos = JSON.stringify(c);
check(!todos.includes('Ruído de outro GHE') && !todos.includes('Benzeno de outro cliente') && !todos.includes('Risco inativado'),
  'só os riscos ativos do GHE e do cliente do trabalhador');

const semSetor = OS.conteudoDaOS({ trabalhador: { id: 'e9', client_id: 'c1' }, riscos: [{ id: 'z', status: 'ACTIVE', risk_category: 'FÍSICO', agent_name: 'Sem GHE nem setor' }] });
check(semSetor.risks_detail.length === 0, 'trabalhador e risco sem GHE nem setor não se casam (undefined === undefined)');
check(semSetor.pendencias.some((p) => p.startsWith('Trabalhador sem GHE')), 'trabalhador sem GHE vira pendência');

const gheVazio = OS.conteudoDaOS({ trabalhador: TRAB, riscos: [], ghe: { code: 'GHE-01' }, cargo: CARGO, estabelecimento: ESTAB });
check(gheVazio.pendencias.some((p) => p.includes('Inventário de riscos não elaborado para o GHE GHE-01')), 'GHE sem inventário vira pendência com o código do GHE');

const soAusencia = OS.conteudoDaOS({ trabalhador: TRAB, riscos: [risco('a1', 'AUSÊNCIA_RISCO', 'Ausência de risco')], cargo: CARGO, estabelecimento: ESTAB });
check(soAusencia.risks_detail.length === 1 && soAusencia.risks_detail[0].agente.startsWith('Ausência de risco ocupacional'),
  'GHE só com ausência de risco: a OS diz isso');
check(!soAusencia.pendencias.some((p) => p.includes('Inventário de riscos não elaborado')), 'ausência registrada não é "inventário não elaborado"');

// ===========================================================================
console.log('\n--- 3. Medidas de prevenção adotadas ---');
check(c.collective_protections_epc.some((e) => e.startsWith('Ventilação natural cruzada')), 'EPC implantado do inventário');
check(c.collective_protections_epc.some((e) => e.startsWith('Enclausuramento do compressor')), 'proteção coletiva concluída no plano de ação');
const protetor = c.mandatory_epis.find((e) => e.ca_number === '12345');
check(!!protetor && protetor.usage_recommendation.includes('Ruído contínuo'), 'EPI do inventário com CA, dizendo contra qual risco');
check(protetor?.usage_recommendation.includes('uso ininterrupto'), 'uso ininterrupto, quando o inventário o registra');
check(!c.mandatory_epis.some((e) => e.epi_name === 'Sem CA'), 'EPI sem CA não sai');
check(c.safe_work_procedures.some((m) => m.startsWith('Pausas de 10 minutos')), 'medida administrativa concluída sai como adotada');
check(!c.safe_work_procedures.some((m) => m.startsWith('Rodízio')), 'medida em andamento ainda não é adotada');
check(!todos.includes('Medida de outro GHE'), 'medida de outro GHE não entra');

const epiSemCa = OS.conteudoDaOS({ trabalhador: TRAB, riscos: [risco('q', 'FÍSICO', 'Calor', { epi_required: true, epis: [{ epi_name: 'Luva', ca_number: '' }] })], cargo: CARGO, estabelecimento: ESTAB });
check(epiSemCa.pendencias.some((p) => p.includes('EPI exigido')), 'EPI exigido sem CA vira pendência');

// ===========================================================================
console.log('\n--- 4. Emergência e atividades ---');
check(c.emergency_accident_conduct.some((e) => e.includes('Incêndio no prédio')), 'cenários de emergência do estabelecimento');
check(c.emergency_accident_conduct.some((e) => e.includes('Rota sinalizada')), 'abandono do local do estabelecimento');
const naoAplicavel = OS.conteudoDaOS({ trabalhador: TRAB, riscos: RISCOS, cargo: CARGO, estabelecimento: { ...ESTAB, emergency_evacuation: 'Não aplicável' } });
check(!naoAplicavel.emergency_accident_conduct.some((e) => e.startsWith('Abandono')), '"não aplicável" no abandono não vira instrução');
const semEmerg = OS.conteudoDaOS({ trabalhador: TRAB, riscos: RISCOS, cargo: CARGO, estabelecimento: {} });
check(semEmerg.emergency_accident_conduct.length === 0 && semEmerg.pendencias.some((p) => p.startsWith('Procedimentos de emergência')),
  'sem procedimentos de emergência: pendência, e não texto genérico');
check(c.job_description === CARGO.activities_description, 'a descrição de atividades vem do cargo');
const semCargo = OS.conteudoDaOS({ trabalhador: TRAB, riscos: RISCOS, cargo: { name: 'Recepcionista' }, estabelecimento: ESTAB });
check(semCargo.job_description === '' && semCargo.pendencias.some((p) => p.startsWith('Descrição das atividades do cargo')),
  'cargo sem descrição: pendência, e não "atividades conforme especificações da empresa"');

// ===========================================================================
console.log('\n--- 5. Nada inventado ---');
for (const inventado of ['Avaliação de campo', 'Processo produtivo', 'Uso obrigatório contínuo', 'Atividades desempenhadas no cargo', 'SAMU', '24 horas']) {
  check(!todos.includes(inventado), `o conteúdo não traz "${inventado}"`);
}
check(OS.OBRIGACOES_DO_TRABALHADOR.length === 4 && ['"a"', '"b"', '"c"', '"d"'].every((a, i) => OS.OBRIGACOES_DO_TRABALHADOR[i].includes(`1.4.2, ${a}`)),
  'obrigações do trabalhador: as quatro alíneas do 1.4.2 da NR-01');
check(OS.ATO_FALTOSO.includes('art. 158, parágrafo único'), 'ato faltoso pelo art. 158, parágrafo único, da CLT');

const ctx = ler('context/PrevSafeContext.tsx');
const corpo = (() => {
  const i = ctx.indexOf('const generateWorkOrderOSForEmployee = useCallback');
  const j = ctx.indexOf('const generateBatchWorkOrdersOS', i);
  return i >= 0 && j > i ? ctx.slice(i, j) : '';
})();
check(corpo.includes('conteudoDaOS('), 'o gerador usa a regra única de lib/ordemDeServico.ts');
check(!/risk_category === '(FISICO|QUIMICO|BIOLOGICO|ERGONOMICO)'/.test(corpo), 'o gerador não compara a categoria sem acento');
check(!/sector_id === emp\.sector_id/.test(corpo), 'o gerador não casa risco por setor');
check(!/'É proibido|'Inspecione o ambiente|SAMU \(192\)|em até 24 horas/.test(corpo), 'o gerador não escreve procedimento, proibição ou emergência fixos');
check(!/\|\| `Atividades desempenhadas/.test(corpo), 'o gerador não inventa a descrição das atividades');
check(!/Portaria MTP nº 4\.219\/2022, subitem 1\.4\.1/.test(corpo), 'a base legal não atribui o 1.4.1 à Portaria 4.219/2022');
const corpoAtualizar = (() => {
  const i = ctx.indexOf('const atualizarOSComOInventario = useCallback');
  const j = ctx.indexOf('const generateBatchWorkOrdersOS', i);
  return i >= 0 && j > i ? ctx.slice(i, j) : '';
})();
check(/employee_signed[\s\S]{0,200}revision/.test(corpoAtualizar), 'OS assinada atualizada vira revisão nova');
check(/status: 'REVISED'/.test(corpoAtualizar), 'a revisão anterior é marcada como substituída, e não continua ativa');
check(!/`\$\{unit\.address\}, \$\{unit\.city\}\/\$\{unit\.state\}`/.test(corpo), 'o endereço não sai "undefined/undefined" sem cidade ou UF');

// Assinatura: prova fabricada e hash que nao cobria o conteudo.
const corpoAssinatura = (() => {
  const i = ctx.indexOf('const signWorkOrderOS = useCallback');
  const j = ctx.indexOf('const generateWorkOrderOSForEmployee', i);
  return i >= 0 && j > i ? ctx.slice(i, j) : '';
})();
check(!/\(os as any\)\.(os_number|required_epis|risks)\b/.test(corpoAssinatura), 'o hash da assinatura não usa campos que a OS não tem');
check(/codigo: os\.os_code/.test(corpoAssinatura) && /riscos: os\.risks_detail/.test(corpoAssinatura), 'o hash da assinatura cobre o código e os riscos da OS');

// ===========================================================================
console.log('\n--- 6. PDF da OS ---');
const WINANSI = { 0x85: '...', 0x91: "'", 0x92: "'", 0x93: '"', 0x94: '"', 0x95: '*', 0x96: '-', 0x97: '-' };
const textoDoPdf = (buf) => {
  const bruto = buf.toString('latin1');
  const out = [];
  for (const m of bruto.matchAll(/\((?:\\[\s\S]|[^\\()])*\)\s*Tj/g)) {
    const cru = m[0].slice(1, m[0].lastIndexOf(')')).replace(/\\([\\()])/g, '$1');
    out.push([...cru].map((ch) => WINANSI[ch.charCodeAt(0)] ?? ch).join(''));
  }
  return out.join(' ').replace(/\s+/g, ' ');
};
const ORDEM = {
  id: 'os1', client_id: 'c1', employee_id: 'e1', os_code: 'OS-NR01-2026-0001', revision: 1,
  issue_date: '2026-10-05', validity_start_date: '2026-10-05', employer_name: 'GRAUS CLINICA LTDA',
  employer_document: '12.483.776/0001-99', employer_cnae: '86.50-0-04', employer_risk_grade: null,
  establishment_address: 'Av. Brasil, 430, Eunapolis/BA', employee_name: 'Ana Clara', employee_cpf: '000.000.000-00',
  employee_registration: '', employee_job_title: 'Recepcionista', employee_cbo: '', employee_sector: 'Atendimento',
  employee_unit: 'Matriz', employee_admission_date: '2026-01-10', employee_ghe_id: 'g1', employee_ghe_name: 'Atendimento',
  ...c, mandatory_employee_obligations: OS.OBRIGACOES_DO_TRABALHADOR, prohibitions_unsafe_acts: [],
  disciplinary_sanctions_text: OS.ATO_FALTOSO, legal_framework: 'NR-01, itens 1.4.1 e 1.4.2; CLT, arts. 157, II, e 158.',
  employee_signed: false, signature_method: 'PHYSICAL_MANUAL', responsible_engineer_name: '', responsible_engineer_registration: '',
  status: 'ACTIVE', created_at: '2026-10-05T12:00:00Z', updated_at: '2026-10-05T12:00:00Z',
};
let tpdf = '';
try {
  const doc = PDF.exportWorkOrderOSPDF(ORDEM, { name: 'PrevSafe' }, { saveFile: false });
  tpdf = textoDoPdf(Buffer.from(doc.output('arraybuffer')));
} catch (e) {
  check(false, `o PDF da OS é gerado (${e.message})`);
}
check(tpdf.includes('Ruído contínuo') && tpdf.includes('Álcool etílico') && tpdf.includes('Postura sentada prolongada'), 'o PDF traz os riscos do inventário');
check(tpdf.includes('78,4 dB(A)'), 'o PDF traz o resultado da avaliação ambiental');
check(tpdf.includes('Pausas de 10 minutos'), 'o PDF traz a medida administrativa adotada');
check(tpdf.includes('Incêndio no prédio'), 'o PDF traz a emergência do estabelecimento');
const ordemComPendencia = { ...ORDEM, ...semEmerg };
let tpend = '';
try {
  tpend = textoDoPdf(Buffer.from(PDF.exportWorkOrderOSPDF(ordemComPendencia, { name: 'PrevSafe' }, { saveFile: false }).output('arraybuffer')));
} catch { /* acusado abaixo */ }
check(/PEND[ÊE]NCIAS/.test(tpend) && tpend.includes('Procedimentos de emergência do estabelecimento não cadastrados'), 'o PDF destaca as pendências da OS');
for (const inventado of ['GHE Padrão', 'Matriz Operacional', 'Executar tarefas operacionais', 'Riscos inerentes às atividades normais', 'C.A. Válido', 'Sede da Empresa', 'Biometria Facial', 'devidamente treinado']) {
  check(!tpdf.includes(inventado), `o PDF não traz "${inventado}"`);
}

const tela = ler('components/sst/WorkOrderOSTab.tsx');
check(!/employer_risk_grade \|\| 2/.test(tela), 'a tela não mostra grau 2 quando o grau não foi informado');
check(!tela.includes('EPIs definidos conforme necessidade operacional'), 'a tela não inventa a definição de EPI');
check(tela.includes('atualizarOSComOInventario('), 'a tela permite atualizar a OS com o inventário');
check(!/images\.unsplash\.com/.test(tela), 'a assinatura não grava foto de banco de imagens como biometria');
check(!/hash: `SHA256-OS-\$\{Date\.now\(\)\}/.test(tela), 'a assinatura não grava hash aleatório por cima do hash do conteúdo');

console.log(`\n${casos - falhas}/${casos} casos passaram.`);
if (falhas > 0) {
  console.log(`${falhas} FALHA(S).`);
  process.exit(1);
}
console.log('Ordem de serviço: riscos do inventário, medidas adotadas e emergência do cadastro, sem texto inventado.');
process.exit(0);
