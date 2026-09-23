# WIREFRAMES — Console admin Greatlife

> **Statut** : source de vérité pour la refonte visuelle de la console.
> **Origines** : modèle `modele-console-administration-restauration` (IA & structure)
> + kit `GREATLIFE-REDESIGN` (identité cream/forêt) + état réel du dépôt.
> **Viewport de référence pour revue** : **960 × 457**.
> **Stack** : React + Vite + Supabase (pas Next.js). Tokens sous `[data-admin-shell]`
> dans `src/admin/console.css`.

Ce document prescrit layouts, dimensions, espacements, couleurs, typo, bordures,
rayons, ombres, icônes, libellés, états, interactions, responsive et a11y.
Si une décision n’est pas écrite ici, **ne pas inventer** : réutiliser les
composants existants (`Bouton`, `PageHeader`, `Icon`) et l’identité déjà en place.

---

## 0. Inventaire des écrans

| Clé | Route | Libellé | Groupe |
|---|---|---|---|
| `dashboard` | `/admin` | Tableau de bord | Pilotage |
| `orders` | `/admin/commandes` | Commandes | Pilotage |
| `reservations` | `/admin/reservations` | Réservations | Pilotage |
| `messages` | `/admin/messages` | Messages | Pilotage |
| `content` | `/admin/atelier` | Modifier le site | Contenu |
| `menu` | `/admin/carte` | Carte & prix | Contenu |
| `blog` | `/admin/blog` | Blog | Contenu |
| `media` | `/admin/mediatheque` | Médias | Contenu |
| `team` | `/admin/equipe` | Équipe & contenus | Contenu |
| `theme` | `/admin/apparence` | Thème & ambiance | Apparence |
| `visibility` | `/admin/visibilite` | Visibilité | Apparence |
| `settings` | `/admin/reglages` | Réglages globaux | Système |
| `forms` | `/admin/formulaires` | Formulaires & emails | Système |
| `users` | `/admin/utilisateurs` | Utilisateurs & rôles | Système |
| `audit` | `/admin/journal` | Journal d’activité | Système |

Groupes de navigation (libellés exacts) : **Pilotage** · **Contenu** · **Apparence** · **Système**.

---

## 1. Tokens (identité Greatlife)

Appliqués uniquement sous `[data-admin-shell]` :

| Token | Hex / valeur | Usage |
|---|---|---|
| `--admin-ink` | `#182019` | texte, rail sombre |
| `--admin-forest` | `#245c2d` | action primaire, nav active |
| `--admin-forest-hover` | `#1c4923` | survol primaire |
| `--admin-forest-mid` | `#3d7a3c` | liens, succès |
| `--admin-paper` | `#fbf8f1` | toile de travail |
| `--admin-paper-muted` | `#f2ede2` | surfaces secondaires |
| `--admin-surface` | `#ffffff` | panneaux |
| `--admin-coral` | `#d34a3a` | urgence, erreur, suppression **uniquement** |
| `--admin-saffron` | `#d89a2b` | attention, réservation |
| `--admin-sage` | `#dce6d7` | badges calmes |
| `--admin-line` | `#ded8cb` | bordures / séparateurs |
| `--admin-lime` / `--admin-tangerine` / `--admin-aqua` | accents éditoriaux ponctuels | CMS / graphiques seulement |
| `--admin-radius-control` | `12px` | champs, boutons |
| `--admin-radius-panel` | `16px` | panneaux (kit : 18 px — écart assumé si densité 960×457) |
| `--admin-radius-media` | `24px` | surfaces média fortes |
| `--admin-shadow` | `0 8px 24px rgba(24,32,25,.07)` | panneau, jamais sous chaque carte |
| `--admin-rail-w` | `248px` | rail desktop |
| `--admin-rail-compact` | `72px` | rail compact |
| `--admin-font-ui` | Manrope | interface |
| `--admin-font-display` | Fraunces | titres de page |
| `--admin-font-mono` | IBM Plex Mono | refs commande, slugs, journal |

Échelle typo : 12 / 13 / 14 / 16 / 18 / 24 / 30–32 / 44. Titres en casse phrase.
Focus visible : anneau 2 px forêt + halo clair. Transitions 160–220 ms contrôles ;
`prefers-reduced-motion` respecté. Cibles tactiles ≥ 44 × 44 px.

Espacements de base : 4 / 8 / 12 / 16 / 24 / 32 px.

---

## 2. Shell applicatif

