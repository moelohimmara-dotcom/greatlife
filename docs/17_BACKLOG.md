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
