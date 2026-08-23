import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { daEmpresa } from '@/lib/consulta';
import { Secao, Campo, Seletor, AreaTexto, Botao } from '@/components/ui/Form';
import { formatarCpf } from '@/lib/funcionarios';
import { TIPO_LABEL, TIPO_DESCRICAO, type TipoTreinamento } from '@/lib/treinamentos';

type Unidade = { id: string; razao_social: string; nome_fantasia: string | null };
type Funcionario = { id: string; nome: string; cpf: string };

type FormState = {
  unidade_id: string;
  tipo: TipoTreinamento;
  tema: string;
  data_evento: string;
  carga_horaria: string;
  instrutor: string;
  observacao: string;
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

const VAZIO: FormState = {
  unidade_id: '',
  tipo: 'dds',
  tema: '',
  data_evento: '',
  carga_horaria: '',
  instrutor: '',
  observacao: '',
};

export default function TreinamentoForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const { empresaAtiva } = useAuth();

  const [form, setForm] = useState<FormState>(() => ({ ...VAZIO, data_evento: hoje() }));
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [presentes, setPresentes] = useState<Set<string>>(new Set());
  const [buscaFuncionario, setBuscaFuncionario] = useState('');

  useEffect(() => {
    if (!empresaAtiva) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    const empresaId = empresaAtiva.empresa_id;

    async function carregar() {
      const [ru, rf] = await Promise.all([
        daEmpresa(supabase.from('unidades').select('id, razao_social, nome_fantasia'), empresaId).order(
          'razao_social'
        ),
        daEmpresa(supabase.from('funcionarios').select('id, nome, cpf'), empresaId)
          .eq('status', 'ativo')
          .order('nome'),
      ]);
      if (!ativo) return;

      const erroBase = ru.error ?? rf.error;
      if (erroBase) {
        setErroGeral(erroBase.message);
        setCarregando(false);
        return;
      }

      setUnidades((ru.data ?? []) as Unidade[]);
      setFuncionarios((rf.data ?? []) as Funcionario[]);

      if (id) {
        const { data, error } = await daEmpresa(supabase.from('treinamentos_eventos').select('*'), empresaId)
          .eq('id', id)
          .single();
        if (!ativo) return;
        if (error) {
          setErroGeral(error.message);
          setCarregando(false);
          return;
        }
        setForm({
          unidade_id: data.unidade_id,
          tipo: (data.tipo as TipoTreinamento) ?? 'dds',
          tema: data.tema ?? '',
          data_evento: data.data_evento ?? hoje(),
          carga_horaria: data.carga_horaria_minutos ? String(data.carga_horaria_minutos) : '',
          instrutor: data.instrutor ?? '',
          observacao: data.observacao ?? '',
        });

        const { data: participantesData, error: erroParticipantes } = await supabase
          .from('treinamentos_eventos_participantes')
          .select('funcionario_id, presente')
          .eq('evento_id', id);
        if (!ativo) return;
        if (erroParticipantes) {
          setErroGeral(erroParticipantes.message);
          setCarregando(false);
          return;
        }
        setPresentes(
          new Set(
            (participantesData ?? [])
              .filter((p) => p.presente)
              .map((p) => p.funcionario_id as string)
          )
        );
      }

      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [id, empresaAtiva]);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function alternarPresenca(funcionarioId: string) {
    setPresentes((prev) => {
      const novo = new Set(prev);
      if (novo.has(funcionarioId)) {
        novo.delete(funcionarioId);
      } else {
        novo.add(funcionarioId);
      }
      return novo;
    });
  }

  const termoFuncionario = buscaFuncionario.trim().toLowerCase();
  const termoFuncionarioDigits = buscaFuncionario.replace(/\D/g, '');
  const funcionariosFiltrados = useMemo(() => {
    if (!termoFuncionario) return funcionarios;
    return funcionarios.filter((f) => {
      const nomeMatch = f.nome.toLowerCase().includes(termoFuncionario);
      const cpfMatch = termoFuncionarioDigits.length > 0 && f.cpf.includes(termoFuncionarioDigits);
      return nomeMatch || cpfMatch;
    });
  }, [funcionarios, termoFuncionario, termoFuncionarioDigits]);

  function validar() {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.unidade_id) e.unidade_id = 'Selecione a unidade.';
    if (!form.tema.trim()) e.tema = 'Informe o tema do evento.';
    if (!form.data_evento) e.data_evento = 'Informe a data do evento.';
    if (form.carga_horaria) {
      const minutos = Number(form.carga_horaria);
      if (!Number.isInteger(minutos) || minutos <= 0) {
        e.carga_horaria = 'Informe uma carga horária válida, em minutos.';
      }
    }
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setErroGeral(null);
    if (!validar() || !empresaAtiva) return;
    setSalvando(true);

    const payload = {
      empresa_id: empresaAtiva.empresa_id,
      unidade_id: form.unidade_id,
      tipo: form.tipo,
      tema: form.tema.trim(),
      data_evento: form.data_evento,
      carga_horaria_minutos: form.carga_horaria ? Number(form.carga_horaria) : null,
      instrutor: form.instrutor.trim() || null,
      observacao: form.observacao.trim() || null,
    };

    let treinamentoId = id;
    if (editando) {
      const { error } = await supabase.from('treinamentos_eventos').update(payload).eq('id', id!);
      if (error) {
        setSalvando(false);
        setErroGeral(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase.from('treinamentos_eventos').insert(payload).select('id').single();
      if (error) {
        setSalvando(false);
        setErroGeral(error.message);
        return;
      }
      treinamentoId = data.id;
    }

    // Sincroniza a lista de presença: substitui os participantes do
    // evento pelo conjunto marcado agora (mais simples e sem risco de
    // sobra do que comparar diffs, e o volume por evento é pequeno).
    const { error: erroRemover } = await supabase
      .from('treinamentos_eventos_participantes')
      .delete()
      .eq('evento_id', treinamentoId!);

    if (erroRemover) {
      setSalvando(false);
      setErroGeral(erroRemover.message);
      return;
    }

    if (presentes.size > 0) {
      const linhas = [...presentes].map((funcionarioId) => ({
        evento_id: treinamentoId,
        funcionario_id: funcionarioId,
        presente: true,
      }));
      const { error: erroParticipantes } = await supabase
        .from('treinamentos_eventos_participantes')
        .insert(linhas);
      if (erroParticipantes) {
        setSalvando(false);
        setErroGeral(erroParticipantes.message);
        return;
      }
    }

    setSalvando(false);
    navigate('/treinamentos', { replace: true });
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
          onClick={() => navigate('/treinamentos')}
          className="text-primary-container flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-container"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-title-lg text-primary-container flex-1">
          {editando ? 'Editar evento' : 'Novo DDS ou treinamento'}
        </h2>
      </header>

      <div className="flex flex-col gap-6 p-margin-mobile md:p-md max-w-3xl w-full pb-32">
        {erroGeral && (
          <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-label-md">
            {erroGeral}
          </div>
        )}

        {unidades.length === 0 ? (
          <div className="flex items-start gap-2 bg-[#F97316]/10 text-[#9a3412] px-3 py-2 rounded-lg text-label-sm">
            <span className="material-symbols-outlined text-[16px] mt-px">warning</span>
            <span>Nenhuma unidade cadastrada ainda. Cadastre uma unidade antes de registrar um evento.</span>
          </div>
        ) : (
          <>
            <Secao icone="school" titulo="Evento">
              <Seletor
                rotulo="Tipo"
                name="tipo"
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value as TipoTreinamento)}
              >
                {(Object.keys(TIPO_LABEL) as TipoTreinamento[]).map((t) => (
                  <option key={t} value={t}>
                    {TIPO_LABEL[t]} — {TIPO_DESCRICAO[t]}
                  </option>
                ))}
              </Seletor>

              <Campo
                rotulo="Tema"
                name="tema"
                placeholder="Ex.: Uso correto de EPI, Trabalho em altura, Ergonomia..."
                value={form.tema}
                onChange={(e) => set('tema', e.target.value)}
                erro={erros.tema}
                autoFocus
              />

              <Seletor
                rotulo="Unidade"
                name="unidade_id"
                value={form.unidade_id}
                onChange={(e) => set('unidade_id', e.target.value)}
                erro={erros.unidade_id}
              >
                <option value="">Selecione a unidade</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome_fantasia || u.razao_social}
                  </option>
                ))}
              </Seletor>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Campo
                  rotulo="Data do evento"
                  name="data_evento"
                  type="date"
                  value={form.data_evento}
                  onChange={(e) => set('data_evento', e.target.value)}
                  erro={erros.data_evento}
                />
                <Campo
                  rotulo="Carga horária (minutos)"
                  name="carga_horaria"
                  type="number"
                  min={1}
                  placeholder="Ex.: 30"
                  value={form.carga_horaria}
                  onChange={(e) => set('carga_horaria', e.target.value)}
                  erro={erros.carga_horaria}
                  dica="Opcional. Informe em minutos (ex.: 90 para 1h30)."
                />
                <Campo
                  rotulo="Instrutor/responsável"
                  name="instrutor"
                  placeholder="Nome de quem ministrou"
                  value={form.instrutor}
                  onChange={(e) => set('instrutor', e.target.value)}
                />
              </div>

              <AreaTexto
                rotulo="Observações (opcional)"
                name="observacao"
                placeholder="Ex.: material utilizado, ocorrências, pontos abordados..."
                value={form.observacao}
                onChange={(e) => set('observacao', e.target.value)}
              />
            </Secao>

            <Secao icone="groups" titulo="Participantes">
              {funcionarios.length === 0 ? (
                <p className="text-label-md text-on-surface-variant">
                  Nenhum funcionário ativo cadastrado ainda.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                        search
                      </span>
                      <input
                        type="search"
                        placeholder="Buscar funcionário por nome ou CPF"
                        value={buscaFuncionario}
                        onChange={(e) => setBuscaFuncionario(e.target.value)}
                        className="w-full h-11 rounded-lg border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-body-md placeholder:text-outline focus:outline-none focus:border-2 focus:border-primary-container"
                      />
                    </div>
                    <span className="text-label-sm text-on-surface-variant shrink-0">
                      {presentes.size} de {funcionarios.length} marcado{presentes.size === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto rounded-lg border border-outline-variant/40 divide-y divide-outline-variant/40">
                    {funcionariosFiltrados.length === 0 ? (
                      <p className="text-label-md text-on-surface-variant p-4 text-center">
                        Nenhum funcionário encontrado.
                      </p>
                    ) : (
                      funcionariosFiltrados.map((f) => (
                        <label
                          key={f.id}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-container transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={presentes.has(f.id)}
                            onChange={() => alternarPresenca(f.id)}
                            className="size-5 rounded border-outline-variant accent-primary-container"
                          />
                          <div className="min-w-0">
                            <p className="text-body-md text-on-surface truncate">{f.nome}</p>
                            <p className="text-label-sm text-on-surface-variant truncate">
                              {formatarCpf(f.cpf)}
                            </p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </>
              )}
            </Secao>
          </>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 md:left-80 right-0 bg-surface-container-lowest p-4 border-t border-outline-variant flex gap-3 z-30 pb-24 md:pb-4">
        <div className="flex gap-3 w-full max-w-3xl mx-auto md:mx-0 md:ml-md">
          <Botao type="button" variante="secundario" className="flex-1" onClick={() => navigate('/treinamentos')}>
            Cancelar
          </Botao>
          <Botao
            type="submit"
            icone="save"
            carregando={salvando}
            disabled={unidades.length === 0}
            className="flex-1"
          >
            {salvando ? 'Salvando...' : 'Salvar evento'}
          </Botao>
        </div>
      </footer>
    </form>
  );
}
