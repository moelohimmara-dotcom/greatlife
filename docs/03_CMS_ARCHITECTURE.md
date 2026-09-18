# 03 — Architecture CMS

> **Nature** : document de conception (PLAN du Lot 1). Aucun code écrit à ce stade.
> Soumis à revue indépendante (TDR §37) puis à validation avant implémentation.
>
> - **Date** : 2026-09-18
> - **Références** : TDR §5 (ne pas repartir de zéro), §7 (architecture cible), §8 (UX console), §10 (éditeur), §12 (sections), §14 (séparation), §22 (publication), §30 (data access), §31 (sécurité), §35 (IA), §40 (lots)

---

## 1. Principe directeur

> **Un CMS extrêmement puissant sous le capot, extrêmement simple en surface.** (TDR §44)

L'architecture vise trois propriétés :

1. **Une seule source de vérité** par donnée (TDR §16).
2. **Aucune donnée administrable dans le code** (TDR §4).
3. **Aucune logique de permission côté client** (TDR §31).

---

## 2. Les quatre couches

```
┌─────────────────────────────────────────────────────────────┐
│  SITE PUBLIC              │  CONSOLE D'ADMINISTRATION        │
│  (ce que voit le client)  │  (ce que voit le restaurateur)   │
└───────────┬───────────────┴───────────────┬─────────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────┐     ┌─────────────────────────────┐
│  RENDERER             │     │  ÉDITEUR                    │
│  assemble une page    │     │  modifie pages / sections   │
│  à partir de données  │     │  (Lots 2, 8)                │
└───────────┬───────────┘     └──────────────┬──────────────┘
            │                               │
            └───────────┬───────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  REPOSITORY  — accès aux données centralisé (TDR §30)        │
│  Aucune requête Supabase dispersée dans les composants UI    │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  SUPABASE — Postgres + RLS + Auth + Storage + Realtime       │
│  La sécurité est appliquée ICI, pas dans le navigateur       │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Périmètre fonctionnel (TDR §7)

| Domaine | Contenu | Lot |
|---|---|---|
| **Public Website** | Rendu des pages publiées | 1 (renderer), 5 (navigation) |
| **CMS** | Pages, Sections, Content, Navigation, Theme, Publishing | 1 → 5 |
| **Restaurant** | Menu, Catégories, Plats, Options, Promotions, Commandes, Réservations | 6, 7 |
| **Media** | Médiathèque | 6 |
| **SEO** | Métadonnées par page | 1 (données), 5 (UI) |
| **Users** | RBAC | 9 |
| **Analytics** | Statistiques | hors lot actuel |
| **System** | Versioning, Audit, Settings | 3, 9 |

---

## 4. Frontière entre contenu et modules

C'est la règle qui structure tout :

| Nature | Exemple | Stockage | Qui le possède |
|---|---|---|---|
| **Contenu de page** | « Notre histoire », le titre du hero | `pages` / `page_sections` | Le CMS |
| **Donnée métier** | Un plat, un article de blog | `menu_items`, `blog_posts` | Le module concerné |
| **Réglage global** | Adresse, horaires, thème | `site_content` (clés) | Le système |
| **Média** | Une photo | `media_assets` + Storage | La médiathèque |

Une section **affiche** une donnée métier, elle ne la **possède** jamais. Changer le prix d'un plat se répercute partout, sans édition multiple (TDR §16).

---

## 5. Le renderer — cœur du Lot 1

### 5.1 Principe

Le site public cesse d'être **une suite de composants figés** pour devenir **un assembleur piloté par les données** :

```
Requête publique
   │
   ├─ page publiée correspondant à l'URL      → table `pages`
   ├─ sections ordonnées et visibles          → table `page_sections`
   ├─ réglages globaux                        → `site_content`
   └─ données métier selon les sections       → modules Menu / Blog
   │
   ▼
Renderer : pour chaque section → composant correspondant au `type`
   │
   ▼
HTML public
```

### 5.2 Contrat d'un composant de section

Chaque type du catalogue (TDR §12) expose un composant qui reçoit **un objet unique** :

```
{ content, variant, settings, locale, data }
```

- `content` — les textes et médias de la section, résolus dans la langue courante
- `variant` — la mise en forme choisie (TDR §13)
- `settings` — réglages responsive et visuels
- `locale` — langue active (`fr` / `en`)
- `data` — **uniquement** pour les sections branchées sur un module (plats, articles)

Un composant de section **ne lit jamais Supabase directement** (TDR §30).

### 5.3 Résolution des langues

Elle se fait **une seule fois**, dans le renderer, avant d'appeler les composants :

```
valeur bilingue  { fr: "Notre histoire", en: "Our story" }  +  locale active
        │
        ▼
