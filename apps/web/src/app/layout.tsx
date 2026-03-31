import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { Toaster } from 'sonner';
import { createClient } from '@/lib/supabase/server';
import type { ProfileData } from '@/providers/auth-provider';
import type { User } from '@supabase/supabase-js';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HRMS - Human Resource Management System',
  description: 'Enterprise-grade HRMS with attendance, leave, payroll management',
};

// Async Server Component — reads the session that the middleware already validated
// and passes it straight to AuthProvider so the client NEVER has a cold-start loading state.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let initialUser: User | null = null;
  let initialProfile: ProfileData | null = null;
  let serverResolved = false;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    initialUser = user ?? null;

    if (user) {
      // Primary lookup by user_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, organization_id, employee_code, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      initialProfile = profile ?? null;

      // Email fallback for seeded users where user_id may differ
      if (!initialProfile && user.email) {
        const { data: byEmail } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, organization_id, employee_code, avatar_url')
          .eq('email', user.email)
          .maybeSingle();
        initialProfile = byEmail ?? null;
      }
    }

    serverResolved = true;
  } catch (e) {
    console.error('[Layout] server session fetch failed — client fallback active:', e);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          {/* Pass server-resolved session so the client renders with correct state instantly */}
          <AuthProvider
            initialUser={serverResolved ? initialUser : undefined}
            initialProfile={serverResolved ? initialProfile : undefined}
          >
            {children}
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
