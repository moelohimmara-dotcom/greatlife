# GREATLIFE CMS — TDR MASTER

## Transformation de Greatlife en CMS de restaurant intuitif, autonome et extensible

**Projet :** Greatlife
**Dépôt :** `moelohimmara-dotcom/greatlife`
**Branche de référence :** `main`
**Phase :** CMS sans IA
**IA :** explicitement hors périmètre de cette phase
**Objectif futur :** permettre l'ajout ultérieur d'un AI Copilot sans refonte du CMS

> Document fourni par le propriétaire du projet le 2026-09-18. Reproduit ici à l'identique pour servir de source de vérité dans le dépôt.

---

## 1. MISSION

Transformer l'application Greatlife existante en un véritable CMS de restaurant moderne permettant à une personne non technique de gérer presque intégralement son site depuis une console d'administration simple, visuelle et compréhensible.

Le système doit permettre de modifier :

- contenu ;
- structure des pages ;
- navigation ;
- menu ;
- prix ;
- disponibilité des plats ;
- images ;
- galerie ;
- témoignages ;
- équipe ;
- blog ;
- informations du restaurant ;
- design ;
- couleurs ;
- typographies ;
- boutons ;
- header ;
- footer ;
- SEO ;
- visibilité des éléments ;
- paramètres du site ;
- réservations ;
- commandes ;
- utilisateurs et permissions.

Aucune compétence en programmation ne doit être nécessaire.

---

# 2. PRINCIPE FONDAMENTAL

Le produit doit respecter cette règle :

> L'utilisateur ne doit jamais avoir besoin de comprendre l'architecture technique du CMS pour réussir une tâche.

L'interface doit parler le langage du restaurateur, pas celui du développeur.

Ne pas exposer inutilement :

- component ;
- props ;
- schema ;
- collection ;
- API ;
- JSON ;
- CSS ;
- database ;
- migration ;
- deployment.

À la place utiliser :

- Page ;
- Section ;
- Texte ;
- Image ;
- Menu ;
- Plat ;
- Promotion ;
- Galerie ;
- Réservation ;
- Apparence ;
- Prévisualisation ;
- Publier.

---

# 3. PRINCIPES UX

## 3.1 Simple par défaut

La console doit proposer une interface simple.

## 3.2 Puissante à la demande

Les fonctions avancées doivent être disponibles sans encombrer l'interface principale.

## 3.3 Édition contextuelle

Lorsqu'un utilisateur clique sur un élément visible du site, il doit pouvoir le modifier directement.

## 3.4 Prévisualisation permanente

Toute modification importante doit pouvoir être visualisée avant publication.

## 3.5 Publication explicite

Aucune modification de contenu ne doit accidentellement devenir publique.

## 3.6 Réversibilité

Toute publication importante doit pouvoir être restaurée.

## 3.7 Une source de vérité

Un contenu métier ne doit pas être dupliqué inutilement.

Exemple :

Le prix d'un plat est stocké une seule fois.

Toutes les pages qui affichent ce plat utilisent cette donnée.

---

# 4. RÈGLE ARCHITECTURALE ABSOLUE

Le frontend public ne doit pas contenir en dur les données administrables.

Interdit :

```tsx
<h1>Bienvenue chez Greatlife</h1>
```

si ce texte est supposé être modifiable depuis l'admin.

Préférer :

```tsx
<Hero title={content.hero.title} />
```

Le contenu doit provenir du CMS.

---

# 5. NE PAS REPARTIR DE ZÉRO

Le dépôt actuel doit être analysé avant toute modification.

Conserver autant que possible :

- React ;
- TypeScript ;
- Vite ;
- Tailwind ;
- Supabase ;
- Supabase Auth ;
- Supabase Storage ;
- Supabase Realtime ;
- repository/data-access existant ;
- RBAC existant ;
- composants UI réutilisables ;
- logique métier fonctionnelle ;
- commandes ;
- réservations ;
- médias ;
- blog ;
- thème existant.

Ne pas effectuer de réécriture massive sans justification.

---

# 6. WORKFLOW OBLIGATOIRE AVANT CODAGE

