# AGENTS.md — Greatlife : règles des agents de codage

> **Objet** : contrat de travail de tout agent qui modifie ce dépôt.
> **Sources de vérité** : `docs/00_TDR_GREATLIFE_CMS.md` (TDR maître) et **l'état réel du dépôt**. Ni l'un ni l'autre n'est négociable sans l'accord du propriétaire.
> **Langue** : on interagit et on documente en **français** ; les identifiants de code, chemins et commandes restent en anglais.
> **Phase** : CMS **sans IA**. L'IA est hors périmètre (§18), mais l'architecture doit rester compatible avec un futur AI Copilot.
> **Traçabilité** : ce fichier est la version versionnée des « CODING AGENT RULES » remises le 2026-09-19. `docs/16_FABLE_GOVERNANCE.md` §9 le cite comme référence de ses §11 et §12 — la numérotation ci-dessous est donc stable.

**Ce fichier ne décrit pas l'avancement.** L'état des lots se lit dans le dépôt, l'historique git et `docs/15_IMPLEMENTATION_ROADMAP.md`.

---

## 1. Rôle

Tu es l'ingénieur d'implémentation chargé de faire évoluer le dépôt Greatlife existant vers un CMS de restaurant de qualité production, utilisable par une personne non technique.

Tu **n'es pas autorisé à redéfinir la vision produit** de ta propre initiative. Le TDR et le dépôt sont les sources de vérité.

**Un second agent travaille en amont sur le projet.** Avant d'implémenter : lis l'état réel (git, fichiers, docs) pour ne pas refaire ni contredire son travail. En cas de divergence entre ce que tu observes et ce qu'on t'annonce, **signale-la** au propriétaire au lieu de trancher seul.

---

## 2. Règle première : inspecter avant de modifier

Avant de changer une ligne de code, inspecte :

- le dépôt, `README.md`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, `package.json` ;
- `src/` et `supabase/` (migrations) ;
- l'architecture existante, les composants, les écrans d'administration ;
- l'accès aux données, l'authentification, la RLS.

**Ne jamais supposer une implémentation existante.** Un constat se cite en `fichier:ligne`.

---

## 3. Ne pas réécrire le projet

Privilégier : refactoring incrémental, réutilisation, adaptateurs, migration, extraction, remplacement progressif.

Éviter : réécriture complète, changement de framework, remplacement de dépendances, remplacement de Supabase, remplacement de React/Vite, introduction d'un nouveau backend sans besoin démontré.

---

## 4. UX d'abord

Chaque décision d'implémentation doit répondre à :

> Un restaurateur non technique peut-il comprendre cela sans formation ?

Sinon, simplifier l'interface. Le vocabulaire exposé est celui du restaurateur (Page, Section, Texte, Image, Menu, Plat, Promotion, Galerie, Réservation, Apparence, Prévisualisation, Publier) — jamais celui du développeur (component, props, schema, collection, API, JSON, CSS, database, migration, deployment). Voir TDR §2.

---

## 5. Principe CMS

Contenu, structure et présentation restent **séparables**. Aucun contenu administrable n'est codé en dur dans un composant React public (TDR §4). Un composant de section **affiche** une donnée métier, il ne la **possède** jamais.

---

## 6. Une seule source de vérité

Ne pas dupliquer une donnée de restaurant. Un plat a **un seul enregistrement canonique**. Une page **référence** le contenu au lieu de le copier (TDR §16). Une modification de prix se répercute partout.

---

## 7. Site public

Le site public consomme **l'état publié** du CMS. Un brouillon ne doit **jamais** fuiter vers un visiteur (TDR §22).

---

## 8. Publication

Flux obligatoire : `BROUILLON → PRÉVISUALISATION → VALIDATION → PUBLICATION → EN LIGNE`.

Ne jamais contourner ce flux pour un contenu géré par le CMS.

---

## 9. Sécurité

Ne jamais se reposer sur le front seul. L'autorisation est validée **au niveau base/API**. Respecter la RLS Supabase, y compris les policies Storage (TDR §31). Les messages d'erreur exposés à l'utilisateur ne contiennent ni nom de table, ni numéro de migration, ni jargon technique.

---

## 10. Base de données

Avant de changer le schéma :

1. inspecter le schéma existant ;
2. identifier les dépendances et les données existantes ;
3. consulter Fable (§11) si la migration est conséquente ;
4. écrire une migration **réversible** (`supabase/migrations/` **et** `supabase/rollbacks/`, convention en place) ;
5. tester la migration.

