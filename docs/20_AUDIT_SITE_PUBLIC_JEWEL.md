# 20 — Audit expert du site public Greatlife (« jewel »)

> **Date** : 2026-09-23  
> **URL** : https://greatlife-conakry.pages.dev  
> **Méthode** : parcours navigateur réel (desktop 1440 × 900 + mobile 375 × 812) via Chrome CDP ; connexion console propriétaire pour cartographier les écrans ; confrontation aux skills **ui-ux-pro-max** et **web-design-guidelines** (Vercel) ; lecture du dépôt et du TDR (pas de redéfinition produit).  
> **Preuves** : `scripts/.work/audit-public-jewel/`  
> **Note parallèle** : un autre agent traite la RLS commandes (migration 037 / `84de05b`). Le smoke commande de cet audit n’a **pas** abouti à une soumission (modal non ouvert par l’automatisation) — cela ne bloque pas l’audit UX/CMS ; la validation RLS reste hors périmètre de clôture ici.

---

## 1. Synthèse exécutive

1. Le site public tourne bien sur le **chemin CMS publié** (`data-cms-shell="single_column"`) : blocs, en-tête et pied viennent de l’instantané, pas du legacy `site_content` seul.  
2. L’identité visuelle (vert forêt, photo burger, CTA clairs) est **déjà forte** et cohérente avec un fast-food bio de proximité — à **garder**.  
3. Défaut **contenu P0** : le nom commercial enregistré est **« Greatlifes »** (avec s) alors que le discours dit « Greatlife » — visible partout (nav, pied, ©). Se corrige en **Réglages globaux** (+ republier le chrome via Atelier si besoin).  
4. Défaut **bannière P0** : disposition **Plein écran** + voile parfois trop opaque → photo mangée (constaté desktop) ; le restaurateur peut alléger le **voile** / changer de disposition dans **Modifier le site → Bannière**.  
5. La **carte** fonctionne (onglets, Ajouter, FAB panier) ; des plats **sans photo** (ex. Le Volcan) cassent la gourmandise — **Médias** + fiche plat.  
6. Formulaire contact / réservation présents et utilisables ; lacunes a11y techniques (labels non liés, pas d’`autocomplete`) — code + éventuellement **Formulaires**.  
7. Console **complète** (Pilotage / Contenu / Apparence / Système) : Atelier avec brouillon → « Mettre à jour le site », Carte & prix, Médias, Équipe, Thème, Visibilité, Réglages, Formulaires.  
8. **Visibilité** (interrupteurs) et **visibilité des blocs CMS** coexistent — risque de confusion (déjà noté dans `docs/21`).  
9. Blocs TDR **branchés en J6** (Galerie, FAQ, CTA, Texte, Image+texte, Plats à la une, Vidéo, Espacement, Contenu libre) ; **Plan** (`map`) et arbre Gutenberg restent portes de phase.  
10. Roadmap recommandée : données & confiance (P0) → bannière & médias → a11y formulaires → enrichissements (témoignages, carte réelle, créneaux commande éditables).

---

## 2. Déjà top (garder)

| Élément | Preuve | Pourquoi le garder |
|---|---|---|
| Charte verte + photo nourriture | `01-home-desktop-1440.png`, `10-home-mobile-375.png` | Direction visuelle restaurant claire ; contraste global bon |
| Hiérarchie CTA (Carte / Réserver) | Hero + CTA nav « Réserver » | Conversion hospitality (ui-ux-pro-max / landing hero-centric) |
| Atelier CMS (brouillon + publier) | `41-atelier.png` | Flux TDR §8 respecté côté sections |
| Dispositions Bannière (Image+texte / Plein écran / Centré / Vidéo) | Atelier inspecteur | TDR §13 branché pour le pilote |
| Carte avec catégories + feedback « Ajouté » | `30-carte-apres-ajouter-desktop.png` | Parcours commande lisible |
| FAB panier avec total FG | idem | Feedback panier immédiat |
| Coordonnées réelles (plus de `000`) | Pied / Réglages : `+224 661 16 44 58` | Confiance client (N-10 historique corrigé côté téléphone) |
| Meta SEO de base (title, description, OG, canonical Pages) | `index.html` + probe | Socle SEO léger présent |
| Skip link console + landmark `main` public | probe `main: true` | Base a11y |
| Modules console nommés en vocabulaire restaurateur | `routes.ts` / nav | Conforme AGENTS.md §4 |

