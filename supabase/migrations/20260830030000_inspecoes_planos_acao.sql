-- =====================================================================
-- PrevSafe :: Inspeções & Ações
-- Checklist de segurança aplicado numa unidade/setor (inspecoes +
-- inspecao_itens) e plano de ação 5W2H (planos_acao), que pode nascer
-- de uma não conformidade de inspeção ou ser criado avulso.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) INSPECOES_CHECKLIST — cabeçalho da inspeção. Vínculo direto com
-- unidade (padrão de eleicoes): unidade_id + unidade_visivel() nas 4
-- policies.
--
-- NOTA DE INTEGRAÇÃO: a tabela NÃO se chama apenas `inspecoes` porque
-- esse nome já está em uso — 20260810130000_dashboard.sql (já aplicada
-- em produção) criou uma tabela `inspecoes` bem mais simples só para
-- alimentar o card-resumo do Dashboard (percentual_conformidade por
-- norma, sem checklist de itens). São conceitos diferentes que
-- coincidiram de nome; renomear aqui evita colidir com uma tabela
-- já em produção. O código do recurso de permissão continua
-- 'inspecoes' (não há conflito nesse nível, é só uma string de
-- catálogo).
-- ---------------------------------------------------------------------

create table if not exists inspecoes_checklist (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  unidade_id uuid not null references unidades(id) on delete restrict,
  setor_id uuid references setores(id) on delete set null,
  titulo varchar(200) not null,
  data_inspecao date not null default current_date,
  responsavel_nome varchar(150) not null,
  status varchar(20) not null default 'em_andamento'
    check (status in ('em_andamento', 'concluida')),
  observacoes text,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_inspecoes_checklist_empresa on inspecoes_checklist(empresa_id, data_inspecao desc);
create index if not exists idx_inspecoes_checklist_unidade on inspecoes_checklist(unidade_id);
create index if not exists idx_inspecoes_checklist_setor on inspecoes_checklist(setor_id);

drop trigger if exists trg_inspecoes_checklist_atualizado on inspecoes_checklist;
create trigger trg_inspecoes_checklist_atualizado before update on inspecoes_checklist
  for each row execute function public.set_atualizado_em();

alter table inspecoes_checklist enable row level security;

drop policy if exists inspecoes_checklist_select on inspecoes_checklist;
drop policy if exists inspecoes_checklist_insert on inspecoes_checklist;
drop policy if exists inspecoes_checklist_update on inspecoes_checklist;
drop policy if exists inspecoes_checklist_delete on inspecoes_checklist;

create policy inspecoes_checklist_select on inspecoes_checklist for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'inspecoes', 'visualizar')
  and unidade_visivel(auth.uid(), unidade_id)
);
create policy inspecoes_checklist_insert on inspecoes_checklist for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'inspecoes', 'criar')
  and unidade_visivel(auth.uid(), unidade_id)
);
create policy inspecoes_checklist_update on inspecoes_checklist for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'inspecoes', 'editar')
    and unidade_visivel(auth.uid(), unidade_id)
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'inspecoes', 'editar')
    and unidade_visivel(auth.uid(), unidade_id)
  );
create policy inspecoes_checklist_delete on inspecoes_checklist for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'inspecoes', 'excluir')
  and unidade_visivel(auth.uid(), unidade_id)
);


-- ---------------------------------------------------------------------
-- 2) INSPECAO_ITENS — itens do checklist respondido. Sem empresa_id ou
-- unidade_id próprio: alcança os dois via inspecao_id -> inspecoes,
-- mesmo padrão usado em candidatos -> eleicoes.
-- ---------------------------------------------------------------------

create table if not exists inspecao_itens (
  id uuid primary key default gen_random_uuid(),
  inspecao_id uuid not null references inspecoes_checklist(id) on delete cascade,
  descricao varchar(300) not null,
  conforme boolean not null default true,
  observacao text,
  ordem smallint not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_inspecao_itens_inspecao on inspecao_itens(inspecao_id, ordem);

drop trigger if exists trg_inspecao_itens_atualizado on inspecao_itens;
create trigger trg_inspecao_itens_atualizado before update on inspecao_itens
  for each row execute function public.set_atualizado_em();

alter table inspecao_itens enable row level security;

drop policy if exists inspecao_itens_select on inspecao_itens;
drop policy if exists inspecao_itens_insert on inspecao_itens;
drop policy if exists inspecao_itens_update on inspecao_itens;
drop policy if exists inspecao_itens_delete on inspecao_itens;

create policy inspecao_itens_select on inspecao_itens for select to authenticated using (
  exists (
    select 1 from inspecoes_checklist i
    where i.id = inspecao_itens.inspecao_id
      and i.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), i.empresa_id, 'inspecoes', 'visualizar')
      and unidade_visivel(auth.uid(), i.unidade_id)
  )
);
create policy inspecao_itens_insert on inspecao_itens for insert to authenticated with check (
  exists (
    select 1 from inspecoes_checklist i
    where i.id = inspecao_itens.inspecao_id
      and i.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), i.empresa_id, 'inspecoes', 'criar')
      and unidade_visivel(auth.uid(), i.unidade_id)
  )
);
create policy inspecao_itens_update on inspecao_itens for update to authenticated
  using (
    exists (
      select 1 from inspecoes_checklist i
      where i.id = inspecao_itens.inspecao_id
        and i.empresa_id in (select auth_empresas_ids())
        and tem_permissao(auth.uid(), i.empresa_id, 'inspecoes', 'editar')
        and unidade_visivel(auth.uid(), i.unidade_id)
    )
  )
  with check (
    exists (
      select 1 from inspecoes_checklist i
      where i.id = inspecao_itens.inspecao_id
        and i.empresa_id in (select auth_empresas_ids())
        and tem_permissao(auth.uid(), i.empresa_id, 'inspecoes', 'editar')
        and unidade_visivel(auth.uid(), i.unidade_id)
    )
  );
