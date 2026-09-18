-- Greatlife — Migration 027 : rattrapage de la migration 025
-- ===========================================================
-- La migration 025 creait la section « Avis clients » avec `visible = true`
-- alors que le document de conception (`docs/04_CONTENT_MODEL.md` §9.2) impose
-- qu'elle reste MASQUEE tant qu'aucun avis n'existe : un bloc vide ne doit pas
-- apparaitre sur le site public.
--
-- 025 a ete corrigee pour les installations futures. Cette migration corrige
-- les bases ou elle a deja ete appliquee.
--
-- Idempotente. Reversible par : supabase/rollbacks/027_rollback.sql

UPDATE public.page_sections
SET visible = false
WHERE type = 'testimonials'
  AND coalesce(jsonb_array_length(content -> 'items'), 0) = 0
  AND visible = true;

DO $$
DECLARE
  nb_visibles int;
BEGIN
  SELECT count(*) INTO nb_visibles
  FROM public.page_sections
  WHERE type = 'testimonials'
    AND coalesce(jsonb_array_length(content -> 'items'), 0) = 0
    AND visible = true;

  IF nb_visibles > 0 THEN
    RAISE EXCEPTION 'Migration 027 : % section(s) « Avis » vide(s) encore visible(s)', nb_visibles;
  END IF;

  RAISE NOTICE 'Migration 027 : sections « Avis » vides masquees';
END
$$;
