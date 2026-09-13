# Greatlife — Guide de développement (reprise du projet)

> Ce document est un **cahier de transfert** : il explique comment reprendre le développement de l'app même si l'auteur précédent n'est pas disponible. Lire après [README](./README.md) et [ARCHITECTURE](./ARCHITECTURE.md).

## Sommaire

1. [Mise en route](#1-mise-en-route)
2. [Le mode démo vs le mode Supabase](#2-le-mode-démo-vs-le-mode-supabase)
3. [Le cycle de dev recommandé](#3-le-cycle-de-dev-recommandé)
4. [Tâches courantes (comment faire…)](#4-tâches-courantes)
5. [Pièges et choses à savoir](#5-pièges-et-choses-à-savoir)
6. [Sécurité](#sécurité)
7. [Checklist avant de livrer une PR](#7-checklist-avant-de-livrer-une-pr)
8. [Roadmap / pistes d'évolution](#8-roadmap--pistes-dévolution)

---

## 1. Mise en route

```bash
# 1. Cloner + installer
git clone https://github.com/moelohimmara-dotcom/greatlife
cd greatlife
npm install

# 2. Configurer l'environnement
cp .env.example .env
# .env contient déjà VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY pré-remplis
# (ce sont des valeurs client, sûres à committer dans .env.example)
```

Pour travailler **sans backend** (UI seule, données en mémoire) : supprimez (ou renommez) `.env`. Le site passe en mode démo automatiquement.

### Vérifier que tout compile

```bash
npm run build    # tsc --noEmit + vite build  (CI fait exactement ceci)
npm run lint     # eslint
npm run dev      # dev server
```

> La CI (`.github/workflows/build-test.yml`) exécute `npx tsc --noEmit` puis `npx vite build` sur tout push/PR vers `main`. **Un build qui échoue bloque la merge.**

### Comptes de test

| Rôle | Email | Mot de passe | Note |
|---|---|---|---|
| Propriétaire | `owner@greatlife.com` | `greatlife2026` | secours local, tous droits |
| Gérant | `gerant@greatlife.com` | `greatlife2026` | secours local |

En mode Supabase, ces comptes doivent aussi exister dans *Supabase → Authentication → Users*, **et** leur rôle doit être renseigné dans la table `admin_users` (colonne `role` = `owner` ou `manager`).

## 2. Le mode démo vs le mode Supabase

C'est la **première chose à comprendre**. Tout découle de `isSupabaseConfigured` (`src/lib/supabase.ts`) :

```ts
export const isSupabaseConfigured = Boolean(
  VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY
  && VITE_SUPABASE_URL.startsWith('https://')
  && VITE_SUPABASE_URL.includes('.supabase.co')
)
```

- **Configuré** → `getSupabase()` renvoie un client ; `repository.ts` lit/écrit en base ; le Realtime est activé ; l'auth passe par Supabase Auth (avec repli local si la table `admin_users` ne donne pas de rôle).
- **Non configuré** → `getSupabase()` renvoie `null` ; `repository.ts` renvoie `{ fromDb: false, data: <fallback> }` ; auth 100 % locale (comptes `src/data/users.ts`).

**Implication** : chaque fonction de `repository.ts` teste `getSupabase()` et a un chemin fallback silencieux. Quand vous ajoutez une fonction CRUD, reproduisez ce pattern (renvoyez `fromDb: false` + donnée par défaut au lieu de planter).

L'indicateur visuel se voit sur le **Tableau de bord admin** (`dataSource` → badge "Supabase connecté" ou "Mode démo").

## 3. Le cycle de dev recommandé

1. **Branche** : créez une branche descriptive (ex. `feat/paiement-ligne`, `fix/cart-total`). Le repo utilise le préfixe `vibe/...` pour les PR auto, mais tout nom clair convient.
2. **Modifiez** en suivant les conventions d'[ARCHITECTURE.md](./ARCHITECTURE.md) (alias `@/`, pas de commentaires, types stricts).
3. **Vérifiez en local** :
   - `npm run dev` → testez le parcours concerné (public et/ou admin).
   - `npm run build` → **doit passer** (c'est le gate de la CI).
4. **Committez** par unité logique, messages au format `feat(...)` / `fix(...)` / `docs(...)`.
5. **Pushez** et ouvrez une PR vers `main`. Surveillez le check *Build Test*.

### Où chercher le code d'une fonctionnalité

| Je veux toucher… | Fichier(s) |
|---|---|
| Le texte du Hero / Histoire / emails contact | `src/contexts/SiteContext.tsx` (`DEFAULT_CONTENT`) + admin *Contenu* (`AdminPanel.tsx` → `ContentEditor`) |
| Un produit du menu | `src/data/menu.ts` (fallback) + table `menu_items` + admin *Carte & prix* (`MenuEditor`) |
| Une section publique (ajouter/retirer/réorganiser) | `src/sections/PublicSite.tsx` + la section concernée + `DEFAULT_VISIBILITY` |
| Un thème / une police | `src/config/themes.ts` / `fonts.ts` + admin *Thème* (`ThemeEditor`) |
| Le panier / la commande | `src/contexts/CartContext.tsx` + `src/sections/OrderCart.tsx` |
| Les réservations | `src/sections/Reservation.tsx` + admin *Réservations* (`ReservationsManager`) + table `reservations` |
| Les messages de contact | `src/sections/Contact.tsx` + admin *Messages* (`MessagesManager`) + table `messages` |
| Les emails envoyés | `supabase/functions/send-contact-email/index.ts` + `src/lib/supabase.ts` (`invoke*`) → [docs/emails.md](./docs/emails.md) |
| Le schéma / les permissions | `supabase/migrations/*.sql` → [docs/database.md](./docs/database.md) |
| L'auth / les rôles | `src/contexts/AuthContext.tsx` + `src/data/users.ts` + `src/data/rbac.ts` |

## 4. Tâches courantes

### Ajouter un item au menu
1. (Fallback) Ajoutez-le dans `src/data/menu.ts` (`MENU`), respectez `MenuItem` (`cat`, `name`, `sig?`, `price`, `desc`, `vertus`, `badges`).
2. (Base) Insérez-le dans la table `menu_items` via le SQL Editor Supabase ou l'admin (le `MenuEditor` fait l'`upsert` avec `onConflict: 'name'`).
3. `price` est une **chaîne** au format `"48 000"` (FG, séparateur espace). `parsePrice` (CartContext) extrait les chiffres.

### Ajouter une section publique
1. Créez `src/sections/MaSection.tsx` (export nommé, utilise `useSite` pour le thème).
2. Importez-la dans `src/sections/PublicSite.tsx` et ajoutez-la, **gardée par `visibility.sections.<id>`**.
3. Ajoutez la clé dans `DEFAULT_VISIBILITY.sections` (SiteContext) pour qu'elle soit activable/désactivable depuis l'admin *Visibilité*.

### Ajouter un thème
1. Ajoutez une entrée dans `THEMES` (`src/config/themes.ts`) avec toutes les clés de `ThemePalette`.
2. Le thème `premium` est le seul considéré comme dark (`isDark = themeId === 'premium'`) — si vous en ajoutez un dark, adaptez cette ligne dans `SiteContext`.

### Ajouter un badge alimentaire
1. Ajoutez l'entrée dans `BADGE_DEFS` (`src/config/badges.ts`) avec `label`, `fg`, `bg`.
2. Le badge est alors utilisable dans `menu_items.badges` (JSONB) et rendu par `BadgePill`.

### Ajouter une fonction CRUD Supabase
1. Dans `src/lib/repository.ts`, écrivez `export async function maFonction(...)` qui commence par `const sb = getSupabase(); if (!sb) return <fallback>`.
2. Renvoyez `{ ok, error? }` pour les écritures, `{ data, fromDb }` pour les lectures. Utilisez `errMsg(error)` pour les messages d'erreur.
3. Si la table doit être synchronisée en Realtime, ajoutez-la au canal dans `SiteContext` (et/ou son propre canal comme `OrdersManager`).
4. Ajoutez la migration SQL correspondante dans `supabase/migrations/` (**numérotation séquentielle** : `013_…`).

### Ajouter une migration SQL
- Numérotez-la après la dernière (`012_orders.sql` → `013_…`).
- RLS activé par défaut (`ALTER TABLE … ENABLE ROW LEVEL SECURITY`).
- Pour les politiques admin, **utilisez `public.is_admin(ARRAY['owner','manager'])`** (fonction SECURITY DEFINER de la migration 007) — ne référencez pas `admin_users` directement dans une policy, sinon **récursion infinie** (bug corrigé en 007).
- Les buckets Storage doivent être créés en tant que superuser (Management API / `apply_migration`), pas via l'API anon (voir commentaire migration 011).

### Ajouter / modifier un type d'email
Voir [docs/emails.md](./docs/emails.md). En résumé : l'Edge Function `send-contact-email` gère 4 `action` (`contact`, `reply`, `reservation-status`, `order-status`). Ajoutez une branche `action` dans la fonction + un helper `invoke*` dans `src/lib/supabase.ts`.

## 5. Pièges et choses à savoir

- **RLS et récursion** : ne jamais faire pointer une policy d'une table vers `admin_users` directement. Passez par `public.is_admin(...)`. C'est le bug qui a nécessité la migration 007.
- **Insert public + return** : supabase-js envoie `Prefer: return=representation` par défaut après un insert, ce qui déclenche un SELECT post-insert. Les policies `*_public_insert` utilisent donc `WITH (true)` et il **ne faut pas** exposer de SELECT public sur `messages`/`reservations` (données privées). Les migrations 008 ont corrigé un overshare ; ne le réintroduisez pas.
- **`price` est une string**. `"48 000"` = 48000 FG. `parsePrice` supprime tout sauf les chiffres. Ne stockez pas d'entier.
- **Le thème est dynamique** : les couleurs viennent de `SiteContext.rootStyle` via variables CSS. En admin, beaucoup de composants lisent `const { theme: t } = useSite()` puis `t.surface`, `t.primary`, etc. Ne hardcodez pas de couleurs.
- **`AdminPanel.tsx` est un gros fichier** (~1400 lignes, 12 modules). Ce n'est pas idéal mais c'est ainsi. Si vous le découpez, gardez `Admin` comme point d'entrée et exportez les modules depuis des fichiers dédiés.
- **Realtime** : il faut que les tables soient ajoutées à la publication `supabase_realtime` (voir migration 009 / 012). Sans ça, le canal ne reçoit rien.
- **Auth repli** : si Supabase Auth réussit mais que `admin_users` ne renvoie pas un rôle dans `ADMIN_ROLES`, l'utilisateur est **déconnecté** ("Accès non autorisé"). Vérifiez d'abord la table `admin_users`.
- **`noUnusedLocals` / `noUnusedParameters`** : le build échoue sur une variable non utilisée. Nettoyez vos imports.
- **Favicon / SEO** : `index.html` contient les meta OG/Twitter et la balise canonical pointant vers `greatlife-gn.netlify.app`. Si le domaine change, mettez à jour.
- **Pas de `.env` committé** (`.gitignore` l'exclut). Seul `.env.example` (valeurs publiques client) est versionné.

## Sécurité

> ⚠️ Plusieurs secrets ont été **volontairement retirés de cette doc** mais existent dans le code source — il faut les migrer vers des secrets plateforme.

- **SMTP** (`SMTP_USER` / `SMTP_PASS`) : actuellement **codés en dur** dans `supabase/functions/send-contact-email/index.ts` avec des valeurs par défaut. **À déplacer absolument** vers les secrets de l'Edge Function (Supabase → Functions → send-contact-email → Secrets). Le code lit déjà `Deno.env.get("SMTP_USER")` / `SMTP_PASS` ; supprimez les fallbacks en dur après avoir configuré les secrets.
- **Mots de passe admin** (`greatlife2026`) : uniquement des secours locaux pour le mode démo. En production Supabase, l'auth réelle est gérée par Supabase Auth — changez ces mots de passe et ne réutilisez pas `greatlife2026`.
- **Clé anon Supabase** : c'est une clé **publique** (role `anon`), sûre dans `.env.example`. La sécurité repose sur **RLS**, pas sur le secret de cette clé. Ne confondez pas avec la `service_role` (qui doit rester secrète et n'est **pas** utilisée côté client).
- **RLS** : jamais de policy `USING (true)` en écriture. Les insert publics (contact, commandes, réservations) sont intentionnels et limités à `INSERT` uniquement.
- Avant de committer, vérifiez l'absence de secrets : `git diff --cached | grep -iE "password|secret|apikey|smtp_pass"`.

## 7. Checklist avant de livrer une PR

- [ ] `npm run build` passe (typecheck + build).
- [ ] `npm run lint` est propre (ou les warnings sont justifiés).
- [ ] Pas de secrets / mots de passe / clés privées dans le diff.
- [ ] Pas de commentaires ajoutés dans le code source (règle du repo).
- [ ] Pas de nouvelles dépendances non justifiées.
- [ ] Le parcours concerné a été testé en local (public **et** admin si pertinent).
- [ ] En mode démo **et** mode Supabase si vous touchez au data layer.
- [ ] Migration SQL numérotée, idempotente (`IF NOT EXISTS`), RLS activé, `is_admin()` utilisé pour les policies admin.
- [ ] Le message de commit suit `feat()/fix()/docs()`.

## 8. Roadmap / pistes d'évolution

Idées non implémentées, identifiées au passage :

- **Doubler la sécurité des secrets SMTP** : retirer les valeurs en dur de l'Edge Function (cf. section Sécurité).
- **Harmoniser les appels directs** : certaines sections (`Reservation`, `Contact`) appellent `insertReservation`/`insertMessage` + `invokeContactEmail` directement au lieu de passer par une couche unique. Une fonction `submitContact` / `submitReservation` centralisée dans `repository.ts` clarifierait le flux.
- **RBAC réel** : `src/data/rbac.ts` décrit 6 rôles, mais seuls `owner`/`manager` accèdent au panneau. Implémenter le gating par module (cacher/désactiver les modules selon `perms`).
- **Paiement en ligne** : la commande génère un `ref` mais aucun paiement. Intégrer un prestataire (Wave, Orange Money, etc.) sur le checkout.
- **Découper `AdminPanel.tsx`** en modules par fichier (`admin/modules/*.tsx`) pour la maintenabilité.
- **Tests** : aucun test automatisé actuellement. Ajouter au minimum des tests de rendu (Vitest + Testing Library) sur les sections critiques (CartContext, formulaires).
- **i18n** : tout est en français en dur. Si besoin d'anglais, introduire un système de messages.

## Liens utiles

- Dashboard Supabase (projet `gpvfryvmghjenwfqhnkd`)
- Production : https://greatlife-gn.netlify.app
- Doc Supabase : Realtime, RLS, Edge Functions, Storage
- Doc associée : [docs/public-site.md](./docs/public-site.md), [docs/admin-panel.md](./docs/admin-panel.md), [docs/database.md](./docs/database.md), [docs/emails.md](./docs/emails.md), [docs/deployment.md](./docs/deployment.md)
