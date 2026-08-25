-- =====================================================================
-- PrevSafe :: Motor de Workflow / Ordens de Serviço
-- Catálogo de modelos de serviço (PGR, PCMSO, LTCAT...) com etapas e
-- tarefas configuráveis, e a Ordem de Serviço (OS) — entidade central que
-- instancia automaticamente o workflow do modelo escolhido, calcula
-- progresso a partir das tarefas concluídas e aplica as regras de
-- conclusão de etapa / entrega descritas no blueprint (RN004, RN005 e a
-- regra de entrega da OS). Módulo isolado por enquanto: não altera CIPA
-- nem os módulos operacionais já existentes (treinamentos, EPI, agenda
-- médica etc.) — a integração com eles fica para uma etapa futura.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Catálogo de modelos de serviço (global, não vinculado a empresa —
--    mesmo papel de catálogo estático que procedimentos_t27; gerido via
--    migration/service role, leitura liberada para todo usuário
--    autenticado).
-- ---------------------------------------------------------------------

create table if not exists modelos_servico (
  id uuid primary key default gen_random_uuid(),
  codigo varchar(30) not null unique,
  nome varchar(150) not null,
  categoria varchar(60),
  descricao text,
  prazo_padrao_dias integer,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists modelos_servico_etapas (
  id uuid primary key default gen_random_uuid(),
  modelo_servico_id uuid not null references modelos_servico(id) on delete cascade,
  nome varchar(150) not null,
  descricao text,
  ordem integer not null,
  prazo_dias integer,
  obrigatoria boolean not null default true,
  aguarda_cliente boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (modelo_servico_id, ordem)
);

create table if not exists modelos_servico_tarefas (
  id uuid primary key default gen_random_uuid(),
  modelo_etapa_id uuid not null references modelos_servico_etapas(id) on delete cascade,
  nome varchar(150) not null,
  descricao text,
  ordem integer not null default 0,
  obrigatoria boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (modelo_etapa_id, ordem)
);

create index if not exists idx_modelos_servico_etapas_modelo on modelos_servico_etapas(modelo_servico_id);
create index if not exists idx_modelos_servico_tarefas_etapa on modelos_servico_tarefas(modelo_etapa_id);

-- ---------------------------------------------------------------------
-- 2. Ordem de Serviço — tabela central, vinculada à empresa já existente
--    no PrevSafe (empresa = cliente do serviço).
-- ---------------------------------------------------------------------

create table if not exists ordens_servico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  modelo_servico_id uuid references modelos_servico(id) on delete set null,
  numero varchar(20) unique,
  titulo varchar(200) not null,
  descricao text,
  status varchar(25) not null default 'rascunho' check (status in (
    'rascunho', 'pronta', 'agendada', 'em_execucao', 'aguardando_cliente', 'bloqueada',
    'entregue', 'aguardando_aceite', 'aceita', 'concluida', 'em_espera', 'cancelada', 'retrabalho'
  )),
  prioridade varchar(10) not null default 'normal' check (prioridade in ('baixa', 'normal', 'alta', 'urgente')),
  data_inicio date,
  data_prazo date,
  data_conclusao timestamptz,
  progresso numeric(5,2) not null default 0 check (progresso >= 0 and progresso <= 100),
  gestor_id uuid references auth.users(id) on delete set null,
  responsavel_tecnico_id uuid references auth.users(id) on delete set null,
  motivo_bloqueio text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_ordens_servico_empresa on ordens_servico(empresa_id, status);

create table if not exists ordens_servico_etapas (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references ordens_servico(id) on delete cascade,
  modelo_etapa_id uuid references modelos_servico_etapas(id) on delete set null,
  nome varchar(150) not null,
  ordem integer not null default 0,
  status varchar(20) not null default 'pendente' check (status in (
    'pendente', 'em_andamento', 'aguardando_cliente', 'bloqueada', 'concluida', 'cancelada'
  )),
  obrigatoria boolean not null default true,
  aguarda_cliente boolean not null default false,
  responsavel_id uuid references auth.users(id) on delete set null,
  data_inicio date,
  data_prazo date,
  data_conclusao timestamptz,
  motivo_bloqueio text,
  status_alterado_em timestamptz not null default now(),
  tempo_aguardando_cliente_minutos bigint not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_ordens_servico_etapas_os on ordens_servico_etapas(ordem_servico_id, ordem);

create table if not exists ordens_servico_tarefas (
  id uuid primary key default gen_random_uuid(),
  etapa_id uuid not null references ordens_servico_etapas(id) on delete cascade,
  nome varchar(150) not null,
  descricao text,
  ordem integer not null default 0,
  status varchar(20) not null default 'pendente' check (status in (
    'pendente', 'em_andamento', 'aguardando_cliente', 'bloqueada', 'em_revisao', 'concluida', 'cancelada'
  )),
  obrigatoria boolean not null default true,
  responsavel_id uuid references auth.users(id) on delete set null,
  data_prazo date,
  data_conclusao timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_ordens_servico_tarefas_etapa on ordens_servico_tarefas(etapa_id);

create table if not exists ordens_servico_dependencias (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references ordens_servico(id) on delete cascade,
  etapa_origem_id uuid not null references ordens_servico_etapas(id) on delete cascade,
  etapa_destino_id uuid not null references ordens_servico_etapas(id) on delete cascade,
  tipo varchar(15) not null check (tipo in ('bloqueia', 'requer', 'precede')),
  criado_em timestamptz not null default now(),
  constraint chk_ordens_servico_dependencias_distintas check (etapa_origem_id <> etapa_destino_id)
);

create index if not exists idx_ordens_servico_dependencias_os on ordens_servico_dependencias(ordem_servico_id);

-- ---------------------------------------------------------------------
-- 3. atualizado_em (padrão já usado em todo o schema)
-- ---------------------------------------------------------------------

drop trigger if exists trg_modelos_servico_atualizado on modelos_servico;
create trigger trg_modelos_servico_atualizado before update on modelos_servico
  for each row execute function public.set_atualizado_em();

drop trigger if exists trg_ordens_servico_atualizado on ordens_servico;
create trigger trg_ordens_servico_atualizado before update on ordens_servico
  for each row execute function public.set_atualizado_em();

drop trigger if exists trg_ordens_servico_etapas_atualizado on ordens_servico_etapas;
create trigger trg_ordens_servico_etapas_atualizado before update on ordens_servico_etapas
  for each row execute function public.set_atualizado_em();

drop trigger if exists trg_ordens_servico_tarefas_atualizado on ordens_servico_tarefas;
create trigger trg_ordens_servico_tarefas_atualizado before update on ordens_servico_tarefas
  for each row execute function public.set_atualizado_em();

-- ---------------------------------------------------------------------
-- 4. Numeração legível (OS-AAAA-NNNNNN) — o UUID nunca é mostrado ao
--    usuário. A sequência não reinicia por ano (simplificação: o ano
--    gravado no código já identifica a competência; reiniciar a cada
--    ano exigiria um contador auxiliar por ano, desnecessário aqui).
-- ---------------------------------------------------------------------

create sequence if not exists ordens_servico_numero_seq;

create or replace function public.gerar_numero_os()
returns trigger
language plpgsql
as $fn$
begin
  if new.numero is null then
    new.numero := 'OS-' || extract(year from now())::text || '-'
      || lpad(nextval('ordens_servico_numero_seq')::text, 6, '0');
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_ordens_servico_numero on ordens_servico;
create trigger trg_ordens_servico_numero before insert on ordens_servico
  for each row execute function public.gerar_numero_os();

-- ---------------------------------------------------------------------
-- 5. Motor de workflow: ao criar a OS, copia etapas e tarefas do modelo
--    escolhido (blueprint §50). SECURITY DEFINER porque a permissão
--    real já foi validada na policy de insert de ordens_servico — as
--    linhas filhas (etapas/tarefas) não têm empresa_id próprio para
--    checar de novo.
-- ---------------------------------------------------------------------

create or replace function public.gerar_workflow_os()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_etapa record;
  v_nova_etapa_id uuid;
  v_tarefa record;
begin
  if new.modelo_servico_id is null then
    return new;
  end if;

  for v_etapa in
    select * from modelos_servico_etapas
    where modelo_servico_id = new.modelo_servico_id
    order by ordem
  loop
    insert into ordens_servico_etapas (
      ordem_servico_id, modelo_etapa_id, nome, ordem, obrigatoria, aguarda_cliente, status, data_prazo
    ) values (
      new.id, v_etapa.id, v_etapa.nome, v_etapa.ordem, v_etapa.obrigatoria, v_etapa.aguarda_cliente,
      'pendente',
      case when v_etapa.prazo_dias is not null and new.data_inicio is not null
        then new.data_inicio + v_etapa.prazo_dias else null end
    )
    returning id into v_nova_etapa_id;

    for v_tarefa in
      select * from modelos_servico_tarefas
      where modelo_etapa_id = v_etapa.id
      order by ordem
    loop
      insert into ordens_servico_tarefas (etapa_id, nome, descricao, ordem, obrigatoria, status)
      values (v_nova_etapa_id, v_tarefa.nome, v_tarefa.descricao, v_tarefa.ordem, v_tarefa.obrigatoria, 'pendente');
    end loop;
  end loop;

  return new;
end;
$fn$;

drop trigger if exists trg_ordens_servico_gera_workflow on ordens_servico;
create trigger trg_ordens_servico_gera_workflow after insert on ordens_servico
  for each row execute function public.gerar_workflow_os();

-- ---------------------------------------------------------------------
-- 6. Progresso automático da OS (blueprint §70) — tarefas concluídas /
--    tarefas totais, ignorando tarefas canceladas. Nunca editável
--    manualmente: não existe policy de update liberando a coluna
--    `progresso` além deste trigger (que roda como SECURITY DEFINER).
-- ---------------------------------------------------------------------

create or replace function public.recalcular_progresso_os(p_ordem_servico_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_total int;
  v_concluidas int;
begin
  select count(*), count(*) filter (where t.status = 'concluida')
    into v_total, v_concluidas
  from ordens_servico_tarefas t
  join ordens_servico_etapas e on e.id = t.etapa_id
  where e.ordem_servico_id = p_ordem_servico_id
    and t.status <> 'cancelada';

  update ordens_servico
    set progresso = case when v_total = 0 then 0 else round(100.0 * v_concluidas / v_total, 2) end
    where id = p_ordem_servico_id;
end;
$fn$;

create or replace function public.trg_tarefas_recalcula_progresso()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_ordem_id uuid;
begin
  select e.ordem_servico_id into v_ordem_id
  from ordens_servico_etapas e
  where e.id = coalesce(new.etapa_id, old.etapa_id);

  if v_ordem_id is not null then
    perform public.recalcular_progresso_os(v_ordem_id);
  end if;

  return coalesce(new, old);
end;
$fn$;

drop trigger if exists trg_ordens_servico_tarefas_progresso on ordens_servico_tarefas;
create trigger trg_ordens_servico_tarefas_progresso
  after insert or update of status or delete on ordens_servico_tarefas
  for each row execute function public.trg_tarefas_recalcula_progresso();

-- ---------------------------------------------------------------------
-- 7. RN004/RN005 — uma etapa obrigatória só conclui com todas as suas
--    tarefas obrigatórias concluídas/canceladas; uma etapa bloqueada
--    exige motivo registrado. Falha com mensagem clara (RAISE
--    EXCEPTION), que a UI deve exibir ao usuário.
-- ---------------------------------------------------------------------

create or replace function public.valida_transicao_etapa()
returns trigger
language plpgsql
as $fn$
begin
  if new.status = 'concluida' and old.status is distinct from 'concluida' then
    if exists (
      select 1 from ordens_servico_tarefas t
      where t.etapa_id = new.id and t.obrigatoria = true and t.status not in ('concluida', 'cancelada')
    ) then
      raise exception 'Não é possível concluir a etapa "%": existem tarefas obrigatórias pendentes.', new.nome;
    end if;
  end if;

  if new.status = 'bloqueada' and coalesce(btrim(new.motivo_bloqueio), '') = '' then
    raise exception 'Uma etapa bloqueada precisa de um motivo registrado.';
  end if;

  if new.status is distinct from old.status then
    if old.status = 'aguardando_cliente' then
      new.tempo_aguardando_cliente_minutos := coalesce(old.tempo_aguardando_cliente_minutos, 0)
        + greatest(0, round(extract(epoch from (now() - old.status_alterado_em)) / 60))::bigint;
    end if;
    new.status_alterado_em := now();
  end if;

  return new;
end;
$fn$;

drop trigger if exists trg_ordens_servico_etapas_valida on ordens_servico_etapas;
create trigger trg_ordens_servico_etapas_valida before update on ordens_servico_etapas
  for each row execute function public.valida_transicao_etapa();

-- ---------------------------------------------------------------------
-- 8. Regra de entrega da OS (blueprint §53) — só assume 'entregue'
--    quando todas as etapas obrigatórias estiverem concluídas.
-- ---------------------------------------------------------------------

create or replace function public.valida_entrega_os()
returns trigger
language plpgsql
as $fn$
begin
  if new.status = 'entregue' and old.status is distinct from 'entregue' then
    if exists (
      select 1 from ordens_servico_etapas e
      where e.ordem_servico_id = new.id and e.obrigatoria = true and e.status <> 'concluida'
    ) then
      raise exception 'Não é possível entregar a OS "%": existem etapas obrigatórias não concluídas.', new.numero;
    end if;
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_ordens_servico_valida_entrega on ordens_servico;
create trigger trg_ordens_servico_valida_entrega before update on ordens_servico
  for each row execute function public.valida_entrega_os();

-- ---------------------------------------------------------------------
-- 9. RLS — modelos_servico* é catálogo global (leitura liberada,
--    escrita apenas via service role/migration, mesmo padrão de
--    catálogos estáticos como procedimentos_t27).
-- ---------------------------------------------------------------------

alter table modelos_servico enable row level security;
alter table modelos_servico_etapas enable row level security;
alter table modelos_servico_tarefas enable row level security;

drop policy if exists modelos_servico_select on modelos_servico;
create policy modelos_servico_select on modelos_servico for select to authenticated using (true);

drop policy if exists modelos_servico_etapas_select on modelos_servico_etapas;
create policy modelos_servico_etapas_select on modelos_servico_etapas for select to authenticated using (true);

drop policy if exists modelos_servico_tarefas_select on modelos_servico_tarefas;
create policy modelos_servico_tarefas_select on modelos_servico_tarefas for select to authenticated using (true);

-- ordens_servico: padrão de 4 policies (select/insert/update/delete) igual
-- ao usado em equipamentos_medicao/agenda_medica, vinculado a empresa_id.

alter table ordens_servico enable row level security;

drop policy if exists ordens_servico_select on ordens_servico;
drop policy if exists ordens_servico_insert on ordens_servico;
drop policy if exists ordens_servico_update on ordens_servico;
drop policy if exists ordens_servico_delete on ordens_servico;

create policy ordens_servico_select on ordens_servico for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'ordens_servico', 'visualizar')
);
create policy ordens_servico_insert on ordens_servico for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'ordens_servico', 'criar')
);
create policy ordens_servico_update on ordens_servico for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'ordens_servico', 'editar')
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'ordens_servico', 'editar')
  );
