/**
 * Greatlife — chaînes de l'interface publique (FR / EN)
 * =====================================================
 * Le contenu éditorial, lui, est bilingue en base ({fr, en}) et résolu en amont
 * (décision CM-1/CM-5). Ce module couvre ce qui n'est PAS du contenu : libellés
 * de formulaires, boutons, messages de validation, replis de section.
 *
 * RÈGLE DE NON-RÉGRESSION : la valeur FR de chaque clé est la COPIE EXACTE du
 * littéral qui était codé en dur. `npm run verify:lot1` compare le rendu
 * français caractère par caractère — la moindre différence rougit.
 *
 * LANGUE PILOTÉE PAR L'URL (CM-6) : `/` = français, `/en` = anglais. Les
 * composants appellent `traduire(locale)` — aucun état global de langue.
 */
import i18next from 'i18next'
import type { Locale } from '@/cms/model/i18n'

export const RESSOURCES = {
  fr: {
    // --- Hero (replis quand le champ CMS est vide) ---
    'hero.pill': 'Bio',
    'hero.badgeLabel': 'Signature',
    'hero.badgeName': 'Le Greatlife',
    'hero.ctaPrimary': 'Découvrir la carte',
    'hero.ctaSecondary': 'Réserver une table',
    'hero.chips': '100% bio | Emballages éco | Prix accessibles',

    // --- Histoire ---
    'story.signerole': 'Le fondateur',
    'story.chips': 'Bio accessible | Circuit court | Transparence totale',

    // --- Équipe ---
    'team.title': 'Les visages de Greatlife',
    'team.subtitle': 'Une équipe qui croit que manger bien devrait être simple, accessible et délicieux.',

    // --- Témoignages ---
    'testimonials.title': 'Ils ont goûté Greatlife',
    'testimonials.subtitle': 'Ce que disent nos clients.',
    'ui.quoteOpen': '« ',
    'ui.quoteClose': ' »',

    // --- Engagements ---
    'engagements.title': 'Ce qui nous distingue',
    'engagements.subtitle': 'Six engagements concrets qui font de Greatlife un fast-food à part.',

    // --- Blog ---
    'blog.title': 'Le journal Greatlife',
    'blog.subtitle': 'Recettes, coulisses et rencontres avec nos producteurs.',
    'blog.more': 'Lire la suite',
    'blog.less': 'Réduire',
    'blog.read': 'Lire ',

    // --- Carte / menu ---
    'menu.title': 'La transgression saine',
    'menu.subtitle': 'Burgers, frites, milkshakes — en version bio, avec les fruits tropicaux de notre terroir. Chaque plat porte ses vertus affichées.',
    'menu.benefits': 'Vertus',
    'menu.close': 'Fermer',
    'menu.add': 'Ajouter',
    'menu.added': 'Ajouté',
    'menu.benefitsAria': 'Vertus nutritionnelles de {{name}}',
    'menu.addAria': 'Ajouter {{name}} à ma commande',
    'menu.tabsAria': 'Catégories de la carte',

    // --- Localisation ---
    'loc.title': 'Nous trouver',
    'loc.openMaps': 'Ouvrir dans Maps',
    'loc.addressSub': 'Adresse du restaurant',
    'loc.hoursSub': 'Service continu toute la journée',
    'loc.call': 'Appeler',
    'loc.phoneSub': 'Téléphone',
    'loc.whatsappSub': 'Écrire sur WhatsApp',
    'loc.mapAria': 'Voir {{address}} sur la carte',
    'loc.mapGarden': 'Jardin',
    'loc.mapSea': 'Atlantique',

    // --- Contact ---
    'contact.title': 'Écrivez-nous',
    'contact.subtitle': 'Réservation, commande, question — on vous répond sous 24h.',
    'contact.subjects': 'Message général | Réservation de table | Commande en ligne | Recrutement',
    'contact.send': 'Envoyer',
    'contact.sending': 'Envoi en cours…',
    'contact.sendAria': 'Envoyer le message',
    'contact.resetAria': 'Effacer le formulaire',
    'contact.ok': 'Envoyé ! Auto-réponse transmise au client.',
    'contact.ko': "Échec de l'envoi — veuillez réessayer.",

    // --- Réservation ---
    'resa.title': 'Réservez votre table',
    'resa.subtitle': 'Réservez en quelques secondes — confirmation par email.',
    'resa.submit': 'Réserver',
    'resa.submitting': 'Réservation…',
    'resa.submitAria': 'Réserver la table',
    'resa.notesPlaceholder': 'Anniversaire, allergies, table en terrasse…',
    'resa.ok': 'Réservation envoyée ! Nous vous confirmons par email.',
    'resa.ko': 'Échec de la réservation — veuillez réessayer.',

    // --- Panier / commande ---
    'cart.title': 'Ma commande',
    'cart.empty': 'Votre panier est vide',
    'cart.emptyHint': 'Ajoutez des articles depuis la carte pour commander.',
    'cart.closeAria': 'Fermer le panier',
    'cart.cartAria': 'Voir mon panier de commande, {{count}} article',
    'cart.decreaseAria': 'Diminuer {{name}}',
    'cart.increaseAria': 'Augmenter {{name}}',
    'cart.removeAria': 'Retirer {{name}}',
    'cart.pickup': 'Heure de retrait',
    'cart.notes': 'Notes (optionnel)',
    'cart.notesPlaceholder': 'Sans oignon, allergie, etc.',
    'cart.total': 'Total',
    'cart.submit': 'Valider ma commande',
    'cart.unavailable': 'Commande indisponible',
    'cart.sending': 'Envoi…',
    'cart.clear': 'Vider',
    'cart.clearConfirm': 'Vider le panier ?',
    'cart.noSlot': "Aucun créneau de retrait n’est proposé pour le moment. Contactez le restaurant ou réessayez plus tard.",
    'cart.errPickup': 'Choisissez une heure de retrait',
    'cart.ok': 'Commande envoyée ! Nous vous confirmons par email. Un email de confirmation arrive dans votre boîte.',
    'cart.ko': "Impossible d’envoyer la commande. Vérifiez vos informations et réessayez.",

    // --- Formulaires (communs) ---
    'form.name': 'Nom',
    'form.email': 'Email',
    'form.phone': 'Téléphone',
    'form.date': 'Date',
    'form.time': 'Heure',
    'form.guests': 'Personnes',
    'form.subject': 'Type de demande',
    'form.message': 'Message',
    'form.notes': 'Demande particulière (optionnel)',
    'form.errName': 'Votre nom est requis',
    'form.errEmail': 'Votre email est requis',
    'form.errEmailInvalid': 'Email invalide',
    'form.errMessage': 'Votre message est vide',
    'form.errDate': 'La date est requise',
    'form.errTime': "L'heure est requise",

    // --- Navigation publique ---
    'nav.homeAria': '— accueil',
    'nav.mainAria': 'Navigation principale',
    'nav.openMenu': 'Ouvrir le menu',
    'nav.closeMenu': 'Fermer le menu',
    'nav.mobileAria': 'Menu mobile',
    'nav.close': 'Fermer',
    'menu.benefitsTitle': 'Vertus nutritionnelles',
    'contact.clear': 'Effacer',
    'loc.emailSub': 'Réservations & commandes',
    'footer.nav': 'Navigation',
    'footer.contact': 'Contact',
    'cart.unit': 'FG l\'unité',
    'nav.switchToEn': 'Switch to English',
    'nav.switchToFr': 'Passer en français',

    // --- Libellés des sections « blocs simples » (états vides, replis de titre) ---
    'menu.featuredEmpty': 'Plats à la une : indiquez l’identifiant ou le nom de plats de la carte dans Modifier.',
    'menu.featuredTitle': 'À la une',
    'faq.empty': 'Aucune question : ajoutez-en dans la colonne Modifier.',
    'faq.fallbackQuestion': 'Question',
    'faq.title': 'Questions fréquentes',
    'video.empty': 'Vidéo : collez une adresse (YouTube, Vimeo ou fichier .mp4) dans Modifier.',
    'video.fallbackTitle': 'Vidéo',
    'video.badUrl': 'Adresse non reconnue. Utilisez YouTube, Vimeo ou un fichier .mp4 / .webm.',
    'gallery.empty': 'Galerie vide : ajoutez des photos dans la colonne Modifier.',
    'gallery.title': 'Galerie',
    'gallery.photoN': 'Photo {{n}}',
    'cta.empty': 'Appel à l’action vide : ajoutez un titre ou un bouton dans Modifier.',
    'imageText.empty': 'Bloc image et texte vide : ajoutez une photo ou un texte dans Modifier.',
    'richText.empty': 'Contenu libre vide : rédigez dans la colonne Modifier.',
    'textBlock.empty': 'Bloc texte vide : saisissez un titre ou un texte dans Modifier.',
    'hero.videoHint': 'Disposition « Vidéo » : ajoutez une vidéo dans la colonne Modifier pour qu’elle se lance ici.',
    // Devise affichée près des prix : code identique dans les deux langues,
    // sorti du code pour rester modifiable comme les autres libellés.
    'cart.currency': 'FG',

    // --- Libellés de catégorie de la carte (valeurs de `cat`, données) ---
    'menu.catBurgers': 'Burgers',
    'menu.catWraps': 'Wraps',
    'menu.catSalades': 'Salades',
    'menu.catFrites': 'Frites & côtés',
    'menu.catMilkshakes': 'Milkshakes & smoothies',
    'menu.catPetitDejeuner': 'Petit-déjeuner',
    'menu.catDesserts': 'Desserts',
    'menu.catBoissonsChaudes': 'Boissons chaudes',
    'menu.catMenuEnfant': 'Menu enfant',
    'menu.catSuggestions': 'Suggestions',
  },

  en: {
    'hero.pill': 'Organic',
    'hero.badgeLabel': 'Signature',
    'hero.badgeName': 'The Greatlife',
    'hero.ctaPrimary': 'See the menu',
    'hero.ctaSecondary': 'Book a table',
    'hero.chips': '100% organic | Eco-friendly packaging | Affordable prices',

    'story.signerole': 'The founder',
    'story.chips': 'Affordable organic | Short supply chain | Full transparency',

    'team.title': 'The faces of Greatlife',
    'team.subtitle': 'A team that believes eating well should be simple, affordable and delicious.',

    'testimonials.title': 'They tasted Greatlife',
    'testimonials.subtitle': 'What our customers say.',
    'ui.quoteOpen': '“',
    'ui.quoteClose': '”',

    'engagements.title': 'What sets us apart',
    'engagements.subtitle': 'Six concrete commitments that make Greatlife a fast-food apart.',

    'blog.title': 'The Greatlife journal',
    'blog.subtitle': 'Recipes, behind the scenes and meetings with our producers.',
    'blog.more': 'Read more',
    'blog.less': 'Show less',
    'blog.read': 'Read ',

    'menu.title': 'Healthy indulgence',
    'menu.subtitle': 'Burgers, fries, milkshakes — organic, with the tropical fruits of our land. Every dish shows its benefits.',
    'menu.benefits': 'Benefits',
    'menu.close': 'Close',
    'menu.add': 'Add',
    'menu.added': 'Added',
    'menu.benefitsAria': 'Nutritional benefits of {{name}}',
    'menu.addAria': 'Add {{name}} to my order',
    'menu.tabsAria': 'Menu categories',

    'loc.title': 'Find us',
    'loc.openMaps': 'Open in Maps',
    'loc.addressSub': 'Restaurant address',
    'loc.hoursSub': 'Open all day, non-stop service',
    'loc.call': 'Call',
    'loc.phoneSub': 'Phone',
    'loc.whatsappSub': 'Message on WhatsApp',
    'loc.mapAria': 'See {{address}} on the map',
    'loc.mapGarden': 'Garden',
    'loc.mapSea': 'Atlantic',

    'contact.title': 'Write to us',
    'contact.subtitle': 'Booking, order, question — we reply within 24h.',
    'contact.subjects': 'General message | Table booking | Online order | Job application',
    'contact.send': 'Send',
    'contact.sending': 'Sending…',
    'contact.sendAria': 'Send the message',
    'contact.resetAria': 'Clear the form',
    'contact.ok': 'Sent! An auto-reply was emailed to the customer.',
    'contact.ko': 'Sending failed — please try again.',

    'resa.title': 'Book your table',
    'resa.subtitle': 'Book in seconds — confirmation by email.',
    'resa.submit': 'Book',
    'resa.submitting': 'Booking…',
    'resa.submitAria': 'Book the table',
    'resa.notesPlaceholder': 'Birthday, allergies, outdoor seating…',
    'resa.ok': 'Booking sent! We will confirm by email.',
    'resa.ko': 'Booking failed — please try again.',

    'cart.title': 'My order',
    'cart.empty': 'Your cart is empty',
    'cart.emptyHint': 'Add items from the menu to order.',
    'cart.closeAria': 'Close the cart',
    'cart.cartAria': 'View my order cart, {{count}} item',
    'cart.decreaseAria': 'Decrease {{name}}',
    'cart.increaseAria': 'Increase {{name}}',
    'cart.removeAria': 'Remove {{name}}',
    'cart.pickup': 'Pickup time',
    'cart.notes': 'Notes (optional)',
    'cart.notesPlaceholder': 'No onions, allergy, etc.',
    'cart.total': 'Total',
    'cart.submit': 'Place my order',
    'cart.unavailable': 'Ordering unavailable',
    'cart.sending': 'Sending…',
    'cart.clear': 'Empty',
    'cart.clearConfirm': 'Empty the cart?',
    'cart.noSlot': 'No pickup slot available right now. Contact the restaurant or try again later.',
    'cart.errPickup': 'Choose a pickup time',
    'cart.ok': 'Order sent! We will confirm by email. A confirmation email is on its way.',
    'cart.ko': 'Could not send the order. Please check your information and try again.',

    'form.name': 'Name',
    'form.email': 'Email',
    'form.phone': 'Phone',
    'form.date': 'Date',
    'form.time': 'Time',
    'form.guests': 'Guests',
    'form.subject': 'Subject',
    'form.message': 'Message',
    'form.notes': 'Special request (optional)',
    'form.errName': 'Your name is required',
    'form.errEmail': 'Your email is required',
    'form.errEmailInvalid': 'Invalid email',
    'form.errMessage': 'Your message is empty',
    'form.errDate': 'The date is required',
    'form.errTime': 'The time is required',

    'nav.homeAria': '— home',
    'nav.mainAria': 'Main navigation',
    'nav.openMenu': 'Open the menu',
    'nav.closeMenu': 'Close the menu',
    'nav.mobileAria': 'Mobile menu',
    'nav.close': 'Close',
    'menu.benefitsTitle': 'Nutritional benefits',
    'contact.clear': 'Clear',
    'loc.emailSub': 'Bookings & orders',
    'footer.nav': 'Navigation',
    'footer.contact': 'Contact',
    'cart.unit': 'FG each',
    'nav.switchToEn': 'Switch to English',
    'nav.switchToFr': 'Switch to French',

    // --- Libellés des sections « blocs simples » (états vides, replis de titre) ---
    'menu.featuredEmpty': 'Featured dishes: enter the ID or name of dishes from the menu in Edit.',
    'menu.featuredTitle': 'Featured',
    'faq.empty': 'No questions yet: add some in the Edit column.',
    'faq.fallbackQuestion': 'Question',
    'faq.title': 'Frequently asked questions',
    'video.empty': 'Video: paste a link (YouTube, Vimeo or .mp4 file) in Edit.',
    'video.fallbackTitle': 'Video',
    'video.badUrl': 'Unrecognised link. Use YouTube, Vimeo or a .mp4 / .webm file.',
    'gallery.empty': 'Empty gallery: add photos in the Edit column.',
    'gallery.title': 'Gallery',
    'gallery.photoN': 'Photo {{n}}',
    'cta.empty': 'Empty call to action: add a title or a button in Edit.',
    'imageText.empty': 'Empty image and text block: add a photo or some text in Edit.',
    'richText.empty': 'Empty rich content: write in the Edit column.',
    'textBlock.empty': 'Empty text block: enter a title or some text in Edit.',
    'hero.videoHint': '“Video” layout: add a video in the Edit column so it plays here.',
    // Devise affichée près des prix : code identique dans les deux langues,
    // sorti du code pour rester modifiable comme les autres libellés.
    'cart.currency': 'FG',

    // --- Libellés de catégorie de la carte (valeurs de `cat`, données) ---
    'menu.catBurgers': 'Burgers',
    'menu.catWraps': 'Wraps',
    'menu.catSalades': 'Salads',
    'menu.catFrites': 'Fries & sides',
    'menu.catMilkshakes': 'Milkshakes & smoothies',
    'menu.catPetitDejeuner': 'Breakfast',
    'menu.catDesserts': 'Desserts',
    'menu.catBoissonsChaudes': 'Hot drinks',
    'menu.catMenuEnfant': 'Kids menu',
    'menu.catSuggestions': 'Seasonal specials',
  },
} as const

