import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/utils/authCleanup';
import { cnpjToEmail } from '@/utils/derivedEmail';

interface User {
  id: string;
  cnpj: string;
  company_name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (cnpj: string, password: string) => Promise<{ error?: string }>;
  signUp: (cnpj: string, companyName: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check localStorage first for quick loading
        const savedUser = localStorage.getItem('bpo_user');
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch {
            localStorage.removeItem('bpo_user');
          }
        }

        // Verify with Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await loadUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('[Auth] Init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('cnpj, company_name, user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile) {
        const userData: User = {
          id: userId,
          cnpj: profile.cnpj,
          company_name: profile.company_name,
        };
        setUser(userData);
        localStorage.setItem('bpo_user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('[Auth] Profile load error:', error);
    }
  };

  const signIn = async (cnpj: string, password: string) => {
    try {
      console.log('[Auth] SignIn start');
      cleanupAuthState();
      
      // Try sign out to clean any existing sessions
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {}

      const email = cnpjToEmail(cnpj);

      // First try Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Fallback to legacy authentication
        console.log('[Auth] Fallback to legacy auth');
        const { data: legacyData, error: legacyError } = await supabase.rpc('authenticate_user', {
          cnpj_input: cnpj,
          password_input: password,
        });

        if (legacyError || !legacyData || legacyData.length === 0) {
          return { error: 'CNPJ ou senha incorretos' };
        }

        // Migrate legacy user to Supabase Auth
        const redirectUrl = `${window.location.origin}/`;
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { cnpj, company_name: legacyData[0].profile_company_name },
          },
        });

        if (!signUpError) {
          // Try sign in again after migration
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (!retryError && retryData.session?.user) {
            await supabase.rpc('migrate_legacy_to_auth', { cnpj_input: cnpj });
            await loadUserProfile(retryData.session.user.id);
            console.log('[Auth] SignIn success (migrated)');
            return {};
          }
        }

        return { error: 'Erro na migração da conta' };
      }

      // Successful Supabase Auth login
      if (authData.session?.user) {
        await supabase.rpc('migrate_legacy_to_auth', { cnpj_input: cnpj });
        await loadUserProfile(authData.session.user.id);
        console.log('[Auth] SignIn success');
        return {};
      }

      return { error: 'Erro no login' };
    } catch (error) {
      console.error('[Auth] SignIn error:', error);
      return { error: 'Erro interno do sistema' };
    }
  };

  const signUp = async (cnpj: string, companyName: string, password: string) => {
    try {
      console.log('[Auth] SignUp start');
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {}

      const email = cnpjToEmail(cnpj);
      const redirectUrl = `${window.location.origin}/`;

      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { cnpj, company_name: companyName },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('registered')) {
          return { error: 'CNPJ já cadastrado' };
        }
        return { error: error.message };
      }

      // Try immediate sign in (works if email confirmation disabled)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError && signInData.session?.user) {
        await loadUserProfile(signInData.session.user.id);
        console.log('[Auth] SignUp success');
        return {};
      }

      return { error: 'Conta criada. Verifique seu e-mail para ativar.' };
    } catch (error) {
      console.error('[Auth] SignUp error:', error);
      return { error: 'Erro ao criar conta' };
    }
  };

  const signOut = async () => {
    try {
      console.log('[Auth] SignOut start');
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {}
    } finally {
      setUser(null);
      localStorage.removeItem('bpo_user');
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};