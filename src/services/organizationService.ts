
import { supabase } from '@/integrations/supabase/client';
import { generateUuid } from '@/utils/uuid';
import type { Organization, OrganizationWithRole } from '@/types/organization';

export const fetchUserOrganizations = async (userId: string): Promise<OrganizationWithRole[]> => {
  console.log('[ORG SERVICE] Fetching organizations for user:', userId);
  
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
    .eq('user_id', userId);

  console.log('[ORG SERVICE] Organizations query result:', { data, error });
  
  if (error) {
    console.error('[ORG SERVICE] Error fetching organizations:', error);
    throw error;
  }
  
  const orgsWithRole = data?.map(item => ({
    ...(item.organizations as Organization),
    role: item.role
  })).filter(org => org.id) || [];
  
  console.log('[ORG SERVICE] Processed organizations:', orgsWithRole);
  return orgsWithRole;
};

export const createNewOrganization = async (
  orgName: string, 
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  console.log('[ORG SERVICE] Creating organization:', orgName);

  if (!orgName.trim()) {
    return { success: false, error: 'אנא הכנס שם ארגון' };
  }

  try {
    const newOrgId = generateUuid();

    // Create the organization
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

    console.log('[ORG SERVICE] Organization created successfully');
    
    // Add user as owner in organization_user
    const { error: userOrgError } = await supabase
      .from('organization_user')
      .insert({
        organization_id: newOrgId,
        user_id: userId,
        role: 'owner'
      });
    
    if (userOrgError) {
      console.error('[ORG SERVICE] Failed to create user-organization link:', userOrgError);
      
      // Cleanup the organization if membership creation failed
      const { error: cleanupError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', newOrgId);
      
      if (cleanupError) {
        console.error('[ORG SERVICE] Failed to cleanup organization:', cleanupError);
      }
      
      throw new Error(`יצירת חברות בארגון נכשלה: ${userOrgError.message}`);
    }

    console.log('[ORG SERVICE] Organization and membership created successfully!');
    return { success: true };
  } catch (error: any) {
    console.error('[ORG SERVICE] Error during organization creation:', error);
    return { success: false, error: error.message || "לא ניתן ליצור את הארגון" };
  }
};
