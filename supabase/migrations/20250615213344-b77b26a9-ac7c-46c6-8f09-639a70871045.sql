
-- מחיקת כל המדיניות הישנות על organizations
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- הפעלת RLS אם במקרה הופסק
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- מדיניות לצפייה — רק לחברי הארגון
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT
  USING (
    public.is_org_member(id)
  );

-- מדיניות לעדכון — רק מנהל/בעלים
CREATE POLICY "Organization owners can update organizations" ON public.organizations
  FOR UPDATE
  USING (
    public.is_org_admin(id)
  );

-- מדיניות יצירת ארגון — רק משתמש מאומת ששם את עצמו owner
CREATE POLICY "Authenticated users can create organizations" ON public.organizations
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = owner_id AND u.supabase_uid = auth.uid()
    )
  );
