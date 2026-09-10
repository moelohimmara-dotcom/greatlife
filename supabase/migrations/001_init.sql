-- Greatlife — Migration 001 : Initialisation des tables
-- =====================================================

-- Table des éléments du menu
CREATE TABLE IF NOT EXISTS public.menu_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat         TEXT NOT NULL,
  name        TEXT NOT NULL,
  sig         BOOLEAN DEFAULT FALSE,
  price       TEXT NOT NULL,
  description TEXT NOT NULL,
  vertus      TEXT NOT NULL DEFAULT '',
  badges      JSONB DEFAULT '[]'::jsonb,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Table des messages du formulaire de contact
CREATE TABLE IF NOT EXISTS public.messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        TEXT NOT NULL,
  email      TEXT NOT NULL,
  sujet      TEXT NOT NULL DEFAULT 'contact',
  message    TEXT NOT NULL,
  date       TIMESTAMPTZ DEFAULT now(),
  handled    BOOLEAN DEFAULT FALSE
);

-- Table des contenus dynamiques du site
CREATE TABLE IF NOT EXISTS public.site_content (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT UNIQUE NOT NULL,
  value        JSONB NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  updated_by   TEXT
);

-- Table des utilisateurs admin (supabase authprofiles)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'guest',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_menu_items_cat ON public.menu_items(cat);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort ON public.menu_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_messages_date ON public.messages(date DESC);
