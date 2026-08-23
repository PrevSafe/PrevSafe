import { describe, expect, it } from 'vitest';
import { avaliarAlertas, type AuditoriaPayload } from './sstLinter';

function baseFuncionario() {
  return { id: 'trab-1', nome: 'Carlos Henrique da Silva' };
}

function payloadBase(overrides: Partial<AuditoriaPayload> = {}): AuditoriaPayload {
  return {
    funcionario: baseFuncionario(),
    codigoGfip: 0,
    riscos: [],
    procedimentosRealizados: [],
    entregasEpi: [],
    afastamentoAtivo: null,
    ...overrides,
  };
}

describe('LNT-S2240-001 — risco sem exame correspondente', () => {
  const riscoRuido = {
    id: 'risco-1',
    descricao: 'Ruído contínuo',
    fatorRiscoCodigo: '01.01.002',
    fatorRiscoDescricao: 'Ruído contínuo ou intermitente',
    procedimentosExigidos: [{ codigo: '0281', nomeExame: 'Audiometria Tonal', periodicidadeMeses: 12 }],
    epiExigidoId: null,
    epiExigidoNome: null,
    ensejaAposentadoriaEspecial: true,
  };

  it('bloqueia quando o exame nunca foi realizado', () => {
    const alertas = avaliarAlertas(payloadBase({ riscos: [riscoRuido] }));
    expect(alertas.some((a) => a.id === 'LNT-S2240-001')).toBe(true);
  });

  it('bloqueia quando o exame está fora da periodicidade', () => {
    const alertas = avaliarAlertas(
      payloadBase({
        riscos: [riscoRuido],
        procedimentosRealizados: [{ codigo: '0281', dataExame: '2020-01-01' }],
      })
    );
    expect(alertas.some((a) => a.id === 'LNT-S2240-001')).toBe(true);
  });

  it('não bloqueia quando o exame foi realizado dentro da periodicidade', () => {
    const hoje = new Date().toISOString().slice(0, 10);
    const alertas = avaliarAlertas(
      payloadBase({
        riscos: [riscoRuido],
        procedimentosRealizados: [{ codigo: '0281', dataExame: hoje }],
      })
    );
    expect(alertas.some((a) => a.id === 'LNT-S2240-001')).toBe(false);
  });
});

describe('LNT-S2240-EPI — EPI exigido sem entrega vigente', () => {
  const riscoComEpi = {
    id: 'risco-2',
    descricao: 'Poeira de sílica',
    fatorRiscoCodigo: '01.18.001',
    fatorRiscoDescricao: 'Sílica cristalina',
    procedimentosExigidos: [],
    epiExigidoId: 'epi-1',
    epiExigidoNome: 'Máscara PFF2',
    ensejaAposentadoriaEspecial: false,
  };

  it('bloqueia quando não há entrega registrada', () => {
    const alertas = avaliarAlertas(payloadBase({ riscos: [riscoComEpi] }));
    expect(alertas.some((a) => a.id === 'LNT-S2240-EPI')).toBe(true);
  });

  it('bloqueia quando a entrega existe mas está vencida', () => {
    const alertas = avaliarAlertas(
      payloadBase({ riscos: [riscoComEpi], entregasEpi: [{ epiId: 'epi-1', dataValidade: '2020-01-01' }] })
    );
    expect(alertas.some((a) => a.id === 'LNT-S2240-EPI')).toBe(true);
  });

  it('não bloqueia quando há entrega vigente', () => {
    const alertas = avaliarAlertas(
      payloadBase({ riscos: [riscoComEpi], entregasEpi: [{ epiId: 'epi-1', dataValidade: null }] })
    );
    expect(alertas.some((a) => a.id === 'LNT-S2240-EPI')).toBe(false);
  });
});

