import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function executeSql(sql: string): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Prefer': 'return=minimal'
      },
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

async function runMigration() {
  console.log('Running client contracts migration via Supabase...\n');

  const statements = [
    // 1. Create clients table
    {
      name: 'Create clients table',
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
    },
    // 2. Create client_payments table
    {
      name: 'Create client_payments table',
      sql: `
        CREATE TABLE IF NOT EXISTS client_payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          payment_type VARCHAR(30) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          period_month INTEGER,
          period_year INTEGER,
          payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
          payment_method VARCHAR(30),
          reference_number VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    // 3. Create client_invoices table
    {
      name: 'Create client_invoices table',
      sql: `
        CREATE TABLE IF NOT EXISTS client_invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          invoice_number VARCHAR(50) NOT NULL,
          invoice_type VARCHAR(30) NOT NULL,
          description TEXT,
          amount DECIMAL(10, 2) NOT NULL,
          period_month INTEGER,
          period_year INTEGER,
          due_date DATE NOT NULL,
          status VARCHAR(20) DEFAULT 'unpaid',
          paid_date DATE,
          payment_id UUID REFERENCES client_payments(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    }
  ];

  // Unfortunately, Supabase REST API doesn't support DDL statements directly
  // We need to use the SQL Editor or the Management API

  console.log('The Supabase REST API does not support CREATE TABLE statements.');
  console.log('Please run the migration manually:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/fnemqjldvhifgjwuwfbk/sql/new');
  console.log('2. Copy the SQL from: supabase/migrations/003_client_contracts.sql');
  console.log('3. Click "Run"\n');

  // Let's try opening the file for them
  console.log('SQL to run:');
  console.log('='.repeat(70));

  for (const stmt of statements) {
    console.log(`\n-- ${stmt.name}`);
    console.log(stmt.sql);
  }

  console.log(`
-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invoices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins can manage clients" ON clients FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
);

CREATE POLICY "Super admins can manage client payments" ON client_payments FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
);

CREATE POLICY "Super admins can manage client invoices" ON client_invoices FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
);
  `);
  console.log('='.repeat(70));
}

runMigration();