valeur résolue   "Our story"        (repli automatique sur `fr` si `en` absent)
```

Ainsi aucun composant n'a connaissance du multilinguisme : il reçoit du texte prêt à afficher. Cela évite de disperser des conditions de langue dans tout le code.

### 5.4 Les composants existants sont réutilisés (TDR §5)

**Aucune réécriture massive.** `src/sections/` contient **13 fichiers**, dont :

- **9 sont de vraies sections de contenu** (`Hero`, `Carte`, `Story`, `Engagements`, `Team`, `Testimonials`, `Localisation`, `Contact`, `Blog`) → ils deviennent les **implémentations** des types du catalogue ;
- **4 ne sont pas des sections** au sens du TDR §12 : `PublicSite` (l'assembleur), `PublicNav` (header global), `Footer` (global) et `OrderCart` (panier). Les trois derniers sont aujourd'hui **rendus inconditionnellement** et doivent devenir des sections administrables — décision **CM-8**.

Ces composants changent de **source de données** (props au lieu de constantes ou du contexte), pas de structure visuelle. Le rendu final doit rester **identique** — c'est la règle de non-régression du TDR §41.

### 5.5 Cas limites — comportements imposés au renderer

Un renderer piloté par les données rencontre des situations qu'un site figé ne connaît pas. Chacune doit avoir un comportement **défini**, jamais un écran blanc :

| Situation | Comportement imposé |
|---|---|
| Type de section inconnu du registre | Section **ignorée** en public ; signalée en mode administration. Jamais d'erreur bloquante |
| Page sans aucune section | Page **valide** (utile en construction) — rendu minimal, pas d'erreur |
| URL ne correspondant à aucune page publiée | Comportement à trancher (**DB-9**) ; au minimum une page d'erreur soignée. Le projet n'a aujourd'hui **aucune page 404** |
| Section référençant un média supprimé | Place-holder explicite, ou blocage de la suppression à la source (**DB-7**) |
| Champ bilingue absent dans la langue active | **Repli sur `fr`**, jamais de trou d'affichage |
| Page en brouillon demandée par un visiteur | **Refus en base** (RLS), donc introuvable — pas de filtrage côté client |
| Base indisponible | Échec **explicite**. Aucun repli silencieux sur des données codées en dur (règle héritée du Lot 0.5) |

### 5.6 Contrainte majeure : le renderer doit être **isomorphe**

Décision **CM-7** (arbitrée le 2026-09-18) : le SEO par page est obtenu par **génération de HTML statique à la publication**. Cette décision — que le TDR ne couvrait dans aucun de ses 10 lots — impose une contrainte forte au renderer :

> **Le renderer doit produire le même HTML dans deux contextes différents** :
> - **au build** (Node, hors navigateur) → pour générer les pages statiques ;
> - **dans le navigateur** → pour l'aperçu en direct dans l'éditeur (Lot 2).

Conséquences de conception, dès le Lot 1 :

| Contrainte | Règle |
|---|---|
| Aucune dépendance au navigateur dans le renderer | Pas d'accès direct à `window`, `document`, `localStorage` dans le chemin de rendu d'une page |
| Le renderer reçoit ses **données**, il ne les **charge** pas | Il reçoit page + sections + réglages + données métier en paramètres ; le chargement est la responsabilité de l'appelant (Node ou navigateur) |
| Les composants de section doivent être **rendus côté serveur sans erreur** | Aucun composant ne s'appuie sur un effet de bord au premier rendu |
| Les images sont des `<img>` avec `alt`, `srcset` et dimensions | Nécessaire pour un HTML statique réellement exploitable par les robots (et corrige le défaut d'accessibilité relevé dans l'audit §12) |

**Périmètre :** cette contrainte est **structurelle dès le Lot 1** (l'architecture du renderer en dépend), mais **l'outil de génération** (script Node produisant les fichiers, déclenché à la publication) n'est **pas** dans le Lot 1 — il n'est pas non plus dans les 10 lots du TDR. **C'est un lot supplémentaire à créer** (proposition : après le Lot 3, une fois le workflow de publication en place). Décision à confirmer.



---

## 6. Structure de dossiers cible (Lot 1)

Ajouts uniquement ; rien n'est déplacé sans nécessité :

```
src/
├── cms/
│   ├── model/            Types TypeScript du modèle de contenu
│   │   ├── page.ts             Page, statuts
│   │   ├── section.ts          Section, variantes
│   │   ├── sections/           Un schéma de contenu par type (20 : 18 du TDR + 2 ajouts)
│   │   └── i18n.ts             Type Bilingue<T> + helpers de résolution
│   ├── repository/       Accès aux nouvelles tables (TDR §30)
│   │   ├── pages.ts
│   │   ├── sections.ts
│   │   └── navigation.ts
│   ├── renderer/
│   │   ├── PageRenderer.tsx       Assemble une page
│   │   ├── SectionRenderer.tsx    Choisit le composant selon le type
│   │   └── registry.ts            type → composant + schéma de contenu
│   └── migration/
│       └── fromSiteContent.ts     Conversion blob → page (utilisé une fois)
├── sections/            Composants publics existants, branchés sur props
└── ... (existant inchangé)
```

**Le registre (`registry.ts`) est la pièce maîtresse future** : c'est lui qui permettra à l'éditeur du Lot 2 de générer automatiquement ses formulaires, et au futur AI Copilot (TDR §35) de connaître les types disponibles sans coder en dur.

---

## 7. Cycle de vie d'une modification (TDR §22)

Le Lot 1 pose la **structure** ; les Lots 2 et 3 posent l'**expérience**.

| Étape | Lot 1 | Lot 2 | Lot 3 |
|---|---|---|---|
| Modification du contenu | édition directe en base (via l'admin existant si besoin) | éditeur visuel | brouillon persistant |
| Prévisualisation | — | aperçu dans l'éditeur | aperçu de la version en brouillon |
| Publication | `status` = `published` | — | bouton *Publier* + création de version |
| Restauration | — | — | versions (table prête dès le Lot 1 si CM-3/DB-1 validées) |

Le renderer public ne sert **que** `status = 'published'` : dès le Lot 1, la règle « le public ne voit que le publié » est vraie **en base**, pas seulement dans l'interface.

---

## 8. Sécurité : où elle s'applique réellement

| Couche | Rôle |
|---|---|
| **RLS (base)** | **Autorité finale.** Toutes les nouvelles tables ont des policies dès leur création |
| **Repository** | Ne contourne jamais la RLS ; remonte les erreurs au lieu de les masquer |
| **Interface** | Améliore l'expérience (masquer ce qui est interdit), **ne prouve rien** |

**Règle héritée du Lot 0.5** : aucun repli silencieux sur des données locales, et aucun rôle déduit d'une constante codée en dur. Le rôle vient exclusivement de `admin_users`.

**Rappel d'un défaut connu** : `repository.ts` contient aujourd'hui **12 lectures** qui retombent silencieusement sur des données locales en cas d'erreur (audit §19). Les nouvelles fonctions du Lot 1 **ne reproduisent pas ce motif** : elles échouent explicitement.

---

## 9. Compatibilité avec le futur AI Copilot (TDR §34, §35)

L'architecture est compatible si les actions structurées du §35 trouvent une cible :

| Action | S'appuie sur |
|---|---|
| `createPage`, `updatePage` | `cms/repository/pages.ts` |
| `addSection`, `removeSection`, `moveSection` | `cms/repository/sections.ts` + `position` |
| `updateTheme` | réglages (`site_content.theme`) |
| `createMenuItem`, `updateMenuItem` | module Menu existant |
| `updateMedia` | médiathèque (Lot 6) |
| `publishChanges`, `restoreVersion` | Lot 3 |

**Conséquence de conception** : toutes les mutations passent par la couche `repository`, jamais par un composant. C'est ce qui rendra l'IA possible sans refonte — et c'est aussi ce qui rend le code testable (Lot 10).

---

## 10. Ce qui ne change pas (TDR §41 — non-régression)

| Élément | Statut |
|---|---|
| Stack React / TypeScript / Vite / Tailwind / Supabase | inchangée |
| Apparence et comportement du site public | **doivent rester identiques** |
| Commandes, réservations, messages, blog, médias | fonctionnalités préservées |
| Authentification et RBAC existants | inchangés (hors Lot 0.5 déjà livré) |
| Admin existant (16 modules) | **continue de fonctionner** pendant la transition |
| `repository.ts` historique | conservé ; les nouvelles tables ont leur propre module |

**Stratégie de transition** : le nouveau renderer cohabite avec l'ancien `PublicSite`. Le basculement se fait quand le rendu est **prouvé identique** — jamais avant.

### 10.1 Opérationnalisation de la non-régression (TDR §41)

La première version de ce document posait le principe sans le rendre exécutable. Le voici rendu concret.

**a) Interrupteur d'activation.** Le nouveau renderer est activé par un **drapeau** (réglage global), pas par un remplacement de code. Conséquence : le retour arrière est **instantané**, sans redéploiement — on repasse le drapeau.

**b) Critère de « preuve ».** Le projet **n'a aucun test automatisé** (constat d'audit) : la preuve ne peut donc pas reposer sur une suite de tests. Elle repose sur une comparaison **documentée et reproductible** :

1. capturer le rendu de l'ancien site (captures écran aux 3 tailles : mobile, tablette, desktop) ;
2. activer le nouveau renderer sur un environnement de prévisualisation ;
3. comparer section par section, et consigner les écarts **attendus** (ex. un lien de footer corrigé) vs **inattendus** ;
4. vérifier explicitement ce que la migration pouvait casser : **les 9 ancres** (`#carte`, `#histoire`, `#engagements`, `#equipe`, `#blog`, `#loca`, `#contact`, `#reservation`, `#home`), le **formulaire de réservation**, le **panier**, le **blog**, la **carte** ;
5. ne basculer qu'après zéro écart inattendu.

