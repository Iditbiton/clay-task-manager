import { supabase } from '@/integrations/supabase/client';
import { generateUuid } from '@/utils/uuid';
import type { Organization, OrganizationWithRole } from '@/types/organization';

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

// בדיקת הרשאות המשתמש
export const checkUserPermissions = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('[ORG SERVICE] Checking user permissions for:', userId);
    
    // בדיקה שהמשתמש קיים
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, supabase_uid')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'משתמש לא נמצא במסד הנתונים' };
    }

    // בדיקת הפונקציה get_current_user_app_id
    const { data: functionResult, error: functionError } = await supabase
      .rpc('get_current_user_app_id');

    if (functionError) {
      return { success: false, error: `בעיה בפונקציית הרשאות: ${functionError.message}` };
    }

    console.log('[ORG SERVICE] User permissions check successful');
    return { success: true };
  } catch (error: any) {
    console.error('[ORG SERVICE] User permissions check failed:', error);
    return { success: false, error: error.message };
  }
};

export const fetchUserOrganizations = async (userId: string): Promise<OrganizationWithRole[]> => {
  console.log('[ORG SERVICE] Fetching organizations for user:', userId);
  
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // בדיקה ראשונה - בדיקת חיבור למסד הנתונים
    const connectionTest = await testDatabaseConnection();
    if (!connectionTest.success) {
      throw new Error(`בעיית חיבור למסד הנתונים: ${connectionTest.error}`);
    }

    // בדיקה שנייה - בדיקת הרשאות המשתמש
    const permissionsTest = await checkUserPermissions(userId);
    if (!permissionsTest.success) {
      throw new Error(`בעיית הרשאות: ${permissionsTest.error}`);
    }

    // בדיקה שלישית - האם המשתמש קיים בטבלת organization_user
    console.log('[ORG SERVICE] Checking user memberships...');
    const { data: membershipData, error: membershipError } = await supabase
      .from('organization_user')
      .select('organization_id, role')
      .eq('user_id', userId);

    console.log('[ORG SERVICE] User memberships query result:', { 
      membershipData, 
      membershipError,
      userId 
    });

    if (membershipError) {
      console.error('[ORG SERVICE] Error fetching user memberships:', membershipError);
      
      // בדיקה אם זו בעיית RLS
      if (membershipError.message.includes('RLS') || membershipError.message.includes('policy')) {
        throw new Error('בעיית הרשאות במסד הנתונים. אנא התחבר מחדש.');
      }
      
      throw new Error(`שגיאה בטעינת חברויות: ${membershipError.message}`);
    }

    if (!membershipData || membershipData.length === 0) {
      console.log('[ORG SERVICE] User has no organization memberships');
      return [];
    }

    // בדיקה רביעית - קבלת פרטי הארגונים
    console.log('[ORG SERVICE] Fetching organization details...');
    const organizationIds = membershipData.map(m => m.organization_id);
    
    const { data: organizationsData, error: organizationsError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', organizationIds);

    console.log('[ORG SERVICE] Organizations query result:', { 
      organizationsData, 
      organizationsError,
      organizationIds 
    });

    if (organizationsError) {
      console.error('[ORG SERVICE] Error fetching organizations:', organizationsError);
      throw new Error(`שגיאה בטעינת ארגונים: ${organizationsError.message}`);
    }

    if (!organizationsData || organizationsData.length === 0) {
      console.warn('[ORG SERVICE] No organizations found for user memberships');
      return [];
    }

    // שילוב הנתונים
    const orgsWithRole: OrganizationWithRole[] = organizationsData.map(org => {
      const membership = membershipData.find(m => m.organization_id === org.id);
      return {
        ...org,
        role: membership?.role || 'member'
      };
    });
    
    console.log('[ORG SERVICE] Final organizations with roles:', orgsWithRole);
    return orgsWithRole;
    
  } catch (error: any) {
    console.error('[ORG SERVICE] Exception in fetchUserOrganizations:', error);
    
    // הוספת מידע נוסף לשגיאה
    if (error.message.includes('JWT')) {
      throw new Error('בעיית אימות. אנא התחבר מחדש.');
    }
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      throw new Error('בעיית רשת. אנא בדוק את החיבור לאינטרנט.');
    }
    
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

  if (!userId) {
    return { success: false, error: 'משתמש לא מזוהה' };
  }

  const newOrgId = generateUuid();

  try {
    // בדיקת חיבור למסד הנתונים
    const connectionTest = await testDatabaseConnection();
    if (!connectionTest.success) {
      throw new Error(`בעיית חיבור למסד הנתונים: ${connectionTest.error}`);
    }

    // בדיקת הרשאות המשתמש
    const permissionsTest = await checkUserPermissions(userId);
    if (!permissionsTest.success) {
      throw new Error(`בעיית הרשאות: ${permissionsTest.error}`);
    }

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
      
      if (orgError.message.includes('RLS') || orgError.message.includes('policy')) {
        throw new Error('אין הרשאה ליצור ארגון. אנא התחבר מחדש או פנה למנהל המערכת.');
      }
      
      if (orgError.message.includes('duplicate') || orgError.message.includes('unique')) {
        throw new Error('ארגון עם שם זה כבר קיים. אנא בחר שם אחר.');
      }
      
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
        console.log('[ORG SERVICE] Organization cleanup completed');
      } catch (cleanupError) {
        console.error('[ORG SERVICE] Failed to cleanup organization:', cleanupError);
      }
      
      if (userOrgError.message.includes('RLS') || userOrgError.message.includes('policy')) {
        throw new Error('בעיית הרשאות ביצירת חברות בארגון. אנא התחבר מחדש.');
      }
      
      if (userOrgError.message.includes('duplicate') || userOrgError.message.includes('unique')) {
        throw new Error('המשתמש כבר חבר בארגון זה.');
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