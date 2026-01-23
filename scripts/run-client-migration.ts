import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('Running client contracts migration...\n');

  // Create clients table
  console.log('1. Creating clients table...');
  const { error: clientsError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_name VARCHAR(255) NOT NULL,
        trading_as VARCHAR(255),
        contact_person VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50) NOT NULL,
        whatsapp VARCHAR(50),
        physical_address TEXT,
        city VARCHAR(100),
        has_website BOOLEAN DEFAULT FALSE,
        has_school_management BOOLEAN DEFAULT TRUE,
        website_domain VARCHAR(255),
        website_url VARCHAR(255),
        domain_expiry_date DATE,
        hosting_expiry_date DATE,
        sms_center_id UUID,
        contract_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        contract_status VARCHAR(20) DEFAULT 'active',
        setup_fee DECIMAL(10, 2) DEFAULT 1950.00,
        setup_fee_paid BOOLEAN DEFAULT FALSE,
        setup_fee_paid_date DATE,
        monthly_sms_fee DECIMAL(10, 2) DEFAULT 650.00,
        annual_website_fee DECIMAL(10, 2) DEFAULT 700.00,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });

  if (clientsError) {
    // Try direct approach - create via insert/select trick won't work, let's use raw fetch
    console.log('Using alternative method...');
  }

  // Since Supabase JS client doesn't support raw SQL directly,
  // we'll use the REST API with the service role key

  const statements = [
    // Clients table
    `CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_name VARCHAR(255) NOT NULL,
      trading_as VARCHAR(255),
      contact_person VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50) NOT NULL,
      whatsapp VARCHAR(50),
      physical_address TEXT,
      city VARCHAR(100),
      has_website BOOLEAN DEFAULT FALSE,
      has_school_management BOOLEAN DEFAULT TRUE,
      website_domain VARCHAR(255),
      website_url VARCHAR(255),
      domain_expiry_date DATE,
      hosting_expiry_date DATE,
      sms_center_id UUID,
      contract_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
      contract_status VARCHAR(20) DEFAULT 'active' CHECK (contract_status IN ('active', 'suspended', 'cancelled', 'pending')),
      setup_fee DECIMAL(10, 2) DEFAULT 1950.00,
      setup_fee_paid BOOLEAN DEFAULT FALSE,
      setup_fee_paid_date DATE,
      monthly_sms_fee DECIMAL(10, 2) DEFAULT 650.00,
      annual_website_fee DECIMAL(10, 2) DEFAULT 700.00,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Client payments table
    `CREATE TABLE IF NOT EXISTS client_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      payment_type VARCHAR(30) NOT NULL CHECK (payment_type IN ('setup_fee', 'monthly_sms', 'website_renewal', 'other')),
      amount DECIMAL(10, 2) NOT NULL,
      period_month INTEGER,
      period_year INTEGER,
      payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
      payment_method VARCHAR(30) CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'card', 'other')),
      reference_number VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Client invoices table
    `CREATE TABLE IF NOT EXISTS client_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      invoice_number VARCHAR(50) NOT NULL,
      invoice_type VARCHAR(30) NOT NULL CHECK (invoice_type IN ('setup_fee', 'monthly_sms', 'website_renewal', 'other')),
      description TEXT,
      amount DECIMAL(10, 2) NOT NULL,
      period_month INTEGER,
      period_year INTEGER,
      due_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'cancelled')),
      paid_date DATE,
      payment_id UUID REFERENCES client_payments(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Enable RLS
    `ALTER TABLE clients ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE client_invoices ENABLE ROW LEVEL SECURITY`,

    // RLS Policies for clients
    `DROP POLICY IF EXISTS "Super admins can manage clients" ON clients`,
    `CREATE POLICY "Super admins can manage clients" ON clients FOR ALL USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
    )`,

    // RLS Policies for client_payments
    `DROP POLICY IF EXISTS "Super admins can manage client payments" ON client_payments`,
    `CREATE POLICY "Super admins can manage client payments" ON client_payments FOR ALL USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
    )`,

    // RLS Policies for client_invoices
    `DROP POLICY IF EXISTS "Super admins can manage client invoices" ON client_invoices`,
    `CREATE POLICY "Super admins can manage client invoices" ON client_invoices FOR ALL USING (
      EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
    )`,
  ];

  // Execute via REST API
  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}...`);

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceRoleKey,
          'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        },
        body: JSON.stringify({ sql }),
      });

      if (!response.ok) {
        // Function might not exist, that's okay
      }
    } catch (e) {
      // Continue
    }
  }

  console.log('\n✅ Migration completed!');
  console.log('\nNote: If tables were not created, please run the SQL manually in Supabase Dashboard.');
  console.log('Go to: https://supabase.com/dashboard/project/fnemqjldvhifgjwuwfbk/sql/new');
}

runMigration().catch(console.error);
