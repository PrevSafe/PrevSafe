import { useRef, useState, useTransition } from 'react';
import Papa from 'papaparse';
import { importarEleitores, type LinhaEleitor } from '@/lib/cipa/acoes';
import { Botao } from '@/components/ui/Form';
import { Aviso } from './Aviso';

const SINONIMOS: Record<string, keyof LinhaEleitor> = {
  nome: 'nome', 'nome completo': 'nome', funcionario: 'nome', colaborador: 'nome',
  cpf: 'cpf',
  cargo: 'cargo', funcao: 'cargo', 'cargo/funcao': 'cargo', cargo_funcao: 'cargo',
  setor: 'setor', departamento: 'setor',
  matricula: 'matricula',
  email: 'email', 'e-mail': 'email',
  telefone: 'telefone', celular: 'telefone', whatsapp: 'telefone', contato: 'telefone',
};

const normalizar = (h: string) =>
  h.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export function ImportadorCsv({ eleicaoId }: { eleicaoId: string }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<LinhaEleitor[]>([]);
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  function lerArquivo(arquivo: File) {
    Papa.parse<Record<string, string>>(arquivo, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => SINONIMOS[normalizar(h)] ?? normalizar(h),
      complete: (resultado) => {
        const linhas = resultado.data
          .map((l) => ({
            nome: l.nome ?? '', cpf: l.cpf ?? '', cargo: l.cargo, setor: l.setor,
            matricula: l.matricula, email: l.email, telefone: l.telefone,
          }))
          .filter((l) => l.nome && l.cpf);

        setPrevia(linhas);
        setAviso(linhas.length
          ? { tom: 'ok', texto: `${linhas.length} linha(s) lida(s). Confira e envie.` }
          : { tom: 'erro', texto: 'Nenhuma linha com nome e CPF. Confira os cabeçalhos.' });
      },
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm">
      <p className="text-label-sm uppercase tracking-wider text-outline">Alternativa</p>
      <h2 className="mt-2 text-title-lg font-bold text-on-surface">Importar por planilha</h2>
      <p className="mt-2 max-w-2xl text-on-surface-variant">
        Use só quando o cadastro de funcionários ainda não estiver completo no sistema.
        O caminho normal é montar a lista a partir do cadastro. Colunas aceitas: nome, cpf,
        cargo, setor, matrícula, e-mail, telefone.
      </p>

      <input
        ref={entrada}
        type="file"
        accept=".csv,text/csv"
        className="mt-5 block w-full text-label-sm file:mr-4 file:rounded-lg file:border-0 file:bg-on-surface-variant file:px-5 file:py-3 file:text-label-sm file:font-semibold file:uppercase file:tracking-wider file:text-white"
        onChange={(e) => e.target.files?.[0] && lerArquivo(e.target.files[0])}
      />

      {aviso && <Aviso tom={aviso.tom} texto={aviso.texto} />}

      {previa.length > 0 && (
        <Botao
          type="button"
          variante="primario"
          className="mt-5"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await importarEleitores(eleicaoId, previa);
              setAviso({ tom: r.ok ? 'ok' : 'erro', texto: r.mensagem });
              if (r.ok) { setPrevia([]); if (entrada.current) entrada.current.value = ''; }
            })
          }
        >
          {pendente ? 'Enviando…' : `Importar ${previa.length} eleitor(es)`}
        </Botao>
      )}
    </div>
  );
}
