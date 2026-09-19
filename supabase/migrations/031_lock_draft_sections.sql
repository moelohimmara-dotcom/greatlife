-- Greatlife - Migration 031 : le brouillon cesse d'etre lisible par le public
-- =========================================================================
-- Option B, arbitree le 2026-09-19 (docs/10_PUBLISHING_VERSIONING.md §7).
--
-- A NE PAS EXECUTER avant que le site public ne lise `pages.published_snapshot`
-- ET qu'au moins une publication reelle ait rempli ce snapshot.
-- Voir la sequence de deploiement en tete de 030.
--
-- POURQUOI CETTE MIGRATION EXISTE
--   Tant que `page_sections` reste lisible par `anon`, le brouillon fuit : il
--   suffit d'appeler l'API REST pour lire le travail en cours. Le TDR §22 dit
--   « un brouillon ne doit jamais fuiter vers un visiteur » : la protection
--   doit etre en base (TDR §31), pas dans la seule application.
--
-- Idempotente. Reversible par : supabase/rollbacks/031_rollback.sql

-- GARDE BLOQUANTE
-- La precondition ci-dessus n'est pas laissee a la memoire de l'operateur : le
-- §31 exige que la garantie soit EN BASE. Sans cette garde, l'erreur est
-- silencieuse (voir l'en-tete de 030) ; avec elle, la migration refuse de
-- s'appliquer et dit exactement ce qui manque.
DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n
    FROM public.pages
   WHERE status = 'published'
     AND published_snapshot IS NOT NULL;

  IF n = 0 THEN
    RAISE EXCEPTION
      'Migration 031 refusee : aucune page publiee ne porte de published_snapshot. Appliquez 030, deployez la lecture du snapshot, publiez une page reelle, puis relancez 031.';
  END IF;
END $$;

-- ---------------------------------------------------------------- lecture publique
-- La policy d'origine (migration 021) laissait l'anon lire toute section
-- `visible = true` d'une page publiee - c'est-a-dire le BROUILLON, desormais.
DROP POLICY IF EXISTS "sections_public_read" ON public.page_sections;

-- ---------------------------------------------------------------- lecture administration
-- `sections_admin_read` (migration 021, roles owner/manager) reste en place et
-- couvre l'editeur : le personnel autorise continue de lire le brouillon.
-- Rien n'est elargi, rien n'est restreint pour l'administration.

-- ---------------------------------------------------------------- ce qui n'est PAS fait
-- Aucune policy n'est creee sur `pages.published_snapshot` : l'anon y accede
-- par la policy existante `pages_public_read` (statut `published`), et cette
-- colonne ne contient que du contenu destine a etre publie.
--
-- Aucun trigger de synchronisation automatique entre `page_sections` et
-- `published_snapshot` n'est cree : la publication est un geste EXPLICITE
-- (TDR §3.5, §22). Un declencheur automatique rendrait le brouillon public a
-- la premiere ecriture, soit exactement le defaut que cette migration corrige.
--
-- EXPOSITIONS RESIDUELLES - le §22 n'est PAS integralement satisfait par 031.
-- A tracer, a arbitrer, et a ne pas confondre avec un oubli :
--
--   1. `pages` reste lisible en anon, TOUTES COLONNES, pour une page publiee
--      (`pages_public_read`, 021). Or `title_i18n`, `seo`, `sort_order` sont
--      desormais de l'etat de travail : ils sont editables dans l'editeur.
--      Aujourd'hui aucune vue publique ne les consomme (exposition REST sans
--      effet visuel) ; cela devient un vrai sujet des qu'un SEO public sera
--      cable. Fermer proprement demande des GRANT par colonne : une decision,
--      pas une retouche.
--
--   2. `navigation_items` n'est pas isolee : `nav_items_public_read` (022,
--      remplacee par 026) laisse l'anon lire toute entree `visible = true`.
--      La navigation est pourtant du contenu administrable, et le controle n°2
--      du TDR §24 la valide avant publication. Un libelle modifie est donc
--      public immediatement.
--
--   3. `site_content` reste lisible et modifiable en direct : `content_public_read
--      USING (true)` (002) et l'ecran « Modifier le site » (AdminPanel).
--      Declare hors perimetre du Lot 3 - mais ne pas lire l'en-tete de 031
--      comme « §22 satisfait pour tout contenu administrable ».
--
--   4. `pages.status` porte DEUX sens a la fois : etat de travail ET
--      interrupteur de publication. Consequence : repasser une page en
--      `draft` rend `published_snapshot` invisible a l'anon, donc coupe le CMS
--      cote public (repli silencieux sur le rendu historique). Ce point n'est
--      ni corrige ni corrigeable ici : il demande un arbitrage.
--      Ne PAS elargir la policy avec `OR published_snapshot IS NOT NULL` : les
--      policies RLS se cumulent en OR, ce qui exposerait `title_i18n` des pages
--      NON publiees. A trancher avant d'ecrire du code, pas dans une migration.
