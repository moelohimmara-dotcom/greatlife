# 01 — Audit du projet existant — Greatlife

> **Nature du document** : audit factuel, lecture seule. Aucune décision architecturale n'est prise ici.
> Les propositions de la section 20 sont des **candidats soumis à validation**, pas des choix actés.
>
> - **Date** : 2026-09-18
> - **Périmètre** : dépôt `C:/Users/MARA/Documents/greatlife` (commit `708d7ea`, branche `main`), base Supabase déployée `atsujzoozqnjelngqkab`, déploiements Cloudflare Pages + Netlify
> - **Méthode** : lecture directe des fichiers sources, des 18 migrations et de la documentation ; interrogation en lecture seule de la base déployée (`information_schema`, `pg_policies`, `pg_publication_tables`, `storage.buckets`) ; inspection de l'historique git et des branches distantes
> - **Règle appliquée** : tout élément non vérifiable est explicitement marqué `NON VÉRIFIÉ`
> - **Fichiers modifiés par cet audit** : aucun (ce document est le seul fichier créé)

---

## 1. Synthèse exécutive

### Ce qu'est le projet aujourd'hui

Greatlife est **un site vitrine one-page pour restaurant, avec un panneau d'administration riche** — mais **ce n'est pas encore un CMS**.

Le projet a été construit par itérations successives (« vibe coding ») autour de trois piliers : un site public statique piloté par une poignée de champs éditables, une base Supabase unique portant tout le contenu dans un **blob JSONB**, et un panneau admin monolithique de 2 763 lignes couvrant 16 écrans (dont RBAC granulaire, audit, invitations, magic links).

L'effort a été massivement investi dans la **gouvernance des accès** (RBAC à 6 rôles, matrice éditable, journal d'audit, notifications email), et très peu dans la **structuration du contenu**. C'est précisément l'inverse de ce qu'exige un CMS.

### Verdict d'audit

| Dimension | État | Commentaire |
|---|---|---|
| Stack & build | 🟢 Sain | React 18 + TS strict + Vite 5 + Tailwind, build reproductible, CI verte |
| Sécurité base (RLS) | 🟡 Partielle | RLS réellement active, mais 6 trous vérifiés (voir §11) |
| Authentification | 🔴 Fragile | Repli sur identifiants codés dans le bundle, session locale non validée serveur |
| Modèle de contenu | 🔴 Inadapté à un CMS | Tout le contenu éditable tient dans **1 seule ligne** `site_content` (blob JSONB de 2 928 octets) |
| Workflow éditorial | 🔴 Quasi absent | Seul le blog a un flag `published`. Tout le reste écrit **directement en production** |
| Versioning / undo | 🔴 Inexistant | Aucune table de révisions, aucun soft delete, aucun retour arrière |
| Admin (UI) | 🟡 Riche mais monolithique | 2 763 lignes dans un fichier, patterns dupliqués 3 à 10 fois |
| Site public | 🟡 Fonctionnel, contenu en dur | ~9 blocs de contenu codés en dur, non éditables par le restaurateur |
| SEO | 🔴 Minimal | Balises statiques uniquement, aucune page indexable par contenu |
| Tests | 🔴 Aucun | 0 fichier de test, aucune dépendance de test, CI sans tests |
| Déploiement | 🟢 Opérationnel | Cloudflare Pages (principal) + Netlify (secours), mais **non décrit dans le dépôt** |

**Conclusion** : la fondation technique est réutilisable et le patrimoine fonctionnel est réel, mais **le cœur CMS (modèle de contenu, publication, versioning, pages) est à construire**. Le risque principal n'est pas la dette de code — c'est de bâtir le CMS sur le modèle de données actuel.

---

## 2. Stack technique (vérifié)

### Socle

| Élément | Version / valeur | Source |
|---|---|---|
| Langage | TypeScript 5.5.4 (`strict`) | `package.json:26` |
| Framework UI | React 18.3.1 + react-dom 18.3.1 | `package.json:13-14` |
| Build | Vite 5.4.0 + `@vitejs/plugin-react` | `package.json:27`, `vite.config.ts` |
| Routage | react-router-dom 6.26.0 | `package.json:15` |
| Animation | framer-motion 11.3.0 | `package.json:16` |
| Styles | Tailwind CSS 3.4.9 + PostCSS + Autoprefixer | `package.json:29-31` |
| UI utils | clsx, tailwind-merge, class-variance-authority, lucide-react | `package.json:18-21` |
| Backend | Supabase (`@supabase/supabase-js` 2.45.0) — Postgres + Auth + Storage + Realtime + Edge Functions | `package.json:17` |
| Lint | ESLint 8.57 + typescript-eslint 7.18 | `package.json:32-36` |
| Node cible | 20 | `netlify.toml:6` |

### Volumétrie (vérifiée)

| Fichier | Lignes | Remarque |
|---|---|---|
| `src/admin/AdminPanel.tsx` | **2 763** | 42 % du code applicatif à lui seul |
| `src/lib/repository.ts` | 879 | 33 fonctions d'accès aux données |
| `src/contexts/SiteContext.tsx` | 438 | Charge 8 jeux de données pour tout visiteur |
| `src/contexts/AuthContext.tsx` | 259 | |
| `src/lib/supabase.ts` | 150 | 4 invokers d'Edge Functions quasi identiques |
| `src/admin/ui.tsx` | 130 | Primitives d'administration (embryonnaires) |
| `src/data/menu.ts` | 55 | Menu complet de 38 items **codé en dur** (fallback + source du panier) |
| Total `src/` | ~6 600 | |

### Points structurants

- **Alias `@/`** vers `src/`, configuré dans `vite.config.ts` et `tsconfig.json`.
- **Mode « démo »** : sans variables `VITE_SUPABASE_*`, l'application fonctionne sur des données locales non persistées. Ce mode est réel et fonctionnel.
- **Aucun backend applicatif** : le front parle directement à Supabase ; la logique métier vit dans `repository.ts` et dans les policies RLS. Une seule Edge Function (`send-contact-email`) existe.
- **Chunking Vite** : 3 chunks (`react-vendor`, `animation`, `index`) — build de 21 s, bundle principal ≈ 469 KiB / 479 kB annoncés par Vite (≈ 120 kB gzip).

---

## 3. Structure des dossiers (vérifié)

```
greatlife/
├── .github/workflows/     2 workflows (build-test, deploy-netlify-manual)
├── docs/                  5 documents existants (admin-panel, database, deployment, emails, public-site)
├── public/                favicon.svg, _redirects  ← ni robots.txt ni sitemap.xml
├── src/
│   ├── admin/             AdminPanel.tsx (2763 l.) + ui.tsx (122 l.)
│   ├── auth/              LoginScreen.tsx
│   ├── components/
│   │   ├── nav/           PublicNav.tsx
│   │   └── ui/            12 primitives (OrganicCard, SectionHead, Reveal, BadgePill, button, input,
│   │                      select, switch, textarea, label, separator, shadows)
│   ├── config/            themes.ts, fonts.ts, badges.ts
│   ├── contexts/          SiteContext, CartContext, AuthContext
│   ├── data/              menu.ts, rbac.ts, users.ts   ← données statiques
│   ├── hooks/             useScrollSpy.ts, useIsMobile.ts
│   ├── lib/               supabase.ts, repository.ts, imageResize.ts, icons/
│   ├── sections/          13 fichiers de sections publiques + 12 primitives UI + 2 hooks
│   ├── App.tsx, main.tsx, vite-env.d.ts
├── supabase/
│   ├── functions/         send-contact-email/index.ts
│   └── migrations/        18 fichiers SQL numérotés
├── netlify.toml, vercel.json, index.html, tailwind.config.ts, postcss.config.js
├── ARCHITECTURE.md, DEVELOPMENT.md, README.md, .env.example
```

**Observation** : l'organisation est propre et conventionnelle. Il **manque** un dossier de tests, un dossier de types partagés, et toute notion de « pages / sections / blocs » côté modèle.

---

## 4. Pages publiques existantes (vérifié)

### Routage : **3 routes seulement** (`src/App.tsx:13-17`)

| Route | Composant | Protection |
|---|---|---|
| `/` | `PublicSite` | publique |
| `/login` | `LoginScreen` | publique |
| `/admin` | `AdminPanel` | `ProtectedRoute` (front seul) |

**Aucune route par contenu** : pas de page article de blog, pas de page 404, pas de page « mentions légales », pas de page produit. Tout le site public est une **page unique à ancres** (`#carte`, `#histoire`, `#blog`…).

### Les 15 écrans publics

> Note : `src/sections/` contient **13 fichiers**. Le tableau ci-dessous inclut en plus `PublicNav` et `LoginScreen`, qui ne sont pas dans `sections/` mais participent au rendu public.

