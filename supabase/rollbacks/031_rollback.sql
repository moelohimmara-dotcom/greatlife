-- Rollback de 031_lock_draft_sections.sql
-- ========================================
-- Redige AVANT application.
--
-- Restaure la lecture anon de `page_sections`, telle qu'elle existait apres la
-- migration 021 (policy `sections_public_read`).
--
-- ATTENTION : ce rollback REMET LE BROUILLON EN LECTURE PUBLIQUE. Il ne doit
-- etre applique que si le site public est revenu au chemin de lecture
-- `page_sections` (c'est-a-dire si 030 a egalement ete rollbackee).

DROP POLICY IF EXISTS "sections_public_read" ON public.page_sections;
CREATE POLICY "sections_public_read" ON public.page_sections
  FOR SELECT TO anon, authenticated
  USING (
    visible = true
    AND EXISTS (
      SELECT 1 FROM public.pages p
      WHERE p.id = page_sections.page_id
        AND p.status = 'published'
    )
  );
