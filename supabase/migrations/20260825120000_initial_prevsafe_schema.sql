-- ==============================================================================
-- Migration: 20260825120000_initial_prevsafe_schema.sql
-- Description: Create initial schema for PrevSafe SST (Prev Workflow)
-- Supabase Project Reference: dnmbwsvdyskbbfvribkb
-- ==============================================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to handle updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  document_number TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PROFILES & ROLES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'COMMERCIAL', 'COORDINATOR', 'ENGINEER_TECHNICIAN', 'CLIENT')),
  client_id UUID,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CLIENT CONTACTS
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_financial BOOLEAN DEFAULT false,
  is_technical BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CLIENT UNITS / ESTABELECIMENTOS
CREATE TABLE IF NOT EXISTS public.client_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj TEXT,
  cnae TEXT,
  risk_degree INTEGER DEFAULT 1,
  employees_count INTEGER DEFAULT 0,
  city TEXT,
  state TEXT,
  is_headquarters BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. LEADS (CRM)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cnpj TEXT,
  employees_count INTEGER,
  source TEXT,
  status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. OPPORTUNITIES (CRM Pipeline)
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  estimated_value NUMERIC(12,2) DEFAULT 0.00,
  stage TEXT DEFAULT 'QUALIFICATION' CHECK (stage IN ('QUALIFICATION', 'PROPOSAL_DRAFT', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST')),
  probability INTEGER DEFAULT 20 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. SERVICE TEMPLATES
CREATE TABLE IF NOT EXISTS public.service_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('PGR', 'PCMSO', 'LTCAT', 'LAUDO_INSALUBRIDADE', 'LAUDO_PERICULOSIDADE', 'TREINAMENTO', 'CONSULTORIA', 'ESOCIAL')),
  description TEXT,
  default_price NUMERIC(12,2) DEFAULT 0.00,
  standard_sla_days INTEGER DEFAULT 15,
  default_stages JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. PROPOSALS (RN001)
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  proposal_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  subtotal NUMERIC(12,2) DEFAULT 0.00,
  discount NUMERIC(12,2) DEFAULT 0.00,
  total NUMERIC(12,2) DEFAULT 0.00,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED_CONTRACT')),
  valid_until DATE NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. CONTRACTS (RN001, RN002)
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL UNIQUE,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  total_value NUMERIC(12,2) DEFAULT 0.00,
  billing_recurrence TEXT DEFAULT 'ONE_TIME' CHECK (billing_recurrence IN ('ONE_TIME', 'MONTHLY', 'ANNUAL')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_SIGNATURES', 'SIGNED', 'ACTIVE', 'EXPIRED', 'TERMINATED')),
  signatures JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. SERVICE ORDERS (OS / RN002, RN003, RN004, RN006)
CREATE TABLE IF NOT EXISTS public.service_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  os_number TEXT NOT NULL UNIQUE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_template_id UUID REFERENCES public.service_templates(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  technical_responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. DOCUMENTS (Versões, Hash SHA-256 e Liberação)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  doc_number TEXT NOT NULL,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  current_version INTEGER DEFAULT 1,
  file_url TEXT,
  file_hash TEXT,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
  is_client_released BOOLEAN DEFAULT false,
  versions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. REQUESTS (Pendências do Cliente / RN006)
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE SET NULL,
  stage_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'DOCUMENT' CHECK (type IN ('DOCUMENT', 'INFORMATION', 'SIGNATURE', 'CONFIRMATION')),
  priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UPLOADED', 'ACCEPTED', 'REJECTED')),
  due_date DATE NOT NULL,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT DEFAULT 'IN_APP' CHECK (channel IN ('IN_APP', 'WHATSAPP', 'EMAIL', 'SMS')),
  type TEXT DEFAULT 'SYSTEM' CHECK (type IN ('SLA_WARNING', 'REQUEST_PENDING', 'PROPOSAL_SENT', 'CONTRACT_SIGNED', 'OS_COMPLETED', 'SYSTEM')),
  status TEXT DEFAULT 'SENT' CHECK (status IN ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- 15. AUDIT LOGS (Trilha de Auditoria Imutável)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT DEFAULT '127.0.0.1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_leads_org_status ON public.leads(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON public.opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_proposals_client ON public.proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON public.contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_client ON public.service_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON public.service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_due_date ON public.service_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_documents_os ON public.documents(service_order_id);
CREATE INDEX IF NOT EXISTS idx_documents_client ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_requests_client_status ON public.requests(client_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_os ON public.requests(service_order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_client ON public.notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON public.audit_logs(organization_id, created_at DESC);

-- ==============================================================================
-- TRIGGERS FOR AUTO UPDATED_AT
-- ==============================================================================
DROP TRIGGER IF EXISTS trigger_organizations_updated_at ON public.organizations;
CREATE TRIGGER trigger_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_clients_updated_at ON public.clients;
CREATE TRIGGER trigger_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON public.leads;
CREATE TRIGGER trigger_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_opportunities_updated_at ON public.opportunities;
CREATE TRIGGER trigger_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_proposals_updated_at ON public.proposals;
CREATE TRIGGER trigger_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_contracts_updated_at ON public.contracts;
CREATE TRIGGER trigger_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_service_orders_updated_at ON public.service_orders;
CREATE TRIGGER trigger_service_orders_updated_at BEFORE UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_documents_updated_at ON public.documents;
CREATE TRIGGER trigger_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_requests_updated_at ON public.requests;
CREATE TRIGGER trigger_requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Standard development & authenticated access policies
CREATE POLICY "Allow public read access" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.organizations FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.clients FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.client_contacts FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.client_contacts FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access" ON public.client_units FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.client_units FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.leads FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.opportunities FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.opportunities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.opportunities FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.service_templates FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.service_templates FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access" ON public.proposals FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.proposals FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.contracts FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.contracts FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.service_orders FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.service_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.service_orders FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.documents FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.requests FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.requests FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.notifications FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.audit_logs FOR INSERT WITH CHECK (true);
