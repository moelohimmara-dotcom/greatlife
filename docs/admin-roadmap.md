# Greatlife — Feuille de route du panneau admin

> Historique complet de ce qui a été construit, état actuel, et étapes suivantes pour rendre le panneau admin entièrement complet. Document vivant — à mettre à jour à chaque évolution.
>
> Voir aussi : [admin-panel.md](./admin-panel.md) (architecture des modules), [database.md](./database.md) (schéma & RLS), [emails.md](./emails.md) (notifications).

---

## 1. Ce qui a été fait (historique)

### Phase A — Fondations RBAC (PR #23 à #28)

| PR | Titre | Apport |
|---|---|---|
| #23 | RBAC granulaire (CRUD) + matrice unifiée + audit des rôles | Modèle de permissions par module, matrice, journal d'audit |
| #24 | Matrice de permissions éditable (CRUD) + persistance + anti-lockout | Édition des overrides, persistance dans `SiteConfig`, protection dernier owner |
| #25 | Descriptions de rôles + protection anti-lockout | Descriptions humaines des 6 rôles, blocage de suppression du dernier owner |
| #26 | Application effective du RBAC (lecture seule bloquante + gardes CRUD) | `canWriteModule` appliqué, bannière « Accès en lecture seule » |
| #27 | Résumé des permissions par rôle dans la matrice | Compteurs par rôle |
| #28 | Export/import de la configuration RBAC (overrides inclus) | JSON export/import de `rbacOverrides` |

### Phase B — UX de la matrice (PR #29 à #36)

| PR | Titre | Apport |
|---|---|---|
| #29 | Vue détaillée dépliable des permissions par utilisateur | Détail par user dans la liste |
| #31 | Regroupement des modules par catégorie dans la matrice | Catégories visuelles |
| #32 | Recherche/filtre de modules dans la matrice (avec catégories) | Champ de recherche |
| #33 | Résumé des permissions effectives par utilisateur dans la liste de l'équipe | Badges de résumé |
| #34 | Vue détaillée dépliable des permissions par utilisateur | Accordéons par user |
| #35 | Historique des changements RBAC dans l'onglet Utilisateurs & rôles | Onglet Historique (audit log filtré) |
| #36 | Mode batch (prévisualisation d'impact) pour la matrice de permissions | Prévisualisation avant commit |

### Phase C — Session & activité (PR #37 à #41)

| PR | Titre | Apport |
|---|---|---|
| #37 | Rafraîchissement live du rôle en session | `refreshRole()`, polling 60 s |
| #38 | Indicateur visuel de changement de rôle en session | `roleNotice` + `dismissRoleNotice` |
| #39 | Journal d'activité par utilisateur | Log d'activité par user |
| #40 | Tableau de bord d'activité globale | Dashboard d'activité |
| #41 | Rendre visibles les erreurs d'envoi d'email de notification | Erreurs SMTP affichées dans la SaveBar |

### Phase D — Déploiement & emails RBAC (PR #42 à #49)

| PR | Titre | Apport |
|---|---|---|
| #42 | no-cache index.html pour détecter les nouveaux déploiements | Headers Netlify |
| #43 | Filtres avancés du journal d'audit | Filtres par user/rôle/action/date |
| #44 | Export CSV du journal d'audit filtré | Export CSV |
| #45 | Workflow de déploiement Netlify manuel (workflow_dispatch) | GitHub Actions |
| #47 | _redirects SPA + config env vars Supabase Netlify | `public/_redirects`, `netlify.toml` |
| #48 | Matrice de permissions en cartes par rôle (UI lisible) | Refonte UI : carte par rôle au lieu de tableau dense |
| #49 | Lien de connexion + récap permissions + auteur dans les emails RBAC | Email contient lien `/admin` + récap + auteur |

### Phase E — Invitations & magic links (PR #50 à #52)

| PR | Titre | Apport |
|---|---|---|
| #50 | Magic links Supabase pour la connexion sans mot de passe | `sendMagicLink()` via `signInWithOtp`, `onAuthStateChange` |
| #51 | Système d'invitation et de gestion des accès utilisateur | Migration 018 (`active`, `invited_at`), statuts Invité/Actif/Suspendu, suspendre/réactiver, invitation en masse, blocage des comptes suspendus au login |
| #52 | Gestion résiliente des colonnes active/invited_at manquantes | `select('*')`, messages d'erreur français si schéma manquant |

### Phase F — Résolution crise Supabase & session (hors PR, déploiements directs)

