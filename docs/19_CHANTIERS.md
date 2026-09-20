# 19 — Chantiers, couloirs et registre de couverture

> **Objet** : savoir **qui couvre quoi**, et surtout **ce que personne ne couvre**.
> **Source de vérité machine** : `scripts/couloirs.json`, vérifié par
> `npm run verify:couloirs`.
> **Règle** : on n'écrit que dans son couloir. Lire celui de l'autre est toujours
> permis.

---

## 1. Pourquoi ce document existe

Le 2026-09-20 au matin, deux agents ont travaillé sur ce dépôt **sans le savoir** :

| Heure | Qui | Quoi |
|---|---|---|
| 07:35 | agent de vérification (Mavis) | correctif de la console, **déployé** |
| 08:28 | agent Cursor | pilote des dispositions de la Bannière, **déployé** |

Aucun dégât — les filets ont rattrapé, et le second déploiement contenait le
premier. Mais la collision était réelle. Un tableau dans un document n'aurait pas
suffi : **deux agents qui ne se lisent pas ne le respectent pas**. D'où un
contrôle exécutable, `npm run verify:couloirs`, à lancer **avant de pousser**.

---

## 2. Les couloirs

| Couloir | Branche | Périmètre d'écriture | Responsable |
|---|---|---|---|
| **Fiabilité et vérité du dépôt** | `vibe/fiabilite-depot` | `scripts/verify-*.mjs`, `scripts/test-*.mjs`, `src/contexts/SiteContext.tsx`, `src/cms/repository/**`, `supabase/migrations/**`, `supabase/rollbacks/**`, `AGENTS.md`, `docs/17`, `docs/19` | agent de vérification |
| **Modèle d'édition des sections** | `vibe/*` (une branche par fonctionnalité) | `src/sections/**`, `src/admin/editor/PropertyPanel.tsx`, `src/cms/model/sections/**`, `src/cms/renderer/**`, `docs/18` | agent Cursor |

**Fichiers partagés** — permis, mais à **annoncer** : `package.json`,
`src/admin/AdminPanel.tsx`, `src/admin/editor/PageEditor.tsx`,
`src/admin/editor/useEditor.ts`, `docs/00_TDR_GREATLIFE_CMS.md`.

---

## 3. Ressources partagées, et pourquoi ce sont elles qui font mal

**1. La production Cloudflare Pages est unique.** Un déploiement écrase le
précédent, quel que soit l'auteur. *Décision du propriétaire (2026-09-20) :
**les deux agents peuvent déployer**, chacun depuis sa branche une fois fusionnée
dans `main`, et **en l'annonçant**.*

**2. La base Supabase est unique.** Une migration ou un `UPDATE` s'appliquent à
tout le monde. *Règle* : toute écriture conserve la **liste exacte des lignes
touchées** et une **requête de retour arrière** (modèle :
`logs/retour-arriere-messages.sql`).

---

## 4. Registre de couverture

**État au 2026-09-20.** « Couvert » veut dire : une preuve existe (commit, filet
vert, ou mesure citée). Rien ici n'est une intention.

### 4.1 Couvert par l'agent Cursor

Console d'administration (15 modules), RBAC (matrice, granularité, descriptions,
historique, export, groupes, recherche), journal d'activité, e-mails
(invitations, lien magique, changement de rôle, erreurs visibles), site public
(médias, temps réel, blog, SEO, responsive), commandes en ligne, infrastructure
(cache, redirections SPA, déploiement), jeu de documents de passation,
**dispositions de la Bannière** (`d0473d8`), **aperçu de la Carte** (`a135708`).

### 4.2 Couvert par l'agent de vérification

Chaîne de publication (instantané publié, `033`), filets `verify:lot1`,
`verify:public`, `verify:anchors`, `verify:publication`, `verify:rbac`,
`verify:point3`, `verify:i18n`, `test:save-plan`, chargement suivant la session
(`0d7ece1`), nettoyage des lignes de test, configuration SMTP.

