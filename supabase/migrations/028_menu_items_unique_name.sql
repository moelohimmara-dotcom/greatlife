-- Greatlife — Migration 028 : contrainte d'unicité sur menu_items.name
-- =====================================================================
--
-- POURQUOI CETTE MIGRATION
--
-- `upsertMenuItem` (src/lib/repository.ts) enregistre les modifications de la
-- carte avec `{ onConflict: 'name' }`. Or `menu_items.name` n'avait AUCUNE
-- contrainte d'unicité (vérifié : seul `menu_items_pkey` existait).
--
-- PostgreSQL refuse alors l'opération :
--
--   42P10 — there is no unique or exclusion constraint
--           matching the ON CONFLICT specification
--
-- CONSÉQUENCE RÉELLE : chaque modification d'un plat — prix, description,
-- vertus, badges, catégorie — échouait silencieusement. Le restaurateur voyait
-- l'erreur dans la barre d'état, mais RIEN n'était enregistré, et le site
-- public ne changeait jamais. C'est le défaut signalé en recette.
--
-- POURQUOI `name` EST LA BONNE CLÉ
--
-- Le modèle client `MenuItem` (src/data/menu.ts) ne porte pas d'`id` : toute
-- l'administration identifie un plat par son nom — `menu.find(m => m.name === sel)`,
-- `useState(menu[0]?.name)`. Cette contrainte ne fait que formaliser une règle
-- que l'interface applique déjà depuis l'origine.
--
-- IDEMPOTENTE : peut être rejouée sans erreur.
-- RÉVERSIBLE : voir supabase/rollbacks/028_rollback.sql
--
-- ⚠️ LIMITE CONNUE (non traitée ici, tracée au rapport de lot)
-- Renommer un plat depuis l'administration crée une SECONDE ligne au lieu de
-- renommer la première : l'`upsert` cherche par nom, et l'ancien nom reste en
-- base. Corriger cela demande de faire circuler l'`id`jusqu'au modèle client —
-- un chantier distinct. Avant ce lot, la même action échouait purement et
-- simplement (42P10), donc aucune régression n'est introduite.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.menu_items'::regclass
      AND conname  = 'menu_items_name_key'
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_name_key UNIQUE (name);
  END IF;
END $$;

-- La contrainte crée son propre index unique : il sert aussi les recherches par
-- nom faites par l'administration.
COMMENT ON CONSTRAINT menu_items_name_key ON public.menu_items IS
  'Clé métier de la carte : un plat est identifié par son nom. Requise par l''upsert de l''administration.';
