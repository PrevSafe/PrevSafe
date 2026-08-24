-- =====================================================================
-- PrevSafe :: personalização de documentos SST (PGR/LTCAT/PCMSO)
-- Texto livre por capítulo + campos de capa, editáveis na tela de
-- Elaboração e Impressão de Documentos (DocumentoGerador.tsx). Uma
-- linha por empresa + tipo de documento; campos nulos caem no texto
-- padrão gerado em src/lib/documentos.ts.
-- =====================================================================

create table if not exists documentos_personalizacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  tipo_documento varchar(10) not null check (tipo_documento in ('PGR', 'LTCAT', 'PCMSO')),
  capa_titulo text,
  capa_subtitulo text,
  capa_responsavel text,
  texto_introducao text,
  texto_metodologia text,
  texto_anexos text,
  texto_encerramento text,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null,
  unique (empresa_id, tipo_documento)
);

create index if not exists idx_documentos_personalizacoes_empresa on documentos_personalizacoes(empresa_id);

create trigger trg_documentos_personalizacoes_atualizado before update on documentos_personalizacoes
  for each row execute function public.set_atualizado_em();

alter table documentos_personalizacoes enable row level security;

drop policy if exists documentos_personalizacoes_select on documentos_personalizacoes;
drop policy if exists documentos_personalizacoes_insert on documentos_personalizacoes;
drop policy if exists documentos_personalizacoes_update on documentos_personalizacoes;

create policy documentos_personalizacoes_select on documentos_personalizacoes for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'documentos', 'visualizar')
);
create policy documentos_personalizacoes_insert on documentos_personalizacoes for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'documentos', 'editar')
);
create policy documentos_personalizacoes_update on documentos_personalizacoes for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'documentos', 'editar')
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'documentos', 'editar')
  );

insert into recursos (codigo, nome, modulo, ordem) values
  ('documentos', 'Elaboração de Documentos SST (PGR/LTCAT/PCMSO)', 'nucleo', 62)
on conflict (codigo) do update set nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;

insert into recurso_acoes (recurso_codigo, acao_codigo)
select r.codigo, a.codigo from recursos r cross join acoes a
where r.codigo in ('documentos') and a.codigo in ('visualizar', 'editar')
on conflict do nothing;


-- ---------------------------------------------------------------------
-- Notas livres por risco / por ação do cronograma — aparecem no laudo
-- impresso sem duplicar cadastro; edição segue as mesmas permissões já
-- usadas para editar a linha (riscos:editar / planos_acao:editar).
-- ---------------------------------------------------------------------

alter table riscos_inventario
  add column if not exists nota_documento text;

alter table planos_acao_5w2h
  add column if not exists nota_documento text;
