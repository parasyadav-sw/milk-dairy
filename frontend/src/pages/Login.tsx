import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { Milk, Lock, User, AlertTriangle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, error, clearError } = useAuth();
  const { isApiMode, setApiMode } = useDatabase();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalErr(null);
    clearError();
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setLocalErr(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (roleName: string, rolePw: string) => {
    setUsername(roleName);
    setPassword(rolePw);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary-100/30 blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gold-100/40 blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">


        <div className="bg-white rounded-3xl shadow-soft-xl border border-warm-200 overflow-hidden">
          <div className="p-8 md:p-10">
            <div className="text-center mb-8">
              <div className="inline-flex p-3.5 bg-primary-700 text-white rounded-2xl shadow-glow mb-4">
                <Milk className="w-8 h-8" />
              </div>
              <h2 className="font-display text-display-lg text-foreground">Dairy Suite</h2>
              <p className="text-body text-muted font-normal mt-1.5">Enterprise management portal</p>
            </div>

            {(localErr || error) && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200/60 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <span className="text-body-sm font-medium text-error">{localErr || error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="label">Username</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted">
                    <User className="w-[18px] h-[18px]" />
                  </span>
                  <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" className="input pl-11" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="label">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted">
                    <Lock className="w-[18px] h-[18px]" />
                  </span>
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="input pl-11 pr-11" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted hover:text-warm-700 transition-colors">
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? (
                  <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</div>
                ) : (
                  <div className="flex items-center gap-2">Sign in <ArrowRight className="w-4 h-4" /></div>
                )}
              </button>
            </form>
          </div>


        </div>

        <p className="text-center text-caption text-muted mt-6">Dairy Suite Enterprise v2.0 — Secure portal</p>
      </div>
    </div>
  );
};
