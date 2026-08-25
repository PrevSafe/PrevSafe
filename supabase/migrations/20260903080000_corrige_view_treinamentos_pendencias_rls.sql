-- =====================================================================
-- PrevSafe :: corrige treinamentos_pendencias (SECURITY DEFINER indevido)
--
-- O linter de segurança do Supabase acusou a view criada em
-- 20260903050000 como SECURITY DEFINER: sem security_invoker
-- explícito, ela roda com o privilégio de quem a criou (a migration),
-- ignorando o RLS de funcionarios_lotacoes/treinamentos_obrigatorios/
-- treinamentos para quem a consulta pelo PostgREST. Recria com
-- security_invoker = true para que volte a respeitar o RLS de cada
-- tabela na perspectiva do usuário autenticado.
-- =====================================================================

create or replace view treinamentos_pendencias
with (security_invoker = true) as
select
  fl.empresa_id,
  fl.funcionario_id,
  tobr.id as treinamento_obrigatorio_id,
  tobr.norma_regulamentadora,
  tobr.nome_treinamento,
  tobr.periodicidade_meses,
  ultimo.id as ultimo_treinamento_id,
  ultimo.data_realizacao,
  ultimo.data_validade,
  case
    when ultimo.id is null then 'ausente'
    when ultimo.data_validade is not null and ultimo.data_validade < current_date then 'vencido'
    else 'em_dia'
  end as situacao
from funcionarios_lotacoes fl
join lotacoes l on l.id = fl.lotacao_id
join treinamentos_obrigatorios tobr
  on tobr.empresa_id = fl.empresa_id and tobr.cargo_id = l.cargo_id
left join lateral (
  select t.id, t.data_realizacao, t.data_validade
  from treinamentos t
  where t.funcionario_id = fl.funcionario_id
    and t.norma_regulamentadora = tobr.norma_regulamentadora
  order by t.data_realizacao desc
  limit 1
) ultimo on true
where fl.data_fim is null;
