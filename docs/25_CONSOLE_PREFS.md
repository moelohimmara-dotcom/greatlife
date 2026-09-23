# 25 — Préférences de la console

> **Date** : 2026-09-23 · **Décision** : option **A** (module opérateur dédié).
> **Enrichi** : 2026-09-23 — mode clair / nuit, accent, pastilles, animations.
> **Chromie** : 2026-09-23 — séparation chrome atelier / canvas public (`--admin-bar-*`).

## Décision

La console reçoit un écran **Préférences de la console** (`consolePrefs` → `/admin/preferences`),
indépendant des **Réglages du restaurant** (`settings`) et de **Thème & ambiance** (`theme`).

| Écran | Portée | Persistance |
|---|---|---|
| Préférences de la console | Chrome console (clair/nuit, ambiance, accent, densité, menu, pastilles, animations, guides) — **cet appareil** | `localStorage` (`greatlife-admin-console-prefs`) |
| Réglages du restaurant | Identité, coordonnées, réseaux, e-mails | `site_content` + miroir `restaurant` |
| Thème & ambiance | Palette et polices du **site public** | `site_config` (`themeId`, `fontId`) |

**Pourquoi pas `site_content.admin_console_prefs` au MVP** : une clé restaurant
partagée imposerait le chrome d’un opérateur à tous les comptes, et risque une
fuite publique si la RLS est trop large. Sync multi-appareils éventuelle = clé
**par utilisateur**, plus tard.

**Pourquoi pas B** : `SettingsEditor` ne contient déjà que du domaine « site »
— rien à extraire comme console.

**Pourquoi pas C** : le TDR n’interdit pas un chrome console ; `console.css`
isole déjà les jetons sous `[data-admin-shell]`.

## Stratégie plateforme (chrome ≠ canvas)

Alignement avec WordPress / Shopify / Webflow / Notion :

| Zone | Suit… | Greatlife |
|---|---|---|
| **Chrome admin** (rail, topbar, listes, cartes modules) | Préférence clair/nuit **opérateur** | `data-console-theme` → jetons `--admin-*` |
| **Canvas / aperçu site** | Thème **public** (ou fond neutre), jamais forcé en « nuit console » | iframe `data-admin-canvas="public"` + `--c-*` / `rootStyle` |
| **Panneaux édition** (Structure, PropertyPanel, Publication) | Chrome admin | `--admin-surface` / `--admin-ink` / `--admin-bar-*` |

**Règle** : un restaurateur en mode nuit voit un atelier sombre, mais la
prévisualisation de la page d’accueil reste fidèle au site client.

### Piège corrigé (2026-09-23)

`--admin-ink` servait à la fois de **couleur de texte** et de **fond sombre**
(toolbar atelier, onglets actifs). En mode nuit, `--admin-ink` devient clair →
toolbar claire + texte clair = illisible. **Solution** : jetons dédiés
`--admin-bar-*` pour les surfaces inversées ; `--admin-ink` = texte uniquement.

## Séparation console ≠ site

- Les préférences écrivent uniquement des attributs `data-*` sur `[data-admin-shell]`.
- Le site public continue de lire `themeId` / `fontId` et les variables `--c-*`.
- `AdminShell` force `color` / `background` sur les jetons `--admin-*` pour que le
  `rootStyle` du thème public ne « fuite » pas dans le chrome opérateur.
- L’iframe d’aperçu CMS ne consomme **pas** `data-console-theme` : fond
  `var(--c-cream)`, styles publics inchangés.

## Préférences (MVP)

| Clé | Valeurs | Attribut shell | Effet |
|---|---|---|---|
| `theme` | `clair` · `nuit` | `data-console-theme` | Mode clair (papier **et sidebar** crème) ou nuit (fond + sidebar sombres) |
| `chrome` | `creme` · `foret` | `data-admin-chrome` | Nuance du papier **et du rail** en mode clair (teinte verte si forêt) |
| `accent` | `foret` · `corail` · `safran` | `data-console-accent` | Couleur des actions / item actif nav (`--admin-forest`) |
| `density` | `confortable` · `compacte` | `data-admin-density` | Marges panneaux **et** padding du menu latéral |
| `nav` | `open` · `rail` | (via `admin-nav`) | Menu déplié ou rail d’icônes |
| `showBadges` | bool | `data-console-badges` | Pastilles compteurs menu / bas mobile |
| `reduceMotion` | bool | `data-console-motion` | Coupe transitions / animations console |
| guides | reset | — | Réaffiche les astuces masquées (`CONSOLE_TIP_KEYS`) |

Aperçu : immédiat (événement `greatlife-console-prefs-changed` → `appliquerConsolePrefsAuShell`).

### Jetons (`--admin-*`)

Sous `[data-admin-shell]` :

| Famille | Rôle |
|---|---|
| `--admin-ink` / `--admin-ink-soft` | Texte sur papier / surface |
| `--admin-muted` | Texte secondaire (labels, aides) — dérivé de `--admin-ink` |
| `--admin-paper` / `--admin-paper-muted` / `--admin-surface` / `--admin-line` | Fonds et bordures modules |
| `--admin-bar-bg` / `--admin-bar-fg*` / `--admin-bar-border` | Chrome inversé (toolbar atelier, onglets actifs, panneau Publication) — **reste sombre en nuit** |
| `--admin-rail-*` | Sidebar / bottom-nav |
| `--admin-tint-base` | Base des `color-mix` de pastilles (blanc en clair, surface en nuit) |
| `--admin-canvas-gutter` | Gouttière autour de l’iframe aperçu (chrome atelier) |
| `--admin-forest` (+ accents) | Actions / liens |
| `--admin-on-ink` | Texte sur bouton accent |

Ces jetons basculent avec `data-console-theme` / `data-admin-chrome` /
`data-console-accent`. Les boutons et champs console (`styleBouton`,
`inputStyle`, `PageHeader`) lisent ces jetons — plus la palette publique
`useSite().theme` — pour que Clair/Nuit s’applique à tout l’atelier.

## Navigation

- Groupe **Système** : entrée « Préférences de la console ».
- Pied de rail + avatar topbar → cet écran (plus vers Réglages restaurant).
- « Réglages du restaurant » reste dans la nav Système.

## RBAC

Tous les rôles du panneau peuvent lire/écrire leurs préférences locales
(`MODULE_ACCESS.consolePrefs`). Aucune écriture base.

## Fichiers

- `src/admin/console-prefs.ts`
- `src/admin/modules/ConsolePrefsEditor.tsx`
- `src/admin/AdminShell.tsx` (applique les attributs + isole la couleur)
- `src/admin/console.css` (jetons + `data-console-theme`)
- `src/admin/ui.tsx` · `src/admin/editor/chrome.tsx` (contrôles → `--admin-*`)
- `src/admin/editor/PreviewPane.tsx` (`data-admin-canvas="public"`)
- Preuves : `scripts/.work/audit-console-theme/`
