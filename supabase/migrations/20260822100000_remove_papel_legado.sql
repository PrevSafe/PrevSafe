-- =====================================================================
-- PrevSafe :: Controle de acesso granular — ETAPA 2 (DEFINITIVA)
--
-- Elimina usuarios_empresas.papel e auth_papel_na_empresa() do sistema
-- inteiro, substituindo por tem_permissao()/unidade_visivel() em toda
-- policy de RLS e em toda RPC que hoje decide acesso pelo papel antigo
-- (admin/tecnico/inspetor/leitura). Também elimina o profiles.papel
-- legado (achado na Fase 0 de reconhecimento: coluna gêmea, mesmo check
-- constraint da de usuarios_empresas, mas nunca lida por nenhuma RLS,
-- função ou código de front-end — puro resíduo do desenho anterior à
-- migration de multiempresa. Não estava no escopo literal da Fase 7,
-- mas deixá-la para trás contradiria "não deve sobrar UMA referência a
-- papel em lugar nenhum" — dropada junto, documentada aqui).
--
-- Ordem: 1) catálogo (recursos/ações novos) → 2) RLS do núcleo →
-- 3) RLS + RPCs do CIPA → 4) minhas_permissoes() → 5) handle_new_user →
-- 6) RLS das próprias tabelas de controle de acesso → 7) trava de
-- segurança + DROP do campo/função legados. Tudo em uma transação: se
-- qualquer fase falhar, nada fica aplicado.
-- =====================================================================

begin;

-- =====================================================================
-- FASE 1 — Novos recursos de permissão
-- =====================================================================

insert into recursos (codigo, nome, modulo, ordem) values
  ('acessos',        'Controle de Acessos',        'nucleo', 5),
  ('inspecoes',       'Inspeções',                  'nucleo', 60),
  ('planos_acao',      'Planos de Ação',              'nucleo', 70),
  ('tarefas',          'Tarefas',                     'nucleo', 80),
  ('cipa.auditoria',  'Auditoria de Votos CIPA',     'cipa',   145)
on conflict (codigo) do update set
  nome = excluded.nome, modulo = excluded.modulo, ordem = excluded.ordem;

insert into acoes (codigo, nome) values
  ('reverter', 'Reverter')
on conflict (codigo) do update set nome = excluded.nome;

-- CRUD completo para os 3 recursos de núcleo que ainda não tinham
-- catálogo, e para 'acessos' (a matriz decide quem de fato ganha cada
-- ação — ver abaixo).
insert into recurso_acoes (recurso_codigo, acao_codigo)
select r.codigo, a.codigo
from (values ('inspecoes'), ('planos_acao'), ('tarefas'), ('acessos')) as r(codigo)
cross join acoes a
where a.codigo in ('visualizar', 'criar', 'editar', 'excluir')
on conflict do nothing;

-- Auditoria CIPA: só vê e reverte — não é um cadastro CRUD.
insert into recurso_acoes (recurso_codigo, acao_codigo) values
  ('cipa.auditoria', 'visualizar'),
  ('cipa.auditoria', 'reverter')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Concessão às empresas já existentes.
--
-- 'inspecoes' / 'planos_acao' / 'tarefas' seguem o MESMO padrão dos
-- demais recursos de núcleo (igual a unidades/setores/cargos/etc.):
-- Administrador = CRUD completo; Técnico/Inspetor = visualizar+criar+
-- editar (sem excluir); Leitura = só visualizar. O perfil 'CIPA' não
-- entra aqui, pelo mesmo motivo que não entra em nenhum outro recurso
-- de núcleo hoje (ele só tem permissões cipa.*).
-- ---------------------------------------------------------------------

insert into perfil_permissoes (perfil_id, recurso_codigo, acao_codigo)
select pa.id, r.codigo, a.codigo
from perfis_acesso pa
cross join (values ('inspecoes'), ('planos_acao'), ('tarefas')) as r(codigo)
cross join acoes a
where pa.nome = 'Administrador'
  and a.codigo in ('visualizar', 'criar', 'editar', 'excluir')
on conflict do nothing;

insert into perfil_permissoes (perfil_id, recurso_codigo, acao_codigo)
select pa.id, r.codigo, a.codigo
from perfis_acesso pa
cross join (values ('inspecoes'), ('planos_acao'), ('tarefas')) as r(codigo)
cross join acoes a
where pa.nome in ('Técnico', 'Inspetor')
  and a.codigo in ('visualizar', 'criar', 'editar')
on conflict do nothing;

insert into perfil_permissoes (perfil_id, recurso_codigo, acao_codigo)
select pa.id, r.codigo, 'visualizar'
from perfis_acesso pa
cross join (values ('inspecoes'), ('planos_acao'), ('tarefas')) as r(codigo)
where pa.nome = 'Leitura'
on conflict do nothing;

