/**
 * Greatlife — CMS : briques de description des champs
 * ====================================================
 * Chaque type de section déclare ses champs (voir `schemas.ts`). C'est cette
 * description qui permettra à l'éditeur (Lot 2) de générer ses formulaires
 * automatiquement, et au futur AI Copilot (TDR §35) de connaître le contenu
 * manipulable sans coder en dur.
 *
 * Décision DB-10 : la validation appartient au registre applicatif, pas à une
 * contrainte en base — le catalogue évolue sans migration.
 *
 * §2 du TDR : les libellés s'adressent au restaurateur. On écrit « Titre du
 * bloc », jamais « title » ni « string ».
 *
 * ⚠️ Règle de conception : ce fichier décrit la forme RÉELLEMENT stockée en
 * base (migrations 021 → 027). Il ne la prescrit pas. Toute divergence est un
 * défaut du registre, jamais de la donnée.
 */

export type FieldType =
  | 'text' // une seule ligne
  | 'multiline' // plusieurs lignes
  | 'image' // référence à un média de la médiathèque
  | 'video' // adresse d'une vidéo (médiathèque ou URL)
  | 'number'
  | 'boolean'
  | 'select'
  | 'list' // liste d'éléments répétés
  | 'group' // un objet unique, avec ses propres sous-champs

export interface FieldOption {
  value: string
  label: string
}

export interface FieldDef {
  /** Clé technique dans `content` (jamais montrée au restaurateur). */
  name: string
  /** Libellé affiché. */
  label: string
  type: FieldType
  required?: boolean
  /**
   * `true` (défaut) : le champ est traduisible — stocké `{ fr, en }`.
   * `false` : valeur unique (téléphone, identifiant, coordonnée…).
   */
  translatable?: boolean
  /** Aide affichée sous le champ, en langage simple. */
  help?: string
  /**
   * Si renseigné, le champ n'apparaît que pour ces dispositions.
   * Absent = visible quelle que soit la disposition.
   */
  forVariants?: readonly string[]
  options?: readonly FieldOption[]
  /**
   * Pour `type: 'list'` d'OBJETS et pour `type: 'group'` : les champs de
   * chaque élément. Exclusif avec `itemType`.
   */
  itemFields?: readonly FieldDef[]
  /**
   * Pour `type: 'list'` de VALEURS SIMPLES (et non d'objets) : le type de
   * chaque valeur. Ex. les pastilles du Hero sont une liste de textes, stockée
   * `[{ fr: "100% bio" }, …]` — pas une liste d'objets `{ value: … }`.
   */
  itemType?: FieldType
  /** Nombre maximal d'éléments, pour `type: 'list'`. */
  maxItems?: number
}

/** Champ « Titre », partagé par presque toutes les sections. */
export const TITLE: FieldDef = {
  name: 'title',
  label: 'Titre',
  type: 'text',
  required: true,
}

/** Champ « Sous-titre », partagé par presque toutes les sections. */
export const SUBTITLE: FieldDef = {
  name: 'subtitle',
  label: 'Sous-titre',
  type: 'multiline',
}

/**
 * Liste de pastilles argumentaires (ex. « 100% bio »).
 * C'est une liste de TEXTES traduisibles, pas une liste d'objets : le renderer
 * la lit avec `cmsTextList` (voir `renderer/compat.ts`).
 */
export const CHIPS: FieldDef = {
  name: 'chips',
  label: 'Pastilles',
  type: 'list',
  itemType: 'text',
  maxItems: 6,
  help: 'Courts arguments affichés sous le texte (ex. « 100% bio »).',
}

/**
 * Champ « Image » rattaché à la médiathèque.
 * `translatable: false` : la même photo sert les deux langues.
 */
export const IMAGE_FIELD: FieldDef = {
  name: 'image',
  label: 'Image',
  type: 'image',
  translatable: false,
  help: 'Choisie dans la médiathèque.',
}

/**
 * Bouton : un OBJET unique `{ label, target }`, pas une liste à un élément.
 * `target` est une ancre SANS `#` (ex. `carte`) — le renderer construit le lien.
 */
export function ctaField(name: string, label: string, required = true): FieldDef {
  return {
    name,
    label,
    type: 'group',
    required,
    itemFields: [
      { name: 'label', label: 'Texte du bouton', type: 'text', required: true },
      { name: 'target', label: 'Destination', type: 'text', translatable: false },
    ],
  }
}
