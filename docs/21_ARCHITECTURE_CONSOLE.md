# 21 — Architecture de la console : console hybride ou tout-CMS

> **Date** : 2026-09-20 · **Statut** : arbitrage appliqué (plan validé par le
> propriétaire). Carte des couloirs : `scripts/couloirs.json` + `npm run
> verify:couloirs` (AGENTS.md §19).

---

## 1. La question posée

« Faut-il remplacer toute la console par le CMS, ou inclure une partie CMS au
sein de la Console admin — c'est-à-dire conserver les sections qui existaient
déjà ? »

**Réponse tranchée : l'hybride assumé.** La console reste l'interface unique.
Le CMS (« Modifier le site ») en est le module de composition de page. Les
modules opérationnels ne passent pas au CMS. C'est le modèle de Shopify :
l'administration (commandes, clients, analytics) est distincte de l'éditeur de
contenu — pour la même raison ici : on ne « publie » pas une réservation.

Ce n'est pas du statu quo. Deux défauts d'architecture, mesurés avant correction,
sont traités à ce lot (§3 et §4).

---

## 2. Les quatre étages

Chaque étage de la navigation correspond à une nature de donnée différente.

| Étage | Modules | Nature |
|---|---|---|
| **Pilotage** | Tableau de bord, Commandes, Messages, Réservations | Opérations. Jamais du CMS. |
| **Contenu** | Modifier le site, Équipe & contenus, Carte & prix, Blog | Contenu. |
| **Apparence** | Thème & ambiance, Médias, Visibilité | Réglages d'apparence. |
| **Système** | Utilisateurs & rôles, Formulaires & emails, Réglages globaux, Journal d'activité | Administration. |

Le choix hybride se justifie module par module. Les modules de Pilotage n'ont
aucune sémantique de publication : « publier une commande » ne correspond à rien.
Les modules de Contenu sont du contenu, mais seuls les **sections de page**
passent par le CMS ; leurs voisins suivent leur propre cycle (un article se
publie quand il est prêt, un prix change plusieurs fois par jour). Les étages
Apparence et Système sont des réglages, pas du contenu à figer.

---

## 3. Le défaut central mesuré : l'écriture en bloc

Avant ce lot, quatre écrans de contenu partageaient le même objet `content`
(état global au `SiteContext`) et la même écriture, qui persistait l'objet
ENTIER à chaque clic sur « Enregistrer ».

Schéma du défaut :

```
   écran Équipe                 écran Réglages
        save()                       save()
             ↘                        ↙
      site_config.value — écrasement TOTAL
```

Un champ vide dans l'écran A écrasait donc la valeur publiée depuis l'écran B.
C'est la cause première du piège documenté dans `docs/19 §7`, et de la
duplication des coordonnées. Au total : six écrans, trois chemins d'écriture,
deux emplacements de données — le moindre oubli d'un champ écrivait le domaine
du voisin.

---

## 4. Le correctif appliqué : écriture par domaine

Deux couches distinctes. La décision est extraite en module **pur** (vérifiable
sans base de données, comme `save-plan.ts`), l'exécution est dans le dépôt.

**Module pur, testé** — `src/cms/model/contenu-patch.ts` :

- `fusionnePatch(active, patch)` — une clé absente du patch survit intacte,
  quelle que soit sa valeur. C'est la propriété qui ferme le piège.
- `fusionBilingue(...)` — fusionne un `fr` sans détruire l'anglais (leçon de la
  migration 032, revue I6).
- `clefsCoordonnees(patch)` — dresse la liste des clés de coordonnées à
  refléter vers la ligne `restaurant`.

**Dépôt** — `src/lib/repository.ts` :

- `updateSiteContentFields(patch)` — contenu de console, miroir `restaurant`
  ciblé.
- `updateSiteConfigFields(patch)` — thème, polices, visibilité, RBAC.
- `saveSiteConfig(config)` — replacement complet, mais **réservé** à l'import de
  configuration (choix explicite d'écrasement dans l'écran Réglages globaux).
- L'ancien `saveContent(content)` (écriture totale) a été **supprimé** : plus
  aucun appelant, et chaque écran passe désormais par une écriture de domaine.

Répartition écran → écriture :

| Écran | Écrit (son domaine) |
|---|---|
| Thème & ambiance | `themeId`, `fontId` |
| Visibilité | `visibility` |
| Équipe & contenus | `team`, `engagements`, `testimonials` |
| Formulaires & emails | `autoReply` |
| Réglages globaux | identité, coordonnées, horaires, réseaux, destinataires |
| Import de configuration (exception volontaire) | remplacement complet |

**Filet de surveillance** : `npm run verify:ecrans`. Il lit le code des écrans
et vérifie statiquement que chaque « Enregistrer » n'écrit que son domaine.
Il échoue si un écran écrit un champ voisin (écrasement latent) ou type
d'écriture redevenu implicite. Un témoin de sensibilité démontre qu'il refuse un
écran qui écrirait hors de son domaine.

---

## 5. La frontière PUBLICATION / DIRECT — tranchée par type

| Contenu | Chemin | Décision | Pourquoi |
|---|---|---|---|
| Sections de page | BROUILLON → PUBLIER | **publication** | le restaurateur prépare, prévisualise, publie. C'est le cœur du CMS. |
| Menu & prix | direct | **direct** | les prix bougent tous les jours, souvent plusieurs fois par jour. Une publication à chaque ajustement serait ingérable. |
| Blog | direct | **direct** | un article se publie quand il est prêt ; le cycle est individuel. |
| Thème, Visibilité, coordonnées, destinataires | direct | **direct** | ce sont des réglages, pas une page qu'on prépare. |
| Équipe, engagements, témoignages | direct | **direct** | contenus opérationnels vivants, pas du contenu de page figé. |

**Conséquence assumée et écrite ici** : changer un prix est visible
immédiatement par le public. C'est un choix, pas un oubli. Le protéger du TDR
§22 n'était possible que pour les SECTIONS de page — le reste du contenu vit en
direct par décisions maintes fois en attente depuis le début du projet.

À re-rebaser si besoin en passant tout sous publication : coût mesuré
(instantané v2, versions archivées non restaurables).

---

## 6. Reste à arbitrer

- **Visibilité ↔ CMS (interim J3, 2026-09-23)** : l’écran Visibilité ne prétend
  plus piloter les blocs de la page publiée. Copy + guide + CTA « Enregistrer »
  (chemin **direct**, §5) vs renvoi vers **Modifier le site** (œil +
  « Mettre à jour le site ») pour `page_sections.visible`. Les interrupteurs
  « Pages » restent en panneau *Secours historique* (legacy `PublicSite` seulement).
  **Branchement technique** Visibilité → `page_sections.visible` : **non fait** —
  touche le rendu public ; à trancher avant d’écrire du code.
  Expositions RLS résiduelles (migration `031` §2 : `navigation_items` live) :
  hors UX J3 — porte sécu séparée.
- La note `docs/18` (mode Avancé du TDR §13.1) reste à implémenter par l'agent
  de sections. Sa décision (§13.1) reste fermée.

---

## 7. Documentation connexe

- `docs/10_PUBLISHING_VERSIONING.md` — chaîne de publication des sections.
- `docs/18_DISPOSITIONS_DE_BLOC.md` — dispositions et mode Avancé (TDR §13.1).
- `docs/19_CHANTIERS.md` — registre de couverture (N-1 à N-14).
- `scripts/couloirs.json` + `verify:couloirs` — carte des couloirs vérifiable.
