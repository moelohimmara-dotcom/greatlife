# Greatlife — Base de données (Supabase)

> Backend = Supabase. Ce document décrit le schéma, les migrations, la sécurité (RLS) et le Realtime. Voir aussi [DEVELOPMENT.md → Sécurité](../DEVELOPMENT.md#sécurité) et [admin-panel.md](./admin-panel.md) pour l'usage côté UI.

## Projet

- **Projet Supabase** : `atsujzoozqnjelngqkab`
- **URL** : `https://atsujzoozqnjelngqkab.supabase.co`
- **Région** : eu-west-1
- Le client est créé dans `src/lib/supabase.ts` (`getSupabase`, paresseux, clé anon).

## Tables

| Table | Rôle | Créée par | Lecture publique | Écriture |
|---|---|---|---|---|
| `menu_items` | Carte du restaurant (38 items) | 001 | oui (SELECT) | owner, manager, chef |
| `messages` | Messages du formulaire de contact | 001 | non | INSERT public ; UPDATE/SELECT admin |
| `site_content` | Config du site (clé `site_config`) | 001 | oui (SELECT) | owner, manager |
| `admin_users` | Comptes admin + rôles | 001 | non | owner uniquement |
| `blog_posts` | Articles de blog | 005 | publiés uniquement (SELECT) ; drafts admin | owner, manager, editor |
| `reservations` | Réservations de table | 006 | non | INSERT public ; UPDATE/SELECT admin |
| `media_assets` | Métadonnées des médias uploadés | 011 | oui (SELECT) | owner, manager, editor, marketing |
| `orders` | Commandes en ligne | 012 | non | INSERT public ; UPDATE/SELECT admin |

### Schéma détaillé

**`menu_items`** (001)
```
id uuid PK · cat text · name text · sig bool · price text · description text
vertus text · badges jsonb · sort_order int · created_at · updated_at
```
`price` est une **string** au format `"48 000"` (FG). `badges` = tableau JSONB de clés `BADGE_DEFS` (omni, vege, gluten, arachide, lactose). Tri par `sort_order`.

**`messages`** (001)
```
id uuid PK · nom · email · sujet (default 'contact') · message · date timestamptz · handled bool
```

**`site_content`** (001)
```
id uuid PK · key text unique · value jsonb · updated_at · updated_by
```
Une seule ligne utile : `key = 'site_config'`, `value` = `{ content, themeId, fontId, visibility }` (voir `SiteConfig` dans `repository.ts`).

**`admin_users`** (001)
```
id uuid PK · email text unique · name · role (default 'guest') · created_at
```
**C'est la table de vérité pour les rôles.** `AuthContext.resolveUserFromTable` la lit pour déterminer le rôle d'un utilisateur connecté. Depuis la migration 019, `is_admin()` exige aussi `active = true` ; depuis la 020, la comparaison d'email est insensible à la casse.

**`blog_posts`** (005)
```
id uuid PK · title · excerpt · body · category (default 'Actualités') · published bool
created_at · updated_at
```

**`reservations`** (006)
```
id uuid PK · nom · email · phone · date text · time text · guests int (default 2)
message · status (default 'pending') · created_at
```

**`media_assets`** (011)
```
id uuid PK · slot text (default 'general') · filename · storage_path · public_url
content_type · size_bytes bigint · created_at · updated_at
```
`slot` est libre (ex. "Hero principal", "Logo / favicon"). L'UI publique résout un média via `useMedia(slot)`.

**`orders`** (012)
```
id uuid PK · ref text (default '') · nom · email · phone · items jsonb (default '[]')
total text · pickup_time · notes · status (default 'pending') · created_at
```
`items` = tableau d'`{ name, price, qty }`. `ref` généré côté client (`GL…`). `status` ∈ `pending` / `confirmed` / `cancelled`.

## Storage buckets

| Bucket | Usage | Créé par | Public read | Upload |
|---|---|---|---|---|
| `media` | Médias généraux (hero, logo, sections) | 011 | oui | owner, manager |
| `food-photos` | Photos de plats | 003 | oui | owner, manager |
| `team-portraits` | Portraits d'équipe | 003 | oui | owner, manager |
| `blog-images` | Images du blog | 003 | oui | owner, manager |

> ⚠️ La migration 011 **remplace** les policies du bucket `media` par des versions basées sur `is_admin()` (le 003 avait un bug de récursion). Les buckets `food-photos`/`team-portraits`/`blog-images` gardent les policies 003 mais le code utilise surtout `media` aujourd'hui. Les buckets doivent être créés en tant que superuser (Management API), pas via l'API anon.

## Migrations (à rejouer dans l'ordre)

Les fichiers sont dans `supabase/migrations/`, préfixés `NNN_`. Toutes sont **idempotentes** (`IF NOT EXISTS` / `ON CONFLICT`).

| # | Fichier | Ce qu'elle fait |
|---|---|---|
| 001 | `001_init.sql` | Crée `menu_items`, `messages`, `site_content`, `admin_users` + index |
| 002 | `002_rls.sql` | Active RLS + premières policies (menu, content, messages, admin_users) |
| 003 | `003_storage.sql` | Buckets `food-photos`, `team-portraits`, `blog-images` + policies storage |
| 004 | `004_seed.sql` | Seed du menu (38 items) + contenu `site_config` |
| 005 | `005_blog_rls.sql` | Table `blog_posts` + RLS + `messages.handled` UPDATE admin |
| 006 | `006_reservations.sql` | Table `reservations` + RLS (insert public, read/update admin) |
| 007 | `007_fix_rls_recursion.sql` | **Crucial** : fonction `is_admin()` SECURITY DEFINER + refonte des policies admin (corrige la récursion infinie) |
| 008 | `008_restrict_public_read.sql` | Retire les SELECT publics sur `messages`/`reservations` (données privées) |
| 009 | `009_enable_realtime.sql` | Active Realtime sur les tables |
| 010 | `010_fix_insert_authenticated.sql` | Corrige les policies d'insert pour les utilisateurs authentifiés |
| 011 | `011_media_management.sql` | Bucket `media` + table `media_assets` + policies via `is_admin()` |
| 012 | `012_orders.sql` | Table `orders` + RLS + Realtime sur orders |
| 013 | `013_fix_reservations_orders_rls.sql` | Remplace les policies admin de `reservations` et `orders` par des versions basées sur `is_admin()` (corrige la récursion RLS des migrations 006/012) |
| 014 | `014_rbac_roles.sql` | Élargit le RBAC : `editor` (blog) et `marketing` (médias) gagnent l'écriture sur `blog_posts` / `media_assets` + bucket `media`, en cohérence avec `MODULE_ACCESS` (rbac.ts) |

### Appliquer les migrations

En production, les migrations ont été appliquées via le SQL Editor Supabase ou l'API Management (MCP `apply_migration`). Pour une **nouvelle base** :

1. Exécutez les fichiers `001` → `012` dans l'ordre dans le *SQL Editor* Supabase.
2. Vérifiez que `is_admin()` existe (`\df public.is_admin`).
3. Recréez les utilisateurs dans *Authentication → Users*, puis insérez leurs rôles dans `admin_users`.
4. Configurez les **secrets** de l'Edge Function (`SMTP_USER`, `SMTP_PASS`) — voir [emails.md](./emails.md).

## Sécurité — Row Level Security (RLS)

**Principe** : RLS est activé sur **toutes** les tables. La clé anon est publique ; c'est RLS qui protège les données.

### La fonction `is_admin()` (migration 007)

```sql
CREATE OR REPLACE FUNCTION public.is_admin(role_filter text[])
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.email = auth.jwt() ->> 'email' AND au.role = ANY(role_filter)
  )
$$;
```

- `SECURITY DEFINER` → s'exécute avec les droits du propriétaire de la fonction, **en contournant RLS**.
- C'est ce qui évite la **récursion infinie** : sans elle, une policy sur `menu_items` qui vérifie `admin_users` déclencherait une vérification RLS sur `admin_users`, qui elle-même vérifie `admin_users`… boucle infinie.
- **Règle d'or** : toute policy admin doit utiliser `public.is_admin(ARRAY['owner','manager'])` — ne JAMAIS référencer `admin_users` directement dans une policy.

### Patterns de policies

- **Lecture publique** (`menu_items`, `site_content`, `media_assets`, blog *publié*) : `FOR SELECT TO anon, authenticated USING (true)`.
- **Insert public** (`messages`, `reservations`, `orders`) : `FOR INSERT TO anon WITH (true)` — et **PAS de SELECT public** (données privées du client). Voir migration 008.
- **Admin lecture/écriture** : `FOR SELECT/UPDATE/ALL TO authenticated USING (public.is_admin(ARRAY['owner','manager']))`.
- **Blog brouillons** : SELECT public limité à `published = true` ; SELECT admin via `is_admin`.

### Attention : insert + return=representation

supabase-js envoie `Prefer: return=representation` par défaut après un `.insert()`, ce qui déclenche un SELECT post-insert. C'est pourquoi certaines policies d'insert public existent — mais on ne doit **pas** ajouter de SELECT public sur `messages`/`reservations`/`orders`. Les sections utilisent `insert()` sans `.select()`, donc pas de SELECT déclenché (mode `return=minimal`).

## Realtime

Activé par les migrations 009 et 012. Tables dans la publication `supabase_realtime` : `menu_items`, `site_content`, `blog_posts`, `media_assets`, `orders` (+ `orders` ajoutée en 012).

Côté client :
- `SiteContext` ouvre un canal `public-site-realtime` qui rafraîchit les données de ces tables à chaque changement (admin → public en direct).
- `OrdersManager` ouvre son propre canal `orders-realtime` + polling 60 s de secours.

Pour ajouter une table au Realtime : `ALTER PUBLICATION supabase_realtime ADD TABLE public.<table>;` (dans une nouvelle migration), puis souscrivez dans `SiteContext` ou un canal dédié.

## Liens

- [admin-panel.md](./admin-panel.md) — comment l'admin lit/écrit ces tables
- [emails.md](./emails.md) — l'Edge Function
- [DEVELOPMENT.md](../DEVELOPMENT.md) — ajouter une migration / une fonction CRUD
