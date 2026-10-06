#!/usr/bin/env node
/**
 * Move o resultado de exame que esta dentro do cadastro do funcionario
 * (colecao employees) para a colecao examResults.
 *
 * POR QUE
 *
 * A RLS do Supabase separa por colecao. Enquanto resultado, observacao
 * clinica e restricao do ASO ficarem dentro de employees, qualquer conta da
 * organizacao os le pela API. A migracao
 * supabase/migrations/20261005120000_papel_saude_e_isolamento_de_clientes.sql
 * cria examResults (so SAUDE e ADMIN); este script leva para la o que ja
 * existe e deixa no cadastro so o que o ASO entregue ao empregador traz.
 *
 * USO
 *
 *   node scripts/migrar-resultados-de-exame.mjs              simulacao: le e conta, nao grava
 *   node scripts/migrar-resultados-de-exame.mjs --aplicar    grava, depois do backup
 *
 *   --org <id>             so esta organizacao
 *   --backup-dir <pasta>   onde gravar o backup (padrao: backups/migracao-resultados)
 *   --sem-esocial          nao tira o resultado copiado nos eventos S-2220
 *   --incluir-auditoria    tambem tira o dado clinico copiado na trilha de
 *                          auditoria (UPDATE_EMPLOYEE). Mexe em registro de
 *                          auditoria: decisao de quem responde por ela.
 *
 * Credenciais SO do ambiente, nunca deste arquivo nem do .env.local:
 *   SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY.
 * A service role passa pela RLS e pelo gatilho de employees (que so barra
 * conta de usuario).
 *
 * GARANTIAS
 *
 *   - Simulacao por padrao: sem --aplicar nada e gravado.
 *   - Backup JSON completo das linhas que vao mudar, gravado e relido ANTES da
 *     primeira gravacao. Sem backup confirmado, nada e gravado.
 *   - Idempotente: o id em examResults e deterministico
 *     (exres-<funcionario>-<aso>) e o resultado ja migrado sai do cadastro.
 *     Rodar de novo nao duplica; o que ja esta em examResults prevalece sobre
 *     o legado (pode ter sido editado pela Saude depois).
 *   - Gravacao condicionada: cada linha so e alterada se updated_at ainda for o
 *     lido. Se alguem gravou no meio, a linha fica para a proxima rodada, e o
 *     cadastro do funcionario so e limpo depois que os resultados dele estao
 *     em examResults.
 *   - A saida mostra so contagens: nenhum resultado, observacao ou restricao
 *     aparece no terminal.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const COLUNAS = 'organization_id, collection, record_id, data, updated_at, deleted_at';
const PAGINA = 1000;
export const AUTOR_DA_MIGRACAO = 'Migração do cadastro do funcionário (scripts/migrar-resultados-de-exame.mjs)';

// ---------------------------------------------------------------------------
// Regras puras (as mesmas do gatilho SQL e de lib/resultadosDeExame.ts)
// ---------------------------------------------------------------------------
const preenchido = (v) => v !== undefined && v !== null && String(v).trim() !== '';

/** O ASO (no formato antigo) carrega algum campo clinico? */
export function asoTemDadoClinico(aso) {
  if (!aso || typeof aso !== 'object') return false;
  if (preenchido(aso.restrictions_notes)) return true;
  if (aso.result === 'APTO_COM_RESTRICAO') return true;
  return (Array.isArray(aso.exams) ? aso.exams : [])
    .some((e) => e && (preenchido(e.result) || preenchido(e.observation)));
}

export function funcionarioTemDadoClinico(dados) {
  return (Array.isArray(dados?.aso_history) ? dados.aso_history : []).some(asoTemDadoClinico);
}

/** Copia sem os campos clinicos. Os demais campos ficam como estao. */
function exameSemDadoClinico(exame) {
  if (!exame || typeof exame !== 'object') return exame;
  const copia = { ...exame };
  delete copia.result;
  delete copia.observation;
  return copia;
}

function asoSemDadoClinico(aso) {
  if (!aso || typeof aso !== 'object') return aso;
  const copia = { ...aso };
  delete copia.restrictions_notes;
  if (copia.result === 'APTO_COM_RESTRICAO') copia.result = 'APTO';
  if (Array.isArray(copia.exams)) copia.exams = copia.exams.map(exameSemDadoClinico);
  return copia;
}

const idDosResultados = (funcionarioId, asoId) => `exres-${funcionarioId}-${asoId}`;

const chave = (r) => `${r.organization_id}|${r.collection}|${r.record_id}`;

/**
 * Planeja a migracao a partir das linhas lidas. Nao grava nada.
 *
 * Devolve, por funcionario, os registros de examResults a incluir ou fundir e
 * a nova versao do cadastro; e as limpezas de esocialEvents e auditLogs.
 */
