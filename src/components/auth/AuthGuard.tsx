
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { userProfile, user, session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!userProfile || !user || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 font-semibold mb-4">
            עליך להתחבר כדי לצפות וליצור ארגונים.
          </p>
          <a href="/auth" className="text-blue-600 underline">
            מעבר למסך התחברות
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
