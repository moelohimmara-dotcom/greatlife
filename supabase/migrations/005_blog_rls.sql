-- Greatlife — Migration 005 : Blog posts + message handled + RLS
-- ================================================================

-- Table des articles de blog
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  excerpt     TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'Actualités',
  published   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_created ON public.blog_posts(created_at DESC);

-- RLS pour blog_posts
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Lecture publique des articles publiés
CREATE POLICY "blog_public_read" ON public.blog_posts
  FOR SELECT TO anon, authenticated
  USING (published = true);

-- Lecture des brouillons réservée aux admins
CREATE POLICY "blog_admin_read_drafts" ON public.blog_posts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.jwt() ->> 'email'
        AND au.role IN ('owner', 'manager')
    )
  );

-- Écriture des articles réservée aux admins
CREATE POLICY "blog_admin_write" ON public.blog_posts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.jwt() ->> 'email'
        AND au.role IN ('owner', 'manager')
    )
  );

-- Autoriser la mise à jour de la colonne handled sur messages par les admins
-- (la politique messages_admin_read existe déjà pour SELECT,
--  on ajoute UPDATE pour permettre markMessageHandled)
CREATE POLICY "messages_admin_update" ON public.messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.jwt() ->> 'email'
        AND au.role IN ('owner', 'manager')
    )
  );
