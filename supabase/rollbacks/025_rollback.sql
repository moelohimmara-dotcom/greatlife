-- Rollback de 025_migrate_home_content.sql
-- ==========================================
-- Redige AVANT application.
--
-- Supprime la page « Accueil » et son contenu CMS, ainsi que la navigation.
-- La ligne historique `site_config` n'est PAS touchee : l'ancien modele
-- redevient immediatement la seule source de verite.
--
-- GARDE-FOU : si des versions de page existent, le rollback s'arrete.
-- Une version est une archive ; effacer un historique ne doit jamais etre
-- un effet de bord (voir migration 023, ON DELETE RESTRICT).

DO $$
DECLARE
  pid uuid;
  nb_versions int;
BEGIN
  SELECT id INTO pid FROM public.pages WHERE lower(slug) = '';

  IF pid IS NOT NULL THEN
    SELECT count(*) INTO nb_versions FROM public.page_versions WHERE page_id = pid;
    IF nb_versions > 0 THEN
      RAISE EXCEPTION
        'Rollback 025 interrompu : % version(s) de page existent. Purger explicitement l''historique avant de revenir en arriere.',
        nb_versions;
    END IF;
  END IF;

  DELETE FROM public.pages WHERE lower(slug) = '';   -- cascade sur les sections
  DELETE FROM public.navigation;                     -- cascade sur les items

  RAISE NOTICE 'Rollback 025 : page Accueil et navigation supprimees';
END
$$;
