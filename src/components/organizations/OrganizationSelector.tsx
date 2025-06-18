
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { OrganizationList } from './OrganizationList';
import { NewOrganizationCard } from './NewOrganizationCard';

interface OrganizationSelectorProps {
  onOrganizationSelect: (orgId: string) => void;
}

export function OrganizationSelector({ onOrganizationSelect }: OrganizationSelectorProps) {
  const { userProfile } = useAuth();
  const { organizations, loading, creating, createOrganization } = useOrganizations();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  const handleCreateOrganization = async () => {
    const success = await createOrganization(newOrgName);
    if (success) {
      setNewOrgName('');
      setShowCreateForm(false);
    }
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
            <p className="text-gray-600">בחר ארגון קיים או צור ארגון חדש</p>
            {userProfile && (
              <p className="text-sm text-gray-500 mt-2">
                משתמש: {userProfile.email} (ID: {userProfile.id})
              </p>
            )}
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <OrganizationList organizations={organizations} onOrganizationSelect={onOrganizationSelect} />
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
