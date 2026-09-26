# Mapa de preenchimento do PGR

De onde vem cada tabela do PGR e em que tela ela é cadastrada.

O PGR é gerado em **Engenharia SST & Funcionários › 6. Documentos & XMLs eSocial**,
com o cliente selecionado. Toda lacuna sai nomeada na seção **10.3 Pendências**,
e cada pendência aponta a tela onde se resolve.

O documento é emitido **por estabelecimento** (subitem 1.5.3.1.1.1 da NR-01). Com
mais de um estabelecimento cadastrado, o PGR avisa de qual é a caracterização
impressa e pede um documento para cada.

---

## Parte 1 — Roteiro por tela

A ordem abaixo é a de menor retrabalho: cada tela depende só das anteriores.

### 1. CRM & Comercial › Clientes & Unidades

| O que preencher | Alimenta |
|---|---|
| Razão social, CNPJ, endereço | Capa, 1.1 |
| CNAE preponderante | 1.1, grau de risco |
| Grau de risco (Anexo I da NR-04) | 1.1, dimensionamento do SESMT e da CIPA, 9.1, 9.8 |
| **Porte** (ME, EPP, MEI, demais) | 5.3 — decide se incide a dispensa de elaborar a AET (item 17.3.4 da NR-17) |

> O porte é o campo mais esquecido. Sem ele o PGR não afirma nem nega a dispensa
> da AET: declara a dúvida, porque a dispensa não se presume.

### 2. Configurações da Empresa › Responsabilidade Técnica

| O que preencher | Alimenta |
|---|---|
| Nome, título e registro do responsável técnico | Capa, termo de responsabilidade, 4.1, 9.1 |
| Médico responsável pelo PCMSO e CRM | 9.2, integração com o PCMSO |

Sem isto os documentos saem marcados como "não informado".

### 3. Engenharia SST › 1. Hierarquia › **Estabelecimentos**

É a tela que mais fecha pendências: **dezenove campos**, distribuídos por quatro
seções do PGR.

| Bloco no modal | Campos | Alimenta |
|---|---|---|
| Identificação | código, tipo, CNPJ/CNO/CAEPF, CNAE, grau de risco, endereço | 1.1, 6.1 |
| Pessoas e Abrangência | nº de terceirizados, jornada e turnos, responsável legal, coordenador da implementação, frentes de trabalho | 1.1, 1.2, 1.3, termo de responsabilidade, 9.1 |
| Caracterização do Estabelecimento | área construída e total, edificações, utilidades, entorno e perigos externos, recursos de emergência | 6.1, e os recursos alimentam também a 9.4 |
| Emergências | cenários, abandono dos locais afetados, grande magnitude, periodicidade dos simulados, data do último | 9.4 |
| Assédio e violência | regras de conduta, canal de denúncia, ações de capacitação, data da última | 9.8 |

A tabela de estabelecimentos mostra um contador `n/19` por linha: é quantos
desses campos já estão preenchidos.

**Duas regras de preenchimento que mudam o resultado:**

- **Frentes de trabalho:** se ninguém trabalha fora, escreva "nenhuma". Declarar
  é diferente de deixar em branco, e o auditor lê as duas coisas de forma
  diferente.
- **Grande magnitude:** a alínea "b" do subitem 1.5.6.2 vale "quando aplicável".
  Se não for o caso, escreva "não aplicável" e o motivo.

### 4. Engenharia SST › 1. Hierarquia › **Setores**

| O que preencher | Alimenta |
|---|---|
| Nome do setor | 1.3, 6.2 |
| Tipo de ambiente físico | 6.2 |
| Descrição do setor e dos processos | 6.2 |
| Características construtivas | 6.2 |

### 5. Engenharia SST › 1. Hierarquia › **Cargos & CBO**

| O que preencher | Alimenta |
|---|---|
| Nome do cargo, CBO | 6.3, 9.7 |
| Descrição pormenorizada das atividades | 6.3 |

### 6. Engenharia SST › 4. Trabalhadores & Histórico

