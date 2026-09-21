/**
 * Sous-blocs — types du modèle Gutenberg (emplacements nommés).
 *
 * CE QUE CE N’EST PAS (exclu Canva, volontairement) :
 * pas de calques x/y, pas de rotation, pas de z-index, pas d’artboard.
 * Un emplacement = une clé de schéma (titre, accroche, bouton…), pas une
 * boîte de texte positionnée en pixels.
 */

/** Surface d’édition : page CMS, ou chrome global (pas de groupe croisé). */
export type EditorSurface = 'page' | 'header' | 'footer'

/**
 * Verrou d’un groupe (éditeur seulement — le public ignore cette métadonnée).
 * - `none` : les membres s’éditent, on peut dégrouper
 * - `members` : l’édition du contenu des membres est bloquée ; on peut encore dégrouper
 * - `group` : grouper-bloquer — les membres restent ensemble ; dégrouper interdit tant que verrouillé
 */
export type GroupLock = 'none' | 'members' | 'group'

/** Alignement du paquet (stocké ; appliqué seulement si un wrapper de rendu existe). */
export type PackAlign = 'start' | 'center' | 'end'

export interface EditorGroup {
  id: string
  /** Libellé restaurateur, ex. « Titre + accroche ». */
  label: string
  /** Clés d’emplacements de LA MÊME section. */
  slots: string[]
  lock: GroupLock
  packAlign?: PackAlign
  /** Teinte de groupe — ignorée tant que le renderer n’a pas de wrapper. */
  tint?: string
}

export interface EditorMeta {
  groups: EditorGroup[]
}

export interface SelectionState {
  surface: EditorSurface
  sectionId: string | null
  /** Emplacements sélectionnés (0 = le bloc entier). */
  slots: string[]
  /** Groupe cliqué dans Structure, ou `null`. */
  groupId: string | null
}

export interface SlotPointer {
  surface: EditorSurface
  sectionId: string | null
  slot: string | null
  /** Clic sur un groupe existant (colonne Structure). */
  groupId?: string | null
  /** Maj+clic : ajouter / retirer dans la même section (R5). */
  shift: boolean
  /** Ctrl/Cmd+clic : bascule cet emplacement dans la sélection. */
  toggle?: boolean
}

export const EMPTY_SELECTION: SelectionState = {
  surface: 'page',
  sectionId: null,
  slots: [],
  groupId: null,
}

/** Clé JSON dans le contenu de section (pas une table SQL). */
export const EDITOR_META_KEY = '_editor'
