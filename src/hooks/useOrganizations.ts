import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { fetchUserOrganizations, createNewOrganization } from '@/services/organizationService';
import type { OrganizationWithRole } from '@/types/organization';

export function useOrganizations() {
  const { userProfile, user, session } = useAuth();
  const { toast } = useToast();

  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (userProfile && user && session) {
      console.log('[ORG HOOK] Auth state ready, fetching organizations...');
      fetchOrganizations();
    } else {
      console.log('[ORG HOOK] Waiting for auth state:', { 
        userProfile: !!userProfile, 
        user: !!user, 
        session: !!session 
      });
      setLoading(false);
    }
  }, [userProfile, user, session]);

  const fetchOrganizations = async () => {
    if (!userProfile?.id) {
      console.log('[ORG HOOK] No user profile available for fetching organizations');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('[ORG HOOK] Fetching organizations for user:', userProfile.id);
      const orgsWithRole = await fetchUserOrganizations(userProfile.id);
      console.log('[ORG HOOK] Successfully fetched organizations:', orgsWithRole);
      setOrganizations(orgsWithRole);
    } catch (error: any) {
      console.error('[ORG HOOK] Error fetching organizations:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בטעינת ארגונים",
        description: error.message || "לא ניתן לטעון את הארגונים. אנא רענן את הדף ונסה שוב.",
      });
      setOrganizations([]);
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
      return false;
    }

    if (!newOrgName.trim()) {
      toast({
        variant: "destructive",
        title: "שם ארגון חסר",
        description: "אנא הכנס שם ארגון תקין",
      });
      return false;
    }

    setCreating(true);
    console.log('[ORG HOOK] Creating organization:', newOrgName);

    try {
      const result = await createNewOrganization(newOrgName.trim(), userProfile.id);
      
      if (result.success) {
        toast({
          title: "ארגון נוצר בהצלחה!",
          description: `הארגון "${newOrgName}" נוצר והוספת כבעלים`,
        });
        
        // רענון רשימת הארגונים
        await fetchOrganizations();
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה ביצירת ארגון",
          description: result.error || "לא ניתן ליצור את הארגון",
        });
        return false;
      }
    } catch (error: any) {
      console.error('[ORG HOOK] Unexpected error during organization creation:', error);
      toast({
        variant: "destructive",
        title: "שגיאה ביצירת ארגון",
        description: "אירעה שגיאה לא צפויה. אנא נסה שוב.",
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