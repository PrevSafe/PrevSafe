/**
 * Estrutura dos eventos de SST do eSocial (S-2210, S-2220, S-2230, S-2240 e
 * S-3000) contra o leiaute S-1.3 e os XSD oficiais.
 *
 *   node scripts/verificar-esocial-eventos.mjs
 *
 * O QUE ESTA SENDO PROVADO
 *
 * 1. Cada evento sai com os grupos, a ordem, a ocorrencia e as condicoes do
 *    leiaute: <ideEvento> completo, <ideVinculo> (nao <ideTrabalhador>),
 *    <agNoc>/<codAgNoc> (nao <fatRisco>/<codFatRis>), <dtIniCondicao>,
 *    [infoAtiv]/<dscAtivDes> fora do [infoAmb], o S-2230 sem o grupo
 *    [infoAtestado] que o S-1.3 nao tem, o S-2210 com {indCatObito} e
 *    {diagProvavel} como texto.
 * 2. Nada vai ao XML sem vir do cadastro: com o cadastro vazio, os campos do
 *    evento saem vazios, com o motivo, e viram pendencia. Os valores que a
 *    pre-visualizacao inventava (inicio 2026-08-15, CID M54.5, "Dr.
 *    Ortopedista", CRM 77890, tpEvento S-2240, recibo
 *    1.2.202600.0000000000000000000-00) nao aparecem.
 * 3. Os XML gerados com dados de teste completos sao VALIDOS contra os XSD
 *    oficiais dos dois pacotes v_S_01_03_00 (2026-07-01 e 2026-10-26). Os XML
 *    no formato antigo, como os montadores os escreviam, sao INVALIDOS - prova
 *    de que a validacao nao e de enfeite.
 * 4. Os montadores de uma linha (CAT, afastamento) e o do S-2240 por GHE nao
 *    tem mais XML proprio: passam pela montagem unica e pela validacao.
 *
 * VALIDACAO CONTRA O XSD
 *
 * Feita pelo validador do .NET (System.Xml.Schema.XmlSchemaSet), chamado pelo
 * Windows PowerShell (ou pelo pwsh). Nao ha xmllint nem lxml nesta maquina, e
 * nenhum pacote e instalado. Sem PowerShell, os casos de XSD ficam
 * INCONCLUSIVOS e a saida e 2 (se nada mais falhou).
 *
 * O XSD exige <ds:Signature> depois do evento. O PrevSafe nao assina: para
 * validar o CONTEUDO do evento, o teste poe no lugar do comentario "ds:Signature
 * ausente" uma assinatura de estrutura valida e valores nulos. Ela so existe
 * aqui, no arquivo temporario do teste.
 *
 * FONTES: os XSD estao em normas/esocial-xsd/v_S_01_03_00/<pacote>/, copia
 * dos arquivos dos pacotes 2026-07-01_esquemas_xsd_v_s_01_03_00.zip e
 * 2026-10-26_esquemas_xsd_v_s_01_03_00-1.zip (gov.br/esocial). O SHA-256 de
 * cada um (fim de linha LF) e conferido antes: XSD alterado invalida o teste.
 * O leiaute e o S-1.3 cons. ate a NT 07/2026 rev. (ver lib/esocialEmpregador.ts).
 *
 * COMO O TESTE PROCURA O DEFEITO NO FONTE: pela forma que ele teria no codigo,
 * sobre o fonte sem comentarios. Cada detector e conferido antes contra o
 * trecho defeituoso original; se nao o acusar, o resultado e INCONCLUSIVO.
 *
 * Saida: 0 tudo passou, 1 houve falha, 2 INCONCLUSIVO.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..'
);
const TMP = path.join(RAIZ, '.tmp-esocial-eventos-verificacao');

function inconclusivo(motivo, detalhe) {
  console.log('\nINCONCLUSIVO — a verificação não pôde ser executada.');
  console.log(`motivo: ${motivo}`);
  if (detalhe) console.log(String(detalhe).split('\n').slice(0, 20).join('\n'));
  process.exit(2);
}

let falhas = 0;
let casos = 0;
let inconclusivos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

// ===========================================================================
// Compilacao dos montadores
// ===========================================================================
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
const TSCONFIG = path.join(TMP, 'tsconfig.verificacao.json');
fs.writeFileSync(TSCONFIG, JSON.stringify({
  compilerOptions: {
    outDir: TMP, module: 'commonjs', target: 'es2020', moduleResolution: 'node', skipLibCheck: true,
    baseUrl: RAIZ, paths: { '@/*': ['./*'] },
  },
  files: [
    path.join(RAIZ, 'lib/esocialEventos.ts'),
    path.join(RAIZ, 'lib/esocialEmpregador.ts'),
    path.join(RAIZ, 'lib/esocialDados.ts'),
    path.join(RAIZ, 'lib/validacoesBr.ts'),
  ],
}));
try {
  execFileSync('npx', ['tsc', '-p', TSCONFIG], { stdio: 'pipe', shell: true, cwd: RAIZ });
} catch (e) {
  inconclusivo('npx tsc falhou ao compilar lib/esocialEventos.ts', e.stdout?.toString() || e.message);
}
const SAIDA = path.join(TMP, 'lib');
for (const arquivo of fs.readdirSync(SAIDA).filter((f) => f.endsWith('.js'))) {
  const alvo = path.join(SAIDA, arquivo);
  fs.writeFileSync(alvo, fs.readFileSync(alvo, 'utf8').replace(/require\("@\/lib\/([^"]+)"\)/g, 'require("./$1")'));
}
fs.writeFileSync(path.join(TMP, 'package.json'), JSON.stringify({ type: 'commonjs' }));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

const require_ = createRequire(import.meta.url);
let ev;
let emp;
let dados;
let br;
try {
  ev = require_(path.join(SAIDA, 'esocialEventos.js'));
  emp = require_(path.join(SAIDA, 'esocialEmpregador.js'));
  dados = require_(path.join(SAIDA, 'esocialDados.js'));
  br = require_(path.join(SAIDA, 'validacoesBr.js'));
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', e.message);
}
for (const nome of ['montarXmlDoS2240', 'montarXmlDoS2210', 'montarXmlDoS2230', 'montarXmlDoS3000', 'dadosDoS2210DaCat', 'dadosDoS2230DoAfastamento', 'codigoDaUnidadeDeMedida']) {
  if (typeof ev[nome] !== 'function') inconclusivo(`lib/esocialEventos.ts não exporta ${nome}`);
}

// ===========================================================================
// Leitura do XML gerado: arvore simples (o XML e nosso, sem CDATA)
// ===========================================================================
function arvore(xml) {
  const corpo = xml.replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/g, '');
  const raiz = { nome: '#doc', filhos: [], texto: '' };
  const pilha = [raiz];
  const re = /<(\/?)([A-Za-z_][\w:.-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(corpo))) {
    if (m[5] !== undefined) { pilha[pilha.length - 1].texto += m[5]; continue; }
    if (m[1]) {
      const fechado = pilha.pop();
      if (!fechado || fechado.nome !== m[2]) throw new Error(`</${m[2]}> fecha <${fechado && fechado.nome}>`);
      continue;
    }
    const no = { nome: m[2], attrs: m[3], filhos: [], texto: '' };
    pilha[pilha.length - 1].filhos.push(no);
    if (!m[4]) pilha.push(no);
  }
  if (pilha.length !== 1) throw new Error('tag sem fechamento');
  return raiz;
}
/** Primeiro descendente pelo caminho de nomes. */
const no = (r, ...caminho) => caminho.reduce((a, n) => (a ? a.filhos.find((f) => f.nome === n) : undefined), r);
const todos = (r, nome) => (r ? r.filhos.filter((f) => f.nome === nome) : []);
const ordem = (r) => (r ? r.filhos.map((f) => f.nome).join(',') : '(ausente)');
const texto = (r) => (r ? r.texto.trim() : undefined);
/** Folhas (elementos sem filhos) de uma subarvore, com o texto. */
const folhas = (r) => (!r ? [] : r.filhos.length === 0 ? [[r.nome, r.texto.trim()]] : r.filhos.flatMap(folhas));