export function planejar(linhas, opcoes = {}, agora = new Date().toISOString()) {
  const porChave = new Map(linhas.map((r) => [chave(r), r]));
  const resumo = {
    funcionarios_lidos: 0,
    funcionarios_com_dado_clinico: 0,
    asos_com_dado_clinico: 0,
    exames_com_resultado: 0,
    exames_com_observacao: 0,
    restricoes: 0,
    conclusoes_apto_com_restricao: 0,
    resultados_a_incluir: 0,
    resultados_a_fundir: 0,
    eventos_s2220_com_resultado: 0,
    auditorias_com_dado_clinico: 0,
  };
  const funcionarios = [];
  const limpezas = [];

  for (const linha of linhas.filter((r) => r.collection === 'employees')) {
    resumo.funcionarios_lidos++;
    const dados = linha.data || {};
    if (!funcionarioTemDadoClinico(dados)) continue;
    resumo.funcionarios_com_dado_clinico++;

    const resultados = [];
    const historico = dados.aso_history.map((aso, i) => {
      if (!asoTemDadoClinico(aso)) return aso;
      resumo.asos_com_dado_clinico++;

      // ASO ou exame sem id ganha um deterministico: na segunda rodada ele ja
      // esta gravado e o registro em examResults e o mesmo.
      const asoId = preenchido(aso.id) ? String(aso.id) : `aso-migrado-${i}`;
      const exames = (Array.isArray(aso.exams) ? aso.exams : []).map((e, j) =>
        e && typeof e === 'object' && !preenchido(e.id) ? { ...e, id: `exm-migrado-${i}-${j}` } : e
      );

      const itens = [];
      exames.forEach((e) => {
        if (!e || typeof e !== 'object') return;
        if (preenchido(e.result)) resumo.exames_com_resultado++;
        if (preenchido(e.observation)) resumo.exames_com_observacao++;
        if (!preenchido(e.result) && !preenchido(e.observation)) return;
        const item = { exam_id: String(e.id), exam_code_table_27: e.exam_code_table_27 || '' };
        if (preenchido(e.result)) item.result = e.result;
        if (preenchido(e.observation)) item.observation = String(e.observation);
        itens.push(item);
      });
      if (preenchido(aso.restrictions_notes)) resumo.restricoes++;
      if (aso.result === 'APTO_COM_RESTRICAO') resumo.conclusoes_apto_com_restricao++;

      const id = idDosResultados(linha.record_id, asoId);
      const existente = porChave.get(`${linha.organization_id}|examResults|${id}`) || null;
      const anterior = existente?.data || null;
      // Sem conclusao no ASO nao se inventa uma.
      const conclusao = ['APTO', 'INAPTO', 'APTO_COM_RESTRICAO'].includes(aso.result) ? aso.result : undefined;

      // O que ja esta em examResults prevalece: pode ter sido lancado ou
      // corrigido pela Saude depois. O legado so completa o que falta.
      const jaAnotados = new Set((Array.isArray(anterior?.results) ? anterior.results : []).map((r) => String(r?.exam_id)));
      const novo = {
        ...(anterior || {}),
        id,
        organization_id: anterior?.organization_id || linha.organization_id,
        client_id: anterior?.client_id || dados.client_id || '',
        employee_id: linha.record_id,
        aso_id: asoId,
        results: [
          ...(Array.isArray(anterior?.results) ? anterior.results : []),
          ...itens.filter((it) => !jaAnotados.has(it.exam_id)),
        ],
        created_at: anterior?.created_at || agora,
        updated_at: agora,
      };
      if (!anterior?.aso_result && conclusao) novo.aso_result = conclusao;
      if (!preenchido(anterior?.restrictions_notes) && preenchido(aso.restrictions_notes)) {
        novo.restrictions_notes = String(aso.restrictions_notes);
      }
      if (!anterior) {
        novo.recorded_by_name = AUTOR_DA_MIGRACAO;
        novo.migrated_from = 'employees';
      }
      if (existente) resumo.resultados_a_fundir++;
      else resumo.resultados_a_incluir++;

      resultados.push({
        organization_id: linha.organization_id,
        collection: 'examResults',
        record_id: id,
        // O registro de resultados acompanha o funcionario: excluido la,
        // excluido aqui.
        deleted_at: existente ? existente.deleted_at : (linha.deleted_at || null),
        data: novo,
        antes: existente,
      });

      return asoSemDadoClinico({ ...aso, id: asoId, ...(Array.isArray(aso.exams) ? { exams: exames } : {}) });
    });

    funcionarios.push({
      antes: linha,
      depois: { ...dados, aso_history: historico },
      resultados,
    });
  }

  if (!opcoes.semEsocial) {
    for (const linha of linhas.filter((r) => r.collection === 'esocialEvents')) {
      const exames = linha.data?.aso_data?.exams_list;
      if (!Array.isArray(exames)) continue;
      if (!exames.some((e) => e && typeof e === 'object' && ('result' in e || 'observation' in e))) continue;
      resumo.eventos_s2220_com_resultado++;
      limpezas.push({
        antes: linha,
        depois: { ...linha.data, aso_data: { ...linha.data.aso_data, exams_list: exames.map(exameSemDadoClinico) } },
      });
    }
  }

  if (opcoes.incluirAuditoria) {
    for (const linha of linhas.filter((r) => r.collection === 'auditLogs')) {
      const d = linha.data || {};
      const novo = { ...d };
      let mexeu = false;
      for (const campo of ['new_data', 'old_data']) {
        if (d[campo] && funcionarioTemDadoClinico(d[campo])) {
          novo[campo] = { ...d[campo], aso_history: d[campo].aso_history.map(asoSemDadoClinico) };
          mexeu = true;
        }
      }
      if (!mexeu) continue;
      resumo.auditorias_com_dado_clinico++;
      limpezas.push({ antes: linha, depois: novo });
    }
  }

  return { resumo, funcionarios, limpezas };
}

