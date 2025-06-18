
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import { generateUuid } from '@/utils/uuid';

type Organization = Tables<'organizations'>;

interface OrganizationWithRole extends Organization {
  role: string;
}

export function useOrganizations() {
  const { userProfile, user, session } = useAuth();
  const { toast } = useToast();

  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (userProfile && user && session) {
      console.log('[ORG SELECTOR] Auth state ready, fetching organizations...');
      fetchOrganizations();
    } else {
      console.log('[ORG SELECTOR] Waiting for auth state:', { userProfile: !!userProfile, user: !!user, session: !!session });
    }
  }, [userProfile, user, session]);

  const fetchOrganizations = async () => {
    if (!userProfile?.id) {
      console.log('[ORG SELECTOR] No user profile available for fetching organizations');
      setLoading(false);
      return;
    }

    console.log('[ORG SELECTOR] Fetching organizations for user:', userProfile.id);
    console.log('[ORG SELECTOR] User supabase_uid:', user?.id);
    
    try {
      // Test the RLS policies by fetching organization_user first
      console.log('[ORG SELECTOR] Testing organization_user access...');
      const { data: orgUserTest, error: orgUserError } = await supabase
        .from('organization_user')
        .select('*')
        .eq('user_id', userProfile.id);

      console.log('[ORG SELECTOR] Organization_user test result:', { data: orgUserTest, error: orgUserError });

      if (orgUserError) {
        console.error('[ORG SELECTOR] Error accessing organization_user:', orgUserError);
        throw orgUserError;
      }

      // Now fetch with join
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
        .eq('user_id', userProfile.id);

      console.log('[ORG SELECTOR] Organizations query result:', { data, error });
      
      if (error) {
        console.error('[ORG SELECTOR] Error fetching organizations:', error);
        throw error;
      }
      
      const orgsWithRole = data?.map(item => ({
        ...(item.organizations as Organization),
        role: item.role
      })).filter(org => org.id) || [];
      
      console.log('[ORG SELECTOR] Processed organizations:', orgsWithRole);
      setOrganizations(orgsWithRole);
    } catch (error: any) {
      console.error('[ORG SELECTOR] Error fetching organizations:', error);
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: error.message || "לא ניתן לטעון את הארגונים",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async (newOrgName: string) => {
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

      // Create the organization first
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

      console.log('[CREATE ORG] Organization created successfully, creating membership...');
      
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
        // Try to clean up the organization if membership creation failed
        await supabase.from('organizations').delete().eq('id', newOrgId);
        throw userOrgError;
      }

      toast({
        title: "ארגון נוצר בהצלחה!",
        description: `הארגון "${newOrgName}" נוצר והוספת כבעלים`,
      });

      await fetchOrganizations();
      return true;
    } catch (error: any) {
      console.error('[CREATE ORG] Error creating organization:', error);
      toast({
        variant: "destructive",
        title: "שגיאה ביצירת ארגון",
        description: error.message || "לא ניתן ליצור את הארגון",
      });
      return false;
    } finally {
      setCreating(false);
    }
  };

  return {
    organizations,
    loading,
    creating,
    createOrganization,
    refetch: fetchOrganizations
  };
}
