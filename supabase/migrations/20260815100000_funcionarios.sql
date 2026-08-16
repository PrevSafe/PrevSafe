-- =====================================================================
-- PrevSafe :: funcionários
-- Cadastro de pessoas (funcionarios) + histórico versionado de lotação
-- (funcionarios_lotacoes), já que transferência/promoção muda a exposição
-- a riscos e o S-2240 do eSocial exige histórico, não um cadastro estático.
-- Também cria a Tabela 01 do eSocial (categorias de trabalhador).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) CATEGORIAS_TRABALHADOR_ESOCIAL — Tabela 01 do eSocial (referência global)
-- ---------------------------------------------------------------------

create table if not exists categorias_trabalhador_esocial (
  codigo smallint primary key,
  grupo varchar(60) not null,
  descricao text not null
);

alter table categorias_trabalhador_esocial enable row level security;

drop policy if exists categorias_trabalhador_esocial_select on categorias_trabalhador_esocial;
create policy categorias_trabalhador_esocial_select on categorias_trabalhador_esocial for select to authenticated
  using (true);

insert into categorias_trabalhador_esocial (codigo, grupo, descricao) values
  (101, 'Empregado e Trabalhador Temporário', 'Empregado - Geral, inclusive o empregado público da administração direta ou indireta contratado pela CLT'),
  (102, 'Empregado e Trabalhador Temporário', 'Empregado - Trabalhador rural por pequeno prazo da Lei 11.718/2008'),
  (103, 'Empregado e Trabalhador Temporário', 'Empregado - Aprendiz'),
  (104, 'Empregado e Trabalhador Temporário', 'Empregado - Doméstico'),
  (105, 'Empregado e Trabalhador Temporário', 'Empregado - Contrato a termo firmado nos termos da Lei 9.601/1998'),
  (106, 'Empregado e Trabalhador Temporário', 'Trabalhador temporário - Contrato nos termos da Lei 6.019/1974'),
  (107, 'Empregado e Trabalhador Temporário', 'Empregado - Contrato de trabalho Verde e Amarelo - sem acordo para antecipação mensal da multa rescisória do FGTS'),
  (108, 'Empregado e Trabalhador Temporário', 'Empregado - Contrato de trabalho Verde e Amarelo - com acordo para antecipação mensal da multa rescisória do FGTS'),
  (111, 'Empregado e Trabalhador Temporário', 'Empregado - Contrato de trabalho intermitente'),

  (201, 'Avulso', 'Trabalhador avulso portuário'),
  (202, 'Avulso', 'Trabalhador avulso não portuário'),

  (301, 'Agente Público', 'Servidor público titular de cargo efetivo, magistrado, ministro de Tribunal de Contas, conselheiro de Tribunal de Contas e membro do Ministério Público'),
  (302, 'Agente Público', 'Servidor público ocupante de cargo exclusivo em comissão'),
  (303, 'Agente Público', 'Exercente de mandato eletivo'),
  (304, 'Agente Público', 'Servidor público exercente de mandato eletivo, inclusive com exercício de cargo em comissão'),
  (305, 'Agente Público', 'Servidor público indicado para conselho ou órgão deliberativo, na condição de representante do governo, órgão ou entidade da administração pública'),
  (306, 'Agente Público', 'Servidor público contratado por tempo determinado, sujeito a regime administrativo especial definido em lei própria'),
  (307, 'Agente Público', 'Militar'),
  (308, 'Agente Público', 'Conscrito'),
  (309, 'Agente Público', 'Agente público - Outros'),
  (310, 'Agente Público', 'Servidor público eventual'),
  (311, 'Agente Público', 'Ministros, juízes, procuradores, promotores ou oficiais de justiça à disposição da Justiça Eleitoral'),
  (312, 'Agente Público', 'Auxiliar local'),
  (313, 'Agente Público', 'Servidor público exercente de atividade de instrutoria, capacitação, treinamento, curso ou concurso, ou convocado para pareceres técnicos ou depoimentos'),

  (401, 'Cessão', 'Dirigente sindical - Informação prestada pelo sindicato'),
  (410, 'Cessão', 'Trabalhador cedido/exercício em outro órgão/juiz auxiliar - Informação prestada pelo cessionário/destino'),

  (501, 'Segurado Especial', 'Dirigente sindical - Segurado especial'),

  (701, 'Contribuinte Individual', 'Contribuinte individual - Autônomo em geral, exceto se enquadrado em uma das demais categorias de contribuinte individual'),
  (711, 'Contribuinte Individual', 'Contribuinte individual - Transportador autônomo de passageiros'),
  (712, 'Contribuinte Individual', 'Contribuinte individual - Transportador autônomo de carga'),
  (721, 'Contribuinte Individual', 'Contribuinte individual - Diretor não empregado, com FGTS'),
  (722, 'Contribuinte Individual', 'Contribuinte individual - Diretor não empregado, sem FGTS'),
  (723, 'Contribuinte Individual', 'Contribuinte individual - Empresário, sócio e membro de conselho de administração ou fiscal'),
  (731, 'Contribuinte Individual', 'Contribuinte individual - Cooperado que presta serviços por intermédio de cooperativa de trabalho'),
  (734, 'Contribuinte Individual', 'Contribuinte individual - Transportador cooperado que presta serviços por intermédio de cooperativa de trabalho'),
  (738, 'Contribuinte Individual', 'Contribuinte individual - Cooperado filiado a cooperativa de produção'),
  (741, 'Contribuinte Individual', 'Contribuinte individual - Microempreendedor individual'),
  (751, 'Contribuinte Individual', 'Contribuinte individual - Magistrado classista temporário da Justiça do Trabalho ou da Justiça Eleitoral que seja aposentado de qualquer regime previdenciário'),
  (761, 'Contribuinte Individual', 'Contribuinte individual - Associado eleito para direção de cooperativa, associação ou entidade de classe de qualquer natureza ou finalidade, bem como o síndico ou administrador eleito para exercer atividade de direção condominial, desde que recebam remuneração'),
  (771, 'Contribuinte Individual', 'Contribuinte individual - Membro de conselho tutelar, nos termos da Lei 8.069/1990'),
  (781, 'Contribuinte Individual', 'Ministro de confissão religiosa ou membro de vida consagrada, de congregação ou de ordem religiosa'),

  (901, 'Bolsista', 'Estagiário'),
  (902, 'Bolsista', 'Médico residente ou residente em área profissional de saúde'),
  (903, 'Bolsista', 'Bolsista'),
  (904, 'Bolsista', 'Participante de curso de formação, como etapa de concurso público, sem vínculo de emprego/estatutário'),
  (906, 'Bolsista', 'Beneficiário do Programa Nacional de Prestação de Serviço Civil Voluntário')
