
-- Final comprehensive fix for RLS infinite recursion
-- This will completely reset and rebuild all policies with a different approach

-- Step 1: Completely disable RLS and drop everything
ALTER TABLE public.organization_user DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies (including the ones we just created)
DROP POLICY IF EXISTS "organization_user_select_policy" ON public.organization_user;
DROP POLICY IF EXISTS "organization_user_insert_policy" ON public.organization_user;
DROP POLICY IF EXISTS "organization_user_update_policy" ON public.organization_user;
DROP POLICY IF EXISTS "organization_user_delete_policy" ON public.organization_user;
DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete_policy" ON public.organizations;

-- Also drop any remaining legacy policies
DROP POLICY IF EXISTS "org_user_select" ON public.organization_user;
DROP POLICY IF EXISTS "org_user_insert" ON public.organization_user;
DROP POLICY IF EXISTS "org_user_update" ON public.organization_user;
DROP POLICY IF EXISTS "org_user_delete" ON public.organization_user;
DROP POLICY IF EXISTS "org_select" ON public.organizations;
DROP POLICY IF EXISTS "org_insert" ON public.organizations;
DROP POLICY IF EXISTS "org_update" ON public.organizations;
DROP POLICY IF EXISTS "org_delete" ON public.organizations;

-- Step 2: Create a very simple helper function that avoids any table references
DROP FUNCTION IF EXISTS public.get_current_user_id();
CREATE OR REPLACE FUNCTION public.current_user_uuid()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT id FROM public.users WHERE supabase_uid = auth.uid() LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

-- Step 3: Re-enable RLS
ALTER TABLE public.organization_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Step 4: Create the simplest possible policies using auth.uid() directly

-- Organization_user policies - ultra simple
CREATE POLICY "allow_own_org_user_select" ON public.organization_user
  FOR SELECT
  TO authenticated
  USING (user_id = public.current_user_uuid());

CREATE POLICY "allow_own_org_user_insert" ON public.organization_user
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.current_user_uuid());

CREATE POLICY "allow_own_org_user_update" ON public.organization_user
  FOR UPDATE
  TO authenticated
  USING (user_id = public.current_user_uuid());

CREATE POLICY "allow_own_org_user_delete" ON public.organization_user
  FOR DELETE
  TO authenticated
  USING (user_id = public.current_user_uuid());

-- Organizations policies - very simple, no complex joins
CREATE POLICY "allow_org_select" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_user 
      WHERE organization_id = organizations.id 
      AND user_id = public.current_user_uuid()
    )
  );

CREATE POLICY "allow_org_insert" ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = public.current_user_uuid());

CREATE POLICY "allow_org_update" ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (owner_id = public.current_user_uuid());

CREATE POLICY "allow_org_delete" ON public.organizations
  FOR DELETE
  TO authenticated
  USING (owner_id = public.current_user_uuid());
