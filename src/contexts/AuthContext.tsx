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
    // Check for existing user session in localStorage
    const savedUser = localStorage.getItem('bpo_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('bpo_user');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (cnpj: string, password: string) => {
    try {
      // Clean up any existing auth/session to avoid limbo states
      console.log('[Auth] signIn start', { cnpjMasked: (cnpj || '').slice(0,4) + '****' });
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {}

      const email = cnpjToEmail(cnpj);

      // 1) Try Supabase Auth first
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log('[Auth] signInWithPassword result', { error: signInError?.message, hasSession: !!signInData?.session });

      // 2) If auth fails, fallback to legacy check and attempt migration to Auth
      if (signInError) {
        console.log('[Auth] Falling back to legacy auth');
        const { data: legacy, error: legacyError } = await supabase.rpc('authenticate_user', {
          cnpj_input: cnpj,
          password_input: password,
        });
        console.log('[Auth] Legacy RPC result', { ok: !legacyError && !!legacy?.length, error: legacyError?.message });
        if (legacyError || !legacy || legacy.length === 0) {
          return { error: 'CNPJ ou senha incorretos' };
        }
        // Create the auth user now (requires email confirm disabled for seamless UX)
        const redirectUrl = `${window.location.origin}/`;
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { cnpj, company_name: legacy[0].profile_company_name },
          },
        });
        if (signUpErr) {
          console.warn('[Auth] signUp after legacy failed', signUpErr.message);
          return { error: signUpErr.message };
        }
        // Try sign-in again
        const retry = await supabase.auth.signInWithPassword({ email, password });
        signInData = retry.data;
        signInError = retry.error;
        console.log('[Auth] Retry signIn result', { error: signInError?.message, hasSession: !!signInData?.session });
        if (signInError) {
          return { error: signInError.message };
        }
      }

      // 3) Migrate/link legacy data to current auth user (idempotent)
      try {
        await supabase.rpc('migrate_legacy_to_auth', { cnpj_input: cnpj });
      } catch {}

      // 4) Load profile tied to current auth user
      const session = signInData?.session ?? (await supabase.auth.getSession()).data.session;
      const uid = session?.user?.id;
      if (!uid) {
        return { error: 'Sessão inválida após login' };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('cnpj, company_name, user_id')
        .eq('user_id', uid)
        .maybeSingle();
      console.log('[Auth] Loaded profile', { hasProfile: !!profile, uid });
      const userData = {
        id: uid,
        cnpj: profile?.cnpj || cnpj,
        company_name: profile?.company_name || 'Minha Empresa',
      };

      setUser(userData);
      localStorage.setItem('bpo_user', JSON.stringify(userData));
      console.log('[Auth] signIn success', { uid: userData.id, cnpj: userData.cnpj });
      return {};
    } catch (error) {
      console.error('[Auth] signIn error', error);
      return { error: 'Erro ao fazer login' };
    }
  };

  const signUp = async (cnpj: string, companyName: string, password: string) => {
    try {
      // Clean previous sessions/tokens before registering
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {}

      const email = cnpjToEmail(cnpj);
      const redirectUrl = `${window.location.origin}/`;
      console.log('[Auth] signUp start', { cnpjMasked: (cnpj || '').slice(0,4) + '****' });
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { cnpj, company_name: companyName },
        },
      });
      console.log('[Auth] signUp result', { error: error?.message, hasUser: !!signUpData?.user });
      if (error) {
        if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('registrado')) {
          return { error: 'CNPJ já cadastrado' };
        }
        return { error: error.message };
      }

      // Try to sign in immediately (works if email confirmation is disabled)
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        console.warn('[Auth] signUp immediate signIn failed', signInErr.message);
        // If confirmation required, inform the user but keep flow clean
        return { error: 'Conta criada. Verifique seu e-mail para confirmar o acesso.' };
      }

      // Link and load profile
      try {
        await supabase.rpc('migrate_legacy_to_auth', { cnpj_input: cnpj });
      } catch {}

      const session = (await supabase.auth.getSession()).data.session;
      const uid = session?.user?.id as string | undefined;
      if (uid) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('cnpj, company_name, user_id')
          .eq('user_id', uid)
          .maybeSingle();
        const userData = {
          id: uid,
          cnpj: profile?.cnpj || cnpj,
          company_name: profile?.company_name || companyName,
        };
        setUser(userData);
        localStorage.setItem('bpo_user', JSON.stringify(userData));
        console.log('[Auth] signUp success', { uid: userData.id, cnpj: userData.cnpj });
      }
      
      return {};
    } catch (error) {
      console.error('[Auth] signUp error', error);
      return { error: 'Erro ao criar conta' };
    }
  };

  const signOut = async () => {
    try {
      // Clean up auth state and attempt a global sign out
      console.log('[Auth] signOut start');
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {}
    } finally {
      setUser(null);
      localStorage.removeItem('bpo_user');
      // Force a clean reload to prevent limbo states
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