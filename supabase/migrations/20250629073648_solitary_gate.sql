/*
  # תיקון מדיניות RLS לארגונים ומשתמשים

  1. מחיקת כל המדיניות הקיימות
  2. יצירת מדיניות חדשות ופשוטות יותר
  3. תיקון הבעיות ברקורסיה
  4. הוספת גישה לחברי ארגון
*/

-- מחיקת כל המדיניות הקיימות
DROP POLICY IF EXISTS "simple_org_user_select" ON public.organization_user;
DROP POLICY IF EXISTS "simple_org_user_insert" ON public.organization_user;
DROP POLICY IF EXISTS "simple_org_user_update" ON public.organization_user;
DROP POLICY IF EXISTS "simple_org_user_delete" ON public.organization_user;
DROP POLICY IF EXISTS "simple_org_select" ON public.organizations;
DROP POLICY IF EXISTS "simple_org_insert" ON public.organizations;
DROP POLICY IF EXISTS "simple_org_update" ON public.organizations;
DROP POLICY IF EXISTS "simple_org_delete" ON public.organizations;

-- יצירת פונקציה פשוטה לקבלת ID של המשתמש הנוכחי
CREATE OR REPLACE FUNCTION public.get_current_user_app_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.users WHERE supabase_uid = auth.uid() LIMIT 1;
$$;

-- מדיניות חדשה לטבלת organization_user
CREATE POLICY "users_can_view_own_memberships" ON public.organization_user
  FOR SELECT
  TO authenticated
  USING (user_id = public.get_current_user_app_id());

CREATE POLICY "users_can_create_own_memberships" ON public.organization_user
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.get_current_user_app_id());

CREATE POLICY "users_can_update_own_memberships" ON public.organization_user
  FOR UPDATE
  TO authenticated
  USING (user_id = public.get_current_user_app_id());

CREATE POLICY "users_can_delete_own_memberships" ON public.organization_user
  FOR DELETE
  TO authenticated
  USING (user_id = public.get_current_user_app_id());

-- מדיניות חדשה לטבלת organizations - מאפשרת גישה גם לחברים
CREATE POLICY "members_can_view_organizations" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_user 
      WHERE user_id = public.get_current_user_app_id()
    )
  );

CREATE POLICY "authenticated_can_create_organizations" ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = public.get_current_user_app_id());

CREATE POLICY "owners_can_update_organizations" ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (owner_id = public.get_current_user_app_id());

CREATE POLICY "owners_can_delete_organizations" ON public.organizations
  FOR DELETE
  TO authenticated
  USING (owner_id = public.get_current_user_app_id());