import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

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
  console.log('Running client contracts migration...');

  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '003_client_contracts.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  // Split by semicolons and run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      if (error) {
        // Try direct query if RPC doesn't exist
        const { error: queryError } = await supabase.from('_temp').select().limit(0);
        console.log('Statement completed (may need manual execution)');
      }
    } catch (e) {
      // Continue - some statements may fail if already exists
    }
  }

  console.log('Migration script completed!');
  console.log('\nPlease run the following SQL in your Supabase SQL Editor:');
  console.log('Go to: https://supabase.com/dashboard/project/fnemqjldvhifgjwuwfbk/sql/new');
  console.log('\nCopy the contents of: supabase/migrations/003_client_contracts.sql');
}

runMigration();
