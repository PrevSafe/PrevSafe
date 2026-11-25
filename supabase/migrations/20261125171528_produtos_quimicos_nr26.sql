-- =====================================================================
-- Produtos químicos (NR-26) — tela 103 da Engenharia SST.
--
-- Segue a geração em português do schema (empresa_id + auth_empresas_ids()
-- + tem_permissao), que é a que está viva e protegida por RLS. A geração em
-- inglês (clients, sst_*) está vazia e foi marcada para remoção no ADR-0003.
--
-- A FDS é guardada por hash: a mesma ficha de fabricante usada por várias
-- empresas ocupa espaço uma vez. O PDF do fabricante é documento público; o
-- que é do cliente é o registro de que ele usa o produto, e esse está sob RLS.
-- =====================================================================

create table if not exists public.produtos_quimicos (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references public.empresas(id) on delete cascade,
  unidade_id            uuid references public.unidades(id) on delete set null,

  nome                  varchar not null,
  fabricante            varchar,
  cnpj_fabricante       varchar,
  uso_descricao         text,
  local_armazenamento   text,
  quantidade            varchar,

  composicao            text,
  classificacao_ghs     varchar check (classificacao_ghs in ('PERIGOSO','NAO_PERIGOSO')),
  classes_de_perigo     text,
  palavra_advertencia   varchar,
  frases_h              text[] not null default '{}',
  frases_p              text[] not null default '{}',

  rotulagem_situacao    varchar check (rotulagem_situacao in
                          ('CONFORME_GHS','SIMPLIFICADA','DISPENSADA_SANEANTE','IRREGULAR')),
  registro_anvisa       varchar,

  fds_situacao          varchar not null default 'NAO_OBTIDA'
                          check (fds_situacao in ('DISPONIVEL','SOLICITADA','NAO_OBTIDA')),
  fds_data              date,
  fds_versao            varchar,
  fds_local             text,
  fds_arquivo_hash      varchar,
  fds_arquivo_nome      varchar,
  fds_lida_em           timestamptz,

  epi_recomendado       text,
  telefone_emergencia   varchar,
  estado_fisico         varchar,
  ph                    varchar,
  ponto_fulgor          varchar,

  treinamento_data      date,
  observacao            text,

  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);

create index if not exists idx_produtos_quimicos_empresa on public.produtos_quimicos (empresa_id);
create index if not exists idx_produtos_quimicos_unidade on public.produtos_quimicos (unidade_id);
create index if not exists idx_produtos_quimicos_fds_hash on public.produtos_quimicos (fds_arquivo_hash)
  where fds_arquivo_hash is not null;

drop trigger if exists trg_produtos_quimicos_atualizado on public.produtos_quimicos;
create trigger trg_produtos_quimicos_atualizado
  before update on public.produtos_quimicos
  for each row execute function public.set_atualizado_em();

create or replace function public.tg_produto_quimico_unidade()
returns trigger language plpgsql set search_path to 'public','pg_catalog','pg_temp'
as $$
begin
  if new.unidade_id is not null
     and not exists (select 1 from unidades u
                      where u.id = new.unidade_id and u.empresa_id = new.empresa_id) then
    raise exception 'UNIDADE_DE_OUTRA_EMPRESA';
  end if;
  return new;
end $$;

drop trigger if exists trg_produtos_quimicos_unidade on public.produtos_quimicos;
create trigger trg_produtos_quimicos_unidade
  before insert or update of unidade_id, empresa_id on public.produtos_quimicos
  for each row execute function public.tg_produto_quimico_unidade();

insert into public.recursos (codigo, nome, modulo, ordem)
values ('produtos_quimicos', 'Produtos Químicos (NR-26)', 'nucleo', 63)
on conflict (codigo) do nothing;

insert into public.recurso_acoes (recurso_codigo, acao_codigo)
select 'produtos_quimicos', a
from unnest(array['visualizar','criar','editar','excluir']) a
on conflict do nothing;

alter table public.produtos_quimicos enable row level security;

revoke all on public.produtos_quimicos from anon;
grant select, insert, update, delete on public.produtos_quimicos to authenticated;

drop policy if exists produtos_quimicos_select on public.produtos_quimicos;
create policy produtos_quimicos_select on public.produtos_quimicos
  for select to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'produtos_quimicos', 'visualizar')
    and (unidade_id is null or unidade_visivel(auth.uid(), unidade_id))
  );

drop policy if exists produtos_quimicos_insert on public.produtos_quimicos;
create policy produtos_quimicos_insert on public.produtos_quimicos
  for insert to authenticated
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'produtos_quimicos', 'criar')
    and (unidade_id is null or unidade_visivel(auth.uid(), unidade_id))
  );

drop policy if exists produtos_quimicos_update on public.produtos_quimicos;
create policy produtos_quimicos_update on public.produtos_quimicos
  for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'produtos_quimicos', 'editar')
    and (unidade_id is null or unidade_visivel(auth.uid(), unidade_id))
  )
  with check (empresa_id in (select auth_empresas_ids()));

drop policy if exists produtos_quimicos_delete on public.produtos_quimicos;
create policy produtos_quimicos_delete on public.produtos_quimicos
  for delete to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'produtos_quimicos', 'excluir')
  );
