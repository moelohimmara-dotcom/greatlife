# 12 — Schéma de base de données

> **Nature** : document de conception (PLAN du Lot 1). **Aucune migration n'est appliquée à ce stade.**
> Soumis à revue indépendante (TDR §37) puis à validation avant exécution.
>
> - **Date** : 2026-09-18
> - **Projet Supabase** : `atsujzoozqnjelngqkab` (dédié Greatlife)
> - **Migrations existantes** : `001` → `020` (20 fichiers, 9 tables publiques)
> - **Références** : TDR §14, §16, §21, §22, §23, §29, §31 · `docs/04_CONTENT_MODEL.md`
>
> ⚠️ **Le plan de ce document a été appliqué, puis dépassé.** Il décrit l'état visé **avant** l'application de `021`. Les migrations `021` → `033` sont aujourd'hui appliquées en production, et trois d'entre elles changent ce qui est écrit plus bas :
>
> | Migration | Ce qu'elle change par rapport à ce document |
> |---|---|
> | `030` | Ajoute `pages.published_snapshot` (§2.1). Le public lit cet instantané, plus `page_sections` |
> | `031` | **Supprime** la policy `sections_public_read` (§3.2) : un visiteur anonyme ne lit plus la table de travail |
> | `033` | Ajoute la contrainte `pages_published_requires_snapshot` : une page publiée doit porter son instantané |
>
> Les passages concernés sont annotés ci-dessous. **La source de vérité du schéma réellement appliqué est `supabase/migrations/`** — ce document reste le plan.

---

## 1. Principes appliqués

| Principe | Traduction dans le schéma |
|---|---|
| TDR §29 — ne pas créer de table redondante | `site_content` est **réutilisée** comme magasin de réglages ; aucune table de réglages n'est créée |
| TDR §31 — ne jamais faire confiance au frontend | **Chaque nouvelle table reçoit ses policies RLS dès sa création** (décision du propriétaire : sécurité au Lot 1, pas rétrofitée au Lot 9) |
| TDR §29 — migration réversible | Chaque migration a son rollback écrit **avant** application, dans `supabase/rollbacks/` |
| TDR §16 — une source de vérité | Aucune copie de plat ni d'article : les sections **référencent** les modules |
| TDR §21 — statuts | `status` ∈ (`draft`, `published`, `archived`) sur les pages |
| TDR §20 — sous-menus | `navigation_items.parent_id` (auto-référence) |
| TDR §17 — médiathèque | Les médias sont **référencés** par `media_id`, jamais par convention de nom |

**Convention de nommage** : français pour les noms d'entités métier (`pages`, `navigation`, `avis` côté UI), anglais pour les colonnes techniques. Les colonnes bilingues portent le suffixe `_i18n` et contiennent un objet `{ "fr": …, "en": … }`.

---

## 2. Nouvelles tables

### 2.1 `pages`

```sql
CREATE TABLE IF NOT EXISTS public.pages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL DEFAULT '',          -- '' = page d'accueil
  title_i18n    jsonb NOT NULL DEFAULT '{}'::jsonb,
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','published','archived')),
  sort_order    integer NOT NULL DEFAULT 0,
  seo           jsonb NOT NULL DEFAULT '{}'::jsonb, -- title, description, image, canonical, noindex
  published_at  timestamptz,
  published_snapshot jsonb,                         -- ajouté par la migration 030 (voir note)
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    text
);

CREATE UNIQUE INDEX IF NOT EXISTS pages_slug_key ON public.pages (lower(slug));
```

**`published_snapshot` (migration `030`).** Le public ne lit **plus** `page_sections` : il lit cet instantané, écrit dans le **même** `UPDATE` que le statut (un seul aller-retour, donc aucun instant où la page serait publiée sans son contenu). C'est ce qui rend le TDR §22 vérifiable au lieu d'espéré : le brouillon ne peut plus fuiter parce qu'il n'est plus sur le chemin de lecture. La migration `033` garantit **en base** qu'une page `published` porte toujours son instantané.

