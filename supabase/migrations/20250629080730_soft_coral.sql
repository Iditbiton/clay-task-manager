-- תיקון סופי של בעיות RLS
-- מחיקת כל המדיניות הקיימות ויצירת מדיניות פשוטות וברורות

-- השבתת RLS זמנית
ALTER TABLE public.organization_user DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- מחיקת כל המדיניות הקיימות
DROP POLICY IF EXISTS "users_can_view_own_memberships" ON public.organization_user;
DROP POLICY IF EXISTS "users_can_create_own_memberships" ON public.organization_user;
DROP POLICY IF EXISTS "users_can_update_own_memberships" ON public.organization_user;
DROP POLICY IF EXISTS "users_can_delete_own_memberships" ON public.organization_user;
DROP POLICY IF EXISTS "members_can_view_organizations" ON public.organizations;
DROP POLICY IF EXISTS "authenticated_can_create_organizations" ON public.organizations;
DROP POLICY IF EXISTS "owners_can_update_organizations" ON public.organizations;
DROP POLICY IF EXISTS "owners_can_delete_organizations" ON public.organizations;

-- מחיקת מדיניות ישנות אחרות
DROP POLICY IF EXISTS "simple_org_user_select" ON public.organization_user;
DROP POLICY IF EXISTS "simple_org_user_insert" ON public.organization_user;
DROP POLICY IF EXISTS "simple_org_user_update" ON public.organization_user;
DROP POLICY IF EXISTS "simple_org_user_delete" ON public.organization_user;
DROP POLICY IF EXISTS "simple_org_select" ON public.organizations;
DROP POLICY IF EXISTS "simple_org_insert" ON public.organizations;
DROP POLICY IF EXISTS "simple_org_update" ON public.organizations;
DROP POLICY IF EXISTS "simple_org_delete" ON public.organizations;

-- יצירת פונקציה פשוטה וברורה
DROP FUNCTION IF EXISTS public.get_current_user_app_id();
CREATE OR REPLACE FUNCTION public.get_current_user_app_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.users WHERE supabase_uid = auth.uid() LIMIT 1;
$$;

-- הפעלת RLS מחדש
ALTER TABLE public.organization_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- יצירת מדיניות פשוטות לטבלת organization_user
CREATE POLICY "org_user_select_own" ON public.organization_user
  FOR SELECT
  TO authenticated
  USING (user_id = public.get_current_user_app_id());

CREATE POLICY "org_user_insert_own" ON public.organization_user
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.get_current_user_app_id());

CREATE POLICY "org_user_update_own" ON public.organization_user
  FOR UPDATE
  TO authenticated
  USING (user_id = public.get_current_user_app_id());

CREATE POLICY "org_user_delete_own" ON public.organization_user
  FOR DELETE
  TO authenticated
  USING (user_id = public.get_current_user_app_id());

-- יצירת מדיניות פשוטות לטבלת organizations
CREATE POLICY "org_select_member" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_user 
      WHERE user_id = public.get_current_user_app_id()
    )
  );

CREATE POLICY "org_insert_owner" ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = public.get_current_user_app_id());

CREATE POLICY "org_update_owner" ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (owner_id = public.get_current_user_app_id());

CREATE POLICY "org_delete_owner" ON public.organizations
  FOR DELETE
  TO authenticated
  USING (owner_id = public.get_current_user_app_id());

-- הוספת אינדקסים לשיפור ביצועים
CREATE INDEX IF NOT EXISTS idx_organization_user_user_id ON public.organization_user(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_user_org_id ON public.organization_user(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);