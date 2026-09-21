# 18 — Dispositions de bloc et réglages d'affichage

> **Statut : ARBITRÉ DÉFINITIVEMENT le 2026-09-20 — voir §11.5 et §11.6.**
> Modèle hybride retenu : **variantes maîtrisées par défaut** (TDR §13, qui n'est
> pas abrogé) **+ valeurs libres derrière un dépliage « Avancé »** (fondé sur le
> TDR §3.2 « Puissante à la demande »). CSS arbitraire exclu (TDR §2). Le TDR §13
> porte désormais l'amendement **§13.1**, daté.
>
> **Le pilote est la Bannière d'accueil**, dont les 4 dispositions sont celles du
> TDR §13 et celles déjà déclarées dans le code (`schemas.ts:32-37`).
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

### 3.2 La frontière — **RÉVISÉE le 2026-09-20**

⚠️ Le tableau ci-dessous était la proposition du rédacteur. L'arbitrage du §11
l'a **écartée** : les valeurs fines sont désormais **libres**. Il est conservé
parce qu'il documente ce qui a été pesé, et parce que les deux lignes « Jamais »
restent **partiellement** d'actualité — voir la réserve sur le CSS au §11.4.

| Question | Proposition initiale | Décision retenue |
|---|---|---|
| La couleur du site | Globale (thème) | **Globale + libre par section** |
| La disposition d'une section | Par section | Par section ✅ |
| Le fond d'une section | Par section, **dans la palette** | **Libre** (avec avertissement de contraste) |
| L'espacement | **Sur une échelle** | **Libre** (valeurs chiffrées) |
| Une couleur libre | ~~Jamais~~ | **Autorisée** |
| Du CSS | ~~Jamais~~ | **À trancher** — voir §11.4 (réserve de sécurité) |

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
3. ~~Aucun réglage ne permet de saisir une valeur libre~~ → **RÉVISÉ (§11)** : les
   valeurs libres sont autorisées, mais **jamais sans garde-fou**. Un contraste
   texte/fond insuffisant est **signalé** à la saisie, et toute section peut
   **revenir au thème en un clic**. Le contrôle porte donc sur la présence des
   garde-fous, pas sur l'absence de liberté.
4. Aucun terme technique n'apparaît à l'écran — **sauf** dans le mode « Avancé »,
   où l'utilisateur a explicitement demandé le détail (voir §11.3).
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

1. ~~Le pilote est-il bien la Bannière ?~~ **Arbitré : oui** (2026-09-20).
2. **Les 4 dispositions de la Bannière** telles que définies au §4 — à valider,
   notamment « Vidéo », qui suppose qu'une vidéo de fond existe.
3. ~~Les 6 réglages du §5 : lesquels garder ?~~ **Remplacé par §11.2** : ils
   deviennent des champs libres. Reste à trancher **lequel** est libre en premier.
4. **CSS libre** : voir §11.4 — réserve de sécurité, non tranchée.
5. **L'étape 3 d'un coup ou section par section ?** (recommandé : par paquets de
   deux, avec revue indépendante — AGENTS.md §11)

---

## 11. Arbitrage du 2026-09-20

### 11.1 La décision

Le propriétaire a retenu **le degré de liberté maximal** : « aller jusqu'aux
valeurs libres (couleurs, tailles, marges) ». Le modèle borné recommandé au §3.2
est **écarté**. Le pilote reste **la Bannière d'accueil**.

### 11.2 Ce que cela change

Les 6 réglages du §5 passent d'**options fermées** à **champs libres** :

| Réglage | Avant | Après |
|---|---|---|
| Espacement | 3 échelles | valeur chiffrée par côté (ou un pas réglable) |
| Fond | 3 choix dans la palette | **sélecteur de couleur libre** |
| Couleur du texte | héritée | **sélecteur libre** |
| Largeur | 3 crans | valeur chiffrée |
| Alignement | 2 choix | inchangé (choix fermé, cela n'a pas de sens autrement) |
| Colonnes | 2 · 3 · 4 | 1 à 6, ou valeur libre |

### 11.3 Les garde-fous, qui ne sont pas des restrictions

Trois mécanismes, **tous non bloquants** :

1. **Avertissement de contraste** — le rapport de contraste texte/fond est calculé
   à la saisie (référentiel WCAG). En dessous du seuil lisible, l'éditeur
   **prévient** ; il n'empêche pas d'enregistrer. C'est le seul garde-fou dont
   l'absence aurait un coût direct pour le restaurateur : un menu illisible fait
   perdre des clients.
2. **« Revenir au thème » en un clic**, par section — parce qu'une valeur libre
   n'a pas de retour arrière autrement. Sans cela, un utilisateur perdu doit
   ressaisir chaque champ à la main.
3. **Mode « Avancé » replié par défaut** — le restaurateur pressé voit d'abord
   les dispositions (§4) ; les valeurs libres sont derrière un dépliage
   explicite. Ce n'est pas une restriction : c'est le même écran, un clic plus
   loin.

### 11.4 Réserve du rédacteur, consignée

> ⚠️ **CITATION CORRIGÉE LE 2026-09-20.** La première rédaction de ce paragraphe
> visait « le TDR §17 et §44 ». **C'était faux deux fois** : le TDR §17 s'intitule
> « MEDIA LIBRARY » et n'a aucun rapport ; et la phrase « le CMS absorbe la
> complexité » vient d'`AGENTS.md` §17, qui cite le TDR §44 — pas du TDR lui-même.
> La recherche de la bonne section a mis au jour **TDR §13**, qui tranche la
> question directement. Voir §11.5. Quatrième citation inexacte de la session,
> relevée par moi-même : c'est le mode de défaillance principal de ce dépôt, et
> il ne s'arrête pas aux documents de suivi.

Les points ci-dessous restent valables pour ce qui n'est pas traité au §11.5 :

1. **Conflit avec le contrat produit** — voir §11.5 pour la citation exacte.
2. **Le filet de non-régression ne peut plus couvrir que le défaut.**
   `verify:lot1` continue de garantir que la disposition par défaut n'a pas bougé.
   Aucune valeur saisie par l'utilisateur n'est vérifiable — ni par nous, ni par
   un contrôle. C'est une conséquence acceptée, pas un défaut caché.
3. **Le CSS est écarté** — décision du propriétaire, et elle est **conforme au
   TDR §2**, qui cite littéralement « CSS » dans la liste des choses à ne pas
   exposer. Aucune réserve à formuler.

### 11.5 Ce que le TDR dit déjà — et qui tranche ce point

**TDR §13, « VARIANTES »**, dans son intégralité :

> Ne pas permettre un design totalement libre de type Webflow.
> Prévoir des variantes maîtrisées.
> Exemple : `Hero` ○ Plein écran ○ Image + texte ○ Centré ○ Vidéo
> Cela protège la cohérence du site.

Trois conséquences, toutes mesurables :

1. **Le TDR §13 interdit explicitement ce que l'arbitrage du §11.1 autorise.**
   Ce n'est pas une préférence d'auteur ni un principe général : c'est une règle
   nommée, qui désigne l'option retenue (« design totalement libre de type
   Webflow »).
