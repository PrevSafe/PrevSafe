/**
 * Sigilo dos exames: o resultado e a observacao de cada exame, e a restricao
 * anotada pelo medico, nao saem para quem nao e obrigado ao sigilo.
 *
 *   node scripts/verificar-sigilo-exames.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * O kit admissional - documento que vai para o RH - imprimia a coluna
 * "Resultado" (Normal/Alterado/Estavel/Agravamento) de cada exame e a
 * "Restricao" anotada no ASO. A ficha do colaborador, na tela, mostrava o
 * resultado e a observacao do exame para qualquer usuario.
 *
 *   - Res. CFM 2.323/2022, art. 6, V: e vedado ao medico "Informar resultados
 *     dos exames no ASO".
 *   - CEM (Res. CFM 2.217/2018), art. 85: vedado "Permitir o manuseio e o
 *     conhecimento dos prontuarios por pessoas nao obrigadas ao sigilo
 *     profissional"; art. 76: vedado revelar informacoes confidenciais obtidas
 *     no exame medico de trabalhadores, inclusive por exigencia da empresa.
 *   - MOS do eSocial, S-2220, item 1.9: o ASO e documento administrativo; "As
 *     informacoes sigilosas relacionadas a condicao de saude sao registradas
 *     no prontuario individual do trabalhador".
 *   - NR-07, 7.5.19.1: o ASO traz a indicacao e a data dos exames (alinea "d")
 *     e a definicao de apto ou inapto (alinea "e"). Restricao nao e alinea.
 *
 * COMO O TESTE PROCURA O DEFEITO
 *
 * No PDF, pela forma: gera o kit duas vezes com o MESMO trabalhador, mudando
 * so os campos clinicos (resultado, observacao, restricao). Se o documento
 * mudar, algum campo clinico chegou ao papel - qualquer que seja o rotulo, a
 * traducao ou a cor. As palavras ("Alterado", "Perda em 4kHz") sao conferidas
 * tambem, mas como segunda linha.
 *
 * No codigo da ficha, pela forma: toda iteracao sobre a lista `exams` e
 * examinada, e o parametro dela nao pode ter `result` nem `observation` lidos
 * (por ponto, colchete ou desestruturacao). O detector e testado antes contra
 * o trecho defeituoso original e variantes dele; se nao acusar o defeito
 * conhecido, o resultado e INCONCLUSIVO.
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
const TMP = path.join(RAIZ, '.tmp-sigilo-verificacao');

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

// ===========================================================================
// Leitura de fonte: sem comentarios, para a explicacao do defeito nao contar
// como o defeito.
// ===========================================================================
const semComentarios = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');

/** Indice do fechamento que casa com a abertura em `inicio`. -1 se nao fechar. */
function fechamento(txt, inicio) {
  const abre = txt[inicio];
  const fecha = { '(': ')', '{': '}', '[': ']' }[abre];
  let nivel = 0;
  for (let i = inicio; i < txt.length; i++) {
    if (txt[i] === abre) nivel++;
    else if (txt[i] === fecha) {
      nivel--;
      if (nivel === 0) return i;
    }
  }
  return -1;
}

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CAMPO_CLINICO = '(result|observation)';
const linhaDe = (txt, idx) => txt.slice(0, idx).split('\n').length;

/**
 * Acha, num fonte sem comentarios, toda leitura de `result` ou `observation`
 * de um item da lista `exams`. Devolve [{ linha, trecho }].
 *
 * Formas cobertas:
 *   exams.map(ex => ... ex.result ...)          (qualquer nome de parametro)
 *   exams?.map((exame, i) => ... exame?.observation ...)
 *   exams.map(({ exam_name, result }) => ...)   (desestruturacao no parametro)
 *   exams.map(e => { const { result } = e; ... })
 *   exams.map(e => e['result'])
 *   exams[0].result
 *   for (const e of aso.exams) { ... e.result ... }
 */
