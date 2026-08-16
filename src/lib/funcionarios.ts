const so = (v: string) => v.replace(/\D/g, '');

export function mascaraCpf(v: string) {
  return so(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatarCpf(cpf: string) {
  const n = so(cpf);
  if (n.length !== 11) return cpf;
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/** Valida CPF pelos dois dígitos verificadores. */
export function cpfValido(cpf: string) {
  const n = so(cpf);
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
  const calc = (base: string) => {
    let peso = base.length + 1;
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * peso--;
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(n.slice(0, 9)) === Number(n[9]) && calc(n.slice(0, 10)) === Number(n[10]);
}

export function mascaraPis(v: string) {
  return so(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{5})(\d)/, '$1.$2')
    .replace(/(\d{2})(\d{1})$/, '$1-$2');
}

export function mascaraTelefone(v: string) {
  return so(v)
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

export const STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativo',
  afastado: 'Afastado',
  ferias: 'Férias',
  desligado: 'Desligado',
};

export function corStatus(status: string) {
  if (status === 'ativo') return 'bg-secondary-container/40 text-on-secondary-container';
  if (status === 'afastado' || status === 'ferias') return 'bg-[#F97316]/15 text-[#9a3412]';
  return 'bg-surface-container-high text-on-surface-variant';
}

export function iniciais(nome: string) {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}