---

## 3. À améliorer

| ID | Priorité | Constat | Justification UX | Où manipuler / corriger |
|---|---|---|---|---|
| A1 | **P0** | Marque affichée **Greatlifes** vs texte **Greatlife** | Incohérence de confiance dès le premier viewport | **Réglages globaux** → Nom commercial ; vérifier aussi **Atelier → En-tête** (chrome) puis **Mettre à jour le site** |
| A2 | **P0** | Bannière plein écran : voile trop marqué / photo peu lisible (desktop) | Anti-pattern ui-ux-pro-max « low-quality / drowned imagery » ; hero doit vendre le plat | **Atelier → Bannière** : Disposition, champ **Voile sur la photo**, image ; republier |
| A3 | **P0** | Plats sans photo (ex. Le Volcan) | Restaurant = image ; carte incomplète = panier moins attractif | **Médias** (emplacement photo plat) + **Carte & prix** (fiche) |
| A4 | **P1** | Email public = Gmail perso ; réseaux Instagram/Facebook vides | Confiance & contact professionnel (TDR coordonnées) | **Réglages globaux** (email, réseaux) ; **Formulaires & emails** (destinataires) |
| A5 | **P1** | Champs formulaire sans `name` / `autocomplete` / `htmlFor` → probe `labelled: false` | Web Interface Guidelines · Forms ; clavier mobile & gestionnaires de mots de passe | Code : `Contact.tsx`, `Reservation.tsx`, `OrderCart.tsx` (+ composants `Label`/`Input`) — pas un écran CMS aujourd’hui |
| A6 | **P1** | `transition: 'all'` sur boutons | Guidelines · Animation anti-pattern | `Contact.tsx:144`, `Carte.tsx:78` |
| A7 | **P1** | Aucun `prefers-reduced-motion` dans `src/` | Guidelines · Animation ; Reveal / Framer Motion | Code sections + `Reveal` — **pas** éditable CMS |
| A8 | **P1** | Hero / plats souvent en `background-image` (0 `<img>` probe) | Pas de `width`/`height`/`loading` natifs → risque CLS & alt | Atelier (alt bannière existe) + code rendu `Hero`/`Carte` |
| A9 | **P1** | Cibles − / + panier à 28×28 px | Touch targets &lt; 44 px (ui-ux-pro-max) | Code `OrderCart.tsx:166-168` |
| A10 | **P1** | Double vérité Visibilité (écran) vs `page_sections.visible` (CMS) | Restaurateur peut « cacher » sans effet attendu | **J3 partiel** : UX clarifiée (deux rôles) ; branchement technique = porte docs/21 §6 |
| A11 | **P1** | Localisation = carte SVG décorative, pas de lien Maps | Intention « Nous trouver » non tenue jusqu’au geste | **Partiel J4** : adresse + plan cliquables (recherche Maps). **Porte** : URL / embed dédié |
| A12 | **P2** | Hiérarchie titres : H2 puis H4 (engagements, équipe) | Guidelines · Heading hierarchy | Code `Engagements`/`Team` ou modèle titres |
| A13 | **P2** | Créneaux retrait panier `PICKUP_TIMES` codés en dur | Horaires de service ≠ horaires de retrait | **J5 fait** — liste éditable `restaurant.pickupTimes` (Réglages → Horaires) ; panier consomme le chrome publié |
| A14 | **P2** | Empty panier avec emoji 🛒 | ui-ux-pro-max : pas d’emoji comme icône | `OrderCart.tsx:152` |
| A15 | **P2** | Meta SEO / OG non éditables dans la console | SEO léger figé dans `index.html` | **J7 fait** — Atelier → Référencement (`pages.seo` → instantané → public) |
| A16 | **P2** | i18n FR/EN dans Atelier ; site public probe en `fr` seul | Promesse bilingue partielle | Clarifier : EN publié ou masqué — **décision propriétaire** |

---

## 4. À ajouter

