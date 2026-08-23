# CONTEXTO E INSTRUÇÃO DE EXECUÇÃO MULTI-AGENTE (CLAUDE CODE)
**Projeto**: Integração PGR, LTCAT, PCMSO e Motor de Auditoria SST para eSocial Versão S-1.3 (NT 06/2026)
**Arquivos de Referência Disponíveis no Workspace**:
- Interface Macroscópica: `sst_control_cockpit.jpg`
- Interface de Mapeamento e Caracterização: `sst_risks_characterization_screen.jpg`
- Dicionário de Dados e Regras Lógicas: `matriz_compatibilidade_esocial.xlsx`

---

## 1. OBJETIVO GERAL DO SISTEMA
Implementar o módulo reativo **SST Unified Cockpit** no sistema de gestão ocupacional existente. O objetivo principal é garantir a **consistência e integridade referencial absoluta** de dados de SST antes de enviar os eventos **S-2210 (CAT)**, **S-2220 (Monitoramento de Saúde - PCMSO)** e **S-2240 (Condições Ambientais - PGR/LTCAT)** para o eSocial na versão simplificada **S-1.3 (NT 06/2026)**.

O sistema deve operar em tela única (Single Page Application - SPA), permitindo:
1. Definir o modelo de caracterização (GHE/GES, Cargo, Setor, Atividade).
2. Construir graficamente a árvore de hierarquia organizacional (Unidade -> Setor -> Cargo).
3. Associar riscos (Tabela 24) com cálculo de matriz de risco ativa (GRO) e enquadramento previdenciário (LTCAT).
4. Vincular exames (Tabela 27) parametrizados conforme o PCMSO.
5. Rodar o motor de **Auditoria Preventiva (SST Linter)** em tempo real no rodapé, gerando impedimentos (*hard blocks*) e avisos (*warnings*) com mensagens instrutivas e educativas para blindar a empresa contra as novas multas da **Portaria MTE nº 1.131/2025** e as responsabilidades da **Portaria Interministerial MPS/MF nº 13/2026**.

---

## 2. DIVISÃO DE PAPÉIS & FLUXO DE EXECUÇÃO MULTI-AGENTE

Este prompt foi desenhado para ser executado por quatro agentes especialistas coordenados no Claude Code. Cada agente deve trabalhar na sua camada respeitando as especificações de dados contidas na planilha `matriz_compatibilidade_esocial.xlsx`.

---

### 👤 AGENTE 1: ENGENHEIRO DE BANCO DE DADOS (DB AGENT)
**Sua Missão**: Atualizar o esquema do banco de dados relacional para comportar as estruturas de hierarquia física, mapeamento de GHE/GES, parametrização de riscos (Tabela 24) e exames (Tabela 27).

#### Tarefas Específicas:
1. **Esquema de Hierarquia Ocupacional**:
   - Criar tabelas para:
     - `unidades_operacionais` (id, nome, cnpj/caepf, status)
     - `setores_departamentos` (id, unidade_id, nome)
     - `cargos_funcoes` (id, setor_id, nome_cargo, cbo, codigo_rh)
2. **Esquema de Grupos de Exposição (GHE / GES)**:
   - Criar tabela `ghe_grupos` (id, nome, descricao_atividades_gerais) para suportar o agrupamento de trabalhadores.
   - Criar tabela de junção `trabalhadores_ghe` (trabalhador_id, ghe_id, data_inicio_vinculo, data_fim_vinculo) para rastrear o histórico ocupacional do PPP eletrônico.
3. **Esquema de Riscos e Exames (T24 <-> T27)**:
   - Criar tabelas com restrições rígidas:
     - `fatores_risco_t24` (id, codigo_esocial, descricao, tipo_risco, limite_tolerancia, exige_quantificacao, enseja_aposentadoria_especial)
     - `procedimentos_t27` (id, codigo_esocial, nome_exame, periodicidade_padrao)
     - `riscos_exames_compatibilidade` (risco_id, exame_id, obrigatoriedade)
4. **Seed de Dados**:
   - Escrever um script de migração para povoar as tabelas `fatores_risco_t24`, `procedimentos_t27` e `riscos_exames_compatibilidade` usando estritamente os dados de compatibilidade da aba **"Linter Rules DB"** e **"Matriz de Compatibilidade"** do arquivo `/workspace/artifacts/matriz_compatibilidade_esocial.xlsx`. *(Dica: use uma biblioteca python como openpyxl para ler e processar os dados da planilha diretamente no workspace do Claude Code).*

---

