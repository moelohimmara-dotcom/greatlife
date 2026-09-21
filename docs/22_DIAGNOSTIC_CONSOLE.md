# 22 — Diagnostic visuel et ergonomique de la console

> **Nature du document** : diagnostic. Il ne corrige rien, il ne décide rien.
> Les corrections proposées sont regroupées en fin de document sous « Pistes, non validées » et n'engagent pas le propriétaire (AGENTS.md §14).
> **Date** : 2026-09-21. **Objet** : la console d'administration (`/admin`), comparée au reste du projet.

---

## 1. Objet, et deux mises au point de méthode

Le propriétaire a demandé un « véritable diagnostic » du frontend de la console, jugé
disparate, grossier, avec une « sidebar qui s'efface », du « figé » et une
« ergonomie chaotique ».

Deux mises au point avant toute conclusion :

1. **Le skill `multi-model-review` n'existe pas** dans l'environnement de travail. Il n'a
   pas été utilisé, et aucun audit n'a été produit sous ce nom. Le substitut retenu est
   **deux audits indépendants à angles distincts** (conformité aux Web Interface
   Guidelines ; écart de jetons entre console et site public) plus des **mesures
   navigateur** que les agents ne peuvent pas produire, puis confrontation des trois.
2. **Il n'existe aucun fichier `design.md` dans ce dépôt** — vérifié : `glob **/design*.md`
   → 0 résultat, racine et `docs/` compris. La demande « le design system n'est plus
   respecté » ne peut donc pas être instruite contre ce document. Le design system
   réellement présent est **en code** (§3). Si le document existe hors du dépôt, il doit
   être fourni pour servir de référentiel.

**Ce que ce diagnostic mesure.** Il mesure des **écarts et des comptes**, pas une
perception. La perception (« grossier ») est réelle mais elle n'est pas mesurable
statiquement ; ce document en mesure les causes vérifiables et désigne explicitement ce
qu'il n'a pas pu établir (§8).

**Trois registres sont distingués partout** : **[mesuré]** = observé au navigateur sur la
production ; **[compté]** = décompte mécanique dans les sources ; **[déduit]** =
raisonnement à partir des deux précédents.

---

## 2. Ce qui n'est PAS cassé

Un diagnostic qui ne dit que le mal est un mauvais diagnostic. Constats positifs, mesurés :

- **[mesuré]** Sur **21 éléments interactifs visibles** de la console, **0 est sans nom
  accessible** (au sens le plus large : `aria-label`, `title`, ou contenu textuel).
- **[compté]** `*:focus-visible` existe et est correct (`src/index.css:25-29`) : anneau de
  2 px, décalage 2 px. C'est le remplacement de focus de référence, à conserver.
