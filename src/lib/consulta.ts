type ComFiltroEmpresa<T> = { eq: (coluna: 'empresa_id', valor: string) => T };

/** Injeta o filtro da empresa ativa numa consulta, para nenhuma tela precisar lembrar disso. */
export function daEmpresa<T>(query: T, empresaId: string): T {
  return (query as ComFiltroEmpresa<T>).eq('empresa_id', empresaId);
}
