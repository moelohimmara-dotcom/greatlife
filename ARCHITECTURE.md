# Greatlife — Architecture

> Lecture conseillée après le [README](./README.md). Ce document décrit **comment le code est organisé** et **comment les données circulent**, afin qu'un nouveau développeur s'oriente rapidement.

## Vue d'ensemble

```
                    ┌──────────────────────────────────────────┐
                    │                  App.tsx                   │
                    │   BrowserRouter + SiteProvider + AuthProvider │
                    └───────────────┬────────────────────────────┘
                                    │ 3 routes
                ┌───────────────────┼───────────────────────────┐
                ▼                     ▼                           ▼
        /  PublicSite            /login LoginScreen         /admin  Admin
   (sections + OrderCart)        (useAuth)            (ProtectedRoute + Admin)
                │                                                 │
                │              useSite / useAuth / useCart         │
                ▼                                                 ▼
        src/sections/*                                  src/admin/AdminPanel.tsx
                │                                                 │
                └──────────────┬──────────────────────────────────┘
                               ▼
                    src/lib/repository.ts      ← TOUTE la persistance
                               │
                               ▼
                    src/lib/supabase.ts        ← Client + helpers invoke*
                               │
                               ▼
                          Supabase
                (Postgres · Auth · Storage · Realtime · Edge Functions)
```

Principes directeurs :

1. **Un module = une responsabilité** (`config`, `data`, `lib`, `contexts`, `hooks`, `components`, `sections`, `auth`, `admin`).
2. **Les données descendent** : contexts → composants. Aucun composant ne devrait appeler Supabase directement ; il passe par `repository.ts` (sauf `sections/*` qui utilisent parfois `insertReservation` / `insertMessage` + `invokeContactEmail` directement, à harmoniser si vous reprenez).
3. **Admin et public ne se mélangent pas** : routes séparées, bundles distincts, UI différentes. Le partage se fait via `contexts` et `lib`.
4. **Le RBAC est un gate, pas un composant** : `ProtectedRoute` vérifie `ADMIN_ROLES` au niveau route.
5. **Le thème est un singleton contextuel** : `SiteContext` injecte `theme` + `font` via variables CSS (`--c-*`, `--f-*`) sur l'élément racine.
6. **Validation inline** : chaque formulaire valide ses champs localement (regex email, champs requis).
7. **Pas de comments dans le code** : le code se documente par ses noms et cette doc.

## Structure des dossiers

```
src/
├── config/              Singletons de configuration
│   ├── themes.ts          THEMES: gourmand, premium (dark), nature, tropical
│   ├── fonts.ts           FONTS: fraunces, playfair, jakarta (paires heading/body)
│   └── badges.ts          BADGE_DEFS: omni, vege, gluten, arachide, lactose
│
├── data/                Données de référence / fallback (mode démo)
│   ├── menu.ts            MENU: 38 items + CATEGORY_ORDER + type MenuItem
│   ├── rbac.ts            ROLES: 6 rôles + matrice de permissions (référence)
│   └── users.ts           ADMIN_ACCOUNTS (secours local) + ADMIN_ROLES + USERS
│
├── lib/                 Logique réutilisable
│   ├── supabase.ts        createClient paresseux, isSupabaseConfigured,
│   │                      invokeContactEmail / invokeReplyEmail /
│   │                      invokeOrderStatusEmail / invokeReservationStatusEmail
│   ├── repository.ts      CRUD : menu, content, messages, blog, reservations,
│   │                      orders, media, admin_users  (28+ fonctions exportées)
│   ├── imageResize.ts     resizeImageFile + RESIZE_PRESETS (canvas client)
│   └── icons/
│       ├── index.tsx       Icon: objet d'icônes SVG maison (size, color)
│       └── FoodIcon.tsx    Illustrations alimentaires
│
├── contexts/            État global React
│   ├── SiteContext.tsx    THÈME + POLICE + CONTENU + VISIBILITÉ + MENU + MÉDIAS
│   │                      + MESSAGES + BLOG + ADMIN_USERS + ORDERS_COUNT + REALTIME
│   │                      (charge tout au montage, souscrit au Realtime)
│   ├── AuthContext.tsx    user, login (Supabase Auth + repli local), logout,
│   │                      ProtectedRoute
│   └── CartContext.tsx    items, add/remove/setQty/clear, totalNum, totalLabel
│                          (persisté dans localStorage `greatlife-cart`)
│
├── hooks/
│   ├── useIsMobile.ts     matchMedia(max-width: 768px)
│   └── useScrollSpy.ts    IntersectionObserver pour la nav active
│
├── components/
│   ├── ui/                Primitives partagées (admin + public)
│   │   ├── button.tsx, input.tsx, textarea.tsx, label.tsx, select.tsx,
│   │   │ switch.tsx, separator.tsx
│   │   ├── OrganicCard.tsx   Carte au tracé organique (border-radius variable)
│   │   ├── Reveal.tsx        Apparition au scroll (Framer Motion)
│   │   ├── SectionHead.tsx   Titre de section public
│   │   ├── BadgePill.tsx     Badge alimentaire (omni/vege/…)
│   │   └── shadows.ts        Ombres utilitaires
│   └── nav/
│       └── PublicNav.tsx    Nav sticky + scrollspy + drawer mobile
│
├── sections/             Le site public (one-page, sections ancrées #id)
│   ├── PublicSite.tsx     Assemble les sections selon `visibility`
│   ├── Hero, Carte, Story, Engagements, Team, Localisation,
│   │ Contact, Reservation, Blog, Footer
│   └── OrderCart.tsx      Panier coulissant + checkout (insertOrder + email)
│
├── auth/
│   └── LoginScreen.tsx    Formulaire de connexion (useAuth.login)
│
├── admin/
│   ├── AdminPanel.tsx     AdminShell + 12 modules (dashboard, orders, messages,
│   │                      reservations, content, menu, theme, blog, media,
│   │                      visibility, users, forms) — ~1400 lignes
│   └── ui.tsx             Primitives admin : PageHeader, EmptyState,
│                          FieldLabel, inputStyle, GhostButton, PrimaryButton,
│                          StatusPill
│
├── App.tsx               Router + Providers (SiteProvider → AuthProvider)
└── main.tsx              ReactDOM.createRoot + StrictMode
```

