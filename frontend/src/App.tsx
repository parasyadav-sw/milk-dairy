import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DatabaseProvider } from './context/DatabaseContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { DashboardDispatcher } from './pages/DashboardDispatcher';
import { Farmers } from './pages/Farmers';
import { Visits } from './pages/Visits';
import { Collections } from './pages/Collections';
import { Payments } from './pages/Payments';
import { Attendance } from './pages/Attendance';
import { Leaves } from './pages/Leaves';
import { Routes as RoutesPage } from './pages/Routes';
import { Reports } from './pages/Reports';

// Route Guard to verify active JWT sessions
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-dairy-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Suite...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Route Guard for public authentication views
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <DatabaseProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />

            {/* Protected Core Dashboard Routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <DashboardDispatcher />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/farmers" 
              element={
                <ProtectedRoute>
                  <Farmers />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/visits" 
              element={
                <ProtectedRoute>
                  <Visits />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/collections" 
              element={
                <ProtectedRoute>
                  <Collections />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/payments" 
              element={
                <ProtectedRoute>
                  <Payments />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/attendance" 
              element={
                <ProtectedRoute>
                  <Attendance />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/leaves" 
              element={
                <ProtectedRoute>
                  <Leaves />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/routes" 
              element={
                <ProtectedRoute>
                  <RoutesPage />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/reports" 
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              } 
            />

            {/* Fallback Redirection */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </DatabaseProvider>
  );
}