Ne pas créer de table redondante. Ne pas casser de fonctionnalité existante pour une architecture plus élégante (TDR §41).

---

## 11. Fable Advisor

L'exigence « seconde opinion » du TDR (§36-38) est **obligatoire** aux points de décision, et son exécution est encadrée par `docs/16_FABLE_GOVERNANCE.md` (à lire avant toute revue).

**État actuel** : le skill `fable-advisor` n'est pas installé dans cet environnement. Le substitut officiel et documenté est l'agent **`verifier`** (lecture seule, ne corrige rien, mandaté pour contester). Il se délègue par l'outil `task`.

Cas d'invocation obligatoires :

- décision d'architecture difficilement réversible ;
- migration importante de base de données ;
- changement de contrat API ;
- gros refactor ;
- changement sensible de sécurité ;
- un problème qui a résisté à **deux** tentatives de correction (§13) ;
- **revue finale d'un lot important** (§12).

Fable est **advisory et read-only** : il ne code pas. On lui fournit : la décision, les contraintes, les options, les chemins de fichiers pertinents et les preuves. Un verdict de revue **se vérifie avant d'être appliqué** — il peut se tromper.

Verdicts à restituer dans le vocabulaire du TDR §38 : `proceed` · `proceed-with-changes` · `reconsider`. Le verdict est consigné dans le champ « Fable verdict » du rapport (§16).

Flux par lot : `PLAN → FABLE REVIEW → IMPLÉMENTATION → TEST → FABLE FINAL REVIEW → TERMINÉ`.
Flux court (petit changement) : `PLAN → IMPLÉMENTATION → TEST`. Ne pas gaspiller une revue sur chaque micro-modification (TDR §37).

---

## 12. Revue finale

Avant d'annoncer un lot important comme terminé :

1. inspecter le diff cumulé ;
2. lancer les vérifications pertinentes ;
3. vérifier les critères d'acceptation annoncés ;
4. déclencher la revue Fable (§11) ;
5. traiter les constats importants ;
6. re-vérifier.

---

## 13. Règle d'échec

Si le **même** problème survit à deux tentatives de correction sérieuses :

**STOP.**

Ne pas continuer à modifier du code au hasard. Déclencher Fable en fournissant : approches échouées, erreurs, fichiers pertinents, hypothèse courante, contraintes.

---

## 14. Discipline d'implémentation

N'implémenter **que** la tâche en cours. Ne pas embarquer silencieusement des fonctionnalités non demandées. Une amélioration adjacente découverte en route se **documente séparément** et se propose — elle ne se glisse pas dans le lot.

Ne jamais prendre une décision d'architecture non validée par le propriétaire : s'arrêter à la porte de phase et demander l'arbitrage.

---

## 15. Vérification

Ne jamais écrire « ça marche » sans l'avoir vérifié. Distinguer explicitement :

- **implémenté** (code écrit) ;
- **compilé** (`npm run build` — `tsc` puis `vite build`) ;
- **testé** (script/assertion exécuté) ;
- **vérifié manuellement** (parcours réel, navigateur) ;
- **vérifié en production** (URL publique servie).

Filets existants dans le dépôt :

