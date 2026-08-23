-- As tabelas cipa_otp_qr/cipa_otp_verificados (20260828020000_cipa_otp_email_qr)
-- herdaram o privilégio padrão do Supabase que concede tudo a `authenticated`
-- em tabelas novas. RLS ligado sem nenhuma policy já bloqueava o acesso na
-- prática, mas o resto do módulo (ex.: cipa_tentativas_negadas, urna_quarentena)
-- também revoga esse padrão explicitamente — só service_role deve tocar
-- nessas duas tabelas, via api/cipa/otp.ts.
revoke all on public.cipa_otp_qr from anon, authenticated;
revoke all on public.cipa_otp_verificados from anon, authenticated;
