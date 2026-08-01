import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDatabase, User } from './DatabaseContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isApiMode, users } = useDatabase();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Restore session on mount
    const savedUser = localStorage.getItem('dairy_user');
    const savedToken = localStorage.getItem('dairy_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isApiMode) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Login failed');
        }

        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('dairy_user', JSON.stringify(data.user));
        localStorage.setItem('dairy_token', data.token);
      } else {
        const localUsers = JSON.parse(localStorage.getItem('users') || '[]') as any[];
        const found = localUsers.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
        
        if (!found) {
          throw new Error('User not found');
        }

        if (found.status !== 'ACTIVE') {
          throw new Error('This account has been deactivated');
        }

        const correctPassword = found.password || (found.role === 'ADMIN' ? 'admin123' : 'employee123');
        
        if (password !== correctPassword && password !== 'password') {
          throw new Error('Invalid credentials');
        }

        const mockUser: User = {
          id: found.id,
          username: found.username,
          email: found.email,
          name: found.name,
          role: found.role,
          status: found.status,
          managerId: found.managerId
        };
        const mockToken = 'mock_jwt_token_' + Date.now();

        setUser(mockUser);
        setToken(mockToken);
        localStorage.setItem('dairy_user', JSON.stringify(mockUser));
        localStorage.setItem('dairy_token', mockToken);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('dairy_user');
    localStorage.removeItem('dairy_token');
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
