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

import { CIBLES_LIEN } from './site-chrome'

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
  | 'color' // teinte #RRGGBB, non traduisible ; vide = thème

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
  /**
   * Plafond d'un champ `number` : le restaurateur ne saisit pas une valeur
   * libre (pas de « 73 px »). Absent = pas de borne (à éviter).
   */
  min?: number
  max?: number
  /** Pas du curseur ; défaut 1. */
  step?: number
  /**
   * Mot affiché à côté du nombre, en langage de restaurant
   * (ex. « plats », « articles ») — jamais une unité CSS.
   */
  unit?: string
  /**
   * Gras / italique / lien seulement. À n’activer que si le rendu public
   * affiche ce HTML (InlineHtml). Sinon les balises apparaîtraient en clair.
   */
  inlineMarkup?: boolean
  /**
   * Pour `type: 'color'` : couleur de contraste pour l’alerte de lisibilité.
   * Clé du thème (`text`, `bg`, `surface`, `heading`) ou une couleur #RRGGBB.
   * Jamais affichée au restaurateur.
   */
  against?: string
}

/** Interprète une saisie numérique (virgule ou point). */
export function parseFieldNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^-?\d+([.,]\d+)?$/.test(value.trim())) {
    const n = Number(value.trim().replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Ramène un nombre dans [min, max] et sur le pas déclaré.
 * Sans `min`/`max`, la valeur est renvoyée telle quelle (si finie).
 */
export function clampFieldNumber(field: FieldDef, n: number): number {
  if (!Number.isFinite(n)) return field.min ?? 0
  let v = n
  if (field.min !== undefined) v = Math.max(field.min, v)
  if (field.max !== undefined) v = Math.min(field.max, v)
  const step = field.step && field.step > 0 ? field.step : 1
  const base = field.min ?? 0
  v = base + Math.round((v - base) / step) * step
  if (field.min !== undefined) v = Math.max(field.min, v)
  if (field.max !== undefined) v = Math.min(field.max, v)
  return v
}

/** `true` si le champ a un intervalle utilisable par un curseur. */
export function hasNumericBounds(field: FieldDef): boolean {
  return field.type === 'number' && field.min !== undefined && field.max !== undefined && field.min < field.max
}

/** Champ « Titre », partagé par presque toutes les sections. */
export const TITLE: FieldDef = {
  name: 'title',
  label: 'Titre',
  type: 'text',
  required: true,
  /** R12 — toolbox courte (gras / italique / lien), pas le traitement de texte long. */
  inlineMarkup: true,
}

/** Champ « Sous-titre », partagé par presque toutes les sections. */
export const SUBTITLE: FieldDef = {
  name: 'subtitle',
  label: 'Sous-titre',
  type: 'multiline',
  inlineMarkup: true,
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
      {
        name: 'target',
        label: 'Page du site',
        type: 'select',
        translatable: false,
        options: CIBLES_LIEN.map((c) => ({ value: c.id, label: c.label })),
        help: 'Même liste que les liens de l’en-tête.',
      },
    ],
  }
}

/** Fond de section — lu par l’enveloppe du renderer, pas par chaque bloc. */
export const BLOCK_TINT: FieldDef = {
  name: 'blockTint',
  label: 'Fond du bloc',
  type: 'color',
  translatable: false,
  against: 'text',
  help: 'Laissez « Thème » pour garder le fond actuel.',
}

/** Titre de section — appliqué au titre du bloc via l’enveloppe. */
export const HEADING_COLOR: FieldDef = {
  name: 'headingColor',
  label: 'Titre du bloc',
  type: 'color',
  translatable: false,
  against: 'surface',
  help: 'Laissez « Thème » pour garder la couleur du titre de l’apparence.',
}

export const SECTION_SPACING = ['compact', 'normal', 'roomy'] as const
export type SectionSpacing = (typeof SECTION_SPACING)[number]

/** Air autour du bloc — mots, pas des pixels. Défaut : Normal. */
export const BLOCK_SPACING: FieldDef = {
  name: 'spacing',
  label: 'Espacement du bloc',
  type: 'select',
  translatable: false,
  options: [
    { value: 'compact', label: 'Serré' },
    { value: 'normal', label: 'Normal' },
    { value: 'roomy', label: 'Aéré' },
  ],
  help: 'L’air autour du contenu. Normal est le réglage habituel.',
}

export function normaliserEspacement(value: unknown): SectionSpacing {
  return value === 'compact' || value === 'roomy' ? value : 'normal'
}

export const VISIBLE_ON_VALUES = ['all', 'desktop', 'mobile'] as const
export type VisibleOn = (typeof VISIBLE_ON_VALUES)[number]

/** Appareils sur lesquels le bloc s’affiche. Défaut : les deux. Pas l’en-tête ni le pied. */
export const VISIBLE_ON: FieldDef = {
  name: 'visibleOn',
  label: 'Visible sur',
  type: 'select',
  translatable: false,
  options: [
    { value: 'all', label: 'Bureau et téléphone' },
    { value: 'desktop', label: 'Bureau seulement' },
    { value: 'mobile', label: 'Téléphone seulement' },
  ],
  help: 'Le bloc reste dans la page. Il ne s’affiche que sur les appareils choisis.',
}

export function normaliserVisibleOn(value: unknown): VisibleOn {
  return value === 'desktop' || value === 'mobile' ? value : 'all'
}

/** Clé du texte alternatif jumelé à un champ image, sans nouveau stockage. */
export function nomChampAltImage(imageName: string): string {
  return `${imageName}Alt`
}

export function champEstAltImage(field: FieldDef, voisins: readonly FieldDef[]): boolean {
  return voisins.some((img) => img.type === 'image' && nomChampAltImage(img.name) === field.name)
}

export function champAltPourImage(image: FieldDef): FieldDef {
  return {
    name: nomChampAltImage(image.name),
    label: 'Texte alternatif',
    type: 'text',
    help: 'Décrivez la photo pour les non-voyants.',
  }
}

/** Ajoute un texte alternatif après chaque champ image (y compris dans une liste). */
export function injecterChampsAltImage(fields: readonly FieldDef[]): FieldDef[] {
  const out: FieldDef[] = []
  for (const field of fields) {
    if ((field.type === 'list' || field.type === 'group') && field.itemFields) {
      out.push({ ...field, itemFields: injecterChampsAltImage(field.itemFields) })
      continue
    }
    out.push(field)
    if (field.type === 'image' && !fields.some((f) => f.name === nomChampAltImage(field.name))) {
      out.push(champAltPourImage(field))
    }
  }
  return out
}