### 👤 AGENTE 2: DESENVOLVEDOR BACK-END (BACKEND AGENT)
**Sua Missão**: Implementar a API de validação do Linter de SST, os endpoints de persistência de riscos/exames e os geradores de XML/JSON compatíveis com os esquemas XSD do eSocial Versão S-1.3 (NT 06/2026).

#### Tarefas Específicas:
1. **Endpoints de Persistência**:
   - Criar REST APIs para salvar e recuperar a hierarquia organizacional, os riscos do GHE e a agenda de exames do trabalhador.
2. **Motor do Linter de SST (Validador Reativo)**:
   - Desenvolver a classe `SSTLinter` que recebe o ID de um trabalhador ou de um GHE e valida as seguintes regras:
     - **Regra LNT-S2240-001 (Risco sem Exame)**: Cruza os riscos ativos na tabela `S-2240` do trabalhador com o histórico do `S-2220` (ASO). Retorna erro se o exame correspondente (Tabela 27) não estiver presente e válido dentro da periodicidade regulamentar.
     - **Regra LNT-S2240-002 (Mudança de Cargo sem S-2240)**: Verifica se há alteração salarial/função (S-2206) enviada pelo RH e se existe um S-2240 correspondente cadastrado com a exata data de início da nova condição.
     - **Regra LNT-S2240-003 (Inconsistência de Ausência de Risco)**: Se `codAgNoc` for `09.01.001` (Ausência de risco), valida se os blocos de EPI/EPC estão completamente vazios. Caso contrário, gera erro de esquema.
     - **Regra LNT-S1200-001 (Aposentadoria Especial sem Adicional SAT/FENTEC na Folha)**: Se o LTCAT sinalizar risco que dá direito a aposentadoria especial, cruza com a folha (S-1200) e valida se o campo `{infoAgNocivo}` está com o código apropriado (2, 3 ou 4). Emite aviso de risco fiscal de 75% a 150% de multa se o DP estiver enviando o código 1.
     - **Regra LNT-S2210-001 (Afastamento Médico por Acidente sem CAT)**: Se houver afastamento (S-2230) com CIDs ocupacionais ou acidentários, valida se uma CAT (S-2210) foi transmitida em até 1 dia útil. Emite aviso de multa de até R$ 98.484,45.
3. **Retorno de Erro Estruturado (JSON)**:
   - O payload de retorno da API de validação do Linter deve seguir rigorosamente a especificação JSON desenvolvida na nossa fase de planejamento:
     ```json
     {
       "audit_run_id": "string",
       "company_cnpj": "string",
       "timestamp": "ISO8601",
       "status": "FAILED_AUDIT | PASSED_AUDIT",
       "alerts": [
         {
           "id": "ERR_CODE",
           "severity": "CRITICAL_BLOCK | WARNING_ADVISORY",
           "affected_worker": { "cpf": "string", "name": "string" },
           "source_event": "S-2240 | S-2220 | S-2230",
           "conflicting_event": "S-2220 | S-1200 | S-2210",
           "message": "Mensagem formatada com ux writing instrutiva",
           "action_required": "Passo a passo resolutivo em formato markdown"
         }
       ]
     }
     ```

---

### 👤 AGENTE 3: DESENVOLVEDOR FRONT-END (FRONTEND AGENT)
**Sua Missão**: Implementar a SPA reativa com base nos mockups visuais (`sst_control_cockpit.jpg` e `sst_risks_characterization_screen.jpg`) e renderizar de forma fluida os cards e as mensagens instrutivas de validação.

#### Tarefas Específicas:
1. **Layout Geral (SST Unified Cockpit - Single Page)**:
   - Criar uma estrutura de grid ou colunas flexíveis:
     - **Coluna 1**: Sincronização e Fila de Pessoal (dados integrados do RH).
     - **Coluna 2**: Gestão do PGR/LTCAT (Seletor de tipo de caracterização, árvore hierárquica organizacional e matriz de riscos interativa para o GHE selecionado).
     - **Coluna 3**: Gestão do PCMSO/ASO (Visualização da agenda de exames do trabalhador ativo, formulário reativo de emissão de ASOs).
     - **Coluna 4**: Gateway de Mensageria eSocial (Cards com status de transmissão dos XMLs e assinatura digital em massa).
2. **Componente de Caracterização e Hierarquia (Mapeamento de SST)**:
   - Implementar o componente reativo de seletor: "GHE/GES", "Cargo", "Setor", "Atividade" (conforme `sst_risks_characterization_screen.jpg`).
   - Criar a árvore de hierarquia visual interativa onde o usuário cria dinamicamente Unidades, Setores e Cargos.
   - Criar a matriz visual de riscos (GRO). O usuário seleciona severidade e probabilidade através de sliders ou seletores e o componente renderiza o badge colorido do nível de risco (Baixo, Médio, Alto, Muito Alto) calculado na hora.