// ---------------------------------------------------------------------------
// Banco
// ---------------------------------------------------------------------------
async function lerLinhas(supabase, opcoes) {
  const colecoes = ['employees', 'examResults', 'esocialEvents'];
  if (opcoes.incluirAuditoria) colecoes.push('auditLogs');
  const linhas = [];
  for (let de = 0; ; de += PAGINA) {
    let consulta = supabase.from('prevsafe_records').select(COLUNAS).in('collection', colecoes);
    if (opcoes.org) consulta = consulta.eq('organization_id', opcoes.org);
    const { data, error } = await consulta
      .order('organization_id', { ascending: true })
      .order('collection', { ascending: true })
      .order('record_id', { ascending: true })
      .range(de, de + PAGINA - 1);
    if (error) throw new Error(`leitura: ${error.message}`);
    if (!data || data.length === 0) break;
    linhas.push(...data);
    if (data.length < PAGINA) break;
  }
  return linhas;
}

/** Altera a linha so se ninguem a gravou depois da leitura. true se alterou. */
async function atualizarSeIgual(supabase, linha, dados) {
  const { data, error } = await supabase
    .from('prevsafe_records')
    .update({ data: dados })
    .eq('organization_id', linha.organization_id)
    .eq('collection', linha.collection)
    .eq('record_id', linha.record_id)
    .eq('updated_at', linha.updated_at)
    .select('record_id');
  if (error) throw new Error(`${linha.collection}/${linha.record_id}: ${error.message}`);
  return Array.isArray(data) && data.length === 1;
}

