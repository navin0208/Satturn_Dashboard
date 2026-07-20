import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yfuislnpltfjizonrpcu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmdWlzbG5wbHRmaml6b25ycGN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Njk1NDEsImV4cCI6MjA5MzA0NTU0MX0.BZ1Y_YOIfZxCO9hmvzgbLbUWdnrn5qpsly2sFZ1XKvw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Creating Admin User...');
  
  const phone = '1234567890';
  const fakeEmail = `${phone}@satturn.local`;

  const { data, error } = await supabase.auth.signUp({
    email: fakeEmail,
    password: 'password123'
  });

  if (error) {
    console.error("Failed to create user in Auth:", error.message);
    return;
  }

  console.log("User created in Auth with ID:", data.user.id);

  const { error: dbError } = await supabase.from('users').upsert({
    id: data.user.id,
    name: 'Super Admin',
    phone: '+911234567890',
    role: 'ADMIN'
  });

  if (dbError) {
    console.error("Failed to add user to public.users table:", dbError.message);
  } else {
    console.log("Successfully added Super Admin to users table!");
    console.log("---");
    console.log("YOU CAN NOW LOG IN WITH:");
    console.log("Phone: +911234567890");
    console.log("Password: password123");
  }
}

run();
