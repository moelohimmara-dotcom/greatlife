-- Greatlife — Rollback de la migration 032
-- ============================================================================
-- Remet `hero.subtitle` et `story.body` sous forme de chaîne simple.
--
-- GARDE-FOU IMPORTANT : on ne dé-enveloppe QUE les valeurs qui n'ont AUCUNE
-- traduction anglaise (`? 'en'` est faux). Si le restaurateur a renseigné
-- l'anglais entre-temps, cette version de l'information n'existerait plus sous
-- forme de chaîne simple : la dé-envelopper DÉTRUIRAIT un travail réel.
-- Ces valeurs-là sont donc laissées intactes.

-- 1. hero.subtitle -----------------------------------------------------------
UPDATE public.page_sections
SET content = jsonb_set(content, '{subtitle}', to_jsonb(content -> 'subtitle' ->> 'fr'))
WHERE type = 'hero'
  AND jsonb_typeof(content -> 'subtitle') = 'object'
  AND content -> 'subtitle' ? 'fr'
  AND NOT (content -> 'subtitle' ? 'en');

-- 2. story.body --------------------------------------------------------------
UPDATE public.page_sections
SET content = jsonb_set(content, '{body}', to_jsonb(content -> 'body' ->> 'fr'))
WHERE type = 'story'
  AND jsonb_typeof(content -> 'body') = 'object'
  AND content -> 'body' ? 'fr'
  AND NOT (content -> 'body' ? 'en');
