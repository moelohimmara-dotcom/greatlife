-- Rollback de 023_cms_page_versions.sql
-- =======================================
-- Redige AVANT application.
-- ATTENTION : supprime l'historique des versions. A n'executer que si l'on
-- renonce a la restauration de versions.

DROP POLICY IF EXISTS "versions_owner_delete" ON public.page_versions;
DROP POLICY IF EXISTS "versions_admin_insert" ON public.page_versions;
DROP POLICY IF EXISTS "versions_admin_read" ON public.page_versions;

DROP TABLE IF EXISTS public.page_versions;
