import { describe, expect, it } from 'vitest';
import { hojeBrasil } from './fuso';

describe('hojeBrasil', () => {
  it('retorna uma data no formato YYYY-MM-DD', () => {
    expect(hojeBrasil()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