| ID | Priorité | Nouveauté | Valeur | Statut CMS | Branchement proposé |
|---|---|---|---|---|---|
| N1 | P1 | Activer / peupler **Témoignages** | Preuve sociale (landing hospitality) | **Partiel** : Visibilité `testimonials` + Équipe & contenus ; **absent** de la page publiée actuelle | Ajouter bloc Témoignages dans Atelier **ou** aligner Visibilité → rendu CMS |
| N2 | P1 | Légende des badges régime (omni, gluten…) | Compréhension carte | Visibilité `badges` existe ; légende absente | Micro-bloc sous Carte ou aide dans Carte & prix |
| N3 | P1 | Lien WhatsApp clicable (CTA) | Conversion Conakry | Réglages réseaux (WhatsApp) partiel | Pied / Localisation : lien `wa.me` dès que l’URL est saisie |
| N4 | P2 | Pages article blog (URL dédiée) | SEO + lecture | Blog liste OK ; deep-link article limité | Route publique article — **porte** architecture |
| N5 | P2 | Blocs Galerie / FAQ / Promo | Richesse page | **J6** : rendus branchés (`gallery`, `faq`, `cta`, …) | Atelier → Ajouter un bloc |
| N6 | P2 | Mode **Avancé** (TDR §13.1) | Puissance à la demande | Non livré (`docs/18`, N-12) | Lot dispositions — pas ce document |
| N7 | P2 | Skip link public + `touch-action: manipulation` | a11y / mobile | Absent public | Code chrome public |
| N8 | P2 | Horaires structurés (ouverture / cuisine / retrait) | Confiance + commande | Horaires texte libre seulement | **Décision propriétaire** avant schéma |
| N9 | P3 | JSON-LD Restaurant / Menu | SEO | Absent | Lot SEO après coordonnées stables |
| N10 | P3 | Empty states métier (« bientôt de saison ») | Carte / blog vides | Absent | Textes + Visibilité |

---

## 5. Findings Web Interface Guidelines (`file:line`)

### `src/sections/Contact.tsx`

- `Contact.tsx:98-120` — `Label` non associé (`htmlFor` / `id`) ; probe `labelled: false`
- `Contact.tsx:99-104` — inputs sans `name` ni `autocomplete`
- `Contact.tsx:104` — email : ajouter `spellCheck={false}` / `autocomplete="email"`
- `Contact.tsx:144` — `transition: 'all 0.2s'` → lister les propriétés
- `Contact.tsx:149+` — succès / erreur : pas de `aria-live` / `role="alert"`

### `src/sections/Reservation.tsx`

- `Reservation.tsx:86-123` — mêmes lacunes labels / `name` / `autocomplete`
- `Reservation.tsx:92` — téléphone : `type="tel"` + `inputMode` + `autocomplete="tel"` manquants
- `Reservation.tsx:143-146` — erreur visuelle seule (pas `role="alert"`)

### `src/sections/OrderCart.tsx`

- `OrderCart.tsx:152` — empty state emoji
- `OrderCart.tsx:166-168` — boutons ± sous 44×44
- `OrderCart.tsx:117-127` — overlay : vérifier `overscroll-behavior: contain`
- `OrderCart.tsx:175-204` — checkout : `name` / `autocomplete` absents
- `OrderCart.tsx:13` — `PICKUP_TIMES` hardcodé (contenu métier hors CMS)

### `src/sections/Carte.tsx`

- `Carte.tsx:31-49` — photo en CSS background (pas d’`img` + dimensions)
- `Carte.tsx:78` — `transition: 'all 0.2s'`

### `src/sections/Hero.tsx`

- `Hero.tsx:96-114` — média plein écran via `video` / div background ; alt conditionnel OK, dimensions CLS à surveiller
- Motion Framer sans branche `prefers-reduced-motion` (fichier + Reveal)

### `src/sections/PublicSite.tsx`

- `PublicSite.tsx:127-156` — chemin CMS OK ; pas de skip-link public
- Double chemin legacy / CMS : Visibilité legacy ≠ sections CMS (`docs/21`)

### `src/components/nav/PublicNav.tsx`

- `PublicNav.tsx:263` — bouton menu 44×44 : ✓
- `PublicNav.tsx:281-328` — tiroir : fond solide prévu ; surveiller z-index / fermeture (captures mobile overlay suspectes pendant automation)

### `index.html`

