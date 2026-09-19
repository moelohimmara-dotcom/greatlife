-- Rollback de la migration 029
-- =============================
-- Retire les tables de contenu de la publication `supabase_realtime`.
--
-- ⚠️ APRÈS CE ROLLBACK, les modifications faites dans l'administration ne se
-- propageront PLUS au site public en direct : il faudra recharger la page pour
-- voir un prix, un texte ou un média modifié.
--
-- `messages`, `orders` et `reservations` (publiées par la migration 009) ne
-- sont PAS touchées : le panneau de pilotage continue de fonctionner.
--
-- Idempotent : ne retire que ce qui est présent.

DO $$
DECLARE
  t text;
  cibles text[] := ARRAY[
    'menu_items',
    'site_content',
    'blog_posts',
    'media_assets',
    'page_sections',
    'pages',
    'navigation',
    'navigation_items'
  ];
BEGIN
  FOREACH t IN ARRAY cibles LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
