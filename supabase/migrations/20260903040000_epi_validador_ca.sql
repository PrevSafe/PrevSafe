-- =====================================================================
-- PrevSafe :: Validador de CA (Módulo 5 — EPI/EPC)
-- Acrescenta os campos de vigência do Certificado de Aprovação (CA) do
-- fabricante ao cadastro de EPI já existente (epis), e deriva
-- automaticamente a situação a partir da data de validade informada.
--
-- Não há integração real com a API pública de CAs do governo neste
-- momento — a coluna situacao_ca é recalculada a partir de
-- data_validade_ca a cada gravação; quando uma integração externa
-- existir, ela passa a escrever nessas mesmas colunas.
-- =====================================================================

alter table epis
  add column if not exists fabricante varchar(150),
  add column if not exists data_validade_ca date,
  add column if not exists situacao_ca varchar(20) not null default 'nao_verificado'
    check (situacao_ca in ('vigente', 'vencido', 'nao_verificado')),
  add column if not exists ca_verificado_em timestamptz;

create or replace function public.atualizar_situacao_ca()
returns trigger
language plpgsql
as $$
begin
  if new.data_validade_ca is null then
    new.situacao_ca := 'nao_verificado';
  elsif new.data_validade_ca >= current_date then
    new.situacao_ca := 'vigente';
  else
    new.situacao_ca := 'vencido';
  end if;
  new.ca_verificado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_epis_situacao_ca on epis;
create trigger trg_epis_situacao_ca before insert or update of data_validade_ca on epis
  for each row execute function public.atualizar_situacao_ca();