-- 'acessos' e 'cipa.auditoria' são sensíveis: quem tem acesso pode
-- alterar o próprio sistema de permissões ou reverter votos já
-- apurados. Concessão explícita, SÓ para o perfil 'Administrador' de
-- cada empresa — nenhum outro perfil padrão (nem 'CIPA') ganha isso
-- automaticamente. Um admin real pode conceder manualmente pela matriz
-- depois, se quiser.
insert into perfil_permissoes (perfil_id, recurso_codigo, acao_codigo)
select pa.id, 'acessos', a.codigo
from perfis_acesso pa
cross join acoes a
where pa.nome = 'Administrador'
  and a.codigo in ('visualizar', 'criar', 'editar', 'excluir')
on conflict do nothing;

insert into perfil_permissoes (perfil_id, recurso_codigo, acao_codigo)
select pa.id, 'cipa.auditoria', a.codigo
from perfis_acesso pa
cross join acoes a
where pa.nome = 'Administrador'
  and a.codigo in ('visualizar', 'reverter')
on conflict do nothing;


-- =====================================================================
-- FASE 2 — RLS do núcleo
--
-- Padrão: select/insert/update/delete viram 4 policies separadas
-- (antes eram 1 policy "ALL"), cada uma checando
-- tem_permissao(auth.uid(), empresa_id, '<recurso>', '<ação>').
-- Onde a tabela enxerga unidade — direto ou por relação — soma-se
-- unidade_visivel(). Documentado tabela a tabela abaixo.
-- =====================================================================

-- -----------------------------------------------------------------
-- unidades — a própria linha É a unidade (unidade_id = id).
-- Sem checagem de unidade_visivel no INSERT: a linha ainda não existe
-- para ter visibilidade concedida, e o trigger abaixo libera o acesso
-- logo em seguida (ver "auto-liberação de unidade nova").
-- -----------------------------------------------------------------
drop policy if exists unidades_write on unidades;
drop policy if exists unidades_select on unidades;

create policy unidades_select on unidades for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'unidades', 'visualizar')
  and unidade_visivel(auth.uid(), id)
);
create policy unidades_insert on unidades for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'unidades', 'criar')
);
create policy unidades_update on unidades for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'unidades', 'editar')
    and unidade_visivel(auth.uid(), id)
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'unidades', 'editar')
    and unidade_visivel(auth.uid(), id)
  );
create policy unidades_delete on unidades for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'unidades', 'excluir')
  and unidade_visivel(auth.uid(), id)
);

-- -----------------------------------------------------------------
-- setores — catálogo da empresa, sem noção de unidade (Fase 0
-- confirmou: não há coluna unidade_id nem relação a lotações).
-- -----------------------------------------------------------------
drop policy if exists setores_write on setores;
drop policy if exists setores_select on setores;

create policy setores_select on setores for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'setores', 'visualizar')
);
create policy setores_insert on setores for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'setores', 'criar')
);
create policy setores_update on setores for update to authenticated
  using (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'setores', 'editar'))
  with check (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'setores', 'editar'));
create policy setores_delete on setores for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'setores', 'excluir')
);

-- -----------------------------------------------------------------
-- cargos — mesmo caso de setores: catálogo sem noção de unidade.
-- -----------------------------------------------------------------
drop policy if exists cargos_write on cargos;
drop policy if exists cargos_select on cargos;

create policy cargos_select on cargos for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'cargos', 'visualizar')
);
create policy cargos_insert on cargos for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'cargos', 'criar')
);
create policy cargos_update on cargos for update to authenticated
  using (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'cargos', 'editar'))
  with check (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'cargos', 'editar'));
create policy cargos_delete on cargos for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'cargos', 'excluir')
);

-- -----------------------------------------------------------------
-- lotacoes — recurso 'estrutura' (tela /estrutura). Tem unidade_id
-- DIRETO: unidade_visivel checado em toda ação, inclusive INSERT
-- (contra o unidade_id sendo gravado, via with_check).
-- -----------------------------------------------------------------
drop policy if exists lotacoes_write on lotacoes;
drop policy if exists lotacoes_select on lotacoes;

create policy lotacoes_select on lotacoes for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'estrutura', 'visualizar')
  and unidade_visivel(auth.uid(), unidade_id)
);
create policy lotacoes_insert on lotacoes for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'estrutura', 'criar')
  and unidade_visivel(auth.uid(), unidade_id)
);
create policy lotacoes_update on lotacoes for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'estrutura', 'editar')
    and unidade_visivel(auth.uid(), unidade_id)
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'estrutura', 'editar')
    and unidade_visivel(auth.uid(), unidade_id)
  );
create policy lotacoes_delete on lotacoes for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'estrutura', 'excluir')
  and unidade_visivel(auth.uid(), unidade_id)
);

