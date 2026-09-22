# 23 — Journal des travaux console & CMS (septembre 2026)

> **Nature** : journal de livraison. Décrit ce qui a été **fait**, **vérifié** et **déployé**, pas une nouvelle vision produit.
> **Période** : 2026-09-21 → 2026-09-22.
> **Prod** : https://greatlife-conakry.pages.dev — base Supabase `atsujzoozqnjelngqkab`.
> **Sources** : état réel du dépôt (`git log`), kit `GREATLIFE-REDESIGN`, TDR / AGENTS.md.
> **Ne contient aucun secret** (mots de passe, clés).

---

## 1. Objet

Ce document trace la campagne qui a :

1. enrichi l’éditeur CMS (**Modifier le site** / Structure) ;
2. branché le chrome (en-tête / pied) et la mise en page sur le flux Publier ;
3. corrigé un déploiement trop large puis restauré la console admin ;
4. appliqué le kit de refonte **GREATLIFE-REDESIGN** à la console ;
5. audité et corrigé la Vue d’ensemble (dashboard).

Il sert de mémoire pour le propriétaire et les agents suivants (AGENTS.md §1, §16).

---

## 2. Chronologie des commits (`main`)

| SHA (court) | Message | Thème |
|---|---|---|
| `b7f820f` | Structure : En-tête et Pied dans Mise en page, libellés distincts | CMS Structure (+ mélange console, corrigé ensuite) |
| `4c60919` / `14b7d35` | Conflits package.json / BOM UTF-8 | Build |
| `5890f51` | Gabarit chrome public + scripts republication | Publier / snapshot |
| `a0b3d23` | Restaurer la console admin d’avant Structure | Remédiation |
| `e8a9855` | Sidebar rétractable (ouvert / rail / masqué) | Navigation console |
| `cd8aae2` | Lot UX A1–E3 (chargement, a11y, login FR) | Confiance dashboard |
| `d89c647` | Refonte console passes 1–2 (shell + écrans ops) | Kit redesign |
| `b90caa1` | Recâblage visuel éditeur CMS | Kit redesign |
| `57af174` | Tiroirs ops + Users/Apparence + groupes inspecteur | Kit redesign |
| `c46b750` | RBAC, Visibilité, Équipe, layout mobile | Kit redesign |
| `a7d2f3b` | Vue d’ensemble = file de service | Kit dashboard |
| `df326d4` | Corrections erreurs Vue d’ensemble | Qualité dashboard |

HEAD de référence au moment de la rédaction : **`df326d4`**.

---

## 3. CMS — Structure, chrome, publication

### 3.1 Structure (colonne gauche de l’éditeur)

- **En-tête** et **Pied** placés dans le tiroir **Mise en page** (plus de boîte « Cadre du site » isolée).
- Familles de blocs (Ouverture, Carte & offre, Maison, Venir…).
- Libellés distincts pour les doublons (titre éditable + type + badge `n/N`).
- Type cartographique renommé **Plan** (éviter la confusion avec « Carte » menu).
- Icônes revue (`src/lib/icons`).

**Fichiers typiques** : `src/admin/editor/SectionList.tsx`, `PageLayoutPicker.tsx`, `structure-labels.ts`, `chrome.tsx`, `schemas.ts`.

### 3.2 Pourquoi « Carte » apparaissait deux fois

- **Cause données** : deux sections `type: menu` distinctes en brouillon (même titre), pas un bug d’affichage seul.
- Seed : un seul menu ; le doublon venait probablement d’une duplication manuelle.
- **Action** : un doublon brouillon a été retiré (backup + SQL de retour arrière dans `logs/`, hors git). L’UI distingue désormais les restants.

### 3.3 Chrome site et publication (§22)

- Le cadre public (nav / pied) doit passer par **`published_snapshot.chrome`**.
- `freezeChrome` dans le chemin `publishPage`.
- Correctif `PublicSite` : sans chrome dans l’instantané, retomber sur le **gabarit**, pas sur des liens vides.
- Scripts utilitaires : `scripts/reconfig-freeze-chrome.mjs`, `scripts/reconfig-publish-home.mjs`.
- Publication réelle effectuée → **version 18** (chrome + sections alignés).

### 3.4 Mise en page (`pages.layout`)

