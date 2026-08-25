-- =====================================================================
-- PrevSafe :: corrige achados da revisão do Módulo 5
--
-- 1) atualizar_situacao_ca() comparava data_validade_ca com current_date
--    (timezone de sessão do servidor, UTC no Supabase) em vez do dia em
--    Brasília — um CA podia aparecer "vencido" até 3h antes do previsto
--    (entre 21h e 23h59 de Brasília, current_date em UTC já virou o dia
--    seguinte). Mesmo cuidado que já existe no front-end para calibração
--    de equipamentos (src/lib/cipa/fuso.ts / hojeBrasil()).
-- 2) Índice que faltava em clinicas_credenciadas_procedimentos.procedimento_codigo,
--    usado por relatórios de conciliação (quais clínicas realizam um exame).
-- =====================================================================

create or replace function public.atualizar_situacao_ca()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  hoje_brasil date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if new.data_validade_ca is null then
    new.situacao_ca := 'nao_verificado';
  elsif new.data_validade_ca >= hoje_brasil then
    new.situacao_ca := 'vigente';
  else
    new.situacao_ca := 'vencido';
  end if;
  new.ca_verificado_em := now();
  return new;
end;
$$;

create index if not exists idx_clinicas_credenciadas_procedimentos_codigo
  on clinicas_credenciadas_procedimentos(procedimento_codigo);
