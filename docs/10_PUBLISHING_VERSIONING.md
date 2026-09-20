# 10 — Publication, prévisualisation et versioning

> **Nature** : document de conception du **Lot 3** (PLAN).
>
> - **Version** : **4** — v1 → revue Fable (`reconsider`) → v2 → **arbitrage du propriétaire rendu le 2026-09-19 : option B**. Revues Fable consignées : PLAN (v1, `reconsider`), migrations 030/031 (`proceed-with-changes`, corrections appliquées), volets 1-3 (`proceed-with-changes`, corrections appliquées en v4). Les volets 1 à 3 sont livrés et vérifiés ; les volets 4-5 et l'application des migrations restent à faire.
> - **Date** : 2026-09-19
> - **Références** : TDR §3.3-3.6, §8, §21, §22, §23, §24, §31, §33, §40 (Lot 3), §41, §42 ; `AGENTS.md` §7, §8, §10, §11, §14, §15 ; `docs/16_FABLE_GOVERNANCE.md`
> - **Conception amont** : `docs/03_CMS_ARCHITECTURE.md` §7
> - **Statut** : **PLAN v2 — l'implémentation reste bloquée sur l'arbitrage du §7**

---

## 1. Objet

Le Lot 1 a créé les tables (`pages`, `page_sections`) et la table `page_versions` **vide**, en réservant explicitement son usage au Lot 3 (`023_cms_page_versions.sql`). Le Lot 2 a livré l'éditeur. Le Lot 3 rend la publication **sûre et réversible**.

### Périmètre tel que défini en amont — et non négociable unilatéralement

| Source | Ce qu'elle dit du Lot 3 |
|---|---|
| TDR §40 | `Lot 3 — Publishing` : **`draft`** · `preview` · `publish` · `versioning` |
| `docs/03:234` | Étape « Modification du contenu » → colonne **Lot 3** = **« brouillon persistant »** |
| `docs/03:235-237` | « aperçu de la version en brouillon » · « bouton *Publier* + création de version » · « versions (restauration) » |

**Le brouillon persistant fait partie du Lot 3.** La v1 de ce document le renvoyait à une décision ultérieure : c'était une **renégociation de périmètre non arbitrée**. Elle est retirée. Le §7 la présente désormais pour ce qu'elle est — une demande d'arbitrage bloquante — au lieu de la déguiser en « décision ouverte ».

---

## 2. État réel, mesuré le 2026-09-19 (lecture seule)

Ces mesures remplacent toute supposition. Elles justifient la moitié des décisions ci-dessous.

| Constat | Valeur mesurée | Conséquence |
|---|---|---|
| Page en base | 1 — slug `''` — `status = published` | La page est **en ligne** |
| `published_at` de cette page | **`null`** | TDR §21 « Date de publication » non renseignée. `updatePage` la renseigne à la prochaine publication (`pages.ts:159`) — à prouver, pas à supposer |
| `page_versions` | **0 ligne** | L'historique démarre vide ; la première version sera la **1** |
| Lecture **anon** de `page_sections` | **9 sections renvoyées** | Le contenu du CMS est **réellement servi au public** |
| Rendu public | `PublicSite.tsx:81-99` boucle sur `SectionRenderer`, encadré de `PublicNav` et `Footer` | **Le site public n'utilise pas `PageRenderer`** — « le renderer du site public » désigne un *assemblage*, pas un composant (correction n°8) |
| Abonnement Realtime | `SiteContext.tsx:437` (`page_sections`), `:440` (`pages`) | Une sauvegarde **se propage sans rechargement** aux visiteurs déjà présents |
| `menu_items` | **38 plats, 0 sans prix**, 0 prix non numérique, 10 catégories | La porte bloquante « prix renseignés » (§5.5) **ne peut pas enfermer le propriétaire** aujourd'hui. Hypothèse contraire de la revue : **écartée par la mesure** (correction n°7) |
| `navigation_items` | 13 lignes, toutes de type `anchor` | Les 8 ancres visées existent dans `page_sections` → contrôle §5.6 **vert aujourd'hui** ; il doit le rester |
| `site_content` | clés `restaurant`, `email_templates`, `site_config` | `restaurant` alimente le contrôle §5.7 |
| Colonne `menu_items.available` | **n'existe pas** | TDR §15 « Disponibilité » n'est pas modélisée → contrôle §5.4 ne peut pas la vérifier (à tracer, Lot 7) |
| Projet **OLD** (`gpvfryvmghjenwfqnkd`) | **injoignable** (`fetch failed`) | **Il n'existe aucun environnement d'écriture isolé** (correction n°2) |
| Framework de test | aucun (`package.json`) | Le seuil de preuve est celui de `AGENTS.md` §15 |

