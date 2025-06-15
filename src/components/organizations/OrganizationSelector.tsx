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
    // --- Explicit user/session checks ---
    if (!user || !userProfile || !session) {
      toast({
        variant: "destructive",
        title: "עליך להתחבר",
        description: "יש להתחבר לפני שניתן ליצור או לנהל ארגון.",
      });
      setCreating(false);
      return;
    }
    // Existing checks
    if (!newOrgName.trim() || !userProfile) {
      console.log('Cannot create organization. Missing data:', {
        newOrgName: newOrgName.trim(),
        userProfile,
      });
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "פרטי המשתמש או שם הארגון חסרים",
      });
      setCreating(false);
      return;
    }

    if (!user || !userProfile.supabase_uid) {
      toast({
        variant: "destructive",
        title: "שגיאת זיהוי משתמש",
        description: "לא ניתן לאשר את המשתמש מול supabase_uid",
      });
      setCreating(false);
      return;
    }

    if (userProfile.supabase_uid !== user.id) {
      toast({
        variant: "destructive",
        title: "אי התאמה בזיהוי משתמש",
        description: `supabase_uid מהפרופיל (${userProfile.supabase_uid}) שונה מזה של המשתמש (${user.id}) - לא ניתן ליצור ארגון. אנא פנה למנהל מערכת.`,
      });
      setCreating(false);
      return;
    }

    setCreating(true);
    console.log('[CREATE ORG] newOrgName:', newOrgName);
    console.log('[CREATE ORG] userProfile:', userProfile);
    console.log('[CREATE ORG] user.id (from supabase):', user.id);
    console.log('[CREATE ORG] userProfile.id:', userProfile.id, ', userProfile.supabase_uid:', userProfile.supabase_uid);

    try {
      // כאן הכי חשוב: owner_id = userProfile.id
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: newOrgName.trim(),
          owner_id: userProfile.id
        })
        .select()
        .single();

      console.log('Organization creation result:', { org, orgError });
      if (orgError) throw orgError;

      console.log('Organization created successfully, now linking user...');
      // Add user as owner
      const { error: userOrgError } = await supabase
        .from('organization_user')
        .insert({
          organization_id: org.id,
          user_id: userProfile.id,
          role: 'owner'
        });

      console.log('User-organization link result:', { userOrgError });
      if (userOrgError) throw userOrgError;

      toast({
        title: "ארגון נוצר בהצלחה!",
        description: `הארגון "${newOrgName}" נוצר והוספת כבעלים`,
      });

      setNewOrgName('');
      setShowCreateForm(false);
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error creating organization:', error);
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

  // Block view if not authenticated
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
