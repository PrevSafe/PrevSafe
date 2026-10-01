/**
 * Plano de acao do PGR: uma acao por risco do inventario.
 *
 * Saiu de dentro do gerador do PGR para que o relatorio de fatores
 * psicossociais mostre AS MESMAS acoes, com os mesmos numeros. Duas copias da
 * mesma regra divergem; um recorte que diverge do PGR e pior que nenhum.
 *
 * Tipo da acao (subitem 1.5.5.2.1 da NR-01: introduzir, aprimorar ou manter):
 * introduzir quando nao ha controle, aprimorar quando o controle existe mas a
 * eficacia nao foi verificada, manter quando esta implementado e verificado.
 */
import { classificarRisco, RiscoClassificado } from '@/lib/classificacaoDeRisco';
import { ehRiscoPsicossocial, PREFIXO_DO_RISCO } from '@/lib/psicossocial';

export interface AcaoDoPlano {
  risco: any;
  /** R-<codigo do GHE>-<ordem do risco no inventario do cliente>. */
  id: string;
  gheNome: string;
  classificado: RiscoClassificado | null;
  expostos: number;
  tipo: 'Introduzir' | 'Aprimorar' | 'Manter';
  medida: string;
  hierarquia: string;
}

/**
 * As acoes, ordenadas pela prioridade da classificacao.
 *
 * `riscosDoCliente` na ordem do inventario: o numero R-... vem dessa ordem, e
 * o relatorio psicossocial so reproduz os numeros do PGR se receber a mesma
 * lista e filtrar DEPOIS.
 */
export function acoesDoPlano(
  riscosDoCliente: any[],
  gheDoCliente: any[],
  expostosDoGhe: (gheId: string) => number
): AcaoDoPlano[] {
  return (riscosDoCliente || [])
    .map((r: any, i: number): AcaoDoPlano => {
      const ghe = (gheDoCliente || []).find((g: any) => g?.id === r?.ghe_id);
      const c = classificarRisco(r?.severity, r?.probability);
      const semControle = !r?.epc_implemented;
      const semEficacia = r?.epc_implemented && !r?.epc_effective;
      const tipo = semControle ? 'Introduzir' : semEficacia ? 'Aprimorar' : 'Manter';
      const base = {
        risco: r,
        id: `R-${ghe?.code || 'SEM-GHE'}-${String(i + 1).padStart(2, '0')}`,
        gheNome: ghe?.name || 'GHE não vinculado',
        classificado: c,
        expostos: expostosDoGhe(r?.ghe_id),
        tipo: tipo as AcaoDoPlano['tipo']
      };

      // Fator psicossocial nao se controla com protecao coletiva: a medida e
      // na organizacao do trabalho, definida com os trabalhadores. O Guia do
      // MTE manda preferir mudar as condicoes de trabalho a intervir na pessoa.
      if (ehRiscoPsicossocial(r)) {
        const perigo = String(r?.agent_name || '').replace(PREFIXO_DO_RISCO, '') || 'o fator identificado';
        return {
          ...base,
          medida: semControle
            ? `Adotar, com os trabalhadores, medida na organização do trabalho contra: ${perigo}`
            : semEficacia
              ? `Verificar e evidenciar, com os trabalhadores, a eficácia da medida contra: ${perigo}`
              : `Manter e acompanhar, com os trabalhadores, as medidas contra: ${perigo}`,
          hierarquia: 'Organização do trabalho (preferível a medida individual ou comportamental)'
        };
      }

      return {
        ...base,
        medida: semControle
          ? `Implantar medida de proteção coletiva para ${r?.agent_name || 'o perigo identificado'}`
          : semEficacia
            ? `Verificar e evidenciar a eficácia do controle coletivo de ${r?.agent_name || 'o perigo identificado'}`
            : `Manter e monitorar os controles de ${r?.agent_name || 'o perigo identificado'}`,
        hierarquia: semControle || semEficacia ? 'Proteção coletiva' : 'Manutenção dos controles'
      };
    })
    .sort((a, b) => (a.classificado?.prioridade ?? 9) - (b.classificado?.prioridade ?? 9));
}
