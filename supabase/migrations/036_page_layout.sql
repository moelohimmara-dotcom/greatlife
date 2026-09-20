-- Greatlife — Migration 036 : mise en page de la page
-- ====================================================
-- Cinq structures maîtrisées (TDR §13), distinctes des dispositions de bloc.
-- Défaut = colonne unique = défilement historique. Réversible : 036_rollback.sql

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS layout text NOT NULL DEFAULT 'single_column';

ALTER TABLE public.pages
  DROP CONSTRAINT IF EXISTS pages_layout_check;

ALTER TABLE public.pages
  ADD CONSTRAINT pages_layout_check
  CHECK (layout IN (
    'single_column',
    'hero_alternating',
    'magazine',
    'hero_parallax',
    'split'
  ));

COMMENT ON COLUMN public.pages.layout IS
  'Mise en page de la page (brouillon). Le public lit pages.published_snapshot.page.layout.';
