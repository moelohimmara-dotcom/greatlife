# 18 — Dispositions de bloc et réglages d'affichage

> **Statut : PROPOSITION — À ARBITRER.** Ce document n'engage rien tant que le
> propriétaire ne l'a pas validé (AGENTS.md §14 : aucune décision d'architecture
> sans validation). Il précède toute ligne de code.
>
> **Date** : 2026-09-20 · **Demande** : « permettre au restaurateur de changer la
> configuration de l'interface de son site, section par section, avec un système
> de blocs — comme les thèmes WordPress — pour les médias, les textes et les
> éléments accessoires, avec 2 à 4 options prédéfinies au choix. »

---

## 1. Le constat qui change le problème

**Le système demandé existe déjà — il est débranché au dernier mètre.**

Le modèle de section porte une `variant` (TDR §13) et un `settings` jsonb. Chaîne
vérifiée :

| Maillon | État |
|---|---|
| Déclaration des variantes (`src/cms/model/sections/schemas.ts`) | ✅ **35 variantes**, dont **19 sur les 10 sections réellement rendues** |
| Sélection dans l'éditeur (`PropertyPanel.tsx:59-68`) | ✅ un sélecteur les affiche |
| Écriture en base (`repository/sections.ts:188`) | ✅ `payload.variant` |
| Transmission au composant (`SectionRenderer.tsx:53`) | ✅ `variant={…}` passé en props |
| **Lecture par le composant** | ❌ **aucun** : `variant` apparaît **0 fois** dans `src/sections/*.tsx` |

Les signatures sont sans ambiguïté :

```tsx
Hero({ content: cms })                    // ne reçoit que content
Carte({ content: cms, data })             // content + data
Story({ content: cms })
```

`settings` est dans le même état : **écrit** par `updateSection` (`sections.ts:193`),
**transmis** (`SectionRenderer.tsx:54`), **jamais lu**, et **sans aucune interface
pour le remplir**.

**Conséquence pour le restaurateur** : il choisit « Carrousel » pour sa galerie,
l'éditeur enregistre, et le site ne change pas. Même famille de défaut que la
poubelle inerte corrigée le 2026-09-19 : une commande qui a l'air d'agir et qui
n'agit pas.

**Deux écarts annexes, mesurés** :

1. `SectionTypePicker.tsx:75` itère sur **tous** les `SECTION_TYPES`, sans filtrer
   `implemented`. La palette propose donc **20 blocs dont 10 n'ont aucun
   composant** — le restaurateur peut insérer une « FAQ », une « Vidéo » ou un
   « Plan » qui ne se rendront pas normalement.
2. Le libellé du sélecteur dit **« Variante »** : vocabulaire de développeur, que
   le TDR §2 interdit d'exposer.

**Ce n'est donc pas un système à concevoir, c'est une couche à brancher et à
compléter.** Le périmètre réel est plus petit qu'il n'y paraît — et plus sûr.

---

## 2. Comment procèdent les autres CMS

### 2.1 Ils convergent tous vers trois niveaux

| Niveau | WordPress | Shopify | **Greatlife aujourd'hui** |
|---|---|---|---|
| **Global** (couleurs, typo) | `theme.json` (`settings`, `styles`) | `config/settings_schema.json` | `themeId` + `fontId` ✅ |
| **Section** (mise en page) | réglages du bloc + *block styles* | `{% schema %}` de la section + `presets` | `variant` + `settings` ⚠️ inerte |
| **Bloc** (contenu répété) | blocs imbriqués | blocs de section (`blocks:`) | `content` (champs) ✅ |

Le découpage que le propriétaire décrit existe donc **à l'identique** chez
WordPress et Shopify. Le travail n'est pas d'inventer un modèle, mais de
**remplir le niveau « section »**, aujourd'hui vide.

### 2.2 Le mécanisme décisif : le thème déclare ce qui est modifiable

C'est le point que la question du propriétaire visait, et la réponse est nette :
**la liberté n'est pas un curseur, c'est un jeu d'interrupteurs que le
concepteur du thème contrôle.**

- **WordPress** : dans `theme.json`, `settings.color.custom: false` **retire le
  sélecteur de couleur libre tout en gardant la palette du thème**. Idem pour
  `border.radius`, `spacing.margin`, `appearanceTools`, etc. Le thème dit ce qui
  est exposé, bloc par bloc.
- **Shopify** : les couleurs ne se choisissent pas librement, elles se
  sélectionnent dans des **`color_scheme`** définis par le thème. Les réglages
  sont typés (`select`, `range` avec `min`/`max`/`step`, `image_picker`).

Autrement dit : *« choix prédéfinis »* et *« quelques réglages fins »* **ne sont
pas deux camps opposés**. Les plateformes de référence font les deux — mais
**toute valeur fine reste bornée** (une palette, une échelle, un intervalle).

