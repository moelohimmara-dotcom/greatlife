-- Greatlife — Migration 014 : Élargir le RBAC pour les rôles éditoriaux
-- =================================================================
-- Active un RBAC réel par module. La matrice src/data/rbac.ts décrit
-- 6 rôles ; jusqu'ici seuls owner/manager entraient dans le panneau.
-- Cette migration élargit les policies RLS pour que editor (blog) et
-- marketing (médias) puissent réellement écrire les tables qu'ils gèrent,
-- en cohérence avec la matrice de permissions. chef hérite déjà de
-- menu_items (migration 007). Les modules de configuration sensibles
-- (site_content, admin_users, messages, reservations, orders) restent
-- réservés à owner/manager (et owner seul pour admin_users).

-- --- blog_posts : lecture des drafts + écriture pour owner/manager/editor ---
DROP POLICY IF EXISTS "blog_admin_read_drafts" ON public.blog_posts;
CREATE POLICY "blog_admin_read_drafts" ON public.blog_posts
  FOR SELECT TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager', 'editor']) OR published = true);

DROP POLICY IF EXISTS "blog_admin_write" ON public.blog_posts;
CREATE POLICY "blog_admin_write" ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager', 'editor']))
  WITH CHECK (public.is_admin(ARRAY['owner', 'manager', 'editor']));

-- --- media_assets : écriture pour owner/manager/editor/marketing ----------
DROP POLICY IF EXISTS "media_assets_admin_insert" ON public.media_assets;
CREATE POLICY "media_assets_admin_insert" ON public.media_assets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(ARRAY['owner', 'manager', 'editor', 'marketing']));

DROP POLICY IF EXISTS "media_assets_admin_update" ON public.media_assets;
CREATE POLICY "media_assets_admin_update" ON public.media_assets
  FOR UPDATE TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager', 'editor', 'marketing']))
  WITH CHECK (public.is_admin(ARRAY['owner', 'manager', 'editor', 'marketing']));

DROP POLICY IF EXISTS "media_assets_admin_delete" ON public.media_assets;
CREATE POLICY "media_assets_admin_delete" ON public.media_assets
  FOR DELETE TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager', 'editor', 'marketing']));

-- --- storage bucket 'media' : upload/delete pour owner/manager/editor/marketing
DROP POLICY IF EXISTS "media_admin_upload" ON storage.objects;
CREATE POLICY "media_admin_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.is_admin(ARRAY['owner', 'manager', 'editor', 'marketing']));

DROP POLICY IF EXISTS "media_admin_delete" ON storage.objects;
CREATE POLICY "media_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.is_admin(ARRAY['owner', 'manager', 'editor', 'marketing']));