-- -----------------------------------------------------------------
-- funcionarios — recurso 'funcionarios'. Não tem unidade_id direto;
-- chega lá via funcionarios_lotacoes.lotacao_id -> lotacoes.unidade_id,
-- considerando a lotação VIGENTE (data_fim is null).
--
-- Decisão de desenho (documentada porque não é óbvia): um funcionário
-- SEM lotação vigente — recém-criado antes do primeiro vínculo, ou
-- desligado com todas as lotações encerradas — fica visível para
-- quem tem a permissão do recurso, sem checagem de unidade (não há
-- unidade "atual" para restringir por). Isso é necessário na prática:
-- o cadastro faz `insert ... select()` no funcionário e SÓ DEPOIS
-- insere a linha em funcionarios_lotacoes (FuncionarioForm.tsx); se a
-- policy de SELECT exigisse lotação vigente sempre, o RETURNING desse
-- INSERT viria vazio e o cadastro quebraria. Uma vez lotado, a
-- restrição de unidade passa a valer normalmente.
-- -----------------------------------------------------------------
drop policy if exists funcionarios_write on funcionarios;
drop policy if exists funcionarios_select on funcionarios;

create policy funcionarios_select on funcionarios for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'funcionarios', 'visualizar')
  and (
    not exists (
      select 1 from funcionarios_lotacoes fl
      where fl.funcionario_id = funcionarios.id and fl.data_fim is null
    )
    or exists (
      select 1 from funcionarios_lotacoes fl
      join lotacoes l on l.id = fl.lotacao_id
      where fl.funcionario_id = funcionarios.id
        and fl.data_fim is null
        and unidade_visivel(auth.uid(), l.unidade_id)
    )
  )
);
create policy funcionarios_insert on funcionarios for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'funcionarios', 'criar')
);
create policy funcionarios_update on funcionarios for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'funcionarios', 'editar')
    and (
      not exists (select 1 from funcionarios_lotacoes fl where fl.funcionario_id = funcionarios.id and fl.data_fim is null)
      or exists (
        select 1 from funcionarios_lotacoes fl join lotacoes l on l.id = fl.lotacao_id
        where fl.funcionario_id = funcionarios.id and fl.data_fim is null and unidade_visivel(auth.uid(), l.unidade_id)
      )
    )
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'funcionarios', 'editar')
  );
create policy funcionarios_delete on funcionarios for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'funcionarios', 'excluir')
  and (
    not exists (select 1 from funcionarios_lotacoes fl where fl.funcionario_id = funcionarios.id and fl.data_fim is null)
    or exists (
      select 1 from funcionarios_lotacoes fl join lotacoes l on l.id = fl.lotacao_id
      where fl.funcionario_id = funcionarios.id and fl.data_fim is null and unidade_visivel(auth.uid(), l.unidade_id)
    )
  )
);

-- -----------------------------------------------------------------
-- funcionarios_lotacoes — recurso 'funcionarios' (é o histórico de
-- lotação do funcionário, gerenciado na mesma tela). Tem lotacao_id
-- direto em cada linha: sempre dá pra checar unidade_visivel via join
-- com lotacoes, inclusive no INSERT (contra o lotacao_id gravado).
-- -----------------------------------------------------------------
drop policy if exists funcionarios_lotacoes_write on funcionarios_lotacoes;
drop policy if exists funcionarios_lotacoes_select on funcionarios_lotacoes;

create policy funcionarios_lotacoes_select on funcionarios_lotacoes for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'funcionarios', 'visualizar')
  and exists (select 1 from lotacoes l where l.id = funcionarios_lotacoes.lotacao_id and unidade_visivel(auth.uid(), l.unidade_id))
);
create policy funcionarios_lotacoes_insert on funcionarios_lotacoes for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'funcionarios', 'criar')
  and exists (select 1 from lotacoes l where l.id = funcionarios_lotacoes.lotacao_id and unidade_visivel(auth.uid(), l.unidade_id))
);
create policy funcionarios_lotacoes_update on funcionarios_lotacoes for update to authenticated
  using (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'funcionarios', 'editar')
    and exists (select 1 from lotacoes l where l.id = funcionarios_lotacoes.lotacao_id and unidade_visivel(auth.uid(), l.unidade_id))
  )
  with check (
    empresa_id in (select auth_empresas_ids())
    and tem_permissao(auth.uid(), empresa_id, 'funcionarios', 'editar')
    and exists (select 1 from lotacoes l where l.id = funcionarios_lotacoes.lotacao_id and unidade_visivel(auth.uid(), l.unidade_id))
  );
create policy funcionarios_lotacoes_delete on funcionarios_lotacoes for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'funcionarios', 'excluir')
  and exists (select 1 from lotacoes l where l.id = funcionarios_lotacoes.lotacao_id and unidade_visivel(auth.uid(), l.unidade_id))
);

-- -----------------------------------------------------------------
-- inspecoes / planos_acao / tarefas — recursos novos (Fase 1). Sem
-- noção de unidade (Fase 0 confirmou: nenhuma das três tem unidade_id
-- nem relação a lotação). Antes destas policies não existia sequer
-- checagem de papel no SELECT — qualquer membro da empresa via tudo;
-- agora exige tem_permissao(...,'visualizar') como as demais.
-- -----------------------------------------------------------------
drop policy if exists inspecoes_write on inspecoes;
drop policy if exists inspecoes_select on inspecoes;

