create table if not exists inspecoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  titulo varchar(255) not null,
  local_nome varchar(255),
  norma varchar(20),
  percentual_conformidade numeric(5,2) check (percentual_conformidade between 0 and 100),
  status varchar(20) not null default 'rascunho' check (status in ('rascunho','em_andamento','concluida','cancelada')),
  realizada_em date not null default current_date,
  responsavel_id uuid references profiles(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index if not exists idx_inspecoes_empresa on inspecoes(empresa_id, realizada_em desc);

create table if not exists planos_acao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  inspecao_id uuid references inspecoes(id) on delete set null,
  titulo varchar(255) not null,
  prioridade varchar(20) not null default 'normal' check (prioridade in ('alta','normal','baixa')),
  status varchar(20) not null default 'pendente' check (status in ('pendente','em_andamento','concluido','cancelado')),
  prazo date,
  responsavel_id uuid references profiles(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index if not exists idx_planos_empresa on planos_acao(empresa_id, status);

create table if not exists tarefas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  titulo varchar(255) not null,
  tipo varchar(30) not null default 'inspecao' check (tipo in ('inspecao','documento','treinamento','manutencao','outro')),
  prioridade varchar(20) not null default 'normal' check (prioridade in ('alta','normal','baixa')),
  inicio_em timestamptz not null,
  responsavel_nome varchar(255),
  concluida boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists idx_tarefas_agenda on tarefas(empresa_id, inicio_em);

alter table inspecoes enable row level security;
alter table planos_acao enable row level security;
alter table tarefas enable row level security;

drop policy if exists inspecoes_all on inspecoes;
create policy inspecoes_all on inspecoes for all to authenticated
  using (empresa_id = auth_empresa_id()) with check (empresa_id = auth_empresa_id());

drop policy if exists planos_all on planos_acao;
create policy planos_all on planos_acao for all to authenticated
  using (empresa_id = auth_empresa_id()) with check (empresa_id = auth_empresa_id());

drop policy if exists tarefas_all on tarefas;
create policy tarefas_all on tarefas for all to authenticated
  using (empresa_id = auth_empresa_id()) with check (empresa_id = auth_empresa_id());

create or replace function public.dashboard_resumo()
returns json language sql stable security invoker set search_path = public as $fn$
  select json_build_object(
    'inspecoes_mes', (select count(*) from inspecoes where status = 'concluida' and realizada_em >= date_trunc('month', current_date)::date),
    'planos_pendentes', (select count(*) from planos_acao where status in ('pendente','em_andamento')),
    'conformidade_geral', (select round(avg(percentual_conformidade)) from inspecoes where status = 'concluida' and realizada_em >= (current_date - interval '90 days')::date),
    'conformidade_mes_anterior', (select round(avg(percentual_conformidade)) from inspecoes where status = 'concluida' and realizada_em >= (date_trunc('month', current_date) - interval '1 month')::date and realizada_em < date_trunc('month', current_date)::date),
    'por_norma', coalesce((select json_agg(x order by x.norma) from (select norma, round(avg(percentual_conformidade)) as percentual from inspecoes where status = 'concluida' and norma is not null and realizada_em >= (current_date - interval '180 days')::date group by norma) x), '[]'::json),
    'planos_por_status', coalesce((select json_agg(y order by y.status) from (select status, count(*) as total from planos_acao group by status) y), '[]'::json),
    'proximas_tarefas', coalesce((select json_agg(z order by z.inicio_em) from (select id, titulo, tipo, prioridade, inicio_em, responsavel_nome from tarefas where not concluida and inicio_em >= now() - interval '12 hours' order by inicio_em limit 5) z), '[]'::json)
  )
$fn$;

grant execute on function public.dashboard_resumo() to authenticated;

insert into inspecoes (empresa_id, titulo, local_nome, norma, percentual_conformidade, status, realizada_em)
select e.id, v.titulo, v.local_nome, v.norma, v.pct, 'concluida', current_date - v.dias
from empresas e, (values
  ('Inspecao geral de EPI','Fazenda Alvorada','NR-06',92.0,3),
  ('Checklist de maquinas','Barracao Central','NR-12',75.0,8),
  ('Vistoria de campo','Talhao 4','NR-31',85.0,15),
  ('Auditoria documental do PGR','Sede','NR-01',92.0,22)
) as v(titulo, local_nome, norma, pct, dias)
where not exists (select 1 from inspecoes);

insert into planos_acao (empresa_id, titulo, prioridade, status, prazo)
select e.id, v.titulo, v.prioridade, v.status, current_date + v.dias
from empresas e, (values
  ('Substituir guarda de protecao da linha 3','alta','pendente',7),
  ('Renovar CA dos protetores auriculares','alta','em_andamento',14),
  ('Sinalizar area de tanque de combustivel','normal','pendente',30),
  ('Treinar operadores de colheitadeira','normal','pendente',45),
  ('Revisar extintores do barracao','baixa','concluido',-5)
) as v(titulo, prioridade, status, dias)
where not exists (select 1 from planos_acao);

insert into tarefas (empresa_id, titulo, tipo, prioridade, inicio_em, responsavel_nome)
select e.id, v.titulo, v.tipo, v.prioridade, current_date + v.h * interval '1 hour', v.resp
from empresas e, (values
  ('Inspecao de EPI - Fazenda Alvorada','inspecao','alta',14,'Joao Silva'),
  ('Revisao Laudo PCMSO - Setor B','documento','normal',16,null),
  ('DDS semanal - equipe de campo','treinamento','normal',31,'Maria Souza')
) as v(titulo, tipo, prioridade, h, resp)
where not exists (select 1 from tarefas);
