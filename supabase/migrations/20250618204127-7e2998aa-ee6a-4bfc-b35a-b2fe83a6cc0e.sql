
-- Migration to completely fix RLS infinite recursion issues
-- Step 1: Disable RLS temporarily to clean up
ALTER TABLE public.organization_user DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies to start completely fresh
DROP POLICY IF EXISTS "Users can view their memberships" ON public.organization_user;
DROP POLICY IF EXISTS "Users can create their own memberships" ON public.organization_user;
DROP POLICY IF EXISTS "Users can update their own memberships" ON public.organization_user;
DROP POLICY IF EXISTS "Users can delete their own memberships" ON public.organization_user;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can update" ON public.organizations;

-- Drop any other potential policies that might exist
DROP POLICY IF EXISTS "Users can view their organization_user rows" ON public.organization_user;
DROP POLICY IF EXISTS "Users can insert themselves" ON public.organization_user;
DROP POLICY IF EXISTS "Users can update their own organization_user rows" ON public.organization_user;
DROP POLICY IF EXISTS "Users can delete their own organization_user rows" ON public.organization_user;
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can update organizations" ON public.organizations;

-- Step 3: Create helper function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.users WHERE supabase_uid = auth.uid();
$$;

-- Step 4: Re-enable RLS
ALTER TABLE public.organization_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Step 5: Create new, simple policies using the helper function

-- Organization_user policies
CREATE POLICY "org_user_select" ON public.organization_user
  FOR SELECT
  USING (user_id = public.get_current_user_id());

CREATE POLICY "org_user_insert" ON public.organization_user
  FOR INSERT
  WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "org_user_update" ON public.organization_user
  FOR UPDATE
  USING (user_id = public.get_current_user_id());

CREATE POLICY "org_user_delete" ON public.organization_user
  FOR DELETE
  USING (user_id = public.get_current_user_id());

-- Organizations policies - much simpler approach
CREATE POLICY "org_select" ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_user ou 
      WHERE ou.organization_id = organizations.id 
      AND ou.user_id = public.get_current_user_id()
    )
  );

CREATE POLICY "org_insert" ON public.organizations
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    owner_id = public.get_current_user_id()
  );

CREATE POLICY "org_update" ON public.organizations
  FOR UPDATE
  USING (owner_id = public.get_current_user_id());

CREATE POLICY "org_delete" ON public.organizations
  FOR DELETE
  USING (owner_id = public.get_current_user_id());
