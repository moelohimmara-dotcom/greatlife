-- Rollback de 027_hide_empty_testimonials.sql
-- =============================================
-- Rend de nouveau visibles les sections « Avis » vides.
-- ATTENTION : cela restaure le comportement fautif (bloc vide en public).

UPDATE public.page_sections
SET visible = true
WHERE type = 'testimonials'
  AND coalesce(jsonb_array_length(content -> 'items'), 0) = 0;
