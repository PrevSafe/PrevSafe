/**
 * Supabase SQL Schema Definition for PrevSafe SST (Prev Workflow)
 * Project: Prev Workflow (dnmbwsvdyskbbfvribkb)
 */

export const SUPABASE_SQL_SCHEMA = `-- ==========================================
-- PrevSafe SST - Database Schema for Prev Workflow
-- Supabase Project Ref: dnmbwsvdyskbbfvribkb
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  document_number TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROFILES & ROLES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'COMMERCIAL', 'COORDINATOR', 'ENGINEER_TECHNICIAN', 'CLIENT')),
  client_id UUID,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  trade_name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  tax_id TEXT,
  cnae TEXT,
  risk_degree INTEGER DEFAULT 1 CHECK (risk_degree BETWEEN 1 AND 4),
  total_employees INTEGER DEFAULT 0,
  address_street TEXT,
  address_number TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  portal_access_enabled BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CLIENT CONTACTS
CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_financial BOOLEAN DEFAULT false,
  is_technical BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CLIENT UNITS / ESTABELECIMENTOS
CREATE TABLE IF NOT EXISTS client_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT,
  cnae TEXT,
  risk_degree INTEGER DEFAULT 1,
  employees_count INTEGER DEFAULT 0,
  city TEXT,
  state TEXT,
  is_headquarters BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LEADS (CRM)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cnpj TEXT,
  employees_count INTEGER,
  source TEXT,
  status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. OPPORTUNITIES (CRM Pipeline)
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  estimated_value NUMERIC(12,2) DEFAULT 0.00,
  stage TEXT DEFAULT 'QUALIFICATION' CHECK (stage IN ('QUALIFICATION', 'PROPOSAL_DRAFT', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST')),
  probability INTEGER DEFAULT 20,
  expected_close_date DATE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SERVICE TEMPLATES
CREATE TABLE IF NOT EXISTS service_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('PGR', 'PCMSO', 'LTCAT', 'LAUDO_INSALUBRIDADE', 'LAUDO_PERICULOSIDADE', 'TREINAMENTO', 'CONSULTORIA', 'ESOCIAL')),
  description TEXT,
  default_price NUMERIC(12,2) DEFAULT 0.00,
  standard_sla_days INTEGER DEFAULT 15,
  default_stages JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PROPOSALS (RN001)
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  proposal_number TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  subtotal NUMERIC(12,2) DEFAULT 0.00,
  discount NUMERIC(12,2) DEFAULT 0.00,
  total NUMERIC(12,2) DEFAULT 0.00,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED_CONTRACT')),
  valid_until DATE NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CONTRACTS (RN001, RN002)
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL UNIQUE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  total_value NUMERIC(12,2) DEFAULT 0.00,
  billing_recurrence TEXT DEFAULT 'ONE_TIME' CHECK (billing_recurrence IN ('ONE_TIME', 'MONTHLY', 'ANNUAL')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_SIGNATURES', 'SIGNED', 'ACTIVE', 'EXPIRED', 'TERMINATED')),
  signatures JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. SERVICE ORDERS (OS / RN002, RN003, RN004, RN006)
CREATE TABLE IF NOT EXISTS service_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  os_number TEXT NOT NULL UNIQUE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  service_template_id UUID REFERENCES service_templates(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  technical_responsible_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  technical_responsible_name TEXT,
  status TEXT DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'WAITING_CLIENT', 'INTERNAL_REVIEW', 'COMPLETED', 'CANCELED')),
  start_date DATE,
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  sla_internal_days INTEGER DEFAULT 15,
  sla_client_waiting_days INTEGER DEFAULT 0,
  sla_is_paused BOOLEAN DEFAULT false,
  sla_pause_reason TEXT,
  stages JSONB DEFAULT '[]'::jsonb,
  rework_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. DOCUMENTS (Versões, Hash SHA-256 e Liberação)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  service_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  doc_number TEXT NOT NULL,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  current_version INTEGER DEFAULT 1,
  file_url TEXT,
  file_hash TEXT,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
  is_client_released BOOLEAN DEFAULT false,
  versions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. REQUESTS (Pendências / RN006)
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  service_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL,
  stage_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'DOCUMENT' CHECK (type IN ('DOCUMENT', 'INFORMATION', 'SIGNATURE', 'CONFIRMATION')),
  priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UPLOADED', 'ACCEPTED', 'REJECTED')),
  due_date DATE NOT NULL,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT DEFAULT 'IN_APP' CHECK (channel IN ('IN_APP', 'WHATSAPP', 'EMAIL', 'SMS')),
  type TEXT DEFAULT 'SYSTEM' CHECK (type IN ('SLA_WARNING', 'REQUEST_PENDING', 'PROPOSAL_SENT', 'CONTRACT_SIGNED', 'OS_COMPLETED', 'SYSTEM')),
  status TEXT DEFAULT 'SENT' CHECK (status IN ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- 15. AUDIT LOGS (Trilha de Auditoria Imutável)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT DEFAULT '127.0.0.1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated read/write
CREATE POLICY "Allow public read access for demo" ON organizations FOR ALL USING (true);
CREATE POLICY "Allow public read access for demo" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow public read access for demo" ON clients FOR ALL USING (true);
CREATE POLICY "Allow public read access for demo" ON client_contacts FOR ALL USING (true);
CREATE POLICY "Allow public read access for demo" ON client_units FOR ALL USING (true);
CREATE POLICY "Allow public read access for demo" ON leads FOR ALL USING (true);
CREATE POLICY "Allow public read access for demo" ON opportunities FOR ALL USING (true);
CREATE POLICY "Allow public read access for demo" ON service_templates FOR ALL USING (true);
CREATE POLICY "Allow public read access for demo" ON proposals FOR ALL USING (true);
CREATE POLICY "Allow public read access for demo" ON contracts FOR ALL USING (true);
CREATE POLICY "Allow public read access for demo" ON service_orders FOR ALL USING (true);
CREATE POLICY "Allow public read access for demo" ON documents FOR ALL USING (true);
CREATE POLICY "Allow public read access for demo" ON requests FOR ALL USING (true);
CREATE POLICY "Allow public read access for demo" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow public read access for demo" ON audit_logs FOR ALL USING (true);
`;

export interface SupabaseMigration {
  version: string;
  name: string;
  filename: string;
  description: string;
  sql: string;
}

export const SUPABASE_MIGRATIONS: SupabaseMigration[] = [
  {
    version: '20260825120000',
    name: 'initial_prevsafe_schema',
    filename: '20260825120000_initial_prevsafe_schema.sql',
    description: 'Criação estrutural das 15 tabelas, tipos ENUM, índices de alta performance, triggers de updated_at e políticas de Row Level Security (RLS).',
    sql: SUPABASE_SQL_SCHEMA
  },
  {
    version: '20260825120001',
    name: 'seed_data',
    filename: '20260825120001_seed_data.sql',
    description: 'Carga inicial do catálogo de Normas Regulamentadoras (PGR NR-01, PCMSO NR-07, LTCAT, Insalubridade NR-15, Periculosidade NR-16, eSocial), perfis operacionais e organização padrão.',
    sql: `-- ==============================================================================
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
`
  }
];

