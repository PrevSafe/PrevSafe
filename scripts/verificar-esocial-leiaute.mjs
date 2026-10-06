/**
 * Identificacao do empregador, versao do esquema e Id dos eventos do eSocial.
 *
 *   node scripts/verificar-esocial-leiaute.mjs
 *
 * O QUE ESTA SENDO PROVADO
 *
 * 1. {ideEmpregador/nrInsc} sai com a RAIZ do CNPJ (8 posicoes), e com o CNPJ
 *    completo (14) so para as naturezas 101-5, 104-0, 107-4, 116-3 e 134-1.
 *    Leiaute S-1.3 (cons. ate a NT 07/2026 rev.), S-1000, campo nrInsc; os
 *    eventos de SST dizem "conforme informado em S-1000". O codigo mandava os
 *    14 digitos para todo mundo.
 * 2. Natureza vazia ou sem codigo: sai a raiz (regra geral), COM aviso. A
 *    dispensa da excecao nao se presume em silencio.
 * 3. O ambiente do S-2240 ({infoAmb/nrInsc}) continua com o CNPJ completo: o
 *    campo e do estabelecimento (12 ou 14 posicoes), nao do empregador.
 * 4. O namespace de cada evento e o do XSD do S-1.3 (v_S_01_03_00). O codigo
 *    usava v_S_01_02_00, versao cuja convivencia acabou em 02/02/2025.
 * 5. O Id (REGRA_VALIDA_ID_EVENTO) usa o MESMO nrInsc do <ideEmpregador>,
 *    completado com zeros a direita ate 14, e o atributo se chama "Id" (XSD:
 *    <xs:attribute name="Id" use="required" type="TS_Id" />). Saia "id".
 * 6. Uma regra so: todo <eSocial xmlns>, todo <ideEmpregador> e todo Id do
 *    contexto passam por lib/esocialEmpregador.ts.
 *
 * VALORES ESPERADOS: copiados do texto oficial, nao da funcao testada.
 *   - targetNamespace de evtExpRisco.xsd, evtMonit.xsd, evtCAT.xsd,
 *     evtAfastTemp.xsd e evtExclusao.xsd, nos pacotes
 *     2026-07-01_esquemas_xsd_v_s_01_03_00.zip e
 *     2026-10-26_esquemas_xsd_v_s_01_03_00-1.zip (gov.br/esocial);
 *   - padrao do Id em tipos.xsd (TS_Id): ID\d{1}[A-Z0-9]{12}\d{21}, 36 caracteres.
 *
 * COMO O TESTE PROCURA O DEFEITO NO FONTE
 *
 * Pela forma que ele teria no codigo (literal de namespace com versao, tag
 * <ideEmpregador> escrita a mao, atributo id= minusculo, CNPJ da organizacao
 * como empregador), sobre o fonte SEM comentarios - o comentario que conta o
 * defeito antigo nao conta como defeito. Cada detector e conferido antes contra
 * o trecho defeituoso original; se nao o acusar, o resultado e INCONCLUSIVO.
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
const TMP = path.join(RAIZ, '.tmp-esocial-leiaute-verificacao');

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
// Compilacao de lib/esocialEmpregador.ts (importa '@/lib/validacoesBr')
// ===========================================================================
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
      path.join(RAIZ, 'lib/esocialEmpregador.ts'), path.join(RAIZ, 'lib/validacoesBr.ts'), path.join(RAIZ, 'lib/companyLookup.ts'),
      // Os montadores do S-2210, S-2230, S-2240 e S-3000, que o contexto chama.
      path.join(RAIZ, 'lib/esocialEventos.ts'),
    ],
  })
);
try {
  execFileSync('npx', ['tsc', '-p', TSCONFIG], { stdio: 'pipe', shell: true, cwd: RAIZ });
} catch (e) {
  inconclusivo('npx tsc falhou ao compilar lib/esocialEmpregador.ts', e.stdout?.toString() || e.message);
}
const SAIDA = path.join(TMP, 'lib');
for (const arquivo of fs.readdirSync(SAIDA).filter((f) => f.endsWith('.js'))) {
  const alvo = path.join(SAIDA, arquivo);
  fs.writeFileSync(alvo, fs.readFileSync(alvo, 'utf8').replace(/require\("@\/lib\/([^"]+)"\)/g, 'require("./$1")'));
}
fs.writeFileSync(path.join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

const require_ = createRequire(import.meta.url);
let lib;
let eventos;
try {
  lib = require_(path.join(SAIDA, 'esocialEmpregador.js'));
  eventos = require_(path.join(SAIDA, 'esocialEventos.js'));
} catch (e) {
  inconclusivo('não foi possível carregar lib/esocialEmpregador.ts ou lib/esocialEventos.ts compilado', e.message);
}
const {
  VERSAO_DO_ESQUEMA_ESOCIAL,
  NATUREZAS_COM_CNPJ_COMPLETO,
  namespaceDoEvento,
  codigoDaNaturezaJuridica,
  inscricaoDoEmpregador,
  xmlDoIdeEmpregador,
  inscricaoDoAmbiente,
  xmlDaInscricaoDoAmbiente,
  idDoEventoESocial,
} = lib;
for (const [nome, f] of Object.entries({ namespaceDoEvento, codigoDaNaturezaJuridica, inscricaoDoEmpregador, xmlDoIdeEmpregador, inscricaoDoAmbiente, xmlDaInscricaoDoAmbiente, idDoEventoESocial })) {
  if (typeof f !== 'function') inconclusivo(`lib/esocialEmpregador.ts não exporta ${nome}`);
}

// CNPJ e CPF sinteticos: 11.222.333/0001-81 e 529.982.247-25 sao exemplos de
// teste conhecidos; 12.ABC.345/01DE-35 e o exemplo alfanumerico publicado pela
// Receita (ver lib/validacoesBr.ts).
const CNPJ = '11.222.333/0001-81';
const CNPJ_14 = '11222333000181';
const RAIZ_8 = '11222333';
const CPF = '529.982.247-25';

// ===========================================================================
// 1. nrInsc: raiz, excecao, natureza vazia
// ===========================================================================
console.log('--- ideEmpregador/nrInsc (leiaute S-1.3, S-1000) ---');
{
  const comum = inscricaoDoEmpregador({ document_type: 'CNPJ', document_number: CNPJ, natureza_juridica: '206-2 - Sociedade Empresária Limitada' });
  check(comum.ok && comum.tpInsc === '1' && comum.nrInsc === RAIZ_8,
    `CNPJ de natureza comum: nrInsc é a raiz de 8 posições (${comum.nrInsc})`);
  check(comum.ok && comum.aviso === '', 'natureza com código fora da exceção: sem aviso');
  check(comum.ok && comum.documentoCompleto === CNPJ_14, 'o CNPJ completo continua disponível para os campos do estabelecimento');

  // Lista do texto oficial, digitada aqui e nao lida da lib.
  const OFICIAIS = ['101-5', '104-0', '107-4', '116-3', '134-1'];
  check(JSON.stringify([...NATUREZAS_COM_CNPJ_COMPLETO]) === JSON.stringify(OFICIAIS),
    `a lista de exceções é a do S-1000: ${[...NATUREZAS_COM_CNPJ_COMPLETO].join(', ')}`);
  for (const nat of OFICIAIS) {
    const r = inscricaoDoEmpregador({ document_type: 'CNPJ', document_number: CNPJ, natureza_juridica: nat });
    check(r.ok && r.nrInsc === CNPJ_14 && r.aviso === '', `natureza ${nat}: nrInsc com o CNPJ completo de 14 posições`);
  }
  const variantes = ['1015', '101-5 - Órgão Público do Poder Executivo Federal', ' 134-1 '];
  check(variantes.every((v) => { const r = inscricaoDoEmpregador({ document_type: 'CNPJ', document_number: CNPJ, natureza_juridica: v }); return r.ok && r.nrInsc === CNPJ_14; }),
    'o código é reconhecido com ou sem hífen e com a descrição ao lado');
  // 110-4 esta na lista do {indSiafi} do S-1000, NAO na do nrInsc.
  const siafi = inscricaoDoEmpregador({ document_type: 'CNPJ', document_number: CNPJ, natureza_juridica: '110-4' });
  check(siafi.ok && siafi.nrInsc === RAIZ_8, 'natureza 110-4 (lista do indSiafi, não do nrInsc) continua com a raiz');

  const vazia = inscricaoDoEmpregador({ document_type: 'CNPJ', document_number: CNPJ, natureza_juridica: '' });
  check(vazia.ok && vazia.nrInsc === RAIZ_8, 'natureza vazia: sai a raiz, que é a regra geral');
  check(vazia.ok && /não informada/.test(vazia.aviso) && OFICIAIS.every((n) => vazia.aviso.includes(n)),
    'natureza vazia: o aviso diz que falta e lista as naturezas da exceção');
  const semCampo = inscricaoDoEmpregador({ document_type: 'CNPJ', document_number: CNPJ });
  check(semCampo.ok && semCampo.nrInsc === RAIZ_8 && semCampo.aviso !== '', 'natureza ausente do cadastro: raiz com aviso');
  const soTexto = inscricaoDoEmpregador({ document_type: 'CNPJ', document_number: CNPJ, natureza_juridica: 'Sociedade Empresária Limitada' });
  check(soTexto.ok && soTexto.nrInsc === RAIZ_8 && /sem o código/.test(soTexto.aviso),
    'natureza só com descrição: raiz com aviso de que falta o código (texto não vira código)');

  const alfa = inscricaoDoEmpregador({ document_type: 'CNPJ', document_number: '12.ABC.345/01DE-35', natureza_juridica: '206-2' });
  check(alfa.ok && alfa.nrInsc === '12ABC345', `CNPJ alfanumérico: a raiz mantém as letras (${alfa.ok ? alfa.nrInsc : alfa.motivo})`);

  const pf = inscricaoDoEmpregador({ document_type: 'CPF', document_number: CPF });
  check(pf.ok && pf.tpInsc === '2' && pf.nrInsc === '52998224725' && pf.aviso === '', 'empregador pessoa física: tpInsc 2 e o CPF de 11 dígitos');

  for (const tipo of ['CAEPF', 'CNO']) {
    const r = inscricaoDoEmpregador({ document_type: tipo, document_number: '12345678901234' });
    check(!r.ok && r.motivo.includes(tipo), `${tipo} não vai em ideEmpregador (tpInsc só aceita 1 e 2): evento não é gerado`);
  }
  const invalido = inscricaoDoEmpregador({ document_type: 'CNPJ', document_number: '11.222.333/0001-82' });
  check(!invalido.ok, 'CNPJ com dígito verificador errado não identifica o empregador');
  check(!inscricaoDoEmpregador({ document_type: 'CNPJ', document_number: '' }).ok && !inscricaoDoEmpregador(undefined).ok,
    'sem documento ou sem cliente, nada é preenchido');

  check(codigoDaNaturezaJuridica('Sociedade Empresária Limitada') === '' && codigoDaNaturezaJuridica('') === '',
    'descrição sem código e texto vazio não viram código');
}

// ===========================================================================
// 1b. A natureza juridica que a consulta de CNPJ grava
// ===========================================================================
console.log('\n--- natureza jurídica da consulta de CNPJ (lib/companyLookup.ts) ---');
{
  let consulta;
  try {
    consulta = require_(path.join(SAIDA, 'companyLookup.js'));
  } catch (e) {
    inconclusivo('não foi possível carregar lib/companyLookup.ts compilado', e.message);
  }
  const { naturezaJuridicaDaReceita } = consulta;
  if (typeof naturezaJuridicaDaReceita !== 'function') inconclusivo('lib/companyLookup.ts não exporta naturezaJuridicaDaReceita');

  // Os dois campos como a BrasilAPI os devolveu para o CNPJ 00.000.000/0001-91
  // (Banco do Brasil), consulta de 05/10/2026: a descricao num campo e o codigo
  // de 4 algarismos, numerico, no outro.
  const bancoDoBrasil = { natureza_juridica: 'Sociedade de Economia Mista', codigo_natureza_juridica: 2038 };
  const gravada = naturezaJuridicaDaReceita(bancoDoBrasil);
  check(gravada === '203-8 - Sociedade de Economia Mista', `resposta real: grava "NNN-D - descrição" (${gravada})`);
  // "203-8" e a grafia do proprio leiaute S-1.3 (S-1000, indSiafi) para essa natureza.
  check(codigoDaNaturezaJuridica(gravada) === '203-8', 'o texto gravado é lido como o código 203-8');
  const comCodigo = inscricaoDoEmpregador({ document_type: 'CNPJ', document_number: CNPJ, natureza_juridica: gravada });
  check(comCodigo.ok && comCodigo.aviso === '' && comCodigo.nrInsc === RAIZ_8,
    'com o código gravado, o aviso de "natureza sem o código" deixa de sair');
  const federal = naturezaJuridicaDaReceita({ natureza_juridica: 'Órgão Público do Poder Executivo Federal', codigo_natureza_juridica: 1015 });
  const insFederal = inscricaoDoEmpregador({ document_type: 'CNPJ', document_number: CNPJ, natureza_juridica: federal });
  check(federal === '101-5 - Órgão Público do Poder Executivo Federal' && insFederal.ok && insFederal.nrInsc === CNPJ_14,
    'natureza 1015 da Receita vira 101-5 e leva o CNPJ completo ao nrInsc');
  check(naturezaJuridicaDaReceita({ natureza_juridica: 'Sociedade Empresária Limitada', codigo_natureza_juridica: '2062' })
    === '206-2 - Sociedade Empresária Limitada', 'código em texto também é aceito');

  // Sem codigo valido, nada e deduzido: fica a descricao, e o aviso continua.
  const semCodigo = [undefined, null, '', 0, 203, 12345, '20A8', 'abcd', ' ', true];
  const soDescricao = semCodigo.every((c) =>
    naturezaJuridicaDaReceita({ natureza_juridica: 'Sociedade de Economia Mista', codigo_natureza_juridica: c }) === 'Sociedade de Economia Mista');
  check(soDescricao, 'código ausente ou fora do formato: grava só a descrição, sem inventar código');
  check(naturezaJuridicaDaReceita({ natureza_juridica: '', codigo_natureza_juridica: undefined }) === ''
    && naturezaJuridicaDaReceita(undefined) === '', 'resposta sem natureza: vazio');
  check(naturezaJuridicaDaReceita({ natureza_juridica: '206-2 - Sociedade Empresária Limitada', codigo_natureza_juridica: 2062 })
    === '206-2 - Sociedade Empresária Limitada', 'descrição que já traz o código não é duplicada');

  // Forma do defeito no fonte: a natureza copiada direto do campo de descricao.
  const fonte = fs.readFileSync(path.join(RAIZ, 'lib/companyLookup.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const copiaDaDescricao = (s) => /natureza_juridica:\s*data\.natureza_juridica\b/.test(s);
  const padraoInventado = (s) => /natureza_juridica:\s*[^,\n]*\|\|\s*'[^']+'/.test(s);
  if (!copiaDaDescricao("natureza_juridica: data.natureza_juridica || '',")) inconclusivo('o detector da cópia da descrição não acusa o trecho original');
  if (!padraoInventado("natureza_juridica: mock.natureza_juridica || 'Sociedade Empresária',")) inconclusivo('o detector da natureza padrão não acusa o trecho original');
  check(!copiaDaDescricao(fonte) && /natureza_juridica:\s*naturezaJuridicaDaReceita\(data\)/.test(fonte),
    'a consulta grava a natureza por naturezaJuridicaDaReceita, não a descrição crua');
  check(!padraoInventado(fonte), 'nenhuma natureza jurídica padrão quando o registro não traz a sua');
}

console.log('\n--- <ideEmpregador> no XML ---');
{
  const vazia = inscricaoDoEmpregador({ document_type: 'CNPJ', document_number: CNPJ });
  const x = xmlDoIdeEmpregador(vazia);
  check(x.startsWith(`<ideEmpregador><tpInsc>1</tpInsc><nrInsc>${RAIZ_8}</nrInsc><!--`) && x.endsWith('</ideEmpregador>'),
    'natureza vazia: o XML leva a raiz e o aviso em comentário ao lado');
  const comentario = (x.match(/<!--([\s\S]*?)-->/) || [])[1] || '';
  check(comentario !== '' && !comentario.includes('--'), 'o comentário não tem "--" (o XML continuaria bem formado)');
  const comCodigo = xmlDoIdeEmpregador(inscricaoDoEmpregador({ document_type: 'CNPJ', document_number: CNPJ, natureza_juridica: '206-2' }), '    ');
  check(comCodigo === `    <ideEmpregador>\n      <tpInsc>1</tpInsc>\n      <nrInsc>${RAIZ_8}</nrInsc>\n    </ideEmpregador>`,
    'natureza com código: o grupo sai limpo, sem comentário');
  const semDoc = xmlDoIdeEmpregador(inscricaoDoEmpregador({ document_type: 'CAEPF', document_number: '1' }));
  check(/<nrInsc><\/nrInsc><!--[^>]*CAEPF/.test(semDoc), 'sem inscrição válida: nrInsc vazio e o motivo ao lado, nunca um número de outro cadastro');
}

// ===========================================================================
// 2. infoAmb do S-2240: inscricao do estabelecimento, nao a raiz
// ===========================================================================
console.log('\n--- S-2240 {infoAmb/tpInsc} e {infoAmb/nrInsc} ---');
{
  const amb = inscricaoDoAmbiente({ document_type: 'CNPJ', document_number: CNPJ });
  check(amb.ok && amb.tpInsc === '1' && amb.nrInsc === CNPJ_14,
    `ambiente no CNPJ do empregador: 14 posições (${amb.ok ? amb.nrInsc : amb.motivo}), não a raiz do ideEmpregador`);
  const caepf = inscricaoDoAmbiente({ document_type: 'CPF', document_number: CPF, caepf: '123.456.789/012-34' });
  check(caepf.ok && caepf.tpInsc === '3' && caepf.nrInsc === '12345678901234', 'pessoa física com CAEPF: tpInsc 3');
  const cno = inscricaoDoAmbiente({ document_type: 'CNPJ', document_number: CNPJ, cno: '12.345.67890/12' });
  check(cno.ok && cno.tpInsc === '4' && cno.nrInsc === '123456789012', 'obra com CNO: tpInsc 4');
  const soCpf = inscricaoDoAmbiente({ document_type: 'CPF', document_number: CPF });
  check(!soCpf.ok, 'pessoa física sem CAEPF nem CNO: o campo não aceita CPF, fica a pendência');
  check(xmlDaInscricaoDoAmbiente(amb, '        ') === `        <tpInsc>1</tpInsc>\n        <nrInsc>${CNPJ_14}</nrInsc>`,
    'o XML do ambiente leva tpInsc e nrInsc na ordem do leiaute');
}

// ===========================================================================
// 3. Namespace e Id
// ===========================================================================
console.log('\n--- namespace do esquema S-1.3 ---');
{
  // targetNamespace dos XSD oficiais, copiado do arquivo.
  const XSD = {
    'S-2210': 'http://www.esocial.gov.br/schema/evt/evtCAT/v_S_01_03_00',
    'S-2220': 'http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_03_00',
    'S-2230': 'http://www.esocial.gov.br/schema/evt/evtAfastTemp/v_S_01_03_00',
    'S-2240': 'http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_03_00',
    'S-3000': 'http://www.esocial.gov.br/schema/evt/evtExclusao/v_S_01_03_00',
  };
  check(VERSAO_DO_ESQUEMA_ESOCIAL === 'v_S_01_03_00', `versão do esquema: ${VERSAO_DO_ESQUEMA_ESOCIAL}`);
  for (const [tipo, ns] of Object.entries(XSD)) {
    check(namespaceDoEvento(tipo) === ns, `${tipo}: ${namespaceDoEvento(tipo)}`);
  }
}

console.log('\n--- Id do evento (REGRA_VALIDA_ID_EVENTO) ---');
const PADRAO_ID = /^ID\d{1}[A-Z0-9]{12}\d{21}$/; // tipos.xsd, TS_Id
{
  const quando = new Date(2026, 9, 4, 8, 5, 9);
  const raiz = idDoEventoESocial('1', RAIZ_8, quando, 1);
  check(raiz === 'ID1' + RAIZ_8 + '000000' + '20261004080509' + '00001' && raiz.length === 36 && PADRAO_ID.test(raiz),
    `com a raiz: 8 posições e zeros à direita até 14 (${raiz})`);
  const completo = idDoEventoESocial('1', CNPJ_14, quando, 7);
  check(completo === 'ID1' + CNPJ_14 + '20261004080509' + '00007' && PADRAO_ID.test(completo), 'na exceção: os 14 dígitos, sequencial com zeros à esquerda');
  const alfa = idDoEventoESocial('1', '12ABC345', quando, 1);
  check(alfa === 'ID1' + '12ABC345' + '000000' + '20261004080509' + '00001' && PADRAO_ID.test(alfa),
    'raiz alfanumérica: as letras ficam (o XSD admite letra nas 12 primeiras posições)');
  const pf = idDoEventoESocial('2', '52998224725', quando, 1);
  check(pf === 'ID2' + '52998224725' + '000' + '20261004080509' + '00001' && PADRAO_ID.test(pf), 'CPF: 11 dígitos e zeros à direita');

  // O Id e o <ideEmpregador> tem de usar o mesmo numero.
  const insc = inscricaoDoEmpregador({ document_type: 'CNPJ', document_number: CNPJ });
  const id = idDoEventoESocial(insc.tpInsc, insc.nrInsc, quando, 1);
  check(id.slice(2, 17) === '1' + insc.nrInsc.padEnd(14, '0'), 'o Id é montado com o mesmo nrInsc do <ideEmpregador>');
}

// ===========================================================================
// 4. O contexto: o montador de verdade, executado, e a forma do fonte
// ===========================================================================
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const ctxCru = fs.readFileSync(path.join(RAIZ, 'context/PrevSafeContext.tsx'), 'utf8');
const ctx = semComentarios(ctxCru);

console.log('\n--- XML gerado pelo contexto, para os cinco eventos ---');
{
  let fns;
  try {
    const pegar = (re, nome) => {
      const x = ctxCru.match(re);
      if (!x) throw new Error(`${nome} não encontrado no contexto`);
      return x[1] ?? x[0];
    };
    const fonte = [
      pegar(/^const textoXml = [\s\S]*?;\s*$/m, 'textoXml'),
      pegar(/^const UFS_DO_CRM = new Set\(\[[\s\S]*?\]\);$/m, 'UFS_DO_CRM'),
      `const novoIdDoEvento = ${pegar(/const novoIdDoEvento = useCallback\(([\s\S]*?), \[\]\);/, 'novoIdDoEvento')};`,
      `const campoDoEvento = ${pegar(/const campoDoEvento = useCallback\(([\s\S]*?), \[\]\);/, 'campoDoEvento')};`,
      // A montagem unica dos cinco eventos; a pre-visualizacao so le o XML dela.
      `const montarEventoESocial = ${pegar(/const montarEventoESocial = useCallback\(([\s\S]*?\n  \}), \[/, 'montarEventoESocial')};`,
      'const generateESocialXmlPreview = (e) => montarEventoESocial(e).xml;',
    ].join('\n');
    // Resolucao normal de modulo: no worktree o node_modules fica num diretorio acima.
    const ts = require_('typescript');
    const js = ts.transpileModule(fonte, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
    const injetados = {
      clients: [
        { id: 'cli-sem-natureza', document_type: 'CNPJ', document_number: CNPJ, natureza_juridica: '' },
        { id: 'cli-federal', document_type: 'CNPJ', document_number: CNPJ, natureza_juridica: '101-5' },
        { id: 'cli-caepf', document_type: 'CAEPF', document_number: '123.456.789/012-34' },
      ],
      // CNPJ da organizacao (a consultoria). Nao pode aparecer como empregador.
      // Tem digito verificador valido: um CNPJ invalido seria recusado pela
      // regra e esconderia o defeito de usa-lo no lugar do cliente.
      organization: { document_number: '99.888.777/0001-00' },
      sequenciaDoId: { current: { segundo: 0, usados: {} } },
      responsaveisPeloRegistroAmbiental: () => [], blocoRespMonitXml: () => '', workAbsences: [],
      xmlDosExamesDoS2220: () => '', tpExameOcupDoAso: () => '', resAsoDoAso: () => '',
      dataDeHoje: () => '2026-10-04',
      ...lib,
      ...eventos,
    };
    const nomes = Object.keys(injetados);
    fns = new Function(...nomes, `${js}\nreturn { generateESocialXmlPreview };`)(...nomes.map((n) => injetados[n]));
  } catch (e) {
    check(false, `não foi possível executar o montador do contexto: ${e.message}`);
  }

  if (fns) {
    const evento = (tipo, cliente) => ({
      id: 'evt-t', organization_id: 'org', client_id: cliente, event_type: tipo, event_number: 'T', status: 'DRAFT',
      environment: 'PRODUCAO', is_rectification: false, worker_name: 'Maria Souza', worker_cpf: CPF,
      worker_registration: 'MAT-7781', worker_cbo: '7823-05', worker_role: '',
      ambient_data: { start_date: '2026-01-05', work_environment: 'Planta 1', description_activities: 'x', ambient_risks: [] },
      aso_data: { aso_type: 'PERIODICO', exam_date: '2026-03-02', exams_list: [] },
      cat_data: {}, absence_data: {}, exclusion_data: {},
      created_at: '', updated_at: '',
    });
    const ELEMENTO = { 'S-2210': 'evtCAT', 'S-2220': 'evtMonit', 'S-2230': 'evtAfastTemp', 'S-2240': 'evtExpRisco', 'S-3000': 'evtExclusao' };
    for (const [tipo, elemento] of Object.entries(ELEMENTO)) {
      const xml = fns.generateESocialXmlPreview(evento(tipo, 'cli-sem-natureza'));
      const ns = (xml.match(/<eSocial xmlns="([^"]*)">/) || [])[1];
      check(ns === `http://www.esocial.gov.br/schema/evt/${elemento}/v_S_01_03_00`, `${tipo}: <eSocial xmlns> é o do XSD S-1.3 (${ns})`);
      const id = (xml.match(new RegExp(`<${elemento} Id="([^"]*)">`)) || [])[1] || '';
      check(id.startsWith('ID1' + RAIZ_8 + '000000') && PADRAO_ID.test(id) && !new RegExp(`<${elemento} id=`).test(xml),
        `${tipo}: atributo Id (maiúsculo, como no XSD) com a raiz e zeros à direita (${id})`);
      const ide = (xml.match(/<ideEmpregador>[\s\S]*?<\/ideEmpregador>/) || [''])[0];
      check(new RegExp(`<nrInsc>${RAIZ_8}</nrInsc>`).test(ide) && !ide.includes(CNPJ_14) && /<!--[^>]*natureza/i.test(ide),
        `${tipo}: <ideEmpregador> com a raiz e o aviso de natureza não informada`);
      check(!xml.includes('99888777'), `${tipo}: o CNPJ da organização não aparece como empregador`);
    }

    const federal = fns.generateESocialXmlPreview(evento('S-2220', 'cli-federal'));
    check(/<ideEmpregador>\s*<tpInsc>1<\/tpInsc>\s*<nrInsc>11222333000181<\/nrInsc>\s*<\/ideEmpregador>/.test(federal),
      'natureza 101-5: <ideEmpregador> com os 14 dígitos e sem aviso');
    check(new RegExp('<evtMonit Id="ID1' + CNPJ_14 + '\\d{19}">').test(federal), 'natureza 101-5: o Id leva os 14 dígitos');

    const s2240 = fns.generateESocialXmlPreview(evento('S-2240', 'cli-sem-natureza'));
    const infoAmb = (s2240.match(/<infoAmb>[\s\S]*?<\/infoAmb>/) || [''])[0];
    check(/<dscSetor>[^<]*<\/dscSetor>\s*<tpInsc>1<\/tpInsc>\s*<nrInsc>11222333000181<\/nrInsc>\s*<\/infoAmb>/.test(infoAmb),
      'S-2240: o [infoAmb] leva tpInsc e o CNPJ completo do estabelecimento depois de dscSetor');
    check(!/<ideEstab>/.test(s2240), 'S-2240: não há grupo <ideEstab> (o leiaute S-1.3 põe a inscrição no [infoAmb])');

    const caepf = fns.generateESocialXmlPreview(evento('S-2220', 'cli-caepf'));
    check(/<nrInsc><\/nrInsc><!--[^>]*CAEPF/.test(caepf) && /<evtMonit Id="">/.test(caepf),
      'cliente só com CAEPF: empregador e Id vazios, com o motivo, nunca o CAEPF como CNPJ');
    const semCliente = fns.generateESocialXmlPreview(evento('S-2220', 'cli-que-nao-existe'));
    check(!semCliente.includes('99888777') && /<nrInsc><\/nrInsc><!--/.test(semCliente),
      'cliente inexistente: o empregador não vira a organização (antes caía no CNPJ dela)');
  }
}

console.log('\n--- forma do fonte: uma regra só ---');
{
  // Detectores. Cada um e conferido contra o trecho original antes de valer.
  const detector = {
    namespaceAMao: (s) => /schema\/evt\/\w+\/v_S_\d/.test(s),
    ideEmpregadorAMao: (s) => /<ideEmpregador>/.test(s),
    idMinusculo: (s) => /<evt\w+ id="/.test(s),
    organizacaoComoEmpregador: (s) => /organization\.document_number/.test(s),
    nrInscEmpregadorProprio: (s) => /\.padEnd\(14,\s*'0'\)|\bnrInscEmpregador\b/.test(s),
  };
  const ORIGINAL = {
    namespaceAMao: '<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_02_00">',
    ideEmpregadorAMao: '<ideEmpregador><tpInsc>${empregador.tpInsc}</tpInsc><nrInsc>${empregador.nrInsc}</nrInsc></ideEmpregador>',
    idMinusculo: '<evtCAT id="${novoIdDoEvento(empregador.tpInsc, empregador.nrInsc)}">',
    organizacaoComoEmpregador: "const employerRaw = (client?.document_number || organization.document_number).replace(/\\D/g, '');",
    nrInscEmpregadorProprio: ": employerRaw.slice(0, 14).padEnd(14, '0');",
  };
  for (const [nome, trecho] of Object.entries(ORIGINAL)) {
    if (!detector[nome](trecho)) inconclusivo(`o detector "${nome}" não acusa o trecho defeituoso original`);
  }

  // Os montadores do S-2210, S-2230, S-2240 e S-3000 moram em
  // lib/esocialEventos.ts; o do S-2220 continua no contexto. A forma vale nos dois.
  const eventosFonte = semComentarios(fs.readFileSync(path.join(RAIZ, 'lib/esocialEventos.ts'), 'utf8'));
  const montadores = ctx + '\n' + eventosFonte;
  check(!detector.namespaceAMao(montadores), 'nenhum namespace com versão escrito à mão no contexto nem em lib/esocialEventos.ts');
  const xmlns = [...montadores.matchAll(/<eSocial xmlns="([^"]*)"/g)].map((m) => m[1]);
  check(xmlns.length === 2 && xmlns.every((v) => /^\$\{namespaceDoEvento\([^)]*\)\}$/.test(v)),
    `todo <eSocial xmlns> chama namespaceDoEvento: o do S-2220 e o envelope dos outros quatro (${xmlns.length})`);
  check(!detector.ideEmpregadorAMao(montadores), 'nenhum <ideEmpregador> escrito à mão (vem de xmlDoIdeEmpregador)');
  check((ctx.match(/xmlDoIdeEmpregador\(empregador, '    '\)/g) || []).length === 1
    && (eventosFonte.match(/xmlDoEmpregador\(e\.cabecalho, m\)/g) || []).length === 4
    && /return xmlDoIdeEmpregador\(cab\.empregador, '    '\)/.test(eventosFonte),
  'os cinco eventos usam xmlDoIdeEmpregador: o S-2220 no contexto, os outros quatro pelo mesmo ajudante');
  check(!detector.idMinusculo(montadores), 'nenhum <evt... id=> minúsculo: o XSD declara o atributo "Id"');
  const idsCtx = [...ctx.matchAll(/<evt\w+ Id="([^"]*)"/g)].map((m) => m[1]);
  const idsLib = [...eventosFonte.matchAll(/<\$\{elemento\} Id="([^"]*)"/g)].map((m) => m[1]);
  check(idsCtx.length === 1 && idsCtx[0] === '${idEvt}' && idsLib.length === 1 && idsLib[0] === '${id}'
    && /novoIdDoEvento\(empregador\.tpInsc, empregador\.nrInsc\)/.test(ctx) && /id: idEvt,/.test(ctx),
  `todo Id vem de novoIdDoEvento com o nrInsc do empregador (contexto ${idsCtx.length}, envelope ${idsLib.length})`);
  check(!detector.organizacaoComoEmpregador(ctx), 'o CNPJ da organização não é usado como empregador');
  check(!detector.nrInscEmpregadorProprio(ctx), 'o contexto não monta nrInsc por conta própria (padEnd / nrInscEmpregador)');
  check(!/function idDoEventoESocial\(/.test(ctx), 'a regra do Id não tem cópia no contexto');

  const view = semComentarios(fs.readFileSync(path.join(RAIZ, 'components/esocial/ESocialEventsView.tsx'), 'utf8'));
  check(!/schema\/evt\/\{/.test(view) && /namespaceDoEvento\(xmlModalEvent\.event_type\)/.test(view),
    'a tela mostra o namespace real do evento, não "schema/evt/S-2220"');
  check(/inscricaoDoEmpregador\(/.test(view) && /aviso/.test(view), 'a tela do XML mostra o aviso da identificação do empregador');
}

console.log(falhas === 0 ? `\nTODOS OS TESTES PASSARAM (${casos} casos)` : `\n${falhas} FALHA(S) em ${casos} casos`);
process.exitCode = falhas === 0 ? 0 : 1;
