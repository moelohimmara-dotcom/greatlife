-- Rollback de 021_cms_pages_sections.sql
-- ========================================
-- Redige AVANT application (TDR §29 : migration reversible).
--
-- ATTENTION : la suppression de `pages` detruit par cascade les sections
-- qu'elle contient. A n'executer que si l'on renonce definitivement au
-- contenu CMS cree apres la migration.

DROP POLICY IF EXISTS "sections_admin_write" ON public.page_sections;
DROP POLICY IF EXISTS "sections_admin_read" ON public.page_sections;
DROP POLICY IF EXISTS "sections_public_read" ON public.page_sections;
DROP POLICY IF EXISTS "pages_admin_write" ON public.pages;
DROP POLICY IF EXISTS "pages_admin_read" ON public.pages;
DROP POLICY IF EXISTS "pages_public_read" ON public.pages;

DROP TRIGGER IF EXISTS page_sections_set_updated_at ON public.page_sections;
DROP TRIGGER IF EXISTS pages_set_updated_at ON public.pages;
-- La fonction set_updated_at() n'est PAS supprimee : elle sera reutilisee
-- par les tables des migrations suivantes. Sa suppression est laissee a un
-- nettoyage explicite ulterieur.

DROP TABLE IF EXISTS public.page_sections;
DROP TABLE IF EXISTS public.pages;