| Section | Ancre | Source des données | Contenu en dur |
|---|---|---|---|
| `Hero.tsx` | `home` | `content.heroTitle/heroSub/slogan` + média slot `hero` | Badge « Le Greatlife / **48 000 FG** » (`:85-86`), 3 chips (`:54-57`) |
| `Carte.tsx` | `carte` | `menu` (contexte) sinon `MENU` statique | Titre/sous-titre (`:109`) |
| `Story.tsx` | `histoire` | `content.storyTitle/story` + média `histoire` | « Mister Marcket » (`:30`), 3 chips (`:38-41`) |
| `Engagements.tsx` | `engagements` | `content.engagements` | Titre/sous-titre (`:16`) |
| `Team.tsx` | `equipe` | `content.team` + slots `equipe-1..4` | Titre/sous-titre (`:18`) |
| `Testimonials.tsx` | `temoignages` | `content.testimonials` | Titre (`:12`) |
| `Localisation.tsx` | `loca` | `content.address/hours/phone/emailContact` | **Carte = SVG décoratif**, aucune géolocalisation (`:37-72`) |
| `Contact.tsx` | `contact` | `insertMessage` + Edge Function | Titre, sujets du select (`:59`, `:81-84`) |
| `Reservation.tsx` | `reservation` | `insertReservation` + email | Titre (`:66`), bornes 1-10 personnes (`:102`) |
| `Blog.tsx` | `blog` | `blogPosts` + `media` | **`FALLBACK_POSTS` (`:9-13`)**, 3 illustrations SVG inline (`:46-91`) |
| `OrderCart.tsx` | — (panier) | `CartContext` + `insertOrder` | **Horaires de retrait figés (`:13`)**, pas de paiement |
| `PublicNav.tsx` | — | `content` | Marque « Greatlife » en dur (`:39-40`) |
| `Footer.tsx` | — | `content.slogan` | **Nav, adresse, téléphone, email, © 2026 en dur (`:23-25,31,36`)** |
| `PublicSite.tsx` | — | assemble + `visibility` | — |
| `LoginScreen.tsx` | — | — | **Identifiants de démo affichés à l'écran (`:71-76`)** |

### Pilotage de l'affichage

`PublicSite.tsx:23-34` conditionne 9 sections via `visibility` (stocké dans `site_config`). **`Reservation`, `Footer`, `PublicNav` et `OrderCart` sont rendus inconditionnellement** (`:22,30,33,34`) — non désactivables par l'administrateur.

### Lacunes fonctionnelles constatées

- **2 liens de navigation morts** (vérifié) : `Footer.tsx:24` génère `#lacarte` et `#équipe` ; les sections ont pour id `carte` et `equipe` (sans accent). 2 liens sur 5 ne font rien.
- Aucun lien vers `#reservation` dans le footer.
- `content.restaurantName` est **déclaré et persisté** (`SiteContext.tsx:21`, `SiteContext.tsx:142`, `repository.ts:147`) mais **n'est pas utilisé** pour afficher la marque dans la navigation, qui code « Greatlife » en dur.

---

## 5. Composants réutilisables (vérifié)

### Réutilisables tels quels

| Composant | Rôle | Usage actuel |
|---|---|---|
| `ui/OrganicCard.tsx` | Carte stylée pilotée par le thème | Utilisé dans la majorité des sections publiques |
| `ui/SectionHead.tsx` | Titre h2 + sous-titre (`align` left/center) | Sections publiques |
| `ui/Reveal.tsx` | Apparition à l'intersection (Framer Motion) | Sections publiques |
| `ui/BadgePill.tsx` | Pastille d'allergène depuis `BADGE_DEFS` | Carte |
| `ui/shadows.ts` | Ombres douces dérivées du thème | Transverse |
| `ui/{button,input,textarea,label,select,switch,separator}.tsx` | Primitives de formulaire | Contact, Réservation, Panier, Admin |

### Non réutilisables en l'état

- **Illustrations SVG inline** dans `Blog.tsx:46-91` et `Localisation.tsx:37-72` — non paramétrables.
- **`lib/icons/FoodIcon.tsx`** — table d'icônes figée par catégorie.
- **Tout l'admin** : `admin/ui.tsx` (122 lignes) est embryonnaire ; les écrans de `AdminPanel.tsx` ne sont pas des composants autonomes.

**Observation structurante** : il n'existe **aucune bibliothèque de sections/blocs**. Les sections publiques sont des composants monolithiques non paramétrables, ce qui constitue le principal obstacle à un Page Builder (§20, D3).

---

## 6. Système d'administration existant (vérifié)

### 16 modules dans un fichier unique (`src/admin/AdminPanel.tsx`, 2 763 lignes)

| Module | Lignes | Écritures en base |
|---|---|---|
| Tableau de bord | 149-272 | aucune (lecture) |
| Contenu | 294-339 | `site_content` |
| Carte & prix | 340-467 | `menu_items` — **à chaque frappe, sans debounce** |
| Thème & ambiance | 469-554 | `site_content` (`site_config`) |
| Médias | 555-779 | bucket `media` + `media_assets` |
| Visibilité | 780-831 | `site_content` |
| Utilisateurs & rôles | 832-1432 (~600 l.) | `admin_users`, `site_content` (RBAC), `audit_log` |
| Blog | 1440-1612 | `blog_posts` (+ upload média) |
| Formulaires & emails | 1614-1656 | `site_content` |
| Messages | 1658-1975 | `messages` (Realtime + polling) |
| Commandes | 1977-2158 | `orders` (Realtime) |
| Réservations | 2160-2396 | `reservations` (Realtime) |
| Équipe & contenus | 2398-2503 | `site_content` |
| Journal d'activité | 2505-2620 | lecture seule (polling 30 s) |
| Réglages globaux | 2622-2717 | `site_content`, RBAC, export/import JSON |
| Shell / routage | 2731-2763 | — |

### Points d'attention (vérifiés)

1. **Monolithe** : 16 écrans, aucun découpage en fichiers, imports de 20+ fonctions.
2. **Duplication** : le squelette `saveStatus / saveErr / SaveBar` est réimplémenté ~10 fois ; l'effet Realtime+polling est dupliqué 3 fois (~25 lignes identiques) ; 4 exporteurs CSV quasi identiques.
3. **Sauvegarde à chaque frappe** sur la carte (`upsertMenuItem` avec `onConflict: 'name'`) : renommer un produit crée une nouvelle ligne et laisse un orphelin.
4. **Export/import JSON global** (`:2640-2671`) **remplace la configuration sans confirmation** — action destructive en un clic.
5. **Suppression dure** partout, **aucun soft delete**, **aucun undo**.
6. **Journal d'audit partiel** (limité à 200 entrées, `repository.ts:848`) : il trace les changements de **statut** de commandes et réservations, les modifications **RBAC** et **utilisateurs**, et l'**import de configuration** — mais **pas** les éditions de contenu, de carte, de médias ni de messages.
7. **Les 2 boutons « supprimer » commandes et réservations sont cassés en production** (voir §11, trou RLS n°2).

---

## 7. Authentification (vérifié)

### Mécanisme réel

- Connexion **email + mot de passe** via `signInWithPassword` (`AuthContext.tsx:198`).
- Le **rôle** est lu dans `admin_users` par correspondance d'email (`:55-70`), validé contre la liste `ADMIN_ROLES`, avec contrôle du flag `active`.
- **Magic link** (`signInWithOtp`) implémenté (`supabase.ts:51-69`) mais utilisé **uniquement pour les invitations** d'admin, pas à la connexion.
- Rafraîchissement du rôle toutes les 60 s avec `roleNotice` ; déconnexion si le rôle devient invalide ou le compte suspendu (`:219-226`).

### Faiblesses vérifiées

| # | Faiblesse | Preuve |
|---|---|---|
| A1 | **Repli sur des identifiants codés en dur** si `signInWithPassword` échoue → session UI **sans jeton Supabase** | `AuthContext.tsx:203-211`, `src/data/users.ts:14-17` |
| A2 | **Session locale restaurée sans vérification serveur** : `localStorage['greatlife-session']` est réutilisée si aucune session Supabase n'existe → session qui n'expire jamais | `AuthContext.tsx:32`, `:116-119` |
| A3 | **Identifiants de démonstration affichés à l'écran** de connexion en production | `LoginScreen.tsx:71-76` |
| A4 | **Les comptes de démo sont les comptes réels privilégiés** (voir §11, risque R5) | base déployée |
| A5 | Le nom de la clé locale et le repli sont dans le bundle → un visiteur peut lire les mots de passe de démo | `src/data/users.ts:14-17` |

**Atténuation — et sa limite, qui est le point important.** Une session forgée en `localStorage` n'ouvre que **l'interface** : les écritures restent bloquées par la RLS, car `is_admin()` relit le rôle en base à partir du claim JWT signé par Supabase.

**Mais cette atténuation est nulle dans le scénario critique.** Si les identifiants affichés publiquement (le compte `owner@greatlife.com` et le mot de passe de démonstration affiché sur la page de connexion) sont réellement ceux du compte `owner` en production — ce que le test de connexion réel effectué pendant cet audit accrédite (voir R1) — alors l'attaquant obtient un **jeton Supabase authentique et parfaitement légitime**. La RLS le laisse donc passer intégralement, y compris sur `admin_users`, et l'atténuation invoquée ci-dessus ne protège plus rien. **Le risque réel n'est pas le contournement du front, c'est la compromission du compte propriétaire** — voir R1, qui est le risque critique n°1 de cet audit.

