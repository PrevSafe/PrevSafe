-- =====================================================================
-- PrevSafe · Horário de Brasília na apuração
--
-- O default de cipa_votos_computados.criado_em truncava o dia com
-- date_trunc('day', now()), mas a sessão do banco roda em UTC. Um voto
-- registrado às 22h de Brasília (01h UTC do dia seguinte) cairia no dia
-- errado. Trunca agora pelo calendário de Brasília e converte de volta
-- para o instante correspondente.
--
-- Seguro rodar agora: cipa_votos_computados está com zero linhas.
-- =====================================================================

begin;

alter table public.cipa_votos_computados
  alter column criado_em set default
    date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';

commit;
