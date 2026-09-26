-- Greatlife — Migration 046 : carte des plats bilingue
-- ====================================================
--
-- POURQUOI
--   Le site public est bilingue (décisions CM-1/CM-5 : contenu {fr, en} résolu
--   par `resolveI18n`, `src/cms/model/i18n.ts`), mais les textes des plats
--   restaient monolingues : `name`, `description` et `vertus` ne portent que le
--   français. Sur `/en`, la carte affichait donc les plats en français — la
--   seule partie du site qui échappait au modèle bilingue.
--   La migration 030 n'avait migré que le contenu des pages (`pages` /
--   `page_sections`) ; le module Menu historique (`menu_items`) était resté de
--   côté, comme le note déjà docs/12_DATABASE_SCHEMA.md.
--
-- CE QUE ÇA CHANGE
--   Trois colonnes jsonb NULLABLES sur public.menu_items, sur le modèle des
--   autres valeurs traduisibles (objet {fr, en}) :
--       name_i18n        ← name
--       description_i18n ← description
--       vertus_i18n      ← vertus
--   plus un backfill FR : chaque ligne dont la colonne est encore vide reçoit
--   jsonb_build_object('fr', <texte historique>). Idempotent : une seconde
--   exécution ne touche aucune colonne déjà renseignée.
--
-- CE QUE ÇA NE CHANGE PAS
--   - aucune colonne existante n'est modifiée : `name`, `description`, `vertus`,
--     `cat`, `price`, `badges`, `sig`, `sort_order` restent la source française ;
--   - aucune policy RLS n'est touchée : les policies existantes couvrent la
--     table entière, y compris les nouvelles colonnes ;
--   - le format des écritures de la console : l'éditeur continue d'écrire
--     name/description/vertus en français. L'édition anglaise des plats dans la
--     console viendra plus tard.
--   Ajout incrémental avec repli sur l'ancien (AGENTS.md §3/§6) : le code lit
--   `*_i18n ?? { fr: <colonne historique> }` (src/data/menu.ts), donc le site
--   reste correct que cette migration soit appliquée ou non.
--
-- Idempotente. Réversible : supabase/rollbacks/046_rollback.sql

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS name_i18n        jsonb,
  ADD COLUMN IF NOT EXISTS description_i18n jsonb,
  ADD COLUMN IF NOT EXISTS vertus_i18n      jsonb;

COMMENT ON COLUMN public.menu_items.name_i18n IS
  'Nom du plat par langue, ex. {"fr": "...", "en": "..."}. Repli : name.';
COMMENT ON COLUMN public.menu_items.description_i18n IS
  'Description du plat par langue, ex. {"fr": "...", "en": "..."}. Repli : description.';
COMMENT ON COLUMN public.menu_items.vertus_i18n IS
  'Vertus du plat par langue, ex. {"fr": "...", "en": "..."}. Repli : vertus.';

-- Backfill FR — uniquement là où la colonne est encore vide (NULL).
-- Le texte historique est copié tel quel : rien n'est réécrit, ni traduit.
UPDATE public.menu_items
SET name_i18n = jsonb_build_object('fr', name)
WHERE name_i18n IS NULL;

UPDATE public.menu_items
SET description_i18n = jsonb_build_object('fr', description)
WHERE description_i18n IS NULL;

UPDATE public.menu_items
SET vertus_i18n = jsonb_build_object('fr', vertus)
WHERE vertus_i18n IS NULL;