- `index.html:6` — viewport OK (pas de `user-scalable=no`) ✓
- `index.html:7-26` — SEO/OG figés (non CMS)

### `src/components/ui/label.tsx`

- `label.tsx:3-5` — primitive sans lien automatique vers le contrôle

---

## 6. Matrice correspondance CMS

| Élément public | Écran / zone console | Statut | Comment le restaurateur agit |
|---|---|---|---|
| Nom marque (nav, pied, ©) | **Réglages globaux** (+ En-tête Atelier) | **existe** | Corriger « Greatlifes » → « Greatlife » ; publier chrome si gelé dans l’instantané |
| Slogan / accroche hero | **Atelier → Bannière** (Accroche, Titre, Sous-titre) | **existe** | Brouillon → Mettre à jour le site |
| Disposition / voile / CTAs hero | **Atelier → Bannière → Disposition** | **existe** | Plein écran / Image+texte / Centré / Vidéo + couleurs voile |
| Liens menu + bouton Réserver | **Atelier → En-tête** (`ChromePanel`) | **existe** | Ordre, libellés, cible `#…` |
| Pied (liens, layout) | **Atelier → Pied** | **existe** | Idem chrome |
| Photo hero / alt | **Atelier Bannière** + **Médias** | **existe** | Slot image + texte alternatif |
| Photos plats | **Médias** + **Carte & prix** | **partiel** | Emplacements par plat ; trous visibles en prod |
| Prix / descriptions / badges | **Carte & prix** | **existe** (écriture **directe**, pas publication page) | docs/21 §5 |
| Vertus nutritionnelles | **Carte & prix** + interrupteur **Visibilité → Vertus** | **existe** | |
| Histoire / Engagements / titres sections | **Atelier** (blocs Maison / …) | **existe** | |
| Équipe | **Équipe & contenus** (+ bloc Atelier) | **existe** (direct) | |
| Témoignages | **Équipe & contenus** + **Visibilité** | **partiel** | Non présents sur page publiée auditée |
| Localisation / adresse / horaires / tél / email | **Réglages globaux** | **existe** | Source unique TDR §16 |
| Carte géographique cliquable | — | **à créer** | Porte : URL Maps / embed — **décision propriétaire** |
| Formulaire contact (textes) | **Atelier → Contact** | **existe** | Motifs sujet : champ liste |
| Formulaire réservation (textes) | **Atelier → Réservation** | **existe** | |
| Destinataires / auto-réponse | **Formulaires & emails** | **existe** | |
| Blog articles | **Blog** | **existe** (publication article individuelle) | |
| Thème couleurs / polices | **Thème & ambiance** + typo Atelier | **existe** | |
| Montrer / cacher sections | **Visibilité** vs masquage bloc Atelier | **partiel / divergents** | Arbitrage docs/21 |
| Panier / créneaux retrait | **Réglages → Horaires** (`restaurant.pickupTimes`) | **existe** (J5) | Publier chrome pour le public |
| SEO title/description/OG | Atelier → **Référencement** | **existe** (J7) | Gelé dans l’instantané ; `index.html` = socle sans JS |
| Galerie / FAQ / Promo / Vidéo bloc | Palette Atelier (schéma) | **existe** (J6) | Ajouter un bloc → types branchés ; `map` toujours porte |
| Commandes / résas / messages | Pilotage | **existe** | Hors CMS page |
| i18n EN public | Atelier FR/EN | **partiel** | Décision : publier EN ? |

---

## 7. Roadmap lots recommandés (ordre)

