import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { formatarMoeda } from '@/lib/inspecoes';
import { somenteDigitos, cnpjValido } from '@/lib/cipa/cpf';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';

type Form = {
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  telefone: string;
  email: string;
  regiao_uf: string;
  regiao_cidade: string;
  endereco: string;
  ativo: 'true' | 'false';
};

const VAZIO: Form = {
  nome_fantasia: '',
  razao_social: '',
  cnpj: '',
  telefone: '',
  email: '',
  regiao_uf: '',
  regiao_cidade: '',
  endereco: '',
  ativo: 'true',
};

const UFS = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'],
  ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'],
  ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'],
  ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'],
  ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'],
  ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'],
  ['SE', 'Sergipe'], ['TO', 'Tocantins'],
] as const;

type Procedimento = {
  id: string;
  procedimento_codigo: string;
  valor_repasse: number;
  nome_exame: string;
};

type ProcedimentoCatalogo = { codigo_esocial: string; nome_exame: string };

export default function CredenciadosForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva, can } = useAuth();
  const podeSalvar = can('credenciados', editando ? 'editar' : 'criar');
  const podeVincular = can('credenciados', 'editar');
  const podeRemover = can('credenciados', 'excluir');

  const [form, setForm] = useState<Form>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [carregando, setCarregando] = useState(editando);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [catalogo, setCatalogo] = useState<ProcedimentoCatalogo[]>([]);
  const [carregandoProcedimentos, setCarregandoProcedimentos] = useState(false);
  const [novoProcedimento, setNovoProcedimento] = useState({ procedimento_codigo: '', valor_repasse: '' });
  const [erroProcedimento, setErroProcedimento] = useState<string | null>(null);
  const [vinculando, setVinculando] = useState(false);

  useEffect(() => {
    if (!id || !empresaAtiva) {
      setCarregando(false);
      return;
    }
    daEmpresa(supabase.from('clinicas_credenciadas').select('*'), empresaAtiva.empresa_id)
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setErroGeral(error.code === 'PGRST116' ? 'Clínica não encontrada.' : error.message);
        else if (data)
          setForm({
            nome_fantasia: data.nome_fantasia ?? '',
            razao_social: data.razao_social ?? '',
            cnpj: data.cnpj ?? '',
            telefone: data.telefone ?? '',
            email: data.email ?? '',
            regiao_uf: data.regiao_uf ?? '',
            regiao_cidade: data.regiao_cidade ?? '',
            endereco: data.endereco ?? '',
            ativo: data.ativo ? 'true' : 'false',
          });
        setCarregando(false);
      });
  }, [id, empresaAtiva]);

  function carregarProcedimentos() {
    if (!id) return;
    setCarregandoProcedimentos(true);
    supabase
      .from('clinicas_credenciadas_procedimentos')
      .select('id, procedimento_codigo, valor_repasse, procedimentos_t27(nome_exame)')
      .eq('clinica_id', id)
      .then(({ data, error }) => {
        if (error) {
          setErroProcedimento(error.message);
        } else {
          const linhas = (data ?? []).map((p) => {
            const exame = p.procedimentos_t27 as unknown as { nome_exame: string } | null;
            return {
              id: p.id,
              procedimento_codigo: p.procedimento_codigo,
              valor_repasse: Number(p.valor_repasse),
              nome_exame: exame?.nome_exame ?? p.procedimento_codigo,
            };
          });
          setProcedimentos(linhas);
        }
        setCarregandoProcedimentos(false);
      });
  }

  useEffect(() => {
    if (!editando || !id) return;
    carregarProcedimentos();
    supabase
      .from('procedimentos_t27')
      .select('codigo_esocial, nome_exame')
      .order('nome_exame')
      .then(({ data, error }) => {
        if (!error) setCatalogo((data ?? []) as ProcedimentoCatalogo[]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando, id]);

  function set<K extends keyof Form>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
    setSalvo(false);
  }

  function validar() {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.nome_fantasia.trim()) e.nome_fantasia = 'Informe o nome fantasia da clínica.';
    if (!form.regiao_uf) e.regiao_uf = 'Selecione a UF.';
    if (!form.regiao_cidade.trim()) e.regiao_cidade = 'Informe a cidade.';
    const cnpjDigits = somenteDigitos(form.cnpj);
    if (cnpjDigits && !cnpjValido(cnpjDigits)) e.cnpj = 'Informe um CNPJ válido.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = 'Informe um e-mail válido.';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setErroGeral(null);
    setSalvo(false);
    if (!podeSalvar || !validar() || !empresaAtiva) return;
    setSalvando(true);

    const payload = {
      empresa_id: empresaAtiva.empresa_id,
      nome_fantasia: form.nome_fantasia.trim(),
      razao_social: form.razao_social.trim() || null,
      cnpj: somenteDigitos(form.cnpj) || null,
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      regiao_uf: form.regiao_uf,
      regiao_cidade: form.regiao_cidade.trim(),
      endereco: form.endereco.trim() || null,
      ativo: form.ativo === 'true',
    };

    if (editando) {
      const { error } = await supabase.from('clinicas_credenciadas').update(payload).eq('id', id!);
      setSalvando(false);
      if (error) {
        setErroGeral(error.code === '23505' ? 'Já existe uma clínica cadastrada com este CNPJ.' : error.message);
        return;
      }
      setSalvo(true);
      return;
    }

    const { data, error } = await supabase.from('clinicas_credenciadas').insert(payload).select('id').single();
    setSalvando(false);

    if (error) {
      setErroGeral(error.code === '23505' ? 'Já existe uma clínica cadastrada com este CNPJ.' : error.message);
      return;
    }
    navigate(`/credenciados/${data.id}`, { replace: true });
  }

  function atualizarNovoProcedimento<K extends keyof typeof novoProcedimento>(
    campo: K,
    valor: string
  ) {
    setNovoProcedimento((f) => ({ ...f, [campo]: valor }));
    setErroProcedimento(null);
  }

  async function vincularProcedimento() {
    setErroProcedimento(null);
    if (!id) return;
    if (!novoProcedimento.procedimento_codigo) {
      setErroProcedimento('Selecione um procedimento.');
      return;
    }
    const valor = Number(novoProcedimento.valor_repasse);
    if (!novoProcedimento.valor_repasse || Number.isNaN(valor) || valor < 0) {
      setErroProcedimento('Informe um valor de repasse válido.');
      return;
    }

    setVinculando(true);
    const { error } = await supabase.from('clinicas_credenciadas_procedimentos').insert({
      clinica_id: id,
      procedimento_codigo: novoProcedimento.procedimento_codigo,
      valor_repasse: valor,
    });
    setVinculando(false);

    if (error) {
      setErroProcedimento(
        error.code === '23505'
          ? 'Este procedimento já está vinculado a esta clínica.'
          : error.message
      );
      return;
    }
    setNovoProcedimento({ procedimento_codigo: '', valor_repasse: '' });
    carregarProcedimentos();
  }

  async function removerProcedimento(procId: string) {
    setErroProcedimento(null);
    const { error } = await supabase.from('clinicas_credenciadas_procedimentos').delete().eq('id', procId);
    if (error) {
      setErroProcedimento(error.message);
      return;
    }
    setProcedimentos((lista) => lista.filter((p) => p.id !== procId));
  }

  if (carregando) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={salvar} className="flex-1 flex flex-col">
      <header className="sticky top-0 md:top-0 z-20 flex items-center bg-surface-container-lowest px-margin-mobile md:px-md py-4 border-b border-outline-variant gap-2">
        <button
          type="button"
          onClick={() => navigate('/credenciados')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar clínica credenciada' : 'Nova clínica credenciada'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}
        {salvo && (
          <div className="bg-secondary-container/40 text-on-secondary-container rounded-lg px-4 py-3 text-label-md">
            Dados da clínica salvos.
          </div>
        )}

        <Secao icone="local_hospital" titulo="Dados da Clínica">
          <Campo
            rotulo="Nome fantasia"
            name="nome_fantasia"
            placeholder="Ex.: Clínica Saúde Ocupacional"
            value={form.nome_fantasia}
            onChange={(e) => set('nome_fantasia', e.target.value)}
            erro={erros.nome_fantasia}
            autoFocus
          />
          <Campo
            rotulo="Razão social (opcional)"
            name="razao_social"
            placeholder="Ex.: Saúde Ocupacional Ltda."
            value={form.razao_social}
            onChange={(e) => set('razao_social', e.target.value)}
            erro={erros.razao_social}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo
              rotulo="CNPJ (opcional)"
              name="cnpj"
              inputMode="numeric"
              placeholder="00000000000000"
              maxLength={14}
              value={form.cnpj}
              onChange={(e) => set('cnpj', somenteDigitos(e.target.value))}
              erro={erros.cnpj}
            />
            <Campo
              rotulo="Telefone (opcional)"
              name="telefone"
              placeholder="(00) 00000-0000"
              value={form.telefone}
              onChange={(e) => set('telefone', e.target.value)}
              erro={erros.telefone}
            />
          </div>
          <Campo
            rotulo="E-mail (opcional)"
            name="email"
            type="email"
            placeholder="contato@clinica.com.br"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            erro={erros.email}
          />
        </Secao>

        <Secao icone="location_on" titulo="Localização">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Seletor
              rotulo="UF"
              name="regiao_uf"
              value={form.regiao_uf}
              onChange={(e) => set('regiao_uf', e.target.value)}
              erro={erros.regiao_uf}
            >
              <option value="">Selecione</option>
              {UFS.map(([sigla, nome]) => (
                <option key={sigla} value={sigla}>
                  {sigla} — {nome}
                </option>
              ))}
            </Seletor>
            <Campo
              rotulo="Cidade"
              name="regiao_cidade"
              placeholder="Ex.: Belo Horizonte"
              value={form.regiao_cidade}
              onChange={(e) => set('regiao_cidade', e.target.value)}
              erro={erros.regiao_cidade}
            />
          </div>
          <AreaTexto
            rotulo="Endereço (opcional)"
            name="endereco"
            placeholder="Rua, número, bairro, complemento"
            value={form.endereco}
            onChange={(e) => set('endereco', e.target.value)}
          />
        </Secao>

        {editando && (
          <Secao icone="toggle_on" titulo="Situação">
            <Seletor
              rotulo="Status"
              name="ativo"
              value={form.ativo}
              onChange={(e) => set('ativo', e.target.value)}
              dica="Clínicas inativas deixam de aparecer na seleção ao encaminhar exames."
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </Seletor>
          </Secao>
        )}

        {editando && (
          <Secao icone="fact_check" titulo="Procedimentos Realizados">
            {erroProcedimento && (
              <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
                {erroProcedimento}
              </div>
            )}

            {carregandoProcedimentos ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-surface-container animate-pulse" />
                ))}
              </div>
            ) : procedimentos.length === 0 ? (
              <p className="text-label-md text-on-surface-variant">
                Nenhum procedimento vinculado a esta clínica ainda.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {procedimentos.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant/40 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-body-md text-on-surface truncate">{p.nome_exame}</p>
                      <p className="text-label-sm text-on-surface-variant">
                        Repasse: {formatarMoeda(p.valor_repasse)}
                      </p>
                    </div>
                    {podeRemover && (
                      <button
                        type="button"
                        onClick={() => removerProcedimento(p.id)}
                        className="text-error flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-error-container"
                        aria-label={`Remover ${p.nome_exame}`}
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {podeVincular && (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3 items-end pt-2 border-t border-outline-variant/40">
                <Seletor
                  rotulo="Procedimento (Tabela 27)"
                  name="novo_procedimento_codigo"
                  value={novoProcedimento.procedimento_codigo}
                  onChange={(e) => atualizarNovoProcedimento('procedimento_codigo', e.target.value)}
                >
                  <option value="">Selecione</option>
                  {catalogo.map((c) => (
                    <option key={c.codigo_esocial} value={c.codigo_esocial}>
                      {c.nome_exame}
                    </option>
                  ))}
                </Seletor>
                <Campo
                  rotulo="Valor de repasse (R$)"
                  name="novo_valor_repasse"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0,00"
                  value={novoProcedimento.valor_repasse}
                  onChange={(e) => atualizarNovoProcedimento('valor_repasse', e.target.value)}
                />
                <Botao
                  type="button"
                  icone="add_link"
                  carregando={vinculando}
                  onClick={vincularProcedimento}
                >
                  Vincular procedimento
                </Botao>
              </div>
            )}
          </Secao>
        )}
      </div>

      <footer className="flex gap-3 px-margin-mobile md:px-md py-4 mt-2 max-w-3xl w-full border-t border-outline-variant">
        <Botao
          type="button"
          variante="secundario"
          className="flex-1"
          onClick={() => navigate('/credenciados')}
        >
          {editando ? 'Voltar' : 'Cancelar'}
        </Botao>
        {podeSalvar && (
          <Botao type="submit" icone="save" carregando={salvando} className="flex-1">
            {salvando ? 'Salvando...' : 'Salvar clínica'}
          </Botao>
        )}
      </footer>
    </form>
  );
}
