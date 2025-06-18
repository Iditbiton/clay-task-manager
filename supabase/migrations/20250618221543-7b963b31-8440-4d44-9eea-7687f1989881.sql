
-- Complete cleanup and rebuild of all RLS policies to eliminate infinite recursion
-- This migration will remove ALL existing policies and create ultra-simple ones

-- Step 1: Disable RLS completely to clear any remaining issues
ALTER TABLE public.organization_user DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL possible policy names that might still exist
DROP POLICY IF EXISTS "user_can_select_own_org_memberships" ON public.organization_user;
DROP POLICY IF EXISTS "user_can_insert_own_org_memberships" ON public.organization_user;
DROP POLICY IF EXISTS "user_can_update_own_org_memberships" ON public.organization_user;
DROP POLICY IF EXISTS "user_can_delete_own_org_memberships" ON public.organization_user;
DROP POLICY IF EXISTS "owner_can_select_organizations" ON public.organizations;
DROP POLICY IF EXISTS "owner_can_insert_organizations" ON public.organizations;
DROP POLICY IF EXISTS "owner_can_update_organizations" ON public.organizations;
DROP POLICY IF EXISTS "owner_can_delete_organizations" ON public.organizations;

-- Drop any other legacy policies that might exist
DROP POLICY IF EXISTS "org_user_own_select" ON public.organization_user;
DROP POLICY IF EXISTS "org_user_own_insert" ON public.organization_user;
DROP POLICY IF EXISTS "org_user_own_update" ON public.organization_user;
DROP POLICY IF EXISTS "org_user_own_delete" ON public.organization_user;
DROP POLICY IF EXISTS "org_owner_select" ON public.organizations;
DROP POLICY IF EXISTS "org_member_select" ON public.organizations;
DROP POLICY IF EXISTS "org_owner_insert" ON public.organizations;
DROP POLICY IF EXISTS "org_owner_update" ON public.organizations;
DROP POLICY IF EXISTS "org_owner_delete" ON public.organizations;

-- Step 3: Drop and recreate the helper function to ensure it's clean
DROP FUNCTION IF EXISTS public.current_app_user_id();
DROP FUNCTION IF EXISTS public.get_user_id();
DROP FUNCTION IF EXISTS public.current_user_uuid();

CREATE OR REPLACE FUNCTION public.get_current_user_app_id()
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

-- Step 5: Create the simplest possible policies with NO cross-table references

-- Organization_user policies - only check user_id column
CREATE POLICY "simple_org_user_select" ON public.organization_user
  FOR SELECT
  TO authenticated
  USING (user_id = public.get_current_user_app_id());

CREATE POLICY "simple_org_user_insert" ON public.organization_user
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.get_current_user_app_id());

CREATE POLICY "simple_org_user_update" ON public.organization_user
  FOR UPDATE
  TO authenticated
  USING (user_id = public.get_current_user_app_id());

CREATE POLICY "simple_org_user_delete" ON public.organization_user
  FOR DELETE
  TO authenticated
  USING (user_id = public.get_current_user_app_id());

-- Organizations policies - only check owner_id column (NO member checks)
CREATE POLICY "simple_org_select" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (owner_id = public.get_current_user_app_id());

CREATE POLICY "simple_org_insert" ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = public.get_current_user_app_id());

CREATE POLICY "simple_org_update" ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (owner_id = public.get_current_user_app_id());

CREATE POLICY "simple_org_delete" ON public.organizations
  FOR DELETE
  TO authenticated
  USING (owner_id = public.get_current_user_app_id());