---

## 8. Rôles et permissions (vérifié)

### Modèle

- **6 rôles** : `owner`, `manager`, `chef`, `editor`, `marketing`, `guest` (`src/data/rbac.ts:10-17`).
- **15 modules** × **4 actions** (`create`, `update`, `delete`, `publish`) — `rbac.ts:47-63`.
- **La matrice est réellement appliquée côté front** : `effectiveAccess` (`rbac.ts:95-103`), alimenté par les overrides persistés (`SiteContext.tsx:292-296`, `:326-331`), gardes `canAccessModule`/`canWriteModule` (`AdminPanel.tsx:2735-2736`), bandeau « lecture seule », **12 usages de `canDo`** dans `AdminPanel.tsx` (ex. `:1521`, `:1575`, `:1603`, `:2139`, `:2335`).
- Persistance des overrides : dans le blob `site_content.site_config` — `NON VÉRIFIÉ` en base : la clé `rbac_overrides` **n'est pas présente** dans le blob déployé (clés réelles : `content`, `fontId`, `themeId`, `visibility`), donc soit aucun override n'a jamais été enregistré, soit ils sont stockés sous une autre forme.

### Écarts entre les trois couches de permission

| Couche | Modèle | Appliqué ? |
|---|---|---|
| Front (matrice `rbac.ts`) | 6 rôles × 15 modules × 4 actions, overrides éditables | ✅ oui |
| Documentation (`README.md:86`) | « owner / manager seulement » | ❌ **périmé** |
| Base (RLS `is_admin([...])`) | **listes de rôles figées par table** | ✅ oui |

**Conséquence majeure** : la RLS raisonne par table et par liste de rôles figée en SQL. Elle ne peut donc **pas** porter la granularité par module et par action de la matrice front. Il en résulte des **échecs silencieux** : un rôle autorisé par la matrice front mais absent de la liste RLS voit son écriture refusée par la base, sans explication claire pour l'utilisateur. Exemples vérifiés :

- `chef` peut écrire `menu_items` (RLS) mais pas `media_assets` — la matrice front peut pourtant lui ouvrir le module Médias.
- `editor` et `marketing` ne peuvent **pas** écrire `site_content` (RLS `content_admin_write` = `owner`, `manager` uniquement), donc pas le thème ni les contenus.
- Le contrôle du flag `active` n'existe **que côté front** (voir §11, trou RLS n°3).

---

## 9. Accès aux données (vérifié)

### `src/lib/repository.ts` — 33 fonctions sur 9 tables

| Table | Fonctions représentatives |
|---|---|
| `menu_items` | `fetchMenu`, `upsertMenuItem`, `deleteMenuItem` |
| `site_content` | `fetchContent`, `saveContent`, `saveSiteConfig` |
| `messages` | `fetchMessages`, `insertMessage`, `markMessageHandled`, `appendReply`, `deleteMessage` |
| `blog_posts` | `fetchBlogPosts`, `upsertBlogPost`, `deleteBlogPost` |
| `reservations` | `fetchReservations`, `insertReservation`, `updateReservationStatus`, `deleteReservation` |
| `orders` | `fetchOrders`, `insertOrder`, `updateOrderStatus`, `deleteOrder` |
| `media_assets` (+ bucket `media`) | `fetchMedia`, `uploadMedia`, `updateMediaSlot`, `deleteMedia` |
| `admin_users` | `fetchAdminUsers`, `upsertAdminUser`, `updateAdminUserStatus`, `deleteAdminUser`, `setUserInvitedAt` |
| `audit_log` | `logAudit`, `fetchAuditLog` |

### Problèmes structurels vérifiés

1. **Repli silencieux généralisé** : les lectures retombent sur les données statiques locales avec des `catch {}` vides — **12 occurrences** (`:66, 121, 222, 238, 336, 407, 437, 542, 609, 745, 861, 876`). **Aucun log.** Une panne Supabase ou un refus RLS se présente à l'utilisateur comme un « mode démo » normal (`SiteContext.tsx:283-284`).
2. **`fetchMenu` bascule en local dès que la table est vide** (`:64`) — un menu vidé par erreur fait réapparaître silencieusement la carte codée en dur pour les visiteurs.
3. **Incohérence de contrat** : `insertMessage`, `insertReservation`, `insertOrder` retournent un booléen, toutes les autres écritures retournent un `SaveResult` typé.
4. **Boilerplate** `if (!sb) …` répété ~20 fois.
5. **Messages d'erreur techniques exposés** : « migration 018 » codé en dur dans des messages utilisateur (`:762`, `:781`).
6. **`SiteContext.tsx:272-281` charge 8 jeux de données pour tout visiteur**, y compris `admin_users`, `orders` et `reservations`, en s'en remettant entièrement à la RLS pour filtrer. Défense en profondeur absente.

---

## 10. Supabase et structure réelle de la base (vérifié sur la base déployée)

### Projet

| Élément | Valeur |
|---|---|
| Projet dédié | `atsujzoozqnjelngqkab` (« greatlife », région `eu-west-1`) |
| Créé le | 2026-09-18 (migration depuis un projet partagé, depuis mis en pause) |
| Tables publiques | **9** |
| Fonctions `SECURITY DEFINER` | **1** (`is_admin`) |
| Clés étrangères | **0** |
| Déclencheurs applicatifs | **0** (les 5 triggers détectés appartiennent aux schémas `realtime` et `storage`) |

### Schéma réel (9 tables)

| Table | Colonnes | Points notables |
|---|---|---|
| `menu_items` | 11 | `price` en **TEXT** (`'48 500'`), `cat` en TEXT libre (10 valeurs), `badges` **JSONB**, `sort_order` |
| `site_content` | 5 | `key` UNIQUE, **`value` JSONB** — **1 seule ligne** (`site_config`, 2 928 octets) |
| `messages` | 8 | `replies` **JSONB**, `handled` |
| `blog_posts` | 11 | `slug` (index **non unique**), `cover_url`, `meta_description`, `published` |
| `reservations` | 10 | **`date` et `time` en TEXT**, `status` TEXT |
| `orders` | 11 | `ref` (non unique), **`items` JSONB**, **`total` en TEXT**, `status` TEXT |
| `media_assets` | 9 | `slot` (**non unique**), `storage_path`, `public_url` |
| `admin_users` | 7 | `email` UNIQUE, `role` TEXT, `active`, `invited_at` — **aucune FK vers `auth.users`** |
| `audit_log` | 6 | `actor`, `action`, `target`, `detail` — tous TEXT, non structuré |

### Données déployées (volumes réels)

`menu_items` : **38** · `messages` : 46 · `blog_posts` : **6 (toutes publiées)** · `reservations` : 12 · `orders` : 4 · `media_assets` : **16** · `admin_users` : **4** · `site_content` : 1 · `audit_log` : **0**

**Catégories de menu réellement en usage (10)** : Boissons chaudes (6), Burgers (6), Desserts (4), Frites & côtés (4), Menu enfant (1), Milkshakes & smoothies (6), Petit-déjeuner (4), Salades (3), Suggestions (1), Wraps (3).

**Slots média réellement en usage (16)** : `hero`, `histoire`, `equipe-1..4`, `produit-le-greatlife`, `produit-le-tropical`, `produit-frites-de-patate-douce`, `produit-mangue-fraiche`, `blog-<slug>` × 6.

**Le blob `site_config` ne contient que 4 clés** : `content`, `themeId`, `fontId`, `visibility`. **Tout le contenu éditable du site tient donc là-dedans.**

### Realtime

Tables réellement publiées : **`messages`, `orders`, `reservations`**.

Le code s'abonne à **6 tables** (`SiteContext.tsx:411-417`) : `menu_items`, `site_content`, `blog_posts`, `media_assets`, `orders`, `reservations`. **4 abonnements sur 6 sont donc morts** — confirmé par `pg_publication_tables`. `docs/database.md:151` les présente à tort comme publiés.

### Comptes administrateurs réels

| Email | Rôle | Actif |
|---|---|---|
| `owner@greatlife.com` | **owner** | oui |
| `moelohimmara@gmail.com` | manager | oui |
| `gerant@greatlife.com` | manager | oui |
| `malikamorgan17@gmail.com` | guest | oui |

