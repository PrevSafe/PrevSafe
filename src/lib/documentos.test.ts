import { describe, expect, it } from 'vitest';
import {
  capitulosPadrao,
  formatarInscricao,
  montarFolhas,
  PERSONALIZACAO_VAZIA,
  type DadosDocumento,
  type Personalizacao,
  type RiscoDocumento,
} from './documentos';

function dadosBase(overrides: Partial<DadosDocumento> = {}): DadosDocumento {
  return {
    empresa: { nome: 'Fazenda Boa Vista', numeroInscricao: '12345678000199', tipoInscricao: 1 },
    riscos: [],
    exames: [],
    cronograma: [],
    ...overrides,
  };
}

function risco(id: string): RiscoDocumento {
  return {
    id,
    descricao: `Risco ${id}`,
    tipoRisco: 'fisico',
    probabilidade: 3,
    severidade: 3,
    gheNome: 'Produção',
    fatorRiscoCodigo: null,
    fatorRiscoDescricao: null,
    notaDocumento: null,
  };
}

describe('formatarInscricao', () => {
  it('formata CNPJ de 14 dígitos', () => {
    expect(formatarInscricao('12345678000199', 1)).toBe('12.345.678/0001-99');
  });

  it('formata CPF de 11 dígitos quando tipo_inscricao é 2 (produtor rural)', () => {
    expect(formatarInscricao('12345678900', 2)).toBe('123.456.789-00');
  });
});

describe('capitulosPadrao', () => {
  it('retorna os 7 capítulos previstos, todos ativos por padrão', () => {
    const capitulos = capitulosPadrao();
    expect(capitulos).toHaveLength(7);
    expect(capitulos.every((c) => c.ativo)).toBe(true);
  });

  it('marca inventário de riscos e cronograma como dinâmicos', () => {
    const capitulos = capitulosPadrao();
    const dinamicos = capitulos.filter((c) => c.dinamico).map((c) => c.id);
    expect(dinamicos).toEqual(['inventario_riscos', 'cronograma_acoes']);
  });
});

describe('montarFolhas', () => {
  it('não gera folhas para capítulos desativados', () => {
    const capitulos = capitulosPadrao().map((c) => (c.id === 'anexos' ? { ...c, ativo: false } : c));
    const folhas = montarFolhas(capitulos, dadosBase(), 'PGR');
    expect(folhas.some((f) => f.capituloId === 'anexos')).toBe(false);
  });

  it('respeita a ordem dos capítulos (reordenação por drag-and-drop)', () => {
    const capitulos = capitulosPadrao();
    const reordenados = [capitulos[1], capitulos[0], ...capitulos.slice(2)];
    const folhas = montarFolhas(reordenados, dadosBase(), 'PGR');
    expect(folhas[0].capituloId).toBe('introducao');
    expect(folhas[1].capituloId).toBe('capa');
  });

  it('pagina o inventário de riscos a cada 9 itens', () => {
    const riscos = Array.from({ length: 20 }, (_, i) => risco(String(i)));
    const folhas = montarFolhas(capitulosPadrao(), dadosBase({ riscos }), 'PGR');
    const paginasDeRiscos = folhas.filter((f) => f.capituloId === 'inventario_riscos');
    expect(paginasDeRiscos).toHaveLength(3);
    expect(paginasDeRiscos[0].bloco).toMatchObject({ tipo: 'tabela_riscos', continuacao: false });
    expect(paginasDeRiscos[1].bloco).toMatchObject({ tipo: 'tabela_riscos', continuacao: true });
  });

  it('para PCMSO, o capítulo de inventário renderiza a tabela de exames em vez da de riscos', () => {
    const dados = dadosBase({
      exames: [{ id: 'e1', riscoDescricao: 'Ruído', codigo: '0281', nomeExame: 'Audiometria', periodicidadeMeses: 12 }],
    });
    const folhas = montarFolhas(capitulosPadrao(), dados, 'PCMSO');
    const folha = folhas.find((f) => f.capituloId === 'inventario_riscos');
    expect(folha?.bloco.tipo).toBe('tabela_exames');
  });

  it('sem riscos, ainda gera uma folha vazia para o capítulo dinâmico (não desaparece do documento)', () => {
    const folhas = montarFolhas(capitulosPadrao(), dadosBase(), 'PGR');
    const paginasDeRiscos = folhas.filter((f) => f.capituloId === 'inventario_riscos');
    expect(paginasDeRiscos).toHaveLength(1);
    expect(paginasDeRiscos[0].bloco).toMatchObject({ tipo: 'tabela_riscos', itens: [] });
  });
});

describe('montarFolhas com personalização', () => {
  function comPersonalizacao(overrides: Partial<Personalizacao>): Personalizacao {
    return { ...PERSONALIZACAO_VAZIA, ...overrides };
  }

  it('sem personalização salva, usa o texto padrão gerado', () => {
    const folhas = montarFolhas(capitulosPadrao(), dadosBase(), 'PGR');
    const introducao = folhas.find((f) => f.capituloId === 'introducao');
    expect(introducao?.bloco).toMatchObject({ tipo: 'texto' });
    if (introducao?.bloco.tipo === 'texto') {
      expect(introducao.bloco.paragrafos[0]).toContain('Fazenda Boa Vista');
    }
  });

  it('com personalização salva, substitui o texto padrão e separa parágrafos por linha em branco', () => {
    const personalizacao = comPersonalizacao({ textoIntroducao: 'Parágrafo um.\n\nParágrafo dois.' });
    const folhas = montarFolhas(capitulosPadrao(), dadosBase(), 'PGR', personalizacao);
    const introducao = folhas.find((f) => f.capituloId === 'introducao');
    expect(introducao?.bloco).toMatchObject({ tipo: 'texto', paragrafos: ['Parágrafo um.', 'Parágrafo dois.'] });
  });

  it('capa aplica título, subtítulo e responsável customizados', () => {
    const personalizacao = comPersonalizacao({
      capaTitulo: 'PGR — Unidade Sede',
      capaSubtitulo: 'Revisão 2026',
      capaResponsavel: 'Eng. Ana Souza',
    });
    const folhas = montarFolhas(capitulosPadrao(), dadosBase(), 'PGR', personalizacao);
    const capa = folhas.find((f) => f.capituloId === 'capa');
    expect(capa?.bloco).toMatchObject({
      tipo: 'capa',
      tituloCustom: 'PGR — Unidade Sede',
      subtitulo: 'Revisão 2026',
      responsavel: 'Eng. Ana Souza',
    });
  });

  it('anexos sem personalização mantém a lista padrão (paragrafosCustom nulo)', () => {
    const folhas = montarFolhas(capitulosPadrao(), dadosBase(), 'PGR');
    const anexos = folhas.find((f) => f.capituloId === 'anexos');
    expect(anexos?.bloco).toMatchObject({ tipo: 'anexos', paragrafosCustom: null });
  });
});
