-- Greatlife — Migration 007 : Fix RLS infinite recursion + anon insert
-- =====================================================================
-- Problem: admin_users RLS policy self-referenced admin_users, causing
-- infinite recursion when any table queried admin_users in its RLS policy.
--
-- Solution: Create a SECURITY DEFINER function that bypasses RLS,
-- and use it in all admin policies.

-- 1. Helper function that checks admin role WITHOUT RLS
CREATE OR REPLACE FUNCTION public.is_admin(role_filter text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.email = auth.jwt() ->> 'email'
      AND au.role = ANY(role_filter)
  )
$$;

-- 2. Fix admin_users self-referencing policy
DROP POLICY IF EXISTS "admin_users_owner_manage" ON public.admin_users;
CREATE POLICY "admin_users_owner_manage" ON public.admin_users
  FOR ALL TO authenticated
  USING (public.is_admin(ARRAY['owner']));

-- 3. Fix all admin policies to use is_admin()
DROP POLICY IF EXISTS "menu_admin_write" ON public.menu_items;
CREATE POLICY "menu_admin_write" ON public.menu_items
  FOR ALL TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager', 'chef']));

DROP POLICY IF EXISTS "content_admin_write" ON public.site_content;
CREATE POLICY "content_admin_write" ON public.site_content
  FOR ALL TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "messages_admin_read" ON public.messages;
CREATE POLICY "messages_admin_read" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "messages_admin_update" ON public.messages;
CREATE POLICY "messages_admin_update" ON public.messages
  FOR UPDATE TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "blog_admin_read_drafts" ON public.blog_posts;
CREATE POLICY "blog_admin_read_drafts" ON public.blog_posts
  FOR SELECT TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "blog_admin_write" ON public.blog_posts;
CREATE POLICY "blog_admin_write" ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "reservations_admin_read" ON public.reservations;
CREATE POLICY "reservations_admin_read" ON public.reservations
  FOR SELECT TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "reservations_admin_update" ON public.reservations;
CREATE POLICY "reservations_admin_update" ON public.reservations
  FOR UPDATE TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']));

-- 4. Allow anon to read messages (needed because supabase-js SDK sends
--    Prefer: return=representation by default, triggering a post-insert SELECT)
CREATE POLICY "messages_public_read" ON public.messages
  FOR SELECT TO anon, authenticated USING (true);

-- 5. Allow anon to read reservations (same reason)
CREATE POLICY "reservations_public_read" ON public.reservations
  FOR SELECT TO anon, authenticated USING (true);
