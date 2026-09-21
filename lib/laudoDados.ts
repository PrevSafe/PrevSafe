/**
 * Corpo dos laudos de insalubridade (NR-15) e de periculosidade (NR-16),
 * montado a partir do inventario de riscos real do cliente.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * Ate aqui os dois laudos saiam com linhas escritas no codigo. O laudo de
 * periculosidade, por exemplo, concluia sempre:
 *
 *     'GHE Manutencao Eletrica' / 'Anexo 4 (Energia Eletrica)' /
 *     'PERICULOSO (Gera Adicional de 30% sobre o salario-base)'
 *
 * O texto era identico para qualquer empresa - uma clinica de fisioterapia
 * recebia a mesma conclusao de uma subestacao. Laudo de periculosidade
 * fundamenta adicional salarial e vira prova em reclamacao trabalhista: um
 * documento que conclui pelo adicional sem olhar a situacao real e um passivo,
 * nao um servico.
 *
 * A REGRA QUE ESTE ARQUIVO APLICA
 *
 * Documento legal nao sai com dado inventado. Faltando o dado, o documento
 * declara que falta. Nenhuma funcao daqui deduz enquadramento: ela so reporta
 * o que esta registrado em SSTEnvironmentalRisk (`periculosidade_applies`,
 * `insalubridade_applies`, grau e fundamento legal) e aponta como pendencia
 * tudo o que o sistema nao tem - inclusive a avaliacao quantitativa, que a
 * NR-15 exige na maior parte dos anexos e que este sistema nao coleta.
 *
 * Quando nao ha base, a conclusao nao aparece. Nem a favor, nem contra.
 */

/** Uma tabela de laudo pronta para o autoTable, com o que falta declarado. */
export interface CorpoLaudo {
  /** Linhas da tabela de enquadramento. Vazio quando nao ha inventario. */
  linhas: string[][];
  /** Pendencias que precisam sair impressas no proprio PDF. */
  pendencias: string[];
  /** Paragrafos da conclusao. Sempre presentes, mesmo sem inventario. */
  conclusao: string[];
  /** Nao ha nenhum risco ativo registrado para o cliente. */
  inventarioVazio: boolean;
  /** Ha ao menos um enquadramento completo que sustenta adicional. */
  temCaracterizacao: boolean;
}

/**
 * Anexos da NR-16 citados como referencia normativa no rodape da tabela. E
 * texto da norma, nao dado do cliente - por isso pode ser fixo.
 */
export const ANEXOS_NR16 =
  'Anexos da NR-16: 1 - explosivos; 2 - inflamáveis; 3 - segurança pessoal ou patrimonial (violência física); ' +
  '4 - energia elétrica; 5 - motocicleta. Radiações ionizantes: Portaria MTb nº 518/2003 (art. 193, I, da CLT).';

/**
 * Limitacao comum aos dois laudos. O sistema guarda inventario de riscos, nao
 * inspecao pericial: quem assina precisa saber - e o leitor tambem - que o
 * documento nasce de um cadastro.
 */
const LIMITACAO_INVENTARIO =
  'Este laudo foi elaborado exclusivamente a partir do inventário de riscos registrado neste sistema. ' +
  'Não substitui a inspeção pericial no local de trabalho, exigida para a caracterização definitiva.';

const SEM_AVALIACAO_QUANTITATIVA =
  'O sistema não registra avaliação quantitativa (dosimetria, amostragem de agentes químicos, medição de ' +
  'calor ou vibração). A NR-15 condiciona a caracterização de insalubridade à comprovação da exposição acima ' +
  'do limite de tolerância na maior parte de seus anexos — a avaliação qualitativa basta apenas nos Anexos 13 ' +
  '(agentes químicos por inspeção) e 14 (agentes biológicos).';

/** Nome do GHE para a coluna da tabela, sem inventar identificacao. */
function nomeDoGhe(ghes: any[], gheId: string): string {
  const ghe = (ghes || []).find((g: any) => g?.id === gheId);
  if (!ghe) return 'GHE não vinculado';
  const partes = [ghe.code, ghe.name].map((p: any) => (p || '').toString().trim()).filter(Boolean);
  return partes.length > 0 ? partes.join(' — ') : 'GHE sem identificação';
}

/** Agente e fonte geradora, cada campo ausente declarado como ausente. */
function agenteEFonte(r: any): string {
  const agente = (r?.agent_name || '').toString().trim() || 'Agente não identificado';
  const codigo = (r?.risk_code_table_24 || '').toString().trim();
  const fonte = (r?.generating_source || '').toString().trim();
  return [
    codigo ? `${agente} (Tab. 24: ${codigo})` : `${agente} (código da Tabela 24 não informado)`,
    `Fonte geradora: ${fonte || 'não informada'}`
  ].join('\n');
}

