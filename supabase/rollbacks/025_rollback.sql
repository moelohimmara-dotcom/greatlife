-- Rollback de 025_migrate_home_content.sql
-- ==========================================
-- Redige AVANT application.
--
-- Supprime la page « Accueil » et son contenu CMS, ainsi que la navigation.
-- La ligne historique `site_config` n'est PAS touchee : l'ancien modele
-- redevient immediatement la seule source de verite.
--
-- GARDE-FOUS : ce rollback s'arrete si un travail humain serait detruit.
-- Revenir en arriere ne doit jamais etre un effet de bord silencieux.

DO $$
DECLARE
  pid          uuid;
  nb_versions  int;
  v_status     text;
  v_cree       timestamptz;
  v_modifie    timestamptz;
  nb_nav_edit  int;
BEGIN
  SELECT id, status, created_at, updated_at
    INTO pid, v_status, v_cree, v_modifie
    FROM public.pages WHERE lower(slug) = '';

  IF pid IS NOT NULL THEN
    -- 1. Une page publiee ne se supprime pas par un rollback.
    IF v_status = 'published' THEN
      RAISE EXCEPTION
        'Rollback 025 interrompu : la page « Accueil » est PUBLIEE. Depublier explicitement avant de revenir en arriere.';
    END IF;

    -- 2. Une page modifiee depuis la migration contient du travail humain.
    IF v_modifie IS DISTINCT FROM v_cree THEN
      RAISE EXCEPTION
        'Rollback 025 interrompu : la page « Accueil » a ete modifiee depuis la migration (creee %, modifiee %).',
        v_cree, v_modifie;
    END IF;

    -- 3. Un historique de versions est une archive : il ne s'efface pas en cascade.
    SELECT count(*) INTO nb_versions FROM public.page_versions WHERE page_id = pid;
    IF nb_versions > 0 THEN
      RAISE EXCEPTION
        'Rollback 025 interrompu : % version(s) de page existent. Purger explicitement l''historique avant de revenir en arriere.',
        nb_versions;
    END IF;
  END IF;

  -- 4. Une navigation modifiee depuis la migration ne doit pas disparaitre.
  SELECT count(*) INTO nb_nav_edit
  FROM public.navigation_items
  WHERE created_at IS NOT NULL AND updated_at IS DISTINCT FROM created_at;

  IF nb_nav_edit > 0 THEN
    RAISE EXCEPTION
      'Rollback 025 interrompu : % entree(s) de navigation ont ete modifiees depuis la migration.',
      nb_nav_edit;
  END IF;

  DELETE FROM public.pages WHERE lower(slug) = '';   -- cascade sur les sections
  DELETE FROM public.navigation;                     -- cascade sur les items

  RAISE NOTICE 'Rollback 025 : page Accueil et navigation supprimees';
END
$$;
