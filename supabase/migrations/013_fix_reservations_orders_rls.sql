-- Greatlife — Migration 013 : Correction de la récursion RLS sur reservations & orders
-- ============================================================================
-- Les migrations 006 (reservations) et 012 (orders) référencent directement
-- public.admin_users dans leurs policies admin. Cela provoque une récursion
-- infinie de RLS (le bug corrigé sur les autres tables par la migration 007).
-- On remplace ici ces policies par des versions basées sur public.is_admin(),
-- conformément à la « règle d'or » documentée dans database.md / DEVELOPMENT.md.

-- --- reservations -----------------------------------------------------------
DROP POLICY IF EXISTS "reservations_admin_read" ON public.reservations;
CREATE POLICY "reservations_admin_read" ON public.reservations
  FOR SELECT TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "reservations_admin_update" ON public.reservations;
CREATE POLICY "reservations_admin_update" ON public.reservations
  FOR UPDATE TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']))
  WITH CHECK (public.is_admin(ARRAY['owner', 'manager']));

-- --- orders ----------------------------------------------------------------
DROP POLICY IF EXISTS "orders_admin_read" ON public.orders;
CREATE POLICY "orders_admin_read" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;
CREATE POLICY "orders_admin_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']))
  WITH CHECK (public.is_admin(ARRAY['owner', 'manager']));