/** Riscos ativos do cliente. Risco inativo nao entra em laudo vigente. */
function inventarioAtivo(risks: any[]): any[] {
  return (risks || []).filter((r: any) => r && r.status !== 'INACTIVE');
}

/** GHEs sem nenhum risco cadastrado: area nao avaliada, e o laudo diz isso. */
function ghesSemRisco(risks: any[], ghes: any[]): string[] {
  return (ghes || [])
    .filter((g: any) => g?.id && !(risks || []).some((r: any) => r?.ghe_id === g.id))
    .map((g: any) => nomeDoGhe(ghes, g.id));
}

/**
 * Corpo do laudo de periculosidade (NR-16).
 *
 * Caracteriza periculosidade apenas o risco que tem `periculosidade_applies`
 * marcado E fundamento legal (anexo da NR-16) registrado. Marcado sem
 * fundamento nao vira conclusao: vira pendencia, porque o adicional de 30% se
 * prende ao enquadramento em anexo especifico e nao a uma caixa de selecao.
 */
export function montarCorpoPericulosidade(risks: any[], ghes: any[]): CorpoLaudo {
  const inventario = inventarioAtivo(risks);

  if (inventario.length === 0) {
    return {
      linhas: [],
      pendencias: [
        'Inventário de riscos vazio: não há nenhum agente de risco registrado para este cliente.',
        'Sem inventário, nenhuma atividade ou operação pôde ser confrontada com os Anexos da NR-16.',
        'A delimitação das áreas de risco (planta ou layout do estabelecimento) não é registrada neste sistema.'
      ],
      conclusao: [
        'AVALIAÇÃO PERICIAL NÃO CONCLUÍDA — INVENTÁRIO DE RISCOS VAZIO.',
        'Não existe risco ocupacional registrado para este estabelecimento. Por isso não é possível afirmar ' +
        'nem negar a existência de atividades ou operações perigosas na forma do art. 193 da CLT.',
        'Este documento NÃO caracteriza periculosidade e NÃO fundamenta o pagamento do adicional de 30%. ' +
        'Para concluir a perícia é necessário registrar o inventário de riscos e realizar inspeção no local ' +
        'de trabalho, com delimitação das áreas de risco.',
        LIMITACAO_INVENTARIO
      ],
      inventarioVazio: true,
      temCaracterizacao: false
    };
  }

  const pendencias: string[] = [];
  const linhas: string[][] = [];
  const caracterizados: string[] = [];
  let incompletos = 0;

  inventario.forEach((r: any) => {
    const ghe = nomeDoGhe(ghes, r?.ghe_id);
    const marcado = r?.periculosidade_applies === true;
    const base = (r?.periculosidade_legal_basis || '').toString().trim();
    const local = (r?.generating_source || '').toString().trim();

    let anexo: string;
    let conclusao: string;

    if (marcado && base) {
      anexo = base;
      conclusao =
        'PERICULOSO — enquadramento registrado no inventário.\n' +
        'Adicional de 30% sobre o salário-base (art. 193, § 1º, da CLT), devido enquanto perdurar a exposição.';
      caracterizados.push(`${ghe} (${r?.agent_name || 'agente não identificado'} — ${base})`);
    } else if (marcado) {
      anexo = 'ANEXO DA NR-16 NÃO INFORMADO';
      conclusao =
        'ENQUADRAMENTO INCOMPLETO — o risco está marcado como perigoso, mas não há anexo da NR-16 registrado.\n' +
        'Conclusão pericial não firmada: este laudo NÃO caracteriza periculosidade para este agente.';
      incompletos++;
      pendencias.push(
        `${ghe} — "${r?.agent_name || 'agente não identificado'}" está marcado como perigoso sem o anexo da ` +
        'NR-16 correspondente. Informe o fundamento legal no cadastro do risco.'
      );
    } else {
      anexo = base ? `${base} (fundamento registrado sem enquadramento confirmado)` : 'Sem enquadramento registrado';
      conclusao = 'NÃO PERICULOSO — não há enquadramento em Anexo da NR-16 registrado para este agente.';
      if (base) {
        pendencias.push(
          `${ghe} — "${r?.agent_name || 'agente não identificado'}" tem fundamento legal de periculosidade ` +
          'preenchido, mas não está marcado como perigoso. Cadastro inconsistente: confirme qual é o correto.'
        );
      }
    }

    linhas.push([
      ghe,
      agenteEFonte(r),
      anexo,
      local || 'NÃO INFORMADO',
      conclusao
    ]);
  });

  const semRisco = ghesSemRisco(inventario, ghes);
  if (semRisco.length > 0) {
    pendencias.push(
      `GHEs sem nenhum risco cadastrado, portanto não periciados: ${semRisco.join('; ')}.`
    );
  }

  pendencias.push(
    'A delimitação das áreas de risco (planta ou layout, com raios e perímetros dos Anexos 1 e 2 da NR-16) ' +
    'não é registrada neste sistema e deve ser anexada pelo perito responsável.'
  );

  const temCaracterizacao = caracterizados.length > 0;
  const conclusao: string[] = [];

  if (temCaracterizacao) {
    conclusao.push(
      'PERICULOSIDADE CARACTERIZADA para os seguintes enquadramentos registrados no inventário de riscos: ' +
      `${caracterizados.join('; ')}.`
    );
    conclusao.push(
      'Para os trabalhadores expostos a essas atividades ou operações é devido o adicional de periculosidade ' +
      'de 30% sobre o salário-base, nos termos do art. 193, § 1º, da CLT.'
    );
  } else {
    conclusao.push(
      'NÃO HÁ CARACTERIZAÇÃO DE PERICULOSIDADE a partir do inventário de riscos registrado.'
    );
    conclusao.push(
      `Foram examinados ${inventario.length} agente(s) de risco registrado(s) e nenhum deles está enquadrado, ` +
      'de forma completa, em Anexo da NR-16. Este laudo NÃO fundamenta o pagamento do adicional de 30%.'
    );
  }

  if (incompletos > 0) {
    conclusao.push(
      `${incompletos} agente(s) estão marcados como perigosos sem o anexo da NR-16 correspondente. ` +
      'Enquanto o fundamento legal não for registrado, esses itens não sustentam conclusão pericial nem adicional.'
    );
  }

  conclusao.push(
    'A ausência de enquadramento no inventário não equivale a perícia negativa: só a inspeção no local de ' +
    'trabalho pode descaracterizar em definitivo a periculosidade.'
  );
  conclusao.push(LIMITACAO_INVENTARIO);

  return { linhas, pendencias, conclusao, inventarioVazio: false, temCaracterizacao };
}

