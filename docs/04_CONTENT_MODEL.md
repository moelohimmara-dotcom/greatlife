# 04 — Modèle de contenu

> **Nature** : document de conception (PLAN du Lot 1). **Aucun code n'est écrit à ce stade.**
> Il est soumis à revue indépendante (TDR §37) puis à validation du propriétaire avant implémentation.
>
> - **Date** : 2026-09-18
> - **Références** : TDR §2 (langage), §3 (UX), §4 (pas de contenu en dur), §7 (architecture cible), §12 (catalogue de sections), §13 (variantes), §14 (Contenu / Présentation / Structure), §15 (plats), §16 (source de vérité), §17 (médiathèque), §21 (pages), §22 (brouillon/publication), §26 (SEO), §29 (base de données)
> - **Décisions déjà arbitrées** : migration automatique du contenu actuel vers une page « Accueil » · **un seul restaurant** · **bilingue fr/en dès la conception**

---

## 1. Objectif

Remplacer le contenu éditorial aujourd'hui enfermé dans **une seule ligne JSONB** (`site_content`) par un modèle **structuré, adressable et bilingue**, capable de porter : des pages, des sections ordonnées et typées, la navigation, les réglages globaux et le SEO.

Le modèle doit permettre au restaurateur de dire *« je déplace le bloc Galerie après les Avis »* sans jamais voir les mots schema, props, JSON ou migration (TDR §2).

---

## 2. Vocabulaire imposé (TDR §2)

| Terme visible par l'utilisateur | Ce qu'il désigne techniquement |
|---|---|
| **Page** | Une page du site, avec une adresse (`/`, `/galerie`) et un statut |
| **Section** | Un bloc de contenu dans une page (Hero, Menu, Avis…), déplaçable |
| **Variante** | Une mise en forme prédéfinie d'une section (Hero : plein écran / image+texte / centré) |
| **Contenu** | Ce qui est *dit* — modifiable |
| **Apparence** | Comment c'est *affiché* — réglages globaux (thème, polices) |
| **Réglages du restaurant** | Informations transverses (adresse, horaires, téléphone…) |
| **Média** | Un fichier de la médiathèque, sélectionnable depuis plusieurs endroits |
| **Publier** | Rendre visible au public |

**Termes interdits à l'écran** : component, props, schema, collection, API, JSON, CSS, database, migration, deployment.

---

## 3. Hiérarchie du contenu

Conformément à la séparation stricte du TDR §14 :

```
STRUCTURE   Page  ────────────►  ordre des Sections, visibilité, statut
                                    │
PRÉSENTATION  Section ─────────►  type + variante + réglages visuels/responsive
                                    │
CONTENU        Contenu  ───────►  les textes, images et références de la Section
```

Exemple canonique du TDR §14, transposé :

```
Plat  ──►  données du plat          (module Menu, table menu_items)

Section Menu  ──►  présentation     (page_sections.type = 'menu')
Page Accueil  ──►  emplacement      (page_sections.position)
```

**Règle structurante** : un plat est stocké **une seule fois** (TDR §16). La section Menu ne recopie aucun plat : elle **référence** le module Menu.

---

## 4. Le contenu actuel — inventaire exact (vérifié en base)

Avant de concevoir, voici ce qui existe réellement dans `public.site_content` (une seule ligne, clé `site_config`) :

### 4.1 Contenu éditorial — 16 valeurs simples + 3 listes