| Action | Détail |
|---|---|
| Diagnostic clé Supabase invalide | La clé anon dans `.env.example` (207 chars) avait un caractère invisible ; la clé correcte (208 chars) récupérée via Management API |
| Reconstruction du bundle | Bundle reconstruit avec la clé 208 chars, déployé via zip Netlify |
| `.env.example` nettoyé | Remplacement de la clé codée en dur par un placeholder |
| 4 utilisateurs confirmés en base | owner@greatlife.com, moelohimmara@gmail.com, malikamorgan17@gmail.com, gerant@greatlife.com |
| Migration 018 appliquée | `active` + `invited_at` ajoutés à `admin_users` (via SQL Editor Supabase) |

### Phase G — Correction session périmée (PR #53)

| PR | Titre | Apport |
|---|---|---|
| #53 | session périmée + message d'erreur duplicate key en français | Détection session token invalide → `signOut()` + effacement session locale ; message « Un utilisateur avec cet email existe déjà. » pour les doublons |

**Résultat** : après hard-refresh + reconnexion avec `owner@greatlife.com`, les 4 utilisateurs sont visibles. La politique RLS `admin_users_owner_manage` passe avec un token valide.

---

## 2. État actuel (synthèse)

### Fonctionnel et stabilisé

- ✅ **RBAC complet** : 6 rôles, permissions par module, overrides persistés, matrice en cartes, export/import, historique, mode batch.
- ✅ **Gestion des utilisateurs** : CRUD `admin_users`, statuts (Actif/Invité/Suspendu), suspendre/réactiver, invitation en masse.
- ✅ **Magic links** : `signInWithOtp` + redirection `/admin`, détection `SIGNED_IN` via `onAuthStateChange`.
- ✅ **Notifications email** : email éditable + notification lors des changements de rôles/permissions, lien de connexion + récap + auteur.
- ✅ **Audit** : journal filtré, export CSV, activité par utilisateur, dashboard d'activité.
- ✅ **Session** : rafraîchissement live du rôle, indicateur visuel de changement, détection session périmée.
- ✅ **Déploiement** : zip Netlify avec clé Supabase correcte, `_redirects` SPA, no-cache index.html.
- ✅ **Supabase connecté** : clé anon 208 chars valide, 4 utilisateurs en base, RLS fonctionnelle.

### Points d'attention connus

- ⚠️ **Déploiement Netlify auto-build** : un merge sur `main` déclenche un auto-build **sans** les variables Supabase → écrase le déploiement zip par une version « Mode local ». Solution de contournement : redéployer le zip après chaque merge. **Fix durable** : configurer les env vars Supabase dans Netlify (Settings → Environment variables).
- ⚠️ **`.env.example`** : contient un placeholder (la clé 207 chars avec caractère invisible a été retirée). Ne pas copier-coller une clé depuis ce fichier.
- ⚠️ **RLS lecture restreinte** : la politique `admin_users_owner_manage` n'autorise que `owner` à lire `admin_users`. Un `manager` ne verra pas la liste. À élargir si nécessaire.
- ⚠️ **Tokens partagés** : Netlify token, GitHub PAT, Supabase Personal Access Token ont été partagés en clair. **À révoquer** après finalisation.

---

## 3. Ce qui reste à faire (étapes suivantes)

### Priorité 1 — Réparation des modules cassés

#### 3.1 Pages Apparence & Média

**Problème signalé** : la page Thème & ambiance a perdu des fonctionnalités, la page Médias est vide.

**Étapes** :
1. Inspecter `ThemeEditor` (`src/admin/AdminPanel.tsx`) — vérifier que `THEMES`, `FONTS`, et la sauvegarde `saveSiteConfigToDb` fonctionnent.
2. Inspecter `MediaManager` — vérifier le bucket Storage `media`, `uploadMedia`, `fetchMedia`, `updateMediaSlot`, `deleteMedia`.
3. Tester visuellement (capture) ou via appels API Supabase Storage.
4. Corriger les régressions identifiées.

#### 3.2 Pagination du journal d'audit

**Problème** : le journal est limité à 200 entrées (`fetchAuditLog`).

**Étapes** :
1. Ajouter la pagination côté requête (range/offset) dans `repository.ts`.
2. Ajouter les contrôles de pagination (précédent/suivant + numéros de page) dans l'UI du journal.
3. Conserver les filtres actuels à travers les pages.

### Priorité 2 — Évolution RBAC

#### 3.3 Rôles personnalisés

**Objectif** : créer/renommer/supprimer des rôles au-delà des 6 prédéfinis.

