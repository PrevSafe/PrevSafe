-- Os default privileges do Supabase concedem ALL a anon/authenticated em toda
-- tabela nova de `public`. Isso anulava a proteção por coluna de urna_quarentena.
revoke all on public.urna_quarentena from anon, authenticated;
grant select (
  id, eleicao_id, nome_declarado, cpf_declarado, cargo_declarado,
  ip_dispositivo, user_agent, data_hora, tipo_voto,
  status_analise, analisado_por, analisado_em, motivo_rejeicao
) on public.urna_quarentena to authenticated;

revoke all on public.eleicao_eleitores from anon, authenticated;
revoke all on public.lista_assinaturas from anon, authenticated;
revoke all on public.cipa_auditoria    from anon, authenticated;
grant select on public.eleicao_eleitores, public.lista_assinaturas, public.cipa_auditoria
  to authenticated;

revoke all on public.eleicoes   from anon;
revoke all on public.candidatos from anon;
revoke all on public.consultorias, public.licencas_modulo, public.modulos from anon;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'cipa!_%' escape '!'
      and p.proname not in ('cipa_obter_cedula','cipa_validar_token',
                            'cipa_registrar_voto_link','cipa_registrar_voto_qr',
                            'cipa_cpf_valido','cipa_digitos','cipa_mascara_cpf')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
  end loop;
end $$;
