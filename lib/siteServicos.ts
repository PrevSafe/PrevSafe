/**
 * Catalogo padrao de servicos do site.
 *
 * Existe para o site nunca nascer vazio: enquanto nada for cadastrado na
 * administracao, estas paginas ja respondem com conteudo real e indexavel.
 * Assim que um servico do mesmo slug for publicado pela tela de administracao,
 * ele passa a ter precedencia — o conteudo editavel sempre vence o padrao.
 */

export interface ServicoPadrao {
  slug: string;
  titulo: string;
  resumo: string;
  icone: string;
  norma: string;
  paraQuem: string;
  entregaveis: string[];
  prazo: string;
  conteudo: string;
}

export const SERVICOS_PADRAO: ServicoPadrao[] = [
  {
    slug: 'pgr-programa-de-gerenciamento-de-riscos',
    titulo: 'PGR — Programa de Gerenciamento de Riscos',
    resumo:
      'O documento base da NR-01. Identifica os riscos de cada função, classifica a gravidade e define o plano de ação com prazo e responsável.',
    icone: 'ShieldCheck',
    norma: 'NR-01',
    paraQuem: 'Obrigatório para praticamente toda empresa com empregado registrado.',
    prazo: 'Primeira versão em 15 a 30 dias após a visita técnica',
    entregaveis: [
      'Inventário de riscos por GHE (grupo homogêneo de exposição)',
      'Matriz de risco com probabilidade e severidade',
      'Plano de ação 5W2H com prazos e responsáveis',
      'Documento assinado por responsável técnico habilitado',
    ],
    conteudo: `## O que é o PGR

O Programa de Gerenciamento de Riscos é a espinha dorsal da NR-01. Ele parte de uma pergunta simples: a que riscos cada trabalhador desta empresa está exposto, e o que está sendo feito a respeito?

Não é um documento de gaveta. O PGR precisa refletir a operação real — as máquinas que existem, os produtos que são manipulados, o barulho que o setor produz.

## Quem precisa ter

Praticamente toda empresa com empregado registrado. A dispensa é restrita: microempresas e empresas de pequeno porte com grau de risco 1 ou 2 que, após avaliação, não identifiquem riscos ocupacionais.

Na dúvida, o grau de risco vem do CNAE principal, pela tabela da NR-04.

## O que entregamos

O inventário de riscos organizado por GHE, a matriz de classificação e o plano de ação com prazo e responsável para cada medida. Tudo assinado por profissional habilitado, com ART quando aplicável.

## Como conduzimos

Começa com visita técnica ao local. Medimos o que precisa ser medido — ruído, agentes químicos, calor — e registramos os riscos com foto e localização. O documento sai do que foi observado, não de um modelo genérico.

> O PGR tem validade de até 2 anos, ou 3 anos para empresas que adotem o programa de melhoria. Mas ele precisa ser revisado sempre que houver mudança nos processos, acidente grave ou alteração relevante de risco.`,
  },
  {
    slug: 'pcmso-programa-de-controle-medico',
    titulo: 'PCMSO — Programa de Controle Médico de Saúde Ocupacional',
    resumo:
      'O programa de saúde da NR-07. Define quais exames cada função exige, com que periodicidade, e acompanha a aptidão de cada colaborador.',
    icone: 'Stethoscope',
    norma: 'NR-07',
    paraQuem: 'Toda empresa que admite trabalhadores, independentemente do porte.',
    prazo: 'Elaboração em 10 a 20 dias, a partir do PGR',
    entregaveis: [
      'Programa assinado por médico do trabalho coordenador',
      'Quadro de exames por função e periodicidade',
      'Controle de ASO com alerta de vencimento',
      'Relatório analítico anual',
    ],
    conteudo: `## O que é o PCMSO

Se o PGR mapeia os riscos, o PCMSO cuida das pessoas expostas a eles. Ele define quais exames cada função exige, quando devem ser repetidos e o que fazer quando algum resultado sai alterado.

## A ligação com o PGR

O PCMSO não existe sozinho. Ele parte do inventário de riscos: quem trabalha exposto a ruído faz audiometria; quem manipula solventes faz exames específicos. Um PCMSO desconectado do PGR costuma pedir exames demais para uns e de menos para outros.

## ASO e prazos

O Atestado de Saúde Ocupacional acompanha admissão, mudança de função, retorno ao trabalho, exame periódico e demissão. Perder o prazo do periódico é uma das não conformidades mais comuns — e das mais fáceis de evitar com acompanhamento.

## O que fica no sistema

Cada ASO emitido fica registrado com data de validade e alerta automático de vencimento. O evento S-2220 sai do mesmo registro, sem redigitação.`,
  },
  {
    slug: 'ltcat-aposentadoria-especial',
    titulo: 'LTCAT — Laudo Técnico das Condições Ambientais',
    resumo:
      'O laudo que fundamenta a aposentadoria especial e o enquadramento no eSocial. Define quem tem direito e a que alíquota a empresa está sujeita.',
    icone: 'FileCheck2',
    norma: 'Legislação previdenciária',
    paraQuem: 'Empresas com trabalhadores expostos a agentes nocivos.',
    prazo: '15 a 25 dias, com medições ambientais',
    entregaveis: [
      'Laudo técnico com medições e metodologia',
      'Enquadramento por GHE e código GFIP',
      'Base para o evento S-2240 do eSocial',
      'Parecer sobre aposentadoria especial',
    ],
    conteudo: `## Para que serve o LTCAT

O LTCAT responde a uma pergunta de consequência financeira direta: os trabalhadores desta empresa estão expostos a agentes nocivos em nível que dê direito à aposentadoria especial?

A resposta define a alíquota do adicional que a empresa recolhe e o enquadramento que vai no eSocial.

## Por que medição importa

Enquadramento por estimativa não se sustenta. O laudo precisa de medição feita com equipamento calibrado e metodologia reconhecida — NHO da Fundacentro, normalmente.

Um laudo sem base de medição é o tipo de documento que não resiste a questionamento, seja do INSS ou da Justiça do Trabalho.

## A conexão com o S-2240

O enquadramento do LTCAT alimenta diretamente o evento S-2240 do eSocial. Quando os dois divergem, a inconsistência aparece — e costuma aparecer tarde.`,
  },
  {
    slug: 'laudos-insalubridade-periculosidade',
    titulo: 'Laudos de Insalubridade e Periculosidade',
    resumo:
      'Avaliação técnica que define se há direito a adicional, em que grau, e com qual fundamentação — para pagar o correto, nem a mais nem a menos.',
    icone: 'FileCheck2',
    norma: 'NR-15 e NR-16',
    paraQuem: 'Empresas com dúvida sobre adicionais ou em discussão trabalhista.',
    prazo: '10 a 20 dias',
    entregaveis: [
      'Laudo de insalubridade com grau (10%, 20% ou 40%)',
      'Laudo de periculosidade com enquadramento legal',
      'Medições e metodologia documentadas',
      'Parecer técnico fundamentado',
    ],
    conteudo: `## O custo de errar nos dois sentidos

Pagar adicional que não é devido é dinheiro que sai todo mês sem necessidade. Não pagar o que é devido vira passivo — com correção e juros, normalmente descoberto numa reclamação trabalhista.

O laudo resolve a dúvida com base técnica.

## Insalubridade

Avaliada pela NR-15, com anexos específicos para ruído, calor, agentes químicos, biológicos e outros. O grau — 10%, 20% ou 40% — depende do agente e da intensidade.

Um ponto que gera confusão: EPI eficaz, comprovadamente fornecido e utilizado, pode neutralizar a insalubridade. Mas "eficaz" e "comprovadamente" carregam exigências que muita empresa não cumpre na prática.

## Periculosidade

Regida pela NR-16, com hipóteses mais fechadas: inflamáveis, explosivos, energia elétrica, radiação, segurança patrimonial e motocicleta. O adicional é de 30% sobre o salário base, sem gradação.`,
  },
  {
    slug: 'esocial-eventos-sst',
    titulo: 'eSocial — Eventos de SST',
    resumo:
      'Envio e monitoramento dos eventos S-2210, S-2220 e S-2240, a partir dos documentos que já produzimos. Sem redigitação e sem pendência acumulada.',
    icone: 'Send',
    norma: 'Portaria MTP 672/2021',
    paraQuem: 'Todo empregador obrigado ao eSocial.',
    prazo: 'Contínuo, dentro dos prazos legais de cada evento',
    entregaveis: [
      'S-2210 — Comunicação de Acidente de Trabalho',
      'S-2220 — Monitoramento da Saúde (ASO)',
      'S-2240 — Condições Ambientais do Trabalho',
      'Acompanhamento de recibos e rejeições',
    ],
    conteudo: `## O problema que o eSocial cria

Os eventos de SST têm prazo próprio e dependem de informação que nasce em outro lugar: o ASO vem do PCMSO, o enquadramento ambiental vem do LTCAT, a CAT vem do acidente.

Quando cada um desses vive numa planilha diferente, o envio vira digitação — e digitação gera divergência.

## Como resolvemos

Os eventos são gerados a partir dos próprios registros. O ASO lançado no sistema vira S-2220 com os mesmos dados. O GHE do inventário de riscos vira S-2240.

## Prazos que pegam

- **S-2210 (CAT):** até o primeiro dia útil seguinte ao acidente; imediatamente em caso de óbito.
- **S-2220 (ASO):** até o dia 15 do mês seguinte.
- **S-2240:** até o dia 15 do mês seguinte ao início da exposição, e sempre que houver alteração.

A rejeição é o que mais acumula sem ninguém notar: o evento sai, volta com erro, e fica parado.`,
  },
  {
    slug: 'treinamentos-e-cipa',
    titulo: 'Treinamentos Normativos e CIPA',
    resumo:
      'Treinamentos exigidos pelas NRs e condução do processo eleitoral da CIPA, da convocação à posse, com toda a documentação.',
    icone: 'HardHat',
    norma: 'NR-05, NR-06, NR-35 e demais',
    paraQuem: 'Empresas com obrigação de treinamento ou de constituir CIPA.',
    prazo: 'Conforme calendário acordado',
    entregaveis: [
      'Treinamentos com certificado e lista de presença',
      'Processo eleitoral completo da CIPA',
      'Atas, convocação e documentação de posse',
      'Controle de reciclagem por vencimento',
    ],
    conteudo: `## Treinamento não é formalidade

Treinamento sem registro adequado é como se não tivesse acontecido. Em caso de acidente, a ausência de comprovação pesa contra a empresa — e a lista de presença sem conteúdo programático, carga horária e qualificação do instrutor costuma não sustentar.

## O que fazemos

Conduzimos os treinamentos exigidos pelas normas aplicáveis à sua operação, com material, avaliação e certificado. Cada participação fica registrada com data de vencimento da reciclagem.

## CIPA

Para empresas obrigadas a constituir CIPA, conduzimos o processo eleitoral inteiro: convocação, inscrição de candidatos, votação com garantia de sigilo, apuração, ata e posse.

A Lei 14.457/2022 acrescentou o módulo sobre prevenção e combate ao assédio, que também é conduzido.`,
  },
];

export function buscarServicoPadrao(slug: string): ServicoPadrao | undefined {
  return SERVICOS_PADRAO.find(s => s.slug === slug);
}
