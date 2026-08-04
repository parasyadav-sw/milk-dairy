import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { KeyRound, ShieldAlert, Award, Calendar, Mail, UserCheck } from 'lucide-react';
import { Toast } from '../components/Toast';

export const Profile: React.FC = () => {
  const { user } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      triggerToast('Password cannot be empty', 'error');
      return;
    }
    if (password !== confirmPassword) {
      triggerToast('Passwords do not match', 'error');
      return;
    }
    if (password.length < 6) {
      triggerToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      triggerToast('Password updated successfully!');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to update password', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Profile Settings</h1>
          <p className="page-subtitle">Manage your personal credentials and security</p>
        </div>
      </div>

      {/* User Information Card */}
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-primary-700 text-white flex items-center justify-center font-bold text-3xl shadow-glow">
          {user.name.charAt(0)}
        </div>
        <div className="text-center sm:text-left space-y-1.5 flex-1">
          <h2 className="text-xl font-bold font-display text-foreground">{user.name.split('(')[0].trim()}</h2>
          <span className="badge badge-info text-xs">{user.role}</span>
          <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-1 text-body-sm text-muted pt-2 border-t border-warm-100 mt-2">
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {user.email}</span>
            <span className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Active account</span>
          </div>
        </div>
      </div>

      {/* Security Update Card */}
      <div className="card p-6 space-y-4">
        <h3 className="section-title text-base flex items-center gap-2 border-b border-warm-100 pb-3">
          <KeyRound className="w-4 h-4 text-primary-700" />
          Update password
        </h3>
        
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="label">New password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Minimum 6 characters" 
              className="input" 
              minLength={6}
            />
          </div>
          <div className="space-y-1.5">
            <label className="label">Confirm new password</label>
            <input 
              type="password" 
              required 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="Repeat new password" 
              className="input" 
              minLength={6}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="btn-primary w-full sm:w-auto px-6 py-2.5"
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
};
