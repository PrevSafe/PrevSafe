# PrevSafe SST

Sistema de gestão de serviços de Segurança e Saúde no Trabalho: CRM comercial,
ordens de serviço, engenharia SST (PGR, PCMSO, LTCAT, GHE e inventário de riscos),
CIPA, eSocial, EPIs, financeiro, portal do cliente e PWA de campo.

Next.js 15 + React 19 + TypeScript, com Supabase para autenticação, banco e
armazenamento de arquivos.

## Rodar localmente

Pré-requisito: Node.js 22.

```bash
npm install
cp .env.example .env.local   # preencha as chaves
npm run dev                  # http://localhost:3000
```

As variáveis estão descritas em [.env.example](.env.example). As duas chaves do
Supabase ficam em Project Settings → API. `GEMINI_API_KEY` é opcional: sem ela o
copiloto de IA fica indisponível e o resto do sistema funciona normalmente.

## Colocar em produção

Passo a passo em [docs/DEPLOY.md](docs/DEPLOY.md): projeto na Vercel, variáveis de
ambiente, domínio, URLs de redirecionamento do Supabase Auth, liberação de acesso
para a equipe e a checagem pós-deploy.

## Onde os dados ficam

Tudo é gravado no Supabase, na tabela `prevsafe_records` — uma linha por registro,
com o conteúdo em JSONB:

```
organization_id + collection + record_id  ->  data (JSONB)
```

A RLS exige vínculo em `prevsafe_members` para ler ou escrever qualquer linha, e
as exclusões são lógicas (`deleted_at`), para que apagar algo num dispositivo não
seja desfeito por outro que ainda tivesse o registro em memória.

O navegador mantém uma cópia em `localStorage`, usada só como cache offline: o
que for editado sem conexão sobe quando ela volta. O chip na barra superior mostra
o estado da gravação (Salvando / Salvo / Sem conexão / Não salvo).

As fotos de vistoria vão para o bucket privado `prevsafe-evidencias`, isoladas por
organização e acessíveis apenas por URL assinada temporária.

## Backup

Uma tarefa agendada no Windows ("PrevSafe - Backup diario") exporta os dados
todo dia às 20:00 para `backups/`. Manualmente:

```bash
node scripts/backup.mjs                       # gera backup
node scripts/restore.mjs <arquivo> --wipe     # restaura
```

Detalhes, restauração e o que o script não cobre em
[docs/DEPLOY.md](docs/DEPLOY.md#backups).

## Migrações do banco

Estão em [supabase/migrations/](supabase/migrations/). Para aplicar num projeto novo:

```bash
supabase link --project-ref <ref-do-projeto>
supabase db push
```

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `app/` | rotas do Next (App Router) e rotas de API |
| `components/` | telas, agrupadas por módulo |
| `context/PrevSafeContext.tsx` | estado da aplicação e sincronização com o Supabase |
| `lib/` | serviços: Supabase, sincronização, PDFs, Excel, catálogos técnicos |
| `types/` | modelo de dados |
| `supabase/migrations/` | esquema do banco |

`src/`, `api/`, `index.html` e `vite.config.ts` são resíduos da versão anterior em
Vite. Não entram no build (estão excluídos no `tsconfig.json`) e nada os importa.