| Champ actuel | Type | Valeur actuelle |
|---|---|---|
| `restaurantName` | texte | `Greatlife` |
| `slogan` | texte | `Manger vite. Manger bio. Manger gourmand.` |
| `heroTitle` | texte | `Le fast-food sans culpabilité.` |
| `heroSub` | texte | `Produits bio, emballages écologiques, cuisson saine…` |
| `storyTitle` | texte | `Notre histoire` |
| `story` | texte | `Greatlife est né d'une frustration simple…` |
| `address` | texte | `Conakry, Guinée` |
| `hours` | texte | `Tous les jours · 11h00 — 23h00` |
| `phone` | texte | `+224 000 00 00 00` |
| `emailContact` | texte | `contact@greatlife.gn` |
| `emailReservation` | texte | `resa@greatlife.gn` |
| `currency` | texte | `FG` |
| `autoReply` | texte | `Bonjour {nom}, merci pour votre message…` |
| `socialFacebook` / `socialInstagram` / `socialWhatsapp` | texte | *vides* |
| `engagements` | liste de **6** | `{ icon, title, desc }` |
| `team` | liste de **4** | `{ name, role, desc }` |
| `testimonials` | liste de **0** | *(la section existe, sans contenu)* |

### 4.2 Réglages globaux et données voisines

**Toutes ces clés vivent dans la MÊME ligne `site_config` que le contenu éditorial** — elles ne sont pas séparées en base :

| Clé | Contenu |
|---|---|
| `themeId` | `nature` |
| `fontId` | `jakarta` |
| `visibility` | `{ badges, suggestions, vertusPanel, testimonials, sections{9} }` |
| `sectionOrder` | Liste d'identifiants de sections — voir l'avertissement ci-dessous |
| **`rbacOverrides`** | **Overrides de la matrice de permissions** (`SiteConfig.rbacOverrides`, `repository.ts:12-18`). Présent dans la même ligne, donc exposé aux mêmes risques que le reste |

⚠️ **Correction importante par rapport à la première version de ce document.**

Une version antérieure affirmait que `visibility.sectionOrder` constituait déjà « une liste ordonnée de sections » et que la migration ne ferait que formaliser une structure latente. **C'est faux, et vérifié comme tel** :

- `sectionOrder` **n'est lu nulle part dans le code** (aucune occurrence dans `src/`). La donnée existe en base, mais elle est **morte** — vestige d'une version antérieure.
- L'ordre réel des sections est **codé en dur dans le JSX** : `PublicSite.tsx:17-32` monte les sections dans un ordre fixe.
- `visibility.sections` ne compte que **8 clés réellement lues** (`home`, `carte`, `histoire`, `engagements`, `equipe`, `localisation`, `contact`, `blog`). Le `reservation` présent en base **n'est jamais consulté**.
- **Quatre composants sont rendus inconditionnellement** : `PublicNav`, `Reservation`, `Footer`, `OrderCart` (`PublicSite.tsx:21,29,31,32`). Ils ne peuvent aujourd'hui **pas** être masqués par l'administrateur.

**Conséquence pour la migration** : l'ordre des sections **doit être extrait du code**, pas lu en base. Et le sort des quatre composants inconditionnels doit être tranché explicitement (décision **CM-8**) — sans quoi une section « Formulaire de réservation » pourrait disparaître de l'accueil après basculement.

---

## 5. Entités du modèle cible

### 5.1 `Page`

| Champ | Rôle | Visible dans l'UI sous le nom |
|---|---|---|
| `id` | identifiant | — |
| `slug` | adresse (`''` = accueil) | **Adresse** |
| `title_i18n` | titre de la page | **Nom** |
| `status` | `draft` \| `published` \| `archived` | **Statut** |
| `is_home` | page d'accueil (une seule) | — |
| `sort_order` | ordre dans la navigation | **Ordre** |
| `seo` | titre SEO, description, image sociale, indexation, canonical | **Référencement** |
| `published_at` | date de publication | **Publié le** |
| `created_at` / `updated_at` | suivi | **Modifié le** |

### 5.2 `Section` (appartient à une page)

| Champ | Rôle | Nom UI |
|---|---|---|
| `id` | identifiant | — |
| `page_id` | page parente | — |
| `type` | type de section (voir §6) | **Type de bloc** |
| `variant` | variante (TDR §13) | **Mise en forme** |
| `position` | ordre dans la page | **Ordre** (glisser-déposer, Lot 2) |
| `visible` | affichée ou masquée | **Visibilité** |
| `content` | contenus, **bilingues** | (champs du bloc) |
| `settings` | réglages responsive et visuels | **Réglages avancés** |
| `anchor` | ancre (`#carte`) | **Lien direct** |

