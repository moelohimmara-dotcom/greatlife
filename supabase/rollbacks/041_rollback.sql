-- Greatlife — Rollback de la migration 041
-- Retire alt_text et caption de media_assets.

ALTER TABLE public.media_assets
  DROP COLUMN IF EXISTS alt_text,
  DROP COLUMN IF EXISTS caption;
