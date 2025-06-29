import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { OrganizationList } from './OrganizationList';
import { NewOrganizationCard } from './NewOrganizationCard';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OrganizationSelectorProps {
  onOrganizationSelect: (orgId: string) => void;
}

export function OrganizationSelector({ onOrganizationSelect }: OrganizationSelectorProps) {
  const { userProfile } = useAuth();
  const { organizations, loading, creating, createOrganization, refetch, error } = useOrganizations();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      return;
    }

    const success = await createOrganization(newOrgName);
    if (success) {
      setNewOrgName('');
      setShowCreateForm(false);
    }
  };

  const handleRefresh = async () => {
    await refetch();
  };

  if (loading) {
    return <LoadingScreen message="טוען ארגונים..." />;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">בחר ארגון</h1>
            <p className="text-gray-600 mb-4">בחר ארגון קיים או צור ארגון חדש</p>
            {userProfile && (
              <p className="text-sm text-gray-500 mb-4">
                משתמש: {userProfile.name || userProfile.email}
              </p>
            )}
            
            <div className="flex justify-center gap-2 mb-6">
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                רענן רשימה
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <Button 
                  onClick={handleRefresh} 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                >
                  נסה שוב
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {organizations.length === 0 && !loading && !error ? (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                אין לך ארגונים עדיין
              </h2>
              <p className="text-gray-500 mb-6">
                צור ארגון ראשון כדי להתחיל לנהל משימות
              </p>
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <OrganizationList 
              organizations={organizations} 
              onOrganizationSelect={onOrganizationSelect} 
            />
            <NewOrganizationCard
              creating={creating}
              showCreateForm={showCreateForm}
              setShowCreateForm={setShowCreateForm}
              newOrgName={newOrgName}
              setNewOrgName={setNewOrgName}
              onCreate={handleCreateOrganization}
            />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}