| Commande | Portée |
|---|---|
| `npm run build` | typecheck strict + build de production |
| `npm run verify:lot1` | **12 contrôles** : conformité registre/base, isomorphie du renderer, **non-régression** du rendu vs révision fixe `0528c544` (ex-`9e5efb7`, SHA recalculé par la réécriture d'historique), consommation du contenu CMS. ⚠️ La référence n'est plus surchargeable par mégarde : `BASE_REF` divergent fait **refuser** le script (`GLIFE_ALLOW_REF_OVERRIDE=1` pour forcer sciemment). |
| `npm run verify:lot3` | contrôles §24, versions, instantané, pureté du modèle, vérité en base |
| `npm run verify:public` | le public reçoit **exactement** l'instantané publié ; brouillon fermé au visiteur (§22) |
| `npm run verify:anchors` | les liens écrits dans le site (menu, pied de page) **et les cibles ÉDITABLES des boutons de la page d'accueil** sont confrontés aux ancres de `pages.published_snapshot` ; les composants du site ne recopient aucune coordonnée du restaurant |
| `npm run verify:coordonnees` | les coordonnées **publiées** (téléphone, e-mails, adresse) permettent-elles à un client de vous joindre ? Gabarit détecté, et **domaine e-mail qui ne résout pas** → échec. ⚠️ **Rouge par conception** tant que le propriétaire n'a pas saisi ses vraies coordonnées |
| `npm run verify:ecrans` | chaque écran de console n'écrit que son domaine (lecture statique de `AdminPanel.tsx`) ; échoue sur une écriture-bloc ou un champ hors écran |
| `npm run verify:couloirs` | les fichiers que TA branche modifie appartiennent-ils à TON couloir ? (§19) ; échoue si tu écris chez l'autre agent |
| `npm run verify:publication` | un instantané vide ne peut pas être publié |
| `npm run verify:rbac` | la matrice des rôles est confrontée aux politiques réellement en base |
| `npm run verify:point3` · `verify:i18n` | sous-champs des listes d'objets ; forme bilingue préservée |
| `npm run test:save-plan` | **test exécuté** (`node:test`) du noyau pur de décision de sauvegarde |
| `npm run lint` | ⚠️ **INOPÉRANT** : aucune configuration ESLint n'existe dans ce dépôt (`git ls-tree` : absente, et jamais présente). La commande échoue, elle ne vérifie rien. Soit lui donner une configuration, soit retirer cette ligne — mais ne pas la compter comme un filet. |

**Aucun framework de test tiers n'est installé** (aucune dépendance de test). En
revanche `node:test` est **intégré à Node** : il permet de tester le noyau pur
sans rien installer (`npm run test:save-plan` en est le premier usage). La règle
reste : **ne jamais présenter un lot comme « testé » sur la seule base du build**.
« Testé » veut dire qu'une assertion a réellement été exécutée, et doit dire
lesquelles. Le framework complet (TDR §39 doc 14, §40 Lot 10) reste à faire.

Hygiène : ne pas ajouter de nouveaux journaux `build-*.txt` / `deploy-*.txt` à la
racine ; ces artefacts sont hors dépôt logique. Le `.gitignore` porte désormais
`/*.txt` (racine uniquement) et les sorties de déploiement vont dans `logs/`.

---

## 16. Format de rapport

Chaque tâche terminée est rapportée **en français**, avec ces champs exactement, sans exception et sans « C'est fait. » nu :

```
Implemented:            ce qui a été fait
Files changed:          chemins + numéros de ligne
Database:               migrations / RLS / rollbacks
Tests:                  ce qui a réellement été exécuté
Verification:           niveau atteint (§15) + preuves
Known limitations:      ce qui n'est pas couvert, et pourquoi
Fable verdict:          proceed | proceed-with-changes | reconsider
Next step:              étape recommandée
```

Le rapport précède la clôture du lot. Un lot sans rapport n'est pas clos.

---

## 17. Philosophie produit

Greatlife est **simple en surface, puissant sous le capot** (TDR §44).

Ne pas exposer la complexité d'ingénierie au restaurateur. Le CMS **absorbe** la complexité au lieu de la transférer à l'utilisateur. Ce n'est pas une préférence esthétique : c'est le critère d'acceptation du produit.

---

## 18. IA future

L'IA **ne fait pas partie** de la phase d'implémentation actuelle : pas de chatbot, pas de génération automatique, pas d'agent, pas de Copilot, pas de génération d'images, pas d'automatisation marketing.

Contrainte à respecter **dès maintenant** : un futur Copilot devra manipuler le CMS par des **actions structurées**, jamais en modifiant du code source ou du SQL. Ne pas construire d'architecture qui l'obligerait à le faire.

Actions cibles (TDR §35 — **non à implémenter aujourd'hui**) :
`createPage` · `updatePage` · `addSection` · `removeSection` · `moveSection` · `updateTheme` · `createMenuItem` · `updateMenuItem` · `updateMedia` · `createPromotion` · `publishChanges` · `restoreVersion`

---

## 19. Répartition des chantiers entre agents

**Pourquoi cette section.** Le 2026-09-20, deux agents ont travaillé sur ce dépôt
**le même matin** : l'un a livré le pilote des dispositions de la Bannière
(`d0473d8`, 08:28) et **déployé en production** pendant que l'autre corrigeait la
console en production. Aucun dégât — les filets ont tout rattrapé — mais la
collision était réelle et n'était écrite nulle part. §1 demandait de *signaler*
les divergences ; §19 dit comment les **éviter**.

### 19.1 Couloirs en cours

| Couloir | Branche | Périmètre d'écriture | Agent |
|---|---|---|---|
| **Fiabilité et vérité du dépôt** | `piste/fiabilite-depot` | `scripts/verify-*.mjs`, `scripts/test-*.mjs`, `src/contexts/SiteContext.tsx`, `src/cms/repository/*`, `src/cms/model/save-plan.ts`, `supabase/migrations/*`, `supabase/rollbacks/*`, `AGENTS.md`, `docs/17_BACKLOG.md` | agent de vérification |
| **Modèle d'édition des sections** | *(à confirmer par son auteur)* | `src/sections/*.tsx`, `src/admin/editor/PropertyPanel.tsx`, `src/cms/model/sections/*`, `docs/18_DISPOSITIONS_DE_BLOC.md` | agent Cursor |

**On ne modifie QUE son couloir. Lire le couloir de l'autre est toujours permis**
— `verify:anchors` lit `Hero.tsx`, c'est normal et sans risque.

**Le découpage est exécutable, pas déclaratif** : `scripts/couloirs.json` porte la
carte, et `npm run verify:couloirs` confronte les fichiers que TA branche modifie
aux couloirs. Il échoue si tu écris chez l'autre, avertit sur les fichiers
partagés, et **nomme** à qui appartient ce que tu as touché. **À lancer avant de
pousser.** Le registre lisible, avec ce que personne ne couvre, est dans
**`docs/19_CHANTIERS.md`** — c'est là qu'on voit ce qui reste à faire.

### 19.2 Deux ressources PARTAGÉES, à ne pas se disputer

1. **La production Cloudflare Pages est unique.** Un déploiement écrase le
   précédent, quel que soit l'auteur : deux agents qui déploient le même jour se
   remplacent mutuellement. **Décision du propriétaire (2026-09-20) : les deux
   agents peuvent déployer**, mais on **ne déploie pas depuis une branche de
   travail** — on fusionne dans `main`, puis on déploie, **et on l'annonce**.
2. **La base Supabase est unique.** Une migration ou un `UPDATE` s'appliquent à
   tout le monde. **Règle** : toute écriture en base se fait avec la liste exacte
   des lignes touchées conservée, et une requête de retour arrière écrite
   (modèle : `logs/retour-arriere-messages.sql`).

### 19.3 Avant de fusionner dans `main`

- Rebaser sur `main` (l'autre couloir y aura peut-être avancé).
- `npm run verify:couloirs` — aucun fichier de l'autre couloir touché.
- Relancer **tous** les filets : `npm run build`, `verify:lot1`, `verify:public`,
  `verify:anchors`, `verify:publication`, `verify:rbac`, `verify:point3`,
  `verify:i18n`, `verify:dispositions`, `test:save-plan`.
- Vérifier qu'aucun fichier de l'autre couloir n'a été modifié par mégarde.

### 19.4 Un cas qui n'est PAS une collision

Un fait **constaté** par un agent et **contredit** par l'autre doit remonter au
propriétaire (AGENTS.md §1), pas se régler en force. Le 2026-09-20, ce mécanisme
a servi : le hero public avait changé sans publication, parce que l'instantané
publié portait `fullscreen` (valeur ignorée avant le branchement des
dispositions). Signalé, arbitré par le propriétaire.

---

## Annexes — ancrages projet

- **Dépôt** : `moelohimmara-dotcom/greatlife` — branche de référence `main` — workspace `C:/Users/MARA/Documents/greatlife`
- **Base** : Supabase dédié `atsujzoozqnjelngqkab` — migrations `supabase/migrations/001→029`, rollbacks `supabase/rollbacks/`
- **Prod** : Cloudflare Pages `https://greatlife-conakry.pages.dev` (principal) — Netlify `https://greatlife-conakry.netlify.app` (secours)
- **Documents de référence** : `docs/00_TDR_GREATLIFE_CMS.md` · `docs/01_EXISTING_PROJECT_AUDIT.md` · `docs/03_CMS_ARCHITECTURE.md` · `docs/04_CONTENT_MODEL.md` · `docs/12_DATABASE_SCHEMA.md` · `docs/16_FABLE_GOVERNANCE.md`
- **Documents du TDR §39 non encore écrits** : 02, 05, 06, 07, 08, 09, 10, 11, 13, 14, 15