function leiturasClinicas(fonte) {
  const achados = [];
  const marcar = (idx, trecho) =>
    achados.push({ linha: linhaDe(fonte, idx), trecho: trecho.replace(/\s+/g, ' ').slice(0, 90) });

  const leituraDe = (nome) => new RegExp(
    `\\b${escapar(nome)}\\s*\\??\\.\\s*${CAMPO_CLINICO}\\b` +
    `|\\b${escapar(nome)}\\s*\\??\\.?\\s*\\[\\s*['"\`]${CAMPO_CLINICO}['"\`]\\s*\\]` +
    `|\\{[^{}]*\\b${CAMPO_CLINICO}\\b[^{}]*\\}\\s*=\\s*${escapar(nome)}\\b`
  );
  const identificadores = (params) =>
    [...params.replace(/:\s*[\w.<>\[\]|' ]+/g, '').matchAll(/[A-Za-z_$][\w$]*/g)].map((m) => m[0]);

  // 1. Iteracao por metodo de array.
  const metodo = /\bexams\s*\??\.\s*(?:map|forEach|filter|find|findLast|some|every|reduce|flatMap|sort)\s*\(/g;
  for (const m of fonte.matchAll(metodo)) {
    const abre = m.index + m[0].length - 1;
    const fim = fechamento(fonte, abre);
    if (fim < 0) continue;
    const chamada = fonte.slice(abre + 1, fim);
    const seta = chamada.indexOf('=>');
    if (seta < 0) continue;
    const params = chamada.slice(0, seta).trim();
    const corpo = chamada.slice(seta + 2);

    if (new RegExp(`\\{[^}]*\\b${CAMPO_CLINICO}\\b[^}]*\\}`).test(params)) {
      marcar(m.index, params);
    }
    for (const nome of identificadores(params.replace(/^\(|\)$/g, ''))) {
      for (const r of corpo.matchAll(new RegExp(leituraDe(nome).source, 'g'))) {
        marcar(abre + 1 + seta + 2 + r.index, r[0]);
      }
    }
  }

  // 2. Indice direto.
  for (const m of fonte.matchAll(new RegExp(`\\bexams\\s*\\??\\.?\\s*\\[[^\\]]*\\]\\s*\\??\\.\\s*${CAMPO_CLINICO}\\b`, 'g'))) {
    marcar(m.index, m[0]);
  }

  // 3. Laco for...of.
  for (const m of fonte.matchAll(/\bfor\s*\(\s*(?:const|let|var)\s+([\w$]+|\{[^}]*\})\s+of\s+[^)]*\bexams\b[^)]*\)/g)) {
    const alvo = m[1];
    if (alvo.startsWith('{')) {
      if (new RegExp(`\\b${CAMPO_CLINICO}\\b`).test(alvo)) marcar(m.index, m[0]);
      continue;
    }
    const depois = fonte.slice(m.index + m[0].length);
    const abre = depois.search(/\S/);
    const corpo = depois[abre] === '{'
      ? depois.slice(abre, fechamento(depois, abre) + 1)
      : depois.slice(abre, depois.indexOf(';', abre) + 1);
    const r = corpo.match(leituraDe(alvo));
    if (r) marcar(m.index + m[0].length + abre + r.index, r[0]);
  }

  return achados;
}

// ===========================================================================
// 0. O DETECTOR ACUSA O DEFEITO CONHECIDO?
// ===========================================================================
// Sem isto, um detector quebrado "passaria" qualquer arquivo.
console.log('\n--- 0. Autoteste do detector (o trecho defeituoso original e variantes) ---');

const DEFEITUOSOS = {
  'o trecho original da ficha (ex.observation e ex.result)': `
    {aso.exams && aso.exams.length > 0 ? (
      <ul>
        {aso.exams.map(ex => (
          <li key={ex.id}>
            <span>{ex.exam_code_table_27} {ex.exam_name}
              {ex.observation && (<span> — {ex.observation}</span>)}
            </span>
            <span className={\`\${ex.result === 'NORMAL' ? 'a' : 'b'}\`}>{ex.result} ({ex.exam_date})</span>
          </li>
        ))}
      </ul>
    ) : null}`,
  'outro nome de parametro, com encadeamento opcional': `
    {aso.exams?.map((exame, i) => <li key={i}>{exame?.observation}</li>)}`,
  'desestruturacao no parametro': `
    {aso.exams.map(({ exam_name, result }) => <li>{exam_name} {result}</li>)}`,
  'desestruturacao no corpo': `
    {aso.exams.map(e => { const { exam_name, result } = e; return <li>{result}</li>; })}`,
  'acesso por colchete': `
    {aso.exams.map(e => <li>{e['observation']}</li>)}`,
  'indice direto': `
    <span>{aso.exams[0].result}</span>`,
  'laco for...of': `
    for (const e of aso.exams) { linhas.push(e.result); }`,
};
for (const [nome, trecho] of Object.entries(DEFEITUOSOS)) {
  if (leiturasClinicas(trecho).length === 0) {
    inconclusivo(`o detector não acusou o defeito conhecido: ${nome}`, trecho);
  }
}
const LIMPO = `
  <span>{aso.result} ({aso.exam_date})</span>
  {aso.exams.map(ex => (
    <li key={ex.id}>{ex.exam_code_table_27} {ex.exam_name}
      <span>{ex.exam_date ? \`realizado em \${formatDate(ex.exam_date)}\` : ''}</span>
    </li>
  ))}`;
if (leiturasClinicas(LIMPO).length !== 0) {
  inconclusivo('o detector acusou um trecho correto (falso positivo)', JSON.stringify(leiturasClinicas(LIMPO)));
}
check(true, `o detector acusa as ${Object.keys(DEFEITUOSOS).length} formas do defeito e não acusa o trecho correto`);

// ===========================================================================
// 1. FICHA DO COLABORADOR (EmployeesTab.tsx)
// ===========================================================================
console.log('\n--- 1. Ficha do colaborador na tela ---');

const CAMINHO_FICHA = path.join(RAIZ, 'components/sst/EmployeesTab.tsx');
if (!fs.existsSync(CAMINHO_FICHA)) inconclusivo('components/sst/EmployeesTab.tsx não encontrado');
const ficha = semComentarios(fs.readFileSync(CAMINHO_FICHA, 'utf8'));

const iteracoesDeExame = [...ficha.matchAll(/\bexams\s*\??\.\s*map\s*\(/g)];
if (iteracoesDeExame.length === 0) {
  inconclusivo('a ficha não itera mais a lista de exames; o teste perdeu o alvo');
}

const naFicha = leiturasClinicas(ficha);
check(
  naFicha.length === 0,
  'a ficha não renderiza result nem observation de exame' +
    (naFicha.length ? ` — ${naFicha.map((a) => `linha ${a.linha}: ${a.trecho}`).join(' | ')}` : '')
);

// O que a ficha continua mostrando: o exame e a data dele, formatada.
const corpoDoMap = (() => {
  const m = iteracoesDeExame[0];
  const abre = m.index + m[0].length - 1;
  return ficha.slice(abre, fechamento(ficha, abre) + 1);
})();
check(/\.exam_code_table_27\b/.test(corpoDoMap) && /\.exam_name\b/.test(corpoDoMap),
  'a ficha continua listando o exame (código da Tabela 27 e nome)');
check(/realizado em \$\{\s*formatDate\(\s*[\w$]+\??\.exam_date\s*\)\s*\}/.test(corpoDoMap),
  'a data do exame sai como "realizado em dd/mm/aaaa"');

// ===========================================================================
// 2. O KIT ADMISSIONAL (o PDF de verdade)
// ===========================================================================
console.log('\n--- 2. Kit admissional (PDF gerado) ---');

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

const TSCONFIG = path.join(TMP, 'tsconfig.verificacao.json');
fs.writeFileSync(
  TSCONFIG,
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
    files: [path.join(RAIZ, 'lib/pdfExportService.ts')],
  })
);

