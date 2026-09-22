# 19 — Chantiers, couloirs et registre de couverture

> **Objet** : savoir **qui couvre quoi**, et surtout **ce que personne ne couvre**.
> **Source de vérité machine** : `scripts/couloirs.json`, vérifié par
> `npm run verify:couloirs`.
> **Règle** : on n'écrit que dans son couloir. Lire celui de l'autre est toujours
> permis.

---

## 1. Pourquoi ce document existe

Le 2026-09-20 au matin, deux agents ont travaillé sur ce dépôt **sans le savoir** :

| Heure | Qui | Quoi |
|---|---|---|
| 07:35 | agent de vérification (Mavis) | correctif de la console, **déployé** |
| 08:28 | agent Cursor | pilote des dispositions de la Bannière, **déployé** |

Aucun dégât — les filets ont rattrapé, et le second déploiement contenait le
premier. Mais la collision était réelle. Un tableau dans un document n'aurait pas
suffi : **deux agents qui ne se lisent pas ne le respectent pas**. D'où un
contrôle exécutable, `npm run verify:couloirs`, à lancer **avant de pousser**.

---

## 2. Les couloirs

| Couloir | Branche | Périmètre d'écriture | Responsable |
|---|---|---|---|
| **Fiabilité et vérité du dépôt** | `vibe/fiabilite-depot` | `scripts/verify-*.mjs`, `scripts/test-*.mjs`, `src/contexts/SiteContext.tsx`, `src/cms/repository/**`, `supabase/migrations/**`, `supabase/rollbacks/**`, `AGENTS.md`, `docs/17`, `docs/19` | agent de vérification |
| **Modèle d'édition des sections** | `vibe/*` (une branche par fonctionnalité) | `src/sections/**`, `src/admin/editor/PropertyPanel.tsx`, `src/cms/model/sections/**`, `src/cms/renderer/**`, `docs/18` | agent Cursor |

**Fichiers partagés** — permis, mais à **annoncer** : `package.json`,
`src/admin/AdminPanel.tsx`, `src/admin/editor/PageEditor.tsx`,
`src/admin/editor/useEditor.ts`, `docs/00_TDR_GREATLIFE_CMS.md`.

---

## 3. Ressources partagées, et pourquoi ce sont elles qui font mal

**1. La production Cloudflare Pages est unique.** Un déploiement écrase le
précédent, quel que soit l'auteur. *Décision du propriétaire (2026-09-20) :
**les deux agents peuvent déployer**, chacun depuis sa branche une fois fusionnée
dans `main`, et **en l'annonçant**.*

**2. La base Supabase est unique.** Une migration ou un `UPDATE` s'appliquent à
tout le monde. *Règle* : toute écriture conserve la **liste exacte des lignes
touchées** et une **requête de retour arrière** (modèle :
`logs/retour-arriere-messages.sql`).

---

## 4. Registre de couverture

**État au 2026-09-20.** « Couvert » veut dire : une preuve existe (commit, filet
vert, ou mesure citée). Rien ici n'est une intention.

### 4.1 Couvert par l'agent Cursor

Console d'administration (15 modules), RBAC (matrice, granularité, descriptions,
historique, export, groupes, recherche), journal d'activité, e-mails
(invitations, lien magique, changement de rôle, erreurs visibles), site public
(médias, temps réel, blog, SEO, responsive), commandes en ligne, infrastructure
(cache, redirections SPA, déploiement), jeu de documents de passation,
**dispositions de la Bannière** (`d0473d8`), **aperçu de la Carte** (`a135708`).

### 4.2 Couvert par l'agent de vérification

Chaîne de publication (instantané publié, `033`), filets `verify:lot1`,
`verify:public`, `verify:anchors`, `verify:publication`, `verify:rbac`,
`verify:point3`, `verify:i18n`, `test:save-plan`, chargement suivant la session
(`0d7ece1`), nettoyage des lignes de test, configuration SMTP.

### 4.3 **NON COUVERT** — ce que personne n'a fait