- Colonne déjà présente en base (migration `036` / contrainte check) ; gabarit consommé via l’instantané publié.

---

## 4. Incident déploiement trop large & restauration

### 4.1 Problème

- `5890f51` était **étroit** (CMS uniquement).
- `b7f820f` avait **mélangé** une refonte large de `AdminPanel` (dashboard, messages, rail…) avec le lot Structure.
- Les déploiements `wrangler pages deploy dist` sans `.env` à la racine Vite ont produit un bundle **sans** `VITE_SUPABASE_*` → message « Supabase n’est pas configuré ».

### 4.2 Remédiation

- Console hors éditeur **restaurée** depuis `a3304ba` (`a0b3d23`), CMS Structure / éditeur **conservés**.
- Rebuild avec `.env` à la racine Vite (pas seulement le dossier parent).
- Documenté dans `docs/deployment.md` : variables **au build**, pas au deploy Wrangler.

---

## 5. Lot UX dashboard / sidebar (A1–E3)

Inspiré Web Interface Guidelines + ui-ux-pro-max, sans adopter un look SaaS violet.

| Id | Contenu |
|---|---|
| **A1 / A5** | Vérité du chargement (`SiteContext` finally / timeout) ; pastille « Mise à jour… / En ligne / Aperçu local » ; pas de seed affiché sous « Chargement… » |
| **A2** | Cartes « À traiter » / `OrganicCard` en vrais boutons (clavier) |
| **A3** | Filtres période en `Bouton` chrome (h ≥ 40, pas de pilules) |
| **C1** | Rail : monogramme « G. » |
| **D2** | Drawer mobile : focus trap, Esc, overscroll |
| **E3** | Erreurs auth en français métier ; CTA login rectangle |

Commit : `cd8aae2`. Sidebar rétractable : `e8a9855` (`admin-nav.ts`, modes ouvert / rail / masqué en édition).

---

## 6. Refonte kit GREATLIFE-REDESIGN

### 6.1 Source

Dossier hors dépôt (référence propriétaire) :

`C:\Users\MARA\Pictures\Screenshots\1\GREATLIFE-REDESIGN`

Documents clés : README, direction artistique, architecture, spécifications d’écrans, composants, UX/a11y, inspirations, exploration peps, prototype `10-console-corrigee.html`, prompt de correction.

### 6.2 Direction appliquée

- Fond papier crème, surfaces blanches, chrome / rail vert très sombre.
- Vert de marque = actions principales ; corail = urgences / erreurs / suppressions.
- Lime / tangerine / aqua **uniquement** zones éditoriales.
- Fraunces (titres), Manrope (UI), IBM Plex Mono (données techniques).
- Lignes pour données ops ; cartes pour résumés ; surfaces média pour CMS.
- Pas de grille de cartes SaaS générique ; pas d’emoji.

### 6.3 Livraisons par passe

1. **Shell** (`d89c647`) : `src/admin/console.css`, skip-link, barre basse mobile, tokens, Vue d’ensemble initiale, wraps ops.
2. **Écrans ops** : Commandes / Réservations / Messages en **lignes** ; Carte, Médias, Blog, Réglages, Journal.
3. **Éditeur CMS** (`b90caa1`) : recâblage **visuel** Structure | Aperçu | Inspecteur — **sans** changer `publishPage` / autosave / sélection.
4. **Écarts kit** (`57af174`, `c46b750`) : tiroirs détail commandes/réservations ; Users / Apparence / Visibilité / Équipe ; groupes inspecteur Contenu / Média / Action / SEO.

### 6.4 Vue d’ensemble (dashboard)

| SHA | Changement |
|---|---|
| `a7d2f3b` | File verticale Maintenant / Ensuite / À surveiller + panneau Activité / État du site ; un seul « Voir le site » |
| `df326d4` | Corail réservé aux urgences réelles (≥ 12 h) ; activité synthétisée si audit vide ; plus de barre de progression fictive ; retrait du bandeau CA à 0 dominant ; monospace limité aux références ; pied de rail « Réglages » |

---

## 7. Fichiers structurants (carte)