**⚠️ Constat critique** : le **seul compte `owner`** (donc le seul détenteur des droits d'écriture complets, y compris sur `admin_users`) est `owner@greatlife.com`, **un compte de démonstration dont le mot de passe est publiquement affiché sur la page de connexion**. Le propriétaire réel (`moelohimmara@gmail.com`) n'est que `manager`. Voir risques R4 et R5.

---

## 11. RLS — état réel et trous vérifiés

### Policies actives (24 sur 9 tables + 3 sur `storage.objects`)

| Table | Lecture `anon` | Écriture (rôles admis par RLS) |
|---|---|---|
| `menu_items` | ✅ publique | `owner`, `manager`, `chef` |
| `site_content` | ✅ publique | `owner`, `manager` |
| `blog_posts` | ✅ si `published = true` | `owner`, `manager`, `editor` |
| `media_assets` | ✅ publique | `owner`, `manager`, `editor`, `marketing` |
| `messages` | ❌ | INSERT `anon`+`authenticated` ; SELECT/UPDATE/DELETE `owner`, `manager` |
| `reservations` | ❌ | INSERT `anon`+`authenticated` ; SELECT/UPDATE `owner`, `manager` |
| `orders` | ❌ | **INSERT `anon` uniquement** ; SELECT/UPDATE `owner`, `manager` |
| `admin_users` | ❌ | ALL `owner` uniquement |
| `audit_log` | ❌ | SELECT/INSERT `owner`, `manager` |
| `storage.objects` | ✅ bucket `media` | INSERT/DELETE `owner`, `manager`, `editor`, `marketing` |

`is_admin(role_filter text[])` — `SECURITY DEFINER`, `search_path = public`, compare `admin_users.email` au claim JWT et teste l'appartenance à la liste fournie. **Elle ne consulte pas le flag `active`.**

### Trous et incohérences vérifiés

| # | Constat | Preuve | Impact |
|---|---|---|---|
| **1** | `orders_public_insert` est réservée à `anon` : **un administrateur connecté ne peut pas passer commande** | `pg_policies` sur `orders` | Bug fonctionnel (même bug corrigé en 010 pour messages/réservations, non propagé aux commandes) |
| **2** | **Aucune policy DELETE sur `orders` ni `reservations`** alors que l'UI admin appelle `deleteOrder` / `deleteReservation` (`AdminPanel.tsx:2041`, `:2225`) | `pg_policies` | **Les boutons de suppression de commandes et de réservations échouent en production** |
| **3** | `is_admin()` **ignore `admin_users.active`** : un compte suspendu conserve ses droits d'écriture en base tant que son JWT est valide | source de `is_admin()` ; contrôle `active` uniquement dans `AuthContext.tsx:66,108` | Faille de sécurité : la suspension est cosmétique côté base |
| **4** | Les 3 buckets historiques (`food-photos`, `team-portraits`, `blog-images`) **n'ont plus aucune policy** `storage.objects` (supprimées par la migration 011, jamais recréées) ; `docs/database.md:86` affirme le contraire | `pg_policies` | Latent (le code n'utilise que le bucket `media`), mais toute écriture sur ces buckets est refusée et la doc est fausse |
| **5** | Aucune policy `UPDATE` sur `storage.objects` : l'écrasement d'un fichier existant est refusé | `pg_policies` | `NON VÉRIFIÉ` en pratique (le code supprime puis recrée, ce qui contourne le problème) |
| **6** | Les overrides de la matrice front ne sont **pas** reflétés en RLS : granularité par module/action impossible en base | comparaison `rbac.ts` ↔ `pg_policies` | Échecs d'écriture silencieux pour les rôles non listés |

---

## 12. Stockage des médias (vérifié)

### Buckets

| Bucket | Public | Policies | Utilisé par le code |
|---|---|---|---|
| **`media`** | oui | 3 (read/insert/delete) | ✅ **oui, exclusivement** |
| `food-photos` | oui | **aucune** | ❌ non |
| `team-portraits` | oui | **aucune** | ❌ non |
| `blog-images` | oui | **aucune** | ❌ non |

### Pipeline d'upload

