import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Database, ShieldAlert, RefreshCw, Layers } from 'lucide-react';
import { Toast } from '../components/Toast';

export const Settings: React.FC = () => {
  const { isApiMode, setApiMode, refreshData } = useDatabase();
  const { logout } = useAuth();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
  };

  const handleResetData = () => {
    if (window.confirm("Are you sure you want to reset all sandbox database records? This will delete all localStorage surveys, milk collections, and farmer records, and reseed the defaults.")) {
      localStorage.removeItem('mock_seeded');
      localStorage.removeItem('users');
      localStorage.removeItem('farmers');
      localStorage.removeItem('collections');
      localStorage.removeItem('payments');
      localStorage.removeItem('attendance');
      localStorage.removeItem('leaves');
      localStorage.removeItem('auditLogs');
      localStorage.removeItem('surveys');
      triggerToast("Sandbox database cleared. Logging out...");
      setTimeout(() => {
        logout();
        window.location.reload();
      }, 1000);
    }
  };

  const handleEngineSwitch = (apiVal: boolean) => {
    setApiMode(apiVal);
    triggerToast(`Switched engine to ${apiVal ? 'PostgreSQL Server' : 'Browser Sandbox'}!`);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Configure application engines and database options</p>
        </div>
      </div>

      {/* Database Connection Engine Card */}
      <div className="card p-6 space-y-4">
        <h3 className="section-title text-base flex items-center gap-2 border-b border-warm-100 pb-3">
          <Database className="w-4 h-4 text-primary-700" />
          Database Connection Engine
        </h3>
        <p className="text-body-sm text-muted leading-relaxed">
          The application can run in either **Browser Sandbox mode** (using local storage to simulate a fully-working dairy system) or **PostgreSQL API server mode** (connecting to a local Node/Prisma backend server).
        </p>

        <div className="flex flex-col gap-3 pt-2">
          <div 
            onClick={() => handleEngineSwitch(false)}
            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
              !isApiMode 
                ? 'bg-primary-50/50 border-primary-300 shadow-sm' 
                : 'bg-white border-warm-200 hover:bg-warm-50/30'
            }`}
          >
            <div>
              <span className="text-body font-semibold text-foreground block">Browser Sandbox</span>
              <span className="text-caption text-muted">Runs fully offline using your web browser storage</span>
            </div>
            <span className={`w-3.5 h-3.5 rounded-full border-2 ${!isApiMode ? 'border-primary-700 bg-primary-700' : 'border-warm-300'}`} />
          </div>

          <div 
            onClick={() => handleEngineSwitch(true)}
            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
              isApiMode 
                ? 'bg-primary-50/50 border-primary-300 shadow-sm' 
                : 'bg-white border-warm-200 hover:bg-warm-50/30'
            }`}
          >
            <div>
              <span className="text-body font-semibold text-foreground block">PostgreSQL API Server</span>
              <span className="text-caption text-muted">Connects to localhost:5000 server endpoints</span>
            </div>
            <span className={`w-3.5 h-3.5 rounded-full border-2 ${isApiMode ? 'border-primary-700 bg-primary-700' : 'border-warm-300'}`} />
          </div>
        </div>
      </div>

      {/* Database Reseeding Card */}
      {!isApiMode && (
        <div className="card p-6 space-y-4">
          <h3 className="section-title text-base flex items-center gap-2 border-b border-warm-100 pb-3 text-error">
            <ShieldAlert className="w-4 h-4 text-error" />
            Sandbox Maintenance
          </h3>
          <p className="text-body-sm text-muted leading-relaxed">
            Reseed all database collections in your web browser local storage to recover default mock profiles and collections data.
          </p>
          <button 
            onClick={handleResetData}
            className="btn-danger w-full sm:w-auto px-6 py-2.5 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Sandbox Data
          </button>
        </div>
      )}

      {/* App version Info card */}
      <div className="card p-6 flex justify-between items-center bg-warm-50/50 border-warm-200">
        <span className="text-body-sm font-semibold flex items-center gap-2 text-muted">
          <Layers className="w-4 h-4 text-muted" />
          Dairy Suite Version
        </span>
        <span className="text-caption font-mono bg-warm-100 text-warm-700 py-1 px-2.5 rounded-lg border border-warm-200">
          v2.0-stable (SQLite/PostgreSQL)
        </span>
      </div>
    </div>
  );
};