2. **Le pilote proposé est exactement l'exemple du TDR** : les 4 dispositions de
   la Bannière du §4 sont mot pour mot celles du §13, et ce sont aussi les 4 déjà
   déclarées dans `schemas.ts:32-37`. Le §13 valide donc le pilote.
3. **Le TDR §2 conforte la décision « sans CSS »** : « CSS » figure dans la liste
   de ce qu'il ne faut pas exposer. Et le **TDR §3.2 « Puissante à la demande »**
   est exactement le principe du mode « Avancé » replié.

**Ce qui a été tranché** — **amendement du TDR §13, §13.1, daté du 2026-09-20** :

- Les **variantes maîtrisées** restent la voie par défaut et l'interface exposée
  en premier. Le §13 n'est pas abrogé.
- Les **valeurs libres** (couleurs, tailles, espacements) sont ouvertes **derrière
  un dépliage « Avancé »**, fondé sur le **TDR §3.2 « Puissante à la demande »**.
- Le **CSS arbitraire reste exclu** (conforme au TDR §2, et seule valeur à portée
  de sécurité).
- **Trois garde-fous non bloquants** : avertissement de contraste WCAG, « revenir
  au thème » en un clic, mode Avancé replié.
- **Ce que l'amendement ne protège pas**, écrit noir sur blanc dans le TDR : les
  valeurs saisies échappent à toute vérification automatique.

### 11.6 Modèle retenu, en une phrase

> **Quatre dispositions nommées par section, visibles tout de suite — et, pour
> qui ouvre « Avancé », des couleurs, tailles et espacements libres, avec un
> avertissement de contraste et un retour au thème en un clic.**

Le pilote reste **la Bannière**, dont les 4 dispositions sont celles du TDR §13 et
celles déjà déclarées dans le code.

---

## 12. Inspecteur « Modifier » (2026-09-21) — ce qui est livré, ce qui attend

Lot incrémental de la colonne **Modifier** (`PropertyPanel`), après Structure et Aperçu.

**Repris des CMS (sans copier une marque)** : presets nommés pour la structure ;
nombres **bornés** (curseur + plus/moins, clamp à la saisie) ; pas de panneau CSS.

**Livré**

- Tiroirs **Disposition / Contenu / Options** (même chrome que Structure).
- Plafonds `min` / `max` / `step` sur les champs `number` **déjà consommés**
  (plats de la Carte, articles du Journal) et sur le zoom du bloc Plan (non rendu).
- Validation modèle : message FR si la valeur sort de l’intervalle.

**Arbitrage — tokens de présentation par bloc : non**

Le TDR §13.1 ouvre des valeurs libres derrière « Avancé » (`settings` jsonb).
Cela suppose un contrat lu par chaque composant public (couleurs, tailles, marges),
des garde-fous de contraste, et un « revenir au thème ». **Pas implémenté ici** :
aucun champ mort, pas de `titleScale` sur la Bannière (le titre a une taille
fixe dans `Hero.tsx`, l’exposer sans la consommer mentirait). À trancher avant
toute migration ou nouveau schéma « design tokens par bloc ».

---

## 12. Cadre du site (en-tête et pied) et boîte à outils texte

L’en-tête n’est **pas** une section de page : c’est un **bloc système** dans
Structure (non supprimable, hors réordonnancement). Le pied non plus : le
composant `Footer` reste unique, branché sur les réglages du restaurant.

Éléments nommés (WordPress template parts / Shopify header-group) : nom,
liens du menu, bouton Réserver, accroche, coordonnées, horaires, réseaux.
Pas de HTML libre dans le cadre.

Boîte à outils texte : **Gras / Italique / Lien** sur les champs `inlineMarkup`
(sous-titres, récits, descriptions). Le rendu n’accepte que `strong|em|a[href]`.