create policy inspecoes_select on inspecoes for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'inspecoes', 'visualizar')
);
create policy inspecoes_insert on inspecoes for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'inspecoes', 'criar')
);
create policy inspecoes_update on inspecoes for update to authenticated
  using (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'inspecoes', 'editar'))
  with check (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'inspecoes', 'editar'));
create policy inspecoes_delete on inspecoes for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'inspecoes', 'excluir')
);

drop policy if exists planos_acao_write on planos_acao;
drop policy if exists planos_acao_select on planos_acao;

create policy planos_acao_select on planos_acao for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'planos_acao', 'visualizar')
);
create policy planos_acao_insert on planos_acao for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'planos_acao', 'criar')
);
create policy planos_acao_update on planos_acao for update to authenticated
  using (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'planos_acao', 'editar'))
  with check (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'planos_acao', 'editar'));
create policy planos_acao_delete on planos_acao for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'planos_acao', 'excluir')
);

drop policy if exists tarefas_write on tarefas;
drop policy if exists tarefas_select on tarefas;

create policy tarefas_select on tarefas for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'tarefas', 'visualizar')
);
create policy tarefas_insert on tarefas for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'tarefas', 'criar')
);
create policy tarefas_update on tarefas for update to authenticated
  using (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'tarefas', 'editar'))
  with check (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'tarefas', 'editar'));
create policy tarefas_delete on tarefas for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'tarefas', 'excluir')
);

-- -----------------------------------------------------------------
-- Auto-liberação de unidade nova.
--
-- usuario_unidades é "padrão negado": ausência de linha = não vê. Se
-- um admin cria uma unidade nova, sem isso ele mesmo perderia acesso
-- ao que acabou de criar (unidades_select agora exige unidade_visivel).
-- Opção escolhida (mais simples que não deixa ninguém travado): libera
-- automaticamente a unidade nova para TODO vínculo ativo da empresa
-- cujo perfil tenha a permissão 'acessos'/'editar' — na prática, os
-- administradores. Perfis sem essa permissão continuam precisando de
-- liberação manual pela tela de Acessos, como qualquer outra unidade.
-- -----------------------------------------------------------------
create or replace function public.liberar_unidade_nova_para_admins()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into usuario_unidades (usuario_id, empresa_id, unidade_id)
  select ue.usuario_id, ue.empresa_id, new.id
  from usuarios_empresas ue
  where ue.empresa_id = new.empresa_id
    and ue.ativo = true
    and public.tem_permissao(ue.usuario_id, ue.empresa_id, 'acessos', 'editar')
  on conflict (usuario_id, unidade_id) do nothing;
  return new;
end;
$fn$;

drop trigger if exists trg_liberar_unidade_nova on unidades;
create trigger trg_liberar_unidade_nova
  after insert on unidades
  for each row execute function public.liberar_unidade_nova_para_admins();


-- =====================================================================
-- FASE 3 — RLS e RPCs do CIPA
-- =====================================================================

-- -----------------------------------------------------------------
-- eleicoes/candidatos/eleicao_eleitores/urna_quarentena/cipa_comissao/
-- cipa_indicados: cipa_acesso_eleicao(eleicao_id) permanece como está
-- (é a checagem de "mesma empresa" usada também dentro das RPCs — não
-- muda de semântica). Só as policies de SELECT diretas (usadas pela
-- listagem nas telas, não pelas RPCs) ganham tem_permissao(...,
-- 'visualizar') + unidade_visivel(). As policies de INSERT/UPDATE/
-- DELETE dessas tabelas não usavam auth_papel_na_empresa() antes desta
-- migration (escritas em candidatos/cipa_comissao/cipa_indicados
-- passam por policies "ALL" com só cipa_acesso_eleicao; eleicao_
-- eleitores e urna_quarentena não têm policy de escrita direta —
-- votos e listas de eleitores entram só via RPC SECURITY DEFINER ou
-- import administrativo) — fora do escopo desta etapa, que é eliminar
-- papel, não é adicionar controles novos onde nunca houve nenhum.
-- -----------------------------------------------------------------

drop policy if exists eleicoes_select on eleicoes;
create policy eleicoes_select on eleicoes for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'cipa.eleicoes', 'visualizar')
  and unidade_visivel(auth.uid(), unidade_id)
);

drop policy if exists candidatos_select on candidatos;
create policy candidatos_select on candidatos for select to authenticated using (
  cipa_acesso_eleicao(eleicao_id)
  and exists (
    select 1 from eleicoes e
    where e.id = candidatos.eleicao_id
      and tem_permissao(auth.uid(), e.empresa_id, 'cipa.candidatos', 'visualizar')
      and unidade_visivel(auth.uid(), e.unidade_id)
  )
);

drop policy if exists eleicao_eleitores_select on eleicao_eleitores;
create policy eleicao_eleitores_select on eleicao_eleitores for select to authenticated using (
  cipa_acesso_eleicao(eleicao_id)
  and exists (
    select 1 from eleicoes e
    where e.id = eleicao_eleitores.eleicao_id
      and tem_permissao(auth.uid(), e.empresa_id, 'cipa.eleitores', 'visualizar')
      and unidade_visivel(auth.uid(), e.unidade_id)
  )
);