### 2.3 Les presets sont le nom que ça porte ailleurs

- **Shopify, `presets`** : « *predefined section configurations that merchants can
  select when adding sections* ». C'est **exactement** les « 2 à 4 options
  prédéfinies » décrites par le propriétaire — nom, réglages par défaut, et blocs
  inclus.
- **WordPress, *block styles*** : une courte liste de styles nommés par bloc
  (`core/button: outline`, `core/image: rounded`, `core/quote: plain`).
  « Styles for unregistered style variations will be ignored » : une variation
  n'existe que rattachée à un bloc.

### 2.4 Le mode de défaillance documenté

Shopify **expose** un réglage `custom_css` au niveau de la section… et sa
documentation dit explicitement aux auteurs de thèmes de **ne pas l'ajouter** :
« *As a theme developer, you shouldn't add this setting* ». La plateforme qui
donne le pouvoir recommande de ne pas s'en servir.

C'est le consensus : les constructeurs libres (Elementor, Webflow, Framer)
produisent des sites incohérents entre les mains de non-designers. Ce que le
propriétaire est — un restaurateur (TDR §4, §17, §44).

### 2.5 Ce qu'on en retient pour Greatlife

| Constat | Décision qui en découle |
|---|---|
| Le modèle à 3 niveaux est standard | On le remplit, on ne le réinvente pas |
| Les presets nommés sont la norme | La `variant` existante **est** le bon véhicule |
| La liberté se borne par une liste d'autorisation | Chaque réglage = **choix fermé**, jamais valeur libre |
| La couleur appartient au thème | Les fonds puisent dans la **palette** (`themeId`), pas de sélecteur libre |
| Le CSS libre est un piège reconnu | Aucun champ CSS, jamais |
| Les valeurs fines restent bornées | Des **échelles** nommées (compact / normal / aéré), pas des pixels |

---

## 3. Le modèle proposé

### 3.1 Ce qu'on branche

**Couche A — « Disposition »** (renommage de `variant`, sans changement de schéma).
Pour chaque section, **2 à 4 dispositions visuellement distinctes**. C'est le
véhicule des « options prédéfinies ».

**Couche B — « Affichage »** (`settings`, colonne déjà en base). Un petit jeu de
réglages **universels**, à options fermées, communs à toutes les sections.

**Couche C — Médias et accessoires.** Les champs média (`type: 'image'`) et les
accessoires (pastilles, badges, puces) existent déjà comme **contenu**. Ce qui
manque : un choix depuis la médiathèque en ligne, et le pouvoir de **masquer un
accessoire** par disposition plutôt que de devoir vider son contenu.

### 3.2 La frontière, qui est la seule vraie décision

| Question | Réponse | Pourquoi |
|---|---|---|
| La couleur du site ? | **Globale** (thème) | Une charte, une identité (TDR §16) |
| La disposition d'une section ? | **Par section** | C'est du rythme de page, pas de l'identité |
| Le fond d'une section ? | **Par section, dans la palette** | Permet d'alterner, sans casser la charte |
| L'espacement ? | **Par section, sur une échelle** | Idem |
| Une couleur libre ? | **Jamais** | Le restaurateur n'est pas designer (TDR §44) |
| Du CSS ? | **Jamais** | Idem, et le §17 l'interdit |

---

## 4. Le pilote : la Bannière d'accueil

**Pourquoi elle** : 4 dispositions déjà nommées, c'est la première chose que voit
un visiteur, et elle n'utilise aucune donnée partagée (contrairement à la Carte,
qui consomme `menu_items` — le risque y est double).

Les 4 dispositions, définies **précisément** (une disposition qui ne se distingue
pas d'une autre n'est pas une disposition) :

| Disposition | Texte | Média | Accessoires | Ce que ça change vraiment |
|---|---|---|---|---|
| **Plein écran** (défaut) | Centré, sur le média | Image de fond, pleine hauteur | Pastille + étiquette du plat | **Rendu actuel, inchangé** |
| **Image + texte** | À gauche | Image à droite, sans fond | Pastilles conservées | Deux colonnes |
| **Centré** | Centré, sans média | Aucun | Pastilles centrées | Bloc compact, fond clair |
| **Vidéo** | Centré, sur la vidéo | Vidéo de fond (`video` du contenu) | Réduits | Repli sur le média si la vidéo manque |

**Règle d'or** : `variant: null` **et** `settings: {}` doivent produire
**exactement** le rendu actuel. Voir §6.

---

## 5. Les réglages d'affichage (couche B)

Six réglages, **options fermées**, applicables à toute section. Les valeurs sont
posées par le système, jamais saisies.