| O que preencher | Alimenta |
|---|---|
| Trabalhadores vinculados a cargo e GHE | 1.1, 6.3, dimensionamento do SESMT e da CIPA, prioridade do plano de ação |

O número de expostos por GHE vem daqui, e é ele que ordena a prioridade no plano
de ação (subitem 1.5.5.2).

### 7. Engenharia SST › 2. GHE & Inventário de Riscos

O núcleo do documento. Sem inventário, o PGR não atende ao subitem 1.5.7.1 e não
deve ser entregue como concluído.

**No GHE:**

| O que preencher | Alimenta |
|---|---|
| Código e nome do GHE, setores e cargos | 1.3, 6.3 |
| Jornada e turno | 6.3 |
| Descrição do ambiente e das atividades reais | 6.3 |

**Em cada risco:**

| O que preencher | Alimenta | Alínea do 1.5.7.3.2 |
|---|---|---|
| Agente / fator de risco e categoria | 7.2 | "a" |
| **Situação operacional (R / NR / E)** | 7.2 | "b" |
| Fonte geradora | 7.2 | "c" |
| Possíveis lesões ou agravos | 7.2 | "d" |
| Tipo de avaliação, medição, unidade, metodologia | 7.3 | "e" e "f" |
| Limite de tolerância e nível de ação | 7.3 | "f" |
| EPC e EPI, com as condições de eficácia | 7.2, 8.2 | "g" |
| **Severidade e probabilidade** | 7.2, 5.6, 8.2 | "i" |

> Sem severidade e probabilidade o risco não é classificado, não entra na matriz
> e não gera linha no plano de ação. O sistema não escolhe um valor padrão.

### 8. Engenharia SST › 9. Contratadas (NR-01, 1.5.8)

Uma linha por contratada: serviço contratado, onde atua, regime de GRO, troca de
informações nos dois sentidos e riscos de interação. Alimenta a **9.5** e a
**1.3**.

Sem contratada nenhuma, use o botão de **declarar que não há** — lista vazia não
é declaração de inexistência.

### 9. Engenharia SST › 10. Máquinas (NR-12, NR-13, NR-11)

Uma linha por equipamento. Marcar a norma revela só os campos dela. Alimenta a
**6.5** e cobra treinamento correspondente na **9.7**.

> Antes de declarar que não há: autoclave, compressor de ar e caldeira são
> equipamentos da NR-13 mesmo em atividade administrativa ou de saúde.

### 10. Engenharia SST › 11. Produtos Químicos (NR-26)

Componentes com CAS, classificação GHS, rotulagem, FDS e treinamento. Alimenta a
**6.4** e cobra treinamento de NR-26 na **9.7**.

> A dispensa do subitem 26.4.2.4 alcança só a **rotulagem** dos saneantes
> registrados na Anvisa. Classificação e FDS continuam exigíveis.

### 11. Engenharia SST › 13. Avaliação Ergonômica (NR-17)

Uma AEP por situação de trabalho, percorrendo os seis aspectos da norma.
Alimenta a **5.3** e a **7.4**.

Aqui não cabe declaração de inexistência: o item 17.2.1 aplica a NR-17 a todas as
situações de trabalho.

### 12. Engenharia SST › 12. Matriz de Capacitação (NR-01, 1.7)

Use o botão **Sugestões das NR** — quinze treinamentos com o subitem de origem de
cada um. Alimenta a **9.7**.

> Ao cadastrar um treinamento próprio, o campo decisivo é **quem define a carga
> horária**: a NR ou o empregador. NR-06, NR-12 e NR-26 exigem o treinamento sem
> fixar carga nem periodicidade.

---

## Parte 2 — Por seção do PGR

