import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/utils/authCleanup';

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
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {}

      const { data, error } = await supabase.rpc('authenticate_user', {
        cnpj_input: cnpj,
        password_input: password
      });
      
      if (error || !data || data.length === 0) {
        return { error: 'CNPJ ou senha incorretos' };
      }
      
      const userData = {
        id: data[0].profile_id,
        cnpj: data[0].profile_cnpj,
        company_name: data[0].profile_company_name
      };
      
      setUser(userData);
      localStorage.setItem('bpo_user', JSON.stringify(userData));
      
      return {};
    } catch (error) {
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

      const { data, error } = await supabase.rpc('register_user', {
        cnpj_input: cnpj,
        company_name_input: companyName,
        password_input: password
      });
      
      if (error) {
        if (error.message.includes('CNPJ já cadastrado')) {
          return { error: 'CNPJ já cadastrado' };
        }
        return { error: error.message };
      }
      
      return {};
    } catch (error) {
      return { error: 'Erro ao criar conta' };
    }
  };

  const signOut = async () => {
    try {
      // Clean up auth state and attempt a global sign out
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