
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
    
    try {
      // Fetch organizations with role using the new RLS policies
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
      console.error('[CREATE ORG] Missing auth data:', { user: !!user, userProfile: !!userProfile, session: !!session });
      toast({
        variant: "destructive",
        title: "עליך להתחבר",
        description: "יש להתחבר לפני שניתן ליצור או לנהל ארגון.",
      });
      return false;
    }

    if (!newOrgName.trim()) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "אנא הכנס שם ארגון",
      });
      return false;
    }

    setCreating(true);
    console.log('[CREATE ORG] Starting organization creation...');
    console.log('[CREATE ORG] Organization name:', newOrgName);
    console.log('[CREATE ORG] User profile ID:', userProfile.id);
    console.log('[CREATE ORG] Supabase UID:', user.id);

    try {
      // Generate UUID for the organization
      const newOrgId = generateUuid();
      console.log('[CREATE ORG] Generated org ID:', newOrgId);

      // Step 1: Create the organization
      console.log('[CREATE ORG] Step 1: Creating organization record...');
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          id: newOrgId,
          name: newOrgName.trim(),
          owner_id: userProfile.id  // This should match get_user_id() function result
        })
        .select()
        .single();

      console.log('[CREATE ORG] Organization creation result:', { 
        success: !orgError, 
        data: orgData, 
        error: orgError,
        errorDetails: orgError ? {
          message: orgError.message,
          details: orgError.details,
          hint: orgError.hint,
          code: orgError.code
        } : null
      });
      
      if (orgError) {
        console.error('[CREATE ORG] Failed to create organization:', orgError);
        throw new Error(`יצירת ארגון נכשלה: ${orgError.message}`);
      }

      console.log('[CREATE ORG] Organization created successfully:', orgData);
      
      // Step 2: Add user as owner in organization_user
      console.log('[CREATE ORG] Step 2: Creating user-organization link...');
      const { error: userOrgError } = await supabase
        .from('organization_user')
        .insert({
          organization_id: newOrgId,
          user_id: userProfile.id,  // This should match get_user_id() function result
          role: 'owner'
        });

      console.log('[CREATE ORG] User-organization link result:', { 
        success: !userOrgError, 
        error: userOrgError,
        errorDetails: userOrgError ? {
          message: userOrgError.message,
          details: userOrgError.details,
          hint: userOrgError.hint,
          code: userOrgError.code
        } : null
      });
      
      if (userOrgError) {
        console.error('[CREATE ORG] Failed to create user-organization link:', userOrgError);
        
        // Try to clean up the organization if membership creation failed
        console.log('[CREATE ORG] Cleaning up organization due to failed membership creation...');
        const { error: cleanupError } = await supabase
          .from('organizations')
          .delete()
          .eq('id', newOrgId);
        
        if (cleanupError) {
          console.error('[CREATE ORG] Failed to cleanup organization:', cleanupError);
        }
        
        throw new Error(`יצירת חברות בארגון נכשלה: ${userOrgError.message}`);
      }

      console.log('[CREATE ORG] Organization and membership created successfully!');
      
      toast({
        title: "ארגון נוצר בהצלחה!",
        description: `הארגון "${newOrgName}" נוצר והוספת כבעלים`,
      });

      await fetchOrganizations();
      return true;
    } catch (error: any) {
      console.error('[CREATE ORG] Error during organization creation:', error);
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
