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
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm min-h-[400px]">
        <ShieldAlert className="w-12 h-12 text-rose-500 animate-bounce mb-4" />
        <h3 className="text-lg font-bold">Access Denied</h3>
        <p className="text-sm text-slate-500 mt-1">Please sign in to view your dashboard.</p>
      </div>
    );
  }

  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'MANAGER':
      return <ManagerDashboard />;
    case 'EMPLOYEE':
      return <EmployeeDashboard />;
    default:
      return (
        <div className="p-8 text-center bg-white rounded-3xl border">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold">Invalid Role Assignment</h3>
          <p className="text-sm text-slate-500 mt-1">Your user profile does not contain a valid system role.</p>
        </div>
      );
  }
};
