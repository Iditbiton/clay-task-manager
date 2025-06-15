
-- Create a function to check if the current user is a member of an organization.
-- Using SECURITY DEFINER avoids recursion from RLS policies.
CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organization_user ou
    JOIN public.users u ON ou.user_id = u.id
    WHERE u.supabase_uid = auth.uid() AND ou.organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if the current user is an admin or owner of an organization.
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organization_user ou
    JOIN public.users u ON ou.user_id = u.id
    WHERE u.supabase_uid = auth.uid()
    AND ou.organization_id = org_id
    AND ou.role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old, recursive policies on 'organizations' table.
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can update organizations" ON public.organizations;

-- Recreate policies on 'organizations' using the new functions.
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT
  USING (public.is_org_member(id));

CREATE POLICY "Organization owners can update organizations" ON public.organizations
  FOR UPDATE
  USING (public.is_org_admin(id));

-- Add policy to allow authenticated users to create new organizations.
CREATE POLICY "Authenticated users can create organizations" ON public.organizations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Add policy to allow users to be added to an organization.
-- This allows a user to add themselves to an org (e.g., when creating it).
CREATE POLICY "Users can be added to organizations" ON public.organization_user
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = public.organization_user.user_id AND supabase_uid = auth.uid()));