**Un seul marqueur d'accueil.** La première version de ce document utilisait **deux** désignations concurrentes : une colonne `is_home` *et* la convention `slug = ''`. C'était deux sources de vérité pour la même information, pouvant diverger. La colonne `is_home` est supprimée : **`slug = ''` désigne l'accueil**, et l'index unique `lower(slug)` garantit qu'il n'en existe qu'une seule.

**Note** : `slug` est comparé en minuscules (leçon de la migration `020` : une divergence de casse a déjà failli verrouiller un accès).

### 2.2 `page_sections`

```sql
CREATE TABLE IF NOT EXISTS public.page_sections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  type        text NOT NULL,                       -- 'hero', 'menu', 'team'…
  variant     text,                                -- variante dans le type (TDR §13)
  position    integer NOT NULL DEFAULT 0,
  visible     boolean NOT NULL DEFAULT true,
  anchor      text,                                -- '#carte' — préserve les liens existants
  content     jsonb NOT NULL DEFAULT '{}'::jsonb,  -- champs bilingues { fr, en }
  settings    jsonb NOT NULL DEFAULT '{}'::jsonb,  -- responsive, réglages visuels
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_sections_page_position
  ON public.page_sections (page_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS page_sections_anchor_key
  ON public.page_sections (page_id, anchor) WHERE anchor IS NOT NULL;
```

### 2.3 `navigation` et `navigation_items`

```sql
CREATE TABLE IF NOT EXISTS public.navigation (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,     -- 'header' | 'footer'
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.navigation_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  navigation_id   uuid NOT NULL REFERENCES public.navigation(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES public.navigation_items(id) ON DELETE CASCADE,
  label_i18n      jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_type     text NOT NULL DEFAULT 'page'
                  CHECK (target_type IN ('page','anchor','url')),
  target_page_id  uuid REFERENCES public.pages(id) ON DELETE SET NULL,
  target_value    text,                  -- ancre ou URL externe
  position        integer NOT NULL DEFAULT 0,
  visible         boolean NOT NULL DEFAULT true,
  is_cta          boolean NOT NULL DEFAULT false,   -- bouton principal (TDR §20)
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS navigation_items_nav_position
  ON public.navigation_items (navigation_id, parent_id, position);
```

### 2.4 `page_versions` — **décision CM-3**

```sql
-- Créée vide au Lot 1 si CM-3 est validée ; alimentée au Lot 3 (TDR §23).
CREATE TABLE IF NOT EXISTS public.page_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- RESTRICT volontaire : une version est une archive. On ne laisse pas la
  -- suppression d'une page détruire son historique de restauration (TDR §23).
  page_id     uuid NOT NULL REFERENCES public.pages(id) ON DELETE RESTRICT,
  version     integer NOT NULL,
  snapshot    jsonb NOT NULL,            -- page + sections au moment de la publication
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text,
  UNIQUE (page_id, version)
);
```

**Conséquence assumée** : supprimer une page qui possède des versions est **refusé** par la base. La suppression d'une page passe par le statut `archived` (TDR §21) — pas par un `DELETE`. C'est le comportement souhaitable : une page archivée reste restaurable, une page supprimée ne l'est pas.

**Recommandation** : la créer au Lot 1. Le coût est nul (table vide), et cela évite une migration sur des données vivantes une fois le site en production. Le TDR §40 place *l'usage* du versioning au Lot 3, pas nécessairement sa structure.

---

## 3. RLS — policies créées dès la naissance

### 3.1 Modèle de permission retenu pour le Lot 1

**Deux difficultés doivent être arbitrées, pas décidées en passant.**

**a) Le jeu de rôles diverge.** Le TDR §27 définit cinq rôles (`Owner`, `Admin`, `Manager`, `Editor`, `Staff`) ; la base en contient six (`owner`, `manager`, `chef`, `editor`, `marketing`, `guest`), **figés dans les policies RLS existantes**.

**b) Le périmètre de `editor` diverge aussi.** La migration `014` établit une convention explicite :

- `blog_posts` en écriture → `owner`, `manager`, `editor`
- `media_assets` en écriture → `owner`, `manager`, `editor`, `marketing`
- **modules de configuration sensibles** (`site_content`, `admin_users`, `messages`, `reservations`, `orders`) → **`owner` / `manager` uniquement**

