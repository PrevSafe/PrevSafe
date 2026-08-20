-- O painel (dashboard) e um recurso somente leitura. Nao faz sentido
-- oferecer criar/editar/excluir na matriz de permissoes para ele.
delete from perfil_permissoes where recurso_codigo = 'dashboard' and acao_codigo <> 'visualizar';
delete from recurso_acoes where recurso_codigo = 'dashboard' and acao_codigo <> 'visualizar';