| # | Sujet | Couloir | Preuve du manque |
|---|---|---|---|
| **N-1** | Les **montants sont stockés comme texte d'affichage** (`"46 000"`) : aucune somme, aucun tri, aucune comparaison possibles **en base** — `select sum(total)` → `function sum(text) does not exist`. Le parseur est **dupliqué 3 fois** (`AdminPanel.tsx:170`, `AdminPanel.tsx:2095`, `CartContext.tsx:25`). | fiabilité | ⚠️ **Descriptif corrigé le 2026-09-20 — voir §6.** Ma première rédaction disait « chiffre d'affaires incalculable, affiché 0 FG » : **c'était faux**. |
| **N-2** | `SiteContext.tsx` recopie les **4 coordonnées** du restaurant en dur, **sur le chemin public** | fiabilité | `verify:anchors` ne balaie que `src/sections` et `src/components` (26 fichiers) |
| **N-3** | `LivePreview.tsx` et `PageRenderer` sont du **code mort** | fiabilité | aucun `import` dans `src/` |
| **N-4** | `verify:anchors` ne vérifie qu'**une** page publiée (la première trouvée) | fiabilité | `find()` silencieux, revue 3 M-2 |
| **N-5** | `ANCHORS` de `PublicSite.tsx` (rendu historique) n'est **vérifié par rien** | fiabilité | revue 3 M-3 |
| **N-6** | Le **câblage** de `save()` n'a **aucun test** — seul le noyau pur en a | fiabilité | `test:save-plan` couvre `save-plan.ts`, pas `useEditor.save()` |
| **N-7** | `npm run lint` **inopérant** (aucune configuration ESLint dans le dépôt) | fiabilité | `git ls-tree` : absente, jamais présente |
| **N-8** | La **navigation** n'est ni rendue par le site, ni éditable | modèle d'édition | `navigation_items` : 13 lignes, aucun appelant |
| **N-9** | Les **adresses publiques** `contact@` / `resa@greatlife.gn` n'existent pas | données | 🟥 **MESURÉ le 2026-09-20** : le domaine `greatlife.gn` **ne résout pas** (« le nom DNS n'existe pas »), ni MX ni A. Le courrier ne peut pas arriver. Vérifié par `npm run verify:coordonnees` |
| **N-10** | Le **téléphone public** est `+224 000 00 00 00` | données | 🟥 **MESURÉ** : chiffres normalisés `224000000000` — une suite de 9 zéros, c'est un gabarit. Vérifié par `npm run verify:coordonnees` |
| **N-11** | **Réservations de test** dans la console | données | ✅ **CLOS le 2026-09-21 par le propriétaire** : « toutes les données présentes là sont fictives et uniquement pour des tests ». Il n'y a donc rien à trier — le vrai défaut était le **compteur** (N-15), pas la légitimité des lignes. État mesuré : 12 réservations (9 `cancelled`, 2 `confirmed`, 1 `pending`) |
| **N-12** | Le **mode « Avancé »** du TDR §13.1 (valeurs libres + 3 garde-fous) n'est pas implémenté | modèle d'édition | seules les dispositions l'ont été ; libellé dit encore « Variante » |
| **N-13** | `docs/12` annonce les migrations `001→029` alors que `033` existe | fiabilité | en-tête du document |
| **N-14** | Le **hero public** a changé sans publication (publié `fullscreen` ≠ brouillon `image_text`) | à trancher par le propriétaire | ✅ **SANS OBJET, mesuré le 2026-09-21** : les **10 sections** sont identiques des deux côtés (`variant`, `visible`, `content`) — le hero est `fullscreen` **dans les deux**. La publication du 2026-09-20 23:53 a figé le brouillon tel quel. Publier ne changerait rien au site public |
| **N-15** | Les compteurs **« à traiter »** (réservations, commandes) valent `0` au premier chargement | fiabilité | 🟥 **MESURÉ le 2026-09-21** : la base portait **1** réservation et **4** commandes `pending`, l'écran affichait « 0 » pour les deux. `SiteContext.tsx:365-372` chargeait les listes, `:391-392` ne posait que les **totaux** — les compteurs « en attente » n'étaient écrits que par le temps réel (`:549-550`). **CORRIGÉ** : règle unique dans `@/cms/model/compteurs`, 7/7 `test:compteurs`, sensibilité OUI |
| **N-16** | La **console ne portait aucune typographie du site** : elle s'affichait dans la police par défaut du navigateur | fiabilité | 🟥 **MESURÉ le 2026-09-21** : `rootStyle` — qui pose `--f-heading` et `--f-body` — n'était appliqué qu'à `PublicSite.tsx:100`, `LoginScreen.tsx:34` et `PreviewPane.tsx:57`, **jamais à la console**. Tous les `fontFamily: 'var(--f-heading)'` de `AdminPanel.tsx` étaient donc des déclarations invalides. `getComputedStyle(nombre).fontFamily` = « ui-sans-serif, system-ui, … ». **CORRIGÉ** : `AdminShell` applique `...rootStyle` ; vérifié après déploiement — `--f-heading` = `'Plus Jakarta Sans', sans-serif`, `check` = `true`, largeur peinte 437 px contre 421 px pour le repli générique (la police est bien celle-là) |
| **N-17** | La rangée **« À traiter »** était bancale et s'étirait sans limite | fiabilité | 🟥 **MESURÉ le 2026-09-21** : la 3ᵉ ligne de la carte « Messages » était **26 px plus bas** que celle des deux autres, parce que son libellé passait sur deux lignes. **CORRIGÉ** : hauteur de libellé réservée sur deux lignes → écart **0 px** (remesuré) ; et plafond de colonne à **1248 px** centré, puis resserré à **760 px** sur décision du propriétaire (cartes de 243 px, fourchette documentée 200-280 px) → écart entre chiffres **296/307 → 232/243 px** |
| **N-18** | La **coquille de la console** ne tenait pas : la barre latérale défilait avec la page et sortait de l'écran | fiabilité | 🟥 **MESURÉ le 2026-09-21** : barre de **1179 px** (parfois **1451 px**) pour une fenêtre de 674 px ; bloc « Déconnexion / Voir le site » **hors écran** ; `window.scrollTo(0,400)` faisait passer le haut de la barre de **0 à −400 px** ; `main.scrollTop = 400` restait à **0**. CAUSE : un enfant de grille/flex a pour taille minimale celle de son contenu (`min-height: auto`) — sans `minHeight: 0`, `overflow: auto` reste inerte et le parent grandit à la place. **CORRIGÉ** : coquille bornée à `100dvh`, lignes de grille en `minmax(0, 1fr)`, `minHeight: 0` sur `main`/barre/enveloppe/`nav`. **VÉRIFIÉ en production** à 4 hauteurs de fenêtre : `barre_h = vh` exactement, `doc_scrollH = vh`, « Déconnexion » atteignable partout, `scrollTo(0,400)` → `scrollY = 0`, `main.scrollTop = 400` → **400**. Filet `npm run verify:coquille` (7/7, **sensibilité OUI** sur les 7 contraintes) |
| **N-19** | **Aucune charte écrite** : pas de fichier de jetons, d'où 47 `#dc2626` (le `red-600` de Tailwind, étranger au projet), deux échelles de rayons disjointes, 80 valeurs de `padding` en console et un jeton `gold` illisible sur 3 palettes sur 4 | fiabilité | 🟥 **MESURÉ le 2026-09-21** (voir `docs/22_DIAGNOSTIC_CONSOLE.md`) : aucune couleur de **danger/succès/avertissement** dans les palettes ; et une couleur de danger UNIQUE est impossible — `#dc2626` donne 4,83:1 sur le blanc de « gourmand » mais **3,00:1** sur le sombre de « premium ». **ÉCRIT** : `src/config/charte.ts` (échelles + rôles + dérogation par surface), `themes.ts` en devient les thèmes, `variablesCss` devient le producteur UNIQUE des variables, et `npm run verify:charte` (2 contrôles, **sensibilité OUI**) verrouille la dette. **VÉRIFIÉ en production** : 18 variables `--c-*` posées sur le site ET la console, `--c-danger` = `#A81E14`. ⚠️ **Reste à faire (N-20)** : les composants ne consomment pas encore les échelles |
| **N-20** | Les **échelles de la charte ne sont pas encore consommées** par les composants : elles existent et sont verrouillées, mais 191 espacements et 82 couleurs brutes subsistent dans la console | fiabilité | Mesuré par `verify:charte` : `CONSOLE` = 82 couleurs hors rôle, 7 rayons hors échelle, 50 polices hors échelle, 191 espacements hors échelle. Le cliquet empêche d'aggraver ; il ne réduit pas. Coût de migration déjà mesuré : rayons **95 % déjà sur l'échelle** (écart moyen 1,1 px), polices **84 %** (1,1 px), espacements **37 %** mais écart moyen **1,7 px**, maximum 4 px |