1. Redimensionnement **côté client** par canvas (`imageResize.ts:7-40`, presets 512/800/1600/1920, JPEG q=0.9).
2. `uploadMedia(file, slot)` → chemin `${slot}/${Date.now()}-${filename}` dans le bucket `media`, puis `getPublicUrl`, puis insertion dans `media_assets` (`repository.ts:625-665`).
3. `media_assets` stocke **à la fois** `storage_path` (utilisé pour la suppression) et `public_url` (utilisé pour l'affichage).

### Problèmes vérifiés

1. **Incohérence de convention de slot** — le plus grave :
   - Le site public lit `produit-<slug-du-nom>` (`Carte.tsx:19-20`) et `blog-<slug-du-titre>` (`Blog.tsx:22`).
   - L'admin ne propose que `['hero','logo','histoire','greatlife','equipe-1..4','produit','general']` (`AdminPanel.tsx:522`), et l'upload du blog utilise `blog-featured` (`:1485`) via `cover_url`.
   - Les slots réellement en base (`produit-le-greatlife`, `blog-<slug>`) **ne sont pas proposés par l'interface** : ils ont dû être saisis manuellement.
2. **`slot` n'est pas unique** en base : deux médias peuvent revendiquer le même slot. `useMedia(slot)` retourne alors un résultat non déterministe.
3. **Aucune FK** entre `menu_items` et `media_assets` : la photo d'un plat est résolue par **convention de nommage sur une chaîne**, pas par référence. Renommer un plat casse silencieusement sa photo (règle 6 « Single Source of Truth » non respectée).
4. **Affichage par `background: url(...)`** uniquement : pas de `<img>`, donc pas de `srcset`, ni `loading="lazy"`, ni texte alternatif (accessibilité et SEO dégradés).
5. `DEFAULT_MEDIA` (`SiteContext.tsx:175-180`) contient des libellés humains (« Hero principal ») qui ne correspondent pas aux clés réelles (`hero`, `histoire`).

---

## 13. Système de navigation (vérifié)

- **Ancres pures** (`#id`), pas de routes : `PublicNav.tsx:19-24,44`.
- **Scrollspy** par `IntersectionObserver` (`useScrollSpy.ts:5-11`, `rootMargin: '-30% 0px -60% 0px'`).
- **Responsive** : `useIsMobile.ts:6` (`matchMedia` 768px) + drawer mobile (`PublicNav.tsx:83-132`).
- **Défilement fluide et `scroll-margin-top: 80px`** appliqués via `index.css:5-40`.

### Fragilités

1. **2 liens morts dans le footer** (vérifié, §4).
2. **`scroll-margin-top` figé à 80px** : toute modification de la hauteur de la barre de navigation casse l'alignement des ancres.
3. **Aucune gestion d'URL invalide** : `public/_redirects` renvoie tout vers l'application, sans page 404 dédiée.
4. L'identifiant de section `loca` contredit le libellé « Localisation » et la clé de visibilité correspondante (`SiteContext.tsx:171`) — cohérent par chance, fragile par construction.

---

## 14. Système de thème / design (vérifié)

### Fonctionnement

- **4 palettes** de couleurs complètes (`config/themes.ts:21-62`) : gourmand, premium, nature, tropical.
- **3 paires de polices** (`config/fonts.ts:8-12`).
- `SiteContext.tsx:196-238` : `themeId`/`fontId` (défaut `gourmand`/`fraunces`) → injection de variables CSS inline (`--c-*`, `--f-*`, `--dark`) sur le wrapper.
- Persistance : `saveSiteConfigToDb` → `site_content.site_config` (`repository.ts:6,10`).

### Limites vérifiées

1. **Personnalisable** : palette (4 choix), police (3 choix), visibilité des sections, contenus listés en §4.
2. **Non personnalisable** : rayons, ombres, espacements, tailles typographiques (styles inline partout), aucune couleur personnalisée libre.
3. **Duplication** : le style global (défilement fluide, focus, barre de défilement) est injecté en JS (`SiteContext.tsx:250-267`) **et** dupliqué dans `index.css:5-40`.
4. **Styles inline massifs** : aucune tokenisation d'espacement ou de rayon ; Tailwind est présent mais faiblement exploité au profit de styles JS.

---

## 15. Système de menu restaurant (vérifié)

### État actuel

- **38 produits** en base, 10 catégories en texte libre, prix en **TEXT** (`'48 500'`).
- Affichage : `Carte.tsx` regroupe par `cat` et dérive le slug depuis le nom pour retrouver la photo.
- **Fallback intégral** : le menu complet de 38 items existe aussi codé en dur (`src/data/menu.ts:16-55`), utilisé si la base est vide ou indisponible, **et** comme source du panier.

### Absences bloquantes pour un CMS restaurant

| Manque | Conséquence |
|---|---|
| **Aucune notion de disponibilité / rupture de stock** | Un restaurateur ne peut pas marquer « épuisé » un plat à midi |
| **Aucune table de catégories** (`cat` en texte libre) | Renommer une catégorie casse le regroupement ; aucune image/ordre de catégorie |
| **Aucun lien produit ↔ photo** (convention de chaîne) | Renommer un plat orphelinise sa photo |
| **Prix en TEXT** | Pas de tri fiable, pas d'agrégation, pas d'arithmétique de panier fiable |
| **Aucun champ « suppléments / options / allergènes structurés »** | `badges` JSONB existe mais reste limité aux allergènes |
| **Aucun horaire de service** | Les horaires de retrait sont figés (`OrderCart.tsx:13`) |
| **Aucune promotion / prix barré / menu du jour** | Fonctionnalité commerciale de base absente |

### Panier et commande

- Panier en `localStorage` (`greatlife-cart`), **aucune validation de prix côté serveur**, **aucun paiement** : la commande génère une ligne `orders` + un email.
- `parsePrice` (`CartContext.tsx:25-27`) dérive le prix en retirant les caractères non numériques → **cassable par tout prix composite** (ex. « 48 000 / 52 000 », « à partir de 25 000 »).

---

## 16. SEO (vérifié)

### Ce qui existe

- Balises **statiques** dans `index.html` : `title` (`:27`), `description` (`:7`), `keywords` (`:8`), Open Graph (`:12-16`), Twitter Card (`:19-21`), `canonical` (`:23`).

### Ce qui manque

| Manque | Preuve |
|---|---|
| **Aucun SEO dynamique** : `document.title`, `canonical` et balises OG ne sont jamais mis à jour par le code | recherche sur `src/` → 0 occurrence |
| **Aucune page indexable par contenu** : 1 seule URL, le blog n'a pas de page article | `App.tsx:13-17` |
| **`canonical` et `og:url` pointent vers `greatlife-gn.netlify.app`** — domaine qui n'est plus la production | `index.html:17,23` |
| **Aucune `og:image` / `twitter:image`** | `index.html` |
| **Aucun JSON-LD** (Restaurant, Menu, LocalBusiness, Article) | recherche → 0 |
| **Aucun `robots.txt` ni `sitemap.xml`** | `public/` ne contient que `favicon.svg` et `_redirects` |
| Les colonnes `slug`, `cover_url`, `meta_description` existent mais **ne servent qu'à l'affichage** (ancre HTML), pas au SEO | `Blog.tsx:94-95` |

---

## 17. Déploiement (vérifié)

| Cible | Configuration | État |
|---|---|---|
| **Cloudflare Pages** | projet `greatlife-conakry` | ✅ **production principale** — `https://greatlife-conakry.pages.dev` (basculé le 2026-09-18) — **aucun fichier de configuration dans le dépôt** (`NON VÉRIFIÉ` : déploiement réalisé par API, non reproductible depuis le repo) |
| **Netlify** | `netlify.toml` (build `npm run build`, publish `dist`, Node 20, fallback SPA 200, cache immuable `/assets/*`) | ✅ **secours actif** — auto-build sur push `main` |
| **Vercel** | `vercel.json` (rewrite `/(.*)` → `/`) | ⚠️ supporté mais **non utilisé** ; la cible du rewrite est `/` et non `/index.html` |
| **GitHub Actions — `build-test.yml`** | `push`/`PR` sur `main` + manuel | `npm ci` → `tsc --noEmit` → `vite build`. **Malgré son nom : aucun test.** Aucune variable `VITE_*` injectée |
| **GitHub Actions — `deploy-netlify-manual.yml`** | `workflow_dispatch` uniquement | build avec les secrets Supabase puis `netlify deploy --prod` |

**Observation** : la production réelle (Cloudflare Pages) **n'est décrite nulle part dans le dépôt** — un nouvel intervenant ne peut pas la reconstruire. Les documents `docs/deployment.md` et `README.md` sont partiellement périmés (ils annoncent `greatlife-gn.netlify.app`).

---

## 18. Tests existants (vérifié)

**Il n'existe aucun test.**

| Preuve | Constat |
|---|---|
| Recherche `*.test.ts(x)`, `*.spec.ts(x)`, `tests/`, `e2e/` (hors `node_modules`) | **0 fichier** |
| `package.json` scripts | `dev`, `build`, `preview`, `lint` — **aucun script de test** |
| `devDependencies` | aucune dépendance de test (ni vitest, jest, playwright, cypress, testing-library) |
| `build-test.yml` | exécute `tsc --noEmit` + `vite build` uniquement |

**Conséquence** : toute évolution du modèle de contenu ou de la RLS se fera **sans filet de sécurité**. La vérification repose aujourd'hui entièrement sur l'inspection manuelle et le test visuel.

---

## 19. Dette technique (synthèse vérifiée)

| # | Dette | Sévérité | Preuve |
|---|---|---|---|
| 1 | `AdminPanel.tsx` monolithique (2 763 l., 16 écrans) | 🔴 Élevée | `:1-2763` |
| 2 | Aucun test, aucune infra de test | 🔴 Élevée | §18 |
| 3 | Contenu éditable dans **un blob JSONB unique** écrasé en place | 🔴 Élevée | `site_content` (1 ligne, 2 928 o) |
| 4 | Aucun versioning, aucun brouillon (hors blog), aucun undo | 🔴 Élevée | §10, §6 |
| 5 | Repli **silencieux** sur des données locales dans **12 lectures** | 🟠 Moyenne | `repository.ts:66,121,222,238,336,407,437,542,609,745,861,876` |
| 6 | Données métier dupliquées en dur (menu 38 items, coordonnées, prix hero, fondateur, horaires) | 🟠 Moyenne | §4, §15 |
| 7 | Convention de slot média incohérente entre admin et site public | 🟠 Moyenne | §12 |
| 8 | Duplication de patterns dans l'admin (SaveBar ×10, Realtime ×3, CSV ×4) | 🟠 Moyenne | §6 |
| 9 | Prix, totaux, dates et heures en **TEXT** | 🟠 Moyenne | §10 |
| 10 | **0 clé étrangère** ; `admin_users` lié par email | 🟠 Moyenne | §10 |
| 11 | Migrations non idempotentes (002, 003, 005, 006, 009, 012) ; aucun suivi `schema_migrations` dans le repo ; aucune migration descendante | 🟠 Moyenne | §20 |
| 12 | `004_seed.sql` **destructif** : `DELETE … WHERE name IN (…)` — une réapplication écrase les éditions du menu faites par l'admin | 🟠 Moyenne | `004_seed.sql:6` |
| 13 | 4 abonnements Realtime morts sur 6 | 🟡 Faible | §10 |
| 14 | Code mort (`ADMIN_PANEL_ROLES`, `getEffectiveModuleAccess`, `MODULE_GROUPS`, `USERS`) | 🟡 Faible | `rbac.ts:33,67,101`, `users.ts:7` |
| 15 | Styles inline massifs, duplication CSS (`SiteContext` ↔ `index.css`) | 🟡 Faible | §14 |
| 16 | Documentation partiellement fausse (README « owner/manager seulement » ; `database.md` buckets et Realtime) | 🟡 Faible | §8, §11, §12 |
| 17 | Roadmap d'administration **non fusionnée** dans `main` (existe sur `origin/vibe/admin-roadmap-doc-699981`) et **contient un mot de passe en clair** | 🟠 Moyenne (sécurité) | branche distante §5 |
| 18 | Page « 404 » inexistante | 🟡 Faible | §13 |

---

## 20. Classification pour la suite

> Rappel : les éléments classés « à modifier » ou « à remplacer » sont des **candidats**, pas des décisions. Toute décision structurante doit passer par la validation du propriétaire (§22).

### 20.1 CE QUI EXISTE

- Site public complet et fonctionnel (15 sections, mode sombre, animations, responsive).
- Panneau d'administration de 16 modules.
- RBAC à 6 rôles avec matrice éditable, overrides persistés, historique, export/import, mode batch.
- Système d'invitation avec magic links Supabase.
- Journal d'audit (partiel), exports CSV, dashboard d'activité.
- Formulaires publics : contact (avec réponse automatique), réservation, commande en ligne avec panier.
- Notifications email par Edge Function (4 gabarits : contact, réponse, statut réservation, statut commande).
- Bibliothèque de composants UI (15 primitives) et système de thème (4 palettes × 3 polices).
- Gestion de médias avec redimensionnement client.
- Base Supabase dédiée de 9 tables avec RLS active.
- Déploiement double (Cloudflare Pages + Netlify) et CI (typecheck + build).
- 5 documents de référence dans `docs/`.

### 20.2 CE QUI FONCTIONNE (vérifié, pas seulement présent)

| Fonction constatée opérationnelle |
|---|
| Site public servi en production, React monté, images Supabase chargées |
| Connexion admin de bout en bout (test réel : `/login` → `/admin`) |
| Lecture/écriture du contenu (`site_content`), du menu (`menu_items`), des médias (bucket `media`) |
| Réception des messages, réservations, commandes (RLS insert publics fonctionnels) |
| Realtime sur `messages`, `orders`, `reservations` (tables réellement publiées) |
| Suppression de messages, blog, médias, utilisateurs admin |
| CI verte (typecheck + build) sur `main` |

**Fonctionnalités présentes mais cassées en production** (à traiter) :
- Suppression de **commandes** et **réservations** (aucune policy DELETE) → échec.
- Prise de commande par un **administrateur connecté** (policy `anon` uniquement) → échec.
- **4 abonnements Realtime** sur 6 → jamais déclenchés.
- **2 liens de navigation** du footer → morts.

### 20.3 CE QUI PEUT ÊTRE CONSERVÉ

- **Stack** : React + TypeScript + Vite + Tailwind + Supabase. **Aucun élément de cet audit ne démontre la nécessité de la remplacer** — constat d'état, et non décision (voir D12 pour l'hébergement).
- **Design system** : palettes, polices, variables CSS, `OrganicCard`, `SectionHead`, `Reveal`, `BadgePill`, ombres.
- **Modèle RBAC** : 6 rôles, 15 modules, actions CRUD+publish, overrides — bon modèle, à réaligner avec la base.
- **Système d'invitation + magic links**.
- **Journal d'audit** (à compléter, pas à refaire).
- **Formulaires publics et flux email** (Edge Function).
- **Schéma des tables transactionnelles** : `messages`, `reservations`, `orders` sont adaptées à leur usage (à assouplir : types, FK, policies).
- **`media_assets` + bucket `media`** comme base d'une médiathèque.
- **Conventions de code** : alias `@/`, `SaveResult`, séparation `lib/` / `contexts/` / `sections/`.

