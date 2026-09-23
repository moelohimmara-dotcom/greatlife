# 25 — Préférences de la console

> **Date** : 2026-09-23 · **Décision** : option **A** (module opérateur dédié).

## Décision

La console reçoit un écran **Préférences de la console** (`consolePrefs` → `/admin/preferences`),
indépendant des **Réglages du restaurant** (`settings`) et de **Thème & ambiance** (`theme`).

| Écran | Portée | Persistance |
|---|---|---|
| Préférences de la console | Chrome / densité / menu / guides — **cet appareil** | `localStorage` (`greatlife-admin-console-prefs`) |
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
- Jetons `data-admin-chrome` / `data-admin-density` dans `console.css`
