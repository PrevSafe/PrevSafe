/**
 * Verificacao de quem assina o que, em qual cliente.
 *
 *   node scripts/verificar-responsabilidade-tecnica.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * A responsabilidade tecnica era UM par de campos da organizacao inteira:
 * `technical_responsible_name` e `pcmso_physician_name`. Todo PGR, LTCAT,
 * laudo e PCMSO de TODO cliente saia com esses dois nomes. Na pratica de uma
 * consultoria isso e falso, e do tipo que tem consequencia legal: o
 * engenheiro responde pelo contrato de uma empresa e nao pelo de outra, e o
 * medico pode ser so EXAMINADOR num cliente sem ser o COORDENADOR do PCMSO
 * dele - a NR-07 pede os dois nomes em campos separados do ASO (item
 * 7.5.19.1, alineas "f" e "g"), e o eSocial tambem separa: [respMonit] leva o
 * coordenador, [medico] leva quem emitiu o ASO.
 *
 * O evento S-2240 era pior: o gerador em lote levava um responsavel inteiro
 * escrito no codigo - CPF 09876543211, CREA 506981240/SP - para todo cliente,
 * e o gerador de preview mandava `ideOC` fixo em 1 (CRM) ate para engenheiro.
 *
 * O que este teste cobra, entao, nao e "a tela abre": e que o nome que sai no
 * documento seja o de quem respondia POR AQUELE CLIENTE, e que o sistema
 * recuse papel que a norma nao permite.
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
const TMP = path.join(RAIZ, '.tmp-responsabilidade-verificacao');

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
    files: [path.join(RAIZ, 'lib/responsabilidadeTecnica.ts')],
  })
);

try {
  execFileSync('npx', ['tsc', '-p', TSCONFIG], { stdio: 'pipe', shell: true, cwd: RAIZ });
} catch (e) {
  inconclusivo('npx tsc falhou', e.stdout?.toString() || e.message);
}

const achar = (nome) =>
  [path.join(TMP, 'lib', nome), path.join(TMP, nome)].find((p) => fs.existsSync(p));

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
const CAMINHO = achar('responsabilidadeTecnica.js');
if (!CAMINHO) inconclusivo('o tsc não emitiu responsabilidadeTecnica.js');

let lib;
try {
  lib = require_(CAMINHO);
} catch (e) {
  inconclusivo('não foi possível carregar o módulo compilado', e.message);
}

const {
  PAPEIS_TECNICOS,
  CONSELHOS,
  definicaoDoPapel,
  habilitacaoParaPapel,
  registroDoProfissional,
  linhaDeAssinatura,
  atribuicaoVigente,
  responsaveisDoCliente,
  responsavelDoCliente,
  assinaturaDoDocumento,
  respMonitDoCliente,
  respRegDoCliente,
  papeisSemResponsavel,
  codigoDoOrgaoDeClasse,
  responsaveisTecnicosDoCliente,
  linhaDeResponsaveis,
} = lib;

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

// ===========================================================================
// O cenário
//
// Dois clientes. O engenheiro responde pelo PGR do A e não pelo do B. O
// médico coordena o PCMSO do A e é apenas examinador no B — que é exatamente
// a distinção que o sistema não sabia fazer.
// ===========================================================================
const CLIENTE_A = 'cli-A';
const CLIENTE_B = 'cli-B';
const HOJE = '2026-09-28';

const engenheiro = {
  id: 'prof-eng',
  full_name: 'Marcos Tavares',
  cpf: '529.982.247-25',
  council: 'CREA',
  council_number: '201812345',
  council_uf: 'BA',
  specialty: 'Engenharia de Segurança do Trabalho',
  status: 'ACTIVE',
};

const medico = {
  id: 'prof-med',
  full_name: 'Gustavo Maia Pedroni',
  cpf: '112.675.997-07',
  council: 'CRM',
  council_number: '24192',
  council_uf: 'BA',
  rqe: '5512',
  specialty: 'Medicina do Trabalho',
  status: 'ACTIVE',
};

const outroMedico = {
  id: 'prof-med2',
  full_name: 'Helena Prado',
  cpf: '390.533.447-05',
  council: 'CRM',
  council_number: '77310',
  council_uf: 'SE',
  status: 'ACTIVE',
};

const profissionais = [engenheiro, medico, outroMedico];

const atribuicao = (id, clientId, professional_id, role, start_date, end_date) => ({
  id,
  organization_id: 'org',
  client_id: clientId,
  professional_id,
  role,
  start_date,
  end_date,
  status: 'ACTIVE',
});

const atribuicoes = [
  atribuicao('r1', CLIENTE_A, engenheiro.id, 'PGR_RESP', '2026-01-01'),
  atribuicao('r2', CLIENTE_A, medico.id, 'PCMSO_COORD', '2026-01-01'),
  atribuicao('r3', CLIENTE_B, outroMedico.id, 'MEDICO_EXAMINADOR', '2026-01-01'),
  atribuicao('r4', CLIENTE_A, engenheiro.id, 'REG_AMBIENTAIS', '2026-01-01'),
];

// ===========================================================================
console.log('--- o documento sai com quem responde por AQUELE cliente ---');
// ===========================================================================
{
  const noA = assinaturaDoDocumento('PGR_RESP', {
    atribuicoes, profissionais, clientId: CLIENTE_A, data: HOJE,
    nomeDaOrganizacao: 'Responsável Geral da Consultoria',
    linhaDaOrganizacao: 'Responsável Geral da Consultoria (CREA 1)',
  });
  check(noA.nome === 'Marcos Tavares', 'no cliente A assina quem foi atribuído ao cliente A');
  check(noA.origem === 'ATRIBUICAO', 'e a origem diz que veio de uma atribuição');
  check(noA.pendencia === '', 'sem pendência quando há responsável atribuído');

  // O defeito: o mesmo nome saindo no cliente onde ele nao responde.
  const noB = assinaturaDoDocumento('PGR_RESP', {
    atribuicoes, profissionais, clientId: CLIENTE_B, data: HOJE,
    nomeDaOrganizacao: 'Responsável Geral da Consultoria',
    linhaDaOrganizacao: 'Responsável Geral da Consultoria (CREA 1)',
  });
  check(noB.nome !== 'Marcos Tavares',
    'no cliente B NÃO sai o responsável do cliente A');
  check(noB.origem === 'ORGANIZACAO',
    'sem atribuição, o documento cai no responsável geral da organização');
  check(/não atribuído a este cliente/i.test(noB.pendencia),
    'e a pendência diz isso, impressa no documento');
  check(/Responsabilidade Técnica/.test(noB.pendencia),
    'dizendo também onde resolver');

  const semNada = assinaturaDoDocumento('PGR_RESP', {
    atribuicoes, profissionais, clientId: CLIENTE_B, data: HOJE,
  });
  check(semNada.origem === 'NENHUM' && semNada.nome === '',
    'sem atribuição e sem responsável geral, não se inventa nome nenhum');
  check(semNada.pendencia.length > 0, 'e ainda assim há o que dizer ao usuário');
}

// ===========================================================================
console.log('\n--- coordenador do PCMSO não é o médico examinador (NR-07 7.5.19.1) ---');
// ===========================================================================
{
  const coordA = respMonitDoCliente(atribuicoes, profissionais, CLIENTE_A, HOJE);
  check(coordA && coordA.nome === 'Gustavo Maia Pedroni',
    'o [respMonit] do cliente A é o coordenador do PCMSO dele');
  check(coordA && coordA.uf === 'BA',
    `o CRM sai com a UF do conselho, e não fixa em SP (saiu ${coordA && coordA.uf})`);

  // No cliente B ele NAO coordena: so ha um examinador.
  const coordB = respMonitDoCliente(atribuicoes, profissionais, CLIENTE_B, HOJE);
  check(coordB === null,
    'no cliente B não há coordenador do PCMSO: o grupo [respMonit] fica de fora');

  const examinadoresB = responsaveisDoCliente(
    atribuicoes, profissionais, CLIENTE_B, 'MEDICO_EXAMINADOR', HOJE
  );
  check(examinadoresB.length === 1 && examinadoresB[0].full_name === 'Helena Prado',
    'mas o examinador do cliente B existe e é outro médico');
  check(
    respMonitDoCliente(atribuicoes, profissionais, CLIENTE_B, HOJE) === null,
    'ser examinador NÃO promove ninguém a coordenador'
  );

  const examinadoresA = responsaveisDoCliente(
    atribuicoes, profissionais, CLIENTE_A, 'MEDICO_EXAMINADOR', HOJE
  );
  check(examinadoresA.length === 0,
    'e coordenar o PCMSO não faz de ninguém examinador automaticamente');
}

// ===========================================================================
console.log('\n--- habilitação: a norma diz quem pode assumir cada papel ---');
// ===========================================================================
{
  check(!habilitacaoParaPapel(engenheiro, 'PCMSO_COORD').apto,
    'engenheiro não coordena PCMSO (NR-07, item 7.4.1 "c")');
  check(/CRM/.test(habilitacaoParaPapel(engenheiro, 'PCMSO_COORD').motivo),
    'e o motivo diz qual registro a norma exige');
  check(/7\.4\.1/.test(habilitacaoParaPapel(engenheiro, 'PCMSO_COORD').motivo),
    'citando o item da norma, não só "não pode"');

  check(habilitacaoParaPapel(medico, 'PCMSO_COORD').apto, 'médico coordena PCMSO');
  check(habilitacaoParaPapel(medico, 'LTCAT_RESP').apto,
    'médico do trabalho assina LTCAT (Lei 8.213/91, art. 58, § 1º)');
  check(habilitacaoParaPapel(engenheiro, 'LTCAT_RESP').apto,
    'engenheiro de segurança também');
  check(habilitacaoParaPapel(medico, 'LAUDO_INSALUBRIDADE').apto
    && habilitacaoParaPapel(engenheiro, 'LAUDO_INSALUBRIDADE').apto,
    'insalubridade: médico do trabalho OU engenheiro (CLT, art. 195)');

  const enfermeiro = { ...medico, id: 'p9', council: 'COREN', full_name: 'Ana Lima' };
  check(!habilitacaoParaPapel(enfermeiro, 'LAUDO_PERICULOSIDADE').apto,
    'periculosidade não é perícia de outro conselho');

  // Onde a norma lida NAO nomeia conselho, o sistema nao inventa um.
  check(habilitacaoParaPapel(enfermeiro, 'PGR_RESP').apto,
    'a NR-01 não nomeia conselho para o PGR — o sistema também não exige');
  check(definicaoDoPapel('PGR_RESP').conselhosAceitos === null,
    'e isso está declarado, não implícito');
  check(habilitacaoParaPapel(enfermeiro, 'AEP_RESP').apto,
    'a NR-17 não nomeia conselho para a avaliação ergonômica');

  check(!habilitacaoParaPapel(null, 'PGR_RESP').apto,
    'sem profissional não há habilitação');
  check(!habilitacaoParaPapel(medico, 'PAPEL_QUE_NAO_EXISTE').apto,
    'papel desconhecido não passa');
}

// ===========================================================================
console.log('\n--- vigência ---');
// ===========================================================================
{
  const encerrada = atribuicao('r9', CLIENTE_A, medico.id, 'PGR_RESP', '2024-01-01', '2025-12-31');
  check(!atribuicaoVigente(encerrada, HOJE), 'atribuição encerrada não vale hoje');
  check(atribuicaoVigente(encerrada, '2025-06-01'), 'mas valia no dia em que valia');
  check(!atribuicaoVigente(
    atribuicao('r10', CLIENTE_A, medico.id, 'PGR_RESP', '2027-01-01'), HOJE
  ), 'atribuição futura ainda não vale');
  check(atribuicaoVigente(
    { ...atribuicao('r11', CLIENTE_A, medico.id, 'PGR_RESP', ''), start_date: '' }, HOJE
  ), 'sem data de início declarada, não se descarta o responsável em silêncio');
  check(!atribuicaoVigente(
    { ...atribuicao('r12', CLIENTE_A, medico.id, 'PGR_RESP', '2020-01-01'), status: 'INACTIVE' },
    HOJE
  ), 'atribuição inativa não vale');
  check(!atribuicaoVigente(null, HOJE), 'nada não vale');

  // O documento do ano passado foi assinado por quem respondia no ano passado.
  const historico = [
    atribuicao('h1', CLIENTE_A, medico.id, 'PGR_RESP', '2024-01-01', '2025-12-31'),
    atribuicao('h2', CLIENTE_A, engenheiro.id, 'PGR_RESP', '2026-01-01'),
  ];
  const antes = assinaturaDoDocumento('PGR_RESP', {
    atribuicoes: historico, profissionais, clientId: CLIENTE_A, data: '2025-06-01',
  });
  const agora = assinaturaDoDocumento('PGR_RESP', {
    atribuicoes: historico, profissionais, clientId: CLIENTE_A, data: HOJE,
  });
  check(antes.nome === 'Gustavo Maia Pedroni' && agora.nome === 'Marcos Tavares',
    'reemitir um documento antigo traz o responsável daquela data');
}

// ===========================================================================
console.log('\n--- profissional inativo sai das listas ---');
// ===========================================================================
{
  const desativado = profissionais.map(
    (p) => (p.id === engenheiro.id ? { ...p, status: 'INACTIVE' } : p)
  );
  check(
    responsaveisDoCliente(atribuicoes, desativado, CLIENTE_A, 'PGR_RESP', HOJE).length === 0,
    'profissional desativado não responde mais, mesmo com a atribuição no lugar'
  );
}

// ===========================================================================
console.log('\n--- titular único: mais de um vigente é sinalizado, não escolhido ---');
// ===========================================================================
{
  check(definicaoDoPapel('PCMSO_COORD').unicoPorCliente,
    'o coordenador do PCMSO é titular único por cliente');
  check(!definicaoDoPapel('REG_AMBIENTAIS').unicoPorCliente,
    'os registros ambientais aceitam mais de um (MOS S-2240, item 11.1: até 99)');

  const dois = [
    atribuicao('d1', CLIENTE_A, medico.id, 'PCMSO_COORD', '2026-01-01'),
    atribuicao('d2', CLIENTE_A, outroMedico.id, 'PCMSO_COORD', '2026-02-01'),
  ];
  const r = responsavelDoCliente(dois, profissionais, CLIENTE_A, 'PCMSO_COORD', HOJE);
  check(r.duplicado, 'dois coordenadores vigentes no mesmo cliente é sinalizado');
  const assinatura = assinaturaDoDocumento('PCMSO_COORD', {
    atribuicoes: dois, profissionais, clientId: CLIENTE_A, data: HOJE,
  });
  check(/mais de um profissional vigente/i.test(assinatura.pendencia),
    'e o documento imprime isso em vez de escolher em silêncio');
}

// ===========================================================================
console.log('\n--- cargo em dois GHE, profissional em dois clientes ---');
// ===========================================================================
{
  const emDois = [
    atribuicao('m1', CLIENTE_A, engenheiro.id, 'PGR_RESP', '2026-01-01'),
    atribuicao('m2', CLIENTE_B, engenheiro.id, 'PGR_RESP', '2026-01-01'),
  ];
  check(
    assinaturaDoDocumento('PGR_RESP', { atribuicoes: emDois, profissionais, clientId: CLIENTE_A, data: HOJE }).nome
      === assinaturaDoDocumento('PGR_RESP', { atribuicoes: emDois, profissionais, clientId: CLIENTE_B, data: HOJE }).nome,
    'o mesmo profissional pode responder por dois clientes — desde que atribuído nos dois'
  );

  const doisResponsaveis = [
    atribuicao('n1', CLIENTE_A, engenheiro.id, 'REG_AMBIENTAIS', '2026-01-01'),
    atribuicao('n2', CLIENTE_A, medico.id, 'REG_AMBIENTAIS', '2026-01-01'),
  ];
  const { responsaveis } = respRegDoCliente(doisResponsaveis, profissionais, CLIENTE_A, HOJE);
  check(responsaveis.length === 2,
    'o [respReg] do S-2240 leva todos os responsáveis vigentes, não o primeiro');
}

// ===========================================================================
console.log('\n--- [respReg] do S-2240 ---');
// ===========================================================================
{
  const { responsaveis, pendencias } = respRegDoCliente(
    atribuicoes, profissionais, CLIENTE_A, HOJE
  );
  check(responsaveis.length === 1 && responsaveis[0].nome === 'Marcos Tavares',
    'o responsável pelos registros ambientais vem da atribuição do cliente');
  check(pendencias.length === 0, 'e sem pendência quando está tudo no lugar');

  const vazio = respRegDoCliente(atribuicoes, profissionais, CLIENTE_B, HOJE);
  check(vazio.responsaveis.length === 0 && vazio.pendencias.length === 1,
    'cliente sem responsável pelos registros ambientais é pendência, não CPF inventado');

  // O CPF e o unico campo do grupo: sem ele nao ha o que declarar.
  const semCpf = [{ ...engenheiro, id: 'p-sem-cpf', cpf: '' }];
  const comAtrib = [atribuicao('s1', CLIENTE_A, 'p-sem-cpf', 'REG_AMBIENTAIS', '2026-01-01')];
  const r = respRegDoCliente(comAtrib, semCpf, CLIENTE_A, HOJE);
  check(r.responsaveis.length === 0 && /CPF/.test(r.pendencias[0]),
    'responsável sem CPF válido fica de fora do evento, com o motivo dito');
}

// ===========================================================================
console.log('\n--- órgão de classe do [respReg] ---');
// ===========================================================================
{
  const eng = codigoDoOrgaoDeClasse(engenheiro);
  check(eng.ideOC === '4', `CREA é ideOC 4, e não 1 fixo (saiu ${eng.ideOC})`);
  check(eng.nrOC === '201812345', 'o número do registro vai em nrOC');
  check(eng.ufOC === 'BA', `a UF vem do cadastro, não fixa em SP (saiu ${eng.ufOC})`);
  check(eng.dscOC === '', 'dscOC só existe quando o conselho não está na tabela');

  const med = codigoDoOrgaoDeClasse(medico);
  check(med.ideOC === '1', 'CRM é ideOC 1');

  const outro = codigoDoOrgaoDeClasse({ ...medico, council: 'OUTRO', council_other: 'CRT' });
  check(outro.ideOC === '9' && outro.dscOC === 'CRT',
    'conselho fora da tabela vai como 9 com a sigla em dscOC');
}

// ===========================================================================
console.log('\n--- como o nome sai impresso ---');
// ===========================================================================
{
  check(registroDoProfissional(medico) === 'CRM 24192/BA',
    `o registro sai "CRM 24192/BA" (saiu "${registroDoProfissional(medico)}")`);
  check(registroDoProfissional({ ...medico, council_uf: '' }) === 'CRM 24192',
    'sem UF, não se inventa uma');
  check(registroDoProfissional(null) === '', 'sem profissional, string vazia');
  check(registroDoProfissional({ council: 'OUTRO', council_other: 'CRT', council_number: '9', council_uf: 'BA' })
    === 'CRT 9/BA', 'conselho "OUTRO" imprime a sigla declarada');

  const linha = linhaDeAssinatura(medico);
  check(/Gustavo Maia Pedroni/.test(linha), 'a linha de assinatura tem o nome');
  check(/CRM 24192\/BA/.test(linha), 'e o registro');
  check(/RQE 5512/.test(linha), 'e o RQE quando houver — é o que distingue a especialidade');
  check(!/RQE/.test(linhaDeAssinatura(engenheiro)), 'sem RQE, não aparece RQE nenhum');
}

// ===========================================================================
console.log('\n--- papéis sem responsável ---');
// ===========================================================================
{
  const faltando = papeisSemResponsavel(atribuicoes, profissionais, CLIENTE_A, HOJE);
  check(!faltando.includes('PGR_RESP'), 'o PGR do cliente A tem responsável');
  check(faltando.includes('LTCAT_RESP'), 'o LTCAT do cliente A não tem, e isso é dito');
  check(papeisSemResponsavel(atribuicoes, profissionais, CLIENTE_B, HOJE).length
    === PAPEIS_TECNICOS.length - 1,
    'no cliente B só o médico examinador está preenchido');
}

// ===========================================================================
console.log('\n--- o catálogo de papéis ---');
// ===========================================================================
{
  check(PAPEIS_TECNICOS.length >= 10, 'os papéis que os documentos usam estão declarados');
  const semBase = PAPEIS_TECNICOS.filter((p) => !p.baseLegal || p.baseLegal.length < 40);
  check(semBase.length === 0,
    `todo papel cita de onde vem a exigência (sem base: ${semBase.map((p) => p.codigo).join(', ')})`);
  const semDocumento = PAPEIS_TECNICOS.filter((p) => !p.documento);
  check(semDocumento.length === 0,
    'e todo papel diz qual documento ou evento alimenta — papel que não alimenta nada não entra');
  const codigos = PAPEIS_TECNICOS.map((p) => p.codigo);
  check(new Set(codigos).size === codigos.length, 'sem código repetido');
  check(CONSELHOS.some((c) => c.codigo === 'CRM') && CONSELHOS.some((c) => c.codigo === 'CREA'),
    'os dois conselhos que as normas nomeiam estão no cadastro');
}

// ===========================================================================
console.log('\n--- o atalho antigo não voltou (pela forma, no código) ---');
// ===========================================================================
{
  const semComentarios = (txt) => txt
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');

  const ler = (rel) => semComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
  const pdf = ler('lib/pdfExportService.ts');
  const ctx = ler('context/PrevSafeContext.tsx');
  const esocialUi = ler('components/esocial/ESocialEventsView.tsx');

  // O PGR e a AEP assinavam com o nome geral da organizacao, direto.
  check(/assinaturaDoCliente\(\s*'PGR_RESP'/.test(pdf),
    'o PGR resolve o responsável pelo cliente');
  check(/assinaturaDoCliente\(\s*'AEP_RESP'/.test(pdf), 'a AEP também');
  check(/assinaturaDoCliente\(\s*'LTCAT_RESP'/.test(pdf), 'o LTCAT também');
  check(/assinaturaDoCliente\(\s*'LAUDO_INSALUBRIDADE'/.test(pdf)
    && /assinaturaDoCliente\(\s*'LAUDO_PERICULOSIDADE'/.test(pdf),
    'e os dois laudos periciais');
  check(/assinaturaDoCliente\(\s*'PCMSO_COORD'/.test(pdf),
    'o PCMSO resolve o médico coordenador pelo cliente');

  check(!/\['Responsável técnico pela elaboração', technicalResponsibleLine\(organization\)\]/.test(pdf),
    'nenhum quadro de identificação imprime o responsável geral direto');
  check(!/identificacaoDoSignatario\(\s*technicalResponsibleName\(organization\)/.test(pdf),
    'nenhum campo de assinatura imprime o responsável geral direto');
  // O contrato comercial continua com o responsavel da organizacao: e
  // documento da consultoria, nao documento tecnico regido por NR. A
  // varredura cobre so os geradores de documento tecnico.
  const documentosTecnicos = pdf.slice(
    pdf.indexOf('export function exportPGRDocumentPdf'),
    pdf.indexOf('export function exportContractPdf')
  );
  check(!/\{ content: technicalResponsibleLine\(organization\) \}/.test(documentosTecnicos),
    'nem os laudos');
  check(!/\{ content: pcmsoPhysicianLine\(organization\) \}/.test(pdf),
    'nem o PCMSO com o médico da organização');

  // Os responsaveis inventados do S-2240.
  check(!/09876543211/.test(ctx), 'o CPF de responsável escrito no código saiu');
  check(!/506981240/.test(ctx), 'o CREA escrito no código saiu');
  // O <ideOC>1</ideOC> do S-2210 e legitimo: o emitente do atestado da CAT e
  // medico. O que nao pode voltar e ideOC fixo DENTRO do respReg.
  check(!/<respReg>[\s\S]{0,240}<ideOC>1<\/ideOC>/.test(ctx),
    'ideOC do [respReg] não sai mais fixo em 1');
  check(/blocoRespRegXml\(/.test(ctx), 'o [respReg] vem da atribuição do cliente');
  check((ctx.match(/\$\{blocoRespRegXml\(/g) || []).length === 2,
    'nos dois geradores de S-2240, e não só no de preview');
  check(/blocoRespMonitXml\(/.test(ctx),
    'e o S-2220 passou a levar o grupo [respMonit] (MOS S-1.3, item 1.7)');

  // A UF que ia fixa em SP.
  check(!/responsible_technician_uf: 'SP'/.test(ctx + esocialUi),
    "a UF do responsável não vai mais fixa em 'SP'");
  check(!/physician_uf: 'SP'/.test(ctx + esocialUi),
    "nem a UF do CRM do médico");
  check(!/\|\| '123456'/.test(ctx), 'o CRM 123456 de fachada saiu do S-2220');
  check(!/'Médico Examinador'/.test(ctx),
    'e o nome de médico de fachada também');

  // A responsabilidade e por cliente: nao ha atribuicao sem client_id.
  const libTxt = semComentarios(fs.readFileSync(path.join(RAIZ, 'lib/responsabilidadeTecnica.ts'), 'utf8'));
  check(/a\?\.client_id === clientId/.test(libTxt),
    'toda resolução filtra pelo cliente');
  check(!/responsavelPadrao|defaultResponsible/i.test(libTxt),
    'não existe responsável padrão que valha em cliente sem atribuição');
}

// ===========================================================================
console.log('\n--- o contrato nomeia quem responde por aquele cliente ---');
//
// O contrato comercial cobre varios servicos ao mesmo tempo, entao nao tem UM
// papel proprio. Antes imprimia o responsavel geral da consultoria, igual em
// todo contrato de todo cliente.
// ===========================================================================
{
  const doA = responsaveisTecnicosDoCliente(atribuicoes, profissionais, CLIENTE_A, HOJE);
  check(doA.length === 2, `o cliente A tem dois profissionais respondendo (achou ${doA.length})`);

  const eng = doA.find((r) => r.profissional.id === engenheiro.id);
  check(eng && eng.papeis.length === 2,
    'e o engenheiro aparece UMA vez, com os dois papéis dele');
  check(eng && eng.papeis.includes('PGR_RESP') && eng.papeis.includes('REG_AMBIENTAIS'),
    'os dois papéis certos');

  const linha = linhaDeResponsaveis(atribuicoes, profissionais, CLIENTE_A, HOJE);
  check(/Marcos Tavares/.test(linha) && /CREA 201812345\/BA/.test(linha),
    'a linha do contrato traz nome e registro');
  check(/PGR/.test(linha), 'e diz por qual papel ele responde');
  check(/Gustavo Maia Pedroni/.test(linha), 'com o médico na linha seguinte');

  check(linhaDeResponsaveis(atribuicoes, profissionais, 'cli-inexistente', HOJE) === '',
    'cliente sem ninguém atribuído devolve vazio — quem chama decide o que dizer');

  const encerrado = [atribuicao('c1', CLIENTE_A, engenheiro.id, 'PGR_RESP', '2024-01-01', '2024-12-31')];
  check(linhaDeResponsaveis(encerrado, profissionais, CLIENTE_A, HOJE) === '',
    'e responsabilidade encerrada não aparece no contrato de hoje');
}

// ===========================================================================
console.log('\n--- o evento não inventa o que não sabe ---');
// ===========================================================================
{
  const semComentarios2 = (txt) => txt
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');
  const ctx = semComentarios2(fs.readFileSync(path.join(RAIZ, 'context/PrevSafeContext.tsx'), 'utf8'));
  const pdf = semComentarios2(fs.readFileSync(path.join(RAIZ, 'lib/pdfExportService.ts'), 'utf8'));

  check(/linhaDeResponsaveis\(/.test(pdf), 'o contrato resolve os responsáveis pelo cliente');

  // O S-2240 do GHE pegava o primeiro trabalhador da base quando o GHE estava
  // vazio - possivelmente de outro cliente - e, sem nenhum, usava um CPF fixo.
  check(!/employees\.find\(e => e\.ghe_id === gheId\) \|\| employees\[0\]/.test(ctx),
    'o S-2240 não pega mais o primeiro trabalhador da base');
  check(/e\.ghe_id === gheId && e\.client_id === ghe\.client_id/.test(ctx),
    'o trabalhador do evento tem de ser do GHE E do cliente');
  check(!/12345678900/.test(ctx), 'o CPF de trabalhador escrito no código saiu');
  check(!/<dtIniCondicao>2026-01-01</.test(ctx), 'o início de exposição fixo saiu');
  check(/evento: null, motivo/.test(ctx),
    'não gerar o evento passou a dizer por quê, em vez de devolver null em silêncio');

  // Os valores plausiveis do XML de pre-visualizacao.
  check(!/'2026-08-20'/.test(ctx), 'a data de evento usada como padrão saiu');
  check(!/<hrsTrabAntesAcid>0330</.test(ctx), 'as 3h30 fixas antes do acidente saíram');
  check(!/'S93\.4'/.test(ctx), 'o CID usado como padrão saiu');
  check(!/'752000000'|'303020100'/.test(ctx),
    'os códigos de parte atingida e agente causador usados como padrão saíram');
  check(!/'Pronto Socorro'|'88412'/.test(ctx), 'o emitente de atestado inventado saiu');
  check(/campoDoEvento\('dtAso'/.test(ctx) && /campoDoEvento\('dtAcid'/.test(ctx),
    'os campos ausentes saem vazios, com o motivo ao lado');
  check((ctx.match(/campoDoEvento\(/g) || []).length >= 14,
    'em todos os campos que eram preenchidos por conta própria');

  // Resultado e tipo do ASO caiam num ramo final do ternario.
  check(!/aso\?\.result === 'APTO' \? '1' : '2'/.test(ctx),
    'ASO sem resultado não sai mais declarando o trabalhador INAPTO');
}

console.log(
  falhas === 0 ? `\nTODOS OS TESTES PASSARAM (${casos} casos)` : `\n${falhas} FALHA(S) em ${casos} casos`
);
process.exit(falhas === 0 ? 0 : 1);