| Lot | Contenu | Effort | Dépendance | Statut |
|---|---|---|---|---|
| **J0 — Données confiance** | Renommer marque ; email pro ; réseaux ; republier chrome | Faible (contenu) | Propriétaire | **Fait** (2026-09-23) — marque `Greatlifes` → `Greatlife` + publication chrome v21/v22. Email pro & réseaux : **en attente d’URLs/adresses du propriétaire** (Gmail & réseaux vides laissés tels quels). |
| **J1 — Bannière & médias** | Voile / disposition ; photos plats manquantes ; alt | Faible–moyen | Atelier + Médias | **Fait partiel** (2026-09-23) — Bannière `fullscreen` → `image_text` ; `imageAlt` renseigné ; `secondaryColor` blanc retiré (contraste crème). Photos plats manquantes (ex. Le Volcan) : **reste à uploader** en Médias (4 photos seulement en base). |
| **J2 — a11y formulaires & panier** | labels, autocomplete, aria-live, targets 44px, reduced-motion, no emoji empty | Moyen (code) | Couloir sections | **Fait** (2026-09-23) — `Contact` / `Reservation` / `OrderCart` : `htmlFor`+`id`, `name`/`autocomplete`, `role="alert"`/`aria-live`, cibles ± **48px** (≥44), empty panier SVG (plus d’emoji), `overscroll-behavior: contain`, dialog panier ; `Reveal` + panier respectent `prefers-reduced-motion` ; `Select` propage `id`/`aria-*` + style trigger ; `transition: all` retiré (Contact, Carte Ajouter). |
| **J3 — Alignement Visibilité ↔ CMS** | Une seule commande « visible » | Moyen | **Décision propriétaire** (docs/21) | **Fait partiel** (2026-09-23) — UX clarifiée : « Enregistrer » (effet immédiat carte) vs Atelier œil + « Mettre à jour le site » (blocs). Interrupteurs « Pages » repliés en secours historique (honnêtes). **Pas** de branchement Visibilité → `page_sections.visible` (porte docs/21 §6 — touche le public). Fuite RLS `navigation_items` (031 §2) : hors J3, porte sécu. |
| **J4 — Preuve sociale & local** | Témoignages sur page ; lien Maps/WhatsApp | Moyen | Contenu + éventuel champ URL | **Fait partiel** (2026-09-23) — Bloc Avis déjà présent mais masqué : `visible=true` (brouillon + instantané) ; 3 avis peuplés dans `site_config.testimonials` (chemin direct). Pied + Localisation : `wa.me` (WhatsApp ou téléphone) ; adresse / plan → recherche Google Maps (sans nouveau champ URL). **Porte** : URL Maps / embed dédié (décision §10.4) ; bloc `map` toujours `implemented: false`. |
| **J5 — Commande éditables** | Créneaux retrait / message panier | Moyen | **Décision schéma** | **Fait** (2026-09-23) — Schéma : `site_content.restaurant.pickupTimes` (liste), miroir plat `site_config.pickupTimes`, gelés dans le chrome à la publication. **Pas** de nouvelle table ; distinct des horaires texte. Migration `042` déplace le seed 024 hors `email_templates`. Console : Réglages → Horaires → « Créneaux de retrait ». Panier : plus de `PICKUP_TIMES` hardcodés ; message honnête + commande bloquée si liste vide. Flux : Enregistrer puis **Mettre à jour le site**. |
| **J6 — Blocs manquants TDR** | Galerie, FAQ… seulement une fois `implemented` | Fort | docs/18 | **Fait** (2026-09-23) — Composants + registre pour : Galerie, FAQ, CTA, Texte, Image+texte, Plats à la une, Vidéo, Espacement, Contenu libre (`implemented: true` + enregistrement renderer). Picker « Ajouter un bloc » ne propose que ces types branchés (filtre J6b). **Porte** : bloc `map` (URL/embed Maps — §10.4 / J4) ; arbre Gutenberg (§10.8) ; mode Avancé N-12. |
| **J6b — Organisation blocs (MVP)** | Structure sous-éléments (listes/groupes) + réordre listes Monter/Descendre ; **pas** d’arbre Gutenberg | Faible | docs/18 §13 | **Fait** (2026-09-23) |
| **J7 — SEO CMS** | title/description/OG éditables | Moyen | Porte TDR | **Fait** (2026-09-23) — Atelier → Référencement (Titre Google, Texte de partage, Image de partage). Brouillon `pages.seo` ; public = SEO de l’instantané uniquement. Lecture REST publique restreinte (pas de `seo`/`title_i18n` live). `index.html` reste le socle sans JS. CM-7 (HTML statique à la publication) reste une porte séparée. |

**Hors lots UI** : finaliser / vérifier RLS commandes (agent parallèle) par un test manuel « Valider ma commande » après déploiement 037.

**Preuves J0/J1** : `scripts/.work/audit-public-jewel/j0j1-home-desktop-1440.png`, `j0j1-home-mobile-375.png`, `j0j1-proof.json` — nav « Greatlife », pas « Greatlifes » ; disposition Image+texte (photo burger lisible).

