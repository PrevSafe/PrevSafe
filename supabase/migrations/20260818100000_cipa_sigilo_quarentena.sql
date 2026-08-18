-- Voto secreto (NR-05): a comissao confere identidade, nunca a manifestacao.
-- tipo_voto na mesma linha do CPF permite saber quem votou branco ou nulo,
-- o que e manifestacao politica e nao pode ser vinculada ao eleitor.
revoke all on public.urna_quarentena from anon, authenticated;

grant select (
  id, eleicao_id, nome_declarado, cpf_declarado, cargo_declarado,
  ip_dispositivo, user_agent, data_hora,
  status_analise, analisado_por, analisado_em, motivo_rejeicao
) on public.urna_quarentena to authenticated;
