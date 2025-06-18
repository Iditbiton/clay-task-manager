
-- Fix infinite recursion in organization_user RLS policies

-- Drop all existing policies on organization_user to start fresh
DROP POLICY IF EXISTS "Users can view their organization_user rows" ON public.organization_user;
DROP POLICY IF EXISTS "Users can insert themselves" ON public.organization_user;
DROP POLICY IF EXISTS "Users can update their own organization_user rows" ON public.organization_user;
DROP POLICY IF EXISTS "Users can delete their own organization_user rows" ON public.organization_user;

-- Drop problematic policies on organizations that might cause recursion
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Enable RLS on both tables
ALTER TABLE public.organization_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Simple, non-recursive policies for organization_user
CREATE POLICY "Users can view their memberships" ON public.organization_user
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE supabase_uid = auth.uid()
    )
  );

CREATE POLICY "Users can create their own memberships" ON public.organization_user
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE supabase_uid = auth.uid()
    )
  );

CREATE POLICY "Users can update their own memberships" ON public.organization_user
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE supabase_uid = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own memberships" ON public.organization_user
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE supabase_uid = auth.uid()
    )
  );

-- Simple policies for organizations that don't use the problematic functions
CREATE POLICY "Users can view organizations they belong to" ON public.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_user ou
      JOIN public.users u ON ou.user_id = u.id
      WHERE u.supabase_uid = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create organizations" ON public.organizations
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    owner_id IN (
      SELECT id FROM public.users WHERE supabase_uid = auth.uid()
    )
  );

CREATE POLICY "Organization owners can update" ON public.organizations
  FOR UPDATE
  USING (
    owner_id IN (
      SELECT id FROM public.users WHERE supabase_uid = auth.uid()
    )
  );