Or `pages` et `page_sections` **remplacent `site_content`**, qui est aujourd'hui réservé à `owner`/`manager`. Deux lectures s'opposent :

| Option | Conséquence |
|---|---|
| **(a) Aligner sur l'existant** — `pages`/`page_sections` en `owner`/`manager` | Cohérent avec `014` et avec le caractère « configuration sensible » du contenu du site. **N'élargit aucun droit.** L'`editor` reste sur le blog et les médias |
| **(b) Aligner sur le TDR §27** — ajouter `editor` (« Editor : contenu + médias ») | Conforme à la cible, mais **élargit délibérément** les droits par rapport à aujourd'hui, sur la donnée la plus sensible du site |

**Recommandation pour le Lot 1 : option (a).** Le SQL ci-dessous l'applique. Le Lot 1 ne doit pas élargir de droits : la refonte du jeu de rôles (D4, Lot 9) toucherait les 24 policies existantes et mérite sa propre décision. Passage à l'option (b) = un seul `ALTER POLICY`, une fois D4 tranchée.

**Rejeté** : décider « les rôles existants » sans préciser lesquels — c'est ce que faisait la première version de ce document, et cela revenait à élargir les droits de `editor` sans le dire.

### 3.2 Policies

```sql
-- ---------- pages ----------
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Le public ne voit QUE le publié (TDR §22)
DROP POLICY IF EXISTS "pages_public_read" ON public.pages;
CREATE POLICY "pages_public_read" ON public.pages
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- Les admins voient tout (brouillons inclus)
DROP POLICY IF EXISTS "pages_admin_read" ON public.pages;
CREATE POLICY "pages_admin_read" ON public.pages
  FOR SELECT TO authenticated
  USING (public.is_admin(ARRAY['owner','manager']));

DROP POLICY IF EXISTS "pages_admin_write" ON public.pages;
CREATE POLICY "pages_admin_write" ON public.pages
  FOR ALL TO authenticated
  USING (public.is_admin(ARRAY['owner','manager']))
  WITH CHECK (public.is_admin(ARRAY['owner','manager']));

-- ---------- page_sections ----------
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;

-- ⚠️ SUPPRIMÉE par la migration 031 — NE PAS RECRÉER.
-- Cette policy exposait la TABLE DE TRAVAIL au public : une section modifiée
-- mais non publiée devenait immédiatement visible. Le public lit désormais
-- `pages.published_snapshot` (030). La recréer rouvrirait la fuite du TDR §22.
-- Vérifié en base : `sections_public_read` n'apparaît plus dans `pg_policies`.
DROP POLICY IF EXISTS "sections_public_read" ON public.page_sections;
CREATE POLICY "sections_public_read" ON public.page_sections
  FOR SELECT TO anon, authenticated
  USING (
    visible = true
    AND EXISTS (SELECT 1 FROM public.pages p
                WHERE p.id = page_id AND p.status = 'published')
  );

DROP POLICY IF EXISTS "sections_admin_write" ON public.page_sections;
CREATE POLICY "sections_admin_write" ON public.page_sections
  FOR ALL TO authenticated
  USING (public.is_admin(ARRAY['owner','manager']))
  WITH CHECK (public.is_admin(ARRAY['owner','manager']));

-- ---------- navigation ----------
ALTER TABLE public.navigation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "navigation_public_read" ON public.navigation;
CREATE POLICY "navigation_public_read" ON public.navigation
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "navigation_admin_write" ON public.navigation;
CREATE POLICY "navigation_admin_write" ON public.navigation
  FOR ALL TO authenticated
  USING (public.is_admin(ARRAY['owner','manager']))
  WITH CHECK (public.is_admin(ARRAY['owner','manager']));

-- ---------- navigation_items ----------
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nav_items_public_read" ON public.navigation_items;
CREATE POLICY "nav_items_public_read" ON public.navigation_items
  FOR SELECT TO anon, authenticated
  USING (
    visible = true
    -- Un item n'est public que si son parent l'est aussi : sinon un libellé
    -- de sous-menu reste visible alors que son parent est masqué.
    AND (parent_id IS NULL OR EXISTS (
      SELECT 1 FROM public.navigation_items parent
      WHERE parent.id = parent_id AND parent.visible = true
    ))
    -- Une cible de type « page » ne doit apparaître que si cette page est publiée,
    -- sinon la navigation publique contient un lien mort vers un brouillon.
    AND (
      target_type <> 'page'
      OR target_page_id IS NULL
      OR EXISTS (SELECT 1 FROM public.pages p
                 WHERE p.id = target_page_id AND p.status = 'published')
    )
  );

DROP POLICY IF EXISTS "nav_items_admin_write" ON public.navigation_items;
CREATE POLICY "nav_items_admin_write" ON public.navigation_items
  FOR ALL TO authenticated
  USING (public.is_admin(ARRAY['owner','manager']))
  WITH CHECK (public.is_admin(ARRAY['owner','manager']));

-- ---------- page_versions ----------
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "versions_admin_read" ON public.page_versions;
CREATE POLICY "versions_admin_read" ON public.page_versions
  FOR SELECT TO authenticated
  USING (public.is_admin(ARRAY['owner','manager']));

-- Une version est une archive : on l'insère, on ne la modifie pas.
-- `FOR ALL` était une erreur : il autorisait la modification et la suppression de
-- l'historique, à rebours de la convention d'`audit_log` (migration 017 :
-- SELECT + INSERT seulement).
DROP POLICY IF EXISTS "versions_admin_read" ON public.page_versions;
CREATE POLICY "versions_admin_read" ON public.page_versions
  FOR SELECT TO authenticated
  USING (public.is_admin(ARRAY['owner','manager']));

DROP POLICY IF EXISTS "versions_admin_insert" ON public.page_versions;
CREATE POLICY "versions_admin_insert" ON public.page_versions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(ARRAY['owner','manager']));

-- Seul le propriétaire peut purger une version.
DROP POLICY IF EXISTS "versions_owner_delete" ON public.page_versions;
CREATE POLICY "versions_owner_delete" ON public.page_versions
  FOR DELETE TO authenticated
  USING (public.is_admin(ARRAY['owner']));

-- Aucune policy UPDATE : l'historique est immuable.
```