create policy ordens_servico_delete on ordens_servico for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'ordens_servico', 'excluir')
);

-- ordens_servico_etapas / tarefas / dependencias não têm empresa_id
-- próprio: a checagem sobe até a OS via EXISTS, usando o mesmo recurso
-- 'ordens_servico' (etapa/tarefa são parte da mesma entidade de
-- permissão que a OS).

alter table ordens_servico_etapas enable row level security;

drop policy if exists ordens_servico_etapas_select on ordens_servico_etapas;
drop policy if exists ordens_servico_etapas_insert on ordens_servico_etapas;
drop policy if exists ordens_servico_etapas_update on ordens_servico_etapas;
drop policy if exists ordens_servico_etapas_delete on ordens_servico_etapas;

create policy ordens_servico_etapas_select on ordens_servico_etapas for select to authenticated using (
  exists (
    select 1 from ordens_servico os
    where os.id = ordens_servico_etapas.ordem_servico_id
      and os.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), os.empresa_id, 'ordens_servico', 'visualizar')
  )
);
create policy ordens_servico_etapas_insert on ordens_servico_etapas for insert to authenticated with check (
  exists (
    select 1 from ordens_servico os
    where os.id = ordens_servico_etapas.ordem_servico_id
      and os.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), os.empresa_id, 'ordens_servico', 'criar')
  )
);
create policy ordens_servico_etapas_update on ordens_servico_etapas for update to authenticated
  using (
    exists (
      select 1 from ordens_servico os
      where os.id = ordens_servico_etapas.ordem_servico_id
        and os.empresa_id in (select auth_empresas_ids())
        and tem_permissao(auth.uid(), os.empresa_id, 'ordens_servico', 'editar')
    )
  )
  with check (
    exists (
      select 1 from ordens_servico os
      where os.id = ordens_servico_etapas.ordem_servico_id
        and os.empresa_id in (select auth_empresas_ids())
        and tem_permissao(auth.uid(), os.empresa_id, 'ordens_servico', 'editar')
    )
  );
