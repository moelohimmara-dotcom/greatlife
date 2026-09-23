# 24 — Audit expert console Médias (+ guide in-app)

> **Date** : 2026-09-23  
> **Route** : `/admin/mediatheque` (module `media`)  
> **Prod** : https://greatlife-conakry.pages.dev/admin/mediatheque  
> **Méthode** : parcours Chrome CDP (desktop 1440×900 + mobile 390×844) ; skills **ui-ux-pro-max** (`--domain ux` media library / upload / empty states) et **web-design-guidelines** (Vercel) ; lecture `MediaManager.tsx` + `console.css`.  
> **Preuves** : `scripts/.work/audit-medias/`  
> **Numérotation** : `docs/21_*` est déjà pris (`21_ARCHITECTURE_CONSOLE.md`) — ce lot ouvre **24**.  
> **Couloir** : correctifs UI + guide sur `MediaManager` / `console.css` / ce doc. Pas de migration ni edge (agent sécu en parallèle).

---

## 1. Synthèse

La page Médias est déjà une **médiathèque utilisable** (import, dossiers dérivés des emplacements, grille/liste, détail, filtres). Les défauts majeurs étaient : **fausse promesse « Nouveau dossier »**, empty state peu pédagogique, **suppression sans confirmation**, jargon « Emplacement cible », **pas de guide** pour le restaurateur, et quelques écarts a11y (focus recherche, cibles tactiles filtres).

Correctifs P0/P1 + **MVP de guidance** livrés dans le même lot (tip dismissible, « Comment ça marche », empty states avec CTA).

---

## 2. Trois colonnes

### Déjà top

| Élément | Preuve | Pourquoi garder |
|---|---|---|
| Dropzone + bouton Importer + clavier | `01-medias-desktop-1440.png` | Upload accessible (drag **et** click/Enter) |
| Dossiers dérivés des emplacements + compteurs | folders 16 / Hero 1 / Galerie 11… | Vocabulaire site, pas de double vérité fichier/dossier |
| Grille + bascule Liste + tri | library head | Vue dense / scan rapide |
| Panneau détail (aperçu, emplacement, actions) | `03-medias-detail-selected.png` | Un média = un contexte clair |
| Filtre Non utilisé | `04-medias-filter-unused.png` | Aide au ménage |
| `aria-live` statut upload | code | Feedback async (guidelines) |
| Charte console (forêt / papier) | screenshots | Cohérence console |

### À améliorer (P0–P2)

| ID | P | Constat | Justification | Statut lot |
|---|---|---|---|---|
| M1 | **P0** | Bouton « Nouveau dossier » n’ouvrait aucun dossier | Fausse affordance (ui-ux-pro-max / honesty) | **Corrigé** → « À propos des dossiers » + guide |
| M2 | **P0** | Empty « Non utilisé » : « Importez… » alors que 16 fichiers existent | Empty States : message + action adaptés | **Corrigé** + CTA « Afficher tous les médias » |
| M3 | **P0** | Supprimer sans confirmation | Guidelines · Destructive actions | **Corrigé** (Confirmer / Annuler) |
| M4 | **P1** | Recherche `outline: 0` sans remplacement | Focus states | **Corrigé** (`:focus-within` ring) |
| M5 | **P1** | Filtres / dossiers &lt; 44 px | Touch targets | **Corrigé** `min-height: 44` |
| M6 | **P1** | Menu « … » détail sans action | Anti-pattern dead control | **Retiré** |
| M7 | **P1** | Jargon « Emplacement cible » + dims techniques | TDR §4 vocabulaire restaurateur | **Adouci** (« Où l’afficher », dims métier) |
| M8 | **P1** | Texte alt / légende non persistés (message technique) | Confiance ; ne pas faire croire à une sauvegarde | Hint `admin-hint-box` clarifié ; **persist = backend** (matrice) |
| M9 | **P2** | Densité verticale (toolbar + upload + 2 rangées filtres) avant la grille — pire en mobile | First content delayed | **Partiel** (guide/tip) ; collapse upload = lot suivant |
| M10 | **P2** | Noms de fichiers très longs / chip détail | Truncation / `text-wrap: pretty` | **Amélioré** CSS clamp |
| M11 | **P2** | Tri « Plus récents » = ordre dépôt (pas de `created_at` sur `MediaSlot`) | Fragile si l’ordre change | Documenté ; flux `created_at` = matrice |
| M12 | **P2** | Pastille utilisé/non-utilisé surtout couleur (+ `aria-label`) | Ne pas se fier à la seule couleur | OK a11y minimale ; badge texte = P2 |

