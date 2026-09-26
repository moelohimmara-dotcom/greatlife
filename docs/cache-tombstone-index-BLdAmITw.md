# Jeton d'invalidation de cache — `assets/index-BLdAmITw.js.map`

## Pourquoi ce fichier existe

Le build `index-BLdAmITw.js` (commit `b3bc483`, 18/09/2026) a été produit lorsque
`vite.config.ts` activait encore `sourcemap: true`. Sa **source map** a donc été déployée sur
Cloudflare Pages, puis **mise en cache au niveau edge**.

Or une source map publie le **code source intégral**. Celle-ci contenait notamment le littéral
du mot de passe de démonstration. Son URL restait servie en `HTTP 200`
(`CF-Cache-Status: HIT`, 1 907 101 octets) malgré :

1. la désactivation des source maps dans `vite.config.ts` ;
2. plusieurs redéploiements ne contenant plus ce fichier ;
3. la suppression des anciens déploiements Cloudflare concernés.

## Le contenu exposé est inerte

Le mot de passe concerné a été **remplacé par rotation**, et les deux comptes de démonstration
ont été **bannis** (niveau auth) et **désactivés** (`admin_users.active = false`). Le littéral
exposé ne permet donc aucune authentification. Voir `docs/01_EXISTING_PROJECT_AUDIT.md`,
risques R1 et R4.

Cela ne rend pas l'exposition acceptable pour autant : un mot de passe en clair sur un CDN
public reste un défaut, indépendamment de sa validité.

## Ce que fait le jeton

`public/` est copié tel quel dans `dist/` à chaque build. Le fichier
`public/assets/index-BLdAmITw.js.map` occupe donc **exactement l'URL fuitée**, avec un contenu
JSON inerte. Le déploiement modifie ce chemin, ce qui force l'invalidation de l'entrée de
cache et remplace la carte exposée.

## Quand le retirer

Dès que `GET /assets/index-BLdAmITw.js.map` ne renvoie plus l'ancienne carte — contenu attendu
soit le jeton inerte, soit le repli SPA (`index.html`). Aucun build courant ne référence ce nom
de fichier : sa suppression est sans effet fonctionnel.

## ✅ RETIRÉ le 2026-09-26 — critère vérifié avant suppression

**Mesure faite le 2026-09-26 12:15 UTC**, avant toute suppression :

| | Avant | Mesure du jour |
|---|---|---|
| `GET /assets/index-BLdAmITw.js.map` | `200`, **1 907 001 octets**, la source map exposée (`CF-Cache-Status: HIT`) | `200`, **485 octets**, `content-type: application/json`, contenu = le jeton inerte |

L'ancienne carte n'est donc **plus servie** : le critère de retrait est rempli. Les fichiers
`public/assets/index-BLdAmITw.js.map` et `public/assets/README-index-BLdAmITw.md` ont été
retirés du dépôt ; l'URL répondra désormais par le repli SPA, ce que le critère accepte
explicitement. Le présent document reste la trace de l'incident et de sa fermeture.

## Portée plus large

Ce n'est pas seulement ce fichier qui posait problème : **tous les `.map` générés par les
builds précédents** étaient publiés. La correction de fond est la désactivation des source maps
en production, appliquée dans `vite.config.ts` (`sourcemap: mode === 'development'`).
