"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '@/types/finance';
import { showSuccess, showError } from '@/utils/toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error: Error | null; requiresEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  updateProfileName: (name: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar sessão atual
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setProfile({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
            createdAt: session.user.created_at,
          });
        }
      } catch (err) {
        console.error('Erro ao inicializar autenticação:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Ouvir alterações de estado de autenticação (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setProfile({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
            createdAt: session.user.created_at,
          });
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showError(error.message || 'Erro ao entrar. Verifique seus dados.');
        return { error };
      }

      showSuccess(`Bem-vindo de volta!`);
      return { error: null };
    } catch (err: any) {
      showError(err.message || 'Erro inesperado ao realizar login.');
      return { error: err };
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
          },
        },
      });

      if (error) {
        showError(error.message || 'Erro ao criar conta.');
        return { error };
      }

      // Se o usuário precisa confirmar email
      if (data.user && !data.session) {
        showSuccess('Perfil criado com sucesso! Verifique seu e-mail para ativar ou faça login.');
        return { error: null, requiresEmailConfirmation: true };
      }

      showSuccess(`Perfil de ${name} criado com sucesso!`);
      return { error: null };
    } catch (err: any) {
      showError(err.message || 'Erro inesperado ao criar perfil.');
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      showSuccess('Você saiu da sua conta.');
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  const updateProfileName = async (newName: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { name: newName.trim() }
      });

      if (error) {
        showError(error.message || 'Erro ao atualizar nome.');
        return { error };
      }

      if (profile) {
        setProfile({
          ...profile,
          name: newName.trim(),
        });
      }
      showSuccess('Nome de perfil atualizado!');
      return { error: null };
    } catch (err: any) {
      showError(err.message || 'Erro ao atualizar perfil.');
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfileName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