export type CleI18n = keyof typeof RESSOURCES.fr

const i18nUI = i18next.createInstance()
void i18nUI.init({
  resources: {
    fr: { trad: RESSOURCES.fr },
    en: { trad: RESSOURCES.en },
  },
  lng: 'fr',
  fallbackLng: 'fr',
  defaultNS: 'trad',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
})

/**
 * Le traducteur de l'interface pour une langue donnée.
 *
 * LIAISON TARDIVE : la fonction retournée résout la langue au MOMENT de
 * l'appel. Un `const tr = traduire()` posé au niveau module reste donc
 * correct quand le visiteur passe de `/` à `/en`. Sans `locale` explicite, on
 * suit la langue ACTIVE (`fixerLangueActive`, appelée par le site public à
 * chaque rendu depuis l'URL), puis l'instance, puis le français — ce qui garde
 * le rendu historique intact (voir la règle ci-dessus).
 */
let langueActive: string | undefined
export function fixerLangueActive(locale?: Locale | string): void {
  langueActive = (locale as string) ?? langueActive
}

export function traduire(locale?: Locale | string): (cle: CleI18n, vars?: Record<string, string | number>) => string {
  return (cle, vars) =>
    i18nUI.t(cle, { ...(vars ?? {}), lng: (locale ?? langueActive ?? i18nUI.language ?? 'fr') as string }) as string
}

/** Liste plate séparée par « | » (petites listes de repli : chips, sujets). */
export function traduireListe(locale: Locale | undefined, cle: CleI18n): string[] {
  return traduire(locale)(cle).split(' | ').map((s) => s.trim()).filter(Boolean)
}

export { i18nUI }
