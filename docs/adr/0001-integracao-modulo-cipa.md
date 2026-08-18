# ADR-0001: Integrar o CIPA ao PrevSafe como módulo no mesmo código e no mesmo banco

**Status:** Proposto — aguarda aprovação para aplicar as migrações
**Data:** 17 de agosto de 2026
**Decisores:** Gean Monteiro (produto e tecnologia)

## Contexto

O PrevCIPA foi construído como aplicação autônoma: repositório próprio, projeto Supabase próprio (`bjnicribzvxwqenztafo`), autenticação própria e deploy próprio na Vercel. O PrevSafe já está em produção, é Next.js sobre Supabase, com login por e-mail e senha.

Forças em jogo:

- **Nenhum dado real existe ainda.** Nem no PrevCIPA (só a eleição de demonstração) nem no PrevSafe. Esta é a janela mais barata possível para reorganizar. Depois da primeira eleição de cliente, migrar significa mover CPF e registros de voto com efeito jurídico entre bancos.
- **O PrevSafe já modela melhor o domínio.** Tem `unidades` (estabelecimento, com CNAE e grau de risco), `funcionarios` (com CPF, admissão e desligamento), `profiles` e `usuarios_empresas` (multi-tenant com um consultor acessando várias empresas). Quatro das nove tabelas do PrevCIPA eram reimplementações piores disso.
- **A NR-05 constitui CIPA por estabelecimento**, não por empresa. O schema original ancorava a eleição em `empresa_id`, o que estava errado para qualquer cliente com filial.
- **O deploy separado na Vercel não avançou** — repositório vazio, conta Hobby com repositório de organização. Trabalho de infraestrutura que pode ser eliminado em vez de resolvido.
- **Restrição inegociável:** as telas do eleitor precisam continuar públicas e anônimas. O trabalhador do chão de fábrica não tem conta no PrevSafe e não vai criar uma para votar.

## Decisão

Fundir o PrevCIPA no repositório e no banco do PrevSafe, como módulo licenciável. Um código, um deploy, um banco, um login.

O painel da comissão passa a viver em `/cipa` dentro do app autenticado. As telas do eleitor permanecem em `/v/[token]` e `/q/[eleicaoId]` na raiz, fora de qualquer autenticação.

## Opções consideradas

### Opção A: Deploy separado, link no menu do PrevSafe

| Dimensão | Avaliação |
|---|---|
| Complexidade | Baixa |
| Custo | Dois deploys, dois projetos Supabase |
| Experiência | Ruim — login duplicado |
| Manutenção | Alta — duas bases de código e de dados |

**Prós:** entrega mais rápida; isolamento total de falhas.
**Contras:** o usuário loga duas vezes; `empresas` e `funcionarios` duplicados em dois bancos, exigindo sincronização; o cadastro do RH teria que ser mantido duas vezes.

### Opção B: Proxy por rota (multi-zone do Next.js)

| Dimensão | Avaliação |
|---|---|
| Complexidade | Média |
| Custo | Dois deploys, dois bancos |
| Experiência | Boa na aparência, ruim na sessão |
| Manutenção | Alta |

**Prós:** aparenta ser um módulo só (`prevsafe.com.br/cipa`); nativo no Next.js.
**Contras:** resolve a URL, não os dados. Duas instâncias Supabase não compartilham sessão nem tabelas — a duplicação de `funcionarios` permanece. Custo de manutenção quase igual ao da Opção A, com a ilusão de integração.

### Opção C: Fusão no mesmo repositório e no mesmo banco *(escolhida)*

| Dimensão | Avaliação |
|---|---|
| Complexidade | Média — alta agora, baixa depois |
| Custo | Um deploy, um banco |
| Experiência | Um login, um menu |
| Manutenção | Baixa |

