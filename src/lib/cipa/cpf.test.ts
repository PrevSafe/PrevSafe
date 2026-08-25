import { describe, expect, it } from 'vitest';
import { cnpjValido, cpfValido, formatarCnpj, somenteDigitos } from './cpf';

describe('somenteDigitos', () => {
  it('remove tudo que não é dígito', () => {
    expect(somenteDigitos('11.222.333/0001-81')).toBe('11222333000181');
  });

  it('retorna string vazia para entrada vazia ou nula', () => {
    expect(somenteDigitos('')).toBe('');
  });
});

describe('cpfValido', () => {
  it('aceita um CPF válido conhecido', () => {
    expect(cpfValido('52998224725')).toBe(true);
  });

  it('aceita um CPF válido conhecido formatado', () => {
    expect(cpfValido('111.444.777-35')).toBe(true);
  });

  it('rejeita CPF com todos os dígitos iguais', () => {
    expect(cpfValido('00000000000')).toBe(false);
  });

  it('rejeita CPF com dígito verificador errado', () => {
    expect(cpfValido('52998224700')).toBe(false);
  });

  it('rejeita CPF com menos de 11 dígitos', () => {
    expect(cpfValido('529982247')).toBe(false);
  });
});

describe('cnpjValido', () => {
  it('aceita um CNPJ válido conhecido (11222333000181)', () => {
    expect(cnpjValido('11222333000181')).toBe(true);
  });

  it('aceita um CNPJ válido conhecido (11444777000161)', () => {
    expect(cnpjValido('11444777000161')).toBe(true);
  });

  it('aceita um CNPJ válido conhecido formatado', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
  });

  it('rejeita CNPJ com todos os dígitos iguais', () => {
    expect(cnpjValido('00000000000000')).toBe(false);
  });

  it('rejeita CNPJ com dígito verificador errado', () => {
    expect(cnpjValido('11222333000180')).toBe(false);
  });

  it('rejeita CNPJ com menos de 14 dígitos', () => {
    expect(cnpjValido('1122233300018')).toBe(false);
  });
});

describe('formatarCnpj', () => {
  it('formata um CNPJ de 14 dígitos com máscara', () => {
    expect(formatarCnpj('12345678000195')).toBe('12.345.678/0001-95');
  });

  it('devolve o valor original se não tiver 14 dígitos', () => {
    expect(formatarCnpj('123456')).toBe('123456');
  });
});
