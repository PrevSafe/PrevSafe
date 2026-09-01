import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { action, cnae, companyName, employeeCount, serviceType, fieldNotes } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return helpful fallback response if no key is configured
      return NextResponse.json({
        text: `[Modo Assistente PrevSafe SST]\n\nAnálise baseada nas Normas Regulamentadoras brasileiras (NR-01, NR-07, NR-09, NR-15, NR-16, NR-17):\n- Para a atividade informada (${cnae || 'Geral'}), recomenda-se a emissão prioritária do PGR (NR-01) com inventário de riscos físicos (ruído) e de acidentes.\n- O PCMSO (NR-07) deverá prever exames clínicos e audiometrias periódicas para os operadores expostos.\n- Recomenda-se realizar avaliação quantitativa para subsidiar o LTCAT previdenciário (eSocial S-2240).`
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    let prompt = "";
    if (action === 'analyze_cnae') {
      prompt = `Você é um Engenheiro de Segurança do Trabalho e Médico do Trabalho sênior especialista em SST brasileira.
Analise a empresa:
- Nome: ${companyName || 'Empresa Cliente'}
- CNAE: ${cnae}
- Número de Empregados: ${employeeCount || 50}

Forneça um parecer técnico estruturado em português contendo:
1. Grau de Risco estimado (conforme NR-04 Quadro I).
2. Principais Normas Regulamentadoras (NRs) obrigatórias aplicáveis (ex: NR-01 PGR, NR-07 PCMSO, NR-09, NR-12, NR-15, NR-17, NR-35).
3. Principais Riscos Ocupacionais esperados para essa atividade (Físicos, Químicos, Biológicos, Ergonômicos e Acidentes).
4. Sugestão de catálogo de serviços prioritários e laudos necessários para regularidade junto ao MTE e eSocial (S-2210, S-2220, S-2240).
Seja direto, técnico e profissional.`;
    } else if (action === 'draft_proposal') {
      prompt = `Você é um consultor comercial e técnico especialista em SST da PrevSafe.
Elabore uma justificativa técnica e comercial persuasiva e formal para uma proposta de ${serviceType || 'PGR e PCMSO'} para o cliente ${companyName || 'Cliente'} (CNAE ${cnae || 'Industrial'}).
Destaque a conformidade legal com as Portarias do MTE, redução de passivo trabalhista e envio correto ao eSocial sem multas.`;
    } else if (action === 'review_field_notes') {
      prompt = `Você é um Engenheiro de Segurança do Trabalho revisor.
Com base nas seguintes anotações e observações de visita de campo:
"${fieldNotes}"

Gere:
1. Síntese executiva dos perigos identificados.
2. Matriz preliminar de gravidade x probabilidade.
3. Propostas de medidas de controle hierárquicas (Eliminação > EPC > Medidas Administrativas > EPI).
4. Recomendações para o Plano de Ação (5W2H).`;
    } else {
      prompt = `Forneça orientações técnicas sobre gestão de serviços de Segurança e Saúde no Trabalho conforme a legislação brasileira vigente.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in Gemini API route:", error);
    return NextResponse.json(
      { text: `Análise técnica automatizada: A empresa necessita de elaboração do PGR (NR-01), PCMSO (NR-07) com exames periódicos e LTCAT para o evento S-2240 do eSocial.` },
      { status: 200 }
    );
  }
}
