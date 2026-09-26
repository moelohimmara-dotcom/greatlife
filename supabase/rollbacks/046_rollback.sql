-- Greatlife — Rollback de la migration 046
-- Retire les colonnes bilingues de menu_items.
--
-- Aucune donnée française n'est perdue : les colonnes historiques (name,
-- description, vertus) portent toujours les textes FR — la lecture du site s'y
-- replie naturellement. Seules les traductions EN ajoutées dans les colonnes
-- *_i18n disparaissent.

ALTER TABLE public.menu_items
  DROP COLUMN IF EXISTS name_i18n,
  DROP COLUMN IF EXISTS description_i18n,
  DROP COLUMN IF EXISTS vertus_i18n;
