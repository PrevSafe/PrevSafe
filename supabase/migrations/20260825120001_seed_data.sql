-- ==============================================================================
-- Migration: 20260825120001_seed_data.sql
-- Description: Seed initial service templates, default organization, and standard NRs
-- Supabase Project Reference: dnmbwsvdyskbbfvribkb
-- ==============================================================================

-- 1. INSERT DEFAULT ORGANIZATION
INSERT INTO public.organizations (id, name, legal_name, document_number, email, phone, logo_url)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'PrevSafe Consultoria em SST',
  'PrevSafe Engenharia e Medicina Ocupacional Ltda',
  '12.345.678/0001-90',
  'contato@prevsafe.com.br',
  '(11) 3456-7890',
  'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&q=80&w=200'
)
ON CONFLICT (id) DO NOTHING;

-- 2. INSERT PROFILES
INSERT INTO public.profiles (id, organization_id, full_name, email, role, phone)
VALUES
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Carlos Mendes', 'carlos.admin@prevsafe.com.br', 'ADMIN', '(11) 98765-4321'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Juliana Rocha', 'juliana.comercial@prevsafe.com.br', 'COMMERCIAL', '(11) 98765-4322'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Eng. Roberto Alves', 'roberto.coordenador@prevsafe.com.br', 'COORDINATOR', '(11) 98765-4323'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Téc. Fernando Costa', 'fernando.tecnico@prevsafe.com.br', 'ENGINEER_TECHNICIAN', '(11) 98765-4324'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Mariana Souza (Cliente)', 'mariana.rh@industriaalpha.com.br', 'CLIENT', '(11) 98765-4325')
ON CONFLICT (id) DO NOTHING;