### 5.3 `Navigation` et ses `items`

Header et footer sont **globaux** (TDR §19) : une modification se répercute sur toutes les pages. Chaque item : libellé bilingue, cible (page, ancre ou URL externe), ordre, visibilité, sous-items, et marqueur CTA (TDR §20).

### 5.4 Réglages du restaurant

Les informations transverses — `address`, `hours`, `phone`, `emailContact`, `emailReservation`, `currency`, `social*`, `restaurantName`, `slogan` — **ne sont pas du contenu de page** : elles s'affichent dans plusieurs endroits (header, footer, contact, localisation). Elles constituent **une source de vérité unique** consommée par plusieurs sections, exactement comme un plat l'est par plusieurs pages (TDR §16).

### 5.5 Ce qui n'est **pas** du contenu de page

Le Menu, le Blog, les Commandes, les Réservations et les Messages restent des **modules autonomes** (TDR §7 : *Restaurant*). Les sections les **affichent par référence** — elles n'en détiennent aucune copie.

---

## 6. Catalogue des types de sections

Le TDR §12 fixe un catalogue de **18 types**. Deux types supplémentaires sont nécessaires pour couvrir le contenu existant — ils **sortent du catalogue du TDR** et doivent donc être ajoutés explicitement (décision **CM-4**) :

| Type | Origine | Pourquoi |
|---|---|---|
| `engagements` | **Ajout au TDR** | 6 engagements existent déjà en base ; sans ce type, la migration les perd |
| `rich_text` | **Ajout au TDR** | Contenu libre, utile au Page Builder (Lot 2) |

Chacun possède **un schéma de contenu typé** côté TypeScript, ce qui permet à l'éditeur (Lot 2) de générer automatiquement le bon formulaire.

