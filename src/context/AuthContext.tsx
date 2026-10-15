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
  updateProfileDetails: (data: { name?: string; avatarUrl?: string; bio?: string }) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const buildProfile = (currentUser: User): UserProfile => {
    const meta = currentUser.user_metadata || {};
    // Fallback local se imagem for salva em localStorage
    const localAvatar = localStorage.getItem(`avatar_${currentUser.id}`);
    const localBio = localStorage.getItem(`bio_${currentUser.id}`);

    return {
      id: currentUser.id,
      email: currentUser.email || '',
      name: meta.name || currentUser.email?.split('@')[0] || 'Usuário',
      avatarUrl: meta.avatar_url || localAvatar || undefined,
      bio: meta.bio || localBio || 'Focado no controle e crescimento do meu patrimônio 🚀',
      createdAt: currentUser.created_at,
    };
  };

  // Carregar sessão atual
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setProfile(buildProfile(session.user));
        }
      } catch (err) {
        console.error('Erro ao inicializar autenticação:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setProfile(buildProfile(session.user));
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
            bio: 'Focado no controle e crescimento do meu patrimônio 🚀',
          },
        },
      });

      if (error) {
        showError(error.message || 'Erro ao criar conta.');
        return { error };
      }

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
    return updateProfileDetails({ name: newName });
  };

  const updateProfileDetails = async (data: { name?: string; avatarUrl?: string; bio?: string }) => {
    try {
      const updates: any = {};
      if (data.name !== undefined) updates.name = data.name.trim();
      if (data.avatarUrl !== undefined) {
        updates.avatar_url = data.avatarUrl;
        if (user) localStorage.setItem(`avatar_${user.id}`, data.avatarUrl);
      }
      if (data.bio !== undefined) {
        updates.bio = data.bio.trim();
        if (user) localStorage.setItem(`bio_${user.id}`, data.bio.trim());
      }

      const { error } = await supabase.auth.updateUser({
        data: updates
      });

      if (error) {
        showError(error.message || 'Erro ao atualizar dados do perfil.');
        return { error };
      }

      if (profile) {
        setProfile({
          ...profile,
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
          ...(data.bio !== undefined ? { bio: data.bio.trim() } : {}),
        });
      }

      showSuccess('Perfil atualizado com sucesso!');
      return { error: null };
    } catch (err: any) {
      showError(err.message || 'Erro ao atualizar perfil.');
      return { error: err };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      if (newPassword.length < 6) {
        showError('A nova senha deve ter no mínimo 6 caracteres.');
        return { error: new Error('Senha muito curta') };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        showError(error.message || 'Erro ao alterar senha.');
        return { error };
      }

      showSuccess('Senha alterada com sucesso!');
      return { error: null };
    } catch (err: any) {
      showError(err.message || 'Erro ao alterar senha.');
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
        updateProfileDetails,
        updatePassword,
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
