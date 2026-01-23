import { Client } from 'pg';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

config({ path: '.env.local' });

// Extract project ref from URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

// Database password (use service role key or database password)
// For Supabase, we need the actual database password, not the service role key
// The connection string format is: postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

async function runMigration() {
  console.log('Connecting to Supabase PostgreSQL...');
  console.log(`Project: ${projectRef}\n`);

  // Read the migration SQL
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '003_client_contracts.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  // For Supabase, we need to use their SQL Editor or CLI
  // The service role key cannot be used as a database password

  console.log('='.repeat(60));
  console.log('MIGRATION SQL - Please run this in Supabase SQL Editor');
  console.log('='.repeat(60));
  console.log('\n1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  console.log('\n2. Copy and paste the following SQL:\n');
  console.log('-'.repeat(60));
  console.log(sql);
  console.log('-'.repeat(60));
  console.log('\n3. Click "Run" to execute the migration');
  console.log('\nAlternatively, you can copy from: supabase/migrations/003_client_contracts.sql');
}

runMigration().catch(console.error);
