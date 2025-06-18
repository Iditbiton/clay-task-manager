
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { OrganizationList } from './OrganizationList';
import { NewOrganizationCard } from './NewOrganizationCard';

// Utility to generate a UUID in environments that may not yet support
// crypto.randomUUID (e.g. older Node/browser versions).
function generateUuid() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join('')
  ].join('-');
}

type Organization = Tables<'organizations'>;

interface OrganizationWithRole extends Organization {
  role: string;
}

interface OrganizationSelectorProps {
  onOrganizationSelect: (orgId: string) => void;
}

export function OrganizationSelector({ onOrganizationSelect }: OrganizationSelectorProps) {
  const { userProfile, user, session } = useAuth();
  const { toast } = useToast();

  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (userProfile) {
      fetchOrganizations();
    }
  }, [userProfile]);

  const fetchOrganizations = async () => {
    console.log('Fetching organizations for user:', userProfile?.id);
    try {
      const { data, error } = await supabase
        .from('organization_user')
        .select(`
          role,
          organizations (
            id,
            name,
            owner_id,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userProfile?.id);

      console.log('Organizations query result:', { data, error });
      if (error) throw error;
      
      const orgsWithRole = data?.map(item => ({
        ...(item.organizations as Organization),
        role: item.role
      })) || [];
      
      console.log('Processed organizations:', orgsWithRole);
      setOrganizations(orgsWithRole);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "לא ניתן לטעון את הארגונים",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async () => {
    if (!user || !userProfile || !session) {
      toast({
        variant: "destructive",
        title: "עליך להתחבר",
        description: "יש להתחבר לפני שניתן ליצור או לנהל ארגון.",
      });
      return;
    }

    if (!newOrgName.trim()) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אנא הכנס שם ארגון",
      });
      return;
    }

    setCreating(true);
    console.log('[CREATE ORG] Creating organization with name:', newOrgName);
    console.log('[CREATE ORG] User profile:', userProfile);
    console.log('[CREATE ORG] User from auth:', user);

    try {
      // Generate UUID for the organization
      const newOrgId = generateUuid();
      console.log('[CREATE ORG] Generated org ID:', newOrgId);

      // Create the organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          id: newOrgId,
          name: newOrgName.trim(),
          owner_id: userProfile.id
        })
        .select()
        .single();

      console.log('[CREATE ORG] Organization creation result:', { orgData, orgError });
      if (orgError) {
        console.error('[CREATE ORG] Failed to create organization:', orgError);
        throw orgError;
      }

      console.log('[CREATE ORG] Organization created successfully, now creating membership...');
      
      // Add user as owner in organization_user
      const { error: userOrgError } = await supabase
        .from('organization_user')
        .insert({
          organization_id: newOrgId,
          user_id: userProfile.id,
          role: 'owner'
        });

      console.log('[CREATE ORG] User-organization link result:', { userOrgError });
      if (userOrgError) {
        console.error('[CREATE ORG] Failed to create membership:', userOrgError);
        throw userOrgError;
      }

      toast({
        title: "ארגון נוצר בהצלחה!",
        description: `הארגון "${newOrgName}" נוצר והוספת כבעלים`,
      });

      setNewOrgName('');
      setShowCreateForm(false);
      await fetchOrganizations();
    } catch (error: any) {
      console.error('[CREATE ORG] Error creating organization:', error);
      toast({
        variant: "destructive",
        title: "שגיאה ביצירת ארגון",
        description: error.message || "לא ניתן ליצור את הארגון",
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">טוען ארגונים...</p>
        </div>
      </div>
    );
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

  return (
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
            onCreate={createOrganization}
          />
        </div>
      </div>
    </div>
  );
}
