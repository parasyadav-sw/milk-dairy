import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { Milk, Lock, Mail, Database, UserCheck, AlertTriangle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, error, clearError } = useAuth();
  const { isApiMode, setApiMode } = useDatabase();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalErr(null);
    clearError();

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setLocalErr(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (roleEmail: string, rolePw: string) => {
    setEmail(roleEmail);
    setPassword(rolePw);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-200 relative overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-dairy-200/40 dark:bg-dairy-950/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-dairy-300/30 dark:bg-dairy-900/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* API Mode Alert Box */}
        <div className="mb-4 flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm text-xs font-semibold">
          <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Database className="w-4 h-4 text-dairy-500" />
            Database: {isApiMode ? 'PostgreSQL Server' : 'Browser Sandbox'}
          </span>
          <button
            type="button"
            onClick={() => {
              setApiMode(!isApiMode);
              setLocalErr(null);
              clearError();
            }}
            className="text-dairy-600 dark:text-dairy-400 hover:underline"
          >
            Switch to {isApiMode ? 'Local Demo' : 'API Server'}
          </button>
        </div>

        <div className="glass-card rounded-3xl shadow-xl overflow-hidden p-8 md:p-10 border border-white/50 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          {/* Logo header */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3.5 bg-dairy-600 text-white rounded-2xl shadow-lg shadow-dairy-600/30 mb-4 animate-bounce">
              <Milk className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white leading-tight">Dairy Suite</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Management Portal Login</p>
          </div>

          {/* Form errors */}
          {(localErr || error) && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                {localErr || error}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@dairy.com"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-dairy-500 focus:border-transparent dark:focus:ring-dairy-600 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-dairy-500 focus:border-transparent dark:focus:ring-dairy-600 transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-dairy-600 hover:bg-dairy-700 dark:bg-dairy-600 dark:hover:bg-dairy-700 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-dairy-600/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dairy-500 disabled:opacity-50 transition transform active:scale-98"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Quick-Access Simulated Credentials (only available in Mock Mode for ease of test/review) */}
          {!isApiMode && (
            <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5 justify-center">
                <UserCheck className="w-3.5 h-3.5 text-dairy-500" /> Auto-Fill Test Profiles (Demo)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillCredentials('admin@dairy.com', 'admin123')}
                  className="px-2 py-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 transition"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('manager1@dairy.com', 'manager123')}
                  className="px-2 py-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 transition"
                >
                  Manager
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('employee1@dairy.com', 'employee123')}
                  className="px-2 py-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 transition"
                >
                  Employee
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