**Preuves J4** : témoignages visibles #temoignages ; liens wa.me pied/Localisation ; adresse → Maps search. Script contenu scripts/.work/apply-j4-content.mjs ; noyau 
pm/
ode --test scripts/test-contact-links.mjs.

**Preuves J2** : `scripts/.work/audit-public-jewel/proof-j2.mjs`, `j2-proof.json`, `j2-contact-desktop.png`, `j2-reservation-desktop.png`, `j2-order-desktop.png` — champs `#contact-*` / `#reservation-*` / `#order-*` labellés + autocomplete ; boutons quantité ≥ 44×44.

**Preuves J5** : `npm run test:pickup` (normalisation + gel chrome) ; `npm run verify:ecrans` (domaine Réglages + `pickupTimes`) ; migration `042` + apply `scripts/.work/apply-j5-pickup.mjs` (backup `logs/backup-j5-*.json`).

---

## 8. Preuves (chemins)

Répertoire : `scripts/.work/audit-public-jewel/`

| Fichier | Contenu |
|---|---|
| `01-home-desktop-1440.png` | Accueil desktop (voile / hero) |
| `03-footer-desktop.png` | Pied desktop |
| `04-panier-desktop.png` | Ouverture panier |
| `10-home-mobile-375.png` | Accueil mobile |
| `11-nav-mobile-open.png` | Menu mobile |
| `13-footer-mobile.png` | Pied mobile (+ overlay menu si automation) |
| `20-hash-*-mobile.png` | Ancres carte / blog / réservation / contact |
| `30-carte-apres-ajouter-desktop.png` | Carte + FAB commande |
| `40-login-or-admin.png` … `44-orders-after.png` | Console (dashboard, atelier, réglages, smoke) |
| `report.json` | Probe DOM public (sans secrets) |
| `console-map.json` | Inventory modules admin (mot de passe absent) |
| `run.mjs` / `run-console.mjs` | Scripts de rejouabilité (identifiants via env uniquement) |
| `j0j1-home-desktop-1440.png` | Post-lot J0/J1 : marque + bannière Image+texte (desktop) |
| `j0j1-home-mobile-375.png` | Post-lot J0/J1 : accueil mobile |
| `j0j1-proof.json` | Probe DOM : `hasGreatlifes: false`, `hasGreatlife: true` |
| `j2-contact-desktop.png` | Post-J2 : formulaire contact (labels liés) |
| `j2-reservation-desktop.png` | Post-J2 : formulaire réservation (tel + autocomplete) |
| `j2-order-desktop.png` | Post-J2 : panier / checkout |
| `j2-proof.json` | Probe a11y formulaires + cibles 44px |
| `proof-j2.mjs` | Script de rejouabilité J2 |

---

## 9. Références skills (extrait utile)

**ui-ux-pro-max** (restaurant / hospitality) : hero-centric + social proof ; typo élégante ; touch 44px ; empty states guidés ; anti low-quality imagery / horaires périmés.  
**web-design-guidelines** : labels liés, autocomplete, pas de `transition: all`, `prefers-reduced-motion`, images dimensionnées, focus visible, aria-live sur erreurs.

---

## 10. Décisions propriétaire requises (portes de phase)

1. **Marque officielle** : ~~Greatlife vs Greatlifes~~ → **tranché** (2026-09-23) : Greatlife (réglages + chrome publié).  
2. **Visibilité unique** : interrupteurs Visibilité vs `visible` des blocs CMS (`docs/21` §6) — **interim J3** : copy/UX alignée (deux rôles explicites) ; branchement technique reporté.  
3. **Anglais public** : publier EN ou retirer le basculeur Atelier côté promesse.  
4. **Carte / WhatsApp** : WhatsApp branché (numéro/lien existant + repli téléphone). Carte : recherche Maps sur l’adresse (sans nouveau champ). **Reste** : URL / embed dédié si le propriétaire le veut.  
5. **Créneaux de retrait** : ~~liste éditable vs réutiliser horaires texte~~ → **tranché** (J5, 2026-09-23) : liste éditable `pickupTimes` (distincte des horaires d’ouverture texte).  
6. **SEO administrable** : ~~oui/non et quel écran~~ → **tranché** (J7, 2026-09-23) : oui, écran Atelier → **Référencement** (par page).  
7. **Exposer ou masquer** les types de blocs `implemented: false` dans « Ajouter un bloc ». → **tranché** (J6b + J6) : seuls les types branchés apparaissent ; `map` reste masqué tant que non rendu.  
8. **Arbre de blocs imbriqués** (Gutenberg / colonnes libres illimitées) : **refusé pour l’instant** — le MVP reste dispositions + listes + Structure (`docs/18` §13).
---

