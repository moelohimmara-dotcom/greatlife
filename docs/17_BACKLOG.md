# Greatlife — Backlog

> Demandes identifiées, **non planifiées**. Ce fichier n'engage aucune date et ne
> décrit aucun avancement : l'état réel se lit dans le dépôt et l'historique git.
> Une entrée sort d'ici quand elle est planifiée dans un lot, ou quand elle est
> refusée — dans ce cas on l'écrit aussi, pour ne pas la reproposer.

---

## B-1. Gérer ses identifiants depuis la console d'administration

**Demandé le** : 2026-09-19, par le propriétaire.

**Besoin** : pouvoir **changer et réinitialiser son mot de passe depuis la
console du CMS**, sans passer par le tableau de bord Supabase ni par un autre
outil.

**Pourquoi c'est un vrai besoin, et pas un confort** : aujourd'hui, changer un
mot de passe suppose d'entrer dans Supabase. Le propriétaire n'est pas
administrateur d'infrastructure — il est restaurateur. Le TDR §44 demande que le
CMS absorbe la complexité plutôt que de la transférer à l'utilisateur. Un accès
perdu se règle aujourd'hui en dehors du produit : c'est exactement ce que le
produit doit éviter.

**Ce que ça implique, à instruire avant de planifier** :

1. **L'écran** : un espace « Mon compte » dans la console, avec changement de mot
   de passe et, si possible, la réinitialisation par courriel. Vocabulaire du
   restaurateur (TDR §2) : « mot de passe », jamais « credential », « token » ou
   « auth ».
2. **La sécurité** : Supabase Auth gère déjà les mots de passe. Le CMS ne doit
   **pas** stocker ni comparer de mot de passe lui-même — il appelle l'API
   d'administration. Attention : `updateUser` exige la session de l'utilisateur
   pour son propre mot de passe ; changer celui d'un AUTRE compte exige la clé de
   service, qui ne doit **jamais** atteindre le navigateur (TDR §31). Une
   fonction Edge est probablement nécessaire.
3. **Le cas de la perte d'accès** : si le propriétaire ne peut plus se connecter,
   il ne peut pas atteindre l'écran qui sert à se reconnecter. La réinitialisation
   par courriel doit donc être accessible **avant** connexion, sur l'écran de
   connexion.
4. **La révocation de session** : après un changement de mot de passe, les autres
   sessions ouvertes doivent-elles être fermées ? Question à trancher — elle
   touche à la sécurité.
5. **Le lien avec l'incident du 2026-09-19** : un mot de passe a été publié sur
   GitHub par un script de vérification, puis tourné à la main. Une gestion
   intégrée ne l'aurait pas empêché, mais elle aurait évité que la rotation
   dépende d'un accès à Supabase.

**Ce qui n'est PAS demandé** : ni authentification à deux facteurs, ni gestion
fine des rôles depuis cet écran. Le périmètre est : changer son mot de passe,
et le réinitialiser quand on ne peut plus se connecter.

---

## B-2. Les coordonnées du restaurant existent en double, dans deux lignes

**Constaté le** : 2026-09-20, en corrigeant un défaut bloquant.

**Le fait** : les mêmes coordonnées (téléphone, adresse, horaires, e-mails)
vivent à **deux endroits** de `site_content` :

| Ligne | Qui l'écrit | Qui la lit |
|---|---|---|
| `restaurant` (migration `024`) | l'administration, **depuis le 2026-09-20** | `Localisation.tsx`, `Footer.tsx`, **et les contrôles avant publication** (`publishing.ts`) |
| `site_config` → `value.content` | l'écran « Réglages globaux » | l'écran d'administration lui-même (`SiteContext.content`) |

**Pourquoi c'était bloquant** : avant le 2026-09-20, **seule** la seconde ligne
était écrite — et la première, non vide (`+224 000 00 00 00`), l'emportait à la
lecture. Le restaurateur ne pouvait donc pas changer son numéro de téléphone :
il saisissait la bonne valeur, l'écran disait « Enregistré », et le site public
continuait d'afficher le numéro de remplacement. `saveSetting`, seul écrivain
possible de `restaurant`, était exporté sans être appelé nulle part.

