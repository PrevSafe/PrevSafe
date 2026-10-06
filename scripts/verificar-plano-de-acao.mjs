/**
 * Verificacao do plano de acao do PGR e do catalogo de riscos.
 *
 *   node scripts/verificar-plano-de-acao.mjs
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * O plano de acao era uma tabela calculada na hora do PDF: uma acao generica
 * por risco, o responsavel tecnico como responsavel e "Nao iniciada" como
 * status. E o catalogo de riscos gravava, no risco aplicado, o EPC
 * RECOMENDADO como se estivesse implantado e eficaz - o plano dizia "manter"
 * um controle que talvez nem existisse, e o S-2240 declarava EPC eficaz.
 *
 * O que este teste persegue (NR-01, subitens 1.5.5.1.2 a 1.5.5.3.2.1):
 *
 *   1. Sugestao nao e plano: so acao aceita, com responsavel, prazo,
 *      acompanhamento e afericao (1.5.5.2.2), sai como acao no PGR.
 *   2. O prazo segue a secao 5.7, inclusive a regra do numero de expostos
 *      (1.5.5.2.1.1); mudar o prazo de acao aceita exige motivo e guarda o
 *      original.
 *   3. Medida administrativa ou EPI exige a hipotese do 1.5.5.1.2; conclusao
 *      exige evidencia e informacao aos trabalhadores (1.5.5.3.1 e 1.5.5.1.3);
 *      eficacia exige afericao (1.5.5.3.2).
 *   4. O registro nao se apaga: acao aceita se descarta com motivo.
 *   5. O catalogo nao declara controle: o risco nasce sem EPC, e a
 *      recomendacao vira acao SUGERIDA.
 *   6. EPC so vira eficaz pelo plano, e o S-2240 so declara eficEpc=S com
 *      essa afericao (leiaute S-1.3, grupo [epcEpi]).
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
const TMP = path.join(RAIZ, '.tmp-plano-de-acao-verificacao');

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
      path.join(RAIZ, 'lib/planoDeAcao.ts'),
      path.join(RAIZ, 'lib/esocialDados.ts'),
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
const achar = (n) => [path.join(TMP, 'lib', n), path.join(TMP, n)].find((p) => fs.existsSync(p));

let plano, esocial;
try {
  plano = require_(achar('planoDeAcao.js'));
  esocial = require_(achar('esocialDados.js'));
} catch (e) {
  inconclusivo('não foi possível carregar os módulos compilados', e.message);
}

const {
  prazoDaClassificacao, sugestoesDoCatalogo, novaAcaoDoInventario, conferirAcao, faltasDaAcao,
  statusExibido, estaAtrasada, acoesDoPlano, efeitoNoRisco, exigeJustificativa, somarDias,
  FALTA_SEM_ACAO, FALTA_SUGESTAO_NAO_ACEITA
} = plano;
const { xmlDoEpcEpi, montarFatorDeRisco } = esocial;
const { classificarRisco } = require_(achar('classificacaoDeRisco.js'));

let casos = 0;
let falhas = 0;
const check = (ok, msg) => {
  casos++;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${msg}`);
};

/** Texto sem comentarios: a varredura procura a forma do defeito, nao a prosa. */
const semComentarios = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/gm, '$1')
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ');
const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');

