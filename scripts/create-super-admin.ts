import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSuperAdmin() {
  const email = 'ismaelmvula@gmail.com';
  const password = 'NdapuniKwa@1953';
  const fullName = 'Ismael Mvula';

  console.log('Creating super admin user...');

  // Step 1: Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName
    }
  });

  if (authError) {
    console.error('Error creating auth user:', authError.message);
    process.exit(1);
  }

  console.log('Auth user created:', authData.user.id);

  // Step 2: Create user profile in users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: email,
      full_name: fullName,
      role: 'super_admin',
      center_id: null, // Super admins have no center association
      is_active: true
    })
    .select()
    .single();

  if (userError) {
    console.error('Error creating user profile:', userError.message);
    // Cleanup: delete the auth user if profile creation failed
    await supabase.auth.admin.deleteUser(authData.user.id);
    process.exit(1);
  }

  console.log('✅ Super admin created successfully!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Email:', email);
  console.log('  Password:', password);
  console.log('');
  console.log('User ID:', userData.id);
}

createSuperAdmin();
