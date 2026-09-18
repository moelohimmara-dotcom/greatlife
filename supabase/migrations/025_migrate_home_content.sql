-- Greatlife — Migration 025 : migration du contenu vers la page « Accueil »
-- =========================================================================
-- Lot 1 — Fondations CMS (docs/04_CONTENT_MODEL.md §9).
--
-- Cree la page d'accueil et ses sections a partir du blob `site_config.content`,
-- dans l'ORDRE REEL DU RENDU (extrait de PublicSite.tsx:17-32 — la colonne
-- `visibility.sectionOrder` de la base n'est jamais lue par le code).
--
-- Extrait egalement les contenus jusqu'ici CODES EN DUR dans les composants
-- (TDR §4 : le frontend public ne doit pas contenir de donnee administrable).
--
-- La page est creee en statut 'draft' : le site public continue de fonctionner
-- sur l'ancien modele, rien ne change pour les visiteurs.
--
-- IDEMPOTENTE : re-executable sans erreur ni doublon, et SANS ecraser une
-- edition faite entre-temps (les sections et la navigation ne sont creees que
-- si elles sont absentes).
--
-- Reversible par : supabase/rollbacks/025_rollback.sql

DO $$
DECLARE
  c        jsonb;
  pid      uuid;
  nav_h    uuid;
  nav_f    uuid;
  nb_sec   int;
  nb_nav   int;
