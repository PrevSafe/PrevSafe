/**
 * Varre o codigo atras de dados inventados que possam voltar.
 *
 *   node scripts/verificar-dados-inventados.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * A auditoria encontrou dezenas de lugares onde o sistema preenchia um campo
 * que nao sabia: CNPJ 00.000.000/0001-00, CPF 123.456.789-00, CNAE
 * 25.11-0-00 com grau 3, "Eng. Eduardo Vasconcelos", ruido de 86.2 dB(A),
 * hash SHA-256 fixo. Cada um deles passou por revisao uma vez e foi aceito,
 * porque isolado parece um placeholder inofensivo. Dentro de um laudo
 * assinado ou de um evento eSocial, nao e.
 *
 * Um teste de comportamento nao pega isso: o valor inventado nao quebra nada,
 * so mente. O que pega e uma varredura pelo literal.
 *
 * COMO ADICIONAR UMA EXCECAO
 *
 * Placeholder de campo de formulario (o atributo `placeholder=`) e legitimo:
 * e o exemplo que o usuario ve no campo vazio, nao um valor gravado. Esses
 * sao ignorados automaticamente. Para o resto, inclua o caminho em PERMITIDO
 * com o motivo - por escrito, para a proxima pessoa poder discordar.
 *
 * Saida: 0 nada encontrado, 1 encontrou ocorrencia nova.
 */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..'
);

const PASTAS = ['app', 'components', 'context', 'lib', 'hooks'];
const EXTENSOES = new Set(['.ts', '.tsx']);

/** Literais que nao podem aparecer como valor no codigo. */
const PROIBIDOS = [
  { padrao: /00\.000\.000\/0001-00/, o_que: 'CNPJ de fachada' },
  { padrao: /000\.000\.000-00/, o_que: 'CPF de fachada' },
  { padrao: /123\.456\.789-0\d/, o_que: 'CPF de fachada' },
  { padrao: /234\.567\.890-\d\d/, o_que: 'CPF de fachada' },
  { padrao: /Eduardo Vasconcelos/, o_que: 'responsável técnico inventado' },
  { padrao: /Camila Bittencourt|Roberto Magalhães Filho/, o_que: 'médico inventado' },
  { padrao: /CREA-SP 5069812/, o_que: 'registro profissional inventado' },
  { padrao: /CRM-SP 145892|CRM-SP 98210/, o_que: 'CRM inventado' },
  { padrao: /86\.2 dB\(A\)/, o_que: 'medição de ruído inventada' },
  // O formulario de Novo Risco abria com um risco inteiro ja preenchido. O
  // inventario e a base do PGR, do LTCAT, do PPP e da insalubridade.
  { padrao: /84\.5|84,5 dB/, o_que: 'medição de ruído pré-preenchida no formulário' },
  { padrao: /Enclausuramento acústico de compressores/, o_que: 'medida de controle pré-preenchida' },
  { padrao: /Dosímetro de ruído integrador classe 1/, o_que: 'metodologia de medição pré-preenchida' },
  { padrao: /Exposição controlada com fornecimento e uso obrigatório de EPI eficaz/, o_que: 'conclusão de LTCAT pré-preenchida' },
  { padrao: /CA 14235/, o_que: 'número de CA inventado' },
  { padrao: /Trabalhador do GHE|Colaborador Extraído do (PGR|PCMSO)/, o_que: 'trabalhador inventado' },
  { padrao: /7f8a9e2d4c6b1a0f/, o_que: 'hash SHA-256 fixo' },
  { padrao: /AC CERTISIGN MULTIPLA G7/, o_que: 'emissor de certificado inventado' },
  // Fallbacks que preenchiam um campo desconhecido com um valor plausivel.
  { padrao: /ca_example:\s*\w+\s*\?[^:]*:\s*'/, o_que: 'número de CA usado como padrão' },
  { padrao: /ca_example:\s*'12345'/, o_que: 'número de CA inventado' },
  { padrao: /CA\s*12345/, o_que: 'número de CA inventado' },
  { padrao: /exam_code:\s*\w+\s*\?[^:]*:\s*'/, o_que: 'código da Tabela 27 usado como padrão' },
  // Defaults de CNAE e grau de risco: o grau define dimensionamento de SESMT
  // e de CIPA, entao um padrao aqui vira documento com enquadramento errado.
  { padrao: /\|\|\s*'(25\.11-0-00|41\.20-4-00)'/, o_que: 'CNAE usado como padrão' },
  { padrao: /=\s*'(25\.11-0-00|41\.20-4-00)'(?!\s*\))/, o_que: 'CNAE usado como padrão' },
  { padrao: /risk_degree\s*\|\|\s*[1-4]\b/, o_que: 'grau de risco usado como padrão' },
  { padrao: /riskDegree\s*\|\|\s*[1-4]\b/, o_que: 'grau de risco usado como padrão' },
];

/**
 * Onde o literal e legitimo. Cada entrada precisa de motivo.
 */
const PERMITIDO = [
  {
    arquivo: 'lib/nr4AnexoI.ts',
    motivo: 'é a própria tabela oficial do Anexo I da NR-04',
  },
  {
    arquivo: 'lib/nr4.ts',
    motivo: 'catálogo de classes CNAE com o grau que consta na norma',
  },
  {
    arquivo: 'lib/validacoesBr.ts',
    motivo: 'usa CPFs/CNPJs de dígitos repetidos como casos que devem ser recusados',
  },
  {
    arquivo: 'components/help-center/tutorialsData.ts',
    motivo: 'roteiro de tutorial: descreve uma tela de exemplo, não grava dado',
  },
  {
    arquivo: 'scripts/',
    motivo: 'os próprios testes citam os valores que estão proibindo',
  },
];

function permitido(rel) {
  const norm = rel.replace(/\\/g, '/');
  return PERMITIDO.find((p) => norm === p.arquivo || norm.startsWith(p.arquivo));
}

function* arquivos(dir) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === 'node_modules' || entrada.name.startsWith('.')) continue;
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      yield* arquivos(completo);
    } else if (EXTENSOES.has(path.extname(entrada.name))) {
      yield completo;
    }
  }
}