create policy inspecao_itens_delete on inspecao_itens for delete to authenticated using (
  exists (
    select 1 from inspecoes_checklist i
    where i.id = inspecao_itens.inspecao_id
      and i.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), i.empresa_id, 'inspecoes', 'excluir')
      and unidade_visivel(auth.uid(), i.unidade_id)
  )
);


-- ---------------------------------------------------------------------
-- 3) PLANOS_ACAO_5W2H — 5W2H. inspecao_item_id nulo = plano avulso, sem
-- vínculo com nenhuma inspeção. empresa_id/unidade_id são próprios
-- (mesmo padrão de eleicoes/inspecoes): o plano não depende de existir
-- um item de inspeção para ser visível.
--
-- status guarda só o ciclo de vida controlado pelo usuário (pendente /
-- em_andamento / concluido). "Atrasado" NÃO é armazenado — é derivado
-- em tempo real a partir de `quando` na camada de app (mesmo padrão de
-- statusValidade em epi.ts/aso.ts), para nunca ficar com um valor
-- desatualizado no banco.
--
-- NOTA DE INTEGRAÇÃO: assim como inspecoes_checklist, essa tabela não
-- se chama apenas `planos_acao` porque 20260810130000_dashboard.sql
-- (já aplicada em produção) já criou uma tabela `planos_acao` mais
-- simples para o resumo do Dashboard. O código do recurso de
-- permissão continua 'planos_acao' (string de catálogo, sem conflito).
-- ---------------------------------------------------------------------

create table if not exists planos_acao_5w2h (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  unidade_id uuid not null references unidades(id) on delete restrict,
  inspecao_item_id uuid references inspecao_itens(id) on delete set null,
  o_que text not null,
  por_que text,
  onde text,
  quando date not null,
  quem varchar(150) not null,
  como text,
  quanto_custa numeric(12,2) check (quanto_custa is null or quanto_custa >= 0),
  status varchar(20) not null default 'pendente'
    check (status in ('pendente', 'em_andamento', 'concluido')),
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_planos_acao_5w2h_empresa on planos_acao_5w2h(empresa_id, quando);
create index if not exists idx_planos_acao_5w2h_unidade on planos_acao_5w2h(unidade_id);
create index if not exists idx_planos_acao_5w2h_item on planos_acao_5w2h(inspecao_item_id);

drop trigger if exists trg_planos_acao_5w2h_atualizado on planos_acao_5w2h;
create trigger trg_planos_acao_5w2h_atualizado before update on planos_acao_5w2h
  for each row execute function public.set_atualizado_em();

alter table planos_acao_5w2h enable row level security;

drop policy if exists planos_acao_5w2h_select on planos_acao_5w2h;
drop policy if exists planos_acao_5w2h_insert on planos_acao_5w2h;
drop policy if exists planos_acao_5w2h_update on planos_acao_5w2h;
drop policy if exists planos_acao_5w2h_delete on planos_acao_5w2h;

create policy planos_acao_5w2h_select on planos_acao_5w2h for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'planos_acao', 'visualizar')
  and unidade_visivel(auth.uid(), unidade_id)
);
create policy planos_acao_5w2h_insert on planos_acao_5w2h for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'planos_acao', 'criar')
  and unidade_visivel(auth.uid(), unidade_id)
);
create policy planos_acao_5w2h_update on planos_acao_5w2h for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'planos_acao', 'editar')
    and unidade_visivel(auth.uid(), unidade_id)
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'planos_acao', 'editar')
    and unidade_visivel(auth.uid(), unidade_id)
  );
create policy planos_acao_5w2h_delete on planos_acao_5w2h for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'planos_acao', 'excluir')
  and unidade_visivel(auth.uid(), unidade_id)
);


-- ---------------------------------------------------------------------
-- 4) Controle de acesso — catálogo de recursos/ações, CRUD completo.
-- ---------------------------------------------------------------------

insert into recursos (codigo, nome, modulo, ordem) values
  ('inspecoes', 'Inspeções', 'nucleo', 58),
  ('planos_acao', 'Planos de Ação', 'nucleo', 59)
on conflict (codigo) do update set nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;

insert into recurso_acoes (recurso_codigo, acao_codigo)
select r.codigo, a.codigo from recursos r cross join acoes a
where r.codigo in ('inspecoes','planos_acao') and a.codigo in ('visualizar','criar','editar','excluir')
on conflict do nothing;