---

## 3. Le défaut bloquant confirmé par la mesure

**La chaîne est vérifiée de bout en bout, dans le code et en base :**

1. l'éditeur écrit **directement dans les tables vivantes** — `useEditor.ts:135-153` (`save()` → `updateSection`), `sections.ts:135-160` ;
2. la lecture publique lit **les mêmes lignes** — `sections.ts:82-93` → `pages.ts:65-67` (`status='published'`) ;
3. la RLS ne filtre que le statut et la visibilité — `021_cms_pages_sections.sql:108-118` ;
4. **en base : l'anon reçoit réellement les 9 sections** ;
5. Realtime propage le changement **sans rechargement**.

**Conséquence, énoncée sans détour :** aujourd'hui, `Sauvegarder` **publie**. Un contrôle §24 qui bloque le bouton *Publier* protégerait une porte pendant que la fenêtre reste ouverte. Le lot ne peut pas s'appeler « publication sûre » tant que le §22 n'est pas satisfait.

---

## 4. Décisions

| # | Décision | Justification |
|---|---|---|
| **P-1** | L'unité de publication est **la page**. | `docs/03:236` ; une seule page existe. Une publication « site entier » n'est demandée nulle part et créerait une seconde source de vérité sur l'état en ligne. |
| **P-2** | Une version est créée **à la publication**, jamais à chaque sauvegarde. | TDR §23 : « chaque publication **importante** ». Une version par frappe noierait l'historique. |
| **P-3** | Le snapshot contient `page` + `sections` (§5 du présent document pour la forme exacte). | `docs/12:117`. |
| **P-4** | Numérotation = `max(version) + 1` par page, protégée par `UNIQUE (page_id, version)`. | Évite une fonction Postgres donc **une migration**. |
| **P-5** | **Restaurer archive d'abord l'état courant**, puis réécrit. | §3.6. Sans ce filet, restaurer est une perte de données irréversible. |
| **P-6** | *(réécrite, correction n°3)* **Restaurer n'écrit que dans l'état de travail.** Tant que l'isolation du §7 n'est pas en place, **restaurer une page publiée EST une publication** : l'interface doit le dire avant l'action, et le plan ne prétendra pas le contraire. | §3.5. La v1 affirmait « restaurer ne publie pas » alors que c'était faux sous statu quo. |
| **P-7** | Un problème de niveau `error` **bloque** la publication ; un `warning` s'affiche sans bloquer. | §24. Une traduction anglaise manquante ne doit pas empêcher de publier. |
| **P-8** | **Aucune migration introduite par le lot en l'état** — sauf si l'option d'isolation retenue au §7 en exige une. | Confirmé par la revue (constat R3) : table, RLS et contrainte suffisent. |
| **P-9** | Le TDR §21 « Version » est satisfait par l'historique, **sans colonne `pages.version`**. | §16 : une colonne dupliquerait `page_versions`. |
| **P-10** | *(nouveau)* Le retry de P-4 est **discriminé localement dans `versions.ts`**, qui inspecte l'erreur brute (`code === '23505'` **et** nom de contrainte `page_versions_page_id_version_key`) avant de produire un message humain. | Correction n°5. **Aucune modification du contrat partagé `CmsResult`** (`client.ts:19`) : ce serait un changement de contrat API, donc une invocation Fable supplémentaire et un hors-périmètre (`AGENTS.md` §14). |
| **P-11** | *(nouveau)* « Pages valides » (§24) est implémenté par **deux validateurs distincts** : `validatePageForPublication(page)` (page : titre, slug, statut) **et** `validateSectionContent` (existant, réutilisé tel quel). | Correction n°6. La v1 appelait « Pages valides » un contrôle qui ne validait que des sections. |
| **P-12** | *(nouveau)* L'assemblage public est **extrait en un composant partagé** `PublicPageAssembly`, utilisé par `PublicSite` **et** par la prévisualisation. | Correction n°8 / constat I3. Sans extraction, « prévisualiser avec le renderer du site public » n'a pas de référent unique et le critère est invérifiable. |
| **P-13** | *(nouveau)* Le défaut du Lot 2 `useEditor.addSection` (`:102`, identifiant `temp-…` que `updateSection` ne peut pas adresser) est **corrigé dans ce lot**. | Découvert par la revue. Le Lot 3 construit l'historique sur `save()` : hériter d'un `save()` incapable de persister un ajout de section rendrait la restauration infidèle. Défaut **dans le périmètre fonctionnel du lot**, tracé ici pour ne pas le glisser en silence (`AGENTS.md` §14). |