Avant d'écrire du code :

1. inspecter le dépôt ;
2. lire `README.md` ;
3. lire `ARCHITECTURE.md` ;
4. lire `DEVELOPMENT.md` ;
5. inspecter `package.json` ;
6. inspecter `src/` ;
7. inspecter `supabase/` ;
8. identifier les tables existantes ;
9. identifier les routes ;
10. identifier les composants administrateur ;
11. identifier les données actuellement codées en dur ;
12. identifier les duplications ;
13. identifier les risques de migration.

Produire ensuite :

`docs/01_EXISTING_PROJECT_AUDIT.md`

Ne pas modifier l'architecture avant cet audit.

---

# 7. ARCHITECTURE CIBLE

Organisation fonctionnelle :

```text
Greatlife
│
├── Public Website
│
├── CMS
│   ├── Pages
│   ├── Sections
│   ├── Content
│   ├── Navigation
│   ├── Theme
│   └── Publishing
│
├── Restaurant
│   ├── Menu
│   ├── Categories
│   ├── Items
│   ├── Options
│   ├── Promotions
│   ├── Orders
│   └── Reservations
│
├── Media
│
├── SEO
│
├── Users
│
├── Analytics
│
└── System
    ├── Versioning
    ├── Audit
    └── Settings
```

---

# 8. UX DE LA CONSOLE

La navigation principale doit rester courte.

Proposition :

```text
Accueil
Modifier le site
Menu
Activité
Médias
Statistiques
Paramètres
```

Ne pas créer une sidebar de 20 à 30 entrées.

Les fonctionnalités spécialisées sont regroupées dans les espaces appropriés.

---

# 9. DASHBOARD

Le dashboard doit être orienté action.

Afficher notamment :

- commandes récentes ;
- réservations ;
- messages ;
- chiffre d'affaires si disponible ;
- plats indisponibles ;
- activité récente ;
- état du site ;
- brouillons ;
- modifications non publiées.

Ajouter une zone :

### Actions rapides

```text
Ajouter un plat
Modifier le menu
Ajouter une photo
Modifier les horaires
Modifier le site
Voir les réservations
```

---

# 10. ÉDITEUR DU SITE

Le cœur du CMS doit être un éditeur visuel.

Structure :

```text
┌────────────┬──────────────────────┬──────────────┐
│ Structure  │ Aperçu du site      │ Modifier     │
│            │                      │              │
│ Hero       │                      │ Titre        │
│ Menu       │      WEBSITE         │ Image        │
│ Histoire   │                      │ Bouton       │
│ Galerie    │                      │ Style        │
│ Avis       │                      │              │
│ Contact    │                      │              │
└────────────┴──────────────────────┴──────────────┘
```

Sur mobile :

```text
Structure
   ↓
Aperçu
   ↓
Modifier
```

---

# 11. ÉDITION DIRECTE

L'utilisateur doit pouvoir cliquer sur un élément du site.

Exemple :

```text
[Bienvenue chez Greatlife]
```

Au clic :

```text
Titre

[Bienvenue chez Greatlife]

Modifier
```

Même principe pour :

- textes ;
- images ;
- boutons ;
- cartes ;
- plats ;
- témoignages ;
- sections.

---

# 12. PAGE BUILDER

Créer un système de sections configurables.

Catalogue initial :

```text
Hero
Texte
Image + texte
Menu
Menu vedette
Galerie
Témoignages
Équipe
Notre histoire
Localisation
Carte
Réservation
Contact
Blog
FAQ
CTA
Vidéo
Espacement
```

Chaque section doit avoir :

- type ;
- variante ;
- contenu ;
- ordre ;
- visibilité ;
- paramètres responsive ;
- paramètres visuels.

---

# 13. VARIANTES

Ne pas permettre un design totalement libre de type Webflow.

Prévoir des variantes maîtrisées.

Exemple :

```text
Hero

○ Plein écran
○ Image + texte
○ Centré
○ Vidéo
```

Cela protège la cohérence du site.

---

# 14. MODÈLE DE CONTENU

Séparer strictement :

### Contenu

