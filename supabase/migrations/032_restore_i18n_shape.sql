-- Greatlife — Migration 032 : rétablir la forme bilingue des textes abîmés
-- ============================================================================
-- POURQUOI
-- `MultilineField` (src/admin/editor/PropertyPanel.tsx) écrivait une CHAÎNE
-- SIMPLE là où la valeur était un objet `{ fr, en }` : il n'avait pas la branche
-- bilingue que possède `TextField`. Deux champs ont été abîmés ainsi, le
-- 2026-09-19 à 15:31:45 :
--     hero.subtitle   :  { fr: "..." }   ->  "Produits 100% bio, ..."
--     story.body      :  { fr: "..." }   ->  "Greatlife est né d'une ..."
--
-- CE QUI A ÉTÉ PERDU, EXACTEMENT
-- Pas de texte anglais : mesuré, les 61 valeurs bilingues du contenu ont TOUTES
-- un `en` vide. L'anglais n'est pas encore renseigné sur ce site.
-- Ce qui a été perdu, c'est la STRUCTURE. Conséquences réelles :
--   - l'éditeur ne peut plus présenter de champ anglais pour ces textes, donc
--     le restaurateur ne peut plus en ajouter ;
--   - le contrôle « n'est pas encore traduit en anglais » ne se déclenche plus,
--     puisqu'il ne s'applique qu'aux objets : l'anomalie devenait invisible.
--
-- CE QUE FAIT CETTE MIGRATION
-- Elle ré-enveloppe le texte EXISTANT dans sa forme bilingue. Elle ne recopie
-- aucun contenu en dur : elle prend la valeur telle qu'elle est, donc elle ne
-- peut pas écraser une correction du restaurateur.
-- Garde-fou : elle ne touche QUE les valeurs qui sont encore des chaînes
-- (`jsonb_typeof = 'string'`), et uniquement sur les deux champs concernés.
-- Elle est donc IDEMPOTENTE : une seconde exécution ne change rien.
--
-- PRÉREQUIS
-- Le code doit avoir été corrigé AVANT (sinon la prochaine édition dans
-- l'éditeur re-casserait la forme). Le correctif de `MultilineField` et le
-- contrôle du validateur sont dans le même lot.

-- 1. hero.subtitle -----------------------------------------------------------
UPDATE public.page_sections
SET content = jsonb_set(content, '{subtitle}', jsonb_build_object('fr', content ->> 'subtitle'))
WHERE type = 'hero'
  AND jsonb_typeof(content -> 'subtitle') = 'string';

-- 2. story.body --------------------------------------------------------------
UPDATE public.page_sections
SET content = jsonb_set(content, '{body}', jsonb_build_object('fr', content ->> 'body'))
WHERE type = 'story'
  AND jsonb_typeof(content -> 'body') = 'string';

-- Contrôle : il ne doit rester AUCUNE chaîne simple sur ces deux champs.
DO $$
DECLARE
  restants integer;
BEGIN
  SELECT count(*) INTO restants
  FROM public.page_sections
  WHERE (type = 'hero'  AND jsonb_typeof(content -> 'subtitle') = 'string')
     OR (type = 'story' AND jsonb_typeof(content -> 'body')     = 'string');

  IF restants > 0 THEN
    RAISE EXCEPTION 'Migration 032 incomplete : % champ(s) encore au format chaine.', restants;
  END IF;
END $$;