---

## 5. Forme du snapshot

```jsonc
{
  "formatVersion": 1,
  "page": {
    "slug": "", "title": { "fr": "Accueil", "en": "Home" },
    "sortOrder": 0, "seo": {}, "status": "published",
    "publishedAt": "2026-09-19T08:00:00.000Z"
  },
  "sections": [
    { "id": "…", "type": "hero", "variant": "fullscreen", "position": 0,
      "visible": true, "anchor": null, "content": {}, "settings": {} }
  ]
}
```

`formatVersion` inconnu ⇒ **refus explicite** de restaurer, avec message humain. Jamais d'application à l'aveugle.

---

## 6. Contrôle avant publication (TDR §24)

Sept contrôles — les sept du TDR, ni plus ni moins (vérifié conforme par la revue, constat R5).

| # | Contrôle | Source | Message en langage restaurateur |
|---|---|---|---|
| 1 | **Pages valides** | page (**P-11**) + sections (`validateSectionContent`) | `Le titre de la page est vide.` / `« Titre » de la section Accueil est vide alors qu'il est obligatoire.` |
| 2 | **Navigation valide** | `navigation_items` | `Le lien « Carte » du menu pointe vers une page qui n'existe plus.` |
| 3 | **Images valides** | champs `image` des sections | `La section Accueil n'a pas d'image principale.` |
| 4 | **Menu valide** | `menu_items` | `La carte ne contient aucun plat.` |
| 5 | **Prix renseignés** | `menu_items.price` | `Le plat Burger maison n'a pas de prix.` *(exemple imposé par le TDR §24 ; aujourd'hui : 38 plats, 0 manquant)* |
| 6 | **Aucun lien cassé** | ancres de navigation ↔ ancres réelles | `Le lien « Notre histoire » vise une section qui n'existe pas sur cette page.` |
| 7 | **Informations essentielles** | réglages `restaurant` | `Le numéro de téléphone du restaurant n'est pas renseigné.` |

Module **pur** : reçoit des données déjà chargées, ne connaît ni Supabase ni React. C'est ce qui le rend testable **sans framework et sans écrire en base**.

Interdits (§24, `AGENTS.md` §9) : aucun message ne contient « Schema validation error », un nom de table, un numéro de migration ou du jargon de développeur.

---

## 7. ARBITRAGE REQUIS — isolation du brouillon (TDR §22)

**Bloquant. À trancher par le propriétaire avant implémentation des volets 4 et 5.**

Le problème est posé au §3. Quatre options :

| Option | Mécanisme | Migration | Effet réel | Risque |
|---|---|---|---|---|
| **A — Statu quo assumé** | Publier = basculer le statut ; l'éditeur avertit que la page est en ligne. | aucune | §22 **non satisfait** : `Sauvegarder` reste public. « Lot 3 » ne vaut alors que pour le versioning et le contrôle. | Le TDR §40 et `docs/03:234` ne sont pas honorés. |
| **B — Snapshot publié sur `pages`** | Colonne `pages.published_snapshot jsonb`. Le public lit **ce snapshot** (une seule lecture) ; l'éditeur écrit le brouillon dans les tables actuelles, inchangées. Publier = figer le brouillon dans le snapshot + créer la version. | **additive, 1 colonne**, + rollback | §22 **satisfait pour `page_sections`** — les expositions résiduelles sont listées en §7.2. | Le **chemin de lecture public** change (`sections.ts:82-93`). `page_sections` doit cesser d'être lisible en `anon` — c'est précisément l'application du §22. |
| **C — Colonnes publiées sur `page_sections`** | `published_content`, `published_settings`, `published_variant`, `published_position`, `published_visible`, `published_at`. Le public lit ces colonnes. | additive, **6 colonnes** + **suppression douce** (`deleteSection` devient un marquage) | §22 **satisfait**, modèle le plus standard. | Touche le comportement de suppression existant ; changement le plus large sur les données vivantes. |
| **D — Brouillon dans `page_versions`** | Le brouillon est une ligne `page_versions` marquée ; publier recopie le brouillon dans les tables vivantes. | aucune | §22 **satisfait** sans migration. | Détourne une table conçue comme **archive immuable** (`docs/12:281`) : le mot « version » désignerait deux choses, et le module versioning de ce lot serait à réécrire autour. |

**Recommandation de l'implémenteur : B.** Une seule colonne additive et réversible, un chemin de lecture public plus simple qu'aujourd'hui (une lecture au lieu de deux), aucun changement de comportement de l'éditeur, et l'énoncé §22 devient **vérifiable par un test anon en lecture seule** (§9). L'option D est écartée sans réserve pour raison sémantique ; C est correcte mais plus invasive sur des données vivantes ; A laisse le lot inachevé au regard du TDR §40.

**Tant que cet arbitrage n'est pas rendu, les volets 4 et 5 ne sont pas implémentés** (correction n°1 de la revue). Les volets 1 à 3 n'en dépendent pas.

---

## 7.1 Préconditions d'application de l'option B (issues de la revue des migrations)

> ✅ **CES PRÉCONDITIONS SONT REMPLIES — état mesuré au 2026-09-19.**
> Le tableau des cinq étapes ci-dessous décrit le **PLAN** tel qu'il a été validé,
> et il est conservé parce qu'il explique POURQUOI l'ordre était contraignant :
> cette raison reste vraie pour toute migration du même genre. Mais il n'était
> plus à jour, et un lecteur pouvait en conclure que 030 et 031 n'étaient pas
> appliquées (constat I-5 de la revue du 2026-09-19).
>
> | # | Étape | État RÉEL aujourd'hui |
> |---|---|---|
> | 1 | Migration `030` (colonne additive, sans effet) | **appliquée** |
> | 2 | Code **lisant** `published_snapshot` (public + signal de rafraîchissement) | **écrit** — `fetchPublicPageWithSections`, et `SiteContext` écoute `pages` |
> | 3 | Code **écrivant** `published_snapshot` | **écrit** — `publishPageWithSnapshot`, statut ET instantané dans un **seul** `UPDATE` |
> | 4 | Une publication réelle, qui remplit la colonne | **faite** — instantané en ligne, `published_at` concordant |
> | 5 | Migration `031` (coupe la lecture anon du brouillon) | **appliquée** — mesuré : **0** section lisible par un visiteur anonyme |
> | 6 | Migration `033` (garantit la précondition **en base**) | **appliquée** — `pages_published_requires_snapshot` |
>
> Le « maillon décisif » annoncé ci-dessous — « `publishPage` n'écrit **pas**
> `published_snapshot` » — **a été écrit** : c'est précisément ce que le Lot 3 a
> produit. La garde de `031` a donc pu s'appliquer sans provoquer la panne
> silencieuse que ce document décrivait.
>
> **Ce qui suit est le texte du plan, conservé tel quel** — les temps sont ceux
> de sa rédaction.

**Un maillon du code n'existait pas encore, et il était décisif** : `publishPage` n'écrit **pas** `pages.published_snapshot`. Tant que ce code n'est pas écrit, la colonne reste `NULL` après une publication — et la garde de `031` refusera donc de s'appliquer, à juste titre. C'est le maillon à produire avec les volets 4-5, avant toute application de `031`.

**Verdict Fable sur les migrations : `proceed-with-changes`.** 030 est applicable telle quelle ; **031 est refusée en l'état**, et porte désormais une garde en base qui le dit explicitement.

L'ordre est **contraignant** — et deux des cinq étapes sont des **développements non encore écrits**, pas des opérations :

| # | Étape | État au moment du plan |
|---|---|---|
| 1 | Migration `030` (colonne additive, sans effet) | écrite, **non appliquée** |
| 2 | Code **lisant** `published_snapshot` (public + signal de rafraîchissement) | **non écrit** |
| 3 | Code **écrivant** `published_snapshot` (`publishPage`) | **non écrit** |
| 4 | Une publication réelle, qui remplit la colonne | à faire par le propriétaire |
| 5 | Migration `031` (coupe la lecture anon du brouillon) | écrite (avec garde), **non appliquée** |

**Pourquoi cet ordre n'est pas de la prudence de forme.** Exécuter 031 avant l'étape 4 produit une panne **silencieuse et coûteuse** : `fetchPublishedPage` renvoie encore la ligne `pages`, `fetchSectionsForPage` renvoie un tableau **vide** (la RLS filtre, ce n'est pas une erreur), donc `PublicSite` retombe sur le **rendu historique**, sans erreur ni journal, pendant que l'éditeur affiche toujours « publié ». Le site CMS disparaît pour les visiteurs. La garde ajoutée à 031 refuse de s'appliquer dans cet état plutôt que de le provoquer.

À ne pas confondre : `NULL` (aucune page publiée) n'est pas `{}`.

## 7.2 Expositions résiduelles et point d'arbitrage ouvert

Le §22 n'est **pas** intégralement satisfait par l'option B. Listé ici pour ne pas être découvert plus tard :

1. **`pages.status` porte deux sens à la fois** — état de travail *et* interrupteur de publication. Conséquence : repasser une page en `draft` rend `published_snapshot` invisible à l'anon, donc **coupe le CMS côté public** (repli silencieux sur l'ancien rendu). C'est le comportement actuel, que l'option B ne change pas. **Arbitrage requis** : soit « repasser en brouillon coupe le site » est voulu et doit être dit dans l'interface, soit un brouillon ne doit pas couper le site — auquel cas `status` doit être découplé. **Ne pas corriger par une policy `OR published_snapshot IS NOT NULL`** : les policies RLS se cumulent en `OR`, ce qui exposerait `title_i18n` des pages non publiées.
2. **`pages` reste lisible en anon, toutes colonnes** pour une page publiée, or `title_i18n` / `seo` / `sort_order` sont devenus de l'état de travail. Exposition REST sans effet visuel aujourd'hui ; sujet réel dès qu'un SEO public sera câblé.
3. ~~**`navigation_items` n'est pas isolée** (`nav_items_public_read`, 022/026) : un libellé de menu modifié est public immédiatement, alors que le contrôle n°2 du §24 valide la navigation *avant* publication.~~ **PÉRIMÉ — voir la correction ci-dessous.** Le 2026-09-19, la navigation a été réexaminée : le site public **ne rend pas** `navigation_items` du tout. `PublicNav.tsx` et `Footer.tsx` portent des listes **écrites en dur**, et **aucun écran d'administration ne touche la navigation** (mesuré : `fetchSiteNavigation` n'est appelé que par `publishing.ts`). Le point décrivait donc un risque qui n'existe pas — mais il en révélait un autre : les contrôles n°2 et n°6 du §24 validaient 13 liens que **personne ne voyait**. Décision : ces deux contrôles sont déclarés **non vérifiés** dans le rapport au lieu d'afficher un vert mensonger (`PUBLICATION_CHECKS_NOT_VERIFIED`). Les ancres réellement servies restent vérifiées, au moment du développement, par `npm run verify:footer`.
4. **`site_content`** reste lisible et modifiable en direct (`content_public_read USING (true)`, 002 ; écran « Modifier le site »). Hors périmètre du Lot 3, mais à ne pas confondre avec un oubli.
5. ~~**Signal de rafraîchissement** : `SiteContext.refreshCmsSections` lit les **tables vivantes**, pas le snapshot. Après 031, cette lecture renverra `[]` pour un visiteur et ne survivra que par effet de bord.~~ **CORRIGÉ le 2026-09-19.** `SiteContext` n'écoute plus `page_sections` : il écoute `pages`, qui porte le statut **et** l'instantané. Le rendu et le signal lisent donc bien la même source, comme ce point l'exigeait. Vérifié : `SiteContext.tsx` n'écoute que `pages`, `menu_items`, `site_content`, `blog_posts`, `media_assets`, `orders`, `reservations`.
6. **`docs/12_DATABASE_SCHEMA.md`** documentait encore `sections_public_read`, que 031 supprime. ✅ **Fait le 2026-09-19** : le document porte désormais un tableau « le plan a été dépassé » (030/031/033) et la policy supprimée y est annotée « NE PAS RECRÉER ».
7. **Correction du 2026-09-19** — ce point affirmait que `reservations` et `messages` sont **lisibles par l'anon** (`USING (true)`, 007). **C'est faux.** Mesuré dans `pg_policies` : l'anon n'a que `INSERT` sur ces deux tables (`reservations_public_insert`, `messages_public_insert`) et **aucune** policy `SELECT` ; un `GET` anonyme renvoie 0 ligne. La cible `anon` existe bien, mais pour **déposer** une demande, pas pour **lire**. Le document décrivait un état antérieur à un durcissement. Il n'y a donc pas d'exposition ouverte ici — le §31 reste à surveiller sur ce point, sans défaut actif.

---

## 8. Sémantique de restauration — falsifiable (correction n°4)

`restaurerVersion(versionK)` :

1. **Lire** le snapshot K. `formatVersion` inconnu ⇒ refus, message humain.
2. **Archiver** l'état courant → version `N+1`, note `Avant restauration de la version K` (P-5).
3. **Supprimer** d'abord les sections du brouillon **absentes** du snapshot K (sinon la restauration n'est pas fidèle).
4. **Réécrire** ensuite chaque section du snapshot **avec son `id` d'origine** — insertion si absente, mise à jour si présente — puis les champs de page (`title`, `seo`, `sortOrder`, `slug`) ; **jamais `status`** (P-6).
5. **Signaler** tout échec partiel : `Restauration incomplète : 7 sections sur 10 — la section « menu » a été refusée.` La restauration est **rejouable** (idempotente), et la version créée à l'étape 2 permet de revenir en arrière.
6. **Collision d'ancre** (`page_sections_anchor_key`, `021:58-60`) : l'ordre « supprimer puis réécrire » la réduit ; si elle survient malgré tout, le message **nomme l'ancre en conflit**, sans jargon.

Justification de l'ordre 3 → 4 : réutiliser l'`id` d'origine évite de fabriquer des orphelins, mais impose de libérer d'abord les ancres occupées par les sections qui disparaissent.

---

## 9. Preuve — ce qui est prouvable, et comment (corrections n°2 et n°9)

**Il n'existe ni environnement de recette, ni base isolée** (mesuré : projet OLD injoignable). Écrire pour « prouver » reviendrait donc à écrire en production. Deux critères de la v1 étaient de ce fait contradictoires ; ils sont réécrits.

| Niveau (`AGENTS.md` §15) | Ce qui est prouvé | Moyen |
|---|---|---|
| **Compilé** | types stricts + build | `npm run build` |
| **Testé (sans écriture)** | les 7 contrôles §24 ; la discrimination d'erreur P-10 ; la construction et la lecture du snapshot ; la sémantique de restauration (étapes 1-5) sur données simulées en mémoire ; le refus d'un `formatVersion` inconnu | `npm run verify:lot3` — **lectures REST uniquement**, module pur exécuté en mémoire |
| **Testé (RLS, sans écriture)** | l'**anon ne peut pas lire le brouillon** (le cœur du §22) | `verify:lot3` émet des requêtes **avec la clé anon**, comme le ferait un visiteur |
| **Lecture seule sur la base** | schéma et policies conformes | `verify:lot3` + la sonde du §2 |
| **Vérifié manuellement** | publication réelle (création de la version 1) et une restauration, sur la page d'accueil, **par le propriétaire** | parcours navigateur, horodaté dans le rapport |
| **Non couvert par ce lot** | non-régression du rendu public | `npm run verify:lot1` reste le filet, et doit rester vert (§41) |

`verify:lot1` ne peut pas prouver la RLS : il utilise la clé de service (`verify-lot1.mjs:90`), qui la contourne. `verify:lot3` comble ce trou précis en interrogeant **en anon**.

---

## 10. Critères d'acceptation

1. Une page dont le contenu comporte une **erreur** ne peut pas être publiée ; le motif s'affiche en français, sans jargon.
2. Publier crée une entrée dans `page_versions`, numérotée à partir de 1, avec note et auteur.
3. L'historique liste les versions, la plus récente en tête : `Version N — date — auteur`.
4. **Voir** affiche le contenu d'une version **sans rien écrire**.
5. **Prévisualiser** rend une version via `PublicPageAssembly` (**P-12**) — même assemblage que le site public, pas une maquette d'administration.
6. **Restaurer** applique la sémantique du §8, en respectant P-5 (archivage préalable) et P-6 (statut inchangé).
7. **Réversibilité démontrée par construction** : la séquence `restaurer(K)` puis `restaurer(N+1)` ramène à l'état initial, **prouvé en mémoire** par `verify:lot3` (pas par une écriture en production).
8. `npm run build` passe ; `npm run verify:lot1` **reste vert** (§41) ; `npm run verify:lot3` prouve les points 1 à 7 **sans écrire en base**.
9. **Aucune écriture n'est effectuée sur la base de production par un script de vérification.** L'unique écriture du lot est la publication réelle, faite par le propriétaire (§9).
10. Si l'option d'isolation du §7 est retenue : **l'anon ne lit plus le brouillon** — vérifié par `verify:lot3`.

---

## 11. Risques et angles morts assumés

| Risque | Traitement |
|---|---|
| **Édition concurrente** (`docs/12:345`, risque R18) | **Non traitée.** P-4 couvre la collision de *numéro*, pas l'écrasement de *contenu*. Deux éditeurs, ou une restauration pendant une édition : le dernier écrit gagne, sans avertissement. Tracé ; l'affichage de la date de dernière modification est proposé comme garde-fou minimal. |
| **Absence de transaction** | Une restauration est une suite d'écritures sans atomicité (`sections.ts:186-200`, `useEditor.ts:143-153`). Traitement : restauration **rejouable** et échec **signalé** (§8.5). P-8 exclut une fonction Postgres qui réglerait le fond. |
| **Snapshot vs modèle après évolution** | `formatVersion` + refus explicite. |
| **Ancien type de section restauré** | Le contrôle §24 le classe en `error` : la page restaurée ne peut pas être publiée avant correction. |
| **`published_at` = `null` sur la page en ligne** | Corrigé à la première publication réelle (`pages.ts:159`). À **constater** après coup, pas à supposer. |
| **Contenu legacy `site_content`** | Tant que CM-12 n'est pas tranché, l'état publié reconstruit depuis `page_sections` **ne décrit pas tout** ce que voit le visiteur. Hors périmètre du lot, mais déclaré. |
| **`menu_items.available` inexistant** | Le contrôle §5.4 ne peut pas vérifier la disponibilité (TDR §15). Tracé pour le Lot 7. |
