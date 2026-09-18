# Colocar o PrevSafe no ar

Runbook de produção. O código e o banco já estão prontos; o que resta aqui exige
login nas contas (Vercel, Supabase, registrador do domínio).

**Projeto Supabase:** PrevSafe — ref `dijwqveojqnazphzifhg`, região `sa-east-1` (São Paulo)
**Repositório:** `github.com/PrevSafe/PrevSafe`, branch `main`
**Domínio de produção:** `prevsafe.com.br`

---

## 1. Criar o projeto na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe `PrevSafe/PrevSafe`.
2. A Vercel detecta Next.js sozinha. Não altere Build Command nem Output Directory —
   o `vercel.json` do repositório já fixa o framework e a região `gru1` (São Paulo,
   junto do Supabase, para reduzir latência do banco).
3. **Antes de clicar em Deploy**, cadastre as variáveis do passo 2. Sem elas o build
   sobe, mas o login falha.

## 2. Variáveis de ambiente

Em **Settings → Environment Variables**, marcando os três ambientes
(Production, Preview, Development):

| Variável | Valor | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dijwqveojqnazphzifhg.supabase.co` | pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key do projeto | pública, protegida por RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key | **secreta** |
| `NEXT_PUBLIC_APP_URL` | `https://prevsafe.com.br` | sem barra no final |
| `GEMINI_API_KEY` | chave do Google AI Studio | opcional |

As chaves do Supabase estão em **Supabase → Project Settings → API**.

> **A service role key ignora toda a RLS.** Ela só é lida pelas rotas de servidor
> (`/api/admin/*`, `/api/validar`). Nunca a coloque numa variável com prefixo
> `NEXT_PUBLIC_`, ou ela vai para o navegador de qualquer visitante.

`GEMINI_API_KEY` é opcional: sem ela o copiloto de IA fica indisponível e o resto
do sistema funciona normalmente.

## 3. Domínio

1. Em **Settings → Domains**, adicione `prevsafe.com.br` e `www.prevsafe.com.br`.
2. Aponte o DNS no registrador conforme a Vercel indicar (normalmente um `A` para
   o apex e um `CNAME` para o `www`).
3. Aguarde a propagação e o certificado HTTPS, que a Vercel emite sozinha.

Se o domínio ainda não estiver pronto, dá para começar pelo domínio `.vercel.app`:
basta ajustar `NEXT_PUBLIC_APP_URL` e o passo 4 para essa URL, e trocar depois.

## 4. Supabase Auth — redirecionamento

Em **Supabase → Authentication → URL Configuration**:

- **Site URL:** `https://prevsafe.com.br`
- **Redirect URLs:** adicione
  - `https://prevsafe.com.br/redefinir-senha`
  - `https://prevsafe.com.br/**`
  - `http://localhost:3000/**` (desenvolvimento)

Sem isto o e-mail de recuperação de senha leva o usuário para o lugar errado e ele
não consegue definir a nova senha.

## 5. Segurança do Auth

Em **Authentication → Policies / Passwords**, ative **Leaked password protection**.
Ela compara a senha escolhida com a base do HaveIBeenPwned e rejeita senhas já
vazadas. Está desligada por padrão e é um clique.

## 6. Liberar acesso a cada pessoa da equipe

Quem entra no sistema precisa de duas coisas: uma conta no Supabase Auth e um
vínculo com a organização em `prevsafe_members`. Sem o vínculo, a pessoa faz login
mas a RLS bloqueia tudo — ela vê o sistema vazio.

**Pelo sistema (recomendado):** a tela **Usuários → Novo Usuário** cria a conta e o
vínculo de uma vez, herdando a organização de quem está criando.

**Manualmente**, se precisar liberar alguém que já tem conta:

```sql
insert into public.prevsafe_members (auth_user_id, organization_id, role)
values ('<id-do-usuario-no-auth>', 'org-prevsafe-01', 'TÉCNICO')
on conflict (auth_user_id, organization_id) do update set role = excluded.role;
```

## 7. Conferir que subiu certo

Depois do deploy, na ordem:

1. Abra `https://prevsafe.com.br` e faça login.
2. Confira o chip de sincronização na barra superior: deve passar por
   **Carregando** e parar em **Salvo**. Se mostrar **Não salvo**, passe o mouse —
   a mensagem diz o motivo.
3. Cadastre um cliente de teste. Abra o sistema em outro dispositivo ou numa aba
   anônima e confirme que ele aparece: é a prova de que os dados estão no servidor,
   e não no navegador.
4. Apague esse cliente de teste.
5. Peça uma recuperação de senha e confirme que o link abre `/redefinir-senha`.
6. Gere um documento assinado e escaneie o QR Code: ele deve abrir
   `https://prevsafe.com.br/validar` mostrando o documento e os signatários.

## 8. Antes do primeiro lançamento real

- **Configurações → Dados da Empresa → Responsabilidade Técnica:** preencha o
  engenheiro responsável (nome, qualificação, CREA, ART) e o médico coordenador do
  PCMSO (nome, CRM, RQE). Sem isso, PGR, PCMSO e LTCAT saem com
  "Não informado nas Configurações" no lugar da assinatura técnica.
- **eSocial:** o ambiente começa em **produção restrita** (homologação) de
  propósito. Valide os primeiros lotes antes de mudar para produção, e suba o
  certificado A1 na tela de configuração.

---

## Backups

O plano gratuito do Supabase mantém backup diário com retenção curta. Antes dos
lançamentos reais, avalie subir de plano para ampliar a retenção e liberar
restauração para um ponto no tempo (PITR).

Para um backup manual por fora:

```bash
supabase db dump --project-ref dijwqveojqnazphzifhg -f backup.sql
```

## Como os dados ficam guardados

Todo registro do sistema vive em `prevsafe_records`, uma linha por registro:

```
organization_id + collection + record_id  ->  data (JSONB)
```

A RLS exige que o usuário esteja em `prevsafe_members` para ler ou escrever
qualquer linha. Exclusões são lógicas (`deleted_at`), para que apagar algo num
dispositivo não seja desfeito por outro que ainda tivesse o registro em memória.

As fotos de campo ficam no bucket privado `prevsafe-evidencias`, isoladas por
organização pela primeira pasta do caminho (`<organization_id>/<os>/<arquivo>`).
O bucket não é público: as imagens só abrem por URL assinada temporária.