---

## 5. Ce que je prends, et dans quel ordre

**Pris par l'agent de vérification** (couloir `fiabilite-depot`) :
`N-1, N-2, N-3, N-4, N-5, N-6, N-7, N-13` — puis `N-9, N-10` avec l'accord
du propriétaire, parce que ce sont des **écritures de données**.

**Clos depuis** : `N-9`, `N-10` (coordonnées saisies et publiées), `N-11` (données
fictives — rien à trier), `N-14` (sans objet : brouillon = publié), `N-15` (compteurs
réparés).

**Non pris, volontairement** :
- `N-8` et `N-12` → couloir **modèle d'édition** (agent Cursor). La navigation et
  le mode Avancé touchent le rendu des sections et le panneau de propriétés.
- `N-11` reste **techniquement ouvert d'une autre façon** : la console garde des
  lignes de test (12 réservations, 3 messages non traités). Ce n'est plus une
  question d'accord — c'est du rangement, sans urgence.

**Ordre recommandé** : **`N-1` d'abord** (les montants en texte), qui est une dette
de maintenance et un obstacle aux états faits en base, mais qui ne casse **rien de
visible**. Puis `N-2` (`SiteContext` sur le chemin public), puis le reste.

**Leçon de `N-15`** : le tableau de bord avait été annoncé « vérifié en
production » sur la foi des **libellés**, sans attente indépendante sur les
**nombres**. Une vérification visuelle ne prouve que ce qu'on a chiffré d'avance.
C'est la sixième affirmation inexacte de la session, et la première qu'un contrôle
croisé avec la base aurait suffi à prendre.