// ===========================================================================
// Validacao contra o XSD (.NET System.Xml.Schema, via PowerShell)
// ===========================================================================
const XSD_DIR = path.join(RAIZ, 'normas', 'esocial-xsd', 'v_S_01_03_00');
const PACOTES = ['2026-07-01', '2026-10-26'];
// SHA-256 do arquivo com fim de linha LF, conferido contra os pacotes oficiais.
const SHA_XSD = {
  '2026-07-01/evtAfastTemp.xsd': '53eb052b18f1b833d7fe80648492662e8b29272c2522c9385e4242e274492132',
  '2026-07-01/evtCAT.xsd': '0b26ba35c329376baf54d9f02d088938b87ef9b528b118cd236666d68eb2747f',
  '2026-07-01/evtExclusao.xsd': '5c4aa5584edaa5f99880dd4d18f51aac180af0b8d0154fddbdce46880e5ec29b',
  '2026-07-01/evtExpRisco.xsd': '26a0d84346ef33d08a060a56974ed234a6ac81ddfcb321a18953657a5a2b1d80',
  '2026-07-01/evtMonit.xsd': '082f6590a2101492a884c522f6487b02d06e4cb2f230d8bad69dc5320b924ddd',
  '2026-07-01/tipos.xsd': 'fdd6ec51a7e96ab050e3b2e3c5aab8747fcabc4d97283d940d28f83674e8cc27',
  '2026-07-01/xmldsig-core-schema.xsd': '06a355a426e0f81db82d61d3dc071f59cac9a91425e404e0d06f5242d97a04fb',
  '2026-10-26/evtAfastTemp.xsd': '8c2138e5f218c21f4e23aa441e04df75bef98cfa8e4e24d877c7aa19b372654e',
  '2026-10-26/evtCAT.xsd': '0b26ba35c329376baf54d9f02d088938b87ef9b528b118cd236666d68eb2747f',
  '2026-10-26/evtExclusao.xsd': '5c4aa5584edaa5f99880dd4d18f51aac180af0b8d0154fddbdce46880e5ec29b',
  '2026-10-26/evtExpRisco.xsd': '26a0d84346ef33d08a060a56974ed234a6ac81ddfcb321a18953657a5a2b1d80',
  '2026-10-26/evtMonit.xsd': '082f6590a2101492a884c522f6487b02d06e4cb2f230d8bad69dc5320b924ddd',
  '2026-10-26/tipos.xsd': '3e956e137bde7aa0c142b7dd0f7d7a1332c8833d219acdc84ba187a5d1d7afc0',
  '2026-10-26/xmldsig-core-schema.xsd': '06a355a426e0f81db82d61d3dc071f59cac9a91425e404e0d06f5242d97a04fb',
};

// Script do validador. So ASCII: o Windows PowerShell le .ps1 sem BOM como ANSI.
const VALIDADOR_PS1 = [
  'param([string]$Lista, [string]$Saida)',
  "$ErrorActionPreference = 'Stop'",
  '$itens = Get-Content -Raw -Encoding UTF8 $Lista | ConvertFrom-Json',
  '$res = @()',
  'foreach ($it in $itens) {',
  '  $erros = New-Object System.Collections.ArrayList',
  '  try {',
  '    $set = New-Object System.Xml.Schema.XmlSchemaSet',
  '    $set.XmlResolver = New-Object System.Xml.XmlUrlResolver',
  '    [void]$set.Add([NullString]::Value, $it.xsd)',
  '    $set.Compile()',
  '    $cfg = New-Object System.Xml.XmlReaderSettings',
  '    $cfg.ValidationType = [System.Xml.ValidationType]::Schema',
  '    $cfg.Schemas = $set',
  '    $cfg.DtdProcessing = [System.Xml.DtdProcessing]::Prohibit',
  '    $cfg.ValidationFlags = $cfg.ValidationFlags -bor [System.Xml.Schema.XmlSchemaValidationFlags]::ReportValidationWarnings',
  "    $h = [System.Xml.Schema.ValidationEventHandler]{ param($s, $e) [void]$erros.Add(('{0}:{1} {2}' -f $e.Exception.LineNumber, $e.Exception.LinePosition, $e.Message)) }",
  '    $cfg.add_ValidationEventHandler($h)',
  '    $r = [System.Xml.XmlReader]::Create($it.xml, $cfg)',
  '    while ($r.Read()) { }',
  '    $r.Close()',
  '  } catch {',
  "    [void]$erros.Add('EXCECAO ' + $_.Exception.Message)",
  '  }',
  '  $res += [pscustomobject]@{ id = $it.id; erros = @($erros) }',
  '}',
  '$json = ConvertTo-Json -InputObject @($res) -Depth 4 -Compress',
  '[System.IO.File]::WriteAllText($Saida, $json, (New-Object System.Text.UTF8Encoding($false)))',
].join('\r\n');

/** Assinatura so de estrutura, para o XSD olhar o conteudo do evento. */
const ASSINATURA_DE_TESTE = '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo>'
  + '<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>'
  + '<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>'
  + '<Reference URI=""><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><DigestValue>AAAA</DigestValue></Reference>'
  + '</SignedInfo><SignatureValue>AAAA</SignatureValue></Signature>';
const comAssinaturaDeTeste = (xml) => (xml.includes(ev.COMENTARIO_SEM_ASSINATURA)
  ? xml.replace(ev.COMENTARIO_SEM_ASSINATURA, ASSINATURA_DE_TESTE)
  : xml.replace('</eSocial>', `${ASSINATURA_DE_TESTE}</eSocial>`));

const XSD_DO_EVENTO = { 'S-2210': 'evtCAT.xsd', 'S-2220': 'evtMonit.xsd', 'S-2230': 'evtAfastTemp.xsd', 'S-2240': 'evtExpRisco.xsd', 'S-3000': 'evtExclusao.xsd' };
const fila = []; // { id, rotulo, tipo, xml, esperaValido }

function validarNoXsd(rotulo, tipo, xml, esperaValido = true) {
  fila.push({ rotulo, tipo, xml, esperaValido });
}