**Ce qui a été fait, et qui est un pont** : les deux lignes sont désormais
écrites à chaque enregistrement, pour qu'elles ne puissent plus diverger
silencieusement. C'est mieux que l'état précédent, mais **ce n'est pas encore le
TDR §16** : la donnée reste dupliquée.

**Ce qui reste à faire** : choisir **une** ligne, et faire lire l'administration
depuis celle-là. `restaurant` est la candidate naturelle — c'est elle que le site
lit déjà en premier et que les contrôles de publication consultent.

**Ce qu'il faudra vérifier avant de trancher** :

1. **Ne pas aplatir le bilingue** : dans `restaurant`, `address` et `hours` sont
   des objets `{fr, en}` ; dans `site_config.content` ce sont des chaînes. Une
   consolidation naïve détruirait une éventuelle traduction anglaise — c'est
   exactement le défaut corrigé par la migration `032` (revue I6).
2. **L'écran « Réglages globaux »** devra charger ses champs depuis la ligne
   retenue, sinon il repartira sur des valeurs par défaut.
3. **Les autres lecteurs de `site_config.content`** (`content.slogan`,
   `heroTitle`, `team`, `engagements`, `testimonials`…) **ne sont pas concernés** :
   seules les cinq coordonnées sont dupliquées. La consolidation doit rester
   chirurgicale.

---

## B-3. Constats de la 3<sup>e</sup> revue non encore traités

**Constatés le** : 2026-09-20. Consignés ici pour ne pas être perdus.

- **I-3** — le balayage de coordonnées de `verify:anchors` ne couvre que
  `src/sections` et `src/components`. `src/contexts/SiteContext.tsx` porte les
  quatre valeurs canoniques en dur (`DEFAULT_CONTENT`) **et se trouve sur le
  chemin public** (`Localisation` s'y replie). Le filet nomme une classe de
  défaut plus large que ce qu'il balaie.
- **I-2** — `Localisation.tsx` conserve un second repli (`legacy.*`) qui n'est
  jamais vide en pratique : la disparition de ligne annoncée n'est donc pas
  atteignable, et la duplication subsiste via `SiteContext`.
- **M-1** — le plancher anti-vide du balayage est de 10 fichiers pour un
  périmètre réel de 26 : perdre un dossier entier passerait encore.
- **M-2** — la section A prend la **première** page publiée trouvée ; avec
  plusieurs pages publiées, le contrôle conclut sans le dire.
- **M-3** — `ANCHORS` dans `PublicSite.tsx` (rendu historique) n'est vérifié par
  rien.
- **M-5** — `LivePreview.tsx` est du **code mort** (aucun `import` dans `src/`) ;
  `PageRenderer` aussi. À supprimer proprement.
- **M-7** — `npm run test:save-plan` couvre le **noyau pur**, mais pas le
  **câblage** (`useEditor.save()`) : l'ordre des écritures et la reprise des
  identifiants ne sont pas exercés. Les tester suppose d'injecter les opérations
  de dépôt — c'est un petit refactor, et c'est la vraie façon de fermer le
  sujet.
- **M-4** — un message de commit annonce « 14 contrôles » pour `verify:lot1`,
  qui en exécute 12. L'historique n'est pas réécrit pour autant ; le compte
  exact vit dans `AGENTS.md` §15.

---

## B-S1. Porte de phase � `rbacOverrides` public et navigation brouillon

**Constat� le** : 2026-09-23 (revues s�curit� b867c4ac + code 5cb211f8).

**`rbacOverrides`** : la ligne `site_content` / `site_config` est lisible
anon (`content_public_read`). Si des surcharges RBAC y sont stock�es, elles
fuient vers le public. **D�cision attendue** : sortir les overrides hors de la
cl� publique, ou les ignorer c�t� client public et ne les charger qu'en console
authentifi�e.

**Navigation brouillon** : une partie du chrome (menu live / `site_content`)
peut encore diverger du flux `BROUILLON ? PUBLIER` de l'instantan� page.
Tracer explicitement ce qui est fig� � la publication vs live � chantier hors
lot de durcissement 039.

**Statut** : porte de phase, **non d�marr�**. Ne pas �largir les policies pour
� arranger � ces sujets.
