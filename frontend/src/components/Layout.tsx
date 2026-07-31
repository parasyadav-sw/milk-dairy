import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { 
  Milk, LayoutDashboard, Users, 
  CalendarCheck, ClipboardList, LogOut, Database, UserCheck, 
  FileText, ChevronRight, Menu, X, PlusCircle, Download, User, Settings
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, login } = useAuth();
  const { isApiMode, setApiMode } = useDatabase();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleRoleSimulation = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleName = e.target.value;
    if (roleName) {
      logout();
      setTimeout(async () => {
        try {
          const defaultPasswords: { [key: string]: string } = {
            'Ramesh': 'admin123',
            'Amit': 'employee123'
          };
          await login(roleName, defaultPasswords[roleName] || 'password');
          navigate('/');
        } catch (err) {
          console.error('Role simulator failed:', err);
        }
      }, 100);
    }
  };

  const getNavLinks = () => {
    const links = [
      { path: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" />, roles: ['ADMIN', 'EMPLOYEE'] },
      { path: '/new-survey', label: 'New Survey', icon: <PlusCircle className="w-[18px] h-[18px]" />, roles: ['EMPLOYEE'] },
      { path: '/employees', label: 'Employees', icon: <ClipboardList className="w-[18px] h-[18px]" />, roles: ['ADMIN'] },
      { path: '/customers', label: 'Customers', icon: <Users className="w-[18px] h-[18px]" />, roles: ['ADMIN', 'EMPLOYEE'] },
      { path: '/surveys', label: 'Surveys', icon: <ClipboardList className="w-[18px] h-[18px]" />, roles: ['ADMIN'] },
      { path: '/attendance', label: 'Attendance', icon: <UserCheck className="w-[18px] h-[18px]" />, roles: ['ADMIN', 'EMPLOYEE'] },
      { path: '/reports', label: 'Reports', icon: <FileText className="w-[18px] h-[18px]" />, roles: ['ADMIN'] },
      { path: '/export', label: 'Export', icon: <Download className="w-[18px] h-[18px]" />, roles: ['ADMIN'] },
      { path: '/profile', label: 'Profile', icon: <User className="w-[18px] h-[18px]" />, roles: ['ADMIN', 'EMPLOYEE'] },
      { path: '/settings', label: 'Settings', icon: <Settings className="w-[18px] h-[18px]" />, roles: ['ADMIN'] },
    ];
    return links.filter(l => user && l.roles.includes(user.role));
  };

  const navLinks = getNavLinks();
  const currentPageLabel = navLinks.find(l => l.path === location.pathname)?.label || 'Dashboard';

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-warm-100 shrink-0">
        <div className="p-2 bg-primary-700 text-white rounded-xl shadow-glow">
          <Milk className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display text-foreground text-base font-semibold leading-tight tracking-tight">Dairy Suite</h1>
          <span className="text-caption text-muted tracking-wide">Enterprise</span>
        </div>
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto p-1.5 rounded-lg hover:bg-warm-100 transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => isMobile && setMobileOpen(false)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-primary-700 text-white shadow-glow' 
                  : 'text-warm-600 hover:bg-warm-100 hover:text-foreground'
              }`}
            >
              <span className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-white/20 text-white' 
                  : 'bg-warm-100 text-warm-600 group-hover:bg-warm-200 group-hover:text-warm-800'
              }`}>
                {link.icon}
              </span>
              {link.label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-forest-400" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-warm-100 space-y-2">
        {!isApiMode && (
          <div className="p-2.5 bg-warm-50 rounded-xl border border-warm-100">
            <label className="label text-primary-700 flex items-center gap-1.5 mb-1.5">
              <UserCheck className="w-3 h-3" /> Demo mode
            </label>
            <select
              value={user?.username || ''}
              onChange={handleRoleSimulation}
              className="w-full bg-white border border-warm-200 rounded-lg text-body-sm font-medium px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
            >
              <option value="Ramesh">Admin: Ramesh</option>
              <option value="Amit">Employee: Amit</option>
            </select>
          </div>
        )}

        <button
          onClick={() => {
            const newMode = !isApiMode;
            setApiMode(newMode);
            logout();
            navigate('/login');
          }}
          className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-body-sm font-medium bg-white border border-warm-200 hover:bg-warm-50 transition-all duration-200"
        >
          <span className="flex items-center gap-2 text-warm-600">
            <Database className="w-4 h-4 text-primary-600" />
            {isApiMode ? 'API server' : 'Local demo'}
          </span>
          <span className={`w-2 h-2 rounded-full ${isApiMode ? 'bg-forest-500 animate-pulse' : 'bg-forest-400'}`} />
        </button>

        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-body-sm font-medium text-error hover:bg-red-50 transition-all duration-200"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-ivory">
      <aside className="hidden md:flex flex-col w-[260px] bg-white border-r border-warm-100 shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative flex flex-col w-[280px] bg-white shadow-soft-xl animate-slide-in-left">
            <SidebarContent isMobile />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-white/80 backdrop-blur-xl border-b border-warm-100 shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileOpen(true)}
              className="p-2 md:hidden hover:bg-warm-100 rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5 text-warm-600" />
            </button>
            
            <div className="hidden sm:flex items-center gap-2 text-body">
              <Link to="/" className="text-muted hover:text-warm-700 transition-colors">
                <LayoutDashboard className="w-4 h-4" />
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-warm-300" />
              <span className="font-medium text-foreground">{currentPageLabel}</span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-warm-50 rounded-lg text-label text-muted border border-warm-100">
              <span className={`w-1.5 h-1.5 rounded-full ${isApiMode ? 'bg-forest-500' : 'bg-forest-400'}`} />
              {isApiMode ? 'PostgreSQL' : 'Browser DB'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-warm-50 transition-all duration-200 border border-transparent hover:border-warm-200"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary-700 text-white flex items-center justify-center font-medium text-sm shadow-sm">
                    {user.name.charAt(0)}
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-body-sm font-medium text-foreground leading-tight">{user.name.split('(')[0].trim()}</span>
                    <span className="label text-gold-600">{user.role}</span>
                  </div>
                </button>
                
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-warm-200 shadow-soft-lg py-2 z-50 animate-scale-in">
                      <div className="px-4 py-3 border-b border-warm-100">
                        <p className="text-body font-medium text-foreground">{user.name.split('(')[0].trim()}</p>
                        <p className="text-body-sm text-muted mt-0.5">{user.email}</p>
                      </div>
                      <button
                        onClick={() => { setProfileOpen(false); logout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-body font-medium text-error hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-[1400px] mx-auto w-full animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};