function rodarXsd() {
  console.log('\n--- validação contra o XSD oficial (.NET System.Xml.Schema) ---');
  if (!fs.existsSync(XSD_DIR)) {
    inconclusivos++;
    console.log(`INCONCLUSIVO os XSD não estão em ${path.relative(RAIZ, XSD_DIR)}`);
    return;
  }
  for (const [rel, sha] of Object.entries(SHA_XSD)) {
    const arq = path.join(XSD_DIR, rel);
    const atual = fs.existsSync(arq)
      ? crypto.createHash('sha256').update(fs.readFileSync(arq, 'utf8').replace(/\r\n/g, '\n'), 'utf8').digest('hex')
      : '(ausente)';
    if (atual !== sha) inconclusivo(`o XSD ${rel} não é o do pacote oficial (sha256 ${atual})`);
  }
  const dir = path.join(TMP, 'xsd');
  fs.mkdirSync(dir, { recursive: true });
  const lista = [];
  fila.forEach((c, i) => {
    const arqXml = path.join(dir, `evento-${i}.xml`);
    fs.writeFileSync(arqXml, comAssinaturaDeTeste(c.xml), 'utf8');
    for (const pacote of PACOTES) {
      lista.push({ id: `${i}|${pacote}`, xsd: path.join(XSD_DIR, pacote, XSD_DO_EVENTO[c.tipo]), xml: arqXml });
    }
  });
  const arqLista = path.join(dir, 'lista.json');
  const arqSaida = path.join(dir, 'resultado.json');
  const arqPs1 = path.join(dir, 'valida.ps1');
  fs.writeFileSync(arqLista, JSON.stringify(lista), 'utf8');
  fs.writeFileSync(arqPs1, VALIDADOR_PS1, 'ascii');
  let rodou = false;
  let ferramenta = '';
  for (const exe of ['powershell.exe', 'pwsh']) {
    const r = spawnSync(exe, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', arqPs1, '-Lista', arqLista, '-Saida', arqSaida], { encoding: 'utf8', timeout: 300000 });
    if (r.error) continue;
    if (r.status === 0 && fs.existsSync(arqSaida)) { rodou = true; ferramenta = exe; break; }
    console.log(`(${exe} saiu com ${r.status}: ${(r.stderr || r.stdout || '').split('\n').slice(0, 3).join(' ')})`);
  }
  if (!rodou) {
    inconclusivos++;
    console.log('INCONCLUSIVO não há PowerShell (com o .NET System.Xml.Schema) nesta máquina: os XML não foram validados contra o XSD');
    return;
  }
  console.log(`(validador: ${ferramenta}, ${lista.length} validações)`);
  const resultado = JSON.parse(fs.readFileSync(arqSaida, 'utf8').replace(/^﻿/, ''));
  const porId = new Map(resultado.map((r) => [r.id, r.erros || []]));
  // Controle negativo primeiro: se o XML antigo passar, o validador nao vale.
  for (const [i, c] of fila.entries()) {
    if (c.esperaValido) continue;
    for (const pacote of PACOTES) {
      const erros = porId.get(`${i}|${pacote}`) || [];
      if (erros.length === 0 || erros.some((e) => e.startsWith('EXCECAO'))) {
        inconclusivo(`o controle negativo "${c.rotulo}" não foi recusado pelo XSD ${pacote}: o validador não está conferindo`, erros.join('\n'));
      }
      check(true, `${c.rotulo}: recusado pelo XSD ${pacote} (${erros.length} erro(s), ex.: ${erros[0].slice(0, 110)})`);
    }
  }
  for (const [i, c] of fila.entries()) {
    if (!c.esperaValido) continue;
    for (const pacote of PACOTES) {
      const erros = porId.get(`${i}|${pacote}`) || ['sem resultado'];
      check(erros.length === 0, `${c.rotulo}: válido contra o XSD ${pacote}${erros.length ? ` — ${erros.slice(0, 3).join(' | ')}` : ''}`);
    }
  }
}

// ===========================================================================
// Dados de teste
// ===========================================================================
// CNPJ e CPFs sinteticos com digito verificador valido (exemplos de teste conhecidos).
const CNPJ = '11.222.333/0001-81';
const CNPJ_14 = '11222333000181';
const CPF = '529.982.247-25';
const CPF_RESP = '111.444.777-35';
const cliente = { document_type: 'CNPJ', document_number: CNPJ, natureza_juridica: '206-2 - Sociedade Empresária Limitada' };
const empregador = emp.inscricaoDoEmpregador(cliente);
const ID = emp.idDoEventoESocial('1', empregador.nrInsc, new Date(2026, 9, 5, 8, 0, 0), 1);
const cab = (extra = {}) => ({ id: ID, empregador, retificacao: false, ambiente: 'PRODUCAO_RESTRITA', ...extra });
const trab = { cpf: CPF, matricula: 'MAT-7781' };
const ambiente = emp.inscricaoDoAmbiente(cliente);
const responsavel = { nome: 'Eng. de Teste', cpf: CPF_RESP, ideOC: '4', nrOC: '201812345', ufOC: 'BA' };

const fator = (x) => ({ id: 'f', category: 'FÍSICO', epc_implemented: false, epc_effective: false, epi_used: false, epi_effective: false, ...x });
const RUIDO = fator({ risk_code_table_24: '02.01.001', description: 'Ruído', evaluation_type: 'QUANTITATIVA', intensity_concentration: '91.4 dB(A)', measurement_unit: 'dB(A)', technique_used: 'NHO-01 Fundacentro', epc_implemented: true });
const SILICA = fator({ risk_code_table_24: '01.18.001', category: 'QUÍMICO', description: 'Sílica livre', agent_description: 'Sílica livre cristalizada (quartzo)', evaluation_type: 'QUANTITATIVA', intensity_concentration: '0,05', measurement_unit: 'mg/m³', limit_tolerance: '0.1 mg/m³', technique_used: 'NHO-08 Fundacentro' });
const BIOLOGICO = fator({ risk_code_table_24: '03.01.001', category: 'BIOLÓGICO', description: 'Contato com pacientes', evaluation_type: 'QUALITATIVA' });
const AUSENCIA = fator({ risk_code_table_24: '09.01.001', category: 'AUSÊNCIA_RISCO', description: 'Ausência de agente nocivo' });
const ambiental = (riscos, extra = {}) => ({
  start_date: '2026-09-01', description_activities: 'Operar prensa hidráulica e abastecer a linha de corte.',
  work_environment: 'Estamparia', ambient_risks: riscos,
  responsible_technician_name: '', responsible_technician_cpf: '', responsible_technician_crea_crm: '', responsible_technician_uf: '',
  ...extra,
});
const s2240 = (riscos, extra = {}, responsaveis = [responsavel]) =>
  ev.montarXmlDoS2240({ cabecalho: cab(), trabalhador: trab, dados: ambiental(riscos, extra), ambiente, responsaveis });

// S-2210 com todos os campos: os codigos das Tabelas 13, 14, 15 e 17 sao so de
// formato (9 algarismos), para o XSD; nao representam acidente nenhum.
const CAT_COMPLETA = {
  dtAcid: '2026-09-10', tpAcid: '1', hrAcid: '09:30', hrsTrabAntesAcid: '0230', tpCat: '1', indCatObito: 'N',
  indComunPolicia: 'N', codSitGeradora: '200004300', iniciatCAT: '1', ultDiaTrab: '2026-09-10', houveAfast: 'S',
  local: { tpLocal: '1', dscLocal: 'Estamparia', dscLograd: 'Rua das Indústrias', nrLograd: '100', cep: '40000-000', codMunic: '2927408', uf: 'BA', ideLocalAcid: { tpInsc: '1', nrInsc: CNPJ_14 } },
  codParteAting: '753030000', lateralidade: '2', codAgntCausador: '302010300',
  atestado: { dtAtendimento: '2026-09-10', hrAtendimento: '1015', indInternacao: 'N', durTrat: '10', indAfast: 'S', dscLesao: '702000000', diagProvavel: 'Ferimento corto-contuso', codCID: 'S61.0', nmEmit: 'Ana Souza', ideOC: '1', nrOC: '12345', ufOC: 'BA' },
};
const s2210 = (cat) => ev.montarXmlDoS2210({ cabecalho: cab(), trabalhador: trab, cat });

const s2230 = (afastamento, extra = {}) => ev.montarXmlDoS2230({ cabecalho: cab(), trabalhador: trab, afastamento, ...extra });
const s3000 = (exclusao, cpf = CPF) => ev.montarXmlDoS3000({ cabecalho: cab(), exclusao, cpfTrabalhador: cpf });

const raizDoEvento = (xml, elemento) => no(arvore(xml), 'eSocial', elemento);
const tem = (pend, campo) => pend.some((p) => p.includes(`{${campo}}`));

// ===========================================================================
// 1. S-2240
// ===========================================================================
console.log('--- S-2240: grupos, ordem e condições do leiaute ---');
{
  const m = s2240([RUIDO, SILICA, BIOLOGICO]);
  const r = raizDoEvento(m.xml, 'evtExpRisco');
  check(ordem(r) === 'ideEvento,ideEmpregador,ideVinculo,infoExpRisco',
    `evtExpRisco: ideEvento, ideEmpregador, ideVinculo, infoExpRisco (${ordem(r)}) — evtExpRisco.xsd:29-32`);
  check(ordem(no(r, 'ideEvento')) === 'indRetif,tpAmb,procEmi,verProc', `ideEvento completo, com indRetif (${ordem(no(r, 'ideEvento'))}) — tipos.xsd:121`);
  check(ordem(no(r, 'ideVinculo')) === 'cpfTrab,matricula' && !/<ideTrabalhador>/.test(m.xml),
    'o trabalhador vai em <ideVinculo> (T_ideVinculo_sst), não em <ideTrabalhador>');
  const info = no(r, 'infoExpRisco');
  check(ordem(info) === 'dtIniCondicao,infoAmb,infoAtiv,agNoc,agNoc,agNoc,respReg',
    `infoExpRisco: dtIniCondicao, infoAmb, infoAtiv, agNoc (1-999), respReg (${ordem(info)}) — evtExpRisco.xsd:41-494`);
  check(!/<dtIniCondic>|<fatRisco>|<codFatRis|<dscFatRis>/.test(m.xml),
    'sem <dtIniCondic>, <fatRisco>, <codFatRis> e <dscFatRis>, nomes que o leiaute S-1.3 não tem');
  check(ordem(no(info, 'infoAmb')) === 'localAmb,dscSetor,tpInsc,nrInsc' && texto(no(info, 'infoAmb', 'nrInsc')) === CNPJ_14,
    '[infoAmb]: localAmb, dscSetor, tpInsc, nrInsc (CNPJ completo do estabelecimento)');
  check(ordem(no(info, 'infoAtiv')) === 'dscAtivDes' && !no(info, 'infoAmb', 'dscAtiv'),
    'as atividades vão em [infoAtiv]/<dscAtivDes>, fora do [infoAmb] (o S-2240 por GHE punha <dscAtiv> no [infoAmb])');
  const [ruido, silica, bio] = todos(info, 'agNoc');
  check(ordem(ruido) === 'codAgNoc,tpAval,intConc,unMed,tecMedicao,epcEpi' && texto(no(ruido, 'intConc')) === '91.4' && texto(no(ruido, 'unMed')) === '4',
    `ruído medido: tpAval 1, intConc 91.4, unMed 4 = dB(A), tecMedicao, epcEpi (${ordem(ruido)})`);
  check(!no(ruido, 'dscAgNoc') && !no(ruido, 'limTol'), 'ruído (02.01.001): sem dscAgNoc (opcional) e sem limTol (só 01.18.001 e 02.01.014)');
  check(ordem(silica) === 'codAgNoc,dscAgNoc,tpAval,intConc,limTol,unMed,tecMedicao,epcEpi'
    && texto(no(silica, 'dscAgNoc')) === 'Sílica livre cristalizada (quartzo)' && texto(no(silica, 'intConc')) === '0.05'
    && texto(no(silica, 'limTol')) === '0.1' && texto(no(silica, 'unMed')) === '8',
  `sílica (01.18.001): dscAgNoc do inventário, limTol, vírgula vira ponto, mg/m³ = 8 (${ordem(silica)})`);
  check(ordem(bio) === 'codAgNoc,tpAval,epcEpi' && texto(no(bio, 'tpAval')) === '2',
    'agente qualitativo: tpAval 2 e nada de intConc/unMed/tecMedicao ("exclusivo se tpAval = [1]")');
  check(ordem(no(info, 'respReg')) === 'cpfResp,ideOC,nrOC,ufOC' && texto(no(info, 'respReg', 'ideOC')) === '4',
    '[respReg] com o conselho do responsável (CREA = 4), não ideOC fixo');
  check(m.pendencias.length === 0, `dados completos, sem EPI: nenhuma pendência (${m.pendencias.join(' | ')})`);
  validarNoXsd('S-2240 com ruído, sílica e agente biológico', 'S-2240', m.xml);

  const aus = s2240([AUSENCIA], {}, [{ nome: 'Eng.', cpf: CPF_RESP, ideOC: '', nrOC: '', ufOC: '' }]);
  const agAus = no(raizDoEvento(aus.xml, 'evtExpRisco'), 'infoExpRisco', 'agNoc');
  check(ordem(agAus) === 'codAgNoc' && aus.pendencias.length === 0,
    `09.01.001: só codAgNoc (sem dscAgNoc, tpAval, epcEpi) e o respReg dispensa ideOC/nrOC/ufOC (${ordem(agAus)})`);
  validarNoXsd('S-2240 com ausência de agente nocivo (09.01.001)', 'S-2240', aus.xml);

  check(tem(s2240([AUSENCIA, RUIDO]).pendencias, 'codAgNoc'), '09.01.001 junto de outro agente vira pendência');
  const epi = s2240([{ ...RUIDO, epi_used: true, epi_effective: true, epi_ca_numbers: ['CA 31552'] }]);
  check(tem(epi.pendencias, 'epiCompl') && /<docAval>CA 31552<\/docAval>/.test(epi.xml),
    'EPI utilizado: o CA vai em <docAval> e a falta do [epiCompl] (NR-06/NR-09) vira pendência');
  check(tem(s2240([{ ...RUIDO, measurement_unit: 'IBUTG °C', intensity_concentration: '28' }]).pendencias, 'unMed'),
    'unidade que não está entre as 30 do leiaute vira pendência (não é escolhida por aproximação)');
  const semTipo = s2240([{ ...RUIDO, evaluation_type: undefined, intensity_concentration: undefined }]);
  check(tem(semTipo.pendencias, 'tpAval') && !/<tpAval>2<\/tpAval>/.test(semTipo.xml),
    'sem tipo de avaliação e sem medição: tpAval vira pendência (antes saía 2, "qualitativo")');
  const antigo = s2240([{ ...RUIDO, evaluation_type: undefined }]);
  check(/<tpAval>1<\/tpAval>/.test(antigo.xml) && !tem(antigo.pendencias, 'tpAval'), 'evento antigo com medição: tpAval 1');
  check(tem(s2240([{ ...RUIDO, intensity_concentration: '91.4 dB(C)' }]).pendencias, 'intConc'),
    'intensidade com unidade diferente da gravada vira pendência');
  check(tem(s2240([RUIDO], {}, []).pendencias, 'respReg'), 'sem responsável atribuído, pendência de [respReg]');
  check(ev.codigoDaUnidadeDeMedida('dB(A)') === '4' && ev.codigoDaUnidadeDeMedida('db (a)') === '4'
    && ev.codigoDaUnidadeDeMedida('mg/m3') === '8' && ev.codigoDaUnidadeDeMedida('ppm') === '7' && ev.codigoDaUnidadeDeMedida('Hz') === '',
  'unMed pela tabela do leiaute: dB(A) = 4 (o GHE mandava 1, "dose diária de ruído"), mg/m³ = 8, ppm = 7');
  const comFim = s2240([RUIDO], { end_date: '2026-12-31' });
  check(!/<dtFimCondicao>/.test(comFim.xml), 'dtFimCondicao não sai: é exclusivo de trabalhador avulso, e o cadastro não tem a categoria');
}

// ===========================================================================
// 2. S-2210
// ===========================================================================
console.log('\n--- S-2210: grupos, ordem e condições do leiaute ---');
{
  const m = s2210(CAT_COMPLETA);
  const r = raizDoEvento(m.xml, 'evtCAT');
  check(ordem(r) === 'ideEvento,ideEmpregador,ideVinculo,cat', `evtCAT: ideEvento, ideEmpregador, ideVinculo, cat (${ordem(r)}) — evtCAT.xsd:32-35`);
  const cat = no(r, 'cat');
  check(ordem(cat) === 'dtAcid,tpAcid,hrAcid,hrsTrabAntesAcid,tpCat,indCatObito,indComunPolicia,codSitGeradora,iniciatCAT,ultDiaTrab,houveAfast,localAcidente,parteAtingida,agenteCausador,atestado',
    `cat na ordem do XSD (${ordem(cat)}) — evtCAT.xsd:43-514`);
  check(!/<indMorte>|<qtdDiasAfast>/.test(m.xml) && texto(no(cat, 'indCatObito')) === 'N',
    '{indCatObito} no lugar de <indMorte>; sem <qtdDiasAfast>, que o S-2210 não tem');
  check(ordem(no(cat, 'localAcidente')) === 'tpLocal,dscLocal,dscLograd,nrLograd,cep,codMunic,uf,ideLocalAcid' && texto(no(cat, 'localAcidente', 'cep')) === '40000000',
    `localAcidente com endereço e ideLocalAcid (${ordem(no(cat, 'localAcidente'))})`);
  check(ordem(no(cat, 'parteAtingida')) === 'codParteAting,lateralidade', 'parteAtingida com lateralidade');
  const at = no(cat, 'atestado');
  check(ordem(at) === 'dtAtendimento,hrAtendimento,indInternacao,durTrat,indAfast,dscLesao,diagProvavel,codCID,emitente'
    && texto(no(at, 'codCID')) === 'S610' && texto(no(at, 'diagProvavel')) === 'Ferimento corto-contuso',
  `atestado na ordem do XSD; diagProvavel é texto e codCID sai sem ponto (${ordem(at)})`);
  check(m.pendencias.length === 0, `dados completos: nenhuma pendência (${m.pendencias.join(' | ')})`);
  validarNoXsd('S-2210 típico com todos os campos', 'S-2210', m.xml);

  const doenca = s2210({ ...CAT_COMPLETA, tpAcid: '2' });
  check(!/<hrAcid>|<hrsTrabAntesAcid>/.test(doenca.xml), 'doença (tpAcid 2): sem hrAcid e hrsTrabAntesAcid ("Não informar se tpAcid = [2]")');
  validarNoXsd('S-2210 de doença', 'S-2210', doenca.xml);
  const obito = s2210({ ...CAT_COMPLETA, tpCat: '3', indCatObito: 'S', dtObito: '2026-09-12', nrRecCatOrig: '1.1.0000000000000000123', atestado: { ...CAT_COMPLETA.atestado, indAfast: 'N' } });
  check(/<dtObito>2026-09-12<\/dtObito>/.test(obito.xml) && /<catOrigem>\s*<nrRecCatOrig>/.test(obito.xml) && obito.pendencias.length === 0,
    'CAT de óbito: dtObito e catOrigem, nas posições do XSD');
  validarNoXsd('S-2210 de óbito com CAT de origem', 'S-2210', obito.xml);
  check(tem(s2210({ ...CAT_COMPLETA, tpCat: '3' }).pendencias, 'indCatObito'), 'CAT de óbito com "não houve óbito" vira pendência');

  // Do cadastro da CAT, no formato do leiaute: nada escolhido.
  const daCat = ev.dadosDoS2210DaCat({
    cat_type: 'INICIAL', accident_date: '2026-09-10', accident_time: '09:30', accident_type: 'TRAJETO', hours_worked_before_accident: '02:30',
    death_occurred: false, police_report: true, location_type: 'VIA_PUBLICA', location_description: 'Av. Brasil',
    body_part: '753030000 - Mão', accident_agent: '302010300', medical_cert_issuer: 'Ana Souza', medical_crm: 'CRM-BA 12345', medical_uf: 'ba',
    cid_code: 'S61.0 - Ferimento', days_away: 0, treatment_type: 'AMBULATORIAL',
  });
  check(daCat.tpAcid === '3' && daCat.local.tpLocal === '4', 'trajeto = tpAcid 3 e via pública = tpLocal 4 (os montadores mandavam 2 e 3)');
  check(daCat.atestado.dtAtendimento === undefined, 'sem data de atendimento no cadastro, ela não vira a data do acidente');
  check(daCat.houveAfast === undefined && daCat.atestado.indAfast === undefined,
    'zero dias de afastamento (o valor inicial do formulário) não afirma "não houve afastamento"');
  check(daCat.atestado.nrOC === '12345' && daCat.atestado.ufOC === 'BA' && daCat.codParteAting === '753030000',
    'CRM, UF e código da parte atingida vêm do cadastro, limpos');
  const daCatXml = s2210(daCat);
  for (const campo of ['codSitGeradora', 'iniciatCAT', 'ultDiaTrab', 'dscLograd', 'nrLograd', 'lateralidade', 'durTrat', 'dscLesao', 'dtAtendimento', 'hrAtendimento']) {
    check(tem(daCatXml.pendencias, campo), `cadastro de CAT sem ${campo}: pendência, e o campo sai vazio`);
  }

  const vazia = s2210(ev.dadosDoS2210DaCat(undefined));
  const folhasDaCat = folhas(no(raizDoEvento(vazia.xml, 'evtCAT'), 'cat'));
  check(folhasDaCat.length > 0 && folhasDaCat.every(([, v]) => v === ''),
    `CAT vazia: nenhum valor dentro de <cat> (${folhasDaCat.filter(([, v]) => v).map(([n, v]) => `${n}=${v}`).join(', ') || 'todos vazios'})`);
}

// ===========================================================================
// 3. S-2230
// ===========================================================================
console.log('\n--- S-2230: grupos, ordem e condições do leiaute ---');
{
  const m = s2230({ dtIniAfast: '2026-09-15', codMotAfast: '03' });
  const r = raizDoEvento(m.xml, 'evtAfastTemp');
  check(ordem(r) === 'ideEvento,ideEmpregador,ideVinculo,infoAfastamento', `evtAfastTemp: ideEvento, ideEmpregador, ideVinculo, infoAfastamento (${ordem(r)}) — evtAfastTemp.xsd:33-59`);
  check(ordem(no(r, 'ideEvento')) === 'indRetif,tpAmb,procEmi,verProc', 'ideEvento com indRetif (a pré-visualização não o tinha)');
  check(ordem(no(r, 'infoAfastamento', 'iniAfastamento')) === 'dtIniAfast,codMotAfast' && !/<infoAtestado>|<codCID>|<qtdDiasAfast>|<emitente>/.test(m.xml),
    'iniAfastamento sem [infoAtestado]: CID, dias e emitente não existem no S-2230 do leiaute S-1.3');
  check(m.pendencias.length === 0, 'dados completos: nenhuma pendência');
  validarNoXsd('S-2230 por doença', 'S-2230', m.xml);
  const mesmo = s2230({ dtIniAfast: '2026-10-27', codMotAfast: '01', infoMesmoMtv: 'N', tpAcidTransito: '2' });
  check(ordem(no(raizDoEvento(mesmo.xml, 'evtAfastTemp'), 'infoAfastamento', 'iniAfastamento')) === 'dtIniAfast,codMotAfast,infoMesmoMtv,tpAcidTransito',
    'infoMesmoMtv e tpAcidTransito na ordem do XSD, só com motivo 01 ou 03');
  validarNoXsd('S-2230 por acidente, com infoMesmoMtv', 'S-2230', mesmo.xml);
  check(tem(s2230({ dtIniAfast: '2026-10-27', codMotAfast: '03' }, { afastamentoAnteriorNoMesmoMotivo: true }).pendencias, 'infoMesmoMtv'),
    'a partir de 26/10/2026, afastamento anterior pelo mesmo motivo em 60 dias exige infoMesmoMtv');
  check(tem(s2230({ dtIniAfast: '2026-09-15', codMotAfast: '21' }).pendencias, 'observacao'), 'motivo 21 sem observação vira pendência');
  check(ev.dadosDoS2230DoAfastamento({ reason_code_table_18: '03 - Doença', start_date: '2026-09-15' }).codMotAfast === '03',
    'o motivo gravado como "03 - Doença" vira o código 03');

  const vazio = s2230(ev.dadosDoS2230DoAfastamento(undefined));
  const f = folhas(no(raizDoEvento(vazio.xml, 'evtAfastTemp'), 'infoAfastamento'));
  check(f.every(([, v]) => v === '') && tem(vazio.pendencias, 'dtIniAfast') && tem(vazio.pendencias, 'codMotAfast'),
    `afastamento vazio: dtIniAfast e codMotAfast vazios e pendentes (${f.map(([n, v]) => `${n}=${v}`).join(', ')})`);
  check(!/2026-08-15|M54\.5|Ortopedista|77890|N\/A/.test(vazio.xml), 'nenhum dos valores que a pré-visualização inventava (2026-08-15, M54.5, Dr. Ortopedista, 77890, N/A)');
}

// ===========================================================================
// 4. S-3000
// ===========================================================================
console.log('\n--- S-3000: grupos, ordem e condições do leiaute ---');
{
  const m = s3000({ target_event_type: 'S-2240', target_receipt_number: '1.2.0000000000000847120', exclusion_reason: 'Evento em duplicidade' });
  const r = raizDoEvento(m.xml, 'evtExclusao');
  check(ordem(r) === 'ideEvento,ideEmpregador,infoExclusao' && ordem(no(r, 'ideEvento')) === 'tpAmb,procEmi,verProc',
    'evtExclusao: ideEvento sem indRetif (T_ideEvento_exclusao, tipos.xsd:174), ideEmpregador, infoExclusao');
  check(ordem(no(r, 'infoExclusao')) === 'tpEvento,nrRecEvt,ideTrabalhador', 'infoExclusao: tpEvento, nrRecEvt, ideTrabalhador (obrigatório para S-2190 a S-2420)');
  check(m.pendencias.length === 0, 'dados completos: nenhuma pendência');
  validarNoXsd('S-3000 de um S-2240', 'S-3000', m.xml);
  const vazio = s3000(undefined);
  check(texto(no(raizDoEvento(vazio.xml, 'evtExclusao'), 'infoExclusao', 'tpEvento')) === '' && tem(vazio.pendencias, 'tpEvento') && tem(vazio.pendencias, 'nrRecEvt'),
    'sem tipo nem recibo: os dois vazios e pendentes, não "S-2240" escolhido');
  check(!/1\.2\.202600/.test(vazio.xml), 'o recibo inventado 1.2.202600.0000000000000000000-00 não aparece');
  check(tem(s3000({ target_event_type: 'S-2240', target_receipt_number: '1.2.202600.0000000000000000000-00' }).pendencias, 'nrRecEvt'),
    'recibo fora do formato do eSocial vira pendência');
}

// ===========================================================================
// 5. Cabecalho comum
// ===========================================================================
console.log('\n--- cabeçalho comum ---');
{
  const ret = ev.montarXmlDoS2230({ cabecalho: cab({ retificacao: true, reciboRetificado: '' }), trabalhador: trab, afastamento: { dtIniAfast: '2026-09-15', codMotAfast: '03' } });
  check(tem(ret.pendencias, 'nrRecibo') && /<indRetif>2<\/indRetif>/.test(ret.xml), 'retificação sem recibo: indRetif 2 e nrRecibo pendente');
  const semMat = ev.montarXmlDoS2230({ cabecalho: cab(), trabalhador: { cpf: CPF, matricula: '' }, afastamento: { dtIniAfast: '2026-09-15', codMotAfast: '03' } });
  check(tem(semMat.pendencias, 'matricula'), 'sem matrícula: pendência (codCateg só vale para TSVE, e o cadastro não tem a categoria)');
  const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
  check(ev.VERSAO_DO_APLICATIVO_EMISSOR === `PrevSafe-${pkg.version}` && ev.VERSAO_DO_APLICATIVO_EMISSOR.length <= 20,
    `verProc é a versão do package.json (${ev.VERSAO_DO_APLICATIVO_EMISSOR}), não "PrevSafe-v2.6"`);
  const semEmpregador = ev.montarXmlDoS3000({ cabecalho: { ...cab(), id: '', empregador: emp.inscricaoDoEmpregador({ document_type: 'CAEPF', document_number: '1' }) }, exclusao: undefined, cpfTrabalhador: CPF });
  check(tem(semEmpregador.pendencias, 'ideEmpregador'), 'sem inscrição do empregador, pendência de ideEmpregador');
  check(!/<Signature|<SignatureValue>|<DigestValue>/.test(s2210(CAT_COMPLETA).xml) && s2210(CAT_COMPLETA).xml.includes('ds:Signature ausente'),
    'o XML diz que não está assinado, sem assinatura de enfeite');
}

// ===========================================================================
// 6. O contexto: a montagem unica, executada
// ===========================================================================
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const ctxCru = fs.readFileSync(path.join(RAIZ, 'context/PrevSafeContext.tsx'), 'utf8');
const ctx = semComentarios(ctxCru);
const libEventos = semComentarios(fs.readFileSync(path.join(RAIZ, 'lib/esocialEventos.ts'), 'utf8'));

console.log('\n--- a montagem do contexto (pré-visualização e validação) ---');
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
      `const blocoRespMonitXml = ${pegar(/const blocoRespMonitXml = useCallback\(([\s\S]*?\n  \}), \[/, 'blocoRespMonitXml')};`,
      `const montarEventoESocial = ${pegar(/const montarEventoESocial = useCallback\(([\s\S]*?\n  \}), \[/, 'montarEventoESocial')};`,
      `const errosDoEventoESocial = ${pegar(/const errosDoEventoESocial = useCallback\(([\s\S]*?\n  \}), \[/, 'errosDoEventoESocial')};`,
    ].join('\n');
    const ts = require_('typescript');
    const js = ts.transpileModule(fonte, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
    const injetados = {
      clients: [{ id: 'cli-1', ...cliente }],
      workAbsences: [],
      sequenciaDoId: { current: { segundo: 0, usados: {} } },
      responsaveisPeloRegistroAmbiental: () => [responsavel],
      respMonitDoCliente: () => ({ nome: 'Dra. Coordenadora', cpf: CPF_RESP, crm: 'CRM 54321', uf: 'BA' }),
      technicalResponsibilities: [], technicalProfessionals: [],
      validarCPF: br.validarCPF,
      dataDeHoje: () => '2026-10-05',
      xmlDosExamesDoS2220: dados.xmlDosExamesDoS2220, tpExameOcupDoAso: dados.tpExameOcupDoAso, resAsoDoAso: dados.resAsoDoAso,
      ...emp,
      ...ev,
    };
    const nomes = Object.keys(injetados);
    fns = new Function(...nomes, `${js}\nreturn { montarEventoESocial, errosDoEventoESocial };`)(...nomes.map((n) => injetados[n]));
  } catch (e) {
    check(false, `não foi possível executar a montagem do contexto: ${e.message}`);
  }

  if (fns) {
    const evento = (tipo, payload) => ({
      id: 'evt-t', organization_id: 'org', client_id: 'cli-1', event_type: tipo, event_number: 'T', status: 'DRAFT',
      environment: 'PRODUCAO_RESTRITA', is_rectification: false, worker_name: 'Maria Souza', worker_cpf: CPF,
      worker_registration: 'MAT-7781', worker_cbo: '7823-05', worker_role: '', created_at: '', updated_at: '', ...payload,
    });

    const e2240 = fns.montarEventoESocial(evento('S-2240', { ambient_data: ambiental([RUIDO, BIOLOGICO]) }));
    check(e2240.pendencias.length === 0 && /<agNoc>\s*<codAgNoc>02\.01\.001<\/codAgNoc>/.test(e2240.xml),
      `S-2240 da pré-visualização: montado por lib/esocialEventos.ts, sem pendências (${e2240.pendencias.join(' | ')})`);
    validarNoXsd('S-2240 da pré-visualização (contexto)', 'S-2240', e2240.xml);

    const aso = {
      aso_type: 'PERIODICO', exam_date: '2026-09-20', result: 'APTO', physician_name: 'Dr. Examinador de Teste', physician_crm: 'CRM 77001', physician_uf: 'BA',
      exams_list: [{ code: '0295', name: 'Avaliação clínica', date: '2026-09-20', procedure_type: 'CLINICO', result: 'NORMAL' }],
    };
    const e2220 = fns.montarEventoESocial(evento('S-2220', { aso_data: aso }));
    check(!/<Signature|<SignatureValue>|<DigestValue>/.test(e2220.xml) && e2220.xml.includes('ds:Signature ausente'),
      'S-2220: sem o bloco <Signature> de enfeite ("ICP-Brasil-A1-Signature-PrevSafe"), dizendo que não está assinado');
    validarNoXsd('S-2220 da pré-visualização (contexto)', 'S-2220', e2220.xml);

    const e2230 = fns.montarEventoESocial(evento('S-2230', { absence_data: {
      reason_code_table_18: '03 - Doença', reason_description: 'Doença', start_date: '2026-09-15', end_date: '2026-09-30', estimated_days: 15,
      is_traffic_accident: false, medical_issuer_name: 'Dr. X', physician_name: 'Dr. X', medical_crm: '999', medical_uf: 'BA', cid_10: 'J11', cid_code: 'J11',
    } }));
    check(e2230.pendencias.length === 0 && !/J11|Dr\. X|<fimAfastamento>/.test(e2230.xml),
      'S-2230 da pré-visualização: sem pendências; CID e médico do atestado não vão (o S-1.3 não os tem), nem o fim previsto');
    validarNoXsd('S-2230 da pré-visualização (contexto)', 'S-2230', e2230.xml);

    const e3000 = fns.montarEventoESocial(evento('S-3000', { exclusion_data: { target_event_type: 'S-2220', target_receipt_number: '1.2.0000000000000847120', exclusion_reason: 'x' } }));
    validarNoXsd('S-3000 da pré-visualização (contexto)', 'S-3000', e3000.xml);

    // Payloads vazios: nada inventado.
    const v2230 = fns.montarEventoESocial(evento('S-2230', { absence_data: {} }));
    const v3000 = fns.montarEventoESocial(evento('S-3000', { exclusion_data: {} }));
    const v2210 = fns.montarEventoESocial(evento('S-2210', { cat_data: {} }));
    check(folhas(no(raizDoEvento(v2230.xml, 'evtAfastTemp'), 'infoAfastamento')).every(([, val]) => val === '')
      && !/2026-08-15|M54\.5|Ortopedista|77890/.test(v2230.xml),
    'S-2230 com o afastamento vazio: nenhum valor inventado (antes 2026-08-15, motivo 01, M54.5, 5 dias, "Dr. Ortopedista", 77890/SP)');
    check(texto(no(raizDoEvento(v3000.xml, 'evtExclusao'), 'infoExclusao', 'tpEvento')) === '' && !/1\.2\.202600/.test(v3000.xml),
      'S-3000 com a exclusão vazia: tpEvento e nrRecEvt vazios (antes S-2240 e 1.2.202600.0000000000000000000-00)');
    check(folhas(no(raizDoEvento(v2210.xml, 'evtCAT'), 'cat')).every(([, val]) => val === ''),
      'S-2210 com a CAT vazia: nenhum valor dentro de <cat>');

    // A validacao cobra o que o XML mostra vazio.
    const erros2230 = fns.errosDoEventoESocial(evento('S-2230', { absence_data: { reason_code_table_18: '03', start_date: '2026-09-15' } }));
    check(!erros2230.some((x) => /CRM/.test(x)), 'S-2230 sem CRM do atestado não é recusado: o campo não existe no leiaute S-1.3');
    const erros2240 = fns.errosDoEventoESocial(evento('S-2240', { ambient_data: ambiental([RUIDO], { start_date: '' }) }));
    check(erros2240.some((x) => x.includes('{dtIniCondicao}')) && !erros2240.some((x) => /dtIniCondic\)|\(dtIniCondic/.test(x)),
      'a validação cobra {dtIniCondicao}, pelo nome do leiaute S-1.3, e não "dtIniCondic"');
    const erros2210 = fns.errosDoEventoESocial(evento('S-2210', { cat_data: {} }));
    check(erros2210.some((x) => x.includes('{codSitGeradora}')) && erros2210.some((x) => x.includes('{lateralidade}')),
      'a validação do S-2210 traz as pendências da montagem (codSitGeradora, lateralidade...)');
  }
}