| Zone | Chemins |
|---|---|
| Shell & tokens | `src/admin/console.css`, `src/admin/AdminPanel.tsx`, `src/admin/admin-nav.ts`, `src/admin/ui.tsx`, `src/admin/editor/chrome.tsx` |
| Éditeur CMS | `src/admin/editor/PageEditor.tsx`, `SectionList.tsx`, `PropertyPanel.tsx`, `PreviewPane.tsx`, `PageLayoutPicker.tsx`, `ChromePanel.tsx`, … |
| Modèle / publish | `src/cms/model/sections/site-chrome.ts`, `chrome-presentation.ts`, `src/cms/repository/publishing.ts`, `src/sections/PublicSite.tsx` |
| Données console | `src/contexts/SiteContext.tsx`, `src/contexts/AuthContext.tsx`, `src/auth/LoginScreen.tsx` |
| Fonts | `src/config/fonts.ts`, `index.html` |
| Déploiement | `docs/deployment.md` |

Artefacts locaux **non versionnés** (volontaire) : `scripts/.work/`, probes, backups `logs/`.

---

## 8. Vérifications exécutées (sélection)

| Contrôle | Usage typique |
|---|---|
| `npm run build` | Typecheck + bundle prod (avec `.env` Vite) |
| `npm run verify:ecrans` | Chaque écran n’écrit que son domaine |
| `npm run verify:coquille` / `verify:charte` | Coquille 100dvh ; cliquet charte |
| `npm run verify:public` / `publication` / `anchors` | Instantané, chrome, liens |
| Audits CDP / captures | `scripts/.work/audit-dashboard-*` (hors git) |

**Limite connue** : le navigateur MCP Cursor a souvent échoué (« No browser tab available ») ; les revues utiles ont passé par Chrome système (CDP) ou validation propriétaire.

---

## 9. Décisions techniques retenues

1. **UI console ≠ site public** : jetons sous `[data-admin-shell]` dans `console.css`.
2. **Publier reste la vérité** pour le chrome et le layout publics.
3. **Pas de force-push** ; correctifs par commits additifs sur `main`.
4. **Staging explicite** : ne pas `git add -A` (probes / `.env` exclus).
5. **Mock HTML kit ≠ app React** : on reproduit les principes, pas le pixel-perfect du fichier `10-console-corrigee.html`.
6. **Deploy** : `npx wrangler pages deploy dist --project-name=greatlife-conakry` après `npm run build` avec `.env`.

---

## 10. Écarts restants / dettes

- Revue visuelle propriétaire encore souhaitable (desktop 1440 + mobile 375) après chaque lot.
- Vignettes culinaires / accents « peps » du kit d’exploration : partiels.
- Matrice RBAC : encore quelques styles hérités possibles.
- Netlify secondaire : vérifier qu’il n’y a pas d’URL « gn » en retard ; prod officielle = **Cloudflare Pages**.
- `verify:lot1` peut rester rouge hors périmètre (référence HTML fixe) ; `verify:coordonnees` rouge par design tant que les coordonnées ne sont pas finalisées.
- Fichiers locaux dirty hors journal (verify-*, probes, migration 036) : à traiter dans un lot dédié.

---

## 11. Comment rejouer / reprendre

```bash
# Local
cp ../.env .env   # si besoin — jamais committer
npm run build
npm run verify:ecrans

# Prod
npx wrangler pages deploy dist --project-name=greatlife-conakry --branch=main
```

URL admin : https://greatlife-conakry.pages.dev/admin  
Hard-refresh : Ctrl+Shift+R après un déploiement.

---

## 12. Documents liés

| Doc | Rôle |
|---|---|
| `docs/00_TDR_GREATLIFE_CMS.md` | Vision produit |
| `docs/19_CHANTIERS.md` | Couloirs agents |
| `docs/21_ARCHITECTURE_CONSOLE.md` | Architecture console |
| `docs/22_DIAGNOSTIC_CONSOLE.md` | Diagnostic antérieur (2026-09-21) |
| `docs/deployment.md` | Build / Cloudflare / piège `.env` |
| `docs/18_DISPOSITIONS_DE_BLOC.md` | Dispositions sections |
| Kit externe GREATLIFE-REDESIGN | Direction visuelle de la refonte |

---

*Rédigé pour clôturer la campagne console/CMS de fin septembre 2026. Mettre à jour ce journal (ou un `24_…`) lors de la prochaine vague majeure.*