| Réglage | Options | Défaut | Remarque |
|---|---|---|---|
| **Espacement** | Compact · Normal · Aéré | Normal | Trois échelles de padding vertical |
| **Fond** | Clair · Légèrement teinté · Foncé | Clair | Puise dans la palette du thème |
| **Largeur** | Normal · Étroit · Pleine largeur | Normal | Trois largeurs de conteneur |
| **Alignement du texte** | Gauche · Centré | Gauche | — |
| **Média** | Aucun · Gauche · Droite · Fond | selon la disposition | Sections avec image |
| **Colonnes** | 2 · 3 · 4 | 3 | Sections en grille seulement |

`settings` reste un `jsonb` : **aucune migration**. Il est déjà écrit et
transmis ; il ne manque que l'interface et la lecture.

---

## 6. Les garde-fous

### 6.1 Le filet de non-régression est le juge

`npm run verify:lot1` compare le rendu des 10 sections **octet par octet** à la
révision figée `0528c544`. Donc :

> **La disposition par défaut doit rendre exactement ce qu'elle rend
> aujourd'hui.** Sinon le contrôle casse — et il aura raison.

C'est une contrainte, mais c'est surtout une **preuve mécanique** que proposer
des options ne change rien pour les visiteurs actuels. Le filet sera étendu :
rendre **chaque disposition** de la Bannière et comparer à une référence, pour
qu'un préréglage ne puisse pas casser les autres en silence.

### 6.2 Les autres

- **Publication (§8, §22)** : `variant` et `settings` vivent dans `page_sections`,
  donc **rien n'est visible avant « Publier »**. La chaîne est déjà bonne ; ne pas
  la contourner.
- **Ancres (§5)** : une disposition ne doit jamais retirer l'`id` de l'ancre —
  sinon les liens `#carte`, `#histoire`… meurent. `verify:anchors` le détecte.
- **Vocabulaire (TDR §2)** — jamais de terme technique à l'écran :

| Interne | Affiché |
|---|---|
| `variant` | **Disposition** |
| `settings` | **Affichage** |
| `block style`, `preset` | (jamais affichés) |
| `fullscreen`, `one_column` | « Plein écran », « Une colonne » |

---

## 7. Phasage proposé

| Étape | Contenu | Risque | Preuve attendue |
|---|---|---|---|
| **1 — Pilote** | Brancher les 4 dispositions de la Bannière + étendre le filet | Faible, réversible | `verify:lot1` inchangé sur le défaut ; 4 dispositions rendues et comparées |
| **2 — Affichage** | L'onglet « Affichage » + lecture de `settings` par le composant | Faible | Défaut `{}` = rendu actuel |
| **3 — Généralisation** | Les 18 dispositions restantes, avec vignettes d'aperçu | Moyen, mécanique | Une référence par disposition |
| **4 — Blocs manquants** | Compléter les 10 types (`implemented: false`) | Moyen | Palette filtrée : on ne propose que ce qui se rend |

**À faire au passage, dans le même lot que l'étape 3** : filtrer la palette sur
`implemented` (`SectionTypePicker.tsx:75`).

---

## 8. Critères d'acceptation

1. Choisir une disposition, enregistrer, publier — le site change **réellement**.
2. Revenir à la disposition par défaut, vider les réglages — le rendu redevient
   **strictement identique** à avant ce lot (`verify:lot1`).
3. Aucun réglage ne permet de saisir une valeur libre (ni couleur, ni pixel, ni
   CSS) — vérifiable par lecture du schéma.
4. Aucun terme technique n'apparaît à l'écran.
5. Une disposition ne casse jamais une ancre (`verify:anchors`).
6. La palette ne propose que des blocs qui se rendent.

---

## 9. Hors périmètre (à ne pas glisser dans ces lots)

- **Édition de la navigation** — décision M3 du 2026-09-19 : arbitrée séparément.
- **Consolidation des deux lignes de coordonnées** — `docs/17_BACKLOG.md`, B-2.
- **Les 10 types de sections non implémentés** comme *fonctionnalité* — seule la
  filtration de la palette relève de l'étape 4.
- **Composition libre** (imposer ses propres valeurs) — refusée et documentée ici.

---

## 10. Points restant à arbitrer

1. **Le pilote est-il bien la Bannière ?** (recommandé : oui)
2. **Les 4 dispositions de la Bannière** telles que définies au §4 — les valider
   avant de coder, notamment « Vidéo », qui suppose qu'une vidéo de fond existe.
3. **Les 6 réglages du §5** : lesquels garder ? Lesquels sont du bruit ?
4. **Le fond « Foncé »** : trois fonds suffisent-ils, ou faut-il s'aligner
   strictement sur les palettes du thème ?
5. **L'étape 3 d'un coup ou section par section ?** (recommandé : par paquets de
   deux, avec revue indépendante — AGENTS.md §11)
