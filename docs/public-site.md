# Greatlife — Le site public

> Le site public est une **one-page** React rendue par `src/sections/PublicSite.tsx`, enveloppée dans `CartProvider`. Route : `/`. Voir aussi [admin-panel.md](./admin-panel.md) pour la contrepartie d'édition.

## Montage

`App.tsx` monte `SiteProvider → AuthProvider → BrowserRouter`. La route `/` rend `PublicSite`. Le `SiteProvider` (au montage) charge toutes les données (menu, contenu, blog, médias, messages, admin users, orders) depuis Supabase ou les fallbacks `src/data/*`, et souscrit au Realtime pour se rafraîchir en direct quand l'admin modifie quelque chose.

## `PublicSite.tsx`

Assemble les sections **selon `visibility.sections`** (configurable depuis l'admin *Visibilité*) :

```tsx
<CartProvider>
  <div style={rootStyle}>
    <PublicNav />
    {visibility.sections.home && <Hero />}
    {visibility.sections.carte && <Carte />}
    {visibility.sections.histoire && <Story />}
    {visibility.sections.engagements && <Engagements />}
    {visibility.sections.equipe && <Team />}
    {visibility.sections.localisation && <Localisation />}
    {visibility.sections.contact && <Contact />}
    <Reservation />            // toujours affichée
    {visibility.sections.blog && <Blog />}
    <Footer />
    <OrderCart />              // panier coulissant (hors flux)
  </div>
</CartProvider>
```

`rootStyle` injecte les variables CSS du thème (`--c-*`, `--f-*`) sur la racine.

## Les sections

| Section | Fichier | Ancrage `#id` | Rôle |
|---|---|---|---|
| Hero | `sections/Hero.tsx` | `home` | Slogan, titre, sous-titre, CTA. Média via `useMedia('Hero principal')`. |
| Carte | `sections/Carte.tsx` | `carte` | Menu groupé par catégorie (`CATEGORY_ORDER`), badges, prix, bouton « Ajouter » au panier. |
| Story | `sections/Story.tsx` | `histoire` | Histoire du restaurant (texte éditable en admin). |
| Engagements | `sections/Engagements.tsx` | `engagements` | Cartes d'engagement (bio, circuit court, éco…). |
| Team | `sections/Team.tsx` | `equipe` | Présentation de l'équipe (portraits). |
| Localisation | `sections/Localisation.tsx` | `localisation` | Adresse, horaires, carte. |
| Contact | `sections/Contact.tsx` | `contact` | Formulaire → `insertMessage` + `invokeContactEmail`. |
| Reservation | `sections/Reservation.tsx` | (section dédiée) | Formulaire → `insertReservation` + `invokeContactEmail`. |
| Blog | `sections/Blog.tsx` | `blog` | Liste des articles publiés (`blog_posts` où `published = true`). |
| Footer | `sections/Footer.tsx` | — | Liens, réseaux, copyright. |
| OrderCart | `sections/OrderCart.tsx` | (overlay) | Panier coulissant + checkout commande. |

## Le panier & la commande en ligne

### `CartContext` (`src/contexts/CartContext.tsx`)
- État `items: CartItem[]` (name, price string, qty).
- **Persisté** dans `localStorage` (`greatlife-cart`).
- `parsePrice("48 000")` → `48000` ; `formatFG(n)` → `"48 000"`.
- `add`, `remove`, `setQty`, `clear`, `count`, `totalNum`, `totalLabel`.

### `OrderCart.tsx` (overlay coulissant)
- Bouton flottant → ouvre le drawer du panier.
- **Checkout** : formulaire (nom, email, phone, heure de retrait `PICKUP_TIMES`, notes) + validation inline.
- Génération d'une référence : `genRef()` → `"GL" + base36(timestamp) + base36(random)`.
- Soumission : `insertOrder({ ref, nom, email, phone, items, total, pickup_time, notes })` puis `invokeContactEmail` (notification restaurant).
- Affiche un écran de succès/erreur. En mode démo, simule le succès.

### Flux complet
1. Visiteur ajoute des items (Carte → bouton « Ajouter »).
2. Ouvre le panier, remplit le checkout, valide.
3. `insertOrder` crée la ligne en base (statut `pending`).
4. `invokeContactEmail` notifie le restaurant.
5. L'admin voit la commande en direct (Realtime, `OrdersManager`), confirme/annule → `invokeOrderStatusEmail` notifie le client.

## Le formulaire de réservation (`Reservation.tsx`)
- Champs : nom, email, phone, date, heure, nombre de couverts, message.
- Validation inline (email, champs requis).
- Soumission : `insertReservation` + `invokeContactEmail`.
- L'admin gère ensuite les statuts (`ReservationsManager` → `invokeReservationStatusEmail`).

## Le formulaire de contact (`Contact.tsx`)
- Champs : nom, email, sujet, message.
- `insertMessage` + `invokeContactEmail`.
- L'admin répond depuis `MessagesManager` (`invokeReplyEmail`).

## Navigation publique (`components/nav/PublicNav.tsx`)
- Nav sticky, scrollspy via `useScrollSpy(ids)`, drawer mobile.
- Liens vers les sections ancrées (#carte, #histoire…).
- Bouton d'accès admin (vers `/login`).

## Médias sur le site public
- `useMedia(slot)` (`SiteContext`) résout l'URL publique d'un média assigné au slot.
- Les slots sont libres (ex. "Hero principal", "Logo / favicon") et gérés dans l'admin *Médias*.
- Avant assignation, les sections affichent un placeholder (`DEFAULT_MEDIA`).

## SEO & meta
`index.html` contient :
- meta description, keywords, author, theme-color,
- Open Graph (`og:title`, `og:description`, `og:url` → `greatlife-gn.netlify.app`, `og:type=website`, `og:locale=fr_FR`),
- Twitter Card (`summary_large_image`),
- canonical → `https://greatlife-gn.netlify.app`,
- préchargement des polices Google (Fraunces, DM Sans).

> Si le domaine de production change, mettez à jour `og:url`, `og:site_name` (via le contenu éditable), `twitter:*`, et `canonical` dans `index.html`.

## Responsive & animations
- `useIsMobile` (matchMedia 768px) pilote certaines bascules.
- `Reveal` (`components/ui/Reveal.tsx`) : apparition au scroll via Framer Motion.
- `OrganicCard` : cartes au border-radius organique.
- Tailwind pour les utilities de layout responsive ; styles inline fréquents pour le thème dynamique.

## Liens
- [admin-panel.md](./admin-panel.md) — l'édition du contenu affiché ici
- [database.md](./database.md) — tables `menu_items`, `orders`, `reservations`, `messages`, `media_assets`
- [emails.md](./emails.md) — les notifications déclenchées