/** Trecho de uma declaracao do contexto ate a proxima do mesmo nivel. */
function corpoDe(fonte, inicio) {
  const i = fonte.indexOf(inicio);
  if (i < 0) return '';
  const resto = fonte.slice(i + inicio.length);
  if (inicio.startsWith('export ')) {
    const fim = resto.search(/\nexport /);
    return inicio + (fim < 0 ? resto : resto.slice(0, fim));
  }
  const proximo = resto.search(/\n(export (async )?function |  const [A-Za-z0-9_]+ = (useCallback|useMemo)\(|  const [A-Za-z0-9_]+ = \()/);
  return inicio + (proximo < 0 ? resto : resto.slice(0, proximo));
}

// ===========================================================================
// Massa
// ===========================================================================
const HOJE = '2026-10-02';
const GHES = [
  { id: 'g1', code: 'GHE-01', name: 'Produção', client_id: 'c1' },
  { id: 'g2', code: 'GHE-02', name: 'Escritório', client_id: 'c1' },
];
const RUIDO = {
  id: 'r1', client_id: 'c1', ghe_id: 'g1', agent_name: 'Ruído contínuo', risk_category: 'FÍSICO',
  evaluation_type: 'QUANTITATIVA', severity: 4, probability: 3, epc_implemented: false, epc_effective: false,
};
const QUEDA = {
  id: 'r2', client_id: 'c1', ghe_id: 'g2', agent_name: 'Queda no mesmo nível', risk_category: 'ACIDENTES',
  evaluation_type: 'QUALITATIVA', severity: 4, probability: 3, epc_implemented: false, epc_effective: false,
};
const PSICO = {
  id: 'r3', client_id: 'c1', ghe_id: 'g2', agent_name: 'Fator psicossocial: Sobrecarga', risk_category: 'ERGONÔMICO',
  origin_psychosocial_factor: 'sobrecarga', origin_aep_id: 'aep1', severity: 3, probability: 3,
  epc_implemented: false, epc_effective: false,
};

/** Acao aceita e completa, a partir da qual cada caso tira uma coisa. */
const aceita = (extra = {}) => ({
  id: 'a-base', organization_id: 'org', client_id: 'c1', risk_id: 'r1', ghe_id: 'g1', origin: 'MANUAL',
  measure: 'Enclausurar o compressor', hierarchy: 'PROTECAO_COLETIVA', action_type: 'INTRODUZIR',
  responsible: 'Supervisor de manutenção', deadline: '2026-11-15', original_deadline: '2026-11-15',
  monitoring: 'Inspeção mensal', measurement: 'Nova dosimetria após a obra',
  status: 'NAO_INICIADA', accepted_at: '2026-10-01T12:00:00.000Z', accepted_by: 'Técnico',
  history: [], created_at: '2026-10-01T12:00:00.000Z', updated_at: '2026-10-01T12:00:00.000Z',
  ...extra,
});
const concluida = (extra = {}) => aceita({
  status: 'CONCLUIDA', completed_at: '2026-09-30', evidence: 'Fotos e nota fiscal da cabine',
  workers_informed_at: '2026-09-30', ...extra,
});

// ===========================================================================
// 1. PRAZO DA CLASSIFICACAO (secao 5.7)
// ===========================================================================
console.log('\n— prazo da classificação e número de expostos');
const alto = classificarRisco(4, 3); // 12: Alto, 90 dias
check(alto?.nivel === 'ALTO', 'a massa usa um risco Alto (S4 x P3)');
const p9 = prazoDaClassificacao(alto, 9, 100);
check(p9?.dias === 90 && p9.elevado === false, 'Alto com 9 expostos em 100: 90 dias, sem elevar');
const p10 = prazoDaClassificacao(alto, 10, 100);
check(p10?.nivel === 'MUITO_ALTO' && p10.dias === 30 && p10.elevado === true,
  'Alto com 10 expostos: prazo da faixa de cima (30 dias)');
const p20 = prazoDaClassificacao(alto, 2, 10);
check(p20?.elevado === true, 'Alto com 20% do efetivo exposto: sobe a faixa');
const p19 = prazoDaClassificacao(alto, 1, 6);
check(p19?.elevado === false, 'Alto com menos de 20% do efetivo: não sobe');
check(prazoDaClassificacao(classificarRisco(5, 5), 50, 50)?.nivel === 'MUITO_ALTO',
  'Muito alto não tem faixa acima');
check(prazoDaClassificacao(null, 50, 50) === null, 'sem classificação, sem prazo inventado');

// ===========================================================================
// 2. SUGESTOES
// ===========================================================================
console.log('\n— sugestões do catálogo e do inventário');
const ITEM = {
  id: 'cat-ruido', recommended_epcs: 'Enclausuramento acústico de máquinas ruidosas',
  recommended_epis: [{ name: 'Protetor tipo plug' }, { name: 'Protetor tipo concha' }],
};
const sug = sugestoesDoCatalogo(RUIDO, ITEM, '2026-12-31');
check(sug.length === 2, 'o catálogo sugere a proteção coletiva e o EPI');
check(sug.every((a) => a.status === 'SUGERIDA' && a.origin === 'CATALOGO' && a.origin_catalog_id === 'cat-ruido'),
  'as sugestões nascem SUGERIDAS, com a origem no catálogo');
check(sug.every((a) => !a.responsible && !a.accepted_at && !a.accepted_by),
  'nenhuma sugestão nasce com responsável ou aceite');
check(sug[0].hierarchy === 'PROTECAO_COLETIVA' && sug[1].hierarchy === 'EPI', 'coletiva primeiro, EPI depois (alínea "g" do 1.4.1)');
check(!sug[1].hierarchy_justification, 'a justificativa do EPI (1.5.5.1.2) fica para quem aceita: é um fato do local');
check(sugestoesDoCatalogo(RUIDO, { id: 'x', recommended_epcs: '', recommended_epis: [] }).length === 0,
  'catálogo sem recomendação não gera sugestão vazia');
const sugPsico = novaAcaoDoInventario(PSICO, null);
check(sugPsico.hierarchy === 'ADMINISTRATIVA' && /organização do trabalho/.test(sugPsico.measure)
  && /com os trabalhadores/.test(sugPsico.measure), 'fator psicossocial: organização do trabalho, com os trabalhadores');
check(sugPsico.status === 'SUGERIDA' && sugPsico.origin === 'INVENTARIO', 'sugestão do inventário nasce SUGERIDA');

// ===========================================================================
// 3. CONFERENCIA (o que a gravacao recusa)
// ===========================================================================
console.log('\n— conferência da gravação');
const ctx = { risco: RUIDO, hoje: HOJE };
check(conferirAcao(aceita(), ctx) === null, 'ação aceita e completa: grava');
check(conferirAcao({ ...sug[0] }, ctx) === null, 'sugestão incompleta grava como sugestão');
check(/responsável/.test(conferirAcao(aceita({ responsible: ' ' }), ctx) || ''), 'aceitar sem responsável: recusa (1.5.5.2.2)');
check(/prazo/.test(conferirAcao(aceita({ deadline: '' }), ctx) || ''), 'aceitar sem prazo: recusa');
check(/acompanhamento/.test(conferirAcao(aceita({ monitoring: '' }), ctx) || ''), 'aceitar sem forma de acompanhamento: recusa');
check(/aferição/.test(conferirAcao(aceita({ measurement: '' }), ctx) || ''), 'aceitar sem forma de aferição: recusa');
check(/1\.5\.5\.1\.2/.test(conferirAcao(aceita({ hierarchy: 'EPI' }), ctx) || ''), 'EPI sem a hipótese do 1.5.5.1.2: recusa');
check(conferirAcao(aceita({ hierarchy: 'EPI', hierarchy_justification: 'COMPLEMENTAR' }), ctx) === null,
  'EPI com a hipótese declarada: grava');
check(conferirAcao(aceita({ hierarchy: 'ADMINISTRATIVA' }), ctx) !== null,
  'medida administrativa para ruído sem justificativa: recusa');
check(conferirAcao(aceita({ risk_id: 'r3', hierarchy: 'ADMINISTRATIVA' }), { risco: PSICO, hoje: HOJE }) === null,
  'organização do trabalho para fator psicossocial não é exceção: grava sem justificativa');
check(exigeJustificativa('EPI', PSICO) === true, 'EPI exige justificativa até para fator psicossocial');
check(/evidência/.test(conferirAcao(concluida({ evidence: '' }), ctx) || ''), 'concluir sem evidência: recusa (1.5.5.3.1)');
check(/trabalhadores/.test(conferirAcao(concluida({ workers_informed_at: '' }), ctx) || ''),
  'concluir sem registrar a informação aos trabalhadores: recusa (1.5.5.1.3)');
check(/futura/.test(conferirAcao(concluida({ completed_at: '2026-12-01' }), ctx) || ''), 'conclusão com data futura: recusa');
const verificada = (extra = {}) => concluida({
  status: 'EFICACIA_VERIFICADA', effectiveness_checked_at: '2026-10-01',
  effectiveness_result: 'Dose de 78 dB(A), abaixo do nível de ação', ...extra,
});
check(conferirAcao(verificada(), ctx) === null, 'eficácia com data e resultado da aferição: grava');
check(/resultado/.test(conferirAcao(verificada({ effectiveness_result: '' }), ctx) || ''),
  'eficácia sem resultado da aferição: recusa (1.5.5.3.2)');
check(/anterior/.test(conferirAcao(verificada({ effectiveness_checked_at: '2026-09-01' }), ctx) || ''),
  'aferição antes da conclusão: recusa');

const anterior = aceita();
check(/motivo/.test(conferirAcao(aceita({ deadline: '2026-12-20' }), { ...ctx, anterior }) || ''),
  'mudar o prazo de ação aceita sem motivo: recusa');
check(conferirAcao(aceita({ deadline: '2026-12-20' }), { ...ctx, anterior, motivo: 'Fornecedor atrasou a cabine' }) === null,
  'mudar o prazo com motivo: grava');
check(conferirAcao(aceita({ status: 'SUGERIDA' }), { ...ctx, anterior }) !== null, 'ação aceita não volta a ser sugestão');
check(/motivo/.test(conferirAcao(aceita({ status: 'EM_ANDAMENTO' }), { ...ctx, anterior: concluida() }) || ''),
  'reabrir ação concluída sem motivo: recusa (1.5.5.3.2.1)');
check(/descart/.test(conferirAcao(aceita({ status: 'DESCARTADA' }), ctx) || ''), 'descartar sem motivo: recusa');
check(conferirAcao(aceita(), { ...ctx, anterior: aceita({ status: 'DESCARTADA', discard_reason: 'x' }) }) !== null,
  'ação descartada não se altera');

// ===========================================================================
// 4. FALTAS E STATUS
// ===========================================================================
console.log('\n— faltas e status como saem no PGR');
const prazo90 = prazoDaClassificacao(alto, 1, 100);
check(faltasDaAcao(aceita(), { risco: RUIDO, prazoDaFaixa: prazo90 }).length === 0, 'ação completa e no prazo: sem falta');
const foraDaFaixa = faltasDaAcao(aceita({ deadline: '2027-03-01', original_deadline: '2027-03-01' }),
  { risco: RUIDO, prazoDaFaixa: prazo90 });
check(foraDaFaixa.some((f) => /5\.7/.test(f)), 'prazo aceito além dos 90 dias da faixa: falta');
const prorrogada = aceita({ deadline: '2027-03-01', original_deadline: '2026-11-15' });
check(!faltasDaAcao(prorrogada, { risco: RUIDO, prazoDaFaixa: prazo90 }).some((f) => /5\.7/.test(f)),
  'prorrogação com motivo não é falta: a conferência usa o prazo original');
check(/prazo original 15\/11\/2026/.test(statusExibido(prorrogada, HOJE)), 'o status mostra o prazo original da prorrogada');
check(estaAtrasada(aceita({ deadline: '2026-09-01' }), HOJE) && statusExibido(aceita({ deadline: '2026-09-01' }), HOJE).startsWith('Atrasada'),
  'prazo vencido sem conclusão: "Atrasada"');
check(!estaAtrasada(concluida({ deadline: '2026-09-01' }), HOJE), 'concluída não fica atrasada');
check(faltasDaAcao(concluida({ evidence: '' }), { risco: RUIDO }).some((f) => /evidência/.test(f)),
  'concluída sem evidência gravada antes da regra: aparece como falta');
// Aceite as 23h de Brasilia = 02h UTC do dia seguinte. O limite conta do dia
// em Brasilia: 90 dias de 01/10 vai a 30/12, e um prazo em 30/12 nao e falta.
const aceiteNoturno = aceita({ accepted_at: '2026-10-02T02:00:00.000Z', deadline: '2026-12-30', original_deadline: '2026-12-30' });
check(!faltasDaAcao(aceiteNoturno, { risco: RUIDO, prazoDaFaixa: prazo90 }).some((f) => /5\.7/.test(f)),
  'o limite da faixa conta do dia do aceite em Brasília, não do dia UTC');
check(!faltasDaAcao(aceita({ accepted_at: '2026-10-02T02:00:00.000Z', deadline: '2026-12-31', original_deadline: '2026-12-31' }),
  { risco: RUIDO, prazoDaFaixa: prazo90 }).every((f) => !/5\.7/.test(f)), 'um dia além do limite é falta');
check(/15\/11\/2026|30\/09\/2026/.test(plano.registroDaConclusao(concluida())) && /nota fiscal/.test(plano.registroDaConclusao(concluida())),
  'o registro da conclusão leva data, evidência e a informação aos trabalhadores');

// ===========================================================================
// 5. O PLANO COMO SAI NO PGR
// ===========================================================================
console.log('\n— acoesDoPlano');
const expostos = (g) => (g === 'g1' ? 3 : 12);
const semNada = acoesDoPlano([RUIDO], GHES, expostos, { acoes: [], efetivo: 100, hoje: HOJE });
check(semNada.length === 1 && semNada[0].aceita === false && semNada[0].registro === null,
  'risco sem ação: uma linha, não aceita, sem registro');
check(semNada[0].responsavel === '' && semNada[0].prazo === '' && semNada[0].faltas[0] === FALTA_SEM_ACAO,
  'risco sem ação: nenhum responsável ou prazo inventado, e a falta explicada');

const sugGravadas = sugestoesDoCatalogo(RUIDO, ITEM, '2026-12-31').map((a, i) => ({
  ...a, id: `s${i}`, organization_id: 'org', history: [], created_at: `2026-10-01T10:0${i}:00Z`, updated_at: '',
}));
const soSug = acoesDoPlano([RUIDO], GHES, expostos, { acoes: sugGravadas, efetivo: 100, hoje: HOJE });
check(soSug.length === 2 && soSug.every((a) => !a.aceita && a.faltas[0] === FALTA_SUGESTAO_NAO_ACEITA),
  'só sugestões: saem como pendência');
check(soSug.every((a) => a.prazo === '' && a.responsavel === ''), 'o prazo SUGERIDO não sai como prazo do plano');
check(soSug[0].numero === 'R-GHE-01-01.1' && soSug[1].numero === 'R-GHE-01-01.2', 'numeração R-<GHE>-NN.k pela ordem de criação');

const aceitaGravada = aceita({ id: 'ac1', created_at: '2026-10-01T11:00:00Z' });
const descartada = aceita({ id: 'd1', status: 'DESCARTADA', discard_reason: 'Duplicada' });
const misto = acoesDoPlano([RUIDO], GHES, expostos, { acoes: [...sugGravadas, aceitaGravada, descartada], efetivo: 100, hoje: HOJE });
check(misto.length === 1 && misto[0].aceita && misto[0].registro?.id === 'ac1',
  'havendo ação aceita, só ela sai: sugestões e descartadas ficam fora');
check(misto[0].responsavel === 'Supervisor de manutenção' && misto[0].prazo === '2026-11-15',
  'responsável e prazo vêm do registro');

const outroCliente = aceita({ id: 'oc', risk_id: 'r-de-outro-cliente' });
check(acoesDoPlano([RUIDO], GHES, expostos, { acoes: [outroCliente], hoje: HOJE })[0].registro === null,
  'ação de risco de outro cliente não entra');

// Mesmo nivel (Alto): o GHE-02 tem 12 expostos e passa na frente.
const ordem = acoesDoPlano([RUIDO, QUEDA], GHES, expostos, { acoes: [], efetivo: 100, hoje: HOJE });
check(ordem[0].risco.id === 'r2' && ordem[0].prazoDaFaixa?.elevado === true,
  'mesmo nível: mais expostos primeiro, e com 10 ou mais a faixa sobe (5.7)');
check(ordem[1].id === 'R-GHE-01-01' && ordem[0].id === 'R-GHE-02-02', 'o número do risco continua sendo a ordem do inventário');

// ===========================================================================
// 6. EFEITO NO INVENTARIO
// ===========================================================================
console.log('\n— o plano atualiza o EPC do risco');
const efConcluida = efeitoNoRisco(RUIDO, [aceita()], [concluida()]);
check(efConcluida?.epc_implemented === true && efConcluida?.epc_effective === undefined,
  'proteção coletiva concluída: EPC implantado, eficácia ainda não');
check(efConcluida?.epc_description === 'Enclausurar o compressor', 'sem descrição no risco, a medida concluída a preenche');
const efVer = efeitoNoRisco(RUIDO, [concluida()], [verificada()]);
check(efVer?.epc_effective === true && efVer?.epc_implemented === true, 'eficácia aferida: EPC eficaz');
const efReab = efeitoNoRisco({ ...RUIDO, epc_implemented: true, epc_effective: true },
  [verificada()], [aceita({ status: 'EM_ANDAMENTO' })]);
check(efReab?.epc_effective === false && efReab?.epc_implemented === undefined,
  'medida reaberta por ineficácia: o EPC deixa de ser eficaz e continua implantado');
check(efeitoNoRisco(RUIDO, [], [verificada({ hierarchy: 'EPI', hierarchy_justification: 'COMPLEMENTAR' })]) === null,
  'EPI verificado não mexe no EPC');
check(efeitoNoRisco({ ...RUIDO, epc_implemented: true, epc_description: 'Cabine' }, [], [])
  === null, 'controle declarado no inventário sem ação no plano continua declarado');
const efPsico = efeitoNoRisco(PSICO, [], [verificada({ risk_id: 'r3', hierarchy: 'ADMINISTRATIVA' })]);
check(efPsico?.epc_effective === true, 'fator psicossocial: a medida na organização do trabalho é o controle');

// ===========================================================================
// 7. S-2240, GRUPO [epcEpi]
// ===========================================================================
console.log('\n— S-2240 [epcEpi] (leiaute S-1.3)');
const xml = (p) => xmlDoEpcEpi({ epcImplementado: false, epcEficaz: false, epiUtilizado: false, epiEficaz: false, cas: [], ...p });
const x0 = xml({});
check(/<utilizEPC>1<\/utilizEPC>/.test(x0) && !/<eficEpc>/.test(x0), 'sem EPC: utilizEPC 1 e sem eficEpc');
const x1 = xml({ epcImplementado: true });
check(/<utilizEPC>2<\/utilizEPC>/.test(x1) && /<eficEpc>N<\/eficEpc>/.test(x1),
  'EPC implantado e não aferido: utilizEPC 2, eficEpc N (antes saía "não implementa" ou ia sem eficEpc)');
check(/<eficEpc>S<\/eficEpc>/.test(xml({ epcImplementado: true, epcEficaz: true })), 'EPC aferido: eficEpc S');
check(!/<eficEpc>S/.test(xml({ epcImplementado: false, epcEficaz: true })), 'eficEpc só existe com utilizEPC 2');
const x2 = xml({ epiUtilizado: true, cas: ['12345', ' '] });
check(/<utilizEPI>2<\/utilizEPI>/.test(x2) && /<eficEpi>N<\/eficEpi>/.test(x2),
  'EPI entregue e não atestado: utilizado (2), eficEpi N — e não "não utilizado"');
check((x2.match(/<docAval>/g) || []).length === 1, 'só CA preenchido vira [epi]');
check(/<utilizEPI>1<\/utilizEPI>/.test(xml({})) && !/<eficEpi>/.test(xml({})), 'sem EPI: utilizEPI 1 e sem eficEpi');
check(!/dscEPI/.test(x2), 'nada fora do leiaute no grupo [epi]');

const fatorIncoerente = montarFatorDeRisco({
  ...RUIDO, risk_code_table_24: '02.01.001', epc_implemented: false, epc_effective: true, epis: [], epi_required: false,
}).fator;
check(fatorIncoerente.epc_effective === false && fatorIncoerente.epc_implemented === false,
  'EPC "eficaz" sem estar implantado não chega ao evento como eficaz');

// As duas montagens do S-2240 (pre-visualizacao e GHE) viraram uma so, em
// lib/esocialEventos.ts; o GHE passa pela montagem do contexto.
const ctxFonte = semComentarios(ler('context/PrevSafeContext.tsx'));
const eventosFonte = semComentarios(ler('lib/esocialEventos.ts'));
check(!/<utilizEPC>/.test(ctxFonte + eventosFonte) && !/<utilizEPI>/.test(ctxFonte + eventosFonte),
  'nenhuma montagem do S-2240 escreve [epcEpi] à mão');
const corpoDoGhe = (ctxFonte.match(/const generateS2240FromGhe = useCallback\(([\s\S]*?)\n  \}, \[/) || [])[1] || '';
check((eventosFonte.match(/xmlDoEpcEpi\(/g) || []).length === 1 && !/xmlDoEpcEpi\(/.test(ctxFonte)
  && /montarFatorDeRisco\(/.test(corpoDoGhe) && /generateESocialXmlPreview\(newEvt\)/.test(corpoDoGhe),
'o S-2240 da pré-visualização e o do GHE usam a mesma montagem, com xmlDoEpcEpi');
check(/const ausencia = codigo === CODIGO_AUSENCIA_DE_RISCO;/.test(eventosFonte)
  && /if \(!ausencia\) \{\s*const cas[\s\S]{0,300}xmlDoEpcEpi\(/.test(eventosFonte),
  'com 09.01.001 o [epcEpi] não vai (MOS S-2240, item 1.5)');

// ===========================================================================
// 8. CATALOGO E CONTEXTO
// ===========================================================================
console.log('\n— catálogo e contexto');
const aplicar = corpoDe(ctxFonte, 'const applyRisksToTargets = useCallback(');
check(aplicar.length > 0, 'achou applyRisksToTargets');
check(/epc_implemented:\s*false/.test(aplicar) && /epc_effective:\s*false/.test(aplicar)
  && !/epc_implemented:\s*true/.test(aplicar) && !/epc_effective:\s*true/.test(aplicar),
  'o risco aplicado do catálogo nasce sem EPC implantado nem eficaz');
check(!/epc_description:\s*catRisk\./.test(aplicar), 'a recomendação do catálogo não vira descrição de EPC existente');
check(/sugestoesDoCatalogo\(riskObj/.test(aplicar) && /setPgrActionPlan\(/.test(aplicar),
  'a recomendação do catálogo vira ação sugerida no plano');
check(!/epc_effective:\s*true/.test(ctxFonte), 'nenhum ponto do contexto grava EPC eficaz direto: só o plano (efeitoNoRisco)');

check(/'pgrActionPlan'/.test(semComentarios(ler('lib/supabaseSync.ts'))), 'o plano sincroniza com o servidor (pgrActionPlan)');

const add = corpoDe(ctxFonte, 'const addPgrActionPlanItem = useCallback(');
check(add.indexOf('conferirAcao(') > 0 && add.indexOf('conferirAcao(') < add.indexOf('setPgrActionPlan('),
  'cadastrar confere antes de gravar');
check(/client_id:\s*risco\.client_id/.test(add) && /ghe_id:\s*risco\.ghe_id/.test(add), 'cliente e GHE vêm do risco, não da tela');

const upd = corpoDe(ctxFonte, 'const updatePgrActionPlanItem = useCallback(');
check(upd.indexOf('conferirAcao(') > 0 && upd.indexOf('conferirAcao(') < upd.indexOf('setPgrActionPlan('),
  'atualizar confere antes de gravar');
check(/original_deadline:\s*anterior\.original_deadline/.test(upd) && /accepted_at:\s*anterior\.accepted_at/.test(upd)
  && /history:\s*anterior\.history/.test(upd), 'prazo original, aceite e histórico não se sobrescrevem pela tela');
check(/\.\.\.proposta\.history,/.test(upd), 'toda alteração acrescenta ao histórico (1.5.5.3.1)');
check(/aplicarEfeitoNoRisco\(/.test(upd) && /aplicarEfeitoNoRisco\(/.test(add), 'o plano leva a implantação e a eficácia ao inventário');
check(/eventos\.push\(registroDaConclusao\(proposta\)\)/.test(upd) && /eventos\.push\(registroDaAfericao\(proposta\)\)/.test(upd),
  'cada conclusão e cada aferição vão ao histórico: reabrir e concluir de novo não apaga a primeira');
check(/registroDaConclusao\(/.test(add), 'ação cadastrada já concluída registra a conclusão no histórico');
check(!/Hierarquia: de \$\{anterior\.hierarchy\}/.test(upd), 'o histórico grava o rótulo da hierarquia, não o código');

const del = corpoDe(ctxFonte, 'const deletePgrActionPlanItem = useCallback(');
check(/status !== 'SUGERIDA'/.test(del) && del.indexOf("status !== 'SUGERIDA'") < del.indexOf('prev.filter('),
  'só sugestão se apaga');
const delRisco = corpoDe(ctxFonte, 'const deleteEnvironmentalRisk = useCallback(');
check(/status: 'DESCARTADA'/.test(delRisco) && /discard_reason:/.test(delRisco),
  'excluir o risco descarta as ações aceitas, com o motivo, em vez de apagá-las');

const montar = corpoDe(ctxFonte, 'const montarAcaoDoPlano = useCallback(');
check(/accepted_at:\s*aceita \?/.test(montar), 'sugestão não nasce com data de aceite');

const sugerir = corpoDe(ctxFonte, 'const sugerirAcoesParaRiscosSemPlano = useCallback(');
check(/status !== 'DESCARTADA'/.test(sugerir) && /novaAcaoDoInventario\(/.test(sugerir),
  'sugerir alcança só risco sem ação, e cai na sugestão do inventário sem catálogo');

check(somarDias('2026-12-31', 1) === '2027-01-01' && somarDias('2026-02-28', 1) === '2026-03-01',
  'soma de dias atravessa mês e ano');

// ===========================================================================
console.log(`\n${casos - falhas}/${casos} casos OK`);
if (falhas > 0) {
  console.log(`${falhas} FALHA(S)`);
  process.exit(1);
}
console.log('Plano de ação: sugestão não é plano, prazo da classificação, registro que não se apaga, EPC eficaz só pelo plano.');
