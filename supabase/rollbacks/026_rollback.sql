-- Rollback de 026_fix_nav_rls_recursion.sql
-- ===========================================
-- ATTENTION : ce rollback RESTAURE un defaut — la policy redevient recursive
-- et toute lecture publique de `navigation_items` repondra HTTP 500.
-- A n'utiliser que pour revenir strictement a l'etat de la migration 022.

DROP POLICY IF EXISTS "nav_items_public_read" ON public.navigation_items;
CREATE POLICY "nav_items_public_read" ON public.navigation_items
  FOR SELECT TO anon, authenticated USING (visible = true);

DROP FUNCTION IF EXISTS public.nav_item_is_public(uuid, text, uuid);
