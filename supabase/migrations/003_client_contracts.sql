-- Client Contract Management for Super Admin
-- Tracks clients, contracts, and payments for Digital Wave Technologies

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Business Information
    business_name VARCHAR(255) NOT NULL,
    trading_as VARCHAR(255),

    -- Contact Person
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),

    -- Address
    physical_address TEXT,
    city VARCHAR(100),

    -- Services Selected
    has_website BOOLEAN DEFAULT FALSE,
    has_school_management BOOLEAN DEFAULT TRUE,

    -- Website Details (if applicable)
    website_domain VARCHAR(255),
    website_url VARCHAR(255),
    domain_expiry_date DATE,
    hosting_expiry_date DATE,

    -- School Management System Details
    sms_center_id UUID REFERENCES tutorial_centers(id) ON DELETE SET NULL,

    -- Contract Details
    contract_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    contract_status VARCHAR(20) DEFAULT 'active' CHECK (contract_status IN ('active', 'suspended', 'cancelled', 'pending')),

    -- Fees
    setup_fee DECIMAL(10, 2) DEFAULT 1950.00,
    setup_fee_paid BOOLEAN DEFAULT FALSE,
    setup_fee_paid_date DATE,

    monthly_sms_fee DECIMAL(10, 2) DEFAULT 650.00,
    annual_website_fee DECIMAL(10, 2) DEFAULT 700.00,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLIENT PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS client_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

    -- Payment Details
    payment_type VARCHAR(30) NOT NULL CHECK (payment_type IN ('setup_fee', 'monthly_sms', 'website_renewal', 'other')),
    amount DECIMAL(10, 2) NOT NULL,

    -- Period (for monthly payments)
    period_month INTEGER, -- 1-12
    period_year INTEGER,

    -- Payment Info
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(30) CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'card', 'other')),
    reference_number VARCHAR(100),

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLIENT INVOICES TABLE (for tracking what's owed)
-- ============================================
CREATE TABLE IF NOT EXISTS client_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

    -- Invoice Details
    invoice_number VARCHAR(50) NOT NULL,
    invoice_type VARCHAR(30) NOT NULL CHECK (invoice_type IN ('setup_fee', 'monthly_sms', 'website_renewal', 'other')),
    description TEXT,

    -- Amount
    amount DECIMAL(10, 2) NOT NULL,

    -- Period
    period_month INTEGER,
    period_year INTEGER,

    -- Due Date
    due_date DATE NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'cancelled')),
    paid_date DATE,
    payment_id UUID REFERENCES client_payments(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(contract_status);
CREATE INDEX IF NOT EXISTS idx_clients_has_website ON clients(has_website);
CREATE INDEX IF NOT EXISTS idx_clients_has_sms ON clients(has_school_management);
CREATE INDEX IF NOT EXISTS idx_client_payments_client ON client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_date ON client_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_client_invoices_client ON client_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_status ON client_invoices(status);
CREATE INDEX IF NOT EXISTS idx_client_invoices_due_date ON client_invoices(due_date);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_client_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_client_updated_at();

CREATE TRIGGER client_invoices_updated_at
    BEFORE UPDATE ON client_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_client_updated_at();

-- ============================================
-- RLS POLICIES (Super Admin only)
-- ============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invoices ENABLE ROW LEVEL SECURITY;

-- Only super admins can access client management
CREATE POLICY "Super admins can manage clients"
    ON clients FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can manage client payments"
    ON client_payments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can manage client invoices"
    ON client_invoices FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );
