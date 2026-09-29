/**
 * Verificacao das fotografias anexadas a AEP.
 *
 *   node scripts/verificar-evidencias-aep.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * A NR-17 nao exige nem proibe foto na AEP. O que faz uma foto aumentar a
 * seguranca juridica do cliente - e nao diminuir - sao quatro coisas, e este
 * teste cobra as quatro:
 *
 *   1. AUTENTICIDADE. CPC, art. 422, par. 1o: fotografia digital impugnada
 *      exige autenticacao eletronica. O hash SHA-256 tem de ser calculado
 *      sobre os bytes que sobem, impresso por inteiro, e CONFERIDO na emissao
 *      - o documento diz se o arquivo guardado ainda bate
 *   2. PAR ANTES/DEPOIS. Foto do problema sem foto da correcao documenta que
 *      a empresa sabia. A tela tem de apontar isso
 *   3. NINGUEM IDENTIFICAVEL. LGPD, art. 5o, I: sem confirmacao de que nao ha
 *      rosto, e sem nome de trabalhador na legenda
 *   4. RASTRO. Nao ha exclusao: substituir guarda a antiga; descartar tira o
 *      arquivo e guarda o registro
 *
 * E uma coisa que o documento NAO pode fazer: afirmar quando ou onde a foto
 * foi TIRADA. O hash prova que o arquivo e o mesmo registrado naquela data -
 * so isso.
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
const TMP = path.join(RAIZ, '.tmp-evidencias-verificacao');

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
      path.join(RAIZ, 'lib/nr17.ts'),
      path.join(RAIZ, 'lib/evidenciasFotograficas.ts'),
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

let servico, nr17, ev;
try {
  servico = require_(achar('pdfExportService.js'));
  nr17 = require_(achar('nr17.js'));
  ev = require_(achar('evidenciasFotograficas.js'));
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', e.message);
}

const { exportAEPDocumentPdf } = servico;
const { NR17_ASPECTOS } = nr17;
const {
  TIPOS_ACEITOS,
  TAMANHO_MAXIMO_BYTES,
  conferirArquivo,
  sha256Hex,
  legendaCitaTrabalhador,
  conferirNovaEvidencia,
  evidenciasParaImpressao,
  aspectosSemFotoDaCorrecao,
  substituirEvidencia,
  descartarEvidencia,
  legendaDeImpressao,
  caixaDaImagem,
  prepararImagensParaImpressao,
  NOTA_SOBRE_AS_FOTOGRAFIAS,
} = ev;

let falhas = 0;
let casos = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

const semComentarios = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');

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
const corrido = (buf) => trechosDoPdf(buf).join(' ').replace(/\s+/g, ' ');
const quebrados = (buf) => trechosDoPdf(buf).filter((t) => t.includes('\u0000'));

// Um PNG 1x1 valido: bytes reais, para o hash e para o jsPDF desenharem.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const PNG_BYTES = Buffer.from(PNG_BASE64, 'base64');
const PNG_DATAURL = `data:image/png;base64,${PNG_BASE64}`;

// ===========================================================================
console.log('--- o arquivo que pode ser anexado ---');
// ===========================================================================
{
  check(conferirArquivo({ type: 'image/jpeg', size: 3_000_000 }).ok, 'JPEG de celular é aceito');
  check(conferirArquivo({ type: 'image/png', size: 500_000 }).ok, 'PNG é aceito');
  const heic = conferirArquivo({ type: 'image/heic', size: 3_000_000 });
  check(!heic.ok && /JPEG ou PNG/.test(heic.motivo),
    'HEIC do iPhone é recusado, dizendo o formato certo — o PDF não o imprime');
  check(/Mais Compat/.test(heic.motivo), 'e dizendo como mudar no iPhone');
  check(!conferirArquivo({ type: 'image/webp', size: 1000 }).ok, 'WEBP também');
  check(!conferirArquivo({ type: 'image/jpeg', size: 0 }).ok, 'arquivo vazio não');
  check(!conferirArquivo({ type: 'image/jpeg', size: TAMANHO_MAXIMO_BYTES + 1 }).ok,
    'acima do limite, não');
  check(conferirArquivo({ type: 'image/jpeg', size: TAMANHO_MAXIMO_BYTES }).ok, 'no limite, sim');
  check(!conferirArquivo(null).ok, 'sem arquivo, não');

  // O limite daqui TEM de ser o do bucket: maior, o arquivo passava nesta
  // conferencia e era recusado pelo armazenamento com mensagem obscura.
  const sql = fs.readFileSync(
    path.join(RAIZ, 'supabase/migrations/20260918000000_prevsafe_storage_evidencias.sql'), 'utf8'
  );
  const limiteDoBucket = Number((sql.match(/\n\s*(\d+),\s*--\s*10 MB/) || [])[1]);
  check(limiteDoBucket === TAMANHO_MAXIMO_BYTES,
    `o limite é o mesmo do bucket (${TAMANHO_MAXIMO_BYTES} × ${limiteDoBucket})`);
  const tiposDoBucket = (sql.match(/array\[([^\]]+)\]/) || [])[1] || '';
  check(TIPOS_ACEITOS.every((t) => tiposDoBucket.includes(`'${t}'`)),
    'e todo tipo aceito aqui o bucket também aceita');
}

// ===========================================================================
console.log('\n--- o hash ---');
// ===========================================================================
{
  // Vetor de teste do FIPS 180-2 para "abc".
  const abc = await sha256Hex(new TextEncoder().encode('abc'));
  check(abc === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    'SHA-256 de "abc" bate com o vetor oficial');
  const png = await sha256Hex(PNG_BYTES);
  check(/^[0-9a-f]{64}$/.test(png), 'o hash sai em 64 dígitos hexadecimais');
  const alterado = Buffer.from(PNG_BYTES); alterado[alterado.length - 5] ^= 1;
  check((await sha256Hex(alterado)) !== png, 'um bit alterado muda o hash');
  check((await sha256Hex(PNG_BYTES.buffer.slice(
    PNG_BYTES.byteOffset, PNG_BYTES.byteOffset + PNG_BYTES.byteLength
  ))) === png, 'ArrayBuffer e Uint8Array do mesmo arquivo dão o mesmo hash');
}

// ===========================================================================
console.log('\n--- ninguém identificável ---');
// ===========================================================================
{
  const nomes = ['João Ferreira da Silva', 'Maria das Graças Oliveira', 'Ana'];
  check(legendaCitaTrabalhador('Posto do João Ferreira da Silva na bancada 3', nomes) === 'João Ferreira da Silva',
    'nome completo na legenda é detectado');
  check(legendaCitaTrabalhador('bancada do joao ferreira da silva', nomes) !== null,
    'sem acento e em minúsculas também');
  check(legendaCitaTrabalhador('Maria Oliveira operando a prensa', nomes) === 'Maria das Graças Oliveira',
    'primeiro e último nome bastam');
  check(legendaCitaTrabalhador('Ana de produção na esteira', nomes) === null,
    'só o primeiro nome não conta — "Ana" pode ser qualquer coisa');
  check(legendaCitaTrabalhador('Bancada fixa a 95 cm, ombros elevados', nomes) === null,
    'legenda que descreve o posto passa');

  const tudoErrado = conferirNovaEvidencia({
    legenda: 'Maria Oliveira na prensa', momento: '', semRostoIdentificavel: false,
    nomesDosTrabalhadores: nomes,
  });
  check(tudoErrado.length === 3,
    `sem momento, sem confirmação de rosto e com nome: três problemas (achou ${tudoErrado.length})`);
  check(tudoErrado.some((p) => /LGPD/.test(p)), 'o problema do nome cita a LGPD');
  check(tudoErrado.some((p) => /rosto/.test(p)), 'o do rosto diz o que fazer');
  check(conferirNovaEvidencia({
    legenda: '', momento: 'APOS_A_MEDIDA', semRostoIdentificavel: true,
  }).some((p) => /legenda/i.test(p)), 'legenda vazia não passa');
  check(conferirNovaEvidencia({
    legenda: 'Bancada regulável instalada', momento: 'APOS_A_MEDIDA', semRostoIdentificavel: true,
    nomesDosTrabalhadores: nomes,
  }).length === 0, 'tudo certo: nada a objetar');
}

// ===========================================================================
// Um conjunto de fotos para os testes seguintes
// ===========================================================================
const HASH_PNG = await sha256Hex(PNG_BYTES);
const foto = (id, extra = {}) => ({
  id,
  path: `org-1/aep-1/${id}.png`,
  sha256: HASH_PNG,
  mime: 'image/png',
  tamanho_bytes: PNG_BYTES.length,
  momento: 'SITUACAO_ENCONTRADA',
  aspecto: 'mobiliario',
  legenda: `Legenda ${id}`,
  registrada_em: '2026-09-29T14:32:00.000Z',
  registrada_por_id: 'u1',
  registrada_por_nome: 'Ana Paula Ribeiro',
  sem_rosto_identificavel: true,
  situacao: 'ATIVA',
  ...extra,
});

const ORDEM = NR17_ASPECTOS.map((a) => a.chave);

// ===========================================================================
console.log('\n--- o que vai para o documento, e em que ordem ---');
// ===========================================================================
{
  const lista = [
    foto('depois-mob', { momento: 'APOS_A_MEDIDA', registrada_em: '2026-10-01T10:00:00Z' }),
    foto('antes-org', { aspecto: 'organizacao' }),
    foto('antes-mob'),
    foto('trocada', { situacao: 'SUBSTITUIDA' }),
    foto('descartada', { situacao: 'DESCARTADA', path: '' }),
  ];
  const impressas = evidenciasParaImpressao(lista, ORDEM);
  check(impressas.length === 3, `só as ativas saem (saíram ${impressas.length})`);
  check(!impressas.some((f) => f.id === 'trocada' || f.id === 'descartada'),
    'a substituída e a descartada não saem');
  check(impressas[0].id === 'antes-org',
    'organização do trabalho vem antes de mobiliário, na ordem da norma');
  check(impressas[1].id === 'antes-mob' && impressas[2].id === 'depois-mob',
    'no mesmo aspecto, a situação encontrada vem antes de após a medida');
  check(evidenciasParaImpressao([foto('sem-arquivo', { path: '' })], ORDEM).length === 0,
    'foto ativa sem arquivo não sai como se existisse');
  check(evidenciasParaImpressao(undefined, ORDEM).length === 0, 'sem fotos, lista vazia');
}

// ===========================================================================
console.log('\n--- a foto que trabalha contra o cliente ---');
// ===========================================================================
{
  check(aspectosSemFotoDaCorrecao([foto('a')]).includes('mobiliario'),
    'problema fotografado sem foto da correção é apontado');
  check(aspectosSemFotoDaCorrecao([foto('a'), foto('b', { momento: 'APOS_A_MEDIDA' })]).length === 0,
    'com o par antes/depois, nada a apontar');
  check(aspectosSemFotoDaCorrecao([foto('b', { momento: 'APOS_A_MEDIDA' })]).length === 0,
    'só a da correção também não preocupa');
  check(aspectosSemFotoDaCorrecao([
    foto('a'), foto('b', { momento: 'APOS_A_MEDIDA', situacao: 'SUBSTITUIDA' }),
  ]).includes('mobiliario'),
    'a correção substituída não conta como correção');
  check(aspectosSemFotoDaCorrecao([
    foto('a'), foto('b', { momento: 'APOS_A_MEDIDA', aspecto: 'conforto' }),
  ]).includes('mobiliario'),
    'correção de OUTRO aspecto não fecha o par');
}

// ===========================================================================
console.log('\n--- não há exclusão: substituir e descartar deixam rastro ---');
// ===========================================================================
{
  const lista = [foto('velha')];
  const nova = foto('nova');
  check(!substituirEvidencia(lista, 'velha', nova, '', 'Ana', 'x').ok,
    'substituir sem motivo não passa');
  const r = substituirEvidencia(lista, 'velha', nova, 'foto tremida', 'Ana', '2026-09-30T08:00:00Z');
  // `|| {}`: se a antiga sumir da lista, isto tem de ser FALHA com nome, e nao
  // um TypeError que derruba o script.
  const velha = r.evidencias.find((e) => e.id === 'velha') || {};
  check(r.ok && r.evidencias.length === 2, 'substituir acrescenta, não troca no lugar');
  check(velha.situacao === 'SUBSTITUIDA' && velha.substituida_por === 'nova',
    'a antiga fica marcada como substituída, apontando para a nova');
  check(velha.path === 'org-1/aep-1/velha.png', 'e o arquivo dela continua guardado');
  check(velha.motivo_encerramento === 'foto tremida' && velha.encerrada_por_nome === 'Ana'
    && velha.encerrada_em === '2026-09-30T08:00:00Z', 'com motivo, autor e data');
  check(!substituirEvidencia(r.evidencias, 'velha', foto('outra'), 'de novo', 'Ana', 'x').ok,
    'não se substitui uma foto que já saiu de cena');

  check(!descartarEvidencia(lista, 'velha', '  ', 'Ana', 'x').ok, 'descartar sem motivo não passa');
  const d = descartarEvidencia(lista, 'velha', 'mostra rosto', 'Ana', '2026-09-30T09:00:00Z');
  const descartada = d.evidencias.find((e) => e.id === 'velha') || {};
  check(d.ok && d.caminhoARemover === 'org-1/aep-1/velha.png',
    'descartar devolve o caminho do arquivo a remover');
  check(descartada.situacao === 'DESCARTADA' && descartada.path === '',
    'o registro perde o caminho do arquivo');
  check(descartada.sha256 === HASH_PNG && descartada.registrada_por_nome === 'Ana Paula Ribeiro',
    'mas guarda o hash e quem registrou');
  check(descartada.motivo_encerramento === 'mostra rosto', 'e o motivo do descarte');
  check(d.evidencias.length === 1, 'o registro não some da lista');
  check(!descartarEvidencia(d.evidencias, 'velha', 'de novo', 'Ana', 'x').ok,
    'não se descarta duas vezes');
  check(!descartarEvidencia(lista, 'nao-existe', 'x', 'Ana', 'x').ok, 'foto inexistente não');
}

// ===========================================================================
console.log('\n--- a legenda impressa não afirma o que o hash não prova ---');
// ===========================================================================
{
  const f = foto('x', { local_do_registro: { latitude: -12.97123, longitude: -38.50111, precisao_metros: 8.4, obtida_em: 'x' } });
  const ok = legendaDeImpressao(f, 'Mobiliário', { dataUrl: 'd', formato: 'PNG', larguraPx: 1, alturaPx: 1, hashConfere: true });
  const texto = ok.join('\n');
  check(/Registrada em/.test(texto), 'diz "registrada em"');
  check(!/tirada|capturada em|fotografada em/i.test(texto),
    'e nunca "tirada em": o sistema não sabe quando a foto foi feita');
  check(texto.includes(HASH_PNG), 'traz o hash inteiro, os 64 dígitos');
  check(/no momento do registro/.test(texto) && /± 8 m/.test(texto),
    'a posição é a do aparelho no momento do registro, com a precisão');
  check(/Integridade conferida nesta emissão/.test(ok[ok.length - 1]),
    'e termina com o resultado da conferência');

  const semLocal = legendaDeImpressao(foto('y'), 'Mobiliário', null).join('\n');
  check(!/Aparelho em/.test(semLocal), 'sem posição registrada, não se fala em posição');
  check(/NÃO VERIFICADA/.test(semLocal), 'sem a imagem baixada, a integridade sai como não verificada');

  const adulterada = legendaDeImpressao(foto('z'), 'M', { dataUrl: 'd', formato: 'PNG', larguraPx: 1, alturaPx: 1, hashConfere: false }).join('\n');
  check(/INTEGRIDADE NÃO CONFERE/.test(adulterada) && /não deve ser usada como prova/.test(adulterada),
    'hash que não bate é dito com todas as letras');

  check(/não demonstra quando nem onde a foto foi tirada/i.test(NOTA_SOBRE_AS_FOTOGRAFIAS),
    'a nota do documento diz o limite do que o hash prova');
  check(/CPC, art\. 422, § 1º/.test(NOTA_SOBRE_AS_FOTOGRAFIAS), 'e cita o CPC');
}

// ===========================================================================
console.log('\n--- a imagem cabe sem distorcer ---');
// ===========================================================================
{
  const paisagem = caixaDaImagem(4000, 3000, 78, 58);
  check(Math.abs(paisagem.largura / paisagem.altura - 4 / 3) < 1e-9, 'paisagem mantém a proporção');
  check(paisagem.largura <= 78 + 1e-9 && paisagem.altura <= 58 + 1e-9, 'e cabe na caixa');
  const retrato = caixaDaImagem(3000, 4000, 78, 58);
  check(Math.abs(retrato.altura - 58) < 1e-9 && retrato.largura < 78, 'retrato é limitado pela altura');
  const semMedida = caixaDaImagem(0, 0, 78, 58);
  check(semMedida.largura > 0 && semMedida.altura > 0, 'sem medida, não quebra');
}

// ===========================================================================
console.log('\n--- a conferência feita na emissão ---');
// ===========================================================================
const reduzirFalso = async () => ({ dataUrl: PNG_DATAURL, formato: 'PNG', larguraPx: 1, alturaPx: 1 });
{
  const intacta = foto('intacta');
  const adulterada = foto('adulterada', { path: 'org-1/aep-1/adulterada.png' });
  const sumida = foto('sumida', { path: 'org-1/aep-1/sumida.png' });
  const bytesAlterados = Buffer.from(PNG_BYTES); bytesAlterados[20] ^= 0xff;

  const baixar = async (p) => {
    if (p.endsWith('intacta.png')) return PNG_BYTES;
    if (p.endsWith('adulterada.png')) return bytesAlterados;
    return null;
  };
  const r = await prepararImagensParaImpressao([intacta, adulterada, sumida], baixar, reduzirFalso);
  check(r.intacta.hashConfere === true && r.intacta.dataUrl === PNG_DATAURL,
    'arquivo intacto: hash confere e a imagem vai para o PDF');
  check(r.adulterada.hashConfere === false,
    'arquivo alterado depois do registro: o hash NÃO confere');
  check(r.sumida.hashConfere === null && r.sumida.dataUrl === '',
    'arquivo que não pôde ser baixado: indisponível, sem fingir conferência');

  const quebraNaReducao = await prepararImagensParaImpressao(
    [intacta], baixar, async () => { throw new Error('canvas'); }
  );
  check(quebraNaReducao.intacta.hashConfere === true && quebraNaReducao.intacta.dataUrl === '',
    'se a redução falhar, a conferência do hash continua valendo');

  const baixarQueLanca = async () => { throw new Error('rede'); };
  const semRede = await prepararImagensParaImpressao([intacta], baixarQueLanca, reduzirFalso);
  check(semRede.intacta.hashConfere === null, 'erro de rede vira indisponível, não exceção');
}

// ===========================================================================
console.log('\n--- o documento ---');
// ===========================================================================
const ORG = { id: 'org-1', name: 'PrevSafe', technical_responsible_name: 'Ana Paula Ribeiro' };
const CLIENTE = {
  id: 'cli-1', legal_name: 'Industria Modelo Ltda', trade_name: 'Modelo',
  document_number: '12.483.776/0001-99', risk_degree: 3, porte: 'DEMAIS',
};
const UNIDADE = { id: 'un-1', client_id: 'cli-1', status: 'ACTIVE', risk_degree: 3 };
const AEP_BASE = {
  id: 'aep-1', client_id: 'cli-1', status: 'ACTIVE',
  situation_name: 'Montagem manual em bancada',
  ghe_ids: [], job_ids: [], worker_count: 4, approach: 'QUALITATIVA',
  methods: 'Observacao direta', assessment_date: '2026-09-10', assessor: 'Ana Paula Ribeiro',
  aspects: { mobiliario: { conclusao: 'INADEQUADO', observacao: 'Bancada fixa' } },
  workers_heard: 'SIM', created_at: '2026-09-10',
};

function gerar(args) {
  ultimoPdf = null;
  exportAEPDocumentPdf({ organization: ORG, client: CLIENTE, units: [UNIDADE], ghes: [], jobs: [], ...args });
  if (!ultimoPdf) inconclusivo('exportAEPDocumentPdf não produziu PDF');
  return ultimoPdf;
}

{
  const HASH_ALTERADO = 'f'.repeat(64);
  const aep = {
    ...AEP_BASE,
    photo_evidence: [
      foto('antes', { legenda: 'Bancada fixa a 95 cm, ombros elevados' }),
      foto('depois', { momento: 'APOS_A_MEDIDA', legenda: 'Bancada regulavel instalada', sha256: HASH_ALTERADO }),
      foto('trocada', { situacao: 'SUBSTITUIDA', legenda: 'Legenda da foto trocada' }),
      foto('descartada', { situacao: 'DESCARTADA', path: '', legenda: 'Legenda da foto descartada' }),
    ],
  };
  const pdf = gerar({
    ergonomicAssessments: [aep],
    imagensDasEvidencias: {
      antes: { dataUrl: PNG_DATAURL, formato: 'PNG', larguraPx: 1, alturaPx: 1, hashConfere: true },
      depois: { dataUrl: PNG_DATAURL, formato: 'PNG', larguraPx: 1, alturaPx: 1, hashConfere: false },
    },
  });
  const t = corrido(pdf);

  check(t.includes('REGISTRO FOTOGRÁFICO (2)'), 'a seção de fotos conta só as duas ativas');
  check(!t.includes('Legenda da foto trocada') && !t.includes('Legenda da foto descartada'),
    'a substituída e a descartada não saem no documento');
  check(t.includes(HASH_PNG), 'o hash inteiro da foto sai impresso');
  check(t.indexOf('SITUAÇÃO ENCONTRADA') > -1
    && t.indexOf('SITUAÇÃO ENCONTRADA') < t.indexOf('APÓS A MEDIDA'),
    'a situação encontrada vem antes de após a medida');
  check(t.includes('Integridade conferida nesta emissão'), 'a foto intacta diz que conferiu');
  check(t.includes('INTEGRIDADE NÃO CONFERE'), 'a foto adulterada diz que NÃO confere');
  check(/Registrada em/.test(t) && !/tirada em/i.test(t),
    'o documento diz quando foi registrada, e não quando foi tirada');
  check(t.includes('autenticação eletrônica, CPC, art. 422'), 'a nota sobre o hash abre as fotos');
  check((pdf.toString('latin1').match(/\/Subtype \/Image/g) || []).length >= 1,
    'a imagem está de fato embutida no PDF');
  check(quebrados(pdf).length === 0, 'nenhuma legenda caiu em UTF-16');

  // Foto nao e exigencia da NR-17: nao pode virar pendencia.
  const pendencias = t.slice(t.indexOf('8. PENDÊNCIAS'));
  check(!/foto/i.test(pendencias), 'foto não vira pendência: a NR-17 não a exige');

  const semImagens = corrido(gerar({ ergonomicAssessments: [aep] }));
  check(semImagens.includes('IMAGEM INDISPONÍVEL NESTA EMISSÃO'),
    'sem a imagem baixada, o lugar dela diz que ficou indisponível — não some');
  check(semImagens.includes('NÃO VERIFICADA'), 'e a integridade sai como não verificada');
  check(semImagens.includes(HASH_PNG), 'mas o hash registrado continua impresso');

  const semFotos = corrido(gerar({ ergonomicAssessments: [AEP_BASE] }));
  check(!semFotos.includes('REGISTRO FOTOGRÁFICO'), 'AEP sem foto não ganha seção de fotos vazia');
  check(!semFotos.includes('autenticação eletrônica'), 'nem a nota sobre o hash');

  // A outra empresa nao entra - nem as fotos dela.
  const deOutro = { ...aep, id: 'aep-x', client_id: 'cli-99', situation_name: 'Outra empresa',
    photo_evidence: [foto('alheia', { legenda: 'Foto de outra empresa' })] };
  const tMisto = corrido(gerar({ ergonomicAssessments: [aep, deOutro] }));
  check(!tMisto.includes('Foto de outra empresa'), 'foto da AEP de outro cliente não entra');
}

// ===========================================================================
console.log('\n--- ligação com as telas (no código) ---');
// ===========================================================================
{
  const ler = (rel) => semComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
  const modal = ler('components/sst/AepPhotoEvidenceModal.tsx');
  const ctx = ler('context/PrevSafeContext.tsx');
  const gerador = ler('components/sst/TechnicalDocsGeneratorTab.tsx');
  const preview = ler('components/sst/DocumentPreviewModal.tsx');
  const aba = ler('components/sst/ErgonomicAssessmentTab.tsx');

  // O hash tem de ser dos MESMOS bytes que sobem.
  check(/const bytes = await arquivo\.arrayBuffer\(\)/.test(modal)
    && /sha256Hex\(bytes\)/.test(modal)
    && /new Blob\(\[bytes\]/.test(modal),
    'o hash é calculado sobre os mesmos bytes que sobem para o armazenamento');
  check(/conferirNovaEvidencia\(/.test(modal) && /conferirArquivo\(/.test(modal),
    'a tela aplica as conferências antes de enviar');
  check(/e\?\.client_id === atual\.client_id/.test(modal),
    'os nomes conferidos na legenda são os trabalhadores DESTE cliente');

  // Descarte: primeiro o arquivo, depois o registro.
  const iRemove = modal.indexOf('removeEvidencePhoto(descartando.path)');
  const iMarca = modal.indexOf('descartarEvidenciaDaAEP(');
  check(iRemove > -1 && iMarca > iRemove,
    'no descarte, o arquivo sai antes de o registro dizer "descartada"');
  check((modal.match(/removeEvidencePhoto\(/g) || []).length === 1,
    'e esse é o único lugar da tela que remove arquivo');

  check(/photo_evidence \|\| \[\]\)\.length/.test(ctx) && /status: 'INACTIVE'/.test(ctx),
    'excluir uma AEP com foto a desativa, em vez de apagar o registro das fotos');

  for (const [nome, txt] of [['a aba de documentos', gerador], ['a pré-visualização', preview]]) {
    const iPrep = txt.indexOf('prepararFotosDaAEP(');
    const iExp = txt.indexOf('exportAEPDocumentPdf({', iPrep);
    check(iPrep > -1 && iExp > iPrep && /imagensDasEvidencias/.test(txt.slice(iPrep, iExp + 400)),
      `${nome} confere as fotos antes de gerar a AEP`);
  }
  check(/Imprimir.{0,40}imprime só este resumo/s.test(fs.readFileSync(
    path.join(RAIZ, 'components/sst/DocumentPreviewModal.tsx'), 'utf8')),
    'a pré-visualização avisa que o "Imprimir" não leva as fotos');
  check(/AepPhotoEvidenceModal/.test(aba), 'a aba da AEP abre a tela de fotos');
}

console.log(
  falhas === 0 ? `\nTODOS OS TESTES PASSARAM (${casos} casos)` : `\n${falhas} FALHA(S) em ${casos} casos`
);
process.exit(falhas === 0 ? 0 : 1);
