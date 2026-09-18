-- Greatlife — Migration 023 : versions de page
-- ==============================================
-- Lot 1 — Fondations CMS (docs/12_DATABASE_SCHEMA.md §2.4, §3.2).
-- Decision DB-1 / CM-3 : la table est creee des le Lot 1 (vide), pour eviter
-- une migration sur donnees vivantes. Son USAGE appartient au Lot 3 (TDR §23).
--
-- Idempotente. Reversible par : supabase/rollbacks/023_rollback.sql

CREATE TABLE IF NOT EXISTS public.page_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- RESTRICT volontaire : une version est une archive. La suppression d'une
  -- page ne doit pas detruire son historique de restauration. Une page se
  -- ARCHIVE (status = 'archived'), elle ne se supprime pas.
  page_id     uuid NOT NULL REFERENCES public.pages(id) ON DELETE RESTRICT,
  version     integer NOT NULL,
  snapshot    jsonb NOT NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text,
  UNIQUE (page_id, version)
);

CREATE INDEX IF NOT EXISTS page_versions_page_created
  ON public.page_versions (page_id, created_at DESC);

-- ---------------------------------------------------------------- RLS
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "versions_admin_read" ON public.page_versions;
CREATE POLICY "versions_admin_read" ON public.page_versions
  FOR SELECT TO authenticated
  USING (public.is_admin(ARRAY['owner','manager']));

-- Insertion seule : une version est une archive, on ne la modifie pas.
-- (La premiere version de la conception utilisait FOR ALL, ce qui autorisait
-- la modification et la suppression de l'historique.)
DROP POLICY IF EXISTS "versions_admin_insert" ON public.page_versions;
CREATE POLICY "versions_admin_insert" ON public.page_versions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(ARRAY['owner','manager']));

-- Seul le proprietaire peut purger une version.
DROP POLICY IF EXISTS "versions_owner_delete" ON public.page_versions;
CREATE POLICY "versions_owner_delete" ON public.page_versions
  FOR DELETE TO authenticated
  USING (public.is_admin(ARRAY['owner']));

-- Aucune policy UPDATE : l'historique est immuable.
