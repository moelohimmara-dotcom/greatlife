-- Greatlife — Migration 029 : publier les tables de contenu en Realtime
-- =======================================================================
--
-- POURQUOI CETTE MIGRATION
--
-- La migration 009 n'avait publié que `messages` et `reservations` (puis
-- `orders`). Or `src/contexts/SiteContext.tsx` s'abonne à SEPT tables :
--
--   menu_items · site_content · blog_posts · media_assets
--   orders · reservations · page_sections
--
-- Cinq d'entre elles n'étaient PAS dans la publication `supabase_realtime`.
-- Un abonnement à une table non publiée ne se déclenche JAMAIS et ne produit
-- AUCUNE erreur : le canal reste silencieusement muet.
--
-- CONSÉQUENCE RÉELLE : le restaurateur modifiait un prix dans l'administration,
-- la ligne changeait bien en base (après la migration 028), mais le site public
-- ne bougeait pas tant qu'on ne rechargeait pas la page. C'est la seconde
-- moitié du défaut signalé en recette : « toute modification doit influer sur le
-- site en instantané ».
--
-- PÉRIMÈTRE
--
-- On publie les tables de CONTENU affichées publiquement, plus la navigation
-- (Lot 4) pour éviter une seconde migration. On laisse volontairement de côté :
--
--   - `admin_users`  : données d'administration, aucun abonné côté public ;
--   - `audit_log`    : journal d'activité, bruit inutile sur le canal ;
--   - `page_versions`: historique immuable, jamais affiché en direct.
--
-- IDEMPOTENTE : ne rejoue l'ajout que si la table n'est pas déjà publiée.
-- RÉVERSIBLE : voir supabase/rollbacks/029_rollback.sql

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
    -- La table doit exister
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      -- Et ne pas déjà être publiée
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        RAISE NOTICE 'Realtime activé pour public.%', t;
      ELSE
        RAISE NOTICE 'public.% est déjà publiée — ignorée', t;
      END IF;
    ELSE
      RAISE WARNING 'public.% est absente — ignorée', t;
    END IF;
  END LOOP;
END $$;

-- Vérification lisible dans les logs de migration.
DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime' AND schemaname = 'public';
  RAISE NOTICE 'Tables publiées en Realtime : %', n;
END $$;