drop policy if exists urna_quarentena_select on urna_quarentena;
create policy urna_quarentena_select on urna_quarentena for select to authenticated using (
  cipa_acesso_eleicao(eleicao_id)
  and exists (
    select 1 from eleicoes e
    where e.id = urna_quarentena.eleicao_id
      and tem_permissao(auth.uid(), e.empresa_id, 'cipa.quarentena', 'visualizar')
      and unidade_visivel(auth.uid(), e.unidade_id)
  )
);

drop policy if exists cipa_comissao_select on cipa_comissao;
create policy cipa_comissao_select on cipa_comissao for select to authenticated using (
  cipa_acesso_eleicao(eleicao_id)
  and tem_permissao(auth.uid(), empresa_id, 'cipa.comissao', 'visualizar')
  and exists (select 1 from eleicoes e where e.id = cipa_comissao.eleicao_id and unidade_visivel(auth.uid(), e.unidade_id))
);

drop policy if exists cipa_indicados_select on cipa_indicados;
create policy cipa_indicados_select on cipa_indicados for select to authenticated using (
  cipa_acesso_eleicao(eleicao_id)
  and tem_permissao(auth.uid(), empresa_id, 'cipa.comissao', 'visualizar')
  and exists (select 1 from eleicoes e where e.id = cipa_indicados.eleicao_id and unidade_visivel(auth.uid(), e.unidade_id))
);

-- Auditoria de reversão: recurso sensível, sem escopo de unidade (não
-- está na lista das 6 tabelas acima — decisão da Fase 1: visível para
-- quem tem a permissão, em toda a empresa).
drop policy if exists cipa_reversoes_auditoria_select on cipa_reversoes_auditoria;
create policy cipa_reversoes_auditoria_select on cipa_reversoes_auditoria for select to authenticated using (
  cipa_acesso_eleicao(eleicao_id)
  and tem_permissao(auth.uid(), empresa_id, 'cipa.auditoria', 'visualizar')
);

-- ---------------------------------------------------------------------
-- RPCs — mapeamento função -> recurso:ação
--   cipa_abrir_eleicao         -> cipa.eleicoes:editar
--   cipa_aprovar_voto          -> cipa.quarentena:aprovar
--   cipa_rejeitar_voto         -> cipa.quarentena:aprovar
--   cipa_reverter_voto         -> cipa.auditoria:reverter
--   cipa_listar_votos_corrigiveis -> cipa.auditoria:visualizar
--
-- cipa_abrir_eleicao, cipa_aprovar_voto e cipa_rejeitar_voto NÃO
-- continham auth_papel_na_empresa() antes desta migration — a Fase 0
-- confirmou que hoje qualquer membro da empresa com acesso à eleição
-- pode abrir eleição / aprovar / rejeitar voto em quarentena, sem
-- checagem de papel nenhuma. Isso é uma lacuna real, não só uma troca
-- de nome; adiciono a checagem de tem_permissao aqui porque a tabela
-- de mapeamento pedida no relatório final não faria sentido sem isso.
-- ---------------------------------------------------------------------

create or replace function public.cipa_abrir_eleicao(p_eleicao_id uuid)
 returns json
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare v_e public.eleicoes; v_cand int; v_apt int;
begin
  v_e := public.cipa_assert_acesso(p_eleicao_id);

  if not public.tem_permissao(auth.uid(), v_e.empresa_id, 'cipa.eleicoes', 'editar') then
    raise exception 'ACESSO_NEGADO';
  end if;

  if not public.modulo_ativo(v_e.empresa_id, 'CIPA') then
    raise exception 'MODULO_NAO_CONTRATADO';
  end if;
  if v_e.status not in ('RASCUNHO','AGENDADA') then raise exception 'STATUS_INVALIDO'; end if;

  select count(*) into v_cand from candidatos
   where eleicao_id = p_eleicao_id and inscricao_status = 'DEFERIDA';
  select count(*) into v_apt from eleicao_eleitores where eleicao_id = p_eleicao_id;

  if v_cand < 1 then raise exception 'SEM_CANDIDATOS_DEFERIDOS'; end if;

  -- Sem lista de aptos, exige o QR Code habilitado: e a unica porta de entrada.
  if v_apt < 1 and not v_e.permite_qr_code then
    raise exception 'SEM_ELEITORES_E_SEM_QR';
  end if;

  update eleicoes
     set status = 'ABERTA', aberta_em = now(), total_eleitores_aptos = v_apt
   where id = p_eleicao_id;

  insert into cipa_auditoria (eleicao_id, empresa_id, ator_id, acao, detalhes)
  values (p_eleicao_id, v_e.empresa_id, auth.uid(), 'ELEICAO_ABERTA',
          jsonb_build_object('aptos', v_apt, 'candidatos', v_cand,
                             'sem_lista_previa', v_apt < 1));

  return json_build_object('status','sucesso','aptos',v_apt,'candidatos',v_cand);
end $function$;

