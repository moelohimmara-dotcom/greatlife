-- Greatlife — Migration 021 : CMS, pages et sections
-- ==================================================
-- Lot 1 — Fondations CMS (docs/12_DATABASE_SCHEMA.md §2.1, §2.2, §3.2).
--
-- Crée les deux tables qui remplacent le blob éditorial `site_content.content` :
--   * `pages`         — structure : slug, statut, SEO
--   * `page_sections` — presentation + contenu, ordonnes, bilingues
--
-- Idempotente : `IF NOT EXISTS` + `DROP POLICY IF EXISTS`.
-- Réversible par : supabase/rollbacks/021_rollback.sql
--
-- Décisions appliquées :
--   - CM-1 : contenu bilingue = objet de traduction par champ { "fr": …, "en": … }
--   - CM-6 : un SEUL slug par page (la langue vit dans le prefixe d'URL, pas en base)
--   - DB-2 : droits limites a owner/manager (aucun elargissement par rapport a l'existant)
--   - DB-6 : trigger updated_at
--   - DB-10 : pas de CHECK sur `type` (catalogue evolutif, valide par le registre applicatif)

-- ---------------------------------------------------------------- tables
CREATE TABLE IF NOT EXISTS public.pages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- '' designe la page d'accueil. Un seul marqueur (pas de colonne is_home).
  slug          text NOT NULL DEFAULT '',
  title_i18n    jsonb NOT NULL DEFAULT '{}'::jsonb,
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','published','archived')),
  sort_order    integer NOT NULL DEFAULT 0,
  seo           jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    text
);

-- Comparaison en minuscules : lecon de la migration 020.
CREATE UNIQUE INDEX IF NOT EXISTS pages_slug_key ON public.pages (lower(slug));

CREATE TABLE IF NOT EXISTS public.page_sections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  -- Pas de CHECK : le catalogue de types evolue (TDR §12 + ajouts).
  -- La validation appartient au registre applicatif (decision DB-10).
  type        text NOT NULL,
  variant     text,
  position    integer NOT NULL DEFAULT 0,
  visible     boolean NOT NULL DEFAULT true,
  -- Ancre SANS '#', ex. 'carte'. Le renderer construit le lien.
  anchor      text,
  content     jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_sections_page_position
  ON public.page_sections (page_id, position);

CREATE UNIQUE INDEX IF NOT EXISTS page_sections_anchor_key
  ON public.page_sections (page_id, anchor)
  WHERE anchor IS NOT NULL;

-- ---------------------------------------------------------------- updated_at
-- Sans ce trigger, la colonne `updated_at` resterait figee a la creation
-- et l'interface afficherait une date de modification fausse (decision DB-6).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS pages_set_updated_at ON public.pages;
CREATE TRIGGER pages_set_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS page_sections_set_updated_at ON public.page_sections;
CREATE TRIGGER page_sections_set_updated_at
  BEFORE UPDATE ON public.page_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------- RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;

-- Le public ne voit QUE le publie (TDR §22). Le filtrage est en base,
-- jamais dans le navigateur (TDR §31).
DROP POLICY IF EXISTS "pages_public_read" ON public.pages;
CREATE POLICY "pages_public_read" ON public.pages
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "pages_admin_read" ON public.pages;
CREATE POLICY "pages_admin_read" ON public.pages
  FOR SELECT TO authenticated
  USING (public.is_admin(ARRAY['owner','manager']));

DROP POLICY IF EXISTS "pages_admin_write" ON public.pages;
CREATE POLICY "pages_admin_write" ON public.pages
  FOR ALL TO authenticated
  USING (public.is_admin(ARRAY['owner','manager']))
  WITH CHECK (public.is_admin(ARRAY['owner','manager']));

-- Une section n'est publique que si sa page est publiee ET si elle est visible.
DROP POLICY IF EXISTS "sections_public_read" ON public.page_sections;
CREATE POLICY "sections_public_read" ON public.page_sections
  FOR SELECT TO anon, authenticated
  USING (
    visible = true
    AND EXISTS (
      SELECT 1 FROM public.pages p
      WHERE p.id = page_sections.page_id
        AND p.status = 'published'
    )
  );

DROP POLICY IF EXISTS "sections_admin_read" ON public.page_sections;
CREATE POLICY "sections_admin_read" ON public.page_sections
  FOR SELECT TO authenticated
  USING (public.is_admin(ARRAY['owner','manager']));

DROP POLICY IF EXISTS "sections_admin_write" ON public.page_sections;
CREATE POLICY "sections_admin_write" ON public.page_sections
  FOR ALL TO authenticated
  USING (public.is_admin(ARRAY['owner','manager']))
  WITH CHECK (public.is_admin(ARRAY['owner','manager']));
