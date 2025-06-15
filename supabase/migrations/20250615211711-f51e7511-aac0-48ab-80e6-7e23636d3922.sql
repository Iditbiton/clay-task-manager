
-- Enable Row Level Security on the users table if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile."
ON public.users FOR SELECT
USING (auth.uid() = supabase_uid);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile."
ON public.users FOR INSERT
WITH CHECK (auth.uid() = supabase_uid);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile."
ON public.users FOR UPDATE
USING (auth.uid() = supabase_uid);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete their own profile."
ON public.users FOR DELETE
USING (auth.uid() = supabase_uid);