---

## 6. Correction du 2026-09-20 : `N-1` était mal décrit

**Ce que j'avais écrit** : « `orders.total` est en TEXTE → chiffre d'affaires
incalculable, affiché **0 FG** », preuve citée : `sum(total)` échoue en base.

**Ce qui est vrai, mesuré** :

1. Le chiffre d'affaires affiche **0 FG parce qu'aucune commande n'est
   confirmée** : les 4 commandes sont `pending`. Le 0 est **arithmétiquement
   correct**, ce n'est pas un défaut.
2. **L'application calcule correctement.** `AdminPanel.tsx:170-171` fait
   `parseInt(String(s).replace(/[^0-9]/g, ''))` — elle sait lire `"46 000"`.
   Mon raisonnement est parti d'un échec **côté SQL** et j'en ai conclu, à tort,
   que **l'application** ne savait pas calculer.
3. Le défaut réel est plus étroit, et il tient : les montants sont stockés comme
   **chaîne d'affichage** (`"46 000"`, séparateur = espace ASCII `0x20`, mesuré).
   Conséquence : **aucune agrégation, aucun tri, aucune comparaison en base** —
   tout état ou export fait en SQL est impossible. Et le parseur est **dupliqué
   trois fois**, donc un quatrième lecteur le réécrira ou l'oubliera.

**Ce que cette erreur change** : `N-1` n'est **pas** une panne visible, c'est une
**dette de maintenance**. Sa priorité descend, et `N-9`/`N-10` passent devant.
C'est la cinquième affirmation inexacte de la session, et elle suit la même
règle que les précédentes : **une preuve mesurée ne vaut que pour ce qu'elle
mesure** — `sum(text)` échoue en SQL, cela ne disait rien du code de l'écran.

---

## 7. N-9 / N-10 — procédure de saisie, et le piège à connaître