| Seção | De onde vêm os dados |
|---|---|
| Capa, controle de revisões, termo | Cliente; Configurações › Responsabilidade Técnica; Estabelecimentos (responsável legal e coordenador) |
| 1.1 Identificação | Cliente; Estabelecimentos; Trabalhadores |
| 1.2 Responsáveis | Estabelecimentos; Configurações |
| 1.3 Abrangência | Setores; GHE; Estabelecimentos; Contratadas |
| 2 e 3 | Conteúdo fixo do modelo — nada a preencher |
| 4.1 Responsabilidades | Conteúdo fixo; o RT vem de Configurações |
| 4.2 Integração | Apontamentos automáticos das seções 5.3, 6.4, 7.4 e 9.4 |
| 5.1 a 5.7 Metodologia | Conteúdo fixo: critérios, matriz 5×5 e regras de decisão |
| 5.3 Avaliação ergonômica | Conteúdo fixo da NR-17 + **porte do cliente** (dispensa da AET) |
| 6.1 Caracterização | Estabelecimentos |
| 6.2 Processos e ambientes | Setores |
| 6.3 GES e atividades | GHE; Cargos; Trabalhadores |
| 6.4 Produtos químicos | 11. Produtos Químicos |
| 6.5 Máquinas | 10. Máquinas |
| 7.1 Estrutura do registro | Conteúdo fixo |
| 7.2 Registros do inventário | GHE & Inventário de Riscos |
| 7.3 Avaliações ambientais | GHE & Inventário de Riscos (medições) |
| 7.4 Resultados da AEP | 13. Avaliação Ergonômica |
| 8.1 Regras | Conteúdo fixo |
| 8.2 Plano de ação | Gerado do inventário: um risco classificado gera uma linha |
| 9.1 Acompanhamento | Estabelecimentos (coordenador); dimensionamento da CIPA |
| 9.2 Saúde ocupacional | Configurações (médico do PCMSO) |
| 9.3 Análise de acidentes | Conteúdo fixo |
| 9.4 Emergências | Estabelecimentos |
| 9.5 Contratadas | 9. Contratadas |
| 9.6 Participação | Conteúdo fixo |
| 9.7 Capacitação | 12. Matriz de Capacitação |
| 9.8 Assédio | Estabelecimentos + dimensionamento da CIPA |
| 9.9 e 9.10 | Conteúdo fixo: hipóteses de revisão e guarda de 20 anos |
| 10.1 a 10.3 | Gerados: anexos, checklist e a lista de pendências |

---

## Parte 3 — O que o PGR confere sozinho

Quatro checagens comparam seções entre si. Elas não pedem cadastro novo: apontam
contradição entre o que já foi cadastrado.

| Se existe | e falta | o PGR aponta em |
|---|---|---|
| Produto classificado como perigoso (6.4) | agente químico no inventário | 6.4 |
| AEP registrada (7.4) | agente ergonômico no inventário | 7.4 |
| GHE cadastrado | AEP daquele GHE | 7.4 |
| Máquina com NR-12 (6.5) | treinamento de NR-12 na matriz | 9.7 |
| Equipamento da NR-13 (6.5) | treinamento de NR-13 na matriz | 9.7 |
| Produto químico (6.4) | treinamento de NR-26 na matriz | 9.7 |
| Risco com EPI exigido (7.2) | treinamento de NR-06 na matriz | 9.7 |

---

## Parte 4 — Campos em que "vazio" não é resposta

Em quatro lugares o sistema distingue **não preenchido** de **declarado como
inexistente**, porque o auditor também distingue. Nesses, use o botão de
declaração ou escreva a negativa por extenso.

| Onde | Como declarar |
|---|---|
| Frentes de trabalho (1.3) | escrever "nenhuma" |
| Emergências de grande magnitude (9.4) | escrever "não aplicável" e o motivo |
| Contratadas (9.5) | botão *Declarar que nenhuma contratada atua* |
| Máquinas (6.5) | botão *Declarar que não há máquina com requisito* |
| Produtos químicos (6.4) | botão *Declarar que não se utiliza produto químico* |

E em três não cabe declaração de inexistência nenhuma, por determinação da
própria norma:

- **Inventário de riscos** — sem ele não há PGR (subitem 1.5.7.1).
- **Matriz de capacitação** — todo trabalhador tem treinamento inicial antes de
  iniciar as funções (subitem 1.7.1.2.1).
- **Avaliação ergonômica** — a NR-17 alcança todas as situações de trabalho
  (item 17.2.1).
