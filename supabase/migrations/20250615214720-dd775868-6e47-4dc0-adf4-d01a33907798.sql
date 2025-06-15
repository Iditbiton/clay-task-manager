
-- מבטל את כל המדיניות בטבלת organization_user
DROP POLICY IF EXISTS "Users can be added to organizations" ON public.organization_user;

-- מפעיל RLS בטבלת organization_user
ALTER TABLE public.organization_user ENABLE ROW LEVEL SECURITY;

-- מאפשר SELECT לכל משתמש במערכת עבור שורות שהוא חלק מהן
CREATE POLICY "Users can view their organization_user rows"
  ON public.organization_user
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_id AND u.supabase_uid = auth.uid()
    )
  );

-- מאפשר למשתמשים להוסיף את עצמם לארגון בלבד (כלומר, user_id = id של המשתמש המחובר בלבד)
CREATE POLICY "Users can insert themselves"
  ON public.organization_user
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = user_id AND u.supabase_uid = auth.uid()
    )
  );

-- (רשות) מאפשר UPDATE רק על שורות של המשתמש עצמו ("רשות" כי כנראה לא קריטי כרגע)
CREATE POLICY "Users can update their own organization_user rows"
  ON public.organization_user
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_id AND u.supabase_uid = auth.uid()
    )
  );

-- (רשות) מחיקת שורות של המשתמש עצמו
CREATE POLICY "Users can delete their own organization_user rows"
  ON public.organization_user
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_id AND u.supabase_uid = auth.uid()
    )
  );