try {
  execFileSync('npx', ['tsc', '-p', TSCONFIG], { stdio: 'pipe', shell: true, cwd: RAIZ });
} catch (e) {
  inconclusivo('npx tsc falhou', e.stdout?.toString() || e.message);
}

const achar = (nome) =>
  [path.join(TMP, 'lib', nome), path.join(TMP, nome)].find((p) => fs.existsSync(p));
const CAMINHO = achar('pdfExportService.js');
if (!CAMINHO) inconclusivo('o tsc não emitiu pdfExportService.js');

// O alias "@/" nao e reescrito pelo tsc.
for (const dir of [path.join(TMP, 'lib'), TMP]) {
  if (!fs.existsSync(dir)) continue;
  for (const arquivo of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const alvo = path.join(dir, arquivo);
    const js = fs
      .readFileSync(alvo, 'utf8')
      .replace(/require\("@\/lib\/([^"]+)"\)/g, 'require("./$1")');
    fs.writeFileSync(alvo, js);
  }
}
fs.writeFileSync(path.join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }));

const require_ = createRequire(path.join(RAIZ, 'scripts', 'x.cjs'));

// O jsPDF define `save` na instancia, dentro do construtor: envolve-se o
// construtor para capturar o PDF em memoria em vez de grava-lo.
let ultimoPdf = null;
try {
  const jspdf = require_('jspdf');
  const Original = jspdf.jsPDF || jspdf.default || jspdf;
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

let servico;
try {
  servico = require_(CAMINHO);
} catch (e) {
  inconclusivo('não foi possível carregar o módulo compilado', e.message);
}
const { exportAdmissionKitPDF } = servico;
if (typeof exportAdmissionKitPDF !== 'function') inconclusivo('exportAdmissionKitPDF não foi exportada');

/** Todas as strings que o PDF manda desenhar, ja com os escapes desfeitos. */
function trechosDoPdf(buf) {
  const bruto = buf.toString('latin1');
  const trechos = [];
  for (const m of bruto.matchAll(/\((?:\\[\s\S]|[^\\()])*\)\s*Tj/g)) {
    const dentro = m[0].slice(1, m[0].lastIndexOf(')'));
    trechos.push(dentro.replace(/\\([\\()])/g, '$1'));
  }
  return trechos;
}
const textoCorrido = (buf) => trechosDoPdf(buf).join(' ').replace(/\s+/g, ' ');

/**
 * O PDF inteiro - texto, cores, posicoes - menos o que muda a cada geracao
 * (data de criacao e identificador do arquivo).
 */
const desenhoDoPdf = (buf) => buf
  .toString('latin1')
  .replace(/\/(CreationDate|ModDate)\s*\([^)]*\)/g, '')
  .replace(/\/ID\s*\[[^\]]*\]/g, '');