create or replace function public.cipa_aprovar_voto(p_quarentena_id uuid)
 returns json
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare v_q public.urna_quarentena; v_e public.eleicoes; v_eleitor_id uuid;
begin
  select * into v_q from urna_quarentena where id = p_quarentena_id for update;
  if not found then raise exception 'ENVELOPE_NAO_ENCONTRADO'; end if;

  v_e := public.cipa_assert_acesso(v_q.eleicao_id);

  if not public.tem_permissao(auth.uid(), v_e.empresa_id, 'cipa.quarentena', 'aprovar') then
    raise exception 'ACESSO_NEGADO';
  end if;

  if v_q.status_analise <> 'PENDENTE' then raise exception 'VOTO_JA_PROCESSADO'; end if;
  if v_e.status not in ('ABERTA','ENCERRADA') then raise exception 'STATUS_INVALIDO'; end if;
  if exists (select 1 from lista_assinaturas
              where eleicao_id = v_q.eleicao_id and cpf = v_q.cpf_declarado) then
    raise exception 'CPF_JA_ASSINOU';
  end if;

  if v_q.tipo_voto = 'NOMINAL' then
    update candidatos set total_votos = total_votos + 1
     where id = v_q.candidato_escolhido_id and eleicao_id = v_q.eleicao_id;
    if not found then raise exception 'CANDIDATO_INVALIDO'; end if;
  elsif v_q.tipo_voto = 'BRANCO' then
    update eleicoes set votos_branco = votos_branco + 1 where id = v_q.eleicao_id;
  else
    update eleicoes set votos_nulo = votos_nulo + 1 where id = v_q.eleicao_id;
  end if;

  select id into v_eleitor_id from eleicao_eleitores
   where eleicao_id = v_q.eleicao_id and cpf = v_q.cpf_declarado;

  insert into lista_assinaturas
    (eleicao_id, eleitor_id, nome, cpf, cargo, data_hora_voto, ip_dispositivo, origem_voto)
  values (v_q.eleicao_id, v_eleitor_id,
          v_q.nome_declarado, v_q.cpf_declarado, v_q.cargo_declarado,
          v_q.data_hora, v_q.ip_dispositivo, 'QR_CODE');

  -- só existe eleitor_id quando o CPF consta no snapshot da folha; sem
  -- ele não há o que vincular em cipa_votos_computados (FK obrigatória).
  if v_eleitor_id is not null then
    insert into cipa_votos_computados (eleicao_id, eleitor_id, origem, tipo_voto, candidato_id)
    values (v_q.eleicao_id, v_eleitor_id, 'QR_CODE', v_q.tipo_voto, v_q.candidato_escolhido_id);
  end if;

  -- queima do vínculo
  update urna_quarentena
     set status_analise = 'APROVADO', candidato_escolhido_id = null,
         analisado_por = auth.uid(), analisado_em = now()
   where id = p_quarentena_id;

  update eleicao_eleitores
     set status_voto = true, votou_em = coalesce(votou_em, v_q.data_hora)
   where eleicao_id = v_q.eleicao_id and cpf = v_q.cpf_declarado;

  insert into cipa_auditoria (eleicao_id, empresa_id, ator_id, acao, detalhes)
  values (v_q.eleicao_id, v_e.empresa_id, auth.uid(), 'QUARENTENA_APROVADA',
          jsonb_build_object('cpf_mascara', public.cipa_mascara_cpf(v_q.cpf_declarado)));

  return json_build_object('status','sucesso');
end $function$;

create or replace function public.cipa_rejeitar_voto(p_quarentena_id uuid, p_motivo text)
 returns json
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare v_q public.urna_quarentena; v_e public.eleicoes;
begin
  if coalesce(btrim(p_motivo),'') = '' then raise exception 'MOTIVO_OBRIGATORIO'; end if;
  select * into v_q from urna_quarentena where id = p_quarentena_id for update;
  if not found then raise exception 'ENVELOPE_NAO_ENCONTRADO'; end if;
  v_e := public.cipa_assert_acesso(v_q.eleicao_id);

  if not public.tem_permissao(auth.uid(), v_e.empresa_id, 'cipa.quarentena', 'aprovar') then
    raise exception 'ACESSO_NEGADO';
  end if;

  if v_q.status_analise <> 'PENDENTE' then raise exception 'VOTO_JA_PROCESSADO'; end if;

  update urna_quarentena
     set status_analise = 'REJEITADO', candidato_escolhido_id = null,
         motivo_rejeicao = p_motivo, analisado_por = auth.uid(), analisado_em = now()
   where id = p_quarentena_id;

  insert into cipa_auditoria (eleicao_id, empresa_id, ator_id, acao, detalhes)
  values (v_q.eleicao_id, v_e.empresa_id, auth.uid(), 'QUARENTENA_REJEITADA',
          jsonb_build_object('cpf_mascara', public.cipa_mascara_cpf(v_q.cpf_declarado),
                             'motivo', p_motivo));

  return json_build_object('status','sucesso');
end $function$;

