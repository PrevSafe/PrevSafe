import { useState } from 'react';
import { Urna } from './Urna';
import { Botao, Campo } from '@/components/ui/Form';
import { cpfValido, formatarCpf, somenteDigitos } from '@/lib/cipa/cpf';
import type { Cedula } from '@/lib/cipa/types';

/**
 * Porta B: quem não recebeu link se identifica na hora. A conferência com o
 * cadastro de funcionários acontece depois, no painel.
 */
export function FluxoQrCode({ cedula }: { cedula: Cedula }) {
  const [cpf, setCpf] = useState('');
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [identificado, setIdentificado] = useState(false);

  if (identificado) {
    return (
      <Urna
        cedula={cedula}
        saudacao={nome.trim().split(' ')[0]}
        identificacao={{
          origem: 'QR_CODE',
          eleicao_id: cedula.eleicao.id,
          cpf: somenteDigitos(cpf),
          nome: nome.trim(),
          cargo: cargo.trim() || null,
        }}
      />
    );
  }

  function avancar() {
    if (!cpfValido(cpf)) return setErro('CPF inválido. Confira os números.');
    if (nome.trim().split(/\s+/).length < 2) return setErro('Escreva seu nome completo.');
    setErro(null);
    setIdentificado(true);
  }

  const unidade = cedula.unidade.nome_fantasia || cedula.unidade.razao_social;

  return (
    <div className="mx-auto max-w-[36rem] px-5 py-10">
      <p className="text-label-sm uppercase tracking-wider text-outline">{unidade} · {cedula.eleicao.norma}</p>
      <h1 className="mt-2 text-headline-lg font-extrabold leading-tight text-on-surface">
        Identifique-se para votar
      </h1>
      <p className="mt-2 text-on-surface-variant">
        Seus dados servem só para provar que você votou uma vez. Eles não ficam ligados ao seu voto.
      </p>

      <div className="mt-8 grid gap-5">
        <Campo
          rotulo="CPF"
          className="font-mono text-2xl tracking-wider"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          value={formatarCpf(cpf)}
          onChange={(e) => setCpf(somenteDigitos(e.target.value).slice(0, 11))}
        />
        <Campo
          rotulo="Nome completo"
          autoComplete="name"
          placeholder="Como está no crachá"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <Campo
          rotulo="Função (opcional)"
          placeholder="Ex.: Soldador"
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
        />

        {erro && (
          <p role="alert" className="rounded-xl bg-error-container px-4 py-3 text-label-md font-medium text-on-error-container">
            {erro}
          </p>
        )}

        <Botao type="button" variante="primario" className="h-16 text-body-lg" onClick={avancar}>
          Ver os candidatos
        </Botao>
      </div>
    </div>
  );
}