### À ajouter

| ID | P | Nouveauté | Valeur | Backend ? |
|---|---|---|---|---|
| N1 | P0 | Guide in-app (« Comment ça marche » + tip dismissible) | Onboarding restaurateur sans IA | **Non** — livré MVP |
| N2 | P1 | Persistance texte alternatif + légende | Accessibilité publique réelle | **Oui** — colonnes `media_assets` |
| N3 | P1 | Multi-import (plusieurs fichiers) | Gain de temps | **Partiel** (input `multiple` + boucle) — pas ce lot |
| N4 | P1 | Remplacer / prévisualiser avant import | Moins d’erreurs | Front + éventuellement Storage |
| N5 | P2 | Dossiers libres utilisateur | Organisation perso | **Oui** — schéma dossiers |
| N6 | P2 | Sélection multiple + suppression groupée | Ménage | Front + API delete batch |
| N7 | P2 | Recherche / filtres dans l’URL | Deep link (guidelines) | Front (`?folder=&q=`) |
| N8 | P2 | Virtualisation si &gt; 50 médias | Perf (guidelines) | Front |
| N9 | P2 | Vignettes vidéo (poster) | Scan bibliothèque | Front + évent. poster Storage |
| N10 | P3 | Quota / taille max explicite | Confiance upload | Config + message UX |

---

## 3. Findings web-design-guidelines (`file:line`)

### `src/admin/modules/MediaManager.tsx` (avant correctifs → après)

```text
MediaManager.tsx:272-278 - « Nouveau dossier » fausse CTA → remplacé « À propos des dossiers »
MediaManager.tsx:417-424 - empty state générique → empty pédagogique + CTA reset / import
MediaManager.tsx:467-469 - bouton Options icon-only sans menu → retiré
MediaManager.tsx:531-537 - delete immédiat → confirmation
MediaManager.tsx:441 - img sans width/height/lazy → width/height + loading=lazy
MediaManager.tsx:267 - placeholder "…" OK après harmonisation
MediaManager.tsx — selects : aria-labelledby / aria-label ajoutés
MediaManager.tsx — guide + tip (MVP) ajoutés
```

### `src/admin/console.css`

```text
console.css:4404-4413 - search outline:0 sans ring → focus-within ring
console.css:4482+ - filtres padding faible → min-height 44 + focus-visible
console.css:4436+ - dossiers idem
console.css — blocs .admin-wf-media-guide / -tip / -empty / -confirm-del ajoutés
```

---

## 4. Guide MVP (implémenté)

Pattern réutilisé : `admin-hint-box` (déjà Menu / Visibilité) + nouveau panneau `admin-wf-media-guide` (`<details>`) et tip dismissible (`localStorage` clé `glife.medias.guide-tip.dismissed`).

Vocabulaire : Importer, Où l’afficher, Dossiers, Bannière, Plat, Équipe — **pas** bucket, slot, RLS, JSON.

Hors périmètre : chatbot IA (AGENTS.md §18).

---

## 5. Matrice correspondance (ajouts ↔ backend)

| Besoin produit | Front seul | Migration / API | Notes |
|---|---|---|---|
| Guide / tips / empty pédagogiques | ✅ | — | Ce lot |
| Alt + légende persistés | UI champs déjà là | `media_assets.alt_text`, `caption` (+ RLS update) | Ne pas prétendre « Enregistré » tant que absent |
| `created_at` pour tri fiable | brancher `MediaSlot` | déjà en table | Couloir SiteContext / repository |
| Dossiers libres | UI | table `media_folders` + FK | Porte de phase |
| Bulk delete | UI multi-select | delete batch Storage + rows | |
| Multi-upload | `input multiple` | idem upload actuel | |

---

## 6. Preuves

- Login OK → `/admin/mediatheque`
- Screenshots : `00`…`11` dans `scripts/.work/audit-medias/`
- Rapport machine : `scripts/.work/audit-medias/report.json`

---

## 7. Next

1. Après merge `main` : redéployer Pages et rejouer `run.mjs` (vérifier tip + guide + empty Non utilisé).  
2. Décision propriétaire : prioriser **alt persisté** (N2) vs multi-import (N3).  
3. Lot mobile : plier la zone d’import derrière « Ajouter une photo » pour remonter la bibliothèque.
