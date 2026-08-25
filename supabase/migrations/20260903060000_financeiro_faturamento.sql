-- =====================================================================
-- PrevSafe :: Financeiro e Faturamento Integrado (Módulo 8)
-- Planos de cobrança (por vidas ativas ou por exame realizado), as
-- faturas mensais geradas a partir deles, e a conciliação dos repasses
-- devidos às clínicas da rede credenciada (clinicas_credenciadas).
--
-- Segue o mesmo padrão dual de titularidade de licencas_modulo: o
-- plano pertence a exatamente uma consultoria OU a exatamente uma
-- empresa (num_nonnulls = 1).
-- =====================================================================

create table if not exists planos_faturamento (
  id uuid primary key default gen_random_uuid(),
  consultoria_id uuid references consultorias(id) on delete cascade,
  empresa_id uuid references empresas(id) on delete cascade,
  tipo_cobranca varchar(20) not null check (tipo_cobranca in ('vidas_ativas', 'por_exame')),
  valor_unitario numeric(10, 2) not null check (valor_unitario >= 0),
  vigencia_inicio date not null default current_date,
  vigencia_fim date,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint chk_planos_faturamento_titular check (num_nonnulls(consultoria_id, empresa_id) = 1),
  constraint chk_planos_faturamento_vigencia check (vigencia_fim is null or vigencia_fim >= vigencia_inicio)
);

create index if not exists idx_planos_faturamento_consultoria on planos_faturamento(consultoria_id) where consultoria_id is not null;
create index if not exists idx_planos_faturamento_empresa on planos_faturamento(empresa_id) where empresa_id is not null;

drop trigger if exists trg_planos_faturamento_atualizado on planos_faturamento;
create trigger trg_planos_faturamento_atualizado before update on planos_faturamento
  for each row execute function public.set_atualizado_em();

alter table planos_faturamento enable row level security;

drop policy if exists planos_faturamento_select on planos_faturamento;
drop policy if exists planos_faturamento_insert on planos_faturamento;
drop policy if exists planos_faturamento_update on planos_faturamento;
drop policy if exists planos_faturamento_delete on planos_faturamento;

-- Titular consultoria: acesso resolvido pela empresa do usuário, já que
-- ainda não existe um vínculo direto usuário<->consultoria no schema.
create policy planos_faturamento_select on planos_faturamento for select to authenticated using (
  (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'financeiro', 'visualizar'))
  or (consultoria_id in (
    select e.consultoria_id from empresas e
    where e.id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), e.id, 'financeiro', 'visualizar')
  ))
);
create policy planos_faturamento_insert on planos_faturamento for insert to authenticated with check (
  (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'financeiro', 'criar'))
  or (consultoria_id in (
    select e.consultoria_id from empresas e
    where e.id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), e.id, 'financeiro', 'criar')
  ))
);
create policy planos_faturamento_update on planos_faturamento for update to authenticated
  using (
    (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'financeiro', 'editar'))
    or (consultoria_id in (
      select e.consultoria_id from empresas e
      where e.id in (select auth_empresas_ids())
        and tem_permissao(auth.uid(), e.id, 'financeiro', 'editar')
    ))
  )
  with check (
    (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'financeiro', 'editar'))
    or (consultoria_id in (
      select e.consultoria_id from empresas e
      where e.id in (select auth_empresas_ids())
        and tem_permissao(auth.uid(), e.id, 'financeiro', 'editar')
    ))
  );
create policy planos_faturamento_delete on planos_faturamento for delete to authenticated using (
  (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'financeiro', 'excluir'))
  or (consultoria_id in (
    select e.consultoria_id from empresas e
    where e.id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), e.id, 'financeiro', 'excluir')
  ))
);