```text
┌─ rail 248px ──────┬─ main ─────────────────────────────────────┐
│ marque G.         │ topbar : fil d’Ariane · service · compte   │
│ switcher resto    ├────────────────────────────────────────────┤
│ Pilotage …        │ titre page + action principale             │
│ Contenu …         │ zone de travail (max ~1120–1280)           │
│ Apparence …       │                                            │
│ Système …         │                                            │
│ pied : Voir site  │                                            │
│ compte            │                                            │
└───────────────────┴────────────────────────────────────────────┘
```

### Rail
- Fond `--admin-ink`, texte clair.
- Item actif : fond `--admin-forest`, texte blanc.
- Badges compteurs : fond `--admin-coral`, texte blanc (Pilotage seulement).
- Groupes : 11 px, poids 700, tracking léger, **pas** de capitales forcées.
- Compact 72 px : icônes seules + `aria-label` / tooltip ; libellé accessible.
- Mobile ≤768 px : drawer + barre basse (onglets Accueil / Commandes / Résas / Messages / Carte + Plus).

### Topbar
- Hauteur mini ~52 px, padding bas 16 px, bordure `--admin-line`.
- Fil d’Ariane : `Greatlife › {module}`.
- Lien « Voir le site » = action globale hors nav métier.
- Skip link « Aller au contenu » en première tabulation.

### En-tête de page (tous les modules)
```text
GREATLIFE / ADMINISTRATION → **Greatlife / Administration** (casse phrase, pas de capitales forcées)
{Titre}                             ← Fraunces ~25–30 px
{Sous-titre une ligne}              ← 12–14 px muted
                         [Action principale]
```

---

## 3. Tableau de bord (`dashboard`)

Objectif : savoir quoi traiter en < 10 s.

```text
[Header + Voir le site]
[Toolbar : resto chip · statut sync · périodes Aujourd’hui|7 j|30 j]

┌ À traiter maintenant ────────────────────────────── [Tout voir →] ┐
│ N actions prioritaires                                              │
│ [N commandes] [N réservations] [N messages]   ← 3 boutons cliquables│
└─────────────────────────────────────────────────────────────────────┘

[KPI ×4 : CA · Résas · Commandes · Messages]   ← données live, pas de % fictifs

┌ Performance (graphique) ─────┐ ┌ État du site ──────────┐
│ courbes résas + commandes    │ │ en ligne · % essentiels│
└──────────────────────────────┘ └────────────────────────┘

┌ Activité récente (table) ────┐ ┌ Actions rapides ───────┐
│ Événement · Date · État      │ │ 2×2 boutons            │
└──────────────────────────────┘ └────────────────────────┘
```

Règles :
- Pas de métrique inventée (visiteurs, pourcentages marketing).
- Si CA = 0 : ne pas monopoliser l’écran ; message utile + lien commandes.
- Attention : fond paper-muted, bordure line, items surface blanche.
- `aria-live` pour les compteurs en attente.

---

## 4. Commandes (`orders`)

```text
[Header + Exporter]
[KPI ×4 : à traiter · délai · aujourd’hui · en retard]
[Bandeau alerte si retard / paiement — corail seulement si action requise]
[Onglets filtre + compteurs] [Filtrer] [Kanban|Tableau]
[Kanban 5 colonnes OU table]
[Détail sélectionné | Mode cuisine]
```

Colonnes kanban : Nouvelles · Confirmées · En préparation · Prêtes · Terminées.
Ligne / carte : id, client, heure, résumé, montant, statut, CTA.
Clic : conserve le contexte (panneau / zone bas). Confirmation seulement si
irréversible ou notifie le client. Mobile : cartes compactes.

---

## 5. Réservations (`reservations`)

```text
[Header + Nouvelle réservation]
[Bandeau calendrier / jours]
[Table : Heure · Client · Personnes · Téléphone · Statut]
```

Statuts ops : En attente → Confirmée → … → Annulée.

---

## 6. Messages (`messages`)

```text
[Header + Actualiser]
[KPI ×3 : non lus · ce mois · temps de réponse]
[Filtres Toutes|Non lus|Traités + compteurs] [Rechercher] [Filtrer]
┌ Liste ~360px ────────┬─ Conversation flexible ──────────────┐
│ point corail + texte │ tête contact · corps · réponse       │
└──────────────────────┴──────────────────────────────────────┘
```

Non traité = point corail **et** libellé texte (jamais couleur seule).

---

## 7. Modifier le site (`content`) — CMS

```text
[Barre : Retour · page · état brouillon · Aperçu · Enregistrer · Publier]
┌ Structure ~35% ┐ ┌ Aperçu ~40% ┐ ┌ Modifier ~25% ┐
│ pages/sections │ │ device      │ │ Contenu/Design│
│ drag · visible │ │ brouillon   │ │ FR|EN         │
└────────────────┴───────────────┴────────────────┘
```

