# Greatlife — Panneau d'administration

> Le panneau admin vit dans `src/admin/AdminPanel.tsx` (shell + 13 modules) et `src/admin/ui.tsx` (primitives). Accès : `/login` → `/admin`. Voir aussi [database.md](./database.md) pour les tables sous-jacentes.

## Accès & authentification

- Route `/admin` protégée par `ProtectedRoute` (`src/contexts/AuthContext.tsx`) : redirige vers `/login` si non connecté, ou vers `/` si le rôle n'est pas dans `ADMIN_ROLES`.
- `ADMIN_ROLES = ['owner', 'manager', 'chef', 'editor', 'marketing', 'guest']` (`src/data/users.ts`) — rôles admis dans le panneau (le rôle effectif vient de la table `admin_users`).
- En mode Supabase : `AuthContext.login` appelle `signInWithPassword`, lit le rôle dans la table `admin_users`, puis construit l'objet `user`. **Aucun repli** sur des comptes codés en dur : un compte sans rôle en base, ou dont la colonne `active` est fausse, est refusé et sa session est fermée.
- Les comptes de `ADMIN_ACCOUNTS` (`src/data/users.ts`) ne servent qu'au **mode démo local** (Supabase non configuré) et ne sont définis qu'en développement.
- Voir [DEVELOPMENT.md → Comptes de test](../DEVELOPMENT.md#1-mise-en-route).

## RBAC

`src/data/rbac.ts` définit 6 rôles (owner, manager, chef, editor, marketing, guest). Le RBAC est **réel et par module** : `MODULE_ACCESS` définit, pour chaque clé de module, les rôles qui peuvent y accíer (`canAccessModule`) et ceux qui peuvent y écrire (`canWriteModule`). La sidebar n'affiche que les modules accessibles au rôle connecté ; un module en lecture seule affiche une bannière « Accès en lecture seule ». Toutes les entrées du panneau (`ADMIN_PANEL_ROLES`) peuvent se connecter (gating route `ADMIN_ROLES` dans `src/data/users.ts`). La sécurité réelle est garantie par RLS (voir [database.md](./database.md) et la migration 014), cohérente avec cette matrice.

## Le shell (`AdminShell`)

`AdminPanel.tsx:46` — `AdminShell({ active, setActive, children })` :

- **Sidebar** : 4 groupes de navigation (`Pilotage`, `Contenu`, `Apparence`, `Système`) définis dans `NAV_GROUPS`.
- **Layout** : grille `248px sidebar + 1fr main` (desktop), drawer mobile (`admin-mobile-menu`).
- **Header de sidebar** : logo Greatlife, profil (`user.name`, `user.role`), bouton Déconnexion, lien « Voir le site ».
- **Transitions** : `AnimatePresence mode="wait"` avec slide/fade au changement de module (`Admin` à `AdminPanel.tsx:1384`).

### Navigation (12 modules)

| Groupe | Clé | Label | Composant | Icône |
|---|---|---|---|---|
| Pilotage | `dashboard` | Tableau de bord | `Dashboard` | grid |
| Pilotage | `orders` | Commandes | `OrdersManager` | coin |
| Pilotage | `messages` | Messages | `MessagesManager` | mail |
| Pilotage | `reservations` | Réservations | `ReservationsManager` | calendar |
| Contenu | `content` | Contenu | `ContentEditor` | write |
| Contenu | `team` | Équipe & contenus | `TeamContentsEditor` | users |
| Contenu | `menu` | Carte & prix | `MenuEditor` | leaf |
| Contenu | `blog` | Blog | `BlogEditor` | write |
| Apparence | `theme` | Thème & ambiance | `ThemeEditor` | palette |
| Apparence | `media` | Médias | `MediaManager` | image |
| Apparence | `visibility` | Visibilité | `VisibilityEditor` | eye |
| Système | `users` | Utilisateurs & rôles | `UsersRoles` | users |
| Système | `forms` | Formulaires & emails | `FormsConfig` | settings |
| Système | `settings` | Réglages globaux | `SettingsEditor` | settings |

## Les 12 modules

### 1. Dashboard (`Dashboard`)
Cartes de stats : nb produits, messages (dont non traités), commandes (dont en attente), réservations, utilisateurs, et **chiffre d'affaires** (somme des `total` des commandes confirmées, sur la période sélectionnée). Filtre de période : Tout / 30 jours / 7 jours. Badge d'état de la source de données (`dataSource` : Supabase connecté / Mode démo / Chargement). Liste les 4 derniers messages. Données depuis `useSite()` + `fetchOrders`.

### 2. Commandes (`OrdersManager`, ligne 1159)
- Charge `fetchOrders` au montage, souscrit au canal `orders-realtime` + polling 60 s.
- Filtres : tous / en attente (`pending`) / confirmée (`confirmed`) / annulée (`cancelled`).
- Changer le statut → `updateOrderStatus` + `invokeOrderStatusEmail` (notifie le client par email, voir [emails.md](./emails.md)).
- En mode démo : affiche un message invitant à connecter Supabase.

### 3. Messages (`MessagesManager`, ligne 981)
- Liste `fetchMessages`, marqueur `handled` via `markMessageHandled`.
- Réponse au client : `invokeReplyEmail` (ouvre un formulaire de réponse).
- Récupère les messages via `useSite().refreshMessages`.

### 4. Réservations (`ReservationsManager`, ligne 1275)
- `fetchReservations`, change le statut (`updateReservationStatus`) + `invokeReservationStatusEmail`.
- Statuts : pending / confirmed / cancelled.

### 5. Contenu (`ContentEditor`, ligne 198)

### 5.bis Équipe & contenus (`TeamContentsEditor`)
- CRUD sur trois collections stockées dans `site_content` (via `saveContentToDb`) :
  - **Équipe** : `content.team` (nom, rôle, description) — rendu par la section publique `Team`.
  - **Engagements** : `content.engagements` (icône, titre, description) — rendu par `Engagements`.
  - **Témoignages** : `content.testimonials` (auteur, texte) — rendu par la section publique `Testimonials` (gardée par `visibility.testimonials`).
- Édite `SiteContent` (slogan, heroTitle, heroSub, storyTitle, story, emails contact/résa, autoReply).
- Sauvegarde via `saveContentToDb` (merge dans `site_content.key = 'site_config'`).
- `SaveBar` affiche l'état (idle/saving/saved/error) + le message d'erreur réel.

### 6. Carte & prix (`MenuEditor`, ligne 243)
- CRUD sur `menu_items` : `upsertMenuItem` (onConflict `name`), `deleteMenuItem`.
- Édite cat, name, sig, price (string `"48 000"`), desc, vertus, badges (multi-sélect depuis `BADGE_DEFS`).
- `fetchMenu` recharge depuis Supabase ; fallback `MENU` local.

### 7. Blog (`BlogEditor`, ligne 855)
- CRUD `blog_posts` : `upsertBlogPost` (insert si pas d'id, update sinon), `deleteBlogPost`.
- Champs : title, excerpt, body, category, published (bool).

### 8. Thème & ambiance (`ThemeEditor`, ligne 354)
- Choix du thème (`THEMES` : gourmand, premium dark, nature, tropical) et de la police (`FONTS` : fraunces, playfair, jakarta).
- Sauvegarde via `saveSiteConfigToDb` (persist `themeId` + `fontId` + `content` + `visibility`).

### 9. Médias (`MediaManager`, ligne 440)
- Upload avec **redimensionnement client** (`resizeImageFile`, presets 512/800/1600/1920) → `uploadMedia` (Storage bucket `media` + ligne `media_assets`).
- Assignation de `slot` (`updateMediaSlot`), suppression (`deleteMedia` qui retire aussi le fichier Storage).
- Affiche `formatSize` des fichiers.
- Le site public résout un média via `useMedia(slot)`.

### 10. Visibilité (`VisibilityEditor`, ligne 665)
- Active/désactive les sections publiques (`visibility.sections.*`) et les toggles (vertusPanel, suggestions, testimonials, badges).
- Sauvegarde via `saveSiteConfigToDb`.

### 11. Utilisateurs & rôles (`UsersRoles`, ligne 707)
- CRUD `admin_users` : `upsertAdminUser`, `deleteAdminUser`, `fetchAdminUsers`.
- Affiche aussi la matrice `ROLES` (référence).
- ⚠️ Créer un utilisateur ici ne le crée **pas** dans Supabase Auth — il faut aussi le créer dans *Authentication → Users*. La table ne fait que lier email ↔ rôle.

### 12. Formulaires & emails (`FormsConfig`, ligne 937)
- Édite l'auto-réponse (`autoReply`), les emails de contact/réservation.
- Ces valeurs sont stockées dans `site_content` (via `saveContentToDb`).

### 13. Réglages globaux (`SettingsEditor`)
- Édite l'identité et les coordonnées du restaurant : nom, devise, téléphone, adresse, horaires d'ouverture, réseaux sociaux (Facebook, Instagram, WhatsApp).
- Stocké dans `site_content` (via `saveContentToDb`) dans les champs `restaurantName`, `currency`, `phone`, `address`, `hours`, `socialFacebook`, `socialInstagram`, `socialWhatsapp` (voir `SiteContent`).

## Primitives admin (`src/admin/ui.tsx`)

| Export | Usage |
|---|---|
| `PageHeader` | Titre + sous-titre + badge + actions d'une page |
| `StatusPill` | Pastille de statut colorée |
| `EmptyState` | État vide (icône + titre + sous-titre) |
| `FieldLabel` | Label de champ |
| `inputStyle(t)` | Objet de style pour les inputs (cohérent avec le thème) |
| `GhostButton` | Bouton secondaire (bordure) |
| `PrimaryButton` | Bouton principal (plein, couleur `t.primary`) |

Ces primitives lisent `useSite()` pour s'adapter au thème dynamique. Préférez-les aux styles inline ad hoc.

## Conventions spécifiques à l'admin

- **Toujours** `const { theme: t } = useSite()` en haut d'un module, puis `t.surface`, `t.primary`, etc.
- **SaveBar** : réutilisez le pattern (`status` + `error`) pour toutes les sauvegardes qui appellent `repository.ts`.
- **Realtime** : si un module doit réagir en direct, ouvrez un canal dédié (comme `OrdersManager`) avec cleanup dans le `return` du `useEffect`.
- **Erreurs** : `repository.ts` renvoie `{ ok, error? }` avec le vrai message Postgres — affichez-le (ne le masquez pas).

## Liens

- [database.md](./database.md) — tables & RLS
- [emails.md](./emails.md) — les notifications envoyées depuis ces modules
- [public-site.md](./public-site.md) — la contrepartie publique