create or replace function public.cipa_reverter_voto(p_voto_id uuid, p_motivo text)
 returns json
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare
  v_v         public.cipa_votos_computados;
  v_e         public.eleicoes;
  v_el        public.eleicao_eleitores;
  v_cand_nome varchar;
  v_rotulo    text;
begin
  if coalesce(btrim(p_motivo),'') = '' then raise exception 'MOTIVO_OBRIGATORIO'; end if;

  select * into v_v from cipa_votos_computados where id = p_voto_id for update;
  if not found then raise exception 'VOTO_NAO_ENCONTRADO'; end if;

  v_e := public.cipa_assert_acesso(v_v.eleicao_id);
  if not public.tem_permissao(auth.uid(), v_e.empresa_id, 'cipa.auditoria', 'reverter') then
    raise exception 'ACESSO_NEGADO';
  end if;
  if v_e.status in ('ENCERRADA','APURADA') then
    raise exception 'ELEICAO_JA_ENCERRADA';
  end if;

  select * into v_el from eleicao_eleitores where id = v_v.eleitor_id;

  if v_v.tipo_voto = 'NOMINAL' then
    update candidatos set total_votos = total_votos - 1
     where id = v_v.candidato_id and eleicao_id = v_v.eleicao_id;
    select nome_urna into v_cand_nome from candidatos where id = v_v.candidato_id;
    v_rotulo := v_cand_nome;
  elsif v_v.tipo_voto = 'BRANCO' then
    update eleicoes set votos_branco = votos_branco - 1 where id = v_v.eleicao_id;
    v_rotulo := 'Voto em branco';
  else
    update eleicoes set votos_nulo = votos_nulo - 1 where id = v_v.eleicao_id;
    v_rotulo := 'Voto nulo';
  end if;

  delete from lista_assinaturas
   where eleicao_id = v_v.eleicao_id and eleitor_id = v_v.eleitor_id;

  delete from cipa_votos_computados where id = p_voto_id;

  update eleicao_eleitores set status_voto = false, votou_em = null
   where id = v_v.eleitor_id;

  insert into cipa_reversoes_auditoria
    (eleicao_id, empresa_id, ator_id, cpf, nome_eleitor, tipo_voto, candidato_id, candidato_nome, motivo)
  values (v_v.eleicao_id, v_e.empresa_id, auth.uid(), v_el.cpf, v_el.nome,
          v_v.tipo_voto, v_v.candidato_id, v_cand_nome, p_motivo);

  return json_build_object('status','revertido','eleitor_nome', v_el.nome, 'candidato_afetado', v_rotulo);
end $function$;

create or replace function public.cipa_listar_votos_corrigiveis(p_eleicao_id uuid)
 returns table(id uuid, eleitor_nome character varying, eleitor_cpf character varying, origem character varying, tipo_voto character varying, candidato_nome character varying, criado_em timestamp with time zone)
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare v_e public.eleicoes;
begin
  v_e := public.cipa_assert_acesso(p_eleicao_id);
  if not public.tem_permissao(auth.uid(), v_e.empresa_id, 'cipa.auditoria', 'visualizar') then
    raise exception 'ACESSO_NEGADO';
  end if;

  return query
  select v.id, el.nome, el.cpf, v.origem, v.tipo_voto, c.nome_urna, v.criado_em
  from cipa_votos_computados v
  join eleicao_eleitores el on el.id = v.eleitor_id
  left join candidatos c on c.id = v.candidato_id
  where v.eleicao_id = p_eleicao_id
  order by v.criado_em desc;
end $function$;


-- =====================================================================
-- FASE 4 — função de apoio para o front-end
-- =====================================================================

create or replace function public.minhas_permissoes(p_empresa_id uuid)
returns table(recurso_codigo text, acao_codigo text)
language sql stable security definer set search_path = public as $fn$
  select pp.recurso_codigo, pp.acao_codigo
  from usuarios_empresas ue
  join perfil_permissoes pp on pp.perfil_id = ue.perfil_id
  where ue.usuario_id = auth.uid() and ue.empresa_id = p_empresa_id
    and ue.ativo = true
$fn$;

grant execute on function public.minhas_permissoes(uuid) to authenticated;


-- =====================================================================
-- FASE 5 — handle_new_user e criação de usuário
-- =====================================================================

create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_empresa_id uuid;
  v_perfil_id uuid;
begin
  insert into profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email, ''), new.email)
  on conflict (id) do nothing;

  v_empresa_id := nullif(new.raw_user_meta_data->>'empresa_id', '')::uuid;
  v_perfil_id := nullif(new.raw_user_meta_data->>'perfil_id', '')::uuid;

  if v_empresa_id is not null then
    insert into usuarios_empresas (usuario_id, empresa_id, perfil_id, padrao)
    values (new.id, v_empresa_id, v_perfil_id, true)
    on conflict (usuario_id, empresa_id) do nothing;
  end if;

  return new;
end;
$function$;


