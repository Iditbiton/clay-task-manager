
-- Drop the old, less specific insert policy on the organizations table.
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Add a more specific and secure policy for creating organizations.
-- This policy ensures that the user creating the organization is authenticated,
-- and that they are setting themselves as the owner of the new organization.
CREATE POLICY "Authenticated users can create organizations" ON public.organizations
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = owner_id AND u.supabase_uid = auth.uid()
    )
  );
