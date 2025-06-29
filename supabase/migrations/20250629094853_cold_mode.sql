-- תיקון סופי של בעיות הרשאות ביצירת ארגונים
-- מחיקת כל המדיניות הקיימות ויצירת מדיניות חדשות וברורות

-- השבתת RLS זמנית לניקוי
ALTER TABLE public.organization_user DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- מחיקת כל המדיניות הקיימות
DROP POLICY IF EXISTS "org_user_select_own" ON public.organization_user;
DROP POLICY IF EXISTS "org_user_insert_own" ON public.organization_user;
DROP POLICY IF EXISTS "org_user_update_own" ON public.organization_user;
DROP POLICY IF EXISTS "org_user_delete_own" ON public.organization_user;
DROP POLICY IF EXISTS "org_select_member" ON public.organizations;
DROP POLICY IF EXISTS "org_insert_owner" ON public.organizations;
DROP POLICY IF EXISTS "org_update_owner" ON public.organizations;
DROP POLICY IF EXISTS "org_delete_owner" ON public.organizations;

-- מחיקת מדיניות ישנות נוספות
DROP POLICY IF EXISTS "users_can_view_own_memberships" ON public.organization_user;
DROP POLICY IF EXISTS "users_can_create_own_memberships" ON public.organization_user;
DROP POLICY IF EXISTS "users_can_update_own_memberships" ON public.organization_user;
DROP POLICY IF EXISTS "users_can_delete_own_memberships" ON public.organization_user;
DROP POLICY IF EXISTS "members_can_view_organizations" ON public.organizations;
DROP POLICY IF EXISTS "authenticated_can_create_organizations" ON public.organizations;
DROP POLICY IF EXISTS "owners_can_update_organizations" ON public.organizations;
DROP POLICY IF EXISTS "owners_can_delete_organizations" ON public.organizations;

-- יצירת פונקציה מחדש
DROP FUNCTION IF EXISTS public.get_current_user_app_id();
CREATE OR REPLACE FUNCTION public.get_current_user_app_id()
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

-- הפעלת RLS מחדש
ALTER TABLE public.organization_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- מדיניות פשוטות לטבלת organization_user
CREATE POLICY "allow_user_own_memberships_select" ON public.organization_user
  FOR SELECT
  TO authenticated
  USING (user_id = public.get_current_user_app_id());

CREATE POLICY "allow_user_own_memberships_insert" ON public.organization_user
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.get_current_user_app_id());

CREATE POLICY "allow_user_own_memberships_update" ON public.organization_user
  FOR UPDATE
  TO authenticated
  USING (user_id = public.get_current_user_app_id());

CREATE POLICY "allow_user_own_memberships_delete" ON public.organization_user
  FOR DELETE
  TO authenticated
  USING (user_id = public.get_current_user_app_id());

-- מדיניות פשוטות לטבלת organizations
-- מדיניות SELECT - מאפשרת לראות ארגונים שהמשתמש חבר בהם
CREATE POLICY "allow_organizations_select" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.organization_user ou 
      WHERE ou.organization_id = organizations.id 
      AND ou.user_id = public.get_current_user_app_id()
    )
  );

-- מדיניות INSERT - מאפשרת ליצור ארגון חדש
CREATE POLICY "allow_organizations_insert" ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated' 
    AND owner_id = public.get_current_user_app_id()
  );

-- מדיניות UPDATE - רק בעלים יכול לעדכן
CREATE POLICY "allow_organizations_update" ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (owner_id = public.get_current_user_app_id());

-- מדיניות DELETE - רק בעלים יכול למחוק
CREATE POLICY "allow_organizations_delete" ON public.organizations
  FOR DELETE
  TO authenticated
  USING (owner_id = public.get_current_user_app_id());

-- הוספת אינדקסים לשיפור ביצועים
CREATE INDEX IF NOT EXISTS idx_organization_user_user_id_v2 ON public.organization_user(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_user_org_id_v2 ON public.organization_user(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id_v2 ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid_v2 ON public.users(supabase_uid);

-- בדיקת תקינות הפונקציה
DO $$
BEGIN
  -- בדיקה שהפונקציה עובדת
  PERFORM public.get_current_user_app_id();
  RAISE NOTICE 'Function get_current_user_app_id created successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create function: %', SQLERRM;
END $$;