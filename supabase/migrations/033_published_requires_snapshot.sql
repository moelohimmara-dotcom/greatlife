-- Greatlife — Migration 033 : interdire une page publiée SANS instantané
-- ============================================================================
-- POURQUOI (constat I1 de la revue indépendante)
-- `pages` acceptait `status = 'published'` avec `published_snapshot IS NULL`.
-- Mesuré en transaction annulée :
--     INSERT ... (status, published_snapshot) VALUES ('published', NULL) -> ACCEPTÉ
--
-- Le code évite cet état : `publishPageWithSnapshot` écrit statut ET instantané
-- dans le MÊME UPDATE. Mais la BASE, elle, l'autorisait — et deux chemins y
-- mènent :
--     src/cms/repository/pages.ts:250  setPageStatus(id, status)  (exporté)
--     src/cms/repository/pages.ts:224  updatePage(id, { status }) (exporté)
-- Aucun appelant ne les utilise aujourd'hui avec 'published' : c'est un danger
-- LATENT, pas un défaut actif. Mais la garantie revendiquée (« aucun instant ne
-- montre une page publiée avec un instantané NULL ») ne tenait que par le code.
-- Or l'architecture de ce CMS repose sur la RLS et les contraintes EN BASE,
-- jamais sur la seule discipline du client (TDR §31).
--
-- CE QUE LA CONTRAINTE EMPÊCHE, CONCRÈTEMENT
-- Une page publiée sans instantané : le public ne recevrait RIEN du CMS et
-- retomberait sur l'ancien rendu, pendant que l'éditeur afficherait « En ligne ».
-- C'est le repli silencieux, exactement celui que la migration 030 désigne comme
-- le mode de panne le plus coûteux du lot.
--
-- CE QU'ELLE N'EMPÊCHE PAS, ET C'EST VOLONTAIRE
--   - `draft` ou `archived` avec un instantané : autorisé. Dépublier ne doit pas
--     effacer la dernière version publiée (TDR §22 : c'est elle qui disparaît de
--     la lecture publique, pas de la base) ;
--   - l'instantané reste modifiable librement tant que la page n'est pas publiée.
--
-- PRÉREQUIS : aucune ligne existante ne doit violer la contrainte. Le bloc de
-- contrôle ci-dessous le vérifie AVANT de créer la contrainte, et échoue
-- bruyamment sinon — on ne « répare » pas des données en silence.

-- 1. Contrôle préalable : des lignes violent-elles déjà la règle ? -------------
DO $$
DECLARE
  fautives integer;
BEGIN
  SELECT count(*) INTO fautives
  FROM public.pages
  WHERE status = 'published' AND published_snapshot IS NULL;

  IF fautives > 0 THEN
    RAISE EXCEPTION
      'Migration 033 refusee : % page(s) publiee(s) sans instantane. Corriger les donnees avant d''appliquer la contrainte.',
      fautives;
  END IF;
END $$;

-- 2. La contrainte ------------------------------------------------------------
-- `NOT VALID` n'est PAS utilise : le controle ci-dessus garantit que les lignes
-- existantes la respectent, donc on la veut validante et opposable.
ALTER TABLE public.pages
  DROP CONSTRAINT IF EXISTS pages_published_requires_snapshot;

ALTER TABLE public.pages
  ADD CONSTRAINT pages_published_requires_snapshot
  CHECK (status <> 'published' OR published_snapshot IS NOT NULL);

COMMENT ON CONSTRAINT pages_published_requires_snapshot ON public.pages IS
  'Une page publiee doit porter son instantane : sans lui le public ne recoit rien du CMS et retombe silencieusement sur l''ancien rendu (TDR §22).';
