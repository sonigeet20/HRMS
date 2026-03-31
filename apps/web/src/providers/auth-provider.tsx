'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: {
    id: string;
    full_name: string;
    email: string;
    role: 'ADMIN' | 'HR' | 'EMPLOYEE';
    organization_id: string;
    employee_code: string;
    avatar_url: string | null;
  } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let mounted = true;
    const loadingTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 6000);

    const fetchProfile = async (userId: string, email?: string | null) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, organization_id, employee_code, avatar_url')
        .eq('user_id', userId)
        .single();

      if (!error && data) return data;

      if (email) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, organization_id, employee_code, avatar_url')
          .ilike('email', email)
          .single();

        if (!fallbackError && fallbackData) {
          console.warn('[AuthProvider] Profile resolved via email fallback for', email);
          return fallbackData;
        }

        if (fallbackError) {
          console.error('[AuthProvider] Profile email fallback error:', fallbackError.message);
        }
      }

      if (error) {
        console.error('[AuthProvider] Profile fetch error:', error.message);
      }

      return null;
    };

    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const sessionUser = session?.user ?? null;

        if (!mounted) return;

        setUser(sessionUser);

        if (sessionUser) {
          const data = await fetchProfile(sessionUser.id, sessionUser.email ?? null);
          if (!mounted) return;
          setProfile(data);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('[AuthProvider] getUser failed:', error);
        if (!mounted) return;
        setUser(null);
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (!mounted) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          const data = await fetchProfile(session.user.id, session.user.email ?? null);
          if (!mounted) return;
          setProfile(data);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('[AuthProvider] auth state change failed:', error);
        if (!mounted) return;
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [supabase]);

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