Ce qui est dit.

### Présentation

Comment c'est affiché.

### Structure

Où c'est affiché.

Exemple :

```text
Plat
    ↓
Données du plat

Section Menu
    ↓
Présentation du plat

Page Accueil
    ↓
Emplacement du menu
```

---

# 15. MENU

Le menu doit être un module autonome.

Catégories :

- Entrées ;
- plats ;
- desserts ;
- boissons ;
- formules ;
- catégories personnalisées.

Un plat doit pouvoir contenir :

```text
Nom
Description
Prix
Prix promotionnel
Image
Catégorie
Disponibilité
Badge
Ingrédients
Allergènes
Options
Ordre
Visibilité
```

---

# 16. RÈGLE "UNE SOURCE DE VÉRITÉ"

Un plat ne doit pas être copié dans plusieurs pages.

Exemple :

```text
menu_items
    ↓
Homepage
    ↓
Menu
    ↓
Promotion
    ↓
Commande
```

Une modification du prix doit se répercuter partout.

---

# 17. MEDIA LIBRARY

Créer une vraie médiathèque.

Fonctions :

- upload ;
- suppression ;
- remplacement ;
- recherche ;
- aperçu ;
- sélection ;
- alt text ;
- titre ;
- description ;
- tags ;
- organisation.

Les sections doivent pouvoir sélectionner un média depuis cette bibliothèque.

---

# 18. DESIGN / THEME ENGINE

L'administrateur doit pouvoir modifier :

### Couleurs

- primaire ;
- secondaire ;
- accent ;
- fond ;
- surface ;
- texte.

### Typographie

- titres ;
- texte ;
- accent.

### Composants

- boutons ;
- cartes ;
- formulaires ;
- badges ;
- navigation.

### Style global

- rayons ;
- ombres ;
- espacements ;
- animations.

Ne jamais disperser ces valeurs dans plusieurs composants.

---

# 19. HEADER ET FOOTER

Header et Footer sont des éléments globaux.

Une modification doit être répercutée sur toutes les pages.

---

# 20. NAVIGATION

L'utilisateur doit pouvoir :

- ajouter une page ;
- renommer une page ;
- supprimer une page ;
- réordonner les pages ;
- ajouter un lien ;
- masquer une page ;
- créer des sous-menus ;
- modifier le CTA principal.

Prévoir drag & drop.

---

# 21. PAGES

Chaque page doit disposer de :

```text
Nom
Slug
Statut
Sections
SEO
Visibilité
Date de publication
Date de modification
Version
```

Statuts :

```text
Brouillon
Publié
Archivé
```

---

# 22. DRAFT / PREVIEW / PUBLISH

Flux obligatoire :

```text
Modification
    ↓
Brouillon
    ↓
Prévisualisation
    ↓
Validation
    ↓
Publication
```

Le public ne doit voir que la version publiée.

---

# 23. VERSIONING

Chaque publication importante crée une version.

Possibilité :

```text
Version 12
Version 11
Version 10
```

Actions :

```text
Voir
Prévisualiser
Restaurer
```

---

# 24. VALIDATION AVANT PUBLICATION

Avant publication :

```text
✓ Pages valides
✓ Navigation valide
✓ Images valides
✓ Menu valide
✓ Prix renseignés
✓ Aucun lien cassé
✓ Informations essentielles présentes
```

Afficher les erreurs en langage humain.

Exemple :

❌ "Schema validation error"

Interdit.

Préférer :

> "Le plat Burger maison n'a pas de prix."

---

# 25. RESPONSIVE

Chaque modification doit être testable :

```text
Desktop
Tablette
Mobile
```

L'utilisateur doit pouvoir voir rapidement si un élément pose problème.

---

# 26. SEO

Chaque page :

```text
Titre SEO
Description
Slug
Image sociale
Indexation
Canonical
```

Mais ne pas surcharger l'interface simple.

SEO avancé dans une section secondaire.

---

# 27. PERMISSIONS

Conserver/améliorer le RBAC existant.

Rôles :

```text
Owner
Admin
Manager
Editor
Staff
```

Exemple :