**Décisions du propriétaire (2026-09-20)** : il saisit lui-même, et publie
`moelohimmara@gmail.com` comme adresse de contact.

**Résultat de la mesure, à connaître avant de commencer** :

| | `site_config` — **ce que l'écran pré-remplit** | `restaurant` — **ce que le site publie** |
|---|---|---|
| téléphone | *(vide)* | `+224 000 00 00 00` |
| adresse | *(vide)* | `Conakry, Guinée` |
| horaires | *(vide)* | `Tous les jours · 11h00 — 23h00` |
| contact | *(vide)* | `contact@greatlife.gn` |
| réservation | *(vide)* | `resa@greatlife.gn` |

**Le piège** : l'écran lit une copie **vide**, donc **les champs apparaîtront
vides** — ce n'est pas une perte de données. Mais `saveContent` écrit les **cinq**
coordonnées dans la ligne que le site lit, **quelle que soit la page d'où l'on
enregistre**. Un champ laissé vide **écrase donc la valeur publiée** — y compris
depuis l'autre écran. **Il faut remplir les cinq avant d'enregistrer**, sinon on
efface ce qu'on ne remplit pas (les horaires, par exemple, et le site cesse de
les afficher).

**⚠️ LES CINQ CHAMPS SONT SUR DEUX ÉCRANS DIFFÉRENTS** — précision ajoutée le
2026-09-20 après une première rédaction fausse :

| Écran | Chemin | Champs |
|---|---|---|
| **Réglages globaux** | menu de gauche, groupe **SYSTÈME** | Section « Identité » : *Nom du restaurant*, *Devise*, **Téléphone**. Section « Localisation & horaires » : **Adresse**, **Horaires d'ouverture** |
| **Formulaires & emails** | menu de gauche, groupe **SYSTÈME**, juste au-dessus | Section « Destinataires » : **Destinataire — messages généraux**, **Destinataire — réservations** |

**L'ordre compte** : faire les deux **sans recharger la page** entre les deux
(l'état est partagé en mémoire), puis enregistrer sur **chacun** des deux écrans.

**Ce qu'il faut saisir** :

1. **Téléphone** *(Réglages globaux)* — le vrai numéro, celui qui a WhatsApp (le
   site l'étiquette « Appel & WhatsApp »). Le filet refuse une suite de 6 chiffres
   identiques.
2. **Adresse** *(Réglages globaux)* — **avec le quartier**. « Conakry, Guinée » ne
   permet pas à un client de situer le restaurant.
3. **Horaires d'ouverture** *(Réglages globaux)* — à confirmer ou corriger
   (`Tous les jours · 11h00 — 23h00`).
4. **Destinataire — messages généraux** *(Formulaires & emails)* —
   `moelohimmara@gmail.com`, ou de préférence
   `moelohimmara+greatlife@gmail.com` : Gmail **ignore** ce qu'il y a après le
   `+` et livre au même endroit, mais l'adresse publiée se filtre et se repère.
5. **Destinataire — réservations** *(Formulaires & emails)* — le même, ou une
   variante dédiée.

**À vérifier au passage** : le champ **WhatsApp** *(Réglages globaux, section
« Réseaux sociaux »)* est vide lui aussi.

Puis : `npm run verify:coordonnees` doit passer **au vert**. Tant qu'il est rouge,
un client ne peut pas vous joindre.

---

## 8. Avant de fusionner dans `main`

1. Rebaser sur `main`.
2. `npm run verify:couloirs` — **aucun fichier de l'autre couloir**.
3. Relancer **tous** les filets : `build`, `verify:lot1`, `verify:public`,
   `verify:anchors`, `verify:publication`, `verify:rbac`, `verify:point3`,
   `verify:i18n`, `verify:dispositions`, `test:save-plan`.
4. Annoncer le déploiement.

---

## 9. Journal de campagne console & CMS (sept. 2026)

La campagne Structure / chrome / refonte kit / Vue d’ensemble est consignées dans
**`docs/23_JOURNAL_CONSOLE_CMS_2026-09.md`** (commits, décisions, écarts, déploiement).
