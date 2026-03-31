'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export type ProfileData = {
  id: string;
  full_name: string;
  email: string;
  role: 'ADMIN' | 'HR' | 'EMPLOYEE';
  organization_id: string;
  employee_code: string;
  avatar_url: string | null;
};

interface AuthContextType {
  user: User | null;
  profile: ProfileData | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

const supabase = createClient();

async function fetchProfile(userId: string, email?: string | null): Promise<ProfileData | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, organization_id, employee_code, avatar_url')
    .eq('user_id', userId)
    .maybeSingle();

  if (data) return data;
  if (error) console.error('[Auth] profile fetch error:', error.message);

  if (email) {
    const { data: byEmail } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, organization_id, employee_code, avatar_url')
      .eq('email', email)
      .maybeSingle();
    if (byEmail) return byEmail;
  }

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] timeout forcing loading=false');
        setLoading(false);
      }
    }, 8000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      const authUser = session?.user ?? null;
      setUser(authUser);

      if (authUser) {
        const profileData = await fetchProfile(authUser.id, authUser.email);
        if (!mounted) return;
        setProfile(profileData);
      } else {
        setProfile(null);
      }

      clearTimeout(timeout);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
