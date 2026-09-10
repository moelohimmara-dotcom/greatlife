-- Greatlife — Migration 003 : Storage buckets
-- ===========================================

-- Bucket pour les photos de plats
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-photos', 'food-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les portraits d'équipe
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-portraits', 'team-portraits', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les images du blog
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Politique : lecture publique des médias
CREATE POLICY "media_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('food-photos', 'team-portraits', 'blog-images'));

-- Politique : upload réservé aux admins
CREATE POLICY "media_admin_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH (
    bucket_id IN ('food-photos', 'team-portraits', 'blog-images')
    AND EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.jwt() ->> 'email'
        AND au.role IN ('owner', 'manager')
    )
  );

-- Politique : suppression réservée aux admins
CREATE POLICY "media_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('food-photos', 'team-portraits', 'blog-images')
    AND EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.jwt() ->> 'email'
        AND au.role IN ('owner', 'manager')
    )
  );