describe('LNT-S2240-003 — ausência de risco inconsistente', () => {
  it('bloqueia quando ausência de risco coexiste com risco que exige EPI', () => {
    const alertas = avaliarAlertas(
      payloadBase({
        riscos: [
          {
            id: 'r-ausencia',
            descricao: 'Sem risco',
            fatorRiscoCodigo: '09.01.001',
            fatorRiscoDescricao: 'Ausência de risco',
            procedimentosExigidos: [],
            epiExigidoId: null,
            epiExigidoNome: null,
            ensejaAposentadoriaEspecial: false,
          },
          {
            id: 'r-com-epi',
            descricao: 'Poeira',
            fatorRiscoCodigo: '01.18.001',
            fatorRiscoDescricao: 'Sílica cristalina',
            procedimentosExigidos: [],
            epiExigidoId: 'epi-1',
            epiExigidoNome: 'Máscara PFF2',
            ensejaAposentadoriaEspecial: false,
          },
        ],
      })
    );
    expect(alertas.some((a) => a.id === 'LNT-S2240-003')).toBe(true);
  });

  it('não bloqueia quando só há o código de ausência de risco', () => {
    const alertas = avaliarAlertas(
      payloadBase({
        riscos: [
          {
            id: 'r-ausencia',
            descricao: 'Sem risco',
            fatorRiscoCodigo: '09.01.001',
            fatorRiscoDescricao: 'Ausência de risco',
            procedimentosExigidos: [],
            epiExigidoId: null,
            epiExigidoNome: null,
            ensejaAposentadoriaEspecial: false,
          },
        ],
      })
    );
    expect(alertas.some((a) => a.id === 'LNT-S2240-003')).toBe(false);
  });
});

describe('LNT-S1200-001 — divergência tributária de aposentadoria especial', () => {
  const riscoComAposentadoriaEspecial = {
    id: 'risco-3',
    descricao: 'Benzeno',
    fatorRiscoCodigo: '03.01.004',
    fatorRiscoDescricao: 'Benzeno e seus compostos',
    procedimentosExigidos: [],
    epiExigidoId: null,
    epiExigidoNome: null,
    ensejaAposentadoriaEspecial: true,
  };

  it('emite aviso quando o código GFIP está em 0 ou 1', () => {
    const alertas = avaliarAlertas(payloadBase({ riscos: [riscoComAposentadoriaEspecial], codigoGfip: 1 }));
    const alerta = alertas.find((a) => a.id === 'LNT-S1200-001');
    expect(alerta).toBeDefined();
    expect(alerta?.severidade).toBe('WARNING_ADVISORY');
  });

  it('não emite aviso quando o código GFIP já reflete a exposição', () => {
    const alertas = avaliarAlertas(payloadBase({ riscos: [riscoComAposentadoriaEspecial], codigoGfip: 3 }));
    expect(alertas.some((a) => a.id === 'LNT-S1200-001')).toBe(false);
  });
});

describe('LNT-S2210-001 — afastamento acidentário sem CAT', () => {
  it('emite aviso quando o afastamento é acidentário e não há CAT', () => {
    const alertas = avaliarAlertas(
      payloadBase({
        afastamentoAtivo: { id: 'afast-1', motivo: 'acidente_trabalho', dataInicio: '2026-08-01', temCat: false },
      })
    );
    const alerta = alertas.find((a) => a.id === 'LNT-S2210-001');
    expect(alerta).toBeDefined();
    expect(alerta?.severidade).toBe('WARNING_ADVISORY');
  });

  it('não emite aviso quando a CAT já foi emitida', () => {
    const alertas = avaliarAlertas(
      payloadBase({
        afastamentoAtivo: { id: 'afast-1', motivo: 'acidente_trabalho', dataInicio: '2026-08-01', temCat: true },
      })
    );
    expect(alertas.some((a) => a.id === 'LNT-S2210-001')).toBe(false);
  });

  it('não emite aviso quando o afastamento não é acidentário/ocupacional', () => {
    const alertas = avaliarAlertas(
      payloadBase({
        afastamentoAtivo: { id: 'afast-1', motivo: 'doenca_nao_ocupacional', dataInicio: '2026-08-01', temCat: false },
      })
    );
    expect(alertas.some((a) => a.id === 'LNT-S2210-001')).toBe(false);
  });
});

describe('auditoria sem pendências', () => {
  it('não gera nenhum alerta para um trabalhador sem riscos', () => {
    expect(avaliarAlertas(payloadBase())).toEqual([]);
  });
});
