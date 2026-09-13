-- Greatlife — Migration 016 : Blog enrichi (image à la une, slug, SEO)
-- ============================================================================
-- Ajoute une image à la une dédiée, un slug SEO et une méta-description
-- pour les articles de blog. La catégorie devient structurée côté application.

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS slug TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_description TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
