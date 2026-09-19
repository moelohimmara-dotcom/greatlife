-- Rollback de la migration 028
-- =============================
-- Retire la contrainte d'unicité sur menu_items.name.
--
-- ⚠️ APRÈS CE ROLLBACK, la sauvegarde de la carte CESSERA DE FONCTIONNER :
-- `upsertMenuItem` utilise `onConflict: 'name'`, qui exige cette contrainte.
-- PostgreSQL renverra 42P10 à chaque enregistrement.
--
-- Ne rejouer ce rollback que si l'on revient AUSSI sur le code appelant
-- (src/lib/repository.ts — fonction `upsertMenuItem`).
--
-- Sans effet si la contrainte est déjà absente (idempotent).

ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_name_key;
