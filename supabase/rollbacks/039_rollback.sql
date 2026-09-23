-- Greatlife — Rollback de la migration 039
-- ============================================================================
-- Restaure :
--   - INSERT messages/reservations WITH CHECK (true) (état 010)
--   - blog_admin_write FOR ALL owner/manager/editor (état 014)
--   - suppression des triggers / fonctions de garde blog et prix commandes

DROP TABLE IF EXISTS public.contact_rate_buckets;

DROP TRIGGER IF EXISTS trg_orders_reprice_from_menu ON public.orders;
DROP FUNCTION IF EXISTS public.orders_reprice_from_menu();

DROP TRIGGER IF EXISTS trg_blog_guard_publish ON public.blog_posts;
DROP FUNCTION IF EXISTS public.blog_guard_publish();

DROP POLICY IF EXISTS "blog_staff_insert" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_staff_update" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_staff_delete" ON public.blog_posts;

CREATE POLICY "blog_admin_write" ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager', 'editor']))
  WITH CHECK (public.is_admin(ARRAY['owner', 'manager', 'editor']));

DROP POLICY IF EXISTS "messages_public_insert" ON public.messages;
CREATE POLICY "messages_public_insert" ON public.messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "reservations_public_insert" ON public.reservations;
CREATE POLICY "reservations_public_insert" ON public.reservations
  FOR INSERT TO anon, authenticated WITH CHECK (true);
