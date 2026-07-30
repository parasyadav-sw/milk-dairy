import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminDashboard } from './AdminDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { EmployeeDashboard } from './EmployeeDashboard';
import { ShieldAlert } from 'lucide-react';

export const DashboardDispatcher: React.FC = () => {
  const { user } = useAuth();
  if (!user) {
    return (
      <div className="card p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
        <ShieldAlert className="w-12 h-12 text-error mb-4" />
        <h3 className="font-display text-display-md text-foreground">Access denied</h3>
        <p className="text-body text-muted mt-1">Please sign in to view your dashboard.</p>
      </div>
    );
  }
  switch (user.role) {
    case 'ADMIN': return <AdminDashboard />;
    case 'MANAGER': return <ManagerDashboard />;
    case 'EMPLOYEE': return <EmployeeDashboard />;
    default: return (
      <div className="card p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-gold-500 mx-auto mb-4" />
        <h3 className="font-display text-display-md text-foreground">Invalid role</h3>
        <p className="text-body text-muted mt-1">Your profile does not contain a valid system role.</p>
      </div>
    );
  }
};