### 20.4 CANDIDATS À LA MODIFICATION — liste soumise à arbitrage (aucune décision prise)

| Cible | Modifications candidates | Dépend de |
|---|---|---|
| **RLS** | Ajouter DELETE sur `orders`/`reservations`, élargir `orders_public_insert` à `authenticated`, faire dépendre `is_admin()` de `active`, recréer les policies des buckets historiques ou supprimer ces buckets | D4 |
| **`AdminPanel.tsx`** | Découpage en modules/fichiers, extraction des patterns dupliqués (SaveBar, Realtime, CSV), debounce sur la carte | — |
| **`repository.ts`** | Retour uniforme `SaveResult`, journalisation des erreurs, suppression des `catch {}` silencieux | — |
| **Types de données** | `price`/`total` → numérique ou structuré ; `date`/`time` → types date/heure ; `cat` → référence | D5 |
| **Migrations** | Rendre idempotentes, ajouter un suivi de version, réviser le seed destructif | D1 |
| **Contenus en dur** | Rendre éditables : titres/sous-titres de sections, prix du hero, coordonnées du footer, nom du restaurant, horaires, fondateur | D1, D2 |
| **Médias** | Unifier la convention de slot (ou passer à une vraie référence), unicité du slot, `<img>` + `srcset` + `alt` | D6 |
| **SEO** | Corriger `canonical`/`og:url`, ajouter `og:image`, `robots.txt`, `sitemap.xml`, JSON-LD | D7 |
| **Authentification** | Supprimer le repli sur identifiants codés en dur et la restauration de session non validée ; retirer l'encart de démo | D8 |
| **Documentation** | Corriger les 4 affirmations fausses identifiées ; fusionner la roadmap de branche (après retrait du mot de passe) | — |
| **Déploiement** | Décrire Cloudflare Pages dans le dépôt (reproductibilité), mettre à jour `docs/deployment.md` | D12 |

### 20.5 CANDIDATS AU REMPLACEMENT — proposition soumise à arbitrage (aucune décision prise)

> ⚠️ Cette section **n'acte rien**. Chaque ligne est un candidat dont le remplacement dépend d'une décision listée en §22 (`D1` à `D6`). Le tableau indique, pour chaque candidat, la décision qui le conditionne.

| Élément | Pourquoi | Alternative candidate | Dépend de |
|---|---|---|---|
| **`site_content` en blob JSONB unique** | Ne permet ni contenu structuré, ni pages, ni brouillon, ni versioning, ni requêtes par champ — c'est l'obstacle n°1 au CMS | Contenu structuré (tables typées ou documents versionnés par entité) | **D1** |
| **Résolution des photos de plats par convention de chaîne** | Viole la règle 6 (source unique de vérité) ; casse silencieusement au renommage | Référence (FK) entre produit et média | **D6** |
| **RBAC front-only avec listes de rôles figées en RLS** | Les deux couches divergent → échecs silencieux ; impossible d'exprimer la granularité par module en base | Permissions portées par la base, ou alignement strict des deux couches | **D4** |
| **Sections publiques monolithiques non paramétrables** | Empêche tout Page Builder (règle 18) | Registre de sections à schéma déclaratif | **D3** |
| **Prix et dates en TEXT** | Empêche tout calcul, tri, statistique fiable | Types numériques/date | **D5** |
| **Panier 100 % client sans validation serveur** | Prix manipulable, aucune traçabilité de l'intention | Validation du panier côté base/Edge Function | D5 |
| **Menu codé en dur dans le bundle** (fallback) | Contredit la règle 5 (pas de contenu éditable dans les composants) et masque les pannes | Source unique : la base | D1 |

### 20.6 CE QUI MANQUE (pour devenir un vrai CMS restaurant)

#### A. Modèle de contenu et structure

1. **Modèle de pages structuré** — pages, sections, blocs, ordre, visibilité, variantes.
2. **Table de catégories de menu** (nom, image, ordre, description, SEO).
3. **Disponibilité produit** (épuisé, masqué, disponible selon créneau).
4. **Options et suppléments produit** (tailles, accompagnements, extras, allergènes structurés).
5. **Horaires d'ouverture et de service** paramétrables, avec exceptions.
6. **Promotions** (prix barré, menu du jour, code promo).

#### B. Workflow éditorial (règle 8 : DRAFT → PREVIEW → PUBLISH → LIVE)

7. **États de publication** généralisés (aujourd'hui : le blog uniquement).
8. **Prévisualisation avant publication** (aucun mécanisme actuel).
9. **Planification de publication** (date/heure).
10. **Historique des versions et restauration** (inexistant).
11. **Corbeille / soft delete / annulation** (inexistant).
12. **File d'attente de modifications** (aujourd'hui : écriture directe en production à chaque frappe).

#### C. Édition et structure de contenu

