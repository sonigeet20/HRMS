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
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, organization_id, employee_code, avatar_url')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('[AuthProvider] Profile fetch error:', error.message);
        return null;
      }

      return data;
    };

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;

        setUser(user);

        if (user) {
          const data = await fetchProfile(user.id);
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
          const data = await fetchProfile(session.user.id);
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
