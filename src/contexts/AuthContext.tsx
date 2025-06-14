// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentUser, resetPassword, updatePassword, updateEmail } from '../services/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  changeEmail: (newEmail: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const clearError = () => setError(null);

  useEffect(() => {
    getCurrentUser().then((user) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthOperation = async (operation: () => Promise<void>) => {
    setLoading(true);
    clearError();
    try {
      await operation();
    } catch (error) {
      setError(error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    return handleAuthOperation(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    });
  };

  const signUp = async (email: string, password: string) => {
    return handleAuthOperation(async () => {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    });
  };

  const signOut = async () => {
    return handleAuthOperation(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    });
  };

  const forgotPassword = async (email: string) => {
    return handleAuthOperation(async () => {
      await resetPassword(email);
    });
  };

  const changePassword = async (newPassword: string) => {
    return handleAuthOperation(async () => {
      await updatePassword(newPassword);
    });
  };

  const changeEmail = async (newEmail: string) => {
    return handleAuthOperation(async () => {
      await updateEmail(newEmail);
    });
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        error, 
        signIn, 
        signUp, 
        signOut,
        forgotPassword,
        changePassword,
        changeEmail,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}