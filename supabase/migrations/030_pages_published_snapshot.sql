-- Greatlife - Migration 030 : snapshot publie (TDR §22)
-- ====================================================
-- Option B, arbitree par le proprietaire le 2026-09-19 (docs/10_PUBLISHING_VERSIONING.md §7).
--
-- PROBLEME RESOLU
--   `pages` et `page_sections` ne portaient qu'un seul etat (verifie en base :
--   l'anon recevait les 9 sections de la page publiee). Des lors que la page
--   etait `published`, chaque sauvegarde de l'editeur partait immediatement
--   chez les visiteurs : le brouillon n'existait pas (TDR §22 non satisfait).
--
-- PRINCIPE
--   Les tables `pages` / `page_sections` deviennent l'ETAT DE TRAVAIL (le
--   brouillon). Le site public ne lit plus que `pages.published_snapshot`,
--   fige a la publication.
--
--   brouillon (tables vivantes)  --publier-->  published_snapshot (lu par le public)
--
-- Cette migration est STRICTEMENT ADDITIVE : une colonne nullable, aucune
-- donnee existante modifiee, aucun comportement change. Le basculement du
-- chemin de lecture public est un changement de CODE, deploye separement
-- (voir la sequence de deploiement ci-dessous).
--
-- PRECONDITIONS D'APPLICATION (ce n'est PAS une procedure executable)
--
--   1. Cette migration (030).                       - additive, sans effet
--   2. Du code lisant `published_snapshot`...       - ** PAS ENCORE ECRIT **
--   3. ...et un code ECRIVANT `published_snapshot`. - ** PAS ENCORE ECRIT **
--   4. Une publication reelle, qui remplit la colonne.
--   5. Alors seulement : 031_lock_draft_sections.sql
--
-- Les etapes 2 et 3 ne sont PAS des operations : ce sont des DEVELOPPEMENTS a
-- faire. A ce jour, aucune ligne de `src/` ne mentionne `published_snapshot`
-- (ni lecture, ni ecriture) : la colonne est posee, personne ne l'utilise.
-- Les points a cabler sont :
--   - lecture publique   : src/cms/repository/sections.ts (fetchPublicPageWithSections)
--   - ecriture publique  : src/cms/repository/publishing.ts (publishPage)
--   - signal de rafraichissement : src/contexts/SiteContext.tsx (refreshCmsSections)
--
-- POURQUOI L'ORDRE EST CONTRAIGNANT
--   Executer 031 avant l'etape 4 retire a `page_sections` sa seule policy de
--   lecture anon, alors qu'AUCUN snapshot n'existe. Le visiteur ne verrait pas
--   une page vide : il verrait l'ANCIEN rendu. `fetchPublishedPage` renvoie
--   encore la ligne `pages`, `fetchSectionsForPage` renvoie un tableau VIDE
--   (la RLS filtre, ce n'est pas une erreur), donc le site retombe
--   SILENCIEUSEMENT sur le rendu historique, pendant que l'editeur affiche
--   toujours « publie ». Aucune erreur, aucun journal : la panne la plus
--   couteuse du lot. La migration 031 porte desormais une garde qui refuse de
--   s'appliquer dans cet etat ; celle-ci ne dispense pas de respecter l'ordre.
--
--   Attention a la distinction : `NULL` n'est pas `{}`. Avant l'etape 4, la
--   colonne vaut `NULL` — « aucune page publiee » — et non un snapshot vide.
--
-- Idempotente. Reversible par : supabase/rollbacks/030_rollback.sql

-- ---------------------------------------------------------------- colonne
-- `jsonb` nullable et SANS defaut : une page jamais publiee n'a pas de
-- snapshot, et `NULL` doit rester distinguable de `{}` (« publie, page vide »).
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS published_snapshot jsonb;

COMMENT ON COLUMN public.pages.published_snapshot IS
  'Etat publie de la page : { formatVersion, page, sections } (docs/10 §5). Fige a la publication. NULL = jamais publiee. Le travail en cours reste dans pages / page_sections.';

-- ---------------------------------------------------------------- index
-- Le public cherche une page publiee par son slug : l'index existant
-- (pages_slug_key) suffit. Aucun index supplementaire n'est cree, pour ne pas
-- payer un cout d'ecriture sans besoin demontre.

-- ---------------------------------------------------------------- RLS
-- AUCUNE policy n'est ajoutee ni modifiee ici.
--
-- `pages_public_read` (migration 021) autorise deja l'anon a lire les lignes
-- `status = 'published'`, donc `published_snapshot` est deja lisible par le
-- public : c'est exactement l'effet recherche. La colonne ne contient que ce
-- qui est destine a etre vu - elle est produite au moment de la publication.
--
-- Le confinement de la LECTURE PUBLIQUE (retirer l'acces anon a
-- `page_sections`, qui porte desormais le brouillon) appartient a la
-- migration 031, apres deploiement du nouveau chemin de lecture.
