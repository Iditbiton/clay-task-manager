
-- הוספת טבלת משימות (tasks)
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'paused', 'cancelled')),
  due_datetime TIMESTAMP WITH TIME ZONE,
  client_id UUID REFERENCES public.clients(id),
  category_id UUID REFERENCES public.categories(id),
  assigned_to_user_id UUID REFERENCES public.users(id),
  notes TEXT,
  color_hex TEXT DEFAULT '#3B82F6',
  is_ongoing BOOLEAN DEFAULT false,
  parent_task_id UUID REFERENCES public.tasks(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- הוספת RLS למשימות
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- מדיניות גישה למשימות - רק חברי ארגון יכולים לראות משימות של הארגון שלהם
CREATE POLICY "Organization members can view tasks" ON public.tasks
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_user ou
      INNER JOIN public.users u ON u.id = ou.user_id
      WHERE u.supabase_uid = auth.uid()
      AND ou.organization_id = tasks.organization_id
    )
  );

CREATE POLICY "Organization members can insert tasks" ON public.tasks
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_user ou
      INNER JOIN public.users u ON u.id = ou.user_id
      WHERE u.supabase_uid = auth.uid()
      AND ou.organization_id = tasks.organization_id
    )
  );

CREATE POLICY "Organization members can update tasks" ON public.tasks
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_user ou
      INNER JOIN public.users u ON u.id = ou.user_id
      WHERE u.supabase_uid = auth.uid()
      AND ou.organization_id = tasks.organization_id
    )
  );

CREATE POLICY "Organization members can delete tasks" ON public.tasks
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_user ou
      INNER JOIN public.users u ON u.id = ou.user_id
      WHERE u.supabase_uid = auth.uid()
      AND ou.organization_id = tasks.organization_id
    )
  );

-- הוספת RLS לטבלאות הקיימות
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- מדיניות גישה למשתמשים
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT 
  USING (supabase_uid = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE 
  USING (supabase_uid = auth.uid());

-- מדיניות גישה לארגונים - משתמשים יכולים לראות ארגונים שהם חברים בהם
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_user ou
      INNER JOIN public.users u ON u.id = ou.user_id
      WHERE u.supabase_uid = auth.uid()
      AND ou.organization_id = organizations.id
    )
  );

CREATE POLICY "Organization owners can update organizations" ON public.organizations
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_user ou
      INNER JOIN public.users u ON u.id = ou.user_id
      WHERE u.supabase_uid = auth.uid()
      AND ou.organization_id = organizations.id
      AND ou.role IN ('owner', 'admin')
    )
  );

-- מדיניות גישה לקישורי ארגון-משתמש
CREATE POLICY "Users can view organization memberships" ON public.organization_user
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.supabase_uid = auth.uid()
      AND (u.id = organization_user.user_id OR u.is_super_admin = true)
    )
  );

-- מדיניות גישה ללקוחות
CREATE POLICY "Organization members can view clients" ON public.clients
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_user ou
      INNER JOIN public.users u ON u.id = ou.user_id
      WHERE u.supabase_uid = auth.uid()
      AND ou.organization_id = clients.organization_id
    )
  );

CREATE POLICY "Organization members can manage clients" ON public.clients
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_user ou
      INNER JOIN public.users u ON u.id = ou.user_id
      WHERE u.supabase_uid = auth.uid()
      AND ou.organization_id = clients.organization_id
    )
  );

-- מדיניות גישה לקטגוריות
CREATE POLICY "Organization members can view categories" ON public.categories
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_user ou
      INNER JOIN public.users u ON u.id = ou.user_id
      WHERE u.supabase_uid = auth.uid()
      AND ou.organization_id = categories.organization_id
    )
  );

CREATE POLICY "Organization members can manage categories" ON public.categories
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_user ou
      INNER JOIN public.users u ON u.id = ou.user_id
      WHERE u.supabase_uid = auth.uid()
      AND ou.organization_id = categories.organization_id
    )
  );

-- פונקציה ליצירת משתמש אוטומטית כאשר מישהו נרשם
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (supabase_uid, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- טריגר שמפעיל את הפונקציה כאשר משתמש חדש נרשם
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