create policy ordens_servico_etapas_delete on ordens_servico_etapas for delete to authenticated using (
  exists (
    select 1 from ordens_servico os
    where os.id = ordens_servico_etapas.ordem_servico_id
      and os.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), os.empresa_id, 'ordens_servico', 'excluir')
  )
);

alter table ordens_servico_tarefas enable row level security;

drop policy if exists ordens_servico_tarefas_select on ordens_servico_tarefas;
drop policy if exists ordens_servico_tarefas_insert on ordens_servico_tarefas;
drop policy if exists ordens_servico_tarefas_update on ordens_servico_tarefas;
drop policy if exists ordens_servico_tarefas_delete on ordens_servico_tarefas;

create policy ordens_servico_tarefas_select on ordens_servico_tarefas for select to authenticated using (
  exists (
    select 1 from ordens_servico_etapas e
    join ordens_servico os on os.id = e.ordem_servico_id
    where e.id = ordens_servico_tarefas.etapa_id
      and os.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), os.empresa_id, 'ordens_servico', 'visualizar')
  )
);
create policy ordens_servico_tarefas_insert on ordens_servico_tarefas for insert to authenticated with check (
  exists (
    select 1 from ordens_servico_etapas e
    join ordens_servico os on os.id = e.ordem_servico_id
    where e.id = ordens_servico_tarefas.etapa_id
      and os.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), os.empresa_id, 'ordens_servico', 'criar')
  )
);
create policy ordens_servico_tarefas_update on ordens_servico_tarefas for update to authenticated
  using (
    exists (
      select 1 from ordens_servico_etapas e
      join ordens_servico os on os.id = e.ordem_servico_id
      where e.id = ordens_servico_tarefas.etapa_id
        and os.empresa_id in (select auth_empresas_ids())
        and tem_permissao(auth.uid(), os.empresa_id, 'ordens_servico', 'editar')
    )
  )
  with check (
    exists (
      select 1 from ordens_servico_etapas e
      join ordens_servico os on os.id = e.ordem_servico_id
      where e.id = ordens_servico_tarefas.etapa_id
        and os.empresa_id in (select auth_empresas_ids())
        and tem_permissao(auth.uid(), os.empresa_id, 'ordens_servico', 'editar')
    )
  );
