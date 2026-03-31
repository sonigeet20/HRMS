import { createClient } from '@supabase/supabase-js';
const s = createClient(
  'https://zgemsjtztpwlhaltsvex.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZW1zanR6dHB3bGhhbHRzdmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NDQ5MDcsImV4cCI6MjA4NzQyMDkwN30.sgFrO1VSiQ_MC9Cn0hgNfXacB1rZCgTZIpb8BLw4leU',
  { auth: { autoRefreshToken: false, persistSession: false } }
);
for (const pwd of ['admin123456', 'password123', 'Admin123!', 'admin123']) {
  const { data, error } = await s.auth.signInWithPassword({ email: 'admin@acme.com', password: pwd });
  if (!error) { console.log('Works:', pwd, 'uid=', data.user.id); break; }
  else console.log('Fail:', pwd, '-', error.message);
}
