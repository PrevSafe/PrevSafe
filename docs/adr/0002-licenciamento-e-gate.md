# ADR-0002: A trava de licença atua na criação e na abertura da eleição, nunca durante a votação

**Status:** Proposto — implementado nas migrações, aguarda aprovação
**Data:** 17 de agosto de 2026
**Decisores:** Gean Monteiro (produto e tecnologia)

## Contexto

O módulo CIPA será vendido separadamente, nos dois modelos: cobrança da consultoria (cobrindo as empresas que ela atende) ou da empresa cliente direto. Isso exige uma trava que impeça o uso por quem não contratou.

A tentação natural é verificar a licença em todo acesso ao módulo, como se faz com qualquer feature paga. Aqui isso colide com uma característica do domínio.

Uma eleição de CIPA é um **processo com efeito jurídico e duração de dias**. Cartazes ficam afixados no refeitório, links são disparados por WhatsApp, e a votação corre por três a sete dias. O resultado é registrado em ata que embasa a estabilidade provisória dos eleitos e é exibível em fiscalização do Ministério do Trabalho.

Duas restrições adicionais:

- As telas do eleitor são **públicas e anônimas**. Não há usuário logado cuja licença possa ser consultada.
- A assinatura pode vencer, falhar cobrança ou ser cancelada **enquanto a urna está aberta**.

## Decisão

A licença é verificada em dois pontos: ao **criar** uma eleição (policy de `INSERT` em `eleicoes`) e ao **abrir** a votação (`cipa_abrir_eleicao`).

Depois de aberta, a eleição segue até o fim — votação, quarentena, encerramento e ata — sem qualquer consulta à licença. Inadimplência bloqueia eleição nova; nunca eleição em curso.

## Opções consideradas

### Opção A: Verificar a licença em toda operação, inclusive no voto

| Dimensão | Avaliação |
|---|---|
| Rigor comercial | Alto |
| Risco jurídico | **Inaceitável** |
| Viabilidade técnica | Baixa |

**Prós:** cobrança impossível de burlar; modelo mais simples de explicar.
**Contras:** uma falha de cobrança no segundo dia interrompe a votação com quórum parcial, sem forma de reconstituir o processo. Tecnicamente também não fecha: o eleitor é anônimo, então a verificação teria que recair sobre a eleição, e uma eleição bloqueada no meio deixa a empresa sem CIPA constituída no prazo legal — expondo o cliente a autuação por um problema comercial nosso.

### Opção B: Verificar na criação e na abertura *(escolhida)*

| Dimensão | Avaliação |
|---|---|
| Rigor comercial | Suficiente |
| Risco jurídico | Baixo |
| Viabilidade técnica | Alta |

**Prós:** a trava está onde o cliente decide começar a usar o módulo; nenhum processo é interrompido; as telas anônimas não precisam saber o que é licença; o inadimplente para de criar eleições novas imediatamente.
**Contras:** uma eleição aberta no último dia de vigência pode rodar por mais uma semana sem cobertura contratual. Exposição máxima limitada à duração de uma eleição.

### Opção C: Verificar só na criação

| Dimensão | Avaliação |
|---|---|
| Rigor comercial | Fraco |
| Risco jurídico | Baixo |
| Viabilidade técnica | Alta |

**Prós:** implementação mais simples ainda.
**Contras:** permite criar dezenas de eleições em rascunho durante um teste gratuito e abri-las depois, indefinidamente, sem licença.

### Opção D: Período de carência com bloqueio progressivo

| Dimensão | Avaliação |
|---|---|
| Rigor comercial | Alto |
| Risco jurídico | Médio |
| Viabilidade técnica | Média |

**Prós:** cobrança mais firme, com avisos antes do corte.
**Contras:** máquina de estados de cobrança dentro do banco, com data de corte, avisos e reativação. Complexidade desproporcional para o estágio do produto, e ainda assim precisa da exceção da Opção B para não interromper eleição em curso.

## Análise de trade-offs

O trade-off é **exposição comercial contra risco jurídico do cliente**. A Opção B aceita perder, no pior caso, uma eleição rodando fora da vigência — um prejuízo pequeno e limitado. A Opção A elimina essa perda e cria em troca a possibilidade de deixar um cliente sem CIPA constituída no prazo, por motivo administrativo. Numa ferramenta de conformidade, isso destrói mais valor do que qualquer assinatura recupera.

A Opção C foi descartada por permitir estocar rascunhos durante o teste. A Opção D é para quando houver volume que justifique política de cobrança; hoje não há.

Implementação: a licença resolve por `modulo_ativo(empresa_id, 'CIPA')`, que aceita licença da empresa ou da consultoria vinculada — atendendo aos dois modelos de cobrança com uma tabela só, `licencas_modulo`, com `CHECK (num_nonnulls(consultoria_id, empresa_id) = 1)`.

Isso foi verificado em teste: com a urna aberta, a licença foi desativada e o voto por QR Code continuou sendo aceito, seguindo até a aprovação da quarentena e o encerramento com ata.

## Consequências

**Fica mais fácil**

- Vender outros módulos: `modulos` e `licencas_modulo` já servem a PGR, PCMSO e o que vier
- Montar o menu: `modulos_da_empresa()` devolve o que exibir
- Explicar ao cliente: "sua eleição não para por causa de boleto"

**Fica mais difícil**

- Cobrar de quem abre eleição longa perto do vencimento
- Auditar receita: o uso pode exceder a vigência, então relatório de faturamento precisa considerar eleições abertas dentro da vigência, não votos computados

**Vai precisar revisitar**

- **Limite de eleições por ano.** O campo `limite_eleicoes_ano` existe em `licencas_modulo` mas ainda não é verificado em lugar nenhum.
- **Aviso de vencimento.** Não há alerta quando a licença está por vencer com eleição aberta ou prestes a abrir. É o momento em que o cliente precisa ser avisado.
- **Bloqueio de leitura.** Hoje, licença vencida não esconde eleições passadas nem as atas. É deliberado — documento de conformidade não deveria sumir por inadimplência — mas é decisão de produto que merece confirmação.

## Itens de ação

1. [ ] Confirmar que atas e eleições encerradas permanecem legíveis após vencimento
2. [ ] Implementar verificação de `limite_eleicoes_ano` em `cipa_abrir_eleicao`
3. [ ] Criar aviso no painel quando a licença vencer em menos de 30 dias
4. [ ] Definir a origem do vínculo `empresas.consultoria_id` — cadastro manual ou tela de gestão
5. [ ] Definir quem escreve em `licencas_modulo`: hoje só `service_role`, sem interface
