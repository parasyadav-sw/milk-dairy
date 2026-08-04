import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DatabaseProvider } from './context/DatabaseContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { DashboardDispatcher } from './pages/DashboardDispatcher';
import { Customers } from './pages/Customers';
import { Employees } from './pages/Employees';
import { Attendance } from './pages/Attendance';
import { PotentialCustomers } from './pages/PotentialCustomers';
import { Export } from './pages/Export';
import { Profile } from './pages/Profile';
import { LiveTracking } from './pages/LiveTracking';
import { FieldLocations } from './pages/FieldLocations';
import { FieldLocationDetail } from './pages/FieldLocationDetail';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'EMPLOYEE';
}

// Route Guard to verify active JWT sessions and role
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
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

  if (requiredRole && user.role !== requiredRole && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
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

// Error Boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-ivory">
          <div className="text-center space-y-4 p-8">
            <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted">Please refresh the page or contact support.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
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
                path="/customers" 
                element={
                  <ProtectedRoute>
                    <Customers />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/employees" 
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <Employees />
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
                path="/potential-customers" 
                element={
                  <ProtectedRoute>
                    <PotentialCustomers />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/live-tracking" 
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <LiveTracking />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/field-locations" 
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <FieldLocations />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/field-locations/employee/:userId" 
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <FieldLocationDetail />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/export" 
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <Export />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />

              {/* Fallback Redirection */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </DatabaseProvider>
    </ErrorBoundary>
  );
}
