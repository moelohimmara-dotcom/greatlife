# Greatlife — Site vitrine & Panneau admin

Restaurant fast-food bio à Conakry, Guinée. Site vitrine public + panneau d'administration complet, propulsés par React + Supabase.

Ce README est le **point d'entrée** de la documentation. Il est conçu pour qu'un développeur reprenant le projet le lise **dans l'ordre** :

1. **[README.md](./README.md)** — Vue d'ensemble, stack, démarrage rapide (vous êtes ici)
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Structure des dossiers, flux de données, conventions de code
3. **[DEVELOPMENT.md](./DEVELOPMENT.md)** — Guide de reprise : lancer, développer, tâches courantes, pièges, sécurité
4. **[docs/public-site.md](./docs/public-site.md)** — Le site public : sections, panier, commande en ligne, réservations
5. **[docs/admin-panel.md](./docs/admin-panel.md)** — Le panneau admin : shell, 12 modules, RBAC
6. **[docs/database.md](./docs/database.md)** — Supabase : schéma, 18 migrations, RLS, `is_admin()`, Realtime
7. **[docs/emails.md](./docs/emails.md)** — Edge Function `send-contact-email` : 4 actions d'envoi, SMTP
8. **[docs/deployment.md](./docs/deployment.md)** — Déploiement Netlify / Vercel, domaine, CI

> Commencez par ce README, puis suivez l'ordre ci-dessus. Chaque document renvoie au suivant.

---

## En deux phrases

- **Côté public** (`/`) : un site vitrine one-page responsive (sections Hero, Carte, Histoire, Équipe, Localisation, Contact, Réservation, Blog) avec **commande en ligne** (panier + retrait) et **formulaire de réservation**.
- **Côté admin** (`/login` → `/admin`) : 12 modules (tableau de bord, commandes, messages, réservations, contenu, carte & prix, blog, thème, médias, visibilité, utilisateurs & rôles, formulaires & emails).

## Stack

| Couche | Technologie |
|---|---|
| Frontend | React 18, TypeScript (strict), Vite 5, Tailwind CSS, Framer Motion |
| Routing | react-router-dom v6 (3 routes : `/`, `/login`, `/admin`) |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions) |
| Emails | Edge Function `send-contact-email` (Deno) via SMTP Gmail |
| Déploiement | Cloudflare Pages (principal) + Netlify (secours) — build Vite, dossier `dist` |
| CI | GitHub Actions `build-test.yml` (`tsc --noEmit` + `vite build`) |
| Code | GitHub : `moelohimmara-dotcom/greatlife` |

## Démarrage rapide

```bash
git clone https://github.com/moelohimmara-dotcom/greatlife
cd greatlife
npm install
cp .env.example .env   # Variables Supabase pré-remplies
npm run dev             # http://localhost:5173
```

Sans `.env`, le site démarre en **mode démo** (données en mémoire, auth locale, aucune persistance) — utile pour explorer l'UI sans backend.

### Commandes npm

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur Vite (HMR) sur `:5173` |
| `npm run build` | `tsc` (typecheck strict) + `vite build` → `dist/` |
| `npm run preview` | Prévisualise le build de production |
| `npm run lint` | ESLint sur `src` |

## Variables d'environnement

| Variable | Où la définir | Rôle |
|---|---|---|
| `VITE_SUPABASE_URL` | Vercel/Netlify (env client) | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Vercel/Netlify (env client) | Clé anonyme Supabase |
| `SMTP_USER` | Supabase Edge Function secrets | Compte SMTP émetteur (**requis**) |
| `SMTP_PASS` | Supabase Edge Function secrets | Mot de passe d'application SMTP (**requis**) |
| `SMTP_HOST` / `SMTP_PORT` | Supabase Edge Function secrets | Hôte/port SMTP (optionnel, défaut `smtp.gmail.com:465`) |
| `CONTACT_EMAIL` | Supabase Edge Function secrets | Email de destination des messages de contact (optionnel, défaut = `site_content.emailContact`) |

