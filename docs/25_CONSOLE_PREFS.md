# 25 — Préférences de la console

> **Date** : 2026-09-23 · **Décision** : option **A** (module opérateur dédié).
> **Enrichi** : 2026-09-23 — mode clair / nuit, accent, pastilles, animations.

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

## Séparation console ≠ site

- Les préférences écrivent uniquement des attributs `data-*` sur `[data-admin-shell]`.
- Le site public continue de lire `themeId` / `fontId` et les variables `--c-*`.
- `AdminShell` force `color` / `background` sur les jetons `--admin-*` pour que le
  `rootStyle` du thème public ne « fuite » pas dans le chrome opérateur.

## Préférences (MVP)

| Clé | Valeurs | Attribut shell | Effet |
|---|---|---|---|
| `theme` | `clair` · `nuit` | `data-console-theme` | Mode clair (papier) ou nuit (fond sombre type rail) |
| `chrome` | `creme` · `foret` | `data-admin-chrome` | Nuance du papier en mode clair |
| `accent` | `foret` · `corail` · `safran` | `data-console-accent` | Couleur des actions (`--admin-forest`) |
| `density` | `confortable` · `compacte` | `data-admin-density` | Marges des panneaux |
| `nav` | `open` · `rail` | (via `admin-nav`) | Menu déplié ou rail d’icônes |
| `showBadges` | bool | `data-console-badges` | Pastilles compteurs menu / bas mobile |
| `reduceMotion` | bool | `data-console-motion` | Coupe transitions / animations console |
| guides | reset | — | Réaffiche les astuces masquées (`CONSOLE_TIP_KEYS`) |

Aperçu : immédiat (événement `greatlife-console-prefs-changed` → `appliquerConsolePrefsAuShell`).

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
- Jetons dans `src/admin/console.css` (`data-console-theme`, `data-console-accent`, …)