**Points de vigilance vérifiés dans ce schéma** (tirés des erreurs passées du projet) :

1. `WITH CHECK` est bien présent sur les écritures — la migration `002/003/006` avait cette faute (`WITH (true)`), corrigée depuis.
2. `is_admin()` exige déjà `active = true` (migration `019`) : un compte suspendu n'écrit rien.
3. La comparaison d'email est insensible à la casse (migration `020`).
4. La lecture publique des sections dépend du statut de la page **en base**, pas d'un filtre côté client.
5. **Toutes les écritures sont refusées par défaut** : aucune nouvelle table n'a de policy d'écriture permissive — toutes passent par `is_admin(…)`.
6. **Une exception de lecture volontaire** : `navigation_public_read` utilise `USING (true)`, car cette table ne contient que deux lignes (`header`, `footer`) sans donnée sensible. La première version de ce document affirmait « aucune policy permissive » — c'était inexact. La table est publique par nature ; ses **items** sont, eux, filtrés (§3.2).
7. **L'historique est immuable** : aucune policy `UPDATE` sur `page_versions`.
8. **La suppression de page ne détruit pas l'historique** (`ON DELETE RESTRICT` sur `page_versions`), et la navigation publique ne peut pas pointer vers un brouillon.

---

## 4. `site_content` : ajouter des lignes, **ne pas restructurer**

⚠️ **Correction majeure.** La première version de ce document proposait de **restructurer** la ligne `site_config`. Cette approche **détruisait des données silencieusement**, et la vérification est sans ambiguïté :

> `saveSiteConfig()` écrit **l'intégralité du champ `value`** en un seul `upsert` (`repository.ts:170-183`), à partir d'un objet reconstruit côté client : `{ content, themeId, fontId, visibility, rbacOverrides }` (`repository.ts:12-18`).
>
> Tout clic sur « Enregistrer » dans les modules **Thème**, **Visibilité** ou **Utilisateurs & rôles** réécrit donc la ligne entière, **effaçant sans erreur ni trace** toute clé inconnue du client. Une restructuration aurait été anéantie à la première édition — reproduisant exactement le risque **R2** de l'audit.

