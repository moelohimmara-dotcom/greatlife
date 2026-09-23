-- Greatlife — Migration 041 : texte alternatif + légende sur media_assets
-- ======================================================================
-- POURQUOI
--   La console Médias propose déjà les champs « Texte alternatif » et
--   « Légende », mais ils n'étaient pas persistés (brouillon de session).
--   L'audit docs/24 (N2) exige une vraie mémorisation pour l'accessibilité.
--
-- CE QUE ÇA CHANGE
--   Deux colonnes textuelles nullable sur public.media_assets.
--   Les policies UPDATE admin existantes (011) couvrent déjà ces colonnes.
--
-- Idempotente. Réversible : supabase/rollbacks/041_rollback.sql

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS alt_text text,
  ADD COLUMN IF NOT EXISTS caption text;

COMMENT ON COLUMN public.media_assets.alt_text IS
  'Texte alternatif (accessibilité) saisi dans la médiathèque.';
COMMENT ON COLUMN public.media_assets.caption IS
  'Légende optionnelle affichable sous la photo.';
