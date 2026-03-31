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

interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * Passed from the async Server Component in layout.tsx.
   * undefined  = server did not resolve (network error, etc.) → client falls back to onAuthStateChange
   * null       = server confirmed the user is NOT authenticated
   * User       = server confirmed the user IS authenticated
   */
  initialUser?: User | null;
  initialProfile?: ProfileData | null;
}

export function AuthProvider({ children, initialUser, initialProfile }: AuthProviderProps) {
  // Seed state from server so the first render is already correct
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [profile, setProfile] = useState<ProfileData | null>(initialProfile ?? null);
  // loading = false  → server resolved the session (most common path)
  // loading = true   → server did not resolve; wait for onAuthStateChange
  const [loading, setLoading] = useState<boolean>(initialUser === undefined);

  useEffect(() => {
    let mounted = true;

    // Only needed when server did not resolve (rare)
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] timeout — forcing loading=false');
        setLoading(false);
      }
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // If the server already confirmed auth state, skip INITIAL_SESSION —
      // the server data is fresher (read AFTER middleware refreshed the token).
      if (event === 'INITIAL_SESSION' && initialUser !== undefined) {
        clearTimeout(timeout);
        return;
      }

      const authUser = session?.user ?? null;
      setUser(authUser);

      if (authUser) {
        // TOKEN_REFRESHED only changes the token, not the profile — skip re-fetch
        if (event !== 'TOKEN_REFRESHED') {
          const profileData = await fetchProfile(authUser.id, authUser.email);
          if (!mounted) return;
          setProfile(profileData);
        }
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