-- =====================================================================
-- FASE 6 (parte SQL) — RLS das próprias tabelas de controle de acesso
--
-- Não estavam na lista explícita de "tabelas de domínio do núcleo",
-- mas usavam auth_papel_na_empresa() e precisam ser convertidas para
-- não sobrar referência nenhuma. perfis_acesso_select FICA como está
-- (sem gate de 'acessos') de propósito: o AuthContext do front-end
-- precisa fazer join em perfis_acesso.nome para exibir o nome do
-- perfil de QUALQUER usuário logado (não só admins) na barra lateral —
-- gatear isso atrás de 'acessos':'visualizar' quebraria essa exibição
-- para todo mundo que não for admin. As demais (perfil_permissoes,
-- usuario_unidades, usuarios_empresas_select_admin) só são lidas
-- diretamente pela tela /acessos (admin-only), então ganham o gate.
-- =====================================================================

drop policy if exists perfis_acesso_write on perfis_acesso;
create policy perfis_acesso_insert on perfis_acesso for insert to authenticated with check (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'acessos', 'criar')
);
create policy perfis_acesso_update on perfis_acesso for update to authenticated
  using (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'acessos', 'editar'))
  with check (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'acessos', 'editar'));
create policy perfis_acesso_delete on perfis_acesso for delete to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'acessos', 'excluir')
);

drop policy if exists perfil_permissoes_write on perfil_permissoes;
drop policy if exists perfil_permissoes_select on perfil_permissoes;
create policy perfil_permissoes_select on perfil_permissoes for select to authenticated using (
  exists (
    select 1 from perfis_acesso pa
    where pa.id = perfil_permissoes.perfil_id
      and pa.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), pa.empresa_id, 'acessos', 'visualizar')
  )
);
create policy perfil_permissoes_write on perfil_permissoes for all to authenticated
  using (exists (
    select 1 from perfis_acesso pa
    where pa.id = perfil_permissoes.perfil_id
      and pa.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), pa.empresa_id, 'acessos', 'editar')
  ))
  with check (exists (
    select 1 from perfis_acesso pa
    where pa.id = perfil_permissoes.perfil_id
      and pa.empresa_id in (select auth_empresas_ids())
      and tem_permissao(auth.uid(), pa.empresa_id, 'acessos', 'editar')
  ));

drop policy if exists usuario_unidades_write on usuario_unidades;
drop policy if exists usuario_unidades_select on usuario_unidades;
create policy usuario_unidades_select on usuario_unidades for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'acessos', 'visualizar')
);
create policy usuario_unidades_write on usuario_unidades for all to authenticated
  using (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'acessos', 'editar'))
  with check (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'acessos', 'editar'));

drop policy if exists usuarios_empresas_select_admin on usuarios_empresas;
create policy usuarios_empresas_select_admin on usuarios_empresas for select to authenticated using (
  empresa_id in (select auth_empresas_ids())
  and tem_permissao(auth.uid(), empresa_id, 'acessos', 'visualizar')
);

drop policy if exists usuarios_empresas_update_admin on usuarios_empresas;
create policy usuarios_empresas_update_admin on usuarios_empresas for update to authenticated
  using (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'acessos', 'editar'))
  with check (empresa_id in (select auth_empresas_ids()) and tem_permissao(auth.uid(), empresa_id, 'acessos', 'editar'));

drop policy if exists profiles_update_admin on profiles;
create policy profiles_update_admin on profiles for update to authenticated using (
  exists (
    select 1 from usuarios_empresas alvo
    join usuarios_empresas eu on eu.empresa_id = alvo.empresa_id
    where alvo.usuario_id = profiles.id
      and eu.usuario_id = auth.uid()
      and eu.ativo = true
      and tem_permissao(auth.uid(), eu.empresa_id, 'acessos', 'editar')
  )
);


-- =====================================================================
-- FASE 7 — remoção do campo legado, com trava de segurança
-- =====================================================================

do $$
declare v_sem_perfil int;
begin
  select count(*) into v_sem_perfil from usuarios_empresas
   where perfil_id is null and ativo = true;
  if v_sem_perfil > 0 then
    raise exception 'ABORTA: % vínculo(s) ativo(s) sem perfil_id — não é seguro remover papel', v_sem_perfil;
  end if;
end $$;

drop function if exists public.auth_papel_na_empresa(uuid);
alter table usuarios_empresas drop column papel;

-- profiles.papel: achado na varredura final (não estava na lista de
-- reconhecimento da Fase 0), coluna gêmea nunca lida por nenhuma RLS
-- ou front-end atual (ver comentário no topo do arquivo).
--
-- auth_papel(): achada na MESMA varredura final — outra função legada
-- (`select papel from profiles where id = auth.uid()`), órfã desde a
-- migration de multiempresa: nenhuma policy viva a chama hoje (só
-- auth_papel_na_empresa() é usada), era da era de uma-empresa-por-
-- usuário anterior a usuarios_empresas. Sem dropá-la ela ficaria
-- quebrada silenciosamente após o DROP COLUMN abaixo — melhor removê-
-- la de vez, junto com o resto do modelo de papel legado.
drop function if exists public.auth_papel();
alter table profiles drop column if exists papel;

commit;