**Étapes** :
1. Étendre le modèle `MODULE_ACCESS` pour accepter des rôles dynamiques (table `roles` en base ou JSON dans `site_content`).
2. UI de création/édition/suppression de rôles dans l'onglet Utilisateurs & rôles.
3. Appliquer les nouveaux rôles dans `canAccessModule` / `canWriteModule`.
4. Migration : table `roles` ou champ `custom_roles` dans `site_content`.
5. Mise à jour de la matrice de permissions pour inclure les rôles personnalisés.

#### 3.4 Expiration / temporisation des permissions

**Objectif** : accorder un accès limité dans le temps.

**Étapes** :
1. Ajouter `expires_at` aux overrides de permissions (table ou JSON).
2. Vérifier l'expiration dans `computeEffectiveAccess` et `canAccessModule`.
3. UI : champ de date d'expiration lors de l'attribution.
4. Notification email à l'approche de l'expiration.
5. Audit log de l'expiration automatique.

### Priorité 3 — Configuration & robustesse

#### 3.5 Configuration magic link Supabase

**Objectif** : vérifier que les invitations par magic link fonctionnent bout-en-bout.

**Étapes** :
1. Vérifier dans Supabase Dashboard → Authentication → URL Configuration : `https://greatlife-conakry.netlify.app/admin` dans les Redirect URLs.
2. Vérifier Authentication → Providers → Email : activé + « Confirm email » désactivé (pour `shouldCreateUser: true`).
3. Tester un envoi d'invitation depuis le panneau admin.
4. Documenter la configuration dans `docs/emails.md`.

#### 3.6 Élargissement de la politique RLS

**Objectif** : autoriser `manager` à lire `admin_users` (lecture seule).

**Étapes** :
1. Migration : ajouter une politique `admin_users_manager_read` (`FOR SELECT TO authenticated USING (is_admin(['manager', 'owner']))`).
2. Vérifier que le `manager` ne peut pas écrire (garder `FOR INSERT/UPDATE/DELETE` limité à `owner`).
3. Tester avec un compte `manager`.

#### 3.7 Variables d'environnement Netlify

**Objectif** : arrêter le déploiement zip manuel.

**Étapes** :
1. Dans Netlify Dashboard → Site → Settings → Environment variables, ajouter :
   - `VITE_SUPABASE_URL` = `https://gpvfryvmghjenwfqhnkd.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (clé 208 chars correcte)
2. Déclencher un rebuild Netlify.
3. Vérifier que le site n'est plus en « Mode local ».
4. Supprimer le script `/tmp/deploy.js` et arrêter les déploiements zip.

### Priorité 4 — Sécurité & nettoyage

#### 3.8 Révocation des tokens partagés

**Étapes** :
1. Révoquer le token Netlify (`nfp_...`) — Netlify → User settings → Applications.
2. Révoquer le GitHub PAT (`ghp_...`) — GitHub → Settings → Developer settings → Personal access tokens.
3. Révoquer le Supabase Personal Access Token (`sbp_...`) — Supabase → Account → Access tokens.
4. Recréer des tokens d'accès si nécessaire avec un scope minimal.

#### 3.9 Nettoyage de `.env.example`

**Étapes** :
1. Vérifier que `.env.example` ne contient que des placeholders (pas de clé réelle).
2. Documenter dans `DEVELOPMENT.md` comment récupérer la clé correcte via Supabase Dashboard → Settings → API.

---

## 4. Ordre recommandé d'exécution

| # | Tâche | Priorité | Effort |
|---|---|---|---|
| 1 | Pages Apparence & Média (réparation) | P1 | Moyen |
| 2 | Pagination du journal d'audit | P1 | Faible |
| 3 | Variables d'environnement Netlify | P3 | Faible (manuel) |
| 4 | Configuration magic link Supabase | P3 | Faible (manuel) |
| 5 | Élargissement RLS (lecture manager) | P3 | Faible |
| 6 | Rôles personnalisés | P2 | Élevé |
| 7 | Expiration des permissions | P2 | Moyen |
| 8 | Révocation des tokens | P4 | Faible (manuel) |

---

## 5. Liens utiles

- **Site production** : https://greatlife-conakry.netlify.app
- **Panneau admin** : https://greatlife-conakry.netlify.app/admin
- **Dépôt GitHub** : https://github.com/moelohimmara-dotcom/greatlife
- **Supabase Dashboard** : projet `gpvfryvmghjenwfqhnkd` (nommé « lucepress »)
- **Compte owner** : `owner@greatlife.com` / `greatlife2026`