*Document d’audit uniquement — aucun refactor UI massif dans ce lot. Identifiants admin utilisés en session pour cartographie ; **jamais** consignés ici ni dans les JSON de preuve.*

**Preuves J6** : `npm run verify:dispositions` (nouveaux blocs + dispositions distinctes) ; `npm run build` ; composants `src/sections/{Gallery,Faq,CtaBand,TextBlock,ImageText,Spacer,RichText,VideoBlock,MenuFeatured}.tsx`.

**Preuves J7** : `npm run test:page-seo` (normalisation + gel snapshot + balises) ; `npm run build` ; panneau `src/admin/editor/SeoPanel.tsx` ; conso publique `PublicSite` via `appliquerSeoDocument`.

---

## 11. Audit responsive mobile / tablette (2026-09-23)

> **Preuves** : `scripts/.work/audit-responsive/` (CDP 375 / 768 / 1024 — public + console Clair/Nuit).  
> Skills : **ui-ux-pro-max** (`--domain ux` mobile-first, touch, overflow) · **web-design-guidelines** (safe areas, overflow, touch-action, stacking).

### Inventaire (avant correctifs)

| ID | Sev | Zone | Constat | Preuve |
|---|---|---|---|---|
| R1 | **P0** | Nav publique | Tiroir rendu *dans* le `header` (z-index 50) → cartes/transform peignent par-dessus ; liens « flottants », CTA Réserver parasite | `pub-nav-open-375.png`, `pub-panier-375.png` |
| R2 | **P0** | Atelier toolbar | `@media (max-width: 375px)` rate les viewports 375.3 px → barre `nowrap` : « Enregistré » ∩ FR/EN illisible | `adm-atelier-375.png` |
| R3 | **P1** | Hero | Pastille « bio » clipée par `overflow:hidden` du cercle | `pub-home-375.png` |
| R4 | **P1** | Console topbar | Search + « Voir le site » + compte trop denses ≤768 | `adm-dashboard-375.png` |
| R5 | **P1** | Bottom nav | Labels 6 colonnes sans ellipsis ; risque de collision | `adm-orders-375.png` |
| R6 | **P2** | Footer liens | Cibles texte étroites (&lt; 24 px hauteur) — non bloquant | probe `tiny-touch-target` |

### Correctifs livrés

- `PublicNav` : tiroir + backdrop en `createPortal(document.body)`, z-index 998/999, safe-area, fond opaque.
- `index.css` + `console.css` : wrap toolbar Atelier ≤900/768 px (plus de seuil 375 exact) ; `overflow-x: clip` html/body.
- `Hero` : pastilles hors du cercle `overflow:hidden`.
- Topbar : compte compact + bouton « Voir le site » en icône œil sur mobile.
- Bottom nav : `text-overflow: ellipsis` + `touch-action: manipulation`.
- `useIsMobile` : état initial sync via `matchMedia` (évite flash bureau).

### Revue web-design-guidelines (extraits)

```text
## src/components/nav/PublicNav.tsx
PublicNav.tsx:183 - header z-index 50 piégeait fixed drawer → portal body (fix)
PublicNav.tsx:295+ - overscroll-behavior: contain + safe-area-inset (fix)

## src/index.css
index.css:262+ - toolbar wrap ≤900px (fix seuil 375)
index.css:10-16 - overflow-x: clip (anti scroll horizontal)

## src/admin/console.css
console.css:~3676 - max-width:375px → 768px toolbar Atelier (fix)
console.css:1995 - bottom-nav labels overflow hidden + ellipsis
```

*Identifiants console : variables d’environnement d’audit uniquement — jamais versionnés.*
