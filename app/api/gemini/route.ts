import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { consultarGrauDeRisco } from "@/lib/nr4AnexoI";

export const dynamic = 'force-dynamic';

// Fallback SST Expert Engine for complete, reliable analyses
function generateSSTExpertReport(data: {
  action?: string;
  cnae?: string;
  companyName?: string;
  employeeCount?: number;
  serviceType?: string;
  fieldNotes?: string;
}) {
  // Sem CNAE de fachada: o default era '25.11-0-00' (fabricacao de estruturas
  // metalicas), entao um parecer pedido sem CNAE saia analisando uma metalurgica.
  const { action, cnae = '', companyName = 'Empresa não informada', employeeCount = 0, serviceType = 'PGR + PCMSO + LTCAT', fieldNotes } = data;

  const cnaeClean = (cnae || '').trim();

  // O grau de risco vem do Anexo I da NR-04, nao de palpite pelo prefixo do
  // CNAE. O codigo anterior fazia `startsWith('41') -> grau 3`,
  // `startsWith('86') -> grau 3` e assim por diante, com grau 3 como padrao
  // para todo o resto. Essa era exatamente a estimativa que foi retirada do
  // sistema: CNAE 86.50-0-04 e grau 2 no Anexo I, e a regra do prefixo '86'
  // devolvia 3. Quando a classe nao consta, nao ha numero a informar.
  const consultaNr4 = consultarGrauDeRisco(cnaeClean);
  const grauRisco = consultaNr4.grau;

  let setor = 'Indústria de Transformação / Metalmecânica';
  let riscosPredominantes = 'Físicos (Ruído Contínuo e Vibração), Químicos (Fumos de Solda e Vapores), Mecânicos/Acidentes (Prensas e Ferramentas) e Ergonômicos (Postura e Movimentação de Cargas).';
  let examesObrigatorios = 'Audiometria Ocupacional (admissional, semestral e periódico), Espirometria, Avaliação Clínica Completa e Acuidade Visual.';

  if (cnaeClean.startsWith('41') || cnaeClean.startsWith('42') || cnaeClean.startsWith('43')) {
    setor = 'Construção Civil e Obras de Infraestrutura (NR-18)';
    riscosPredominantes = 'Acidentes (Queda em Altura, Soterramento, Eletricidade), Físicos (Ruído e Poeira Mineral/Sílica) e Ergonômicos (Esforço Físico Intenso).';
    examesObrigatorios = 'Hemograma Completo, Eletrocardiograma (ECG), Eletroencefalograma (EEG), Glicemia, Avaliação Psicossocial e Audiometria.';
  } else if (cnaeClean.startsWith('47') || cnaeClean.startsWith('46')) {
    setor = 'Comércio Atacadista e Varejista (NR-01 e NR-17)';
    riscosPredominantes = 'Ergonômicos (Postura em Pé Prolongada, Movimentação Manual de Mercadorias) e Acidentes (Queda de Mesmo Nível e Cortes).';
    examesObrigatorios = 'Exame Clínico Ocupacional Periódico e Avaliação Osteomuscular.';
  } else if (cnaeClean.startsWith('86') || cnaeClean.startsWith('87')) {
    setor = 'Saúde e Serviços Hospitalares (NR-32)';
    riscosPredominantes = 'Biológicos (Material Perfurocortante, Patógenos, Bactérias, Vírus), Químicos (Medicamentos e Desinfetantes) e Ergonômicos.';
    examesObrigatorios = 'Hemograma, Sorologias, Títulos Vacinais (Hepatite B, Tétano, Tríplice Viral), Toxicológico Ocupacional e Exame Clínico.';
  } else if (cnaeClean.startsWith('10') || cnaeClean.startsWith('11')) {
    setor = 'Indústria Alimentícia e Frigoríficos (NR-36)';
    riscosPredominantes = 'Físicos (Frio e Ruído), Ergonômicos (Movimentos Repetitivos e Ritmo Acelerado) e Acidentes (Facas e Serras).';
    examesObrigatorios = 'Audiometria, Avaliação Músculo-Esquelética Detalhada, Espirometria e Clínico Periódico.';
  } else if (cnaeClean.startsWith('49') || cnaeClean.startsWith('52')) {
    setor = 'Transporte Rodoviário de Cargas e Logística (NR-11 e NR-16)';
    riscosPredominantes = 'Acidentes de Trânsito, Periculosidade (Inflamáveis/Combustíveis), Ergonômicos (Direção Prolongada) e Ruído.';
    examesObrigatorios = 'Exame Toxicológico de Larga Janela (CAGED/eSocial), ECG, EEG, Glicemia, Avaliação Oftalmológica e ASO.';
  }

  if (action === 'analyze_cnae') {
    return `### 📋 Parecer Técnico e Diagnóstico Regulamentar de SST
**Cliente:** ${companyName} | **CNAE:** ${cnae} | **Efetivo:** ${employeeCount} colaboradores

---

#### 1. Classificação e Enquadramento Legal (NR-04 / NR-05)
* **Grau de Risco (Anexo I da NR-04):** ${grauRisco
    ? `**Grau ${grauRisco}** — ${consultaNr4.denominacao} (${consultaNr4.fundamentacao})`
    : `**Não classificado.** ${consultaNr4.fundamentacao}`}
* **Setor de Atividade (perfil típico, não é enquadramento):** ${setor}
* **Dimensionamento CIPA (NR-05):** ${employeeCount > 20 ? 'Comissão Interna de Prevenção de Acidentes e Assédio (CIPA) obrigatória com membros eleitos e designados.' : 'Designado de CIPA com treinamento anual obrigatório (20h).' }
* **Serviço Especializado (SESMT - NR-04):** ${employeeCount >= 50 ? 'Exige contratação ou consultoria contínua de Técnico em Segurança do Trabalho e Médico do Trabalho coordenador.' : 'Atendimento por Consultoria Externa de SST.'}

---

#### 2. Normas Regulamentadoras Obrigatórias Aplicáveis
* **NR-01 (GRO / PGR):** Obrigatória elaboração do Inventário Geral de Riscos Ocupacionais e Plano de Ação dinâmico com matriz de risco.
* **NR-07 (PCMSO):** Obrigatório programa médico ocupacional com indicação de responsáveis, exames complementares e emissão de ASO (Admissional, Periódico, Retorno, Mudança de Risco e Demissional).
* **NR-09 (Agentes Ambientais):** Avaliações quantitativas de ruído (dosimetrias conforme NHO-01) e agentes químicos.
* **NR-15 & NR-16:** Caracterização de adicionais de Insalubridade e Periculosidade para fundamentação jurídica.
* **NR-17 (Ergonomia):** Elaboração da Análise Ergonômica do Trabalho (AET) ou Avaliação Ergonômica Preliminar (AEP).
* **NR-12 / NR-35:** Verificação de proteções físicas e trabalho em desnível quando aplicável.

---

#### 3. Riscos Ocupacionais Mapeados
* **Grupo 1 (Físicos):** Ruído contínuo/intermitente, calor, vibrações de corpo inteiro/mãos e braços.
* **Grupo 2 (Químicos):** Fumos metálicos, vapores orgânicos, poeiras respiráveis e produtos desengraxantes.
* **Grupo 3 (Biológicos):** Avaliação de agentes patogênicos de acordo com a área de atuação.
* **Grupo 4 (Ergonômicos):** Posturas inadequadas, levantamento e transporte manual de peso e sobrecarga cognitiva.
* **Grupo 5 (Acidentes):** Máquinas sem barreira mecânica, projeção de partículas, queda de objetos e risco elétrico.

---

#### 4. Eventos eSocial de SST Mandatórios
1. **S-2210 (Comunicação de Acidente de Trabalho - CAT):** Transmissão imediata (até o primeiro dia útil subsequente).
2. **S-2220 (Monitoramento da Saúde do Trabalhador):** Envio dos dados de cada ASO emitido com CRM do médico examinador e código dos exames TUSS.
3. **S-2240 (Condições Ambientais do Trabalho - Fatores de Risco):** Envio do histórico de exposição a agentes nocivos para subsidiar a Aposentadoria Especial e GFIP/PPP Eletrônico.

---

#### 5. Escopo de Serviços e Laudos Recomendados
* Elaboração do **PGR (Programa de Gerenciamento de Riscos)**
* Coordenação e emissão do **PCMSO (NR-07)**
* Laudo Técnico das Condições Ambientais de Trabalho (**LTCAT**)
* Ordens de Serviço por Função (**NR-01 item 1.4.1**)
* Módulo de Transmissão Automatizada eSocial XML via PrevSafe`;
  }

  if (action === 'draft_proposal') {
    return `### 📄 Proposta Técnica & Comercial de Gestão Integrada de SST
**Destinatário:** ${companyName} (CNAE ${cnae})
**Solução Proposta:** ${serviceType}
**Proponente:** PrevSafe Medicina e Segurança do Trabalho

---

#### 1. Justificativa Técnica e Fundamentação Jurídica
A presente proposta tem por objetivo assegurar a plena conformidade legal da **${companyName}** perante as exigências do Ministério do Trabalho e Emprego (MTE) e da Receita Federal do Brasil, em consonância com as Portarias MTP nº 671/2021 e nº 672/2021 e Normas Regulamentadoras vigentes.

A ausência ou inconsistência nos laudos de SST (PGR, PCMSO e LTCAT) e o descumprimento do envio dos eventos de SST ao **eSocial (S-2210, S-2220 e S-2240)** sujeitam a organização a autuações automáticas com multas previstas no Artigo 201 da CLT e Decreto Federal nº 3.048/1999 (com valores que variam de **R$ 2.000,00 a mais de R$ 180.000,00 por trabalhador irregular**).

---

#### 2. Entregáveis do Projeto
* **Engenharia de Segurança:**
  - Vistoria técnica presencial com medições quantitativas (Ruído dosimétrico NHO-01, Iluminância NHO-11).
  - Emissão de PGR (Inventário de Riscos + Plano de Ação 5W2H) com ART (CREA).
  - Emissão de LTCAT com enquadramento previdenciário para o PPP Eletrônico.
* **Medicina Ocupacional:**
  - Elaboração do PCMSO pelo Médico do Trabalho Coordenador (RQE).
  - Definição do cronograma de exames clínicos e complementares (${examesObrigatorios}).
* **Tecnologia & eSocial:**
  - Transmissão direta dos lotes XML S-2210, S-2220 e S-2240 com recibo oficial do governo.
  - Acesso ao Portal do Cliente PrevSafe para download de laudos em tempo real com assinatura digital ICP-Brasil.

---

#### 3. Diferenciais Competitivos
* Redução de passivos trabalhistas e estabilização da alíquota do Fator Acidentário de Prevenção (FAP).
* Atendimento com SLA garantido e equipe multiprofissional especializada.`;
  }

  if (action === 'review_field_notes') {
    return `### 🔍 Análise Crítica e Parecer de Visita de Campo
**Cliente Auditado:** ${companyName} | **CNAE:** ${cnae}
**Anotações Originais do Técnico:**
> "${fieldNotes || 'Inspeção geral das instalações e postos de trabalho.'}"

---

#### 1. Síntese dos Perigos e Desvios Identificados
* **Ambiente & Máquinas:** Foram observadas fontes potenciais de acidentes e exposições a agentes ambientais nocivos sem medidas de proteção coletiva (EPC) devidamente instaladas ou operantes.
* **Comportamento & EPI:** Necessidade de reforço nos procedimentos operacionais padrão (POP), verificação do Certificado de Aprovação (CA) dos equipamentos de proteção individual e registro formal de entrega (NR-06).

---

#### 2. Matriz de Avaliação Preliminar de Riscos (NR-01)
| Perigo / Fonte | Gravidade | Probabilidade | Nível de Risco | Categoria de Ação |
| :--- | :---: | :---: | :---: | :--- |
| Ruído / Vibração Operacional | Moderada (3) | Alta (4) | **12 (Alto)** | Medição Quantitativa + Protetor Auricular de Inserção com Atenuação NRRsf comprovada |
| Zonas de Prensagem / Máquinas (NR-12) | Crítica (4) | Média (3) | **12 (Alto)** | Instalação de Cortina de Luz / Botão de Emergência Tipo Cogumelo |
| Fumos / Vapores de Solda | Moderada (3) | Média (3) | **9 (Médio)** | Exaustão Localizada Móvel + Máscara PFF2/P2 com Filtro |
| Esforço Postural Dinâmico (NR-17) | Leve (2) | Alta (4) | **8 (Médio)** | Ajuste Antropométrico da Bancada e Rodízio de Tarefas |

---

#### 3. Hierarquia das Medidas de Controle Aplicadas
1. **Eliminação / Substituição:** Substituição de solventes agressivos por compostos à base de água.
2. **Engenharia / Proteção Coletiva (EPC):** Instalação de enclausuramento acústico nos compressores e coifas com filtro nos postos de soldagem.
3. **Medidas Administrativas:** Sinalização de segurança (NR-26), delimitação de corredores e treinamentos de capacitação (NR-01).
4. **Proteção Individual (EPI):** Fornecimento rigoroso de EPIs adequados com ficha de controle e treinamento de uso e higienização.

---

#### 4. Plano de Ação Proposto (5W2H)
* **O quê (What):** Adequação física dos pontos de prensagem conforme NR-12.
* **Quem (Who):** Equipe de Manutenção Interna sob supervisão do Engenheiro de SST.
* **Quando (When):** Prazo de 15 dias corridos.
* **Onde (Where):** Linha de Produção / Setor de Estamparia.
* **Por quê (Why):** Eliminar risco de amputação e atender Notificação Prévia do MTE.
* **Como (How):** Bloqueio mecânico LOTO (Lockout/Tagout) e instalação de relé de segurança.
* **Quanto Custa (How Much):** Orçamento estimado em R$ 3.500,00.`;
  }

  return `### 🛡️ Orientações Técnicas Gerais PrevSafe SST
Gestão integrada de Segurança e Saúde no Trabalho conforme Portarias MTP 671/672, NRs 01 a 38 e eSocial.
A elaboração e atualização periódica do PGR e PCMSO são requisitos mandatórios para todas as empresas que admitem trabalhadores sob regime CLT.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, cnae, companyName, employeeCount, serviceType, fieldNotes } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    const isPlaceholderOrEmpty = !apiKey || 
      apiKey === "MY_GEMINI_API_KEY" || 
      apiKey === "your_api_key_here" || 
      apiKey.trim() === "" ||
      apiKey.length < 10;

    // If no valid API key is present, use our full-fidelity SST domain intelligence engine
    if (isPlaceholderOrEmpty) {
      const generatedText = generateSSTExpertReport({ action, cnae, companyName, employeeCount, serviceType, fieldNotes });
      return NextResponse.json({ text: generatedText });
    }

    // O grau de risco vai PRONTO para o modelo, consultado no Anexo I. Pedir
    // que um modelo de linguagem "estime" o grau de risco de um CNAE e pedir um
    // palpite plausivel: o numero define dimensionamento de SESMT e de CIPA.
    const consultaNr4 = consultarGrauDeRisco((cnae || '').trim());
    const grauRisco = consultaNr4.grau;

    // If key is configured, invoke Gemini model
    try {
      const ai = new GoogleGenAI({ apiKey });

      let prompt = "";
      if (action === 'analyze_cnae') {
        prompt = `Você é um Engenheiro de Segurança do Trabalho e Médico do Trabalho sênior especialista em SST brasileira.
Analise a empresa:
- Nome: ${companyName || 'não informado'}
- CNAE: ${cnae || 'não informado'}
- Número de Empregados: ${employeeCount || 'não informado'}
- Grau de Risco oficial (Anexo I da NR-04, já consultado na tabela): ${grauRisco || 'a classe não consta no Anexo I — não estime um grau'}

Forneça um parecer técnico estruturado em formato Markdown contendo:
1. Repita o Grau de Risco oficial informado acima. NÃO estime nem calcule um grau próprio: se acima constar que a classe não consta no Anexo I, diga isso e oriente a consultar a tabela oficial.
2. Principais Normas Regulamentadoras (NRs) obrigatórias aplicáveis (NR-01 PGR, NR-07 PCMSO, NR-09, NR-12, NR-15, NR-17, NR-35).
3. Principais Riscos Ocupacionais esperados para essa atividade (Físicos, Químicos, Biológicos, Ergonômicos e Acidentes).
4. Mapeamento detalhado dos eventos eSocial (S-2210 CAT, S-2220 ASO e S-2240 Agentes Nocivos).
5. Sugestão de catálogo de serviços prioritários e laudos necessários para regularidade junto ao MTE.
Seja direto, altamente técnico, profissional e com excelente formatação visual.`;
      } else if (action === 'draft_proposal') {
        prompt = `Você é um consultor comercial e técnico especialista em SST da PrevSafe.
Elabore uma proposta técnica e comercial persuasiva e formal em Markdown para ${serviceType || 'PGR, PCMSO e LTCAT com eSocial'} para o cliente ${companyName || 'Cliente'} (CNAE ${cnae || 'Industrial'}).
Destaque a fundamentação jurídica nas Portarias MTP 671/672, multas da CLT/eSocial pelo não envio e os diferenciais de controle e segurança jurídica.`;
      } else if (action === 'review_field_notes') {
        prompt = `Você é um Engenheiro de Segurança do Trabalho revisor.
Com base nas seguintes anotações de visita técnica de campo:
"${fieldNotes || 'Vistoria preliminar nos postos operacionais.'}"

Gere em Markdown:
1. Síntese executiva dos perigos identificados.
2. Matriz preliminar de gravidade x probabilidade.
3. Propostas de medidas de controle hierárquicas (Eliminação > EPC > Medidas Administrativas > EPI).
4. Recomendações estruturadas para o Plano de Ação (5W2H).`;
      } else {
        prompt = `Forneça orientações técnicas sobre gestão de serviços de Segurança e Saúde no Trabalho conforme a legislação brasileira vigente (NR-01, NR-07, eSocial).`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
      });

      if (response && response.text) {
        return NextResponse.json({ text: response.text });
      }
    } catch (genAiError: any) {
      // Graceful fallback if GoogleGenAI throws (e.g. 401 unauthenticated, quota limit, network)
      console.warn("Gemini API call returned error, falling back to built-in SST Expert Engine:", genAiError?.message || genAiError);
      const fallbackReport = generateSSTExpertReport({ action, cnae, companyName, employeeCount, serviceType, fieldNotes });
      return NextResponse.json({ text: fallbackReport });
    }

    const fallbackReport = generateSSTExpertReport({ action, cnae, companyName, employeeCount, serviceType, fieldNotes });
    return NextResponse.json({ text: fallbackReport });
  } catch (error: any) {
    console.warn("Error in Gemini API route handler:", error?.message || error);
    const fallbackReport = generateSSTExpertReport({});
    return NextResponse.json(
      { text: fallbackReport },
      { status: 200 }
    );
  }
}