function gerar(args) {
  ultimoPdf = null;
  exportAdmissionKitPDF(...args);
  if (!ultimoPdf) inconclusivo('exportAdmissionKitPDF não produziu PDF');
  return ultimoPdf;
}

// --- O cenario --------------------------------------------------------------
const ORGANIZACAO = {
  id: 'org-1',
  name: 'PrevSafe',
  technical_responsible_name: 'Responsável Técnico Fictício',
  technical_responsible_title: 'Engenheiro de Segurança do Trabalho',
  technical_responsible_council: 'CREA-XX 000000',
};
const CLIENTE = {
  id: 'cli-1',
  legal_name: 'EMPRESA FICTICIA DE TESTE LTDA',
  trade_name: 'Empresa Fictícia',
  document_number: '00.000.000/0001-91',
};
const PROTOCOLOS = [
  ['prot-1', '0295', 'Avaliação clínica ocupacional (anamnese e exame físico)'],
  ['prot-2', '0281', 'Audiometria tonal ocupacional'],
  ['prot-3', '1057', 'Prova de função pulmonar completa (ou espirometria)'],
  ['prot-4', '0693', 'Hemograma com contagem de plaquetas ou frações (eritrograma, leucograma, plaquetas)'],
].map(([id, codigo, nome]) => ({
  id,
  client_id: 'cli-1',
  ghe_id: 'ghe-1',
  exam_code_table_27: codigo,
  exam_name: nome,
  periodicity_months: 12,
  triggers: ['ADMISSIONAL', 'PERIODICO'],
  mandatory_by_standard: 'NR-07',
  status: 'ACTIVE',
}));

