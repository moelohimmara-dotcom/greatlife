-- Rollback de 036_page_layout.sql (colonne pages.layout + contrainte)

ALTER TABLE public.pages DROP CONSTRAINT IF EXISTS pages_layout_check;
ALTER TABLE public.pages DROP COLUMN IF EXISTS layout;
