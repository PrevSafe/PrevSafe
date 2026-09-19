-- Conteudo do site publico (prevsafe.com / prevsafe.com.br).
-- Uma tabela so para artigos e paginas de servico: muda o campo `tipo`, nao a
-- estrutura. Assim a tela de administracao e uma so.
create table if not exists public.site_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  tipo text not null default 'ARTIGO' check (tipo in ('ARTIGO', 'SERVICO')),
  slug text not null,
  titulo text not null,
  resumo text,
  conteudo text,
  imagem_url text,
  categoria text,
  tags text[] default '{}',
  status text not null default 'RASCUNHO' check (status in ('RASCUNHO', 'PUBLICADO')),
  destaque boolean not null default false,
  ordem int not null default 0,
  seo_titulo text,
  seo_descricao text,
  cta_texto text,
  cta_destino text,
  autor text,
  publicado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (organization_id, tipo, slug)
);

comment on table public.site_posts is
  'Conteudo do site publico. Leitura anonima apenas do que esta PUBLICADO; escrita so por membros da organizacao.';

create index if not exists site_posts_publicos_idx
  on public.site_posts (tipo, publicado_em desc)
  where status = 'PUBLICADO';

create index if not exists site_posts_slug_idx
  on public.site_posts (organization_id, tipo, slug);

alter table public.site_posts enable row level security;

-- Visitante anonimo le somente o que esta publicado. Rascunho nunca vaza.
drop policy if exists site_posts_leitura_publica on public.site_posts;
create policy site_posts_leitura_publica
  on public.site_posts for select
  to anon, authenticated
  using (status = 'PUBLICADO' and (publicado_em is null or publicado_em <= now()));

drop policy if exists site_posts_membros_leitura on public.site_posts;
create policy site_posts_membros_leitura
  on public.site_posts for select
  to authenticated
  using (exists (
    select 1 from public.prevsafe_members m
    where m.auth_user_id = auth.uid() and m.organization_id = site_posts.organization_id
  ));

drop policy if exists site_posts_membros_insert on public.site_posts;
create policy site_posts_membros_insert
  on public.site_posts for insert
  to authenticated
  with check (exists (
    select 1 from public.prevsafe_members m
    where m.auth_user_id = auth.uid() and m.organization_id = site_posts.organization_id
  ));

drop policy if exists site_posts_membros_update on public.site_posts;
create policy site_posts_membros_update
  on public.site_posts for update
  to authenticated
  using (exists (
    select 1 from public.prevsafe_members m
    where m.auth_user_id = auth.uid() and m.organization_id = site_posts.organization_id
  ))
  with check (exists (
    select 1 from public.prevsafe_members m
    where m.auth_user_id = auth.uid() and m.organization_id = site_posts.organization_id
  ));

drop policy if exists site_posts_membros_delete on public.site_posts;
create policy site_posts_membros_delete
  on public.site_posts for delete
  to authenticated
  using (exists (
    select 1 from public.prevsafe_members m
    where m.auth_user_id = auth.uid() and m.organization_id = site_posts.organization_id
  ));

create or replace function public.site_posts_touch()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.atualizado_em := now();
  if new.status = 'PUBLICADO' and new.publicado_em is null then
    new.publicado_em := now();
  end if;
  return new;
end;
$$;

drop trigger if exists site_posts_touch_trg on public.site_posts;
create trigger site_posts_touch_trg
  before insert or update on public.site_posts
  for each row execute function public.site_posts_touch();

revoke all on function public.site_posts_touch() from public, anon, authenticated;

grant select on public.site_posts to anon;
grant select, insert, update, delete on public.site_posts to authenticated;

-- ---------------------------------------------------------------------------
-- Limite de envios do formulario publico de contato.
-- Guarda o HASH do IP, nunca o IP: serve para barrar repeticao em rajada e nao
-- para identificar quem visitou o site.
-- ---------------------------------------------------------------------------
create table if not exists public.site_lead_throttle (
  ip_hash text not null,
  criado_em timestamptz not null default now(),
  primary key (ip_hash, criado_em)
);

comment on table public.site_lead_throttle is
  'Controle de rajada do formulario publico. Armazena hash do IP, nunca o IP em si.';

create index if not exists site_lead_throttle_janela_idx
  on public.site_lead_throttle (ip_hash, criado_em desc);

alter table public.site_lead_throttle enable row level security;
-- Sem policies: so a service role (rota de servidor) escreve e le aqui.

revoke all on public.site_lead_throttle from anon, authenticated;

create or replace function public.site_lead_throttle_limpar()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.site_lead_throttle where criado_em < now() - interval '1 day';
$$;

revoke all on function public.site_lead_throttle_limpar() from public, anon, authenticated;