create policy ordens_servico_tarefas_delete on ordens_servico_tarefas for delete to authenticated using (
  exists (
    select 1 from ordens_servico_etapas e
    join ordens_servico os on os.id = e.ordem_servico_id
    where e.id = ordens_servico_tarefas.etapa_id
      and os.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), os.empresa_id, 'ordens_servico', 'excluir')
  )
);

alter table ordens_servico_dependencias enable row level security;

drop policy if exists ordens_servico_dependencias_select on ordens_servico_dependencias;
drop policy if exists ordens_servico_dependencias_insert on ordens_servico_dependencias;
drop policy if exists ordens_servico_dependencias_delete on ordens_servico_dependencias;

create policy ordens_servico_dependencias_select on ordens_servico_dependencias for select to authenticated using (
  exists (
    select 1 from ordens_servico os
    where os.id = ordens_servico_dependencias.ordem_servico_id
      and os.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), os.empresa_id, 'ordens_servico', 'visualizar')
  )
);
create policy ordens_servico_dependencias_insert on ordens_servico_dependencias for insert to authenticated with check (
  exists (
    select 1 from ordens_servico os
    where os.id = ordens_servico_dependencias.ordem_servico_id
      and os.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), os.empresa_id, 'ordens_servico', 'editar')
  )
);
create policy ordens_servico_dependencias_delete on ordens_servico_dependencias for delete to authenticated using (
  exists (
    select 1 from ordens_servico os
    where os.id = ordens_servico_dependencias.ordem_servico_id
      and os.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), os.empresa_id, 'ordens_servico', 'editar')
  )
);