function gravarBackup(plano, opcoes, projeto, agora) {
  const linhasAntes = [
    ...plano.funcionarios.flatMap((f) => [f.antes, ...f.resultados.map((r) => r.antes).filter(Boolean)]),
    ...plano.limpezas.map((l) => l.antes),
  ];
  const novos = plano.funcionarios.flatMap((f) => f.resultados.filter((r) => !r.antes).map((r) => ({
    organization_id: r.organization_id, collection: r.collection, record_id: r.record_id,
  })));
  const conteudo = {
    formato: 'prevsafe-migracao-resultados/v1',
    gerado_em: agora,
    projeto,
    opcoes,
    resumo: plano.resumo,
    // Restaurar = gravar de volta estas linhas e apagar as de `incluidos`.
    linhas_antes: linhasAntes,
    incluidos: novos,
  };
  fs.mkdirSync(opcoes.backupDir, { recursive: true });
  const arquivo = path.join(opcoes.backupDir, `migracao-resultados-${agora.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(arquivo, JSON.stringify(conteudo, null, 2), 'utf8');
  // Relido e conferido: um disco cheio ou um JSON truncado nao pode passar
  // como backup.
  const relido = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  if (!Array.isArray(relido.linhas_antes) || relido.linhas_antes.length !== linhasAntes.length) {
    throw new Error('o backup gravado nao confere com o que foi lido');
  }
  return { arquivo, linhas: linhasAntes.length };
}

/**
 * Roda a migracao. `supabase` e um cliente com service role (ou um falso, nos
 * testes). Devolve o resumo e o que foi gravado.
 */
export async function executar({ supabase, opcoes, projeto = '', log = console.log, agora = new Date().toISOString() }) {
  const linhas = await lerLinhas(supabase, opcoes);
  const plano = planejar(linhas, opcoes, agora);

  log(`Projeto: ${projeto || '(nao informado)'}${opcoes.org ? ` | organizacao ${opcoes.org}` : ''}`);
  log('Contagens (nenhum conteudo clinico e exibido):');
  Object.entries(plano.resumo).forEach(([k, v]) => log(`  ${k.padEnd(32)} ${v}`));
  if (!opcoes.incluirAuditoria) log('  (trilha de auditoria nao examinada: use --incluir-auditoria para incluir)');

  const pendentes = plano.funcionarios.length + plano.limpezas.length;
  const saida = { resumo: plano.resumo, gravados: { resultados: 0, funcionarios: 0, limpezas: 0 }, conflitos: [], backup: null };

  if (pendentes === 0) {
    log('Nada a migrar.');
    return saida;
  }
  if (!opcoes.aplicar) {
    log(`SIMULACAO: nada foi gravado. ${pendentes} linha(s) a alterar. Rode com --aplicar para gravar (o backup e feito antes).`);
    return saida;
  }

  saida.backup = gravarBackup(plano, opcoes, projeto, agora);
  log(`Backup gravado e conferido: ${saida.backup.arquivo} (${saida.backup.linhas} linha(s))`);

  for (const f of plano.funcionarios) {
    // Primeiro os resultados; o cadastro so e limpo se todos chegaram.
    let todos = true;
    for (const r of f.resultados) {
      if (r.antes) {
        const ok = await atualizarSeIgual(supabase, r.antes, r.data);
        if (!ok) { todos = false; saida.conflitos.push(`examResults/${r.record_id}`); continue; }
      } else {
        const { error } = await supabase.from('prevsafe_records').insert({
          organization_id: r.organization_id,
          collection: r.collection,
          record_id: r.record_id,
          data: r.data,
          deleted_at: r.deleted_at,
        });
        if (error) {
          // 23505: alguem criou o registro no meio. Fica para a proxima rodada,
          // que o funde.
          todos = false;
          saida.conflitos.push(`examResults/${r.record_id}`);
          continue;
        }
      }
      saida.gravados.resultados++;
    }
    if (!todos) {
      saida.conflitos.push(`employees/${f.antes.record_id} (cadastro mantido ate os resultados chegarem)`);
      continue;
    }
    if (await atualizarSeIgual(supabase, f.antes, f.depois)) saida.gravados.funcionarios++;
    else saida.conflitos.push(`employees/${f.antes.record_id}`);
  }

  for (const l of plano.limpezas) {
    if (await atualizarSeIgual(supabase, l.antes, l.depois)) saida.gravados.limpezas++;
    else saida.conflitos.push(`${l.antes.collection}/${l.antes.record_id}`);
  }

  log(`Gravado: ${saida.gravados.resultados} registro(s) em examResults, ${saida.gravados.funcionarios} cadastro(s) limpo(s), ${saida.gravados.limpezas} evento(s)/auditoria(s) limpo(s).`);
  if (saida.conflitos.length > 0) {
    log(`${saida.conflitos.length} linha(s) alterada(s) por outra pessoa durante a migracao ficaram para a proxima rodada. Rode o script de novo.`);
  }
  return saida;
}

// ---------------------------------------------------------------------------
// Linha de comando
// ---------------------------------------------------------------------------
export function lerOpcoes(argv) {
  const valor = (flag, padrao) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : padrao;
  };
  return {
    aplicar: argv.includes('--aplicar'),
    org: valor('--org', null),
    backupDir: path.resolve(valor('--backup-dir', path.join('backups', 'migracao-resultados'))),
    semEsocial: argv.includes('--sem-esocial'),
    incluirAuditoria: argv.includes('--incluir-auditoria'),
  };
}

/** Credenciais so do ambiente. */
export function credenciais(ambiente) {
  const url = ambiente.SUPABASE_URL || ambiente.NEXT_PUBLIC_SUPABASE_URL || '';
  const chave = ambiente.SUPABASE_SERVICE_ROLE_KEY || '';
  return url && chave ? { url, chave } : null;
}

async function principal() {
  const opcoes = lerOpcoes(process.argv.slice(2));
  const cred = credenciais(process.env);
  if (!cred) {
    console.error('Defina SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY no ambiente. O script nao le credencial de arquivo.');
    process.exit(1);
  }
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(cred.url, cred.chave, { auth: { persistSession: false } });
  let projeto = cred.url;
  try {
    projeto = new URL(cred.url).host;
  } catch {
    // URL fora do formato: mostra como veio.
  }
  try {
    const saida = await executar({ supabase, opcoes, projeto });
    process.exitCode = saida.conflitos.length > 0 ? 3 : 0;
  } catch (e) {
    console.error(`FALHA: ${e.message}`);
    process.exitCode = 1;
  }
}

const chamadoDireto = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (chamadoDireto) await principal();
