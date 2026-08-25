import { describe, expect, it } from 'vitest';
import { statusCalibracao } from './equipamentosMedicao';
import { hojeBrasil } from './cipa/fuso';

// Ancorado em hojeBrasil() (não Date.now()/UTC) porque statusCalibracao compara
// contra hojeBrasil() internamente — usar o relógio UTC aqui faria os testes
// oscilarem (falso "vencendo" viraria "vencida" etc.) durante a janela diária
// de 00h-03h UTC, em que UTC e America/Sao_Paulo caem em dias diferentes.
function dataRelativa(diasOffset: number): string {
  const data = new Date(`${hojeBrasil()}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + diasOffset);
  return data.toISOString().slice(0, 10);
}

describe('statusCalibracao', () => {
  it('retorna sem_data quando não há data de validade', () => {
    expect(statusCalibracao(null)).toBe('sem_data');
  });

  it('retorna vencida quando a data está no passado', () => {
    expect(statusCalibracao(dataRelativa(-1))).toBe('vencida');
  });

  it('retorna vencendo quando a data está dentro de 30 dias no futuro', () => {
    expect(statusCalibracao(dataRelativa(15))).toBe('vencendo');
  });

  it('retorna vencendo no limite exato de 30 dias', () => {
    expect(statusCalibracao(dataRelativa(30))).toBe('vencendo');
  });

  it('retorna em_dia quando a data está a mais de 30 dias no futuro', () => {
    expect(statusCalibracao(dataRelativa(40))).toBe('em_dia');
  });
});
