# Greatlife — Déploiement & CI

> Production actuelle : **Netlify** (https://greatlife-gn.netlify.app). Vercel est aussi configuré. Voir [README](../README.md) pour les variables d'env.

## Build

```bash
npm install
npm run build    # tsc --noEmit + vite build → dist/
```

`dist/` est le dossier publié. SPA fallback obligatoire (toutes les routes servent `index.html`).

## Netlify (production active)

Config : `netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = "dist"
[build.environment]
  NODE_VERSION = "20"
[[redirects]]            # SPA fallback
  from = "/*"
  to = "/index.html"
  status = 200
[[headers]]              # cache immuable des assets
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

- **URL** : https://greatlife-gn.netlify.app
- **Variables d'env** : *Site settings → Environment variables* → ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (et d'autres `VITE_*` si besoin).
- **Déploiement CLI** : `netlify deploy --prod --dir=dist`
- **Déclencheurs** : push sur `main` (auto via Netlify Git integration si connecté).

## Vercel (alternative)

Config : `vercel.json`
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [ { "source": "/(.*)", "destination": "/" } ]
}
```

1. Importer `moelohimmara-dotcom/greatlife` sur [vercel.com](https://vercel.com).
2. Framework détecté : Vite (auto).
3. *Environment Variables* : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Deploy → URL `*.vercel.app`.

## Variables d'environnement — récapitulatif

| Variable | Plateforme | Côté | Rôle |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Netlify / Vercel | client (publique) | URL projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Netlify / Vercel | client (publique) | clé anon |
| `SMTP_USER` | **Supabase Edge Function secrets** | serveur | compte SMTP Gmail |
| `SMTP_PASS` | **Supabase Edge Function secrets** | serveur | mot de passe d'application Gmail |

> ⚠️ Les secrets SMTP ne se mettent **pas** côté Netlify/Vercel mais dans Supabase → Functions → `send-contact-email` → Secrets. Voir [emails.md](./emails.md) et [DEVELOPMENT.md → Sécurité](../DEVELOPMENT.md#sécurité).

## CI GitHub Actions

Fichier : `.github/workflows/build-test.yml`

- **Déclencheurs** : push ou PR sur `main`, + `workflow_dispatch`.
- **Job** `build` (ubuntu, Node 20, cache npm) :
  1. `npm ci`
  2. `npx tsc --noEmit` (typecheck strict)
  3. `npx vite build`
- **Permissions** : `contents: read`.

> ⚠️ Pas de tests automatisés actuellement (seulement typecheck + build). La CI ne couvre donc que la compilation. Voir [DEVELOPMENT.md → Roadmap](../DEVELOPMENT.md#8-roadmap--pistes-dévolution).

## Domaine personnalisé `greatlife.gn`

- **CNAME** → `cname.vercel-dns.com` (si Vercel) **ou** configurer les DNS dans Netlify (*Domain settings*).
- Sur la plateforme : ajouter le domaine dans *Settings → Domains*.
- Vérifier le certificat SSL (provisionné automatiquement).
- **Penser à mettre à jour** : `index.html` (`og:url`, `canonical`, `twitter:*`), et l'`og:site_name` via le contenu éditable en admin.

## Checklist de mise en production

- [ ] `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` définis (Netlify/Vercel).
- [ ] Migrations SQL appliquées sur la base de prod (001 → 012).
- [ ] `is_admin()` présente ; utilisateurs créés dans *Auth* + rôles dans `admin_users`.
- [ ] Secrets `SMTP_USER` / `SMTP_PASS` configurés dans Supabase ; **fallbacks en dur retirés** du code (voir [emails.md](./emails.md)).
- [ ] Edge Function `send-contact-email` déployée.
- [ ] Realtime activé sur les tables (migrations 009, 012).
- [ ] Buckets Storage créés (`media`, `food-photos`, `team-portraits`, `blog-images`).
- [ ] `index.html` : meta/canonical pointant vers le bon domaine.
- [ ] Build CI vert.

## Liens
- [README](../README.md)
- [database.md](./database.md) — migrations à appliquer
- [emails.md](./emails.md) — secrets de l'Edge Function
- [DEVELOPMENT.md](../DEVELOPMENT.md) — checklist PR & sécurité