**c) Retour arrière.** Le drapeau suffit. Aucune donnée n'est supprimée : l'ancien blob reste en place (**DB-4**). Le retour arrière ne perd donc aucun contenu créé entre-temps — au prix d'une période où les deux modèles coexistent.

**d) Condition de sortie.** La période de double source de vérité se termine quand le drapeau est définitivement basculé **et** que l'ancien admin ne peut plus écrire dans `site_content.content` (décision **CM-12**). Tant que ce n'est pas fait, l'ancien blob reste modifiable et peut diverger.

**Limite assumée** : sans tests, cette preuve est **manuelle**. Le Lot 10 (TDR §40) est précisément là pour combler ce manque ; d'ici là, la vérification dépend d'une discipline humaine, pas d'une garantie automatique.

---

## 11. Risques d'architecture identifiés

| Risque | Mitigation |
|---|---|
| **Deux modèles de contenu coexistent** pendant la transition (blob + pages) | L'ancien est archivé, pas supprimé ; le basculement est une décision explicite, testable en comparant les deux rendus |
| **Le renderer ralentit le site public** (2 requêtes au lieu d'1) | Volume négligeable ; index en place ; la mesure appartient au Lot 10 |
| **Dispersion de la résolution de langue** | Résolue en un seul point (§5.3), jamais dans les composants |
| **Le registre de sections devient un point de couplage fort** | Assumé : c'est précisément ce qui rend l'éditeur et l'IA possibles |
| **L'admin existant écrit dans l'ancien modèle** | Pendant le Lot 1, l'admin continue de gérer le contenu actuel ; le basculement de l'édition viendra avec le Lot 2 |

---

## 12. Décisions soumises à validation

| Réf | Décision | Recommandation |
|---|---|---|
| **AR-1** | Nouveau dossier `src/cms/` plutôt que dispersion dans `src/` | **Oui** — frontière lisible entre CMS et existant |
| **AR-2** | Réutiliser les 9 composants de section existants comme implémentations | **Oui** — TDR §5 et §41, rendu identique garanti |
| **AR-3** | Résolution des langues centralisée dans le renderer | **Oui** — évite la dispersion |
| **AR-4** | Les nouvelles fonctions du repository échouent explicitement (pas de repli local) | **Oui** — corrige le défaut hérité le plus dangereux |
| **AR-5** | Cohabitation temporaire ancien/nouveau site, basculement sur preuve | **Oui** — respecte le TDR §41 |
| **AR-6** | **Drapeau d'activation** du renderer plutôt que remplacement de code | **Oui** — retour arrière instantané, sans redéploiement |
| **AR-7** | Sort des 4 composants rendus inconditionnellement | ✅ **ARBITRÉ (2026-09-18)** : `OrderCart` et `Reservation` deviennent des **sections de page** ; `PublicNav` et `Footer` deviennent **éditables mais restent globaux** (TDR §19). Voir `04_CONTENT_MODEL.md` §11.0 |
| **AR-8** | Comportement quand aucune page publiée ne correspond à l'URL | **À trancher** — voir **DB-9** |
| **AR-9** | Validation du `type` de section : registre applicatif plutôt que contrainte en base | **Oui** — voir **DB-10** |
| **AR-10** | **Renderer isomorphe** (build Node + navigateur), imposé par la génération statique | **Oui** — contrainte structurelle du Lot 1 (§5.6) |
| **AR-11** | Créer un **lot supplémentaire** pour l'outil de génération statique (absent des 10 lots du TDR) | **Oui** — proposition : juste après le Lot 3 |