BEGIN
  SELECT value -> 'content' INTO c FROM public.site_content WHERE key = 'site_config';

  IF c IS NULL THEN
    RAISE EXCEPTION 'Migration 025 : contenu source introuvable (site_config.content absent)';
  END IF;

  -- ============================================================ page d'accueil
  SELECT id INTO pid FROM public.pages WHERE lower(slug) = '';
  IF pid IS NULL THEN
    INSERT INTO public.pages (slug, title_i18n, status, sort_order, seo)
    VALUES (
      '',
      jsonb_build_object('fr', 'Accueil', 'en', 'Home'),
      'draft',   -- volontairement NON publiee : le renderer n'est pas encore actif
      0,
      jsonb_build_object(
        'title',       jsonb_build_object(
                         'fr', 'Greatlife — Fast-food bio sans culpabilité | Conakry',
                         'en', 'Greatlife — Guilt-free organic fast food | Conakry'),
        'description', jsonb_build_object(
                         'fr', 'Produits bio, emballages écologiques, cuisson saine et saveurs tropicales à Conakry.',
                         'en', 'Organic produce, eco-friendly packaging and tropical flavours in Conakry.')
      )
    )
    RETURNING id INTO pid;
    RAISE NOTICE 'Migration 025 : page « Accueil » creee (%)', pid;
  ELSE
    RAISE NOTICE 'Migration 025 : page « Accueil » deja presente (%)', pid;
  END IF;

  -- =========================================================================
  -- Sections — ordre exact du rendu actuel (PublicSite.tsx:17-32)
  -- =========================================================================
  SELECT count(*) INTO nb_sec FROM public.page_sections WHERE page_id = pid;

  IF nb_sec = 0 THEN
    INSERT INTO public.page_sections (page_id, type, variant, position, visible, anchor, content) VALUES

    -- 1. Hero  (Hero.tsx — titre/sous-titre/accroche depuis la base ; pastilles,
    --    prix de signature et boutons etaient codes en dur)
    (pid, 'hero', 'image_text', 0, true, 'home', jsonb_build_object(
      'title',        jsonb_build_object('fr', coalesce(c->>'heroTitle', '')),
      'subtitle',     jsonb_build_object('fr', coalesce(c->>'heroSub', '')),
      'tagline',      jsonb_build_object('fr', coalesce(c->>'slogan', '')),
      'chips',        jsonb_build_array(
                        jsonb_build_object('fr', '100% bio'),
                        jsonb_build_object('fr', 'Emballages éco'),
                        jsonb_build_object('fr', 'Prix accessibles')),
      'badge',        jsonb_build_object(
                        'label', jsonb_build_object('fr', 'Signature'),
                        'name',  jsonb_build_object('fr', 'Le Greatlife'),
                        'value', jsonb_build_object('fr', '48 000 FG')),
      'pill',         jsonb_build_object('fr', 'Bio'),
      'primaryCta',   jsonb_build_object('label', jsonb_build_object('fr', 'Découvrir la carte'),   'target', 'carte'),
      'secondaryCta', jsonb_build_object('label', jsonb_build_object('fr', 'Réserver une table'),   'target', 'reservation')
    )),

    -- 2. Carte  (Carte.tsx — alimentee par le module Menu, jamais recopiee)
    (pid, 'menu', 'full', 1, true, 'carte', jsonb_build_object(
      'title',    jsonb_build_object('fr', 'La transgression saine'),
      'subtitle', jsonb_build_object('fr', 'Burgers, frites, milkshakes — en version bio, avec les fruits tropicaux de notre terroir. Chaque plat porte ses vertus affichées.')
    )),

    -- 3. Histoire  (Story.tsx — signature du fondateur codee en dur)
    (pid, 'story', null, 2, true, 'histoire', jsonb_build_object(
      'title',    jsonb_build_object('fr', coalesce(c->>'storyTitle', '')),
      'body',     jsonb_build_object('fr', coalesce(c->>'story', '')),
      'signature',jsonb_build_object('fr', 'Mister Marcket'),
      'signerole',jsonb_build_object('fr', 'Le fondateur'),
      'chips',    jsonb_build_array(
                    jsonb_build_object('fr', 'Bio accessible'),
                    jsonb_build_object('fr', 'Circuit court'),
                    jsonb_build_object('fr', 'Transparence totale'))
    )),

    -- 4. Engagements  (liste issue de la base : 6 elements)
    (pid, 'engagements', 'grid', 3, true, 'engagements', jsonb_build_object(
      'title',    jsonb_build_object('fr', 'Ce qui nous distingue'),
      'subtitle', jsonb_build_object('fr', 'Six engagements concrets qui font de Greatlife un fast-food à part.'),
      'items',    coalesce((
        SELECT jsonb_agg(jsonb_build_object(
                 'icon',  e->>'icon',
                 'title', jsonb_build_object('fr', coalesce(e->>'title', '')),
                 'desc',  jsonb_build_object('fr', coalesce(e->>'desc', ''))
               ))
        FROM jsonb_array_elements(c->'engagements') e
      ), '[]'::jsonb)
    )),

    -- 5. Equipe  (membres issus de la base : 4 elements ; portraits via la mediatheque)
    (pid, 'team', 'grid', 4, true, 'equipe', jsonb_build_object(
      'title',    jsonb_build_object('fr', 'Les visages de Greatlife'),
      'subtitle', jsonb_build_object('fr', 'Une équipe qui croit que manger bien devrait être simple, accessible et délicieux.'),
      'members',  coalesce((
        SELECT jsonb_agg(jsonb_build_object(
                 'name', jsonb_build_object('fr', coalesce(mm->>'name', '')),
                 'role', jsonb_build_object('fr', coalesce(mm->>'role', '')),
                 'desc', jsonb_build_object('fr', coalesce(mm->>'desc', ''))
               ))
        FROM jsonb_array_elements(c->'team') mm
      ), '[]'::jsonb)
    )),

    -- 6. Localisation  (consomme les reglages `restaurant`, ne les stocke pas)
    (pid, 'location', 'card', 5, true, 'loca', jsonb_build_object(
      'title',    jsonb_build_object('fr', 'Nous trouver'),
      'subtitle', jsonb_build_object('fr', coalesce(c->>'address', 'Kaloum, Conakry — au cœur de la ville.'))
    )),

    -- 7. Contact  (sujets du formulaire codes en dur)
    (pid, 'contact', null, 6, true, 'contact', jsonb_build_object(
      'title',    jsonb_build_object('fr', 'Écrivez-nous'),
      'subtitle', jsonb_build_object('fr', 'Réservation, commande, question — on vous répond sous 24h.'),
      'subjects', jsonb_build_array(
                    jsonb_build_object('value', 'contact',     'label', jsonb_build_object('fr', 'Message général')),
                    jsonb_build_object('value', 'reservation', 'label', jsonb_build_object('fr', 'Réservation de table')),
                    jsonb_build_object('value', 'commande',    'label', jsonb_build_object('fr', 'Commande en ligne')),
                    jsonb_build_object('value', 'recrutement', 'label', jsonb_build_object('fr', 'Recrutement')))
    )),

    -- 8. Reservation  — etait rendue INCONDITIONNELLEMENT (PublicSite.tsx:29),
    --    donc impossible a masquer ou deplacer pour l'administrateur.
    (pid, 'reservation', 'card', 7, true, 'reservation', jsonb_build_object(
      'title',    jsonb_build_object('fr', 'Réservez votre table'),
      'subtitle', jsonb_build_object('fr', 'Réservez en quelques secondes — confirmation par email.')
    )),

    -- 9. Temoignages  (liste vide en base : section creee mais MASQUEE tant
    --    qu'aucun avis n'existe — un bloc vide ne doit pas apparaitre en public)
    (pid, 'testimonials', 'cards', 8, false, 'temoignages', jsonb_build_object(
      'title',    jsonb_build_object('fr', 'Ils ont goûté Greatlife'),
      'subtitle', jsonb_build_object('fr', 'Ce que disent nos clients.'),
      'items',    coalesce((
        SELECT jsonb_agg(jsonb_build_object(
                 'name', jsonb_build_object('fr', coalesce(t->>'name', '')),
                 'text', jsonb_build_object('fr', coalesce(t->>'text', coalesce(t->>'desc', '')))
               ))
        FROM jsonb_array_elements(c->'testimonials') t
      ), '[]'::jsonb)
    )),

    -- 10. Blog  (alimente par le module Blog, jamais recopie)
    (pid, 'blog', 'grid', 9, true, 'blog', jsonb_build_object(
      'title',    jsonb_build_object('fr', 'Le journal Greatlife'),
      'subtitle', jsonb_build_object('fr', 'Recettes, coulisses et rencontres avec nos producteurs.')
    ));

    RAISE NOTICE 'Migration 025 : 10 sections creees sur la page Accueil';
  ELSE
    RAISE NOTICE 'Migration 025 : % sections deja presentes — aucune modification', nb_sec;
  END IF;

  -- =========================================================================
  -- Navigation — header et footer deviennent administrables (TDR §19, §20)
  -- =========================================================================
  SELECT count(*) INTO nb_nav FROM public.navigation;
  IF nb_nav = 0 THEN

    INSERT INTO public.navigation (key) VALUES ('header') RETURNING id INTO nav_h;
    INSERT INTO public.navigation (key) VALUES ('footer') RETURNING id INTO nav_f;

    -- En-tete : les 7 entrees du site actuel + le bouton principal
    INSERT INTO public.navigation_items (navigation_id, label_i18n, target_type, target_value, position, is_cta) VALUES
      (nav_h, jsonb_build_object('fr','La carte'),      'anchor', 'carte',        0, false),
      (nav_h, jsonb_build_object('fr','Histoire'),      'anchor', 'histoire',     1, false),
      (nav_h, jsonb_build_object('fr','Engagements'),   'anchor', 'engagements',  2, false),
      (nav_h, jsonb_build_object('fr','Équipe'),        'anchor', 'equipe',       3, false),
      (nav_h, jsonb_build_object('fr','Nous trouver'),  'anchor', 'loca',         4, false),
      (nav_h, jsonb_build_object('fr','Contact'),       'anchor', 'contact',      5, false),
      (nav_h, jsonb_build_object('fr','Blog'),          'anchor', 'blog',         6, false),
      (nav_h, jsonb_build_object('fr','Réserver'),      'anchor', 'reservation',  7, true);

    -- Pied de page : les 5 entrees actuelles, avec les ancres CORRIGEES.
    -- Les ancres d'origine etaient cassees : le footer construisait `#lacarte`
    -- et `#equipe` a partir des libelles, alors que les sections s'appellent
    -- `carte` et `equipe` (audit §4 : 2 liens sur 5 ne menaient nulle part).
    INSERT INTO public.navigation_items (navigation_id, label_i18n, target_type, target_value, position) VALUES
      (nav_f, jsonb_build_object('fr','La carte'),    'anchor', 'carte',       0),
      (nav_f, jsonb_build_object('fr','Histoire'),    'anchor', 'histoire',    1),
      (nav_f, jsonb_build_object('fr','Engagements'), 'anchor', 'engagements', 2),
      (nav_f, jsonb_build_object('fr','Équipe'),      'anchor', 'equipe',      3),
      (nav_f, jsonb_build_object('fr','Blog'),        'anchor', 'blog',        4);

    RAISE NOTICE 'Migration 025 : navigation header (8) + footer (5) creee';
  ELSE
    RAISE NOTICE 'Migration 025 : navigation deja presente — aucune modification';
  END IF;
END
$$;
