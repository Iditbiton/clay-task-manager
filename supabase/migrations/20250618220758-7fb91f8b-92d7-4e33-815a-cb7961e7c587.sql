
-- Final fix for infinite recursion - use auth.uid() directly without cross-table dependencies
-- This eliminates any potential for circular references

-- Step 1: Disable RLS temporarily
ALTER TABLE public.organization_user DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies completely
DROP POLICY IF EXISTS "org_user_own_select" ON public.organization_user;
DROP POLICY IF EXISTS "org_user_own_insert" ON public.organization_user;
DROP POLICY IF EXISTS "org_user_own_update" ON public.organization_user;
DROP POLICY IF EXISTS "org_user_own_delete" ON public.organization_user;
DROP POLICY IF EXISTS "org_owner_select" ON public.organizations;
DROP POLICY IF EXISTS "org_member_select" ON public.organizations;
DROP POLICY IF EXISTS "org_owner_insert" ON public.organizations;
DROP POLICY IF EXISTS "org_owner_update" ON public.organizations;
DROP POLICY IF EXISTS "org_owner_delete" ON public.organizations;

-- Drop any legacy policies that might still exist
DROP POLICY IF EXISTS "allow_own_org_user_select" ON public.organization_user;
DROP POLICY IF EXISTS "allow_own_org_user_insert" ON public.organization_user;
DROP POLICY IF EXISTS "allow_own_org_user_update" ON public.organization_user;
DROP POLICY IF EXISTS "allow_own_org_user_delete" ON public.organization_user;
DROP POLICY IF EXISTS "allow_org_select" ON public.organizations;
DROP POLICY IF EXISTS "allow_org_insert" ON public.organizations;
DROP POLICY IF EXISTS "allow_org_update" ON public.organizations;
DROP POLICY IF EXISTS "allow_org_delete" ON public.organizations;

-- Step 3: Create a simple helper function that gets user ID from users table
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.users WHERE supabase_uid = auth.uid() LIMIT 1;
$$;

-- Step 4: Re-enable RLS
ALTER TABLE public.organization_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple policies that avoid any cross-table queries

-- Organization_user policies - direct user check only
CREATE POLICY "user_can_select_own_org_memberships" ON public.organization_user
  FOR SELECT
  TO authenticated
  USING (user_id = public.current_app_user_id());

CREATE POLICY "user_can_insert_own_org_memberships" ON public.organization_user
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.current_app_user_id());

CREATE POLICY "user_can_update_own_org_memberships" ON public.organization_user
  FOR UPDATE
  TO authenticated
  USING (user_id = public.current_app_user_id());

CREATE POLICY "user_can_delete_own_org_memberships" ON public.organization_user
  FOR DELETE
  TO authenticated
  USING (user_id = public.current_app_user_id());

-- Organizations policies - owner-based access only (no member checks to avoid recursion)
CREATE POLICY "owner_can_select_organizations" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (owner_id = public.current_app_user_id());

CREATE POLICY "owner_can_insert_organizations" ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = public.current_app_user_id());

CREATE POLICY "owner_can_update_organizations" ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (owner_id = public.current_app_user_id());

CREATE POLICY "owner_can_delete_organizations" ON public.organizations
  FOR DELETE
  TO authenticated
  USING (owner_id = public.current_app_user_id());