| Type | Contenu attendu | Variantes (TDR §13) | Composant public existant |
|---|---|---|---|
| `hero` | titre, sous-titre, accroche, 2 boutons, image, pastilles | plein écran · image+texte · centré · vidéo | `Hero.tsx` |
| `text` | titre, corps (texte riche) | 1 colonne · 2 colonnes | — (nouveau) |
| `image_text` | image, titre, corps, position de l'image | image à gauche · à droite | `Story.tsx` (proche) |
| `menu` | titre, sous-titre, catégories affichées, nombre max | complet · vedettes · onglets | `Carte.tsx` |
| `menu_featured` | titre, sélection de plats | grille · carrousel | — (nouveau) |
| `gallery` | titre, médias (références), colonnes | grille · mosaïque · carrousel | — (nouveau) |
| `testimonials` | titre, avis (nom, texte, note, photo) | cartes · citations | `Testimonials.tsx` |
| `team` | titre, membres (nom, rôle, texte, portrait référencé) | grille · liste | `Team.tsx` |
| `story` | titre, corps, portrait, signature | — | `Story.tsx` |
| `engagements` **(hors TDR)** | titre, liste d'engagements (`icon`, `title`, `desc`) | grille · liste | `Engagements.tsx` |
| `location` | titre, adresse, horaires (TDR : « Localisation ») | encart · pleine largeur | `Localisation.tsx` |
| `map` | coordonnées, zoom (TDR : « Carte ») | — | *(aujourd'hui SVG décoratif)* |
| `reservation` | titre, texte d'accroche, activation | encart · pleine largeur | `Reservation.tsx` |
| `contact` | titre, texte, sujets proposés | — | `Contact.tsx` |
| `blog` | titre, nombre d'articles, catégories | grille · liste | `Blog.tsx` |
| `faq` | titre, questions/réponses | accordéon · liste | — (nouveau) |
| `cta` | titre, texte, bouton | bandeau · encart | — (nouveau) |
| `video` | titre, URL ou média | — | — (nouveau) |
| `spacer` | hauteur | petit · moyen · grand | — (nouveau) |
| `rich_text` **(hors TDR)** | contenu libre | — | — (nouveau) |

**Comportement imposé pour un type inconnu** : le renderer affiche un **repli sûr** (section ignorée ou message discret en mode administration), jamais une page blanche ni une erreur. Cela protège le site public si une section est créée avec un type que le registre ne connaît pas encore.

**Sections consommant les réglages du restaurant** : `location`, `contact`, `reservation`, et le header/footer. Elles ne stockent pas ces valeurs.

**Sections consommant un module** : `menu`, `menu_featured` (module Menu), `blog` (module Blog).

---

## 7. Gestion des langues (fr / en) — **décision soumise à validation**

C'est la décision la plus structurante du modèle. Trois approches sont possibles.

### Option A — Objet de traduction par champ *(recommandée)*

```json
{ "title": { "fr": "Notre histoire", "en": "Our story" },
  "body":  { "fr": "Greatlife est né…", "en": "Greatlife was born…" } }
```

- ✅ Une seule ligne par section : aucune duplication de structure, aucune dérive entre langues.
- ✅ Repli trivial : champ `en` absent → on sert le `fr`.
- ✅ L'éditeur affiche les deux langues côte à côte dans un même formulaire (TDR §3.4).
- ⚠️ Non indexable directement par langue : une recherche plein texte par locale nécessiterait une vue dédiée (acceptable à cette échelle).

### Option B — Une ligne par langue

`page_sections` porterait une colonne `locale`, avec une ligne par langue et par section.

- ✅ Requêtable et indexable par langue.
- ❌ **Duplication de la structure** : ajouter une section ou la déplacer doit être fait deux fois. Risque élevé de divergence (une section présente en `fr` et absente en `en`). Contraire à l'esprit du TDR §3.7 (une source de vérité).

### Option C — Table de traductions séparée

Une table `translations(entity, entity_id, field, locale, value)`.

- ✅ Modèle normalisé, interrogeable finement.
- ❌ Explose le nombre de lignes (chaque champ × chaque section × chaque langue), complique fortement l'éditeur et le renderer. Disproportionné pour un site de restaurant à deux langues.

### Recommandation

**Option A**, appliquée de façon **uniforme** à tout le contenu éditorial :
- les sections (`page_sections.content`),
- les pages (`pages.title_i18n`, `pages.seo`),
- la navigation (`navigation_items.label`),
- et, dans leurs lots respectifs, le menu (`menu_items`) et le blog (`blog_posts`).

**Langue de repli** : `fr`. Si une traduction manque, le `fr` est servi — jamais de trou d'affichage.

**Conséquence honnête** : le menu et le blog sont aujourd'hui **monolingues** (`name`, `description`, `title`, `body`…). Les convertir au schéma bilingue relève des **Lots 6 et 7**, pas du Lot 1. Le Lot 1 se limite aux nouvelles tables et au renderer. Je le signale pour que la dette soit visible et planifiée, non oubliée.

### Angles morts du bilingue — à trancher avant le Lot 1

L'option A règle le **stockage** des traductions, mais pas les trois questions suivantes, qui conditionnent la livraison :

| Question | Enjeu | Décision |
|---|---|---|
| **D'où vient la langue active ?** | Le site est une SPA : sans mécanisme explicite, `locale` n'a aucune source. Options : préfixe d'URL (`/en/…`), paramètre, cookie, ou détection navigateur | **CM-6** |
| **Le slug est-il traduit ?** | Un slug unique (`pages_slug_key`) empêche `/notre-histoire` et `/our-story` de coexister. Un SEUL slug bilingue n'est donc pas possible avec ce schéma | **CM-6** |
| **Comment le SEO bilingue est-il servi ?** | Le TDR §26 exige titre/description/canonical **par page** avec balises `hreflang`. Or le site est **rendu côté client** : les robots voient un HTML quasi vide. Aucun lot du TDR ne traite ce point | **CM-7** |

**Point dur à assumer** : le SEO par page (TDR §26) **n'est pas livrable** avec un rendu 100 % client. Il faudra choisir — rendu statique à la publication, pré-rendu, ou rendu côté plateforme (Cloudflare Pages + Workers). Cette décision n'appartient pas au Lot 1, mais **elle conditionne l'utilité de `pages.seo`** : sans elle, on stockera des métadonnées que personne ne lira.

Le champ `seo` est donc conçu **dès maintenant** avec la convention bilingue (`title_i18n`, `description_i18n`) pour ne pas avoir à le migrer, mais son exploitation est reportée.

---

## 8. Réglages globaux : **ne pas restructurer la ligne historique**

Le TDR §29 demande de **ne pas créer de table redondante**. `site_content` est déjà la bonne structure pour des réglages : une table clé/valeur JSONB.

⚠️ **Correction majeure par rapport à la première version de ce document.**

Cette première version proposait de **restructurer** la clé `site_config` : renommer ses sous-clés, en extraire `content`, `themeId`, `fontId`, `visibility` en clés séparées. **Cette approche provoquait une perte de données silencieuse**, et il faut le dire clairement :

> `saveSiteConfig()` écrit **la totalité de l'objet** `value` d'un seul coup (`repository.ts:170-183`) :
> ```
> upsert({ key: 'site_config', value: config }, { onConflict: 'key' })
> ```
> où `config` est reconstruit côté client à partir de `{ content, themeId, fontId, visibility, rbacOverrides }` (`repository.ts:12-18`).
>
> **Conséquence** : le moindre clic sur « Enregistrer » dans les modules Thème, Visibilité ou Utilisateurs & rôles **réécrit la ligne entière** — effaçant sans erreur ni trace toute clé que l'ancien client ne connaît pas. Une restructuration au Lot 1 aurait donc été détruite à la première édition admin. C'est exactement le mode de défaillance **R2** de l'audit (perte de contenu irréversible), reproduit par la migration censée le corriger.

### Ligne historique : gelée, non modifiée

`site_config` **reste strictement tel quel** : `content`, `themeId`, `fontId`, `visibility`, `rbacOverrides`. Aucune clé renommée, aucune clé supprimée. La clé `content` continue d'alimenter le site actuel jusqu'au basculement.

Cela préserve notamment **`rbacOverrides`**, qui vit dans cette même ligne : toute manipulation maladroite effacerait la matrice de permissions personnalisée.

### Nouvelles clés : des lignes séparées

Les réglages du modèle cible sont ajoutés comme **nouvelles lignes** de `site_content` — donc hors de portée de l'écrasement décrit ci-dessus :

| Nouvelle clé | Contenu |
|---|---|
| `restaurant` | adresse, horaires, téléphone, emails, réseaux sociaux, devise, nom |
| `email_templates` | gabarits de messages (reprise de `autoReply`) |
| `theme_v2` | réglages visuels du Theme Engine (Lot 4) |

**Période de transition assumée** : `content` (ancien) et les nouvelles clés coexistent jusqu'à ce que l'ancien admin soit neutralisé. **Deux sources de vérité temporaires** — c'est un compromis explicite, pas un oubli, et il se referme au basculement (§11, CM-12).

---

## 9. Plan de migration du contenu actuel

### 9.1 Principe

La migration est **automatique** (décision du propriétaire) : un script lit le blob actuel, crée la page « Accueil » et ses sections, et convertit chaque valeur en objet bilingue avec `fr` = valeur actuelle, `en` = vide (à traduire plus tard, sans trou d'affichage grâce au repli).

**Aucune donnée n'est supprimée** : l'ancien blob est conservé intact dans `site_content` sous une clé d'archive, jusqu'à validation du basculement.

### 9.2 Correspondance champ → destination

| Champ actuel | Destination cible |
|---|---|
| `heroTitle`, `heroSub`, `slogan` | Section `hero` (titre, sous-titre, accroche) |
| — *(codé en dur)* | Section `hero` : pastille prix + 3 pastilles d'arguments → **à rendre éditables** (TDR §4) |
| `storyTitle`, `story` | Section `story` (titre, corps) |
| — *(codé en dur)* | Section `story` : nom du fondateur → **à rendre éditable** |
| `engagements[6]` | Section `engagements` — **type à ajouter au catalogue** (`engagements`) |
| `team[4]` | Section `team` (membres) + portraits via la médiathèque |
| `testimonials[0]` | Section `testimonials` (vide, section masquée tant que non remplie) |
| `address`, `hours`, `phone` | Réglages `restaurant` → consommés par les sections `location` et `contact` |
| `emailContact`, `emailReservation` | Réglages `restaurant` |
| `currency` | Réglages `restaurant` |
| `autoReply` | Réglages `email_templates` |
| `social*` | Réglages `restaurant` |
| `restaurantName` | Réglages `restaurant` (aujourd'hui **non utilisé** — sera branché sur le header) |
| `visibility.sections` | **Reste** la visibilité de l'ancien site pendant la transition (voir §8). Ce **n'est pas** la liste des sections |
| `visibility.sectionOrder` | **Donnée morte**, jamais lue par le code. L'ordre réel est dans le JSX (`PublicSite.tsx:17-32`) et **doit en être extrait** |
| `rbacOverrides` | **Reste intact** dans la ligne historique — sa préservation est un point de vigilance (§8) |
| `themeId`, `fontId` | Réglages `theme` |
| Menu (38 produits) | **Reste** dans `menu_items` — référencé par section `menu` |
| Blog (6 articles) | **Reste** dans `blog_posts` — référencé par section `blog` |

### 9.3 Contenus codés en dur à récupérer (TDR §4, règle absolue)

Ces textes vivent aujourd'hui **dans les composants** alors qu'ils sont administrables par nature. La migration doit les extraire :

| Emplacement | Contenu en dur | Destination |
|---|---|---|
| `Hero.tsx:85-86` | prix affiché « 48 000 FG » | Section `hero` |
| `Hero.tsx:54-57` | pastilles « 100 % bio / Emballages éco / Prix accessibles » | Section `hero` |
| `Story.tsx:30` | « Mister Marcket » | Section `story` |
| `Story.tsx:38-41` | 3 pastilles | Section `story` |
| `Footer.tsx:23-25,31,36` | navigation, adresse, téléphone, email, © 2026 | Réglages + navigation |
| `OrderCart.tsx:13` | horaires de retrait | Réglages |
| `PublicNav.tsx:39-40` | marque « Greatlife » | Réglages `restaurantName` |
| Chaque section | titre et sous-titre de section | Contenu de la section |

### 9.4 Points d'attention de la migration

1. **Les ancres doivent survivre** : `#carte`, `#histoire`, `#engagements`, `#equipe`, `#blog`, `#loca`, `#contact`, `#reservation`, `#home`. Elles sont dans les URL partagées. La colonne `page_sections.anchor` les préserve.
2. **Deux ancres du footer sont déjà cassées aujourd'hui** (`#lacarte`, `#équipe` — audit §4). La migration est l'occasion de les corriger via la navigation administrable.
3. **La carte a un slug dérivé du nom du plat** pour retrouver sa photo (audit §12). Ce mécanisme fragile doit être remplacé par une **référence média** — mais c'est le Lot 7, pas le Lot 1.

---

## 10. Ce que le Lot 1 ne fait pas

Pour éviter toute ambiguïté sur le périmètre :

| Hors périmètre du Lot 1 | Lot concerné |
|---|---|
| Éditeur visuel, glisser-déposer, édition contextuelle | Lot 2 |
| Brouillon / prévisualisation / publication / versions | Lot 3 |
| Moteur de thème complet (couleurs, rayons, ombres, animations) | Lot 4 |
| Navigation administrable avec drag & drop | Lot 5 |
| Médiathèque (recherche, tags, métadonnées) | Lot 6 |
| Menu : catégories, options, disponibilité, promotions, **bilingue** | Lot 7 |
| Simplification de l'interface d'administration, actions rapides | Lot 8 |
| Consolidation RBAC/RLS/audit | Lot 9 |
| Tests, responsive, accessibilité, régression | Lot 10 |

---

## 11. Décisions soumises à validation

| Réf | Décision | Recommandation |
|---|---|---|
| **CM-1** | Pattern de traduction : objet par champ / ligne par langue / table de traductions | **Option A** — objet de traduction par champ, appliqué uniformément |
| **CM-2** | Emplacement des réglages globaux : réutiliser `site_content` (nouvelles lignes) ou créer une table dédiée | **Nouvelles lignes dans `site_content`** (TDR §29), sans toucher à la ligne historique |
| **CM-3** | Créer `page_versions` dès le Lot 1 (table vide) ou au Lot 3 | **Dès le Lot 1** si le coût est nul — évite une migration sur données vivantes |
| **CM-4** | Ajouter `engagements` **et** `rich_text` au catalogue du TDR §12 (18 types) | **Oui** — sans `engagements`, la migration perd 6 blocs de contenu |
| **CM-5** | Le contenu actuel migre avec `en` vide et repli sur `fr` | **Oui** — à traduire progressivement |
| **CM-6** | **Provenance de la langue active** et slug par langue : préfixe d'URL (`/en/…`), cookie, ou détection navigateur ? | **Préfixe d'URL** — un seul slug par page, la langue reste dans le chemin. À trancher car cela conditionne le routage |
| **CM-7** | **Rendu SEO** : le site est une SPA, donc le TDR §26 n'est pas livrable tel quel. Rendu statique à la publication, pré-rendu, ou edge ? | **À trancher hors Lot 1** — mais `pages.seo` ne sert à rien sans cette décision |
| **CM-8** | **Sort des 4 composants rendus inconditionnellement** (`PublicNav`, `Reservation`, `Footer`, `OrderCart`) | **Devenir des sections administrables** — sinon le formulaire de réservation ne pourra jamais être déplacé ni masqué |
| **CM-9** | Noms des variantes par type (TDR §13 donne l'exemple du Hero) | **À définir type par type** au Lot 2, pas au Lot 1 |
| **CM-10** | **Référencement des médias** : par `media_id` (FK) ou par URL ? | **Par `media_id`** — mais le comportement en cas de média supprimé doit être défini (section cassée, place-holder, ou blocage de la suppression) |
| **CM-11** | Sort de `visibility.sections` (8 clés lues) pendant la transition | **Conservée** pour l'ancien site ; devient sans objet au basculement |
| **CM-12** | **Gel et neutralisation de l'ancien blob** : à quel moment cesse-t-il de faire autorité ? | **Au basculement du renderer**, décision explicite, avec l'ancien contenu archivé |

---

## 12. Compatibilité future avec l'IA (TDR §34, §35)

Le TDR exige que l'architecture permette d'ajouter un AI Copilot **sans refonte**. Le modèle ci-dessus le permet, à une condition : que les actions structurées du §35 aient une cible adressable.

| Action future | S'appuie sur |
|---|---|
| `createPage()` / `updatePage()` | table `pages` |
| `addSection()` / `removeSection()` / `moveSection()` | table `page_sections` + `position` |
| `updateTheme()` | réglages `theme` |
| `createMenuItem()` / `updateMenuItem()` | module Menu (existant) |
| `updateMedia()` | médiathèque |
| `publishChanges()` / `restoreVersion()` | Lots 3 (statuts + versions) |

**Rien dans ce modèle ne place une donnée éditable dans le code** — c'est la condition posée par le TDR §35.