const achados = [];

for (const pasta of PASTAS) {
  const base = path.join(RAIZ, pasta);
  if (!fs.existsSync(base)) continue;

  for (const arquivo of arquivos(base)) {
    const rel = path.relative(RAIZ, arquivo);
    if (permitido(rel)) continue;

    const linhas = fs.readFileSync(arquivo, 'utf8').split('\n');

    // Um comentário que EXPLICA o valor removido não é uma ocorrência dele — e
    // esses comentários são justamente o registro do que foi corrigido, então
    // proibi-los apagaria a memória da correção.
    let dentroDeBloco = false;

    linhas.forEach((linha, i) => {
      const cru = linha.trim();
      const abre = linha.includes('/*');
      const fecha = linha.includes('*/');

      const eraBloco = dentroDeBloco;
      if (abre && !fecha) dentroDeBloco = true;
      else if (fecha) dentroDeBloco = false;

      if (eraBloco || cru.startsWith('*') || cru.startsWith('//') || (abre && !fecha)) return;

      const semComentario = linha.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
      // `placeholder="..."` é o exemplo exibido no campo vazio, não um valor.
      const semPlaceholder = semComentario.replace(/placeholder=(["'`])(?:(?!\1).)*\1/g, '');

      for (const { padrao, o_que } of PROIBIDOS) {
        if (padrao.test(semPlaceholder)) {
          achados.push({ rel, linha: i + 1, o_que, texto: linha.trim().slice(0, 110) });
        }
      }
    });
  }
}

if (achados.length === 0) {
  console.log('OK   nenhum dado inventado encontrado no código.');
  console.log(`     ${PROIBIDOS.length} padrões verificados em ${PASTAS.join(', ')}.`);
  process.exitCode = 0;
} else {
  console.log(`${achados.length} OCORRÊNCIA(S) DE DADO INVENTADO:\n`);
  for (const a of achados) {
    console.log(`  ${a.rel}:${a.linha}`);
    console.log(`    ${a.o_que}`);
    console.log(`    ${a.texto}\n`);
  }
  console.log('Se alguma for legítima, inclua o caminho em PERMITIDO com o motivo.');
  process.exitCode = 1;
}