/** Descricao da avaliacao: tipo, medicao e limite de tolerancia registrados. */
function avaliacaoDoRisco(r: any): { texto: string; quantitativa: boolean } {
  const tipo = (r?.evaluation_type || '').toString().trim().toUpperCase();
  const medicao = (r?.measured_value || '').toString().trim();
  const unidade = (r?.measurement_unit || '').toString().trim();
  const limite = (r?.tolerance_limit || '').toString().trim();
  const quantitativa = tipo === 'QUANTITATIVA' && medicao !== '';

  const linhaTipo = tipo
    ? (quantitativa ? 'Quantitativa' : tipo === 'QUANTITATIVA' ? 'Quantitativa sem valor medido' : 'Qualitativa')
    : 'Tipo de avaliação não informado';

  return {
    quantitativa,
    texto: [
      linhaTipo,
      `Medição: ${medicao ? `${medicao} ${unidade}`.trim() : 'não registrada'}`,
      `Limite de tolerância: ${limite || 'não informado'}`,
      `Metodologia: ${(r?.measurement_methodology || '').toString().trim() || 'não informada'}`
    ].join('\n')
  };
}

/**
 * Corpo do laudo de insalubridade (NR-15).
 *
 * O grau (10%, 20% ou 40%) so sai impresso quando ha enquadramento marcado,
 * grau registrado e anexo da NR-15 registrado. Falta qualquer um: o laudo diz
 * o que falta e nao fixa adicional. E a descaracterizacao tem o mesmo rigor -
 * "nao insalubre" so quando ha medicao quantitativa; sem ela o texto e "sem
 * enquadramento registrado", que e a verdade do cadastro.
 */
