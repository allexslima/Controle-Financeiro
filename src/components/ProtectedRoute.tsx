import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PieChart, Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
          <PieChart size={30} />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Loader2 className="animate-spin text-primary" size={16} />
          <span>Carregando sua sessão...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