### Ce qui est fait à la place

| Objet | Traitement |
|---|---|
| Ligne `site_config` historique | **Strictement inchangée** : `content`, `themeId`, `fontId`, `visibility`, `rbacOverrides` restent en place et continuent d'alimenter le site actuel |
| `rbacOverrides` | **Préservé** — il vit dans cette même ligne, donc exposé au même risque d'écrasement |
| `restaurant` (nouvelles lignes) | **Nouvelle ligne** `site_content` : adresse, horaires, téléphone, emails, réseaux, devise, nom |
| `email_templates` | **Nouvelle ligne** : reprise de `autoReply` |
| `theme_v2` | **Nouvelle ligne** : réglages du Theme Engine (Lot 4) |

Les nouvelles clés étant des **lignes distinctes**, elles sont hors de portée de l'`upsert` global décrit ci-dessus.

**Aucune suppression, aucun renommage.** L'ancien `content` reste lisible jusqu'à la neutralisation de l'ancien admin (décision **CM-12**). Deux sources de vérité coexistent **temporairement** — c'est un compromis explicite, avec une date de sortie : le basculement du renderer.

---

## 5. Ordre d'exécution proposé

| # | Fichier | Objet | Réversible par |
|---|---|---|---|
| 1 | `021_cms_pages_sections.sql` | `pages`, `page_sections` + RLS + trigger `updated_at` | `021_rollback.sql` |
| 2 | `022_cms_navigation.sql` | `navigation`, `navigation_items` + RLS | `022_rollback.sql` |
| 3 | `023_cms_page_versions.sql` | `page_versions` + RLS *(si CM-3/DB-1 validées)* | `023_rollback.sql` |
| 4 | `024_settings_rows.sql` | **Ajout de nouvelles lignes** `restaurant`, `email_templates` (et `theme_v2` au Lot 4). **Aucune modification de la ligne historique** | `024_rollback.sql` |
| 5 | `025_migrate_home_content.sql` | **Migration de contenu** : page « Accueil », sections **dans l'ordre extrait du JSX**, navigation, réglages `restaurant` | `025_rollback.sql` |

**Séparation volontaire** entre la **structure** (021-023), l'**ajout de réglages** (024) et la **migration de contenu** (025) : si la migration de contenu révèle un problème, elle se rejoue sans toucher au schéma.

**Les fichiers de rollback n'existent pas encore.** `supabase/rollbacks/` ne contient aujourd'hui que `019` et `020`. Les rollbacks `021` à `025` doivent être **écrits avant** l'application de leur migration — c'est la règle appliquée lors du Lot 0.5, et elle vaut ici.

### Correction sur l'idempotence

La première version affirmait que **toutes** les migrations seraient idempotentes. C'est vrai pour 021-024 (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`) — mais **faux pour 025** : rejouée, elle violerait `pages_slug_key` (slug `''` déjà présent) et l'index unique d'ancre.

**025 doit donc être écrite avec des gardes explicites** : vérifier l'absence de la page d'accueil avant de la créer, et utiliser `ON CONFLICT DO NOTHING` sur les sections et la navigation. Elle doit pouvoir être exécutée deux fois sans erreur ni doublon.

---

## 6. Contraintes et risques identifiés

