/**
 * Greatlife — CMS : registre des types de sections
 * =================================================
 * SOURCE UNIQUE DE VÉRITÉ du catalogue (TDR §12 + décision CM-4 : 20 types).
 *
 * Chaque entrée décrit, en langage restaurateur :
 *   - ce que la section affiche (`label`, `description`),
 *   - ses variantes (`variants`, TDR §13),
 *   - **ses champs de contenu** (`fields`) — c'est cette description qui
 *     permettra à l'éditeur du Lot 2 de générer ses formulaires, et au futur
 *     AI Copilot (TDR §35) de savoir quoi manipuler.
 *
 * `implemented` indique si le composant visuel est déjà branché sur les
 * données. Tant qu'il vaut `false`, le renderer utilise un rendu générique de
 * secours — jamais un écran vide.
 */

import type { SectionType, SectionTypeDefinition } from '../section'
import {
  CHIPS,
  IMAGE_FIELD,
  SUBTITLE,
  TITLE,
  BLOCK_TINT,
  HEADING_COLOR,
  BLOCK_SPACING,
  VISIBLE_ON,
  champAltPourImage,
  injecterChampsAltImage,
  ctaField,
  type FieldDef,
} from './fields'

/** Bouton principal — un objet `{ label, target }`, pas une liste. */
const CTA = ctaField('primaryCta', 'Bouton principal')

/** Bouton secondaire — facultatif : beaucoup de blocs n'en proposent qu'un. */
const CTA_SECONDARY = ctaField('secondaryCta', 'Bouton secondaire', false)

function avecCouleursBloc(fields: readonly FieldDef[], opts?: { fond?: boolean; titre?: boolean }): FieldDef[] {
  const extra: FieldDef[] = []
  if (opts?.fond !== false) extra.push(BLOCK_TINT)
  if (opts?.titre !== false) extra.push(HEADING_COLOR)
  extra.push(BLOCK_SPACING)
  extra.push(VISIBLE_ON)
  return [...injecterChampsAltImage(fields), ...extra]
}

