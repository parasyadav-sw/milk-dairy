import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { 
  Milk, LayoutDashboard, Users, MapPin, Milestone, 
  CalendarCheck, ClipboardList, LogOut, Moon, Sun, 
  Database, UserCheck, ShieldAlert, FileText, Settings, Bell, Menu, X
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, login } = useAuth();
  const { isApiMode, setApiMode } = useDatabase();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isDark, setIsDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Helper to simulate roles instantly in mock mode
  const handleRoleSimulation = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleEmail = e.target.value;
    if (roleEmail) {
      logout();
      // Allow state clearing to register
      setTimeout(async () => {
        try {
          const defaultPasswords: { [key: string]: string } = {
            'admin@dairy.com': 'admin123',
            'manager1@dairy.com': 'manager123',
            'employee1@dairy.com': 'employee123'
          };
          await login(roleEmail, defaultPasswords[roleEmail] || 'password');
          navigate('/');
        } catch (err) {
          console.error('Role simulator failed:', err);
        }
      }, 100);
    }
  };

  // Role based navigation links
  const getNavLinks = () => {
    const links = [
      { path: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { path: '/farmers', label: 'Farmers', icon: <Users className="w-5 h-5" />, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { path: '/visits', label: 'Visits', icon: <CalendarCheck className="w-5 h-5" />, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { path: '/collections', label: 'Milk Collections', icon: <Milk className="w-5 h-5" />, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { path: '/payments', label: 'Payments', icon: <Milestone className="w-5 h-5" />, roles: ['ADMIN', 'MANAGER'] },
      { path: '/attendance', label: 'Attendance', icon: <UserCheck className="w-5 h-5" />, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { path: '/leaves', label: 'Leave Manager', icon: <ClipboardList className="w-5 h-5" />, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
      { path: '/routes', label: 'Routes & Villages', icon: <MapPin className="w-5 h-5" />, roles: ['ADMIN', 'MANAGER'] },
      { path: '/reports', label: 'Reports Export', icon: <FileText className="w-5 h-5" />, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
    ];
    return links.filter(l => user && l.roles.includes(user.role));
  };

  const navLinks = getNavLinks();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] dark:bg-slate-950">
      
      {/* --- SIDEBAR (DESKTOP) --- */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shrink-0">
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200/80 dark:border-slate-800 bg-dairy-50/20">
          <div className="p-2 bg-dairy-600 rounded-xl text-white shadow-md shadow-dairy-600/20">
            <Milk className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-slate-950 dark:text-white text-base leading-tight">Dairy Suite</h1>
            <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Enterprise</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive 
                    ? 'bg-dairy-600 text-white shadow-lg shadow-dairy-600/20 scale-[1.02]' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
          {/* Quick Role Switcher (Visible in Demo mode) */}
          {!isApiMode && (
            <div className="flex flex-col gap-1.5 p-2 bg-dairy-50/50 dark:bg-slate-800/50 rounded-xl border border-dairy-100 dark:border-slate-700/50">
              <label className="text-[10px] uppercase font-bold tracking-wider text-dairy-600 dark:text-dairy-400 flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> Simulator Mode
              </label>
              <select
                value={user?.email || ''}
                onChange={handleRoleSimulation}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold px-2 py-1.5 focus:outline-none"
              >
                <option value="admin@dairy.com">Admin: Ramesh</option>
                <option value="manager1@dairy.com">Manager: Vikram</option>
                <option value="employee1@dairy.com">Employee: Amit</option>
              </select>
            </div>
          )}

          {/* Database Selector */}
          <button
            onClick={() => {
              const newMode = !isApiMode;
              setApiMode(newMode);
              logout();
              navigate('/login');
            }}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Database className="w-4 h-4 text-dairy-500" />
              {isApiMode ? 'API Mode' : 'Local Demo'}
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${isApiMode ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* --- SIDEBAR (MOBILE DRAWER) --- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/40 backdrop-blur-sm">
          <div className="flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 animate-fade-in">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-dairy-50/20">
              <div className="flex items-center gap-3">
                <Milk className="w-6 h-6 text-dairy-600" />
                <span className="font-bold text-slate-950 dark:text-white text-base">Dairy Suite</span>
              </div>
              <button onClick={() => setMobileOpen(false)}>
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive 
                        ? 'bg-dairy-600 text-white' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <button
                onClick={logout}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN PAGE CONTENT WRAPPER --- */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP NAVBAR */}
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileOpen(true)}
              className="p-2 md:hidden hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl"
            >
              <Menu className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
              <span className={`w-2 h-2 rounded-full ${isApiMode ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
              Mode: {isApiMode ? 'PostgreSQL API' : 'Browser Database'}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-xl text-slate-600 dark:text-slate-400 transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-500 animate-spin" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Profile Pill */}
            {user && (
              <div className="flex items-center gap-3 pl-3 py-1 pr-1 border border-slate-200/60 dark:border-slate-800 rounded-full bg-slate-50 dark:bg-slate-900 shadow-sm">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{user.name}</span>
                  <span className="text-[10px] text-dairy-600 font-bold uppercase tracking-wider">{user.role}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-dairy-600 text-white flex items-center justify-center font-bold text-sm select-none">
                  {user.name.charAt(0)}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ROUTER CONTENT INJECTION SITE */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1600px] mx-auto w-full animate-fade-in">
          {children}
        </main>
      </div>

    </div>
  );
};