/** Trabalhador ficticio. Nenhum dado real entra neste teste. */
function trabalhador({ resultadoAso, restricao, exames }) {
  return {
    id: 'emp-teste',
    client_id: 'cli-1',
    name: 'TRABALHADOR FICTICIO DE TESTE',
    cpf: '00000000191',
    registration_number: '1',
    admission_date: '2026-08-12',
    job_title: 'Operador de teste',
    cbo: '0000-00',
    sector_name: 'Setor de teste',
    ghe_id: 'ghe-1',
    ghe_name: 'GHE de teste',
    status: 'ACTIVE',
    aso_history: [
      {
        id: 'aso-1',
        aso_type: 'ADMISSIONAL',
        exam_date: '2026-08-10',
        valid_until: '2027-08-10',
        result: resultadoAso,
        ...(restricao ? { restrictions_notes: restricao } : {}),
        physician_name: 'Dra. Médica Fictícia',
        physician_crm: '00000',
        physician_uf: 'XX',
        exams: exames,
      },
    ],
  };
}
const exame = (protocolo, data, result, observation) => ({
  id: `ex-${protocolo.id}`,
  exam_code_table_27: protocolo.exam_code_table_27,
  exam_name: protocolo.exam_name,
  exam_date: data,
  procedure_type: 'OUTRO',
  result,
  ...(observation ? { observation } : {}),
  protocol_id: protocolo.id,
});

const OBSERVACAO = 'Perda em 4kHz';
const RESTRICAO = 'Evitar exposição a ruído acima de 80 dB(A)';
const OBS_HEMOGRAMA = 'Leucopenia leve a investigar';

// Mesmo trabalhador, mesmas datas; so os campos clinicos mudam.
const comAchados = trabalhador({
  resultadoAso: 'APTO',
  restricao: RESTRICAO,
  exames: [
    exame(PROTOCOLOS[0], '2026-08-10', 'NORMAL', 'PA 150x95 mmHg'),
    exame(PROTOCOLOS[1], '2026-08-08', 'ALTERADO', OBSERVACAO),
    exame(PROTOCOLOS[2], '2026-08-09', 'ESTAVEL', 'Distúrbio ventilatório leve'),
    exame(PROTOCOLOS[3], '2026-08-07', 'AGRAVAMENTO', OBS_HEMOGRAMA),
  ],
});
const semAchados = trabalhador({
  resultadoAso: 'APTO',
  restricao: null,
  exames: [
    exame(PROTOCOLOS[0], '2026-08-10', 'NORMAL'),
    exame(PROTOCOLOS[1], '2026-08-08', 'NORMAL'),
    exame(PROTOCOLOS[2], '2026-08-09', 'NORMAL'),
    exame(PROTOCOLOS[3], '2026-08-07', 'NORMAL'),
  ],
});
const args = (emp) => [emp, null, [], null, ORGANIZACAO, CLIENTE, PROTOCOLOS];

const pdfCom = gerar(args(comAchados));
const pdfSem = gerar(args(semAchados));
const textoCom = textoCorrido(pdfCom);
const textoSem = textoCorrido(pdfSem);

// Controle: o texto foi extraido e a lista de exames foi desenhada. Sem isso
// "nao contem Alterado" passaria num PDF vazio.
if (textoCom.length < 500) inconclusivo('o texto extraído do PDF veio vazio ou curto demais');
check(textoCom.includes('TRABALHADOR FICTICIO DE TESTE'), 'controle: o texto do PDF foi extraído');
check(['0295', '0281', '1057', '0693'].every((c) => textoCom.includes(c)),
  'o kit lista os 4 exames pelo código da Tabela 27');
check(textoCom.includes('Audiometria tonal ocupacional') && textoCom.includes('Hemograma com contagem de plaquetas'),
  'o kit lista os exames pelo nome');
check(['10/08/2026', '08/08/2026', '09/08/2026', '07/08/2026'].every((d) => textoCom.includes(d)),
  'o kit traz a data de realização de cada exame (alínea "d" do 7.5.19.1)');
check(/\bApto\b/.test(textoCom), 'a conclusão apto/inapto do ASO continua no kit (alínea "e")');

// O defeito pela forma: os campos clinicos nao podem mudar o documento.
check(textoCom === textoSem,
  'mudar só resultado, observação e restrição não muda o TEXTO do kit');
check(desenhoDoPdf(pdfCom) === desenhoDoPdf(pdfSem),
  'nem o DESENHO do kit (cor, posição, largura) — nenhum campo clínico chega ao papel');

// Controle do controle: a comparacao enxerga diferenca quando ela deve existir.
const outraData = trabalhador({
  resultadoAso: 'APTO',
  restricao: null,
  exames: semAchados.aso_history[0].exams.map((e, i) => (i === 1 ? { ...e, exam_date: '2026-08-05' } : e)),
});
check(textoCorrido(gerar(args(outraData))) !== textoSem,
  'controle: mudar a DATA de um exame muda o kit (a comparação não é cega)');

