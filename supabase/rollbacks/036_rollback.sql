-- Rollback de 036_pages_layout.sql

ALTER TABLE public.pages DROP CONSTRAINT IF EXISTS pages_layout_check;
ALTER TABLE public.pages DROP COLUMN IF EXISTS layout;
