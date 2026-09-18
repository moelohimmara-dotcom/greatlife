-- Greatlife — Migration 022 : navigation administrable
-- =====================================================
-- Lot 1 — Fondations CMS (docs/12_DATABASE_SCHEMA.md §2.3, §3.2).
--
-- Header et footer sont GLOBAUX (TDR §19) : une seule definition, appliquee
-- a toutes les pages. Ils deviennent editables depuis l'administration.
-- Le systeme d'items auto-reference permet les sous-menus (TDR §20).
--
-- Idempotente. Reversible par : supabase/rollbacks/022_rollback.sql

CREATE TABLE IF NOT EXISTS public.navigation (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,   -- 'header' | 'footer'
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.navigation_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  navigation_id   uuid NOT NULL REFERENCES public.navigation(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES public.navigation_items(id) ON DELETE CASCADE,
  label_i18n      jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_type     text NOT NULL DEFAULT 'page'
                  CHECK (target_type IN ('page','anchor','url')),
  target_page_id  uuid REFERENCES public.pages(id) ON DELETE SET NULL,
  target_value    text,               -- ancre (sans '#') ou URL externe
  position        integer NOT NULL DEFAULT 0,
  visible         boolean NOT NULL DEFAULT true,
  is_cta          boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS navigation_items_nav_position
  ON public.navigation_items (navigation_id, parent_id, position);

DROP TRIGGER IF EXISTS navigation_set_updated_at ON public.navigation;
CREATE TRIGGER navigation_set_updated_at
  BEFORE UPDATE ON public.navigation
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS navigation_items_set_updated_at ON public.navigation_items;
CREATE TRIGGER navigation_items_set_updated_at
  BEFORE UPDATE ON public.navigation_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------- RLS
ALTER TABLE public.navigation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;

-- `navigation` ne contient que deux lignes sans donnee sensible : lecture
-- publique assumee et documentee (docs/12_DATABASE_SCHEMA.md §3.2, point 6).
DROP POLICY IF EXISTS "navigation_public_read" ON public.navigation;
CREATE POLICY "navigation_public_read" ON public.navigation
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "navigation_admin_write" ON public.navigation;
CREATE POLICY "navigation_admin_write" ON public.navigation
  FOR ALL TO authenticated
  USING (public.is_admin(ARRAY['owner','manager']))
  WITH CHECK (public.is_admin(ARRAY['owner','manager']));

-- Un item n'est public que si :
--   * il est visible,
--   * son parent (s'il existe) est visible,
--   * et, s'il pointe vers une page, que cette page est PUBLIEE.
-- Sans ces trois conditions, la navigation publique exposerait des libelles
-- de brouillons et des liens morts.
DROP POLICY IF EXISTS "nav_items_public_read" ON public.navigation_items;
CREATE POLICY "nav_items_public_read" ON public.navigation_items
  FOR SELECT TO anon, authenticated
  USING (
    visible = true
    AND (
      parent_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.navigation_items parent
        WHERE parent.id = navigation_items.parent_id
          AND parent.visible = true
      )
    )
    AND (
      target_type <> 'page'
      OR target_page_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.pages p
        WHERE p.id = navigation_items.target_page_id
          AND p.status = 'published'
      )
    )
  );

DROP POLICY IF EXISTS "nav_items_admin_write" ON public.navigation_items;
CREATE POLICY "nav_items_admin_write" ON public.navigation_items
  FOR ALL TO authenticated
  USING (public.is_admin(ARRAY['owner','manager']))
  WITH CHECK (public.is_admin(ARRAY['owner','manager']));
