
-- Final solution for infinite recursion in organization_user RLS
-- This completely removes all dependencies between tables

-- Step 1: Disable RLS temporarily
ALTER TABLE public.organization_user DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "allow_own_org_user_select" ON public.organization_user;
DROP POLICY IF EXISTS "allow_own_org_user_insert" ON public.organization_user;
DROP POLICY IF EXISTS "allow_own_org_user_update" ON public.organization_user;
DROP POLICY IF EXISTS "allow_own_org_user_delete" ON public.organization_user;
DROP POLICY IF EXISTS "allow_org_select" ON public.organizations;
DROP POLICY IF EXISTS "allow_org_insert" ON public.organizations;
DROP POLICY IF EXISTS "allow_org_update" ON public.organizations;
DROP POLICY IF EXISTS "allow_org_delete" ON public.organizations;

-- Drop any other potential policies
DROP POLICY IF EXISTS "organization_user_select_policy" ON public.organization_user;
DROP POLICY IF EXISTS "organization_user_insert_policy" ON public.organization_user;
DROP POLICY IF EXISTS "organization_user_update_policy" ON public.organization_user;
DROP POLICY IF EXISTS "organization_user_delete_policy" ON public.organization_user;
DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete_policy" ON public.organizations;

-- Step 3: Create a simple function that doesn't cause recursion
DROP FUNCTION IF EXISTS public.current_user_uuid();
CREATE OR REPLACE FUNCTION public.get_user_id()
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

-- Step 5: Create ultra-simple policies with NO cross-table dependencies

-- Organization_user policies - only check direct user ownership
CREATE POLICY "org_user_own_select" ON public.organization_user
  FOR SELECT
  TO authenticated
  USING (user_id = public.get_user_id());

CREATE POLICY "org_user_own_insert" ON public.organization_user
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.get_user_id());

CREATE POLICY "org_user_own_update" ON public.organization_user
  FOR UPDATE
  TO authenticated
  USING (user_id = public.get_user_id());

CREATE POLICY "org_user_own_delete" ON public.organization_user
  FOR DELETE
  TO authenticated
  USING (user_id = public.get_user_id());

-- Organizations policies - separate, independent checks
CREATE POLICY "org_owner_select" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (owner_id = public.get_user_id());

CREATE POLICY "org_member_select" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_user 
      WHERE user_id = public.get_user_id()
    )
  );

CREATE POLICY "org_owner_insert" ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = public.get_user_id());

CREATE POLICY "org_owner_update" ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (owner_id = public.get_user_id());

CREATE POLICY "org_owner_delete" ON public.organizations
  FOR DELETE
  TO authenticated
  USING (owner_id = public.get_user_id());