- **[compté]** Aucune famille de police codée en dur, ni dans la console ni dans le site :
  les deux passent par `var(--f-heading)` / `var(--f-body)`. **L'alignement typographique
  des familles est bon** (il ne l'était pas avant le 2026-09-21, voir N-16 dans `19_CHANTIERS.md`).
- **[compté]** **Un seul catalogue d'icônes** pour tout le projet (`src/lib/icons/index.tsx`) :
  31 appels côté public, 59 côté console. Pas de doublon de catalogue.
- **[compté]** Les listes glisser-déposer `dnd-kit` de l'éditeur ont un **équivalent clavier**
  (`SectionList.tsx:58-61`) et une poignée correctement nommée (`SectionList.tsx:146-155`).
- **[compté]** Les dates et les nombres passent par `Intl` (`toLocaleString('fr-FR', …)`),
  pas par des gabarits de chaîne. Réserve : la locale est figée à `fr-FR` alors que le
  produit est bilingue.
- **[compté]** `editor/chrome.tsx:9-11` porte déjà une micro-tokenisation
  (`CIBLE = 44`, `RAYON = 10`, `ESPACE = 8`) cohérente avec la recommandation de 44 px.
  C'est un point de départ, pas un problème.

---

## 3. Le système de design existe — mais il n'est écrit nulle part

**[compté]** Aucun fichier de jetons (`grep tokens|designTokens|--radius|--space` dans
`src` → 0) et **un seul fichier CSS** dans tout le dépôt (`src/index.css`, 73 lignes,
presque uniquement des media queries).

**[compté]** Le contrat réel :

| Brique | Fichier | Contenu |
|---|---|---|
| Palettes | `src/config/themes.ts` | **4 palettes** (gourmand, premium, nature, tropical), **15 couleurs** chacune |
| Polices | `src/config/fonts.ts` | **3 paires** (fraunces, playfair, jakarta) |
| Variables CSS | `src/contexts/SiteContext.tsx:251-270` | **17 variables** : 14 `--c-*`, 2 `--f-*`, 1 `--dark`. **Pas de `--c-bg`** |
| Composants porteurs de style | `src/components/ui/` | `OrganicCard` (rayon 20), `SectionHead`, `Reveal`, `BadgePill`, `shadows.ts` |
| Stubs sans style | `src/components/ui/` | `Button`, `Input`, `Label`, `Textarea`, `Select*` : relais DOM, **zéro style** |
| Points de rupture | `src/index.css` | **deux seulement** : `768px`, `480px` |
| Tailwind | `tailwind.config.ts` | 4 couleurs, `borderRadius.organic`, `boxShadow.soft` — **quasi inutilisé** |

**[compté]** Trois couches de jetons concurrentes coexistent : la palette JS (`theme.*`),
les variables CSS (`--c-*` / `--f-*`) et un `tailwind.config.ts` partiel. **Elles ne
couvrent pas le même périmètre** — c'est la racine structurelle du désordre.

### 3.1 La divergence est BIDIRECTIONNELLE, pas « console contre le reste »

C'est la conclusion la plus importante, et elle contredit la formulation de la demande.

**[compté]** Occurrences de couleurs littérales non-jeton :

| Population | Hex non-jeton / total | Où |
|---|---|---|
| Site public | **63 / 69** | dont la carte SVG de `Localisation.tsx` : **20 valeurs distinctes, 34 occurrences** (mesure directe) |
| Console | **10 valeurs distinctes, 83 occurrences** | dont `#dc2626` ×47 (vérifié indépendamment) |

**[compté]** Le même rouge étranger existe des **deux côtés** : `AdminPanel.tsx` (47 fois)
**et** `cms/renderer/ErrorBoundary.tsx:73-80` (`#b91c1c`, `#991b1b`, `rgba(220,38,38,…)`).

**[déduit]** La différence n'est donc pas « site propre / console sale ». Elle est
**quantitative et structurelle** :
- le site public dilue ses valeurs étrangères dans des **illustrations** (cas d'usage
  défendable) ;
- la console les met dans des **contrôles fonctionnels répétés** (`#dc2626` sur des boutons
  de suppression), donc **visibles partout et comparables d'un module à l'autre**.

C'est très probablement ce qui produit le ressenti « grossier » : la répétition.

### 3.2 Le système n'a pas de couleur de danger — et la console s'en est inventé une

**[compté, vérifié]** `themes.ts` ne définit **aucune** couleur de danger, d'erreur ou de
succès. La seule couleur d'alerte du système est `t.accent` (`#C44536` en gourmand).
Or `#dc2626` — qui est **`red-600` de Tailwind par défaut**, pas un jeton du projet —
apparaît **47 fois** dans `AdminPanel.tsx`. La console a donc instauré son propre code
couleur d'alerte sans l'inscrire dans les palettes.

**[compté]** Deuxième palette de statut, également non tokenisée : `#b8860b`
(darkgoldenrod, 8 fois) et `#16a34a` (Tailwind `green-600`, 3 fois) pour
« Invité / Actif / Suspendu ».

---

## 4. Défaut n°1, le plus grave : la coquille ne tient pas, et la barre s'en va

C'est le défaut que le propriétaire a nommé le premier, et c'est le seul qui **casse**
l'usage au lieu de le dégrader. **[mesuré]** en production, fenêtre réelle.

### 4.1 Mesures

| Fenêtre | Hauteur de la barre | Hauteur de fenêtre | Bloc « Déconnexion / Voir le site » | La page défile |
|---|---|---|---|---|
| 1024 px de large | **1179 px** | 674 px | **hors écran** | oui (1179 px) |
| 900 px | **1411 px** | 674 px | **hors écran** | oui (1411 px) |
| 800 px | **1451 px** | 674 px | **hors écran** | oui (1451 px) |

**Le test décisif** : `window.scrollTo(0, 400)` fait passer le haut de la barre de
**0 → −400 px**. La barre n'est ni `fixed` ni `sticky` : **elle défile avec la page et
disparaît**. Et `main.scrollTop = 400` reste à **0** — malgré son `overflow: auto`
déclaré à `AdminPanel.tsx:148`, le bloc principal **ne défile pas**.

**[déduit]** La coquille « barre fixe + contenu défilant » que le code annonce **ne
fonctionne pas** : c'est le *document* qui défile, donc la barre part avec le contenu.
`aside` a `height: 100%` et `nav` a `flex: 1; overflow: auto`, mais la contrainte de
hauteur ne se propage pas jusqu'à la fenêtre — le contenu impose 1179 px, donc plus rien
n'est borné.

### 4.2 Ce qui fonctionne, en revanche

Le point de rupture mobile (`src/index.css:54-72`, à `768px`) **fonctionne** :
**[mesuré]** à ≤ 769 px la barre est masquée, le hamburger passe en `flex`, et le tiroir
s'ouvre correctement (1 panneau `fixed` contenant bien la barre). La barre ne « s'efface »
donc **pas** à cause du responsive : à cause du défilement.

### 4.3 Défaut secondaire du même bloc : le tiroir mobile

**[compté]** `AdminPanel.tsx:175-180` : pas de `role="dialog"`, pas d'`aria-modal`, pas de
gestion d'Échap, pas de piégeage de focus. **[mesuré]** `overscroll-behavior: auto` au lieu
de `contain` : le fond de page défile sous le tiroir ouvert.

---

## 5. Défaut n°2 : aucune échelle n'est maîtrisée

**[compté]** Sur `AdminPanel.tsx` seul (≈3000 lignes) :

| Dimension | Valeurs distinctes | Détail |
|---|---|---|
| Tailles de police | **19 pas** / **317 déclarations** | 10, 11, **11.5**, 12, **12.5**, 13, **14.5**, 15, 16, 17, 18, 22, 24, 26, 30, 34, 36, 44 |
| Rayons (console) | **9** | 3, 7, 8, 10, 12, 14, 16, 18, 100 |
| Rayons (public) | **9** | 2, 8, 10, 12, 14, 16, 20, 24, 100 |
| `padding` (console) | **80** | `7px 14px`, `9px 12px`, `3px 9px`, `5px 11px`… |
| `padding` (public) | **57** | — |
| `gap` | **24** (console) / 23 (public) | 5, 7, 9, 14… |
| `style={{…}}` | **694** (console) / 306 (public) | dont **531** dans le seul `AdminPanel.tsx` |
| `className=` | **4** (console) / 38 (public) | la console est ~100 % inline |

**Les échelles de rayons sont DISJOINTES.** Six valeurs seulement sont communes (8, 10, 12,
14, 16, 100) : le site a 20 et 24, la console a inventé **3, 7 et 18**. C'est le marqueur
le plus net de « système non respecté » — et il est mesurable.

**[compté]** La même taille est écrite tantôt nombre, tantôt chaîne : `fontSize: 12` à
`AdminPanel.tsx:415` contre `fontSize: '13px'` à `:458`. 29 formes brutes pour 19 pas.

**[compté]** Une autre correction à la formulation de la demande : **la console n'est pas
« en classes » et le site « en inline »**. Les deux sont massivement inline. Ce n'est donc
pas une divergence de méthode, mais un **volume** deux fois supérieur côté console.

---

## 6. Défaut n°3 : quatre systèmes de boutons concurrents

**[compté]** Dans la console :

| Système | Fichier | Occurrences (console entière) |
|---|---|---|
| `PrimaryButton` | `admin/ui.tsx:100` | plusieurs dizaines |
| `GhostButton` | `admin/ui.tsx:80` | plusieurs dizaines |
| `Bouton` | `admin/editor/chrome.tsx:114` (avec `CIBLE=44`, `RAYON=10`) | 27 |
| `Button` (stub sans style) | `components/ui/button.tsx` | 6 |
| `<button style={…}>` bruts | `AdminPanel.tsx` | **44** (vérifié) |

**[compté]** Aucun des deux systèmes nommés ne porte d'état `:hover`
(`chrome.tsx:81-104` : `transition` déclarée, mais aucun `:hover`) — **[compté]** 43 boutons
natifs sur 44 sont sans retour visuel au survol.

---

## 7. Défaut n°4 : accessibilité — trois manquements réels, mesurés

### 7.1 Contraste — échec sur la couleur du système lui-même

**[mesuré]** au navigateur, seuils WCAG AA (4,5:1 petit texte, 3:1 grand texte) :

| Élément | Couleur | Taille | Ratio | Verdict |
|---|---|---|---|---|
| Grands chiffres « 1 » et « 4 » des cartes | `rgb(212,145,47)` = **`t.gold` `#D4912F`** | 44 px / 700 | **2,66:1** | **échec**, même pour un grand texte |
| Sous-titre du tableau de bord | `rgb(122,113,106)` = `t.muted` | 14 px / 400 | **4,18:1** | échec (seuil 4,5) |
| Textes secondaires | `t.muted` | 11 à 13 px | 4,78:1 | conforme |
| Badge de notification | blanc sur accent | 12 px / 700 | 4,94:1 | conforme |

**Point important** : la couleur qui échoue est **`t.gold`, un jeton du système** — pas une
valeur étrangère. Le défaut est donc **dans la palette** (or sur crème), pas seulement dans
la console. Les deux autres palettes sont à vérifier de la même façon.

### 7.2 Cibles tactiles

**[mesuré]** 5 éléments sur 21 sous les 44 px recommandés, dont **« ← Voir le site » à
18 px de haut** (`AdminPanel.tsx:119`) et les trois pilules de période à 33 px. C'est la
mesure que l'audit statique ne pouvait pas fournir : il les déduisait des `padding`.

### 7.3 Noms accessibles et annonces

**[mesuré]/[compté]** Deux constats à réconcilier, car ils ne se contredisent pas :

- **[mesuré]** 21 éléments interactifs visibles, **0 sans nom accessible** — mais beaucoup
  le tirent de `title`.
- **[compté]** Seulement **2 `aria-label`** dans tout `AdminPanel.tsx` (2984 lignes). Or
  `title` ne s'affiche **ni au focus clavier, ni au toucher** : c'est le nom accessible le
  moins fiable qui existe. **[déduit]** Le nom « existe » au sens technique et manque au
  sens pratique.

Manquements associés, comptés :
- **73 `FieldLabel`** sans `htmlFor` et sans enfant-contrôle (plus 10 dans `PropertyPanel.tsx`,
  2 dans `LoginScreen.tsx`) : cliquer le libellé ne focalise pas le champ. Sur un CMS destiné
  à un non-technicien, c'est le manquement le plus coûteux en usage.
- **0 `aria-live` / `role="status"` / `role="alert"`** dans la console : sauvegardes,
  suppressions, téléversements se font **sans annonce**.
- **4 interrupteurs sans nom accessible** (Visibilité, RBAC).
- **0 `aria-hidden`** sur les icônes décoratives (≈47 appels `Icon.*`).
- **0 `tabular-nums`** : les chiffres ne sont pas alignés en colonne.
- **0 `prefers-reduced-motion`** dans tout le dépôt, alors que `index.css:10`
  (`scroll-behavior: smooth`), deux `animation: pulse` et framer-motion sont en jeu.
- **7 `transition: 'all'`** (sur 7 transitions déclarées).
- **Suppression de média sans confirmation** (`AdminPanel.tsx:882-893`, appelée en `:1046`),
  alors que messages, commandes et réservations en ont une.
- **0 garde de navigation** avec modifications non enregistrées : l'éditeur peut perdre un
  travail en quittant la page.
- La navigation de la barre latérale est en `<Bouton>` et **ne met pas l'URL à jour**
  (`AdminPanel.tsx:88-105`) : pas de lien partageable, pas d'`aria-current` — alors que les
  cartes du tableau de bord, elles, écrivent `?module=`.

### 7.4 Un de mes propres chiffres était faux — retiré

J'avais compté « **257 `transition: all`** » en interrogeant le navigateur. **Faux** :
`all` est la valeur **par défaut** de `transition-property`, donc presque tout élément la
« porte » sans qu'aucune règle ne l'ait écrite. Le vrai compte, établi par lecture des
sources, est **7**. Je retire le premier chiffre.

---

## 8. Les dix constats les plus lourds, classés

| # | Constat | Preuve | Nature |
|---|---|---|---|
| 1 | **La barre latérale défile avec la page** et sort de l'écran ; le bloc utilisateur est inatteignable sur fenêtre courte | [mesuré] barre de 1179 à 1451 px pour 674 px de fenêtre ; `scrollTo(0,400)` → top `0 → −400` ; `main.scrollTop` reste 0 | Casse l'usage |
| 2 | **73 libellés non associés** à leur champ | [compté] `AdminPanel.tsx` (tout) + `PropertyPanel.tsx:165-456` + `LoginScreen.tsx:47,52` | Casse l'usage |
| 3 | **Aucune annonce d'état asynchrone** (0 `aria-live`) | [compté] `AdminPanel.tsx:166,474,990,2192,2205,2415,2650,3029` | Casse l'usage |
| 4 | **Contraste insuffisant de `t.gold`** sur le fond crème | [mesuré] 2,66:1 pour un seuil de 3:1 en grand texte | Défaut de palette |
| 5 | **Échelles de rayons disjointes** entre console et site | [compté] public {2,8,10,12,14,16,20,24,100} vs console {3,7,8,10,12,14,16,18,100} | Système |
| 6 | **Quatre systèmes de boutons** + 44 `<button>` bruts, sans `:hover` | [compté] `ui.tsx`, `chrome.tsx`, `components/ui/button.tsx`, `AdminPanel.tsx` | Système |
| 7 | **`#dc2626` ×47** : couleur de danger inventée, absente des palettes | [compté, vérifié] `AdminPanel.tsx` ; aucune occurrence dans `themes.ts` | Système |
| 8 | **Navigation sans URL** et sans `aria-current` | [compté] `AdminPanel.tsx:88-105` | Ergonomie |
| 9 | **Suppression de média sans confirmation** | [compté] `AdminPanel.tsx:882-893`, `:1046` | Perte de donnée |
| 10 | **Zéro `prefers-reduced-motion`** dans tout le dépôt, 7 `transition: all` | [compté] `index.css:10` ; `AdminPanel.tsx:366,704,971,2161,2389,2588,2721` | Accessibilité |

---

## 9. Pistes, non validées

> Rien ici n'est décidé ni engagé. Chaque piste est un constat transformé en hypothèse, et
> la question de fond — **une charte unique, ou une charte propre à la console ?** — est un
> arbitrage qui appartient au propriétaire (AGENTS.md §14). Un thème de console distinct
> est un choix défendable et courant.

1. **Réparer la coquille avant tout le reste.** Le défaut n°1 n'est pas esthétique : il
   empêche d'atteindre la déconnexion sur une fenêtre courte. Il se corrige seul, sans
   toucher au reste.
2. **Écrire les jetons qui manquent** — et d'abord les **couleurs d'état** (danger, succès),
   dont l'absence explique très probablement l'apparition de `#dc2626`. Sans cela, la dette
   se reconstituera.
3. **Unifier les deux échelles de rayons** : les six valeurs communes (8, 10, 12, 14, 16, 100)
   sont un point de départ objectif.
4. **Étendre ou fusionner `CIBLE/RAYON/ESPACE`** de `editor/chrome.tsx:9-11`, qui est déjà
   une micro-tokenisation cohérente avec la cible de 44 px.
5. **Corriger le contraste de `t.gold`** — dans la palette, pas dans la console : c'est le
   seul défaut de contraste qui touche le système lui-même.

---

## 10. Ce qui n'a pas pu être établi

- **La perception elle-même.** Ce document mesure des écarts de valeurs, des cibles et des
  contrastes. Il ne mesure pas le rendu global, et « grossier » reste un jugement humain.
- **L'existence d'un `design.md` hors du dépôt.** Non vérifiable d'ici.
- **La version des Web Interface Guidelines appliquée** : la liste de
  `vercel-labs/web-interface-guidelines` a été récupérée au moment de l'audit ; aucune
  vérification de version n'est possible depuis le dépôt.
- **Les totaux de `padding` et de `gap`** sont des ordres de grandeur : les comptages sont
  faits par expression régulière, pas par analyse syntaxique.
- **Le repli responsive de la grille 3 colonnes de l'éditeur** (`PageEditor.tsx:230`,
  `'260px 1fr 320px'`) n'a pas été testé à l'écran sous 900 px.