// ===========================================================================
// 7. Forma do fonte
// ===========================================================================
console.log('\n--- forma do fonte: nenhum montador próprio, nenhum valor inventado ---');
{
  const corpo = (nome) => (ctx.match(new RegExp(`const ${nome} = useCallback\\(([\\s\\S]*?)\\n  \\}, \\[`)) || [])[1] || '';
  const detector = {
    xmlNumaLinha: (s) => /<\?xml[^\n`]*<eSocial[^\n`]*<evt/.test(s),
    padraoInventado: (s) => /\$\{[^{}]*\|\|\s*(['"])[^'"]+\1[^{}]*\}/.test(s),
    assinaturaDeEnfeite: (s) => /<SignatureValue>|<DigestValue>/.test(s),
    nomesForaDoLeiaute: (s) => /<fatRisco>|<codFatRis|<dtIniCondic>|'dtIniCondic'|<dscAtiv>|<indMorte>|<infoAtestado>/.test(s),
    nasceProntoParaEnvio: (s) => /status:\s*'READY_TO_SEND'/.test(s),
    literalNoPayloadDaCat: (s) => /payload\.cat_data\s*=\s*\{[^}]*:\s*'[^']+'/.test(s),
    versaoInventada: (s) => /PrevSafe-v2\.6|PrevSafe_SST_v1\.0/.test(s),
  };
  const ORIGINAL = {
    xmlNumaLinha: 'xml_content: `<?xml version="1.0" encoding="UTF-8"?><eSocial xmlns="${namespaceDoEvento(\'S-2230\')}"><evtAfastTemp Id="${x}">',
    padraoInventado: "<dtIniAfast>${abs?.start_date || '2026-08-15'}</dtIniAfast>",
    assinaturaDeEnfeite: '<SignatureValue>MEQCIA...ICP-Brasil-A1-Signature-PrevSafe...</SignatureValue>',
    nomesForaDoLeiaute: "${campoDoEvento('dtIniCondic', amb?.start_date, 'data de início da condição não informada')}",
    nasceProntoParaEnvio: "      status: 'READY_TO_SEND',",
    literalNoPayloadDaCat: "payload.cat_data = {\n        cat_type: s2210CatType,\n        medical_crm: 'CRM-SP 88412',\n      };",
    versaoInventada: '<verProc>PrevSafe-v2.6</verProc>',
  };
  for (const [nome, trecho] of Object.entries(ORIGINAL)) {
    if (!detector[nome](trecho)) inconclusivo(`o detector "${nome}" não acusa o trecho defeituoso original`);
  }
  const montadores = ctx + '\n' + libEventos;
  check(!detector.xmlNumaLinha(montadores), 'nenhum XML de evento escrito numa linha só (os montadores rápidos da CAT e do afastamento)');
  check(!detector.padraoInventado(corpo('montarEventoESocial') + libEventos), 'nenhum ${campo || \'valor\'} dentro do XML: campo sem dado não ganha valor plausível');
  check(!detector.assinaturaDeEnfeite(montadores), 'nenhuma <SignatureValue>/<DigestValue> de enfeite no XML');
  check(!detector.nomesForaDoLeiaute(montadores), 'nenhum nome de campo fora do leiaute S-1.3 (fatRisco, codFatRis, dtIniCondic, dscAtiv, indMorte, infoAtestado)');
  check(!detector.versaoInventada(montadores), 'nenhum verProc inventado');
  for (const nome of ['generateS2210FromCat', 'generateS2230FromAbsence', 'generateS2240FromGhe', 'transmitCatRecord', 'transmitWorkAbsence']) {
    const c = corpo(nome);
    check(c !== '' && !/<\?xml|<evt\w|<ide\w|<cat>|<infoAfastamento>/.test(c), `${nome}: sem XML próprio`);
  }
  for (const nome of ['generateS2210FromCat', 'generateS2230FromAbsence', 'generateS2240FromGhe']) {
    const c = corpo(nome);
    check(!detector.nasceProntoParaEnvio(c) && /errosDoEventoESocial\(/.test(c) && /generateESocialXmlPreview\(/.test(c)
      && c.indexOf('errosDoEventoESocial(') < c.indexOf("= 'READY_TO_SEND'"),
    `${nome}: o evento passa pela validação antes de ficar pronto, e com pendência não é criado`);
  }
  check(/transmitCatRecord[\s\S]{0,400}generateS2210FromCat\(id\)/.test(ctx) && /transmitWorkAbsence[\s\S]{0,400}generateS2230FromAbsence\(id\)/.test(ctx),
    '"transmitir" CAT e afastamento usa o mesmo caminho da geração');
  check(/errors\.push\(\.\.\.montarEventoESocial\(evt, ''\)\.pendencias\)/.test(corpo('errosDoEventoESocial'))
    && /const errors = errosDoEventoESocial\(evt\)/.test(corpo('validateESocialEvent')),
  'a validação usa as pendências da mesma montagem do XML');
  check(/status: 'DRAFT',/.test(corpo('generateExclusionEventS3000')) && !detector.nasceProntoParaEnvio(corpo('generateExclusionEventS3000')),
    'o S-3000 gerado nasce DRAFT (nascia pronto para envio sem recibo)');

  const view = semComentarios(fs.readFileSync(path.join(RAIZ, 'components/esocial/ESocialEventsView.tsx'), 'utf8'));
  check(!detector.literalNoPayloadDaCat(view) && !/88412|Pronto Atendimento Municipal|Setor de Produção Industrial/.test(view),
    'o formulário de S-2210 não grava emitente, CRM, UF, local e tipo de acidente escritos no código');
  check(!/useState<string>\(initialEvent\?\.cat_data\?\.\w+ \|\| '[^']+'\)/.test(view),
    'nem parte atingida, agente causador e CID pré-preenchidos');
}

// ===========================================================================
// 8. Controles negativos: o XML como os montadores antigos o escreviam
// ===========================================================================
// Se o XSD aceitar algum destes, a validacao nao esta conferindo nada.
{
  const ns = (el) => `http://www.esocial.gov.br/schema/evt/${el}/v_S_01_03_00`;
  const ide = '<ideEmpregador><tpInsc>1</tpInsc><nrInsc>11222333</nrInsc></ideEmpregador>';
  validarNoXsd('controle negativo: S-2240 antigo (dtIniCondic, fatRisco/codFatRis)', 'S-2240',
    `<?xml version="1.0" encoding="UTF-8"?><eSocial xmlns="${ns('evtExpRisco')}"><evtExpRisco Id="${ID}">`
    + '<ideEvento><indRetif>1</indRetif><tpAmb>2</tpAmb><procEmi>1</procEmi><verProc>PrevSafe-v2.6</verProc></ideEvento>'
    + `${ide}<ideVinculo><cpfTrab>52998224725</cpfTrab><matricula>MAT-7781</matricula></ideVinculo><infoExpRisco>`
    + '<dtIniCondic>2026-09-01</dtIniCondic><infoAmb><localAmb>1</localAmb><dscSetor>Estamparia</dscSetor><tpInsc>1</tpInsc>'
    + `<nrInsc>${CNPJ_14}</nrInsc></infoAmb><infoAtiv><dscAtivDes>Operar prensa.</dscAtivDes></infoAtiv><agNoc><fatRisco>`
    + '<codFatRis>02.01.001</codFatRis><dscFatRis>Ruído</dscFatRis><tpAval>1</tpAval><intConc>91.4 dB(A)</intConc></fatRisco></agNoc>'
    + '<respReg><cpfResp>11144477735</cpfResp><ideOC>4</ideOC><nrOC>201812345</nrOC><ufOC>BA</ufOC></respReg>'
    + '</infoExpRisco></evtExpRisco></eSocial>', false);
  validarNoXsd('controle negativo: S-2240 antigo do GHE (sem indRetif, ideTrabalhador, dscAtiv no infoAmb)', 'S-2240',
    `<?xml version="1.0" encoding="UTF-8"?><eSocial xmlns="${ns('evtExpRisco')}"><evtExpRisco Id="${ID}">`
    + '<ideEvento><tpAmb>1</tpAmb><procEmi>1</procEmi><verProc>PrevSafe_SST_v1.0</verProc></ideEvento>'
    + `${ide}<ideTrabalhador><cpfTrab>52998224725</cpfTrab><matricula>MAT-7781</matricula></ideTrabalhador><infoExpRisco>`
    + `<dtIniCondicao>2026-09-01</dtIniCondicao><infoAmb><localAmb>1</localAmb><dscSetor>GHE 01</dscSetor><tpInsc>1</tpInsc><nrInsc>${CNPJ_14}</nrInsc>`
    + '<dscAtiv>Soldagem</dscAtiv></infoAmb><agNoc><fatRisco><codFatRisc>02.01.001</codFatRisc><tpAval>1</tpAval></fatRisco></agNoc>'
    + '</infoExpRisco></evtExpRisco></eSocial>', false);
  validarNoXsd('controle negativo: S-2210 antigo de uma linha (sem ideEvento, ideTrabalhador)', 'S-2210',
    `<?xml version="1.0" encoding="UTF-8"?><eSocial xmlns="${ns('evtCAT')}"><evtCAT Id="${ID}">${ide}`
    + '<ideTrabalhador><cpfTrab>52998224725</cpfTrab></ideTrabalhador><cat><dtAcid>2026-09-10</dtAcid><tpAcid>2</tpAcid><hrAcid>0930</hrAcid>'
    + '<localAcidente><tpLocal>3</tpLocal><dscLocal>Rua</dscLocal></localAcidente><parteAtingida><codParteAting>753030000</codParteAting></parteAtingida>'
    + '<agenteCausador><codAgntCausador>302010300</codAgntCausador></agenteCausador><atestado><dtAtendimento>2026-09-10</dtAtendimento>'
    + '<codCID>S61.0</codCID><emitente><nmEmit>Ana Souza</nmEmit><ideOC>1</ideOC><nrOC>12345</nrOC><ufOC>BA</ufOC></emitente></atestado></cat>'
    + '</evtCAT></eSocial>', false);
  validarNoXsd('controle negativo: S-2230 antigo (infoAtestado com CID, dias e emitente)', 'S-2230',
    `<?xml version="1.0" encoding="UTF-8"?><eSocial xmlns="${ns('evtAfastTemp')}"><evtAfastTemp Id="${ID}">`
    + `<ideEvento><tpAmb>2</tpAmb><procEmi>1</procEmi><verProc>PrevSafe-v2.6</verProc></ideEvento>${ide}`
    + '<ideVinculo><cpfTrab>52998224725</cpfTrab><matricula>MAT-7781</matricula></ideVinculo><infoAfastamento><iniAfastamento>'
    + '<dtIniAfast>2026-08-15</dtIniAfast><codMotAfast>01</codMotAfast><infoAtestado><codCID>M54.5</codCID><qtdDiasAfast>5</qtdDiasAfast>'
    + '<emitente><nmEmit>Dr. Ortopedista</nmEmit><ideOC>1</ideOC><nrOC>77890</nrOC><ufOC>SP</ufOC></emitente></infoAtestado>'
    + '</iniAfastamento></infoAfastamento></evtAfastTemp></eSocial>', false);
  validarNoXsd('controle negativo: S-3000 antigo (recibo inventado fora do formato)', 'S-3000',
    `<?xml version="1.0" encoding="UTF-8"?><eSocial xmlns="${ns('evtExclusao')}"><evtExclusao Id="${ID}">`
    + `<ideEvento><tpAmb>2</tpAmb><procEmi>1</procEmi><verProc>PrevSafe-v2.6</verProc></ideEvento>${ide}`
    + '<infoExclusao><tpEvento>S-2240</tpEvento><nrRecEvt>1.2.202600.0000000000000000000-00</nrRecEvt>'
    + '<ideTrabalhador><cpfTrab>52998224725</cpfTrab></ideTrabalhador></infoExclusao></evtExclusao></eSocial>', false);
}

// ===========================================================================
// 9. Rotulos: so o que e verdade
// ===========================================================================
// As telas diziam leiaute "S-1.2", "Validado XSD", "XML ASSINADO
// DIGITALMENTE", "Certificado A1 ICP-Brasil" e ensinavam CAEPF/CNO como
// tpInsc do empregador. O PrevSafe monta o XML no leiaute S-1.3 e confere os
// campos; nao valida contra o XSD, nao assina e nao transmite.
console.log('\n--- rótulos das telas, do PDF e do tutorial ---');
{
  const ler = (rel) => semComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
  const ARQUIVOS = [
    'components/esocial/ESocialEventsView.tsx', 'components/crm/ClientsView.tsx', 'lib/esocialPdfGenerator.ts',
    'components/help-center/tutorialsData.ts', 'components/sst/SSTUnifiedEngineeringView.tsx',
    'components/auth/LoginView.tsx', 'components/help-center/HelpCenterView.tsx', 'lib/companyLookup.ts',
  ];
  const detector = {
    versaoS12: (s) => /S-1\.2\b/.test(s),
    // "não validado contra o XSD" e o rotulo verdadeiro; o defeito e afirmar a validacao.
    validadoXsd: (s) => /(?<![Nn]ão )[Vv]alidad[oa]s? (contra o )?XSD|Conformidade XSD|Validação Prévia de Schemas XSD|Validar Schemas|Validação estrita de esquemas XSD|Validação de [Ee]squemas? XSD|Motor XSD|Validador Sintático XSD/.test(s),
    assinado: (s) => /XML ASSINADO|Assinado Digitalmente|Certificado A1 ICP-Brasil|assina o XML digitalmente|assina com o Certificado A1/.test(s),
    transmitido: (s) => /transmitido ao Ambiente Nacional|recepcionad[oa]s? (com sucesso )?pel[oa] (base oficial|Governo)|Lote transmitido com Sucesso|Recibos Oficiais Gerados|201 - SUCESSO|'18\/08\/2026 14:22:10'/.test(s),
    tpInscDoEmpregadorCaepfCno: (s) => /'3 \(CAEPF\)'|'4 \(CNO\)'|CAEPF &lt;tpInsc: 3&gt;|CNO &lt;tpInsc: 4&gt;|eSocial <tpInsc: [34]>/.test(s),
  };
  const ORIGINAL = {
    versaoS12: '<span>eSocial Layout S-1.2: Eventos S-2240, S-2220 e S-2210 compatíveis</span>',
    validadoXsd: '<span className="block text-[10px] text-slate-500 mt-0.5">Validado XSD v.S-1.2</span>',
    assinado: '<div class="section-title">XML ASSINADO DIGITALMENTE (PADRÃO XSD v.S-1.2)</div>',
    transmitido: "{xmlModalEvent.return_code || '201 - SUCESSO'}",
    tpInscDoEmpregadorCaepfCno: "&lt;tpInsc: {selectedClient.document_type === 'CAEPF' ? '3 (CAEPF)' : selectedClient.document_type === 'CNO' ? '4 (CNO)' : '1 (CNPJ)'}&gt;",
  };
  for (const [nome, trecho] of Object.entries(ORIGINAL)) {
    if (!detector[nome](trecho)) inconclusivo(`o detector "${nome}" não acusa o trecho defeituoso original`);
  }
  for (const rel of ARQUIVOS) {
    const s = ler(rel);
    const achados = Object.entries(detector).filter(([, d]) => d(s)).map(([n]) => n);
    check(achados.length === 0, `${rel}: nenhum rótulo de leiaute S-1.2, XSD validado, XML assinado ou recibo inventado${achados.length ? ` (${achados.join(', ')})` : ''}`);
  }
  const clientes = ler('components/crm/ClientsView.tsx');
  check(/ideEmpregador\/tpInsc: 1/.test(clientes) && /Não identifica o empregador/.test(clientes),
    'o modal de ajuda ensina que só CNPJ (1) e CPF (2) identificam o empregador; CAEPF e CNO, o estabelecimento');
  const pdf = ler('lib/esocialPdfGenerator.ts');
  check(/NÃO ASSINADO E NÃO VALIDADO CONTRA O XSD/.test(pdf) && /VERSAO_DO_LEIAUTE_ESOCIAL/.test(pdf),
    'o espelho em PDF diz "pré-visualização", "não assinado" e "não validado contra o XSD", com a versão do leiaute da regra única');

  // O espelho em PDF preenchia o que faltava: afastamento com CID M54.5,
  // "Dr. Ortopedista" CRM 77890/SP e 5 dias; ASO "APTO"; exame clinico
  // "NORMAL" que ninguem lancou; e imprimia o resultado de cada exame. Busca-se
  // a forma no codigo: o literal como valor padrao, a leitura do campo.
  const pdfSem = semComentarios(pdf);
  check(!/e\.result\b/.test(pdfSem) && !/Parecer Clínico/.test(pdfSem), 'o espelho do S-2220 não imprime o resultado de cada exame');
  check(!/aso\?\.result \|\| 'APTO'/.test(pdfSem), 'ASO sem resultado não sai "APTO"');
  check(!/<td><strong>0001<\/strong><\/td>/.test(pdfSem), 'ASO sem exames não ganha um exame clínico "NORMAL" inventado');
  check(!/\|\| 'M54\.5'/.test(pdfSem) && !/\|\| 'Dr\. Ortopedista'/.test(pdfSem) && !/\|\| '77890'/.test(pdfSem) && !/days_count \|\| 5\b/.test(pdfSem),
    'afastamento sem dados não ganha CID, médico, CRM nem duração inventados');
  check(!/abs\?\.cid_code/.test(pdfSem), 'o espelho do S-2230 não imprime o CID (dado de saúde que o evento S-1.3 não leva)');
  check(!/\|\| '7152-10'/.test(pdfSem) && !/\|\| 'Setor de Produção/.test(pdfSem) && !/\|\| 'Válido'\)/.test(pdfSem),
    'sem CBO, local ou CA inventados no espelho');
  check(!/new Date\([^)]*\)\.toLocaleDateString/.test(pdfSem.replace(/const today = new Date\(\)\.toLocaleDateString\('pt-BR'\);/, '')),
    'as datas do espelho não voltam um dia (formatDate, e não new Date(...).toLocaleDateString)');
}

rodarXsd();

console.log(
  falhas > 0 ? `\n${falhas} FALHA(S) em ${casos} casos`
    : inconclusivos > 0 ? `\nINCONCLUSIVO — ${casos} casos passaram, mas a validação contra o XSD não rodou`
      : `\nTODOS OS TESTES PASSARAM (${casos} casos)`
);
process.exitCode = falhas > 0 ? 1 : inconclusivos > 0 ? 2 : 0;
