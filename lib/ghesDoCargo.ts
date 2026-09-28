/**
 * De qual GHE faz parte um cargo.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * Risco e exame nao se ligam a cargo: ligam-se a GHE. Quando a tela deixa
 * marcar CARGOS, alguem tem de dizer em que GHE aquilo cai - e as duas
 * funcoes que faziam isso (aplicar riscos e aplicar exames) tinham a mesma
 * saida silenciosa:
 *
 *     const ghe = ghesDoCliente.find(g => g.job_ids?.includes(jobId));
 *     if (ghe) { ... } else { usar ghesDoCliente[0]; }   // <- aqui
 *
 * Cargo que nao esta em GHE nenhum ia para o PRIMEIRO GHE do cliente, e a
 * mensagem dizia "aplicado com sucesso". O exame acabava num grupo de
 * trabalhadores que ninguem escolheu - e de la seguia para o ASO deles e para
 * o S-2220. A aplicacao de riscos ainda casava por NOME do GHE contendo o
 * nome do cargo, ou por setor em comum: coincidencia de texto virando
 * enquadramento de exposicao.
 *
 * A regra agora e uma so, e nao tem atalho: o cargo cai nos GHE que o LISTAM.
 * Nenhum, e o cargo volta com o nome para quem chamou avisar. Partilhar setor
 * nao basta - GHE e Grupo HOMOGENEO de Exposicao, e dois cargos no mesmo setor
 * podem ter exposicoes diferentes.
 */

export interface ResolucaoDeCargos {
  /** GHE que receberao o risco ou o exame. */
  gheIds: string[];
  /** Cargos que nao estao em GHE nenhum, pelo nome, para a mensagem ao usuario. */
  cargosSemGhe: string[];
}

/**
 * GHE alcancados por uma lista de cargos.
 *
 * `filter`, e nao `find`: um cargo em dois GHE alcanca os DOIS. Com `find`, o
 * segundo ficava sem o exame e ninguem era avisado.
 */
export function ghesDosCargos(
  ghes: any[],
  cargos: any[],
  clientId: string,
  jobIds: string[]
): ResolucaoDeCargos {
  const gheIds: string[] = [];
  const cargosSemGhe: string[] = [];

  const doCliente = (Array.isArray(ghes) ? ghes : [])
    .filter((g: any) => g?.client_id === clientId);

  for (const jobId of Array.isArray(jobIds) ? jobIds : []) {
    const alcancados = doCliente.filter((g: any) =>
      Array.isArray(g?.job_ids) && g.job_ids.includes(jobId)
    );

    if (alcancados.length === 0) {
      const cargo = (Array.isArray(cargos) ? cargos : []).find((c: any) => c?.id === jobId);
      const nome = String(cargo?.name || '').trim() || `cargo ${jobId}`;
      if (!cargosSemGhe.includes(nome)) cargosSemGhe.push(nome);
      continue;
    }

    for (const g of alcancados) {
      if (!gheIds.includes(g.id)) gheIds.push(g.id);
    }
  }

  return { gheIds, cargosSemGhe };
}

/**
 * O aviso de que um cargo ficou de fora.
 *
 * Fica aqui para as duas telas dizerem a mesma coisa, e para o teste poder
 * cobrar que ela seja dita: o defeito anterior nao era so aplicar no GHE
 * errado - era nao contar.
 */
export function avisoDeCargosSemGhe(cargosSemGhe: string[]): string {
  if (cargosSemGhe.length === 0) return '';
  const lista = cargosSemGhe.join(', ');
  return cargosSemGhe.length === 1
    ? `O cargo ${lista} não faz parte de nenhum GHE deste cliente e ficou de fora. `
      + 'Vincule o cargo a um GHE (aba 2, ao editar o GHE) e aplique de novo.'
    : `Os cargos ${lista} não fazem parte de nenhum GHE deste cliente e ficaram de fora. `
      + 'Vincule-os a um GHE (aba 2, ao editar o GHE) e aplique de novo.';
}
