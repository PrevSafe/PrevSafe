-- Habilita Supabase Realtime (postgres_changes) nas tabelas operacionais que
-- alimentam o widget "Linter SST — Tempo real" do Dashboard. Sem isso, a
-- publicação supabase_realtime existe mas não contém nenhuma tabela, então
-- supabase.channel(...).on('postgres_changes', ...) nunca dispara.
alter publication supabase_realtime add table
  public.riscos_inventario,
  public.aso_exames_procedimentos,
  public.epi_entregas,
  public.funcionarios_afastamentos,
  public.cat_comunicacoes,
  public.funcionarios,
  public.funcionarios_lotacoes,
  public.aso_exames;