export function montarCorpoInsalubridade(risks: any[], ghes: any[]): CorpoLaudo {
  const inventario = inventarioAtivo(risks);

  if (inventario.length === 0) {
    return {
      linhas: [],
      pendencias: [
        'Inventário de riscos vazio: não há nenhum agente de risco registrado para este cliente.',
        'Sem inventário, nenhum agente pôde ser confrontado com os limites de tolerância dos Anexos da NR-15.',
        SEM_AVALIACAO_QUANTITATIVA
      ],
      conclusao: [
        'AVALIAÇÃO PERICIAL NÃO CONCLUÍDA — INVENTÁRIO DE RISCOS VAZIO.',
        'Não existe agente de risco registrado para este estabelecimento. Não é possível caracterizar nem ' +
        'descaracterizar a insalubridade na forma dos arts. 189 a 192 da CLT e da NR-15.',
        'Este documento NÃO fundamenta o pagamento de adicional de insalubridade em grau mínimo (10%), ' +
        'médio (20%) ou máximo (40%).',
        LIMITACAO_INVENTARIO
      ],
      inventarioVazio: true,
      temCaracterizacao: false
    };
  }

  const pendencias: string[] = [];
  const linhas: string[][] = [];
  const caracterizados: string[] = [];
  let incompletos = 0;
  let semQuantitativa = 0;

  inventario.forEach((r: any) => {
    const ghe = nomeDoGhe(ghes, r?.ghe_id);
    const marcado = r?.insalubridade_applies === true;
    const grau = (r?.insalubridade_degree || '').toString().trim();
    const base = (r?.insalubridade_legal_basis || '').toString().trim();
    const avaliacao = avaliacaoDoRisco(r);
    const nomeAgente = r?.agent_name || 'agente não identificado';

    let anexo: string;
    let conclusao: string;

    if (marcado && grau && base) {
      anexo = base;
      conclusao = `INSALUBRE — grau registrado: ${grau}.\nAdicional de ${grau} sobre a base de cálculo aplicável (art. 192 da CLT).`;
      caracterizados.push(`${ghe} (${nomeAgente} — ${base}, ${grau})`);
      if (!avaliacao.quantitativa) {
        conclusao += '\nPENDENTE DE AVALIAÇÃO QUANTITATIVA: sem medição registrada, o grau acima não está comprovado por este laudo.';
        semQuantitativa++;
      }
    } else if (marcado) {
      const faltando = [!grau ? 'grau de insalubridade' : '', !base ? 'anexo da NR-15' : ''].filter(Boolean).join(' e ');
      anexo = base || 'ANEXO DA NR-15 NÃO INFORMADO';
      conclusao =
        `ENQUADRAMENTO INCOMPLETO — falta ${faltando}.\n` +
        'Conclusão pericial não firmada: este laudo NÃO fixa adicional para este agente.';
      incompletos++;
      pendencias.push(
        `${ghe} — "${nomeAgente}" está marcado como insalubre sem ${faltando}. Complete o cadastro do risco.`
      );
    } else if (avaliacao.quantitativa) {
      anexo = base || 'Sem enquadramento registrado';
      conclusao =
        'NÃO INSALUBRE — há avaliação quantitativa registrada e o agente não está enquadrado em Anexo da NR-15.';
    } else {
      anexo = base || 'Sem enquadramento registrado';
      conclusao =
        'SEM ENQUADRAMENTO REGISTRADO — não há avaliação quantitativa que permita caracterizar nem ' +
        'descaracterizar a insalubridade deste agente.';
      semQuantitativa++;
    }

    linhas.push([ghe, agenteEFonte(r), anexo, avaliacao.texto, conclusao]);
  });

  const semRisco = ghesSemRisco(inventario, ghes);
  if (semRisco.length > 0) {
    pendencias.push(`GHEs sem nenhum risco cadastrado, portanto não periciados: ${semRisco.join('; ')}.`);
  }

  if (semQuantitativa > 0) {
    pendencias.push(
      `${semQuantitativa} agente(s) sem avaliação quantitativa registrada. ` + SEM_AVALIACAO_QUANTITATIVA
    );
  }

  const temCaracterizacao = caracterizados.length > 0;
  const conclusao: string[] = [];

  if (temCaracterizacao) {
    conclusao.push(
      'INSALUBRIDADE CARACTERIZADA para os seguintes enquadramentos registrados no inventário de riscos: ' +
      `${caracterizados.join('; ')}.`
    );
    conclusao.push(
      'O adicional indicado acompanha o grau registrado para cada agente. Havendo mais de um agente insalubre ' +
      'para o mesmo trabalhador, aplica-se apenas o de grau mais elevado, vedada a cumulação (item 15.3 da NR-15).'
    );
  } else {
    conclusao.push('NÃO HÁ CARACTERIZAÇÃO DE INSALUBRIDADE a partir do inventário de riscos registrado.');
    conclusao.push(
      `Foram examinados ${inventario.length} agente(s) de risco registrado(s) e nenhum deles está enquadrado, ` +
      'de forma completa, em Anexo da NR-15. Este laudo NÃO fundamenta adicional de 10%, 20% ou 40%.'
    );
  }

  if (incompletos > 0) {
    conclusao.push(
      `${incompletos} agente(s) estão marcados como insalubres sem grau ou sem anexo da NR-15. ` +
      'Enquanto o cadastro não for completado, esses itens não sustentam conclusão pericial nem adicional.'
    );
  }

  if (semQuantitativa > 0) {
    conclusao.push(SEM_AVALIACAO_QUANTITATIVA);
  }

  conclusao.push(LIMITACAO_INVENTARIO);

  return { linhas, pendencias, conclusao, inventarioVazio: false, temCaracterizacao };
}