on conflict (codigo) do update
  set grupo = excluded.grupo,
      descricao = excluded.descricao;


-- ---------------------------------------------------------------------
-- 2) FUNCIONARIOS — dados da pessoa (sem lotação; ela fica no histórico)
-- ---------------------------------------------------------------------

create table if not exists funcionarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  codigo varchar(20),
  nome varchar(255) not null,
  cpf varchar(11) not null check (cpf ~ '^[0-9]{11}$'),
  data_nascimento date,
  nacionalidade varchar(60),
  naturalidade varchar(120),
  rg varchar(20),
  rg_orgao varchar(20),
  rg_uf char(2),
  rg_expedicao date,
  pis varchar(11) check (pis is null or pis ~ '^[0-9]{11}$'),
  ctps varchar(20),
  ctps_serie varchar(10),
  ctps_uf char(2),
  matricula_esocial varchar(30),
  cod_categoria smallint references categorias_trabalhador_esocial(codigo),
  data_admissao date,
  data_desligamento date,
  telefone varchar(20),
  email varchar(255),
  status varchar(20) not null default 'ativo'
    check (status in ('ativo', 'afastado', 'ferias', 'desligado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, cpf)
);

create index if not exists idx_funcionarios_empresa on funcionarios(empresa_id, status);


-- ---------------------------------------------------------------------
-- 3) FUNCIONARIOS_LOTACOES — histórico versionado de alocação (S-2240)
-- ---------------------------------------------------------------------

create table if not exists funcionarios_lotacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  lotacao_id uuid not null references lotacoes(id) on delete restrict,
  data_inicio date not null,
  data_fim date,
  motivo varchar(30) not null default 'admissao'
    check (motivo in ('admissao', 'transferencia', 'promocao', 'retorno', 'desligamento')),
  observacao text,
  criado_em timestamptz not null default now(),
  constraint chk_vigencia check (data_fim is null or data_fim >= data_inicio),
  unique (funcionario_id, data_inicio)
);

-- No máximo uma lotação aberta (vigente) por funcionário.
drop index if exists idx_funcionarios_lotacoes_aberta;
create unique index idx_funcionarios_lotacoes_aberta
  on funcionarios_lotacoes (funcionario_id)
  where data_fim is null;

create index if not exists idx_funcionarios_lotacoes_empresa on funcionarios_lotacoes(empresa_id);
create index if not exists idx_funcionarios_lotacoes_funcionario
  on funcionarios_lotacoes(funcionario_id, data_inicio desc);


-- ---------------------------------------------------------------------
-- 4) Triggers de atualizado_em e políticas RLS
-- ---------------------------------------------------------------------

drop trigger if exists trg_funcionarios_atualizado on funcionarios;
create trigger trg_funcionarios_atualizado before update on funcionarios
  for each row execute function public.set_atualizado_em();

drop trigger if exists trg_funcionarios_lotacoes_atualizado on funcionarios_lotacoes;
create trigger trg_funcionarios_lotacoes_atualizado before update on funcionarios_lotacoes
  for each row execute function public.set_atualizado_em();

alter table funcionarios enable row level security;
alter table funcionarios_lotacoes enable row level security;

drop policy if exists funcionarios_select on funcionarios;
create policy funcionarios_select on funcionarios for select to authenticated
  using (empresa_id = auth_empresa_id());
drop policy if exists funcionarios_write on funcionarios;
create policy funcionarios_write on funcionarios for all to authenticated
  using (empresa_id = auth_empresa_id() and auth_papel() <> 'leitura')
  with check (empresa_id = auth_empresa_id() and auth_papel() <> 'leitura');

drop policy if exists funcionarios_lotacoes_select on funcionarios_lotacoes;
create policy funcionarios_lotacoes_select on funcionarios_lotacoes for select to authenticated
  using (empresa_id = auth_empresa_id());
drop policy if exists funcionarios_lotacoes_write on funcionarios_lotacoes;
create policy funcionarios_lotacoes_write on funcionarios_lotacoes for all to authenticated
  using (empresa_id = auth_empresa_id() and auth_papel() <> 'leitura')
  with check (empresa_id = auth_empresa_id() and auth_papel() <> 'leitura');