Owner :
tout.

Admin :
CMS + restaurant + utilisateurs.

Manager :
menu + commandes + réservations.

Editor :
contenu + médias.

Staff :
activité opérationnelle.

---

# 28. AUDIT LOG

Enregistrer les actions importantes :

```text
Utilisateur
Action
Date
Objet
Avant
Après
```

Exemple :

```text
Mara
Modification du prix
Poulet braisé
85 000 → 90 000 GNF
18/09/2026 08:12
```

---

# 29. BASE DE DONNÉES

Conserver les tables existantes lorsque possible.

Évaluer l'ajout de :

```text
pages
page_sections
page_versions

themes
theme_versions

navigation
navigation_items

seo_metadata

audit_logs
```

Ne pas créer de table redondante.

Avant toute migration :

- inspecter le schéma existant ;
- vérifier les relations ;
- vérifier RLS ;
- vérifier les données existantes ;
- prévoir migration réversible.

---

# 30. API / DATA ACCESS

Centraliser les accès aux données.

Ne pas disperser les requêtes Supabase directement dans chaque composant UI.

Respecter le repository/data-access existant lorsqu'il est sain.

---

# 31. RLS / SÉCURITÉ

Toutes les données administratives doivent être protégées.

Vérifier :

- authentification ;
- autorisation ;
- RLS ;
- Storage policies ;
- accès aux commandes ;
- accès aux clients ;
- accès aux réservations ;
- accès aux utilisateurs.

Ne jamais faire confiance au frontend pour les permissions.

---

# 32. ACCESSIBILITÉ

Minimum :

- clavier ;
- focus visible ;
- labels ;
- contrastes ;
- boutons accessibles ;
- messages d'erreur lisibles ;
- navigation cohérente.

---

# 33. PERFORMANCES

Ne pas sacrifier les performances au CMS.

Attention particulièrement à :

- images ;
- galerie ;
- chargement Supabase ;
- re-renders ;
- éditeur ;
- drag & drop.

---

# 34. CE QUI EST HORS PÉRIMÈTRE

Pour cette phase :

- IA ;
- chatbot ;
- génération automatique ;
- agents ;
- AI Copilot ;
- génération d'images IA ;
- automatisation marketing IA.

Préparer cependant l'architecture afin que ces fonctionnalités puissent être ajoutées plus tard.

---

# 35. CONTRAINTE FUTURE POUR L'IA

Le futur AI Copilot devra manipuler le CMS via des actions structurées :

```text
createPage()
updatePage()
addSection()
removeSection()
moveSection()
updateTheme()
createMenuItem()
updateMenuItem()
updateMedia()
createPromotion()
publishChanges()
restoreVersion()
```

Ne pas construire aujourd'hui une architecture qui obligerait l'IA future à modifier directement le code ou le SQL.

---

# 36. FABLE ADVISOR — OBLIGATOIRE

Le projet doit intégrer `fable-advisor` comme mécanisme de seconde opinion.

Fable est un **conseiller read-only**. Il ne code pas.

Il doit être consulté :

1. avant toute décision d'architecture difficilement réversible ;
2. avant migration importante de base de données ;
3. avant changement de contrat API ;
4. avant gros refactor ;
5. lorsqu'un problème échoue deux fois ;
6. avant de déclarer un lot important terminé.

Il doit recevoir :

- la décision ;
- les contraintes ;
- les options ;
- les fichiers pertinents ;
- les éléments de preuve.

Il doit challenger la décision et non simplement la confirmer.

---

# 37. RÈGLE FABLE DANS LE WORKFLOW

Pour chaque lot :

```text
PLAN
 ↓
FABLE REVIEW
 ↓
IMPLEMENTATION
 ↓
TEST
 ↓
FABLE FINAL REVIEW
 ↓
DONE
```

Pour les décisions simples :

```text
PLAN
 ↓
IMPLEMENTATION
 ↓
TEST
```

Le codeur ne doit pas gaspiller Fable sur chaque petit changement.

---

# 38. FABLE FINAL REVIEW

Avant de déclarer un lot terminé :

Fable doit examiner :

