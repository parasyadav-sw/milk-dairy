import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { User } from './DatabaseContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileErr) throw profileErr;
      setUser(data);
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync auth state
  useEffect(() => {
    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token);
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setToken(session.access_token);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setToken(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let email = identifier;
      
      // If identifier is not an email, resolve username from profiles
      if (!identifier.includes('@')) {
        const { data, error: resolveErr } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', identifier)
          .maybeSingle();

        if (resolveErr) throw resolveErr;
        if (!data) throw new Error(`User "${identifier}" not found`);
        email = data.email;
      }

      // Sign in via Supabase Auth
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authErr) throw authErr;
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
    setIsLoading(false);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isLoading,
      error,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