export const SECTION_TYPES: readonly SectionTypeDefinition[] = [
  {
    type: 'hero',
    label: 'Bannière',
    description: 'Grande ouverture de page : titre, accroche, image et boutons.',
    /*
      L'ORDRE COMPTE : `defaultVariant()` renvoie `variants[0].id`, donc la
      première entrée est la disposition par défaut d'une nouvelle section.

      POURQUOI « Image + texte » EST EN PREMIER (2026-09-20)
      Le rendu historique de la Bannière est une grille à deux colonnes : le
      texte à gauche, la photo à droite. C'est *Image + texte* — pas *Plein
      écran*. La section était pourtant enregistrée en `fullscreen`, ce qui
      rendait le non-régression impossible à tenir : brancher les dispositions
      aurait changé le site public, et `verify:lot1` l'aurait signalé à juste
      titre. On corrige donc l'identité (la donnée et le schéma) AVANT de
      brancher le rendu, plutôt que d'accommoder un libellé faux.
    */
    variants: [
      { id: 'image_text', label: 'Image + texte' },
      { id: 'fullscreen', label: 'Plein écran' },
      { id: 'centered', label: 'Centré' },
      { id: 'video', label: 'Vidéo' },
    ],
    fields: [
      TITLE,
      SUBTITLE,
      { name: 'tagline', label: 'Accroche', type: 'text', inlineMarkup: true, help: 'La phrase courte affichée en haut du bloc.' },
      CHIPS,
      {
        name: 'badge',
        label: 'Étiquette du plat vedette',
        type: 'group',
        help: 'La petite carte affichée sur l’image (ex. le prix du plat signature).',
        forVariants: ['image_text'],
        itemFields: [
          { name: 'label', label: 'Mention', type: 'text' },
          { name: 'name', label: 'Nom du plat', type: 'text' },
          { name: 'value', label: 'Prix ou valeur', type: 'text' },
        ],
      },
      { name: 'pill', label: 'Pastille sur l’image', type: 'text', forVariants: ['image_text'] },
      CTA,
      CTA_SECONDARY,
      { ...IMAGE_FIELD, forVariants: ['image_text', 'fullscreen', 'video'] },
      { ...champAltPourImage(IMAGE_FIELD), forVariants: ['image_text', 'fullscreen', 'video'] },
      {
        name: 'video',
        label: 'Vidéo de la bannière',
        type: 'video',
        translatable: false,
        forVariants: ['video'],
        help: 'Choisissez une vidéo déjà téléversée, ou collez son adresse. Sans vidéo, l’aperçu vous le dit clairement — le site publié reprend alors l’image en plein écran.',
      },
      {
        name: 'overlayTint',
        label: 'Voile sur la photo',
        type: 'color',
        translatable: false,
        forVariants: ['fullscreen', 'video'],
        against: '#FFFFFF',
        help: 'Teinte du voile posé sur l’image. « Thème » garde le voile sombre actuel.',
      },
      {
        name: 'titleColor',
        label: 'Titre',
        type: 'color',
        translatable: false,
        against: 'surface',
        help: 'Couleur du grand titre. « Thème » reprend l’apparence.',
      },
      {
        name: 'taglineColor',
        label: 'Accroche',
        type: 'color',
        translatable: false,
        against: 'surface',
      },
      {
        name: 'primaryColor',
        label: 'Bouton principal',
        type: 'color',
        translatable: false,
        against: '#FFFFFF',
      },
      {
        name: 'secondaryColor',
        label: 'Bouton secondaire',
        type: 'color',
        translatable: false,
      },
      { ...BLOCK_TINT, forVariants: ['image_text', 'centered'] },
      BLOCK_SPACING,
      VISIBLE_ON,
    ],
    implemented: true,
  },
  {
    type: 'text',
    label: 'Texte',
    description: 'Un bloc de texte avec un titre.',
    variants: [
      { id: 'one_column', label: 'Une colonne' },
      { id: 'two_columns', label: 'Deux colonnes' },
    ],
    fields: avecCouleursBloc([TITLE, { name: 'body', label: 'Texte', type: 'multiline', inlineMarkup: true }]),
    implemented: true,
  },
  {
    type: 'image_text',
    label: 'Image et texte',
    description: 'Une image accompagnée d’un texte.',
    variants: [
      { id: 'image_left', label: 'Image à gauche' },
      { id: 'image_right', label: 'Image à droite' },
    ],
    fields: avecCouleursBloc([TITLE, { name: 'body', label: 'Texte', type: 'multiline', inlineMarkup: true }, IMAGE_FIELD]),
    implemented: true,
  },
  {
    type: 'menu',
    label: 'Carte',
    description: 'Affiche vos plats. Les prix se gèrent dans Carte & prix.',
    variants: [
      { id: 'full', label: 'Carte complète' },
      { id: 'by_category', label: 'Par catégorie' },
      { id: 'tabs', label: 'Onglets' },
    ],
    fields: avecCouleursBloc([
      TITLE,
      SUBTITLE,
      {
        name: 'maxItems',
        label: 'Nombre de plats affichés',
        type: 'number',
        translatable: false,
        min: 1,
        max: 48,
        step: 1,
        unit: 'plats',
        help: 'Limite globale. Au-delà, les dernières catégories peuvent disparaître. Laisser vide pour tout afficher.',
      },
    ]),
    providesFrom: 'menu',
    implemented: true,
  },
  {
    type: 'menu_featured',
    label: 'Plats à la une',
    description: 'Met en avant quelques plats choisis dans la carte.',
    variants: [
      { id: 'grid', label: 'Grille' },
      { id: 'carousel', label: 'Carrousel' },
    ],
    fields: avecCouleursBloc([
      TITLE,
      SUBTITLE,
      {
        name: 'items',
        label: 'Plats mis en avant',
        type: 'list',
        maxItems: 8,
        help: 'Choisis dans la carte — seule la sélection est enregistrée ici.',
        itemFields: [{ name: 'ref', label: 'Plat', type: 'text', translatable: false }],
      },
    ]),
    providesFrom: 'menu',
    implemented: true,
  },
  {
    type: 'gallery',
    label: 'Galerie',
    description: 'Une série de photos.',
    variants: [
      { id: 'grid', label: 'Grille' },
      { id: 'mosaic', label: 'Mosaïque' },
      { id: 'carousel', label: 'Carrousel' },
    ],
    fields: avecCouleursBloc([
      TITLE,
      SUBTITLE,
      {
        name: 'items',
        label: 'Photos',
        type: 'list',
        itemFields: [
          { name: 'media', label: 'Photo', type: 'image', translatable: false, required: true },
          { name: 'caption', label: 'Légende', type: 'text' },
        ],
      },
    ]),
    implemented: true,
  },
  {
    type: 'testimonials',
    label: 'Avis',
    description: 'Ce que disent vos clients, en cartes ou citations.',
    variants: [
      { id: 'cards', label: 'Cartes' },
      { id: 'quotes', label: 'Citations' },
    ],
    fields: avecCouleursBloc([
      TITLE,
      SUBTITLE,
      {
        name: 'items',
        label: 'Avis',
        type: 'list',
        help: 'Tant qu’aucun avis n’est saisi, le bloc reste masqué sur le site.',
        itemFields: [
          { name: 'name', label: 'Nom du client', type: 'text', required: true },
          { name: 'text', label: 'Son avis', type: 'multiline', required: true, inlineMarkup: true },
          // Note et photo volontairement ABSENTES du registre : aucun composant
          // ne les rend. Les déclarerait offrir au restaurateur un champ sans
          // effet visible. À réajouter quand `Testimonials` les affichera.
        ],
      },
    ]),
    implemented: true,
  },
  {
    type: 'team',
    label: 'Équipe',
    description: 'Présentez les personnes de la maison (nom, rôle, texte).',
    variants: [
      { id: 'grid', label: 'Grille' },
      { id: 'list', label: 'Liste' },
    ],
    fields: avecCouleursBloc([
      TITLE,
      SUBTITLE,
      {
        name: 'members',
        label: 'Membres',
        type: 'list',
        itemFields: [
          { name: 'name', label: 'Nom', type: 'text', required: true },
          { name: 'role', label: 'Rôle', type: 'text' },
          { name: 'desc', label: 'Présentation', type: 'multiline', inlineMarkup: true },
          // Portrait : volontairement ABSENT du registre — `Team` affiche les
          // photos de la médiathèque par emplacements (`equipe-1`…`equipe-4`),
          // pas par membre. À réajouter quand le composant lit `photo`.
        ],
      },
    ]),
    implemented: true,
  },
  {
    type: 'story',
    label: 'Notre histoire',
    description: 'Le récit de la maison, photo et signature.',
    variants: [
      { id: 'image_left', label: 'Image à gauche' },
      { id: 'image_right', label: 'Image à droite' },
    ],
    fields: avecCouleursBloc([
      TITLE,
      { name: 'body', label: 'Récit', type: 'multiline', required: true, inlineMarkup: true },
      { name: 'signature', label: 'Signature', type: 'text', help: 'Le nom affiché sur la photo.' },
      { name: 'signerole', label: 'Fonction', type: 'text', help: 'Ex. « Le fondateur ».' },
      CHIPS,
      IMAGE_FIELD,
    ]),
    implemented: true,
  },
  {
    type: 'engagements',
    label: 'Engagements',
    description: 'Vos promesses : bio, local, qualité…',
    variants: [
      { id: 'grid', label: 'Grille' },
      { id: 'list', label: 'Liste' },
    ],
    fields: avecCouleursBloc([
      TITLE,
      SUBTITLE,
      {
        name: 'items',
        label: 'Engagements',
        type: 'list',
        itemFields: [
          {
            name: 'icon',
            label: 'Icône',
            type: 'select',
            translatable: false,
            help: 'Choisie dans une liste fermée — saisie libre impossible, donc aucune valeur ne peut casser l’affichage.',
            options: [
              { value: 'leaf', label: 'Feuille — bio, nature' },
              { value: 'fire', label: 'Flamme — cuisson, four' },
              { value: 'recycle', label: 'Recyclage — emballages éco' },
              { value: 'search', label: 'Loupe — transparence' },
              { value: 'coin', label: 'Pièce — prix, accessibilité' },
              { value: 'pin', label: 'Repère — local, ancrage' },
              { value: 'clock', label: 'Horloge — service, rapidité' },
              { value: 'phone', label: 'Téléphone — contact' },
              { value: 'mail', label: 'Envelope — écrit' },
              { value: 'star', label: 'Étoile — qualité' },
              { value: 'users', label: 'Personnes — équipe, clients' },
            ],
          },
          { name: 'title', label: 'Titre', type: 'text', required: true },
          { name: 'desc', label: 'Description', type: 'multiline', inlineMarkup: true },
        ],
      },
    ]),
    implemented: true,
  },
  {
    type: 'location',
    label: 'Nous trouver',
    description: 'Adresse et horaires (pris dans Réglages, saisis une seule fois).',
    variants: [
      { id: 'card', label: 'Encart' },
      { id: 'wide', label: 'Pleine largeur' },
    ],
    fields: avecCouleursBloc([TITLE, SUBTITLE]),
    usesRestaurantSettings: true,
    implemented: true,
  },
  {
    type: 'map',
    label: 'Plan',
    description: 'Un plan de localisation sur la page.',
    variants: [],
    fields: avecCouleursBloc([
      TITLE,
      { name: 'latitude', label: 'Latitude', type: 'text', translatable: false },
      { name: 'longitude', label: 'Longitude', type: 'text', translatable: false },
      {
        name: 'zoom',
        label: 'Niveau de zoom',
        type: 'number',
        translatable: false,
        min: 1,
        max: 20,
        step: 1,
        help: 'De 1 (vue très large) à 20 (très rapproché).',
      },
    ]),
    implemented: false,
  },
  {
    type: 'reservation',
    label: 'Réservation',
    description: 'Formulaire pour réserver une table.',
    variants: [
      { id: 'card', label: 'Encart' },
      { id: 'wide', label: 'Pleine largeur' },
    ],
    fields: avecCouleursBloc([TITLE, SUBTITLE]),
    implemented: true,
  },
  {
    type: 'contact',
    label: 'Contact',
    description: 'Formulaire pour vous écrire (motifs au choix).',
    variants: [
      { id: 'card', label: 'Encart' },
      { id: 'wide', label: 'Pleine largeur' },
    ],
    fields: avecCouleursBloc([
      TITLE,
      SUBTITLE,
      {
        name: 'subjects',
        label: 'Motifs proposés',
        type: 'list',
        help: 'Les choix du menu déroulant du formulaire.',
        itemFields: [
          { name: 'value', label: 'Identifiant', type: 'text', translatable: false, required: true },
          { name: 'label', label: 'Libellé affiché', type: 'text', required: true },
        ],
      },
    ]),
    implemented: true,
  },
  {
    type: 'blog',
    label: 'Journal',
    description: 'Vos articles du Blog, affichés sur la page.',
    variants: [
      { id: 'grid', label: 'Grille' },
      { id: 'list', label: 'Liste' },
    ],
    fields: avecCouleursBloc([
      TITLE,
      SUBTITLE,
      {
        name: 'maxItems',
        label: 'Nombre d’articles affichés',
        type: 'number',
        translatable: false,
        min: 1,
        max: 24,
        step: 1,
        unit: 'articles',
        help: 'Les plus récents d’abord. Laisser vide pour tout afficher.',
      },
    ]),
    providesFrom: 'blog',
    implemented: true,
  },
  {
    type: 'faq',
    label: 'Questions fréquentes',
    description: 'Une liste de questions et de réponses.',
    variants: [
      { id: 'accordion', label: 'Accordéon' },
      { id: 'list', label: 'Liste' },
    ],
    fields: avecCouleursBloc([
      TITLE,
      SUBTITLE,
      {
        name: 'items',
        label: 'Questions',
        type: 'list',
        itemFields: [
          { name: 'question', label: 'Question', type: 'text', required: true },
          { name: 'answer', label: 'Réponse', type: 'multiline', required: true, inlineMarkup: true },
        ],
      },
    ]),
    implemented: true,
  },
  {
    type: 'cta',
    label: 'Appel à l’action',
    description: 'Un bandeau avec un bouton.',
    variants: [
      { id: 'banner', label: 'Bandeau' },
      { id: 'card', label: 'Encart' },
    ],
    fields: avecCouleursBloc([TITLE, { name: 'body', label: 'Texte', type: 'multiline', inlineMarkup: true }, CTA]),
    implemented: true,
  },
  {
    type: 'video',
    label: 'Vidéo',
    description: 'Une vidéo intégrée.',
    variants: [],
    fields: avecCouleursBloc([
      TITLE,
      { name: 'url', label: 'Adresse de la vidéo', type: 'text', translatable: false, required: true },
      { name: 'poster', label: 'Image de prévisualisation', type: 'image', translatable: false },
    ]),
    implemented: true,
  },
  {
    type: 'spacer',
    label: 'Espacement',
    description: 'Un espace vertical entre deux blocs.',
    variants: [
      { id: 'sm', label: 'Petit' },
      { id: 'md', label: 'Moyen' },
      { id: 'lg', label: 'Grand' },
    ],
    fields: [
      {
        name: 'size',
        label: 'Hauteur',
        type: 'select',
        translatable: false,
        options: [
          { value: 'sm', label: 'Petite' },
          { value: 'md', label: 'Moyenne' },
          { value: 'lg', label: 'Grande' },
        ],
      },
      BLOCK_SPACING,
      VISIBLE_ON,
    ],
    implemented: true,
  },
  {
    type: 'rich_text',
    label: 'Contenu libre',
    description: 'Un bloc de contenu librement rédigé.',
    variants: [],
    fields: avecCouleursBloc([TITLE, { name: 'body', label: 'Contenu', type: 'multiline', required: true, inlineMarkup: true }]),
    implemented: true,
  },
]

const BY_TYPE = new Map<SectionType, SectionTypeDefinition>(
  SECTION_TYPES.map((d) => [d.type, d]),
)

/** Définition d'un type, ou `undefined` si le type n'est pas au catalogue. */
export function getSectionDefinition(type: string): SectionTypeDefinition | undefined {
  return BY_TYPE.get(type as SectionType)
}

/** `true` si le type est connu du catalogue. */
export function isKnownSectionType(type: string): boolean {
  return BY_TYPE.has(type as SectionType)
}

/** Variante par défaut d'un type (première de la liste, ou `null`). */
export function defaultVariant(type: SectionType): string | null {
  return BY_TYPE.get(type)?.variants[0]?.id ?? null
}

/** Champs de contenu d'un type, ou tableau vide si le type est inconnu. */
export function fieldsFor(type: string): readonly FieldDef[] {
  return BY_TYPE.get(type as SectionType)?.fields ?? []
}

/** Types dont le composant visuel est déjà branché sur les données. */
export function implementedTypes(): SectionType[] {
  return SECTION_TYPES.filter((d) => d.implemented).map((d) => d.type)
}