3. **Componente do SST Linter (O Rodapé de Auditoria)**:
   - Implementar o painel expansível de rodapé que escuta as atualizações da API de validação do Linter.
   - Renderizar de forma amigável e proeminente os erros críticos (em vermelho com ícone de bloqueio) e avisos de risco fiscal (em amarelo com ícone de alerta).
   - ** UX Writing Exigida**: As mensagens de erro e aviso devem exibir em tempo real os textos e guias de resolução fornecidos na especificação de copy UX (Camadas de Diagnóstico, Impacto Regulatório/Multas e Guia Resolutivo).
   - Adicionar botões de ação rápida nos cards de erro (ex: clicar no erro de S-2220 abre automaticamente a aba de exames do trabalhador na Coluna 3).

---

### 👤 AGENTE 4: ENGENHEIRO de QA & TESTES (QA AGENT)
**Sua Missão**: Garantir a cobertura completa de testes automatizados para as regras do Linter e validar a integridade dos dados enviados contra cenários reais de fiscalização do eSocial.

#### Tarefas Específicas:
1. **Testes de Unidade do Linter**:
   - Escrever testes para cobrir cada uma das regras lógicas do Linter (Regras 1 a 5).
   - Simular payloads com dados inconsistentes e asseverar (*assert*) que os códigos de erro, mensagens e passos de resolução correspondentes são lançados corretamente.
2. **Testes de Integração de Fluxo**:
   - Testar o fluxo de ponta a ponta: Admissão de funcionário -> Vincular ao GHE com Ruído -> Verificar bloqueio no S-2240 até inclusão da Audiometria no PCMSO -> Registrar exame e emitir ASO -> Asseverar que o bloqueio se transforma em liberação de envio de lote.
3. **Testes de Validação de XML/Schema**:
   - Garantir que o validador interno valide os arquivos XML gerados pelo back-end contra os arquivos XSD oficiais da versão S-1.3 NT 06/2026 do eSocial para impedir erros de envio formais.

---

## 3. PROTOCOLO DE INTEGRAÇÃO & PASSOS DE DESENVOLVIMENTO

Os agentes do Claude Code devem cooperar seguindo este cronograma de entrega estruturado para evitar conflitos de código:

- **Fase 1: Preparação de Dados (DB Agent)** -> Lê a planilha `/workspace/artifacts/matriz_compatibilidade_esocial.xlsx`, cria o esquema de migração SQL/NoSQL e roda o seed de compatibilidade T24 <-> T27.
- **Fase 2: Regras e APIs (Backend Agent)** -> Implementa o algoritmo de validação e constrói a classe `SSTLinter` baseada no dicionário inserido na Fase 1.
- **Fase 3: Layout e Fluxo Reativo (Frontend Agent)** -> Desenha a estrutura SPA de 4 colunas, o construtor de hierarquias, seletor de tipo de caracterização e o rodapé dinâmico de erros.
- **Fase 4: Consumo e Interação (Frontend + Backend)** -> Conecta o front-end ao back-end reativo de modo que qualquer alteração de cargo, risco ou exame dispare uma chamada em background para a API do Linter e atualize o rodapé sem recarregar a tela.
- **Fase 5: Cobertura de Testes (QA Agent)** -> Roda a bateria de testes, simula quebras de cronologia e pendências previdenciárias de adicionais SAT e valida a conformidade técnica em 100%.

---

## 4. CRITÉRIOS DE ACEITAÇÃO DA ENTREGA (DOD)
Para que a funcionalidade seja marcada como concluída e livre de falhas:
1. **Zero Bloqueios de Envio no Portal**: Nenhuma alteração irregular (como ausência de riscos com EPI preenchido) pode passar pelo Linter sem gerar bloqueio prévio.
2. **Coerência de Dados**: O sistema deve impedir fisicamente a assinatura do evento S-2240 se o S-2220 correspondente não contiver os exames indicados na planilha de compatibilidade.
3. **PPP Rastreável**: Cada alteração contratual cadastrada deve gerar automaticamente as alterações de início e fim de vigência da exposição a riscos no banco de dados para a composição fiel do Perfil Profissiográfico Previdenciário (PPP) eletrônico.
4. **Mensagens Completas**: As mensagens do rodapé de auditoria devem exibir integralmente as três camadas da escrita de copy de SST: Diagnóstico Técnico, Impacto Financeiro/Regulatório com os valores das multas de 2026 e o Passo a Passo detalhado da ação para corrigir a inconsistência.