-- 3. INSERT STANDARD SST SERVICE TEMPLATES (CATALOG OF NRs)
INSERT INTO public.service_templates (id, organization_id, code, name, category, description, default_price, standard_sla_days, default_stages, is_active)
VALUES
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'PGR-NR01',
    'Programa de Gerenciamento de Riscos (PGR - NR-01)',
    'PGR',
    'Elaboração de Inventário Geral de Riscos Ocupacionais (GRO) e Plano de Ação estruturado conforme a NR-01.',
    2800.00,
    15,
    '[
      {"name": "Levantamento Preliminar de Perigos e Análise de Documentação", "sla_days": 3, "order": 1},
      {"name": "Visita Técnica e Reconhecimento de Riscos In Loco", "sla_days": 4, "order": 2},
      {"name": "Redação Técnica e Matriz de Probabilidade x Severidade", "sla_days": 5, "order": 3},
      {"name": "Revisão por Engenheiro de Segurança e Emissão de ART", "sla_days": 2, "order": 4},
      {"name": "Apresentação e Assinatura Digital com Cliente", "sla_days": 1, "order": 5}
    ]'::jsonb,
    true
  ),
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'PCMSO-NR07',
    'Programa de Controle Médico de Saúde Ocupacional (PCMSO - NR-07)',
    'PCMSO',
    'Planejamento de exames clínicos, complementares e exames laboratoriais admissionais, periódicos e demissionais.',
    2400.00,
    15,
    '[
      {"name": "Análise do Inventário de Riscos do PGR", "sla_days": 3, "order": 1},
      {"name": "Definição do Cronograma e Protocolos Médicos", "sla_days": 5, "order": 2},
      {"name": "Revisão e Validação pelo Médico do Trabalho Coordenador", "sla_days": 4, "order": 3},
      {"name": "Emissão e Publicação no Portal do Cliente", "sla_days": 3, "order": 4}
    ]'::jsonb,
    true
  ),
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'LTCAT-PREV',
    'Laudo Técnico das Condições Ambientais de Trabalho (LTCAT)',
    'LTCAT',
    'Comprovação de exposição a agentes nocivos para fins de Aposentadoria Especial junto ao INSS (IN 128).',
    3500.00,
    20,
    '[
      {"name": "Planejamento Amostral e Calibração de Equipamentos", "sla_days": 3, "order": 1},
      {"name": "Avaliações Quantitativas de Ruído, Calor e Químicos", "sla_days": 6, "order": 2},
      {"name": "Relatório Laboratorial e Parecer Técnico Conclusivo", "sla_days": 7, "order": 3},
      {"name": "Revisão Técnica Final e Liberação de Assinatura", "sla_days": 4, "order": 4}
    ]'::jsonb,
    true
  ),
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'INSALUB-NR15',
    'Laudo Técnico de Insalubridade (NR-15)',
    'LAUDO_INSALUBRIDADE',
    'Caracterização e classificação de atividades insalubres (adicionais de 10%, 20% ou 40%).',
    2900.00,
    15,
    '[
      {"name": "Inspeção Pericial dos Postos de Trabalho", "sla_days": 4, "order": 1},
      {"name": "Confronto com Anexos da NR-15 e Limites de Tolerância", "sla_days": 5, "order": 2},
      {"name": "Emissão do Parecer e Enquadramento Legal", "sla_days": 4, "order": 3},
      {"name": "Entrega Técnica ao Cliente", "sla_days": 2, "order": 4}
    ]'::jsonb,
    true
  ),
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c05',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'PERICUL-NR16',
    'Laudo Técnico de Periculosidade (NR-16)',
    'LAUDO_PERICULOSIDADE',
    'Avaliação de atividades e operações perigosas com explosivos, inflamáveis, energia elétrica e segurança pessoal.',
    2900.00,
    15,
    '[
      {"name": "Vistoria Técnica de Instalações e Áreas de Risco", "sla_days": 4, "order": 1},
      {"name": "Análise de Ficha de Informação de Segurança (FISPQ/FDS)", "sla_days": 4, "order": 2},
      {"name": "Conclusão Pericial com ART", "sla_days": 5, "order": 3},
      {"name": "Publicação e Notificação ao Cliente", "sla_days": 2, "order": 4}
    ]'::jsonb,
    true
  ),
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c06',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'ESOCIAL-SST',
    'Gestão e Transmissão de Eventos SST no eSocial (S-2210, S-2220, S-2240)',
    'ESOCIAL',
    'Geração de arquivos XML padronizados, validação de leiaute e mensageria direta para o portal do Governo Federal.',
    1200.00,
    5,
    '[
      {"name": "Mapeamento das Cargas Iniciais e Vínculos de Cargos", "sla_days": 1, "order": 1},
      {"name": "Validação de Tabela 24 e Fatores de Riscos Nocivos", "sla_days": 2, "order": 2},
      {"name": "Transmissão S-2240 e Emissão de Recibos Governamentais", "sla_days": 2, "order": 3}
    ]'::jsonb,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 4. INSERT SAMPLE CLIENT
INSERT INTO public.clients (id, organization_id, trade_name, legal_name, cnpj, tax_id, cnae, risk_degree, total_employees, address_street, address_number, address_neighborhood, address_city, address_state, address_zip, status)
VALUES (
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Indústria Metalúrgica Alpha S.A.',
  'Alpha Componentes e Estruturas Metálicas S.A.',
  '45.892.112/0001-44',
  '112.455.890.111',
  '25.11-0-00 - Fabricação de estruturas metálicas',
  3,
  145,
  'Av. das Indústrias',
  '1500',
  'Distrito Industrial',
  'São Paulo',
  'SP',
  '04578-000',
  'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

-- 5. INSERT CLIENT CONTACT
INSERT INTO public.client_contacts (id, client_id, name, role, email, phone, is_primary, is_financial, is_technical)
VALUES (
  'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01',
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01',
  'Mariana Souza',
  'Gerente de Recursos Humanos e SST',
  'mariana.rh@industriaalpha.com.br',
  '(11) 98765-4325',
  true,
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

-- 6. INSERT CLIENT UNIT
INSERT INTO public.client_units (id, client_id, name, cnpj, cnae, risk_degree, employees_count, city, state, is_headquarters)
VALUES (
  'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01',
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01',
  'Unidade Fabril São Paulo (Matriz)',
  '45.892.112/0001-44',
  '25.11-0-00',
  3,
  145,
  'São Paulo',
  'SP',
  true
)
ON CONFLICT (id) DO NOTHING;
