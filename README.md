# Greatlife — Site vitrine & Panneau admin

Restaurant fast-food bio à Conakry, Guinée. Site vitrine + panneau d'administration.

## Stack

- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Déploiement** : Vercel
- **Code** : GitHub (`moelohimmara-dotcom/greatlife`)

## Démarrage

```bash
npm install
cp .env.example .env   # Variables Supabase pré-configurées
npm run dev             # http://localhost:5173
```

## Variables d'environnement

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé anonyme Supabase |
| `RESEND_API_KEY` | Clé API Resend (emails) — pour l'Edge Function |

## Structure

```
src/
├── config/         # Thèmes, polices, badges
├── data/           # Menu (38 items), rôles RBAC, utilisateurs
├── lib/icons/      # Icônes SVG + illustrations alimentaires
├── contexts/       # AuthContext + SiteContext
├── hooks/          # useIsMobile, useScrollSpy
├── components/
│   ├── ui/         # Primitives (Card, Reveal, SectionHead, etc.)
│   └── nav/        # Navigation publique responsive
├── sections/       # Hero, Carte, Story, Engagements, Team, Localisation, Contact, Blog, Footer
├── auth/           # LoginScreen + ProtectedRoute
├── admin/          # AdminShell + 8 modules
├── App.tsx         # Router + Providers
└── main.tsx        # Entry point
supabase/
├── migrations/     # 001_init, 002_rls, 003_storage
└── functions/      # send-contact-email (Edge Function)
```

## Modes de fonctionnement

Le site fonctionne dans deux modes selon la configuration Supabase :

- **Mode Supabase (recommandé)** : si `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont définis, le site charge les données depuis Supabase (menu, contenu, messages), persiste les modifications de l'admin, authentifie via Supabase Auth (avec repli local) et envoie les emails du formulaire via l'Edge Function.
- **Mode démo (local)** : sans variables d'environnement, le site reste utilisable (auth locale, données en mémoire, faux envoi de formulaire). Aucune donnée n'est persistée.

L'indicateur de connexion est visible sur le tableau de bord admin.

## Accès admin

- **URL** : `/login` puis `/admin`
- **Propriétaire** : `owner@greatlife.gn` / `greatlife2026`
- **Gérant** : `gerant@greatlife.gn` / `greatlife2026`
- Pour l'auth Supabase, créez ces comptes dans *Supabase → Authentication → Users* et renseignez leur rôle dans la table `admin_users`.

## Supabase

- **Projet** : `gpvfryvmghjenwfqhnkd`
- **URL** : `https://gpvfryvmghjenwfqhnkd.supabase.co`
- **Région** : eu-west-1
- **Tables** : `menu_items` (38), `messages`, `site_content`, `admin_users` (4)
- **Storage** : `food-photos`, `team-portraits`, `blog-images`
- **Edge Function** : `send-contact-email` (active)

## Déploiement Netlify (actif)

Le site est déployé sur Netlify — URL de production : **https://greatlife-gn.netlify.app**

- Build : `npm run build` (Vite), dossier publié : `dist`
- Config : `netlify.toml` (redirect SPA, cache des assets, Node 20)
- Déploiement via CLI : `netlify deploy --prod --dir=dist`
- Variables d'environnement \`VITE_SUPABASE_*\` à définir dans *Site settings → Environment variables*.

## Déploiement Vercel

1. Aller sur [vercel.com](https://vercel.com) → Importer `moelohimmara-dotcom/greatlife`
2. Framework détecté : Vite (auto via `vercel.json`)
3. Variables d'environnement : copier depuis `.env.example`
4. Deploy → URL `*.vercel.app` active

## Domaine

Configurer `greatlife.gn` :
- CNAME → `cname.vercel-dns.com`
- Dans Vercel → Settings → Domains → ajouter `greatlife.gn`