13. **Page Builder** (inexistant, et bloqué par l'absence de sections paramétrables).
14. **Composants de section réutilisables et configurables**.
15. **Bibliothèque de blocs** (texte, image, galerie, CTA, avis, horaires…).
16. **Édition de contenu en place** (l'admin édite aujourd'hui des champs, pas la page).
17. **Gestion des menus de navigation** (aujourd'hui figés dans le code).
18. **Traductions / multi-langue** (aucune infrastructure).

#### D. Médias

19. **Médiathèque centralisée** avec recherche, tags, dossiers, formats dérivés.
20. **Référencement des médias** (aujourd'hui : convention de chaîne).
21. **Optimisation de diffusion** (`<img>`, `srcset`, formats modernes, lazy loading).

#### E. SEO et diffusion

22. **Routage par contenu** (pages et articles indexables).
23. **Métadonnées par page/article** (le schéma existe partiellement pour le blog).
24. **Données structurées JSON-LD** (Restaurant, Menu, LocalBusiness, Article).
25. **`robots.txt` et `sitemap.xml` générés**.
26. **Page 404**.
27. **Flux RSS / partage social**.

#### F. Fiabilité et exploitation

28. **Tests** (unitaires, intégration, RLS, parcours).
29. **Journalisation/observabilité** (les erreurs sont aujourd'hui silencieuses).
30. **Sauvegarde et restauration du contenu** (aujourd'hui : export/import JSON global destructif).
31. **Validation des données saisies** (prix, dates, emails côté base).
32. **Reproductibilité du déploiement** (Cloudflare non décrit).
33. **Documentation du modèle de données à jour**.

#### G. Compatibilité future IA (règle 18)

34. **Actions CMS structurées** (`createPage`, `addSection`, `updateTheme`, `publishChanges`, `restoreVersion`…) : elles supposent un modèle de contenu adressable, qui n'existe pas encore. La conception du modèle devra **pouvoir** intégrer cette exigence — c'est une question à trancher avec D1 et D3, pas une contrainte imposée par cet audit.

---

## 21. Risques

### Risques critiques

| Réf | Risque | Preuve | Impact |
|---|---|---|---|
| **R1** | **L'unique compte `owner` est un compte de démonstration dont le mot de passe est affiché publiquement** sur la page de connexion. Le propriétaire réel n'est que `manager`. | base déployée (§10) + `LoginScreen.tsx:71-76` | Prise de contrôle administrative complète (y compris `admin_users`) |
| **R2** | **Perte de contenu irréversible** : tout le contenu éditable est un blob JSONB **unique**, écrasé en place, sans version, sans undo, sans soft delete. L'import de configuration remplace tout **sans confirmation**. | §10, §6 | Un clic malheureux détruit le contenu du site |
| **R3** | **Édition directe en production** : modifier un prix dans l'admin l'écrit immédiatement dans la ligne servie au public (sauf blog). | §6, §10 | Erreur visible par les clients en pleine service ; aucune possibilité de préparer un changement |
| **R4** | **Authentification contournable côté client** : repli sur identifiants codés dans le bundle + session locale restaurée sans validation serveur. | `AuthContext.tsx:116-119,203-211`, `users.ts:14-17` | Exposition de l'UI d'administration ; l'écriture reste bloquée par RLS |
| **R5** | **`is_admin()` ignore `active`** : un compte suspendu garde ses droits d'écriture en base. | source `is_admin()` (§11) | Une révocation d'accès est inefficace côté base |

### Risques élevés

| Réf | Risque | Preuve | Impact |
|---|---|---|---|
| **R6** | **Divergence matrice front ↔ RLS** → échecs d'écriture silencieux pour les rôles non listés en base. | §8, §11 | Confusion utilisateur, perte de confiance ; impossible d'exprimer la granularité voulue |
| **R7** | **Aucun test, aucune observabilité** : ~9 lectures échouent silencieusement en retombant sur des données locales, sans log. | §18, §19 | Pannes invisibles ; régressions non détectées ; le CMS grandira sans filet |
| **R8** | **Migrations destructives et non idempotentes** : le seed `004` supprime le menu par nom ; plusieurs migrations échouent si rejouées ; aucun suivi de version dans le dépôt. | `004_seed.sql:6`, §19 | Perte des éditions du menu ; migrations non reproductibles sur un nouvel environnement |
| **R9** | **Fonctionnalités cassées non détectées** : suppression de commandes et de réservations impossible (RLS), 4 abonnements Realtime morts, 2 liens de navigation morts. | §11, §10, §4 | Le restaurateur croit agir, rien ne se passe |
| **R10** | **Modèle de données non adapté au CMS** (prix en TEXT, 0 FK, catégories en texte libre, photos par convention). | §10, §12, §15 | Construire le CMS dessus multiplierait la dette ; toute correction ultérieure sera une migration |

### Risques moyens

| Réf | Risque | Preuve |
|---|---|---|
| **R11** | Panier sans validation de prix côté serveur (`parsePrice` cassable) | `CartContext.tsx:25-27` |
| **R12** | Secrets et mots de passe exposés : identifiants en clair dans un document de branche, tokens partagés, `.env.example` historiquement porteur d'une vraie clé | §19, roadmap de branche |
| **R13** | Production réelle (Cloudflare Pages) non décrite dans le dépôt → non reproductible, dépendante d'un déploiement manuel par API | §17 |
| **R14** | `AdminPanel.tsx` monolithique : toute évolution du CMS aggravera un fichier déjà à 2 763 lignes | §6 |
| **R15** | Documentation partiellement fausse → un intervenant (ou une IA) code sur des hypothèses erronées | §19 |
| **R16** | Aucune page 404, aucun routage par contenu → limites SEO durables | §16 |

### Angles morts relevés par la revue indépendante (§25)

Ces points n'avaient pas été traités dans la première version de l'audit et conditionnent pourtant l'effort réel :

| Réf | Angle mort | Pourquoi il compte |
|---|---|---|
| **R17** | **Aucune estimation de la conversion des données existantes** (blob `site_config` → entités ; `price` en TEXT → numérique ; `orders.items` en JSONB) | Le coût réel de D1/D5/D6 n'est pas chiffré : c'est ce qui fait échouer les migrations de contenu en pratique |
| **R18** | **Édition concurrente non traitée** : une ligne unique `site_content`, en « dernier écrivain gagne » | Deux personnes éditant en même temps → **écrasement silencieux** des modifications de l'autre. Central pour un CMS multi-utilisateurs |
| **R19** | **Aucun volet RGPD / rétention des données clients** (nom, email, téléphone, historique de commandes) | Le CMS va centraliser des données personnelles, sans politique de conservation ni d'export/suppression |
| **R20** | **Aucune mesure de performance ni d'observabilité** : 8 requêtes chargées pour tout visiteur, bundle de 469 KiB, aucune métrique | R7 (pannes invisibles) est identifié, mais rien ne permet de le mesurer ni de le détecter |
| **R21** | **Aucun plan de sauvegarde/restauration de la base** — seul l'export JSON du contenu est cité, et il est destructif à l'import | R2 est aggravé : il n'existe aujourd'hui **aucun** moyen de revenir en arrière en cas de perte |

---

## 22. Décisions qui nécessitent une validation du propriétaire

> Ces décisions ont des conséquences importantes sur la base de données, l'architecture, les API, l'authentification, les permissions, le système de publication, le Page Builder ou les migrations. **Aucune ne sera tranchée sans validation explicite** (règle 11 : consultation obligatoire au franchissement d'un point de décision structurant).

| Réf | Décision | Options envisageables | Conséquence |
|---|---|---|---|
| **D1** | **Modèle de contenu** : que devient le blob `site_content` ? | (a) Tables typées par entité (pages, sections, blocs) ; (b) documents versionnés par page ; (c) hybride : structure en tables, contenu riche en JSONB | Détermine tout le reste : publication, versioning, Page Builder, migrations |
| **D2** | **Workflow de publication** : quelle granularité ? | (a) Global (tout le site en brouillon/publié) ; (b) par page ; (c) par entité (menu, blog, pages séparément) | Détermine le schéma, l'UI, et l'expérience du restaurateur |
| **D3** | **Page Builder** : quel niveau d'ambition ? | (a) Bibliothèque de sections paramétrables (ordonnancement simple) ; (b) éditeur de blocs complet ; (c) pas de Page Builder, champs structurés uniquement | Effort majeur ; conditionne la règle 18 (compatibilité IA) |
| **D4** | **Permissions** : où vit la vérité ? | (a) Aligner la RLS sur la matrice front (listes de rôles) ; (b) porter les permissions en base (tables rôles/permissions) ; (c) simplifier le front pour refléter exactement la RLS | Touche à l'authentification, aux permissions et à la sécurité |
| **D5** | **Modèle menu & commandes** : jusqu'où normaliser ? | (a) Minimal (types, disponibilité) ; (b) catégories + options + suppléments + promotions ; (c) aller jusqu'aux horaires et au calcul de panier serveur | Migration de données existantes (38 produits, 4 commandes) |
| **D6** | **Médias** : convention ou référence ? | (a) Garder les slots, corriger la convention et l'unicité ; (b) vraie médiathèque avec FK depuis les entités | Migration des 16 médias et de leurs rattachements |
| **D7** | **SEO & routage** : accepte-t-on de passer du one-page à un site multi-pages ? | (a) One-page ancré (statu quo, SEO limité) ; (b) routes par contenu (pages + articles) ; (c) hybride | Changement d'architecture front (routage) et impact sur tous les liens existants |
| **D8** | **Durcissement de l'authentification** : quelles suppressions ? | (a) Retirer le repli codé en dur et la session locale non validée ; (b) supprimer les comptes de démo ; (c) les deux | Sécurité, mais risque de verrouillage si mal séquencé (voir R1) |
| **D9** | **Périmètre produit** : mono-restaurant ou multi-établissement ? | (a) Mono-restaurant (simple) ; (b) multi-établissement dès la conception | Impact profond sur le schéma et la RLS |
| **D10** | **Langues** : mono-langue ou bilingue (fr/en) ? | (a) Français uniquement ; (b) bilingue dès la conception ; (c) infrastructure prête, contenu plus tard | Impact sur le modèle de contenu et le SEO |
| **D11** | **Tests** : introduit-on une infrastructure de test et à quel niveau ? | (a) Aucun test (statu quo) ; (b) tests unitaires ciblés (repository, tarification) ; (c) tests + tests RLS + parcours | Conditionne la sécurité de toutes les migrations futures |
| **D12** | **Déploiement canonique** : quelle cible fait foi ? | (a) Cloudflare Pages principal, Netlify secours (état actuel) ; (b) Netlify uniquement ; (c) les deux décrits et reproductibles | Reproductibilité, coût, cohérence de la documentation |

### Question ouverte préalable

| Réf | Sujet |
|---|---|
| **Q1** | **Le TDR est introuvable dans le dépôt.** Les règles de travail désignent « le TDR et le dépôt existant » comme sources de vérité, mais aucun document de spécification produit n'est présent dans `greatlife/` ni sur les branches. **La vision cible du CMS (périmètre, priorités, niveau d'ambition) reste donc à fournir** — elle est nécessaire avant la phase suivante, notamment pour trancher D1 à D3. |

---

## 23. Ce qui a été vérifié, et comment

| Type de vérification | Portée |
|---|---|
| **Lecture directe de fichiers** | `src/` (sections, admin, contexts, lib, data, config), `supabase/migrations/` (18 fichiers), `supabase/functions/`, `docs/`, `package.json`, `netlify.toml`, `vercel.json`, `index.html`, `public/`, workflows GitHub |
| **Interrogation de la base déployée** (lecture seule) | `information_schema.columns`, `pg_policies`, `pg_publication_tables`, `pg_proc` (`is_admin`), `pg_trigger`, `pg_indexes`, `storage.buckets`, comptages et échantillons de données |
| **Inspection git** | `log`, `status`, branches distantes (55 branches), contenu de `docs/admin-roadmap.md` sur branche |
| **Vérification en production** | Chargement du site public, connexion admin de bout en bout, contrôle des bundles servis |
| **Historique de session** | RLS invalide corrigée dans 3 migrations (`WITH (true)` → `WITH CHECK (true)`) lors de la reconstruction de la base dédiée |
| **Revue indépendante** | Un agent `verifier` en lecture seule a contesté les affirmations factuelles de ce document ; ses constats sont intégrés (§25). Le skill `fable-advisor` désigné par les règles n'existe pas dans ce runtime (§25) |

### Éléments explicitement `NON VÉRIFIÉS`

1. Contenu exact des overrides RBAC en base (la clé `rbac_overrides` est absente du blob déployé).
2. Efficacité pratique de l'absence de policy UPDATE sur `storage.objects` (le code contourne par suppression/recréation).
3. Comportement runtime des ancres cassées du footer (déduit du code, non observé dans le navigateur).
4. Existence éventuelle de comptes utilisateurs `chef` / `editor` / `marketing` (aucun n'existe en base aujourd'hui).
5. Configuration Cloudflare Pages côté compte (le dépôt ne la décrit pas).
6. Variables d'environnement réellement configurées sur les deux hébergeurs.
7. Toute intention produit non écrite (le TDR est absent).

---

## 24. Recommandation de séquencement (soumise à validation)

> Proposition d'ordre, pas une décision.

1. **Trancher Q1 (TDR)** — la vision cible manque pour arbitrer D1 à D3.
2. **Arbitrer D1, D2, D4** — ce sont les décisions dont tout le reste dépend (modèle de contenu, publication, permissions).
3. **Corriger les fonctionnalités cassées en production** (suppressions commandes/réservations, commande par un admin, Realtime, liens morts) — correctifs isolés, sans dépendance architecturale.
4. **Traiter les risques critiques R1, R2, R4, R5** — sécurité et irréversibilité, indépendamment du CMS.
5. **Introduire une infrastructure de test (D11)** avant toute migration de données.
6. **Construire le modèle de contenu et le workflow de publication** (D1, D2, D3).
7. **Puis** refactorer l'admin (découpage) et le modèle menu (D5, D6).
8. **Enfin** SEO et routage (D7), qui deviennent faciles une fois le contenu structuré.

**Aucune de ces étapes n'est engagée.** L'implémentation ne commencera qu'après validation explicite de l'audit.

---

## 25. Revue indépendante du livrable

Conformément à la règle 12 (« revue finale avant de déclarer un livrable majeur terminé »), cet audit a été soumis à une **revue indépendante adversariale** en lecture seule, chargée de contester ses affirmations factuelles.

### Avertissement sur l'outil de revue

La règle 11 désigne le skill `fable-advisor`. **Ce skill n'existe pas dans le runtime actuel** : `fable-advisor` est un **agent Claude Code** défini dans `C:/Users/MARA/.claude/agents/fable-advisor.md`, utilisant le modèle `fable` avec les outils `Read`, `Grep`, `Glob`. Or **ce modèle n'est pas disponible ici** (le catalogue local expose `minimax-m3`, `m2.7`, `m2.5` et des modèles NVIDIA). La revue a donc été confiée à l'agent **`verifier`** intégré — lecture seule, chargé de contester et non de corriger — qui est l'équivalent le plus proche. **Cet écart est signalé pour arbitrage** : si tu veux l'avis de Fable proprement dit, il faut l'invoquer depuis Claude Code.

### Ce que la revue a confirmé

Toutes les affirmations de **bug** ont été confirmées avec preuves : absence de policy DELETE sur `orders`/`reservations` alors que l'UI appelle bien `deleteOrder`/`deleteReservation` ; `orders_public_insert` limitée à `anon` ; absence totale de tests ; 4 abonnements Realtime morts sur 6 ; 2 liens de navigation morts ; incohérence des conventions de slot média ; `parsePrice` fragile ; `is_admin()` ignorant `active`.

### Ce que la revue a fait corriger dans ce document

| Correction apportée | Constat d'origine | Corrigé en |
|---|---|---|
| Volumétrie | `AuthContext` 244→**259**, `supabase.ts` 140→**150**, ajout de `admin/ui.tsx` **130** | §2 |
| Nombre de policies | « 21 » → **24** sur 9 tables (+3 storage) | §11 |
| Portée du journal d'audit | « ne trace que les statuts commandes/réservations » était **faux** : il trace aussi RBAC, utilisateurs, import | §6 |
| Compte des usages `canDo` | « 21 » → **12** | §8 |
| Comptes de `catch` silencieux | « ~9 » → **12** (avec `:238,861,876`) | §9, §19 |
| Nombre de primitives UI | « 15 » → **12** | §3, §5 |
| Nombre de fichiers de sections | « 15 sections » → **13 fichiers** (le tableau en compte 15 avec nav et login) | §3, §4 |
| Cohérence interne | §1 « 4 trous » vs §11 « 6 trous » → harmonisé à **6** | §1 |
| Précision des palettes | « 17 couleurs » non vérifiable → formulation neutre | §14 |
| Taille du bundle | Précision des unités (469 KiB ≈ 479 kB Vite, 120 kB gzip) | §2 |

### Ce que la revue a fait ajouter

- La **correction du §7** : l'affirmation rassurante « les écritures restent bloquées par la RLS » est **nulle dans le scénario critique**, puisque des identifiants publics donnent un JWT parfaitement légitime. C'est la correction la plus importante de cette revue.
- Les **5 angles morts** R17 à R21 (§21) : conversion des données, édition concurrente, RGPD, observabilité, sauvegarde.
- Le **durcissement du vocabulaire** en §20 : les sections 20.4 et 20.5 sont explicitement requalifiées en listes de candidats, pour ne franchir aucune ligne décisionnelle (§22).

### Point sur lequel la revue s'est trompée

La revue affirme que `restaurantName` est **absent** de `src/`. **C'est inexact** : la chaîne existe bien (`SiteContext.tsx:21`, `SiteContext.tsx:142`, `repository.ts:147`, `AdminPanel.tsx:2681`). La remarque du §4 reste donc valide, mais sa portée est nuancée : le champ est **déclaré et sauvegardé**, il n'est simplement **pas utilisé** pour afficher la marque dans la navigation (qui code « Greatlife » en dur).

### Réserve à garder en tête

Les constats marqués comme provenant de la **base déployée** (§10, §11, comptages) proviennent de requêtes en lecture seule exécutées pendant cet audit sur le projet `atsujzoozqnjelngqkab`. La revue indépendante n'a pas pu les rejouer, faute d'accès. Ils sont donc étayés, mais **non reproductibles par un tiers sans credential** — c'est une limite de traçabilité à assumer, pas une incertitude sur les valeurs reportées.

---

## 26. Suivi de remédiation

> Section ajoutée après coup pour éviter toute confusion : les sections précédentes décrivent l'état **à la date de l'audit**. Cette section suit ce qui a été corrigé depuis.

### Lot 0.5 — Remédiation sécurité (18/09/2026)

| Risque | État | Ce qui a été fait |
|---|---|---|
| **R1** — identifiants de démonstration publics | 🟢 **Clos** | Compte réel promu `owner` ; mots de passe des comptes de démo remplacés par rotation ; ces comptes **bannis** (auth) et **désactivés** (`admin_users.active = false`) ; encart d'identifiants retiré de `LoginScreen` ; repli sur identifiants codés en dur supprimé du chemin Supabase (les comptes de démo ne sont plus définis qu'en développement, `import.meta.env.DEV`) ; littéral purgé de `README.md`, `DEVELOPMENT.md` et du présent document ; **source maps désactivées en production** et cache de l'ancienne carte invalidé |
| **R4** — contournement d'authentification côté client | 🟢 **Clos** | Suppression du repli sur identifiants codés en dur et de la restauration de session `localStorage` non validée par le serveur ; le rôle vient **exclusivement** de `admin_users` |
| **R5** — `is_admin()` ignorait `active` | 🟢 **Clos** | Migration `019` : `is_admin()` exige `active = true` ; policy `admin_users_self_read` ajoutée ; l'Edge Function `send-contact-email` contrôle aussi `active` ; `refreshRole` coupe la session en cas de suspension |

Risques **encore ouverts** (hors périmètre de ce lot) : R2 (pas de versioning/undo — traité par le Lot 3 du TDR), R3 (édition directe en production — Lot 3), R6 à R21.

**Réactivation ultérieure (18/09/2026, sur demande du propriétaire)** : `owner@greatlife.com` a été **réactivé** (bannissement levé, `active = true`) afin de redonner au propriétaire un accès opérationnel immédiat. Son mot de passe est celui issu de la rotation — **fort et non public** — et non l'ancien mot de passe exposé, qui reste invalide. `gerant@greatlife.com` demeure banni et désactivé. La posture de sécurité de R1 n'est donc pas affectée : l'ancien identifiant public ne fonctionne toujours pas, et l'encart de démonstration comme le repli codé en dur ont été retirés.

Compléments apportés par la revue de ce lot :

- **Migration `020`** : comparaison d'email insensible à la casse dans `is_admin()` et dans la policy de lecture de soi. Sans cela, une seule divergence de casse entre `auth.users` et `admin_users` verrouillait définitivement un propriétaire légitime, sans recours côté client.
- **Jeton d'invalidation de cache** (`public/assets/index-BLdAmITw.js.map`) : une source map déjà mise en cache au niveau edge continuait d'être servie malgré sa suppression du déploiement. Détail dans `docs/cache-tombstone-index-BLdAmITw.md`.
- `public/` ne contient volontairement que ce jeton — il est retirable dès que l'URL ne sert plus l'ancienne carte.

---

*Fin de l'audit — document de lecture seule, à valider avant la phase suivante.*