// As palavras, como segunda linha.
for (const proibido of ['Alterado', 'ALTERADO', 'Agravamento', 'AGRAVAMENTO', 'Estável', 'ESTAVEL', OBSERVACAO, OBS_HEMOGRAMA, 'PA 150x95', RESTRICAO]) {
  check(!textoCom.includes(proibido), `o kit não contém "${proibido}"`);
}

// Restricao com ASO "apto com restricao": a conclusao sai, o texto do medico nao.
const comRestricao = trabalhador({
  resultadoAso: 'APTO_COM_RESTRICAO',
  restricao: RESTRICAO,
  exames: comAchados.aso_history[0].exams,
});
const textoRestricao = textoCorrido(gerar(args(comRestricao)));
check(!textoRestricao.includes(RESTRICAO), 'com ASO "apto com restrição", o texto da restrição não sai no kit');
check(!/restri/i.test(textoRestricao.replace(/\s+/g, '')) && /Apto/.test(textoRestricao),
  'com ASO "apto com restrição", o kit diz só "Apto" (7.5.19.1, "e"): nem a existência da restrição chega ao RH');

// A ficha do colaborador e o Excel de ASOs tambem: so apto ou inapto, nada inventado.
{
  const dossie = semComentarios(fs.readFileSync(CAMINHO_FICHA, 'utf8'));
  check(!/\{\s*aso\.result\s*\}/.test(dossie), 'a ficha do colaborador não exibe o código cru do resultado (APTO_COM_RESTRICAO)');
  const excel = semComentarios(fs.readFileSync(path.join(RAIZ, 'lib', 'excelExportService.ts'), 'utf8'));
  check(!/APTO COM RESTRI/.test(excel), 'o Excel de ASOs não escreve "APTO COM RESTRIÇÃO"');
  check(!/Dr\. Médico Coordenador|'CRM\/SP'|doctor_uf \|\| 'SP'/.test(excel), 'o Excel de ASOs não inventa médico nem UF');
  check(!/:\s*'INAPTO';/.test(excel), 'ASO sem conclusão não vira "INAPTO" no Excel');
}

// ===========================================================================
// 3. O CODIGO DO KIT (para o diagnostico apontar a linha)
// ===========================================================================
console.log('\n--- 3. exportAdmissionKitPDF no código-fonte ---');

const servicoFonte = fs.readFileSync(path.join(RAIZ, 'lib/pdfExportService.ts'), 'utf8');
const inicioKit = servicoFonte.indexOf('export function exportAdmissionKitPDF(');
if (inicioKit < 0) inconclusivo('exportAdmissionKitPDF não encontrada no fonte');
const abreParams = servicoFonte.indexOf('(', inicioKit);
const abreCorpo = servicoFonte.indexOf('{', fechamento(servicoFonte, abreParams));
const corpoKit = semComentarios(servicoFonte.slice(abreCorpo, fechamento(servicoFonte, abreCorpo) + 1));

check(!/\brestrictions_notes\b/.test(corpoKit), 'o kit não lê restrictions_notes');
check(!/\??\.\s*observation\b/.test(corpoKit), 'o kit não lê a observação de exame nenhum');
// `.result` so do proprio ASO (apto/inapto). Qualquer outro objeto e exame.
const resultadosLidos = [...corpoKit.matchAll(/([\w$]+)\s*\??\.\s*result\b/g)].map((m) => m[1]);
const indevidos = resultadosLidos.filter((obj) => obj !== 'asoDoKit');
check(indevidos.length === 0,
  'o único `.result` lido no kit é o do ASO (asoDoKit)' +
    (indevidos.length ? ` — lido também em: ${[...new Set(indevidos)].join(', ')}` : ''));

// ===========================================================================
console.log(`\n${casos - falhas}/${casos} casos passaram.`);
if (falhas > 0) {
  console.log(`${falhas} FALHA(S).`);
  process.exit(1);
}
console.log('Sigilo dos exames: nenhum resultado, observação ou restrição sai para o RH.');
process.exit(0);
