-- =====================================================================
-- PrevSafe :: Agenda Médica (Módulo 4 — PCMSO / saúde ocupacional)
-- Agendamento de exames complementares por trabalhador, interno ou em
-- clínica credenciada (rede_credenciada). Ao ser realizado, a linha se
-- amarra ao aso_exames/aso_exames_procedimentos já existentes, que
-- continuam sendo a fonte de verdade do resultado clínico e do ASO.
-- =====================================================================

create table if not exists agenda_medica (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  procedimento_codigo varchar(10) not null references procedimentos_t27(codigo_esocial),
  clinica_credenciada_id uuid references clinicas_credenciadas(id) on delete set null,
  data_agendada timestamptz not null,
  status varchar(20) not null default 'agendado'
    check (status in ('agendado', 'confirmado', 'realizado', 'faltou', 'cancelado')),
  aso_exame_id uuid references aso_exames(id) on delete set null,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_agenda_medica_empresa on agenda_medica(empresa_id, data_agendada);
create index if not exists idx_agenda_medica_funcionario on agenda_medica(funcionario_id);
create index if not exists idx_agenda_medica_clinica on agenda_medica(clinica_credenciada_id);

drop trigger if exists trg_agenda_medica_atualizado on agenda_medica;
create trigger trg_agenda_medica_atualizado before update on agenda_medica
  for each row execute function public.set_atualizado_em();

alter table agenda_medica enable row level security;

drop policy if exists agenda_medica_select on agenda_medica;
drop policy if exists agenda_medica_insert on agenda_medica;
drop policy if exists agenda_medica_update on agenda_medica;
drop policy if exists agenda_medica_delete on agenda_medica;

create policy agenda_medica_select on agenda_medica for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'agenda_medica', 'visualizar')
);
create policy agenda_medica_insert on agenda_medica for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'agenda_medica', 'criar')
);
create policy agenda_medica_update on agenda_medica for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'agenda_medica', 'editar')
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'agenda_medica', 'editar')
  );
create policy agenda_medica_delete on agenda_medica for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'agenda_medica', 'excluir')
);

insert into recursos (codigo, nome, modulo, ordem) values
  ('agenda_medica', 'Agenda Médica', 'nucleo', 67)
on conflict (codigo) do update set nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;

insert into recurso_acoes (recurso_codigo, acao_codigo)
select r.codigo, a.codigo from recursos r cross join acoes a
where r.codigo in ('agenda_medica') and a.codigo in ('visualizar', 'criar', 'editar', 'excluir')
on conflict do nothing;