Actions : Annuler · Rétablir · Prévisualiser · Enregistrer le brouillon · Publier.
Publier : résumé + validations bloquantes. Preview badge Brouillon.
Champs groupés : Contenu · Média · Action · SEO & accessibilité.
Flux : BROUILLON → PRÉVISUALISATION → VALIDATION → PUBLICATION → EN LIGNE.
≤900 px : panneau droit sous l’aperçu ; ≤600 px : colonnes empilées.

---

## 8. Carte & prix (`menu`)

Liste filtrable + formulaire. Barre dirty : « N modifications non enregistrées ».
Plat : image, prix (nombre éditable, affichage devise), catégorie, description,
allergènes, badges (légende, pas couleur seule), disponibilité, signature.

---

## 9. Blog (`blog`)

Header + Nouvel article. Table : Titre · Catégorie · Modification · Statut
(Brouillon / Publié).

---

## 10. Médias (`media`)

Dropzone : formats, tailles, ratio, compression avant validation.
Grille + recherche + filtres + panneau détail (alt, crédit, usages).

---

## 11. Équipe & contenus (`team`)

Sous-onglets : Équipe · Engagements · Témoignages (compteurs).
Table membres : Nom · Rôle · Description · Visibilité.

---

## 12. Thème & ambiance (`theme`)

Grille de thèmes (sélection bordure 2 px forêt). Typographie séparée.
Enregistrer = action principale.

---

## 13. Visibilité (`visibility`)

Liste de bascules section par section (titre + aide). Pas de page-scroll
sans sommaire si > ~1000 px.

---

## 14. Réglages globaux (`settings`)

Sous-menu / TOC sticky. Sections : Identité · Coordonnées · Horaires · Réseaux.
Sauvegarde domaine uniquement (pas d’écriture-bloc). Barre dirty persistante.

---

## 15. Formulaires & emails (`forms`)

Deux colonnes : Destinataires | Réponse automatique.

---

## 16. Utilisateurs & rôles (`users`)

Table utilisateurs + matrice des accès. Inviter = action principale.

---

## 17. Journal d’activité (`audit`)

Table : Action · Utilisateur · Module · Date. Export optionnel.

---

## 18. Composants réutilisables

- `Bouton` : primary / secondaire / silencieux / danger / loading / disabled.
- `PageHeader` / `admin-wf-header` : eyebrow + titre + sous-titre + action.
- `Icon` (`@/lib/icons`) : SVG cohérents, **jamais d’emoji**.
- Panneau `admin-wf-panel` : padding ~16–17 px, bordure line, fond surface.
- Table dense `admin-wf-table` : lignes, pas cartes SaaS partout.
- Status chips homogènes entre modules.
- Empty / loading / error dimensionnés (pas de layout shift).
- SaveBar dirty pour écrans d’édition.

États obligatoires pour tout interactif : repos, hover, focus-visible, pressé,
disabled, loading, erreur, vide, succès.

---

## 19. Responsive & viewport 960×457

| Largeur | Comportement |
|---|---|
| 375 | drawer / barre basse ; colonnes empilées |
| 768 | 2 colonnes ; détail en panneau |
| **960×457** | **viewport de revue** : densité élevée, pas de scroll horizontal, rail compact OK |
| 1024 | rail + contenu |
| 1440 | CMS 3 colonnes ; lecture max ~1280 |

Aucun scroll horizontal global. `overscroll-behavior: contain` sur drawers.

---

## 20. Accessibilité (obligatoire)

- Labels visibles ; inputs avec `name` / `autocomplete` pertinents.
- Icon-only → `aria-label`.
- Focus `:focus-visible` (jamais `outline: none` sans remplacement).
- Toasts / sync : `aria-live="polite"`.
- Sémantique : `header` / `nav` / `main` / titres hiérarchiques.
- Destructive : confirmation.
- Ellipsis typographique `…` ; chargements « Mise à jour… » / « Enregistrement… ».

---

## 21. Anti-patterns (refusés)

- Grille uniforme de cartes SaaS partout.
- Corail décoratif.
- Métriques fictives (visiteurs, +% marketing).
- Contenu administrable en dur dans le rendu public.
- Écriture-bloc multi-domaines (voir `verify:ecrans`).
- Capitales forcées sur tous les labels.
- Ombre grise sous chaque élément.

---

## 22. Checklist de revue (par écran)

1. Structure / hiérarchie / zones interactives = § module.
2. Tokens, rayons, ombres, typo = §1.
3. États documentés présents.
4. Données live (SiteContext / Supabase), pas de mock persisté.
5. a11y §20.
6. Desktop + mobile + **960×457** sans scroll X.
7. Capture navigateur avant de passer à l’écran suivant.