- **Les 3 autres palettes** (`premium`, `nature`, `tropical`) n'ont pas été mesurées en
  contraste ; seul le thème actif (`gourmand`) l'a été.

---

## 11. Méthode et sources

- **Deux audits indépendants, angles distincts, lecture seule** : (a) conformité aux
  Web Interface Guidelines, fichier par fichier ; (b) écart de jetons entre la console et
  le site public. Les deux ont rendu des constats `fichier:ligne`.
- **Mesures navigateur en production** (`https://greatlife-conakry.pages.dev/admin`,
  bundle `index-B6r71Ip6.js`) : 11 largeurs de fenêtre par redimensionnement réel via CDP,
  test de défilement, contraste WCAG calculé, cibles tactiles, noms accessibles, tiroir mobile.
  Une première tentative d'émulation de viewport a silencieusement échoué (toutes les
  mesures annonçaient la même largeur) : **ces lignes ont été jetées**, pas publiées.
- **Vérification indépendante des chiffres les plus lourds** : `#dc2626` ×47 et `<button>` ×44
  dans `AdminPanel.tsx`, recomptés séparément ; absence de couleur de danger dans
  `themes.ts` confirmée ; `t.gold = #D4912F` identifié comme la couleur mesurée à 2,66:1.
- **Grille normative** : `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`.
- **Fait déjà consigné dans le dépôt** : `docs/01_EXISTING_PROJECT_AUDIT.md:430-444`
  relève déjà « styles inline massifs, non personnalisable ». Ce diagnostic ne fait que le
  chiffrer et le localiser.
