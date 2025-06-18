
-- Complete fix for organization_user infinite recursion
-- This migration will completely rebuild the RLS policies from scratch

-- Step 1: Disable RLS on both tables
ALTER TABLE public.organization_user DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies completely
DROP POLICY IF EXISTS "org_user_select" ON public.organization_user;
DROP POLICY IF EXISTS "org_user_insert" ON public.organization_user;
DROP POLICY IF EXISTS "org_user_update" ON public.organization_user;
DROP POLICY IF EXISTS "org_user_delete" ON public.organization_user;
DROP POLICY IF EXISTS "org_select" ON public.organizations;
DROP POLICY IF EXISTS "org_insert" ON public.organizations;
DROP POLICY IF EXISTS "org_update" ON public.organizations;
DROP POLICY IF EXISTS "org_delete" ON public.organizations;

-- Drop any legacy policies that might still exist
DROP POLICY IF EXISTS "Users can view their memberships" ON public.organization_user;
DROP POLICY IF EXISTS "Users can create their own memberships" ON public.organization_user;
DROP POLICY IF EXISTS "Users can update their own memberships" ON public.organization_user;
DROP POLICY IF EXISTS "Users can delete their own memberships" ON public.organization_user;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can update" ON public.organizations;

-- Step 3: Create a more robust helper function
DROP FUNCTION IF EXISTS public.get_current_user_id();
CREATE OR REPLACE FUNCTION public.get_current_user_id()
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

-- Step 5: Create completely new, non-recursive policies

-- Organization_user policies - using direct auth.uid() check to avoid recursion
CREATE POLICY "organization_user_select_policy" ON public.organization_user
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE supabase_uid = auth.uid()
    )
  );

CREATE POLICY "organization_user_insert_policy" ON public.organization_user
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE supabase_uid = auth.uid()
    )
  );

CREATE POLICY "organization_user_update_policy" ON public.organization_user
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE supabase_uid = auth.uid()
    )
  );

CREATE POLICY "organization_user_delete_policy" ON public.organization_user
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE supabase_uid = auth.uid()
    )
  );

-- Organizations policies - using simple joins to avoid recursion
CREATE POLICY "organizations_select_policy" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ou.organization_id 
      FROM public.organization_user ou
      JOIN public.users u ON ou.user_id = u.id
      WHERE u.supabase_uid = auth.uid()
    )
  );

CREATE POLICY "organizations_insert_policy" ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated' AND
    owner_id IN (
      SELECT id FROM public.users WHERE supabase_uid = auth.uid()
    )
  );

CREATE POLICY "organizations_update_policy" ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    owner_id IN (
      SELECT id FROM public.users WHERE supabase_uid = auth.uid()
    )
  );

CREATE POLICY "organizations_delete_policy" ON public.organizations
  FOR DELETE
  TO authenticated
  USING (
    owner_id IN (
      SELECT id FROM public.users WHERE supabase_uid = auth.uid()
    )
  );