- diff ;
- fichiers modifiés ;
- tests ;
- objectif initial ;
- risques ;
- régressions potentielles.

Verdicts possibles :

```text
proceed
proceed-with-changes
reconsider
```

Le développeur doit appliquer les corrections nécessaires avant de déclarer le lot terminé.

L'approche est cohérente avec les implémentations GitHub de `fable-advisor`, qui définissent Fable comme un conseiller read-only aux points de décision et lors de la revue finale. citeturn0search3turn0search8

---

# 39. DOCUMENTATION À CRÉER

Créer :

```text
docs/
├── 01_EXISTING_PROJECT_AUDIT.md
├── 02_PRODUCT_VISION.md
├── 03_CMS_ARCHITECTURE.md
├── 04_CONTENT_MODEL.md
├── 05_PAGE_BUILDER.md
├── 06_THEME_ENGINE.md
├── 07_ADMIN_UX.md
├── 08_MEDIA_LIBRARY.md
├── 09_MENU_ENGINE.md
├── 10_PUBLISHING_VERSIONING.md
├── 11_RBAC_SECURITY.md
├── 12_DATABASE_SCHEMA.md
├── 13_API_CONTRACT.md
├── 14_TEST_STRATEGY.md
├── 15_IMPLEMENTATION_ROADMAP.md
└── 16_FABLE_GOVERNANCE.md
```

---

# 40. ORDRE D'IMPLÉMENTATION

## Lot 0 — Audit

Aucune modification fonctionnelle.

Livrable :

`01_EXISTING_PROJECT_AUDIT.md`

## Lot 1 — Fondations CMS

- pages ;
- sections ;
- renderer ;
- modèles TypeScript ;
- repository.

## Lot 2 — Page Builder

- sections ;
- variantes ;
- drag & drop ;
- édition.

## Lot 3 — Publishing

- draft ;
- preview ;
- publish ;
- versioning.

## Lot 4 — Theme Engine

- tokens ;
- design settings ;
- global styles.

## Lot 5 — Navigation

- pages ;
- menu ;
- header ;
- footer.

## Lot 6 — Media Library

- upload ;
- sélection ;
- métadonnées.

## Lot 7 — Restaurant Content

- catégories ;
- plats ;
- prix ;
- disponibilité ;
- promotions.

## Lot 8 — UX simplifiée

- dashboard ;
- actions rapides ;
- édition contextuelle ;
- mode Focus ;
- langage utilisateur.

## Lot 9 — Sécurité

- RBAC ;
- RLS ;
- audit.

## Lot 10 — QA

- tests ;
- responsive ;
- accessibilité ;
- régression.

---

# 41. RÈGLE DE NON-RÉGRESSION

Le site public existant ne doit pas être dégradé.

Avant chaque migration :

```text
fonctionnalité existante
        ↓
testée
        ↓
refactor
        ↓
retestée
```

Ne pas casser une fonctionnalité existante simplement pour obtenir une architecture plus élégante.

---

# 42. DÉFINITION OF DONE

Un lot n'est terminé que lorsque :

- le code compile ;
- les types sont valides ;
- les tests pertinents passent ;
- le comportement est vérifié ;
- les données existantes sont préservées ;
- aucune erreur console critique ;
- responsive vérifié ;
- permissions vérifiées ;
- migration vérifiée si nécessaire ;
- documentation mise à jour ;
- Fable review effectuée lorsqu'elle est requise.

---

# 43. RÈGLE DE COMMUNICATION DU CODEUR

Ne jamais répondre :

> "C'est fait."

sans preuve.

Le rapport doit toujours indiquer :

```text
Implemented:
...

Files changed:
...

Database:
...

Tests:
...

Verification:
...

Known limitations:
...

Fable verdict:
...

Next step:
...
```

---

# 44. PRINCIPLE FINAL

Greatlife doit devenir :

> **Un CMS extrêmement puissant sous le capot, mais extrêmement simple à utiliser en surface.**

L'utilisateur ne doit pas avoir l'impression d'administrer une application informatique.

Il doit avoir l'impression de :

> **gérer son restaurant et son site.**
