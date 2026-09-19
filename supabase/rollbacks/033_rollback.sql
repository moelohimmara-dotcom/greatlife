-- Greatlife — Rollback de la migration 033
-- ============================================================================
-- Retire la contrainte `pages_published_requires_snapshot`.
--
-- ⚠️ CE ROLLBACK ROUVRE LE DÉFAUT QU'ELLE FERME
-- Après ce rollback, `status = 'published'` avec `published_snapshot IS NULL`
-- redevient accepté : une page peut être publiée sans que le public reçoive
-- quoi que ce soit du CMS, et l'éditeur affichera quand même « En ligne ».
-- Il n'est là que pour revenir en arrière si la contrainte bloquait un cas
-- légitime qu'on n'avait pas prévu — pas pour un usage courant.

ALTER TABLE public.pages
  DROP CONSTRAINT IF EXISTS pages_published_requires_snapshot;
