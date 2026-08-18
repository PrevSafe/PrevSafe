/** Baixa um CSV no navegador via Blob + link temporário. Sem servidor. */
export function baixarCsv(nomeArquivo: string, conteudo: string, comBom = false): void {
  const texto = comBom ? '﻿' + conteudo : conteudo;
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