| Risque | Traitement |
|---|---|
| **Écrasement de `site_config` par l'admin existant** | **Le risque n°1 du Lot 1.** La ligne historique n'est **ni restructurée ni modifiée** ; les nouveaux réglages vivent dans des lignes séparées (§4) |
| **Perte des `rbacOverrides`** | Ils vivent dans la ligne `site_config` : à sauvegarder avant toute opération, et à ne jamais réécrire depuis un client incomplet |
| **Rôle non tranché (D4)** | Le Lot 1 utilise `owner`/`manager` (§3.1) et **n'élargit aucun droit** ; un `ALTER POLICY` suffira après arbitrage |
| **`updated_at` menteur** | Sans trigger, « Modifié le » affichera la date de création à vie. Un trigger `set_updated_at` est prévu dans `021` |
| **Suppression d'une page** | `page_sections` en `CASCADE` (pas de section orpheline) ; `page_versions` en **`RESTRICT`** (l'historique ne doit pas disparaître). Une page se **archive**, ne se supprime pas |
| **Références média mortes** | Les sections référencent des `media_id` (CM-10) : le comportement en cas de média supprimé doit être défini — sinon une section casse silencieusement |
| **Type de section inconnu** | Repli sûr obligatoire côté renderer (pas de page blanche) |
| **Page sans section / URL sans page publiée** | Comportement à définir (page vide vs 404). Le projet n'a **aucune page 404** aujourd'hui (audit §13) |
| **Ordre des sections** | `position` entier, sans contrainte d'unicité. Le glisser-déposer (Lot 2) devra gérer la renumérotation — à spécifier pour éviter les trous et les doublons |
| **Édition concurrente** | Deux personnes éditant la même page : le dernier écrit gagne, **sans avertissement** (risque R18 de l'audit). Ce plan ne le traite pas — à décider |
| **Slug vide et unicité** | `''` désigne l'accueil ; l'index unique `lower(slug)` en garantit l'unicité |
| **Ancres dupliquées** | Index unique `(page_id, anchor)` — évite deux sections revendiquant `#carte` |
| **Traductions manquantes** | Repli sur `fr` dans le renderer, jamais en base |
| **Performance publique** | 2 requêtes (page + sections) au lieu d'un blob unique : index `(page_id, position)` en place, volume négligeable |

---

## 7. Ce que ce schéma ne fait pas

- Il ne crée **aucune** table de menu, de blog, de thème ou de médiathèque : ces modules existent déjà et seront enrichis dans leurs lots respectifs (6, 7, 4).
- Il ne modifie **aucun** rôle ni aucune policy existante.
- Il ne **supprime** rien.
- Il n'implémente pas le workflow de publication (Lot 3) : seul le champ `status` est posé, ce qui suffit au renderer public dès le Lot 1.

---

## 8. Décisions soumises à validation

| Réf | Décision | Recommandation |
|---|---|---|
| **DB-1** | Créer `page_versions` au Lot 1 (vide) ou au Lot 3 | **Au Lot 1** — coût nul, évite une migration sur données vivantes |
| **DB-2** | Périmètre de rôle sur les nouvelles tables : `owner`/`manager` (existant) ou ajout d'`editor` (TDR §27) | ✅ **ARBITRÉ : `owner`/`manager`** (2026-09-18) — aucun droit élargi ; l'ajout d'`editor` reste possible par un simple `ALTER POLICY` après arbitrage D4 |
| **DB-3** | Découpage en 5 migrations séparées (structure / réglages / contenu) | **Oui** — permet de rejouer la migration de contenu seule |
| **DB-4** | Conservation intégrale de la ligne `site_config` historique (et de `rbacOverrides`) | **Oui** — aucune destruction, bascule réversible |
| **DB-5** | `slug` comparé en minuscules | **Oui** — leçon de la migration 020 |
| **DB-6** | Trigger `set_updated_at` sur les nouvelles tables | **Oui** — sinon « Modifié le » mentira |
| **DB-7** | Références média (`media_id`) et comportement si le média est supprimé | **Référence par identifiant** + blocage de la suppression d'un média utilisé, ou place-holder explicite |
| **DB-8** | **Édition concurrente** : que se passe-t-il si deux personnes éditent la même page ? | **À trancher** — aujourd'hui le dernier écrit gagne, sans avertissement (risque R18 de l'audit) |
| **DB-9** | Comportement si l'URL ne correspond à aucune page publiée | **À trancher** — le projet n'a aucune page 404 ; au minimum une page d'erreur soignée |
| **DB-10** | Contrainte sur `page_sections.type` : `CHECK` en base ou validation par le registre applicatif ? | **Validation applicative** — le catalogue (TDR §12 + ajouts) évoluera ; un `CHECK` imposerait une migration à chaque nouveau type |
