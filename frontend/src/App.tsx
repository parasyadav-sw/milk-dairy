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
                <ProtectedRoute>
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
                <ProtectedRoute>
                  <LiveTracking />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/field-locations" 
              element={
                <ProtectedRoute>
                  <FieldLocations />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/field-locations/employee/:userId" 
              element={
                <ProtectedRoute>
                  <FieldLocationDetail />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/export" 
              element={
                <ProtectedRoute>
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
  );
}
