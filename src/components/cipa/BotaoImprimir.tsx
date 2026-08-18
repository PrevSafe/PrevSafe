import { Botao } from '@/components/ui/Form';

export function BotaoImprimir({ rotulo = 'Imprimir' }: { rotulo?: string }) {
  return (
    <Botao type="button" variante="secundario" icone="print" onClick={() => window.print()}>
      {rotulo}
    </Botao>
  );
}