-- ---------------------------------------------------------------------
-- 10. Catálogo de permissões
-- ---------------------------------------------------------------------

insert into recursos (codigo, nome, modulo, ordem) values
  ('ordens_servico', 'Ordens de Serviço', 'nucleo', 70)
on conflict (codigo) do update set nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;

insert into recurso_acoes (recurso_codigo, acao_codigo)
select r.codigo, a.codigo from recursos r cross join acoes a
where r.codigo in ('ordens_servico') and a.codigo in ('visualizar', 'criar', 'editar', 'excluir')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 11. Modelo de exemplo: PGR (blueprint §51), com uma tarefa de exemplo
--     por etapa para demonstrar a cópia automática do workflow.
-- ---------------------------------------------------------------------

insert into modelos_servico (codigo, nome, categoria, descricao, prazo_padrao_dias)
values ('PGR', 'Programa de Gerenciamento de Riscos', 'seguranca_do_trabalho',
        'Elaboração do PGR conforme NR-01.', 15)
on conflict (codigo) do nothing;

do $$
declare
  v_modelo_id uuid;
  v_etapa_id uuid;
  v_etapas text[][] := array[
    ['01 Cadastro', '1'], ['02 Coleta de dados', '1'], ['03 Documentação', '2'],
    ['04 Agendamento', '1'], ['05 Visita técnica', '3'], ['06 Identificação de perigos', '2'],
    ['07 Avaliação de riscos', '2'], ['08 Inventário', '1'], ['09 Plano de ação', '2'],
    ['10 Elaboração', '4'], ['11 Revisão técnica', '2'], ['12 Aprovação interna', '1'],
    ['13 Entrega', '1'], ['14 Aceite', '2'], ['15 Encerramento', '1']
  ];
  v_aguarda_cliente text[] := array['03 Documentação', '04 Agendamento', '05 Visita técnica', '14 Aceite'];
  v_nome text;
  v_ordem int;
begin
  select id into v_modelo_id from modelos_servico where codigo = 'PGR';
  if v_modelo_id is null or exists (select 1 from modelos_servico_etapas where modelo_servico_id = v_modelo_id) then
    return;
  end if;

  for v_ordem in 1 .. array_length(v_etapas, 1) loop
    v_nome := v_etapas[v_ordem][1];
    insert into modelos_servico_etapas (modelo_servico_id, nome, ordem, prazo_dias, obrigatoria, aguarda_cliente)
    values (v_modelo_id, v_nome, v_ordem, v_etapas[v_ordem][2]::int, true, v_nome = any(v_aguarda_cliente))
    returning id into v_etapa_id;

    insert into modelos_servico_tarefas (modelo_etapa_id, nome, ordem, obrigatoria)
    values (v_etapa_id, 'Executar: ' || v_nome, 1, true);
  end loop;
end $$;
