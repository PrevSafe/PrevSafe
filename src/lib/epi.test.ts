import { describe, expect, it } from 'vitest';
import { situacaoCaAtual } from './epi';
import { hojeBrasil } from './cipa/fuso';

// Ancorado em hojeBrasil() (não Date.now()/UTC) porque situacaoCaAtual compara
// contra hojeBrasil() internamente — usar o relógio UTC aqui faria os testes
// oscilarem durante a janela diária de 00h-03h UTC, em que UTC e
// America/Sao_Paulo caem em dias diferentes.
function dataRelativa(diasOffset: number): string {
  const data = new Date(`${hojeBrasil()}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + diasOffset);
  return data.toISOString().slice(0, 10);
}

describe('situacaoCaAtual', () => {
  it('retorna nao_verificado quando não há data de validade', () => {
    expect(situacaoCaAtual(null)).toBe('nao_verificado');
  });

  it('retorna vigente quando a data de validade é hoje', () => {
    expect(situacaoCaAtual(dataRelativa(0))).toBe('vigente');
  });

  it('retorna vigente quando a data de validade é futura', () => {
    expect(situacaoCaAtual(dataRelativa(10))).toBe('vigente');
  });

  it('retorna vencido quando a data de validade é passada', () => {
    expect(situacaoCaAtual(dataRelativa(-1))).toBe('vencido');
  });
});
