-- Rollback de 022_cms_navigation.sql
-- ====================================
-- Redige AVANT application. La navigation est recreee par la migration 025
-- (migration de contenu) : ce rollback ne perd donc rien d'irrecuperable.

DROP POLICY IF EXISTS "nav_items_admin_write" ON public.navigation_items;
DROP POLICY IF EXISTS "nav_items_public_read" ON public.navigation_items;
DROP POLICY IF EXISTS "navigation_admin_write" ON public.navigation;
DROP POLICY IF EXISTS "navigation_public_read" ON public.navigation;

DROP TRIGGER IF EXISTS navigation_items_set_updated_at ON public.navigation_items;
DROP TRIGGER IF EXISTS navigation_set_updated_at ON public.navigation;

DROP TABLE IF EXISTS public.navigation_items;
DROP TABLE IF EXISTS public.navigation;
