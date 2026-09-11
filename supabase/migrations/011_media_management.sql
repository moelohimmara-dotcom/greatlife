-- Greatlife — Migration 011 : Media management (storage + metadata table)
-- ======================================================================
-- The MediaManager module was fully static (DEFAULT_MEDIA in code, no
-- upload, no persistence). This migration adds:
--   1. A 'media' bucket for general uploads (logo, hero, section images)
--   2. Fixed storage RLS policies using is_admin() (the old 003 policies
--      had the same infinite-recursion bug that 007 fixed for tables)
--   3. A public.media_assets table to track uploaded files + their
--      assigned "slot" (e.g. hero, logo) so the site can use them.
--
-- NOTE: bucket creation must run as the postgres superuser (via the
-- Supabase Management API / apply_migration), NOT via the anon REST API
-- (storage.buckets RLS blocks anon inserts, so the INSERT silently
-- never commits). This migration was applied via the Supabase MCP
-- apply_migration tool.

-- 1. Bucket for general media (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS: public read, admin upload/delete (via is_admin)
DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
CREATE POLICY "media_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_admin_upload" ON storage.objects;
CREATE POLICY "media_admin_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.is_admin(ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "media_admin_delete" ON storage.objects;
CREATE POLICY "media_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.is_admin(ARRAY['owner', 'manager']));

-- 3. Media assets metadata table
CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text NOT NULL DEFAULT 'general',
  filename text NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  content_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Public can read media metadata (to display images)
CREATE POLICY "media_assets_public_read" ON public.media_assets
  FOR SELECT TO anon, authenticated USING (true);

-- Admin can insert/update/delete media metadata
CREATE POLICY "media_assets_admin_insert" ON public.media_assets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(ARRAY['owner', 'manager']));

CREATE POLICY "media_assets_admin_update" ON public.media_assets
  FOR UPDATE TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']))
  WITH CHECK (public.is_admin(ARRAY['owner', 'manager']));

CREATE POLICY "media_assets_admin_delete" ON public.media_assets
  FOR DELETE TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']));

-- Index for slot lookups
CREATE INDEX IF NOT EXISTS idx_media_assets_slot ON public.media_assets (slot);