> ⚠️ **Sécurité** — les secrets SMTP et les mots de passe admin ne doivent **jamais** être committés. Les identifiants SMTP ne sont **plus codés en dur** dans le code (corrigé) ; ils doivent être définis dans les secrets Supabase. Voir [DEVELOPMENT.md → Sécurité](./DEVELOPMENT.md#sécurité) et [docs/emails.md](./docs/emails.md).

## Deux modes de fonctionnement

Le site s'adapte automatiquement selon la présence des variables Supabase — voir `src/lib/supabase.ts` (`isSupabaseConfigured`) :

- **Mode Supabase (recommandé)** : `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` définis → données persistées en base, auth via Supabase Auth (avec repli local), emails réels via l'Edge Function, **Realtime** activé (les changements admin se propagent au site public en direct). L'indicateur de connexion est visible sur le tableau de bord admin.
- **Mode démo (local)** : sans variables → données en mémoire (`src/data/*`), auth locale (comptes codés en dur), faux envoi de formulaire. Rien n'est persisté.

## Accès admin

- **URL** : `/login` puis `/admin` (protégé par `ProtectedRoute`)
- **Comptes de secours locaux** (mode démo, dans `src/data/users.ts`) :
  - Propriétaire : `owner@greatlife.com` / `greatlife2026`
  - Gérant : `gerant@greatlife.com` / `greatlife2026`
- **En mode Supabase** : créez les comptes dans *Supabase → Authentication → Users* et renseignez leur rôle dans la table `admin_users` (colonne `role`). C'est cette table qui détermine les permissions (voir `docs/database.md` et `docs/admin-panel.md`).

> Seuls les rôles `owner` et `manager` (`ADMIN_ROLES` dans `src/data/users.ts`) peuvent accéder au panneau. Le RBAC détaillé (chef, éditeur, marketing, invité) est défini dans `src/data/rbac.ts` mais sert aujourd'hui de référence ; la **vraie porte d'entrée** est la liste `ADMIN_ROLES`.

## Supabase — en bref

- **Projet** : `atsujzoozqnjelngqkab` (région eu-west-1) — base **dédiée Greatlife**, créée le 2026-09-18 (l'ancien projet partagé `gpvfryvmghjenwfqhnkd` est en pause, récupérable 7 jours)
- **Tables** : `menu_items`, `messages`, `site_content`, `admin_users`, `blog_posts`, `reservations`, `orders`, `media_assets`, `audit_log`
- **Storage buckets** : `media` (général), `food-photos`, `team-portraits`, `blog-images`
- **Edge Function** : `send-contact-email` (active)
- **Migrations** : 18 fichiers numérotés dans `supabase/migrations/` (à rejouer dans l'ordre)

→ Détails complets : [docs/database.md](./docs/database.md)

## Déploiement

Le site est en production sur **Cloudflare Pages** (principal) : https://greatlife-conakry.pages.dev
**Netlify** reste actif comme plan de secours : https://greatlife-conakry.netlify.app
Build `npm run build` → `dist` ; SPA fallback `_redirects` (Cloudflare) / `netlify.toml` (Netlify). Vercel est aussi supporté (`vercel.json`).

→ Détails complets : [docs/deployment.md](./docs/deployment.md)

## Aperçu de la structure

```
src/
├── config/         Thèmes, polices, badges (singletons contextuels)
├── data/           Menu (38 items), rôles RBAC, comptes admin de secours
├── lib/
│   ├── supabase.ts   Client Supabase + helpers invoke* (emails)
│   ├── repository.ts TOUTES les fonctions CRUD vers Supabase
│   ├── imageResize.ts Redimensionnement client des uploads
│   └── icons/        Bibliothèque d'icônes SVG maison
├── contexts/        AuthContext, SiteContext, CartContext
├── hooks/           useIsMobile, useScrollSpy
├── components/
│   ├── ui/          Primitives (Button, Input, Card, Reveal, SectionHead…)
│   └── nav/         Navigation publique responsive
├── sections/        Sections du site public + OrderCart
├── auth/            LoginScreen
├── admin/           AdminPanel.tsx (shell + 12 modules) + ui.tsx (primitives admin)
├── App.tsx          Router + Providers
└── main.tsx         Entry point
supabase/
├── migrations/      18 migrations SQL (schéma + RLS + Realtime)
└── functions/       send-contact-email (Edge Function Deno)
```

→ Détails complets : [ARCHITECTURE.md](./ARCHITECTURE.md)