## Flux de données

### Au chargement (`SiteProvider`)
`useEffect` au montage lance en parallèle : `fetchMenu`, `fetchContent`, `fetchMessages`, `fetchBlogPosts`, `fetchMedia`, `fetchAdminUsers`, `fetchOrders`. Si **au moins un** renvoie `fromDb: true`, `dataSource` passe à `'supabase'`, sinon `'local'`. Les données fallback vivent dans `src/data/*` et `DEFAULT_*` (SiteContext).

### Écriture admin → base
Les modules admin appellent `repository.ts` (`upsertMenuItem`, `saveContent`, `upsertBlogPost`, `updateOrderStatus`, etc.). Chaque fonction renvoie `{ ok, error? }` et **surface le vrai message d'erreur Postgres** (voir `errMsg`).

### Realtime (public ↔ admin)
`SiteProvider` ouvre un canal Supabase `public-site-realtime` et souscrit aux tables `menu_items`, `site_content`, `blog_posts`, `media_assets`, `orders`. Sur changement, les fonctions `refresh*` rechargent les données. `OrdersManager` ouvre son propre canal `orders-realtime` + un polling de 60 s de secours.

### Commande en ligne (flux complet)
1. Client ajoute au panier (`CartContext`, persisté localStorage).
2. Checkout dans `OrderCart.tsx` : valide, génère `ref` (`GL…`), `insertOrder`, puis `invokeContactEmail` (notification côté restaurant).
3. Admin voit la commande dans `OrdersManager` (realtime), change le statut (`updateOrderStatus`), et `invokeOrderStatusEmail` notifie le client.

### Auth
`AuthContext.login` essaie `sb.auth.signInWithPassword`, puis lit le rôle dans `admin_users` (`resolveRoleFromTable`). Si la table ne renvoie pas un rôle valide, repli sur `ADMIN_ACCOUNTS` local. `ProtectedRoute` redirige les non-connectés vers `/login`.

## Conventions de code

- **TypeScript strict** (`tsconfig.json` : `strict`, `noUnusedLocals`, `noUnusedParameters`). Le build échoue sur ces règles.
- **Alias `@/`** → `src/` (configuré dans `vite.config.ts` + `tsconfig.json`). Toujours importer via `@/...`.
- **Pas de dépendances inutiles** : pas de shadcn/ui complet, pas de state global externe (pas de Redux/Zustand). Tout l'état global est en contexts maison.
- **Styles** : Tailwind pour les utilities, mais beaucoup de styles inline (objets `style={{}}`) en admin pour coller au thème dynamique. Les variables CSS (`--c-*`) sont injectées par `SiteContext` sur la racine → utilisables partout.
- **Icônes** : centralisées dans `src/lib/icons/index.tsx`. Pour en ajouter une, éditez cet objet plutôt que d'importer lucide dans un composant (lucide-react est installé mais peu utilisé ; préférez `Icon`).
- **Pas de commentaires** dans le code source (règle du repo). La doc vit ici et dans `docs/`.
- **Commits** : préfixe `feat()`, `fix()`, etc. (voir `git log`). Messages en anglais ou français courts.

## Où aller ensuite

- Pour **comprendre le site public** → [docs/public-site.md](./docs/public-site.md)
- Pour **comprendre le panneau admin** → [docs/admin-panel.md](./docs/admin-panel.md)
- Pour **la base de données** → [docs/database.md](./docs/database.md)
- Pour **les emails** → [docs/emails.md](./docs/emails.md)
- Pour **reprendre le dev au quotidien** → [DEVELOPMENT.md](./DEVELOPMENT.md)