### 4.3 **NON COUVERT** — ce que personne n'a fait

| # | Sujet | Couloir | Preuve du manque |
|---|---|---|---|
| **N-1** | `orders.total` est en **TEXTE** → chiffre d'affaires incalculable, affiché **0 FG** | fiabilité | `select sum(total) from orders` → `function sum(text) does not exist` |
| **N-2** | `SiteContext.tsx` recopie les **4 coordonnées** du restaurant en dur, **sur le chemin public** | fiabilité | `verify:anchors` ne balaie que `src/sections` et `src/components` (26 fichiers) |
| **N-3** | `LivePreview.tsx` et `PageRenderer` sont du **code mort** | fiabilité | aucun `import` dans `src/` |
| **N-4** | `verify:anchors` ne vérifie qu'**une** page publiée (la première trouvée) | fiabilité | `find()` silencieux, revue 3 M-2 |
| **N-5** | `ANCHORS` de `PublicSite.tsx` (rendu historique) n'est **vérifié par rien** | fiabilité | revue 3 M-3 |
| **N-6** | Le **câblage** de `save()` n'a **aucun test** — seul le noyau pur en a | fiabilité | `test:save-plan` couvre `save-plan.ts`, pas `useEditor.save()` |
| **N-7** | `npm run lint` **inopérant** (aucune configuration ESLint dans le dépôt) | fiabilité | `git ls-tree` : absente, jamais présente |
| **N-8** | La **navigation** n'est ni rendue par le site, ni éditable | modèle d'édition | `navigation_items` : 13 lignes, aucun appelant |
| **N-9** | Les **adresses publiques** `contact@` / `resa@greatlife.gn` n'existent pas | données | un client qui écrit là n'atteint personne |
| **N-10** | Le **téléphone public** est `+224 000 00 00 00` | données | affiché sous « Appel & WhatsApp » |
| **N-11** | **8 réservations de test** sur 12, sans marqueur réversible | données | statut seul disponible |
| **N-12** | Le **mode « Avancé »** du TDR §13.1 (valeurs libres + 3 garde-fous) n'est pas implémenté | modèle d'édition | seules les dispositions l'ont été ; libellé dit encore « Variante » |
| **N-13** | `docs/12` annonce les migrations `001→029` alors que `033` existe | fiabilité | en-tête du document |
| **N-14** | Le **hero public** a changé sans publication (publié `fullscreen` ≠ brouillon `image_text`) | à trancher par le propriétaire | mesuré le 2026-09-20 |

---

## 5. Ce que je prends, et dans quel ordre

**Pris par l'agent de vérification** (couloir `fiabilite-depot`) :
`N-1, N-2, N-3, N-4, N-5, N-6, N-7, N-13` — puis `N-9, N-10, N-11` avec l'accord
du propriétaire, parce que ce sont des **écritures de données**.

**Non pris, volontairement** :
- `N-8` et `N-12` → couloir **modèle d'édition** (agent Cursor). La navigation et
  le mode Avancé touchent le rendu des sections et le panneau de propriétés.
- `N-14` → **décision du propriétaire** : quelle disposition doit être publiée.

**Ordre recommandé** : `N-1` (le chiffre d'affaires est faux, et c'est un chiffre
que le restaurateur lit), puis `N-9`/`N-10` (un client qui appelle ou écrit
n'atteint personne), puis le reste.

---

## 6. Avant de fusionner dans `main`

1. Rebaser sur `main`.
2. `npm run verify:couloirs` — **aucun fichier de l'autre couloir**.
3. Relancer **tous** les filets : `build`, `verify:lot1`, `verify:public`,
   `verify:anchors`, `verify:publication`, `verify:rbac`, `verify:point3`,
   `verify:i18n`, `verify:dispositions`, `test:save-plan`.
4. Annoncer le déploiement.