**Prós:** elimina quatro tabelas redundantes; a lista de eleitores sai de `funcionarios` em vez de planilha; o desempate ganha critério objetivo (`data_admissao`); RLS unificado por `auth_empresas_ids()`; nenhum deploy novo.
**Contras:** trabalho de reescrita concentrado agora; acoplamento — um bug no módulo CIPA roda no mesmo processo do resto do PrevSafe; migrações do PrevSafe passam a carregar o módulo.

### Opção D: Embed por iframe

| Dimensão | Avaliação |
|---|---|
| Complexidade | Baixa |
| Custo | Dois deploys |
| Experiência | Ruim em celular |
| Manutenção | Alta |

**Prós:** integração visual quase imediata.
**Contras:** inviável para o PWA do eleitor (instalação, câmera, teclado numérico, área de toque); cookies de terceiros; duplicação de dados igual às opções A e B. Descartada.

## Análise de trade-offs

O eixo real não é URL nem visual — é **onde vivem `empresas` e `funcionarios`**. As opções A, B e D deixam o cadastro do RH duplicado em dois bancos, e toda a promessa do produto depende dele: é contra a lista de funcionários que a quarentena confere CPF, é dela que sai o quórum, é dela que vem a data de admissão do desempate. Duas cópias significam duas verdades e conferência inválida.

O preço da Opção C é acoplamento e um pico de trabalho agora. Ambos são aceitáveis: não há dado de produção para proteger, e o custo de acoplamento num sistema com um punhado de módulos é muito menor que o de manter dois cadastros de pessoas sincronizados.

Descartamos também a alternativa de manter a eleição ancorada em `empresa_id` por simplicidade. Seria mais fácil e estaria errado: uma empresa com três filiais precisa de três CIPAs, cada uma dimensionada pelo CNAE e pelo número de empregados daquele CNPJ.

## Consequências

**Fica mais fácil**

- Montar a lista de aptos: virou consulta a `funcionarios`, não importação de planilha
- Desempatar eleição: `data_admissao` já está no banco
- Vender módulos futuros: `licencas_modulo` serve para PGR, PCMSO e o que vier
- Operar: um deploy, um banco, um backup, um monitoramento

**Fica mais difícil**

- Isolar falhas: um erro no módulo CIPA roda no mesmo processo do PrevSafe
- Escalar separadamente: se a votação de uma empresa grande gerar pico, ele atinge o app inteiro
- Terceirizar o módulo: não dá mais para vender o CIPA isolado a quem não usa PrevSafe

**Vai precisar revisitar**

- **Snapshot de eleitores.** `eleicao_eleitores` congela a folha na abertura. Se o RH corrigir um CPF durante a votação, o snapshot não acompanha — é intencional, mas vai gerar chamado de suporte e precisa de tela para tratar.
- **Rate limit.** Continua ausente. Com o app unificado, um ataque à urna afeta o PrevSafe inteiro. Sobe de prioridade.
- **Expurgo LGPD** de `ip_dispositivo` e `user_agent`.
- **Retenção das atas.** Documento com efeito jurídico dentro de um banco sem política de retenção definida.

## Itens de ação

1. [ ] Aprovar a alteração em `empresas` (nova coluna `consultoria_id`)
2. [ ] Aplicar as cinco migrações no projeto PrevSafe
3. [ ] Rodar a bateria de verificação de sigilo (GRANT de coluna e RPCs expostas a `anon`)
4. [ ] Mover componentes e rotas para o repositório do PrevSafe, painel sob `/cipa`
5. [ ] **Excluir `/v` e `/q` do matcher do middleware** — sem isso o trabalhador é redirecionado ao login e a votação não acontece
6. [ ] Unificar `tailwind.config.ts` (tokens `concreto`, `cipa`, `ambar`, `alerta`) com o design system existente
7. [ ] Adicionar o item CIPA ao menu, condicionado a `modulos_da_empresa()`
8. [ ] Descartar o projeto Supabase `PrevCIPA` e o repositório separado
9. [ ] Testar a votação em 4G, por celular, conferindo o IP registrado na quarentena
