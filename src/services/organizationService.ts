import { supabase } from '@/integrations/supabase/client';
import { generateUuid } from '@/utils/uuid';
import type { Organization, OrganizationWithRole } from '@/types/organization';

export const fetchUserOrganizations = async (userId: string): Promise<OrganizationWithRole[]> => {
  console.log('[ORG SERVICE] Fetching organizations for user:', userId);
  
  try {
    // בדיקה ראשונה - האם המשתמש קיים בטבלת organization_user
    const { data: membershipData, error: membershipError } = await supabase
      .from('organization_user')
      .select('organization_id, role')
      .eq('user_id', userId);

    console.log('[ORG SERVICE] User memberships:', { membershipData, membershipError });

    if (membershipError) {
      console.error('[ORG SERVICE] Error fetching user memberships:', membershipError);
      throw new Error(`שגיאה בטעינת חברויות: ${membershipError.message}`);
    }

    if (!membershipData || membershipData.length === 0) {
      console.log('[ORG SERVICE] User has no organization memberships');
      return [];
    }

    // קבלת פרטי הארגונים
    const organizationIds = membershipData.map(m => m.organization_id);
    const { data: organizationsData, error: organizationsError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', organizationIds);

    console.log('[ORG SERVICE] Organizations data:', { organizationsData, organizationsError });

    if (organizationsError) {
      console.error('[ORG SERVICE] Error fetching organizations:', organizationsError);
      throw new Error(`שגיאה בטעינת ארגונים: ${organizationsError.message}`);
    }

    // שילוב הנתונים
    const orgsWithRole: OrganizationWithRole[] = organizationsData?.map(org => {
      const membership = membershipData.find(m => m.organization_id === org.id);
      return {
        ...org,
        role: membership?.role || 'member'
      };
    }) || [];
    
    console.log('[ORG SERVICE] Final organizations with roles:', orgsWithRole);
    return orgsWithRole;
  } catch (error: any) {
    console.error('[ORG SERVICE] Exception in fetchUserOrganizations:', error);
    throw error;
  }
};

export const createNewOrganization = async (
  orgName: string, 
  userId: string
): Promise<{ success: boolean; error?: string; organizationId?: string }> => {
  console.log('[ORG SERVICE] Creating organization:', orgName, 'for user:', userId);

  if (!orgName.trim()) {
    return { success: false, error: 'אנא הכנס שם ארגון' };
  }

  const newOrgId = generateUuid();

  try {
    // שלב 1: יצירת הארגון
    console.log('[ORG SERVICE] Step 1: Creating organization with ID:', newOrgId);
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        id: newOrgId,
        name: orgName.trim(),
        owner_id: userId
      })
      .select()
      .single();
    
    if (orgError) {
      console.error('[ORG SERVICE] Failed to create organization:', orgError);
      throw new Error(`יצירת ארגון נכשלה: ${orgError.message}`);
    }

    console.log('[ORG SERVICE] Organization created successfully:', orgData);
    
    // שלב 2: הוספת המשתמש כבעלים בטבלת organization_user
    console.log('[ORG SERVICE] Step 2: Adding user as owner to organization_user');
    const { error: userOrgError } = await supabase
      .from('organization_user')
      .insert({
        organization_id: newOrgId,
        user_id: userId,
        role: 'owner'
      });
    
    if (userOrgError) {
      console.error('[ORG SERVICE] Failed to create user-organization link:', userOrgError);
      
      // ניקוי הארגון אם יצירת החברות נכשלה
      console.log('[ORG SERVICE] Cleaning up organization due to membership creation failure');
      try {
        await supabase
          .from('organizations')
          .delete()
          .eq('id', newOrgId);
      } catch (cleanupError) {
        console.error('[ORG SERVICE] Failed to cleanup organization:', cleanupError);
      }
      
      throw new Error(`יצירת חברות בארגון נכשלה: ${userOrgError.message}`);
    }

    console.log('[ORG SERVICE] Organization and membership created successfully!');
    return { success: true, organizationId: newOrgId };
  } catch (error: any) {
    console.error('[ORG SERVICE] Error during organization creation:', error);
    return { 
      success: false, 
      error: error.message || "לא ניתן ליצור את הארגון. אנא נסה שוב." 
    };
  }
};

export const validateUserAccess = async (userId: string, organizationId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('organization_user')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      console.error('[ORG SERVICE] Error validating user access:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('[ORG SERVICE] Exception in validateUserAccess:', error);
    return false;
  }
};

// פונקציה לבדיקת חיבור למסד הנתונים
export const testDatabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('[ORG SERVICE] Testing database connection...');
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[ORG SERVICE] Database connection test failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[ORG SERVICE] Database connection test successful');
    return { success: true };
  } catch (error: any) {
    console.error('[ORG SERVICE] Database connection test exception:', error);
    return { success: false, error: error.message };
  }
};