create table if not exists faturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  plano_id uuid not null references planos_faturamento(id) on delete restrict,
  competencia date not null,
  quantidade_apurada integer not null default 0 check (quantidade_apurada >= 0),
  valor_total numeric(10, 2) not null default 0 check (valor_total >= 0),
  status varchar(20) not null default 'aberta'
    check (status in ('aberta', 'emitida', 'paga', 'cancelada')),
  vencimento date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, plano_id, competencia)
);

create index if not exists idx_faturas_empresa on faturas(empresa_id, competencia desc);

drop trigger if exists trg_faturas_atualizado on faturas;
create trigger trg_faturas_atualizado before update on faturas
  for each row execute function public.set_atualizado_em();

alter table faturas enable row level security;

drop policy if exists faturas_select on faturas;
drop policy if exists faturas_insert on faturas;
drop policy if exists faturas_update on faturas;
drop policy if exists faturas_delete on faturas;

create policy faturas_select on faturas for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'financeiro', 'visualizar')
);
create policy faturas_insert on faturas for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'financeiro', 'criar')
);
create policy faturas_update on faturas for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'financeiro', 'editar')
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'financeiro', 'editar')
  );
create policy faturas_delete on faturas for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'financeiro', 'excluir')
);


create table if not exists repasses_clinicas_credenciadas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references clinicas_credenciadas(id) on delete cascade,
  agenda_medica_id uuid references agenda_medica(id) on delete set null,
  competencia date not null,
  valor numeric(10, 2) not null check (valor >= 0),
  status varchar(20) not null default 'pendente'
    check (status in ('pendente', 'conferido', 'pago', 'contestado')),
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_repasses_clinica on repasses_clinicas_credenciadas(clinica_id, competencia desc);

drop trigger if exists trg_repasses_atualizado on repasses_clinicas_credenciadas;
create trigger trg_repasses_atualizado before update on repasses_clinicas_credenciadas
  for each row execute function public.set_atualizado_em();

alter table repasses_clinicas_credenciadas enable row level security;

drop policy if exists repasses_select on repasses_clinicas_credenciadas;
drop policy if exists repasses_insert on repasses_clinicas_credenciadas;
drop policy if exists repasses_update on repasses_clinicas_credenciadas;
drop policy if exists repasses_delete on repasses_clinicas_credenciadas;

create policy repasses_select on repasses_clinicas_credenciadas for select to authenticated using (
  exists (
    select 1 from clinicas_credenciadas c
    where c.id = clinica_id
      and c.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), c.empresa_id, 'financeiro', 'visualizar')
  )
);
create policy repasses_insert on repasses_clinicas_credenciadas for insert to authenticated with check (
  exists (
    select 1 from clinicas_credenciadas c
    where c.id = clinica_id
      and c.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), c.empresa_id, 'financeiro', 'criar')
  )
);
create policy repasses_update on repasses_clinicas_credenciadas for update to authenticated
  using (
    exists (
      select 1 from clinicas_credenciadas c
      where c.id = clinica_id
        and c.empresa_id in (select auth_empresas_ids())
        and tem_permissao(auth.uid(), c.empresa_id, 'financeiro', 'editar')
    )
  )
  with check (
    exists (
      select 1 from clinicas_credenciadas c
      where c.id = clinica_id
        and c.empresa_id in (select auth_empresas_ids())
        and tem_permissao(auth.uid(), c.empresa_id, 'financeiro', 'editar')
    )
  );
create policy repasses_delete on repasses_clinicas_credenciadas for delete to authenticated using (
  exists (
    select 1 from clinicas_credenciadas c
    where c.id = clinica_id
      and c.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), c.empresa_id, 'financeiro', 'excluir')
  )
);

insert into recursos (codigo, nome, modulo, ordem) values
  ('financeiro', 'Financeiro e Faturamento', 'nucleo', 69)
on conflict (codigo) do update set nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;

insert into recurso_acoes (recurso_codigo, acao_codigo)
select r.codigo, a.codigo from recursos r cross join acoes a
where r.codigo in ('financeiro') and a.codigo in ('visualizar', 'criar', 'editar', 'excluir')
on conflict do nothing;
