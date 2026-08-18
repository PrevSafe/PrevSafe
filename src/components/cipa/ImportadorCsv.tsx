import { useRef, useState, useTransition } from 'react';
import Papa from 'papaparse';
import { importarEleitores, type LinhaEleitor } from '@/lib/cipa/acoes';
import { cpfValido, formatarCpf } from '@/lib/cipa/cpf';
import { baixarCsv } from '@/lib/cipa/csv';
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

function mascararCpf(cpf: string): string {
  return formatarCpf(cpf).replace(/^\d{3}/, '***').replace(/\d{2}$/, '**');
}

function baixarModelo() {
  const conteudo = [
    'nome;cpf;cargo;setor;matricula;email;telefone',
    'João da Silva;111.444.777-35;Operador de Produção;Produção;1024;joao.silva@empresa.com.br;(11) 98765-4321',
    'Maria Oliveira Santos;529.982.247-25;Auxiliar Administrativo;Administrativo;1025;maria.santos@empresa.com.br;(11) 91234-5678',
  ].join('\n');
  baixarCsv('modelo-eleitores-cipa.csv', conteudo, true);
}

type Descarte = { rotulo: string; motivo: string };

export function ImportadorCsv({ eleicaoId }: { eleicaoId: string }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<LinhaEleitor[]>([]);
  const [descartes, setDescartes] = useState<Descarte[]>([]);
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  function lerArquivo(arquivo: File) {
    const cabecalhosOriginais: string[] = [];
    Papa.parse<Record<string, string>>(arquivo, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => {
        cabecalhosOriginais.push(h.trim());
        return SINONIMOS[normalizar(h)] ?? normalizar(h);
      },
      complete: (resultado) => {
        const camposReconhecidos = resultado.meta.fields ?? [];
        if (!camposReconhecidos.includes('nome') && !camposReconhecidos.includes('cpf')) {
          setPrevia([]);
          setDescartes([]);
          setAviso({
            tom: 'erro',
            texto: `Nenhuma coluna de nome ou CPF reconhecida. Cabeçalhos encontrados no arquivo: ${cabecalhosOriginais.join(', ')}.`,
          });
          return;
        }

        const rejeitadas: Descarte[] = [];

        const linhas = resultado.data.reduce<LinhaEleitor[]>((acc, l, i) => {
          const linha = {
            nome: (l.nome ?? '').trim(), cpf: (l.cpf ?? '').trim(), cargo: l.cargo, setor: l.setor,
            matricula: l.matricula, email: l.email, telefone: l.telefone,
          };
          const rotulo = linha.nome || `linha ${i + 1}`;
          if (!linha.nome) {
            rejeitadas.push({ rotulo, motivo: 'sem nome' });
            return acc;
          }
          if (!linha.cpf) {
            rejeitadas.push({ rotulo, motivo: 'sem CPF' });
            return acc;
          }
          if (!cpfValido(linha.cpf)) {
            rejeitadas.push({ rotulo, motivo: 'CPF inválido' });
            return acc;
          }
          acc.push(linha);
          return acc;
        }, []);

        setPrevia(linhas);
        setDescartes(rejeitadas);

        const partes = [`${linhas.length} linha(s) válida(s) lida(s).`];
        if (rejeitadas.length > 0) partes.push(`${rejeitadas.length} descartada(s).`);

        setAviso({ tom: linhas.length ? 'ok' : 'erro', texto: partes.join(' ') });
      },
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm">
      <p className="text-label-sm uppercase tracking-wider text-outline">Lista de eleitores</p>
      <h2 className="mt-2 text-title-lg font-bold text-on-surface">Importar lista de eleitores</h2>
      <p className="mt-2 max-w-2xl text-on-surface-variant">
        A lista de eleitores é independente do cadastro de funcionários. Obrigatórios: nome
        completo e CPF. Opcionais: cargo, setor, matrícula, e-mail e telefone.
      </p>

      <Botao
        type="button"
        variante="secundario"
        className="mt-5"
        onClick={baixarModelo}
        icone="download"
      >
        Baixar planilha modelo
      </Botao>

      <input
        ref={entrada}
        type="file"
        accept=".csv,text/csv"
        className="mt-5 block w-full text-label-sm file:mr-4 file:rounded-lg file:border-0 file:bg-on-surface-variant file:px-5 file:py-3 file:text-label-sm file:font-semibold file:uppercase file:tracking-wider file:text-white"
        onChange={(e) => e.target.files?.[0] && lerArquivo(e.target.files[0])}
      />
      <p className="mt-2 text-label-sm text-outline">
        Aceita CSV separado por ponto e vírgula ou vírgula. A primeira linha deve conter os nomes
        das colunas.
      </p>

      {aviso && <Aviso tom={aviso.tom} texto={aviso.texto} />}

      {previa.length > 0 && (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-label-sm">
              <thead>
                <tr className="text-outline">
                  <th className="py-1 pr-4 font-medium">Nome</th>
                  <th className="py-1 pr-4 font-medium">CPF</th>
                  <th className="py-1 pr-4 font-medium">Cargo</th>
                </tr>
              </thead>
              <tbody>
                {previa.slice(0, 5).map((l, i) => (
                  <tr key={i} className="border-t border-outline-variant/40 text-on-surface-variant">
                    <td className="py-1 pr-4">{l.nome}</td>
                    <td className="py-1 pr-4">{mascararCpf(l.cpf)}</td>
                    <td className="py-1 pr-4">{l.cargo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </>
      )}

      {descartes.length > 0 && (
        <div className="mt-4 rounded-xl bg-warning-container px-4 py-3 text-label-sm text-warning">
          <p className="font-semibold">Linhas descartadas:</p>
          <ul className="mt-1 list-disc pl-5">
            {descartes.slice(0, 5).map((d, i) => (
              <li key={i}>{d.rotulo}: {d.motivo}</li>
            ))}
          </ul>
          {descartes.length > 5 && (
            <p className="mt-1">e mais {descartes.length - 5} linha(s).</p>
          )}
        </div>
      )}
    </div>
  );
}
