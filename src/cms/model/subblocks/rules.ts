/**
 * Sous-blocs — moteur de règles PUR (Gutenberg / Shopify sections).
 *
 * IDENTIFIANTS EN ANGLAIS. Commentaires produit en FRANÇAIS.
 *
 * EXCLUS CANVA (ne pas « corriger » en ajoutant du drag en pixels) :
 * ce module ne connaît ni x, ni y, ni rotation, ni calque. Un « sous-bloc »
 * est un emplacement nommé du schéma de section. Grouper = ensemble
 * d’emplacements de LA MÊME section, comme un Groupe Gutenberg.
 *
 * R1  Un emplacement appartient à au plus un groupe.
 * R2  On ne groupe que des emplacements de la même section.
 * R3  Un emplacement verrouillé n’accepte pas de patch contenu ; un groupe
 *     verrouillé (`members` ou `group`) verrouille tous ses membres.
 * R4  Dégrouper interdit si `lock === 'group'` (grouper-bloquer) — déverrouiller d’abord.
 * R5  Clic élément → cet élément ; Shift + même section → étend la sélection ;
 *     propriétés de groupe ssi 2+ sélectionnés ou un groupe existant cliqué.
 * R6  Propriétés d’élément (texte, couleur si FieldDef color) vs propriétés de
 *     groupe (libellé, verrou). Teinte / alignement de paquet : stockés, rendus
 *     seulement si le renderer a un wrapper — aujourd’hui il n’en a pas.
 * R7  Header / footer : emplacements du ChromePanel ; pas de groupes
 *     cross-header-footer, ni chrome × page.
 * R8  Le public ignore les métadonnées de verrou (éditeur seulement).
 * R9  Pas de groupe vide. Dégrouper d’un singleton = no-op.
 * R10 Titres courts : `strong|em|a` (profil `inline`). Corps longs : profil `rich`.
 * R11 Traitement de texte désactivé si `canPatchSlot` est faux.
 * R12 Titres de bloc (`h1`/`h2`, champs courts) : toolbox courte, pas le Docs.
 * R13 Coller depuis Word/Docs = texte + balises autorisées seulement.
 */

import type { FieldDef } from '../sections/fields'
import {
  EDITOR_META_KEY,
  EMPTY_SELECTION,
  type EditorGroup,
  type EditorMeta,
  type EditorSurface,
  type GroupLock,
  type PackAlign,
  type SelectionState,
  type SlotPointer,
} from './types'

export type { EditorGroup, EditorMeta, EditorSurface, GroupLock, PackAlign, SelectionState, SlotPointer }
export { EDITOR_META_KEY, EMPTY_SELECTION }

/** Couleur d’un emplacement texte → l’emplacement texte qu’elle habille. */
const COLOR_ALIAS: Record<string, string> = {
  titleColor: 'title',
  headingColor: 'title',
  taglineColor: 'tagline',
  primaryColor: 'primaryCta',
  secondaryColor: 'secondaryCta',
}

export type MarkupProfile = 'none' | 'inline' | 'rich'

export interface GroupDecision {
  ok: boolean
  reason?: 'need-two' | 'already-grouped' | 'chrome' | 'locked' | 'missing' | 'singleton'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueSlots(slots: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of slots) {
    const slot = typeof raw === 'string' ? raw.trim() : ''
    if (!slot || seen.has(slot)) continue
    seen.add(slot)
    out.push(slot)
  }
  return out
}

function normaliserLock(value: unknown): GroupLock {
  if (value === 'members' || value === 'group' || value === 'none') return value
  return 'none'
}

function normaliserAlign(value: unknown): PackAlign | undefined {
  if (value === 'start' || value === 'center' || value === 'end') return value
  return undefined
}

function lireGroupe(raw: unknown): EditorGroup | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  if (!id) return null
  const slots = uniqueSlots(Array.isArray(raw.slots) ? raw.slots.map(String) : [])
  const label = typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : 'Groupe'
  const group: EditorGroup = {
    id,
    label,
    slots,
    lock: normaliserLock(raw.lock),
  }
  const packAlign = normaliserAlign(raw.packAlign)
  if (packAlign) group.packAlign = packAlign
  if (typeof raw.tint === 'string' && raw.tint.trim()) group.tint = raw.tint.trim()
  return group
}

/**
 * R1 + R9 — un emplacement dans un seul groupe ; pas de groupe à 0 ou 1 membre.
 * Le premier groupe conservé gagne en cas de collision (ordre du JSON).
 */
export function sanitizeGroups(groups: readonly EditorGroup[]): EditorGroup[] {
  const owned = new Set<string>()
  const out: EditorGroup[] = []
  const seenIds = new Set<string>()
  for (const group of groups) {
    const id = group.id.trim()
    if (!id || seenIds.has(id)) continue
    const slots = uniqueSlots(group.slots).filter((slot) => !owned.has(slot))
    if (slots.length < 2) continue
    for (const slot of slots) owned.add(slot)
    seenIds.add(id)
    out.push({
      ...group,
      id,
      slots,
      lock: normaliserLock(group.lock),
      label: group.label.trim() || 'Groupe',
    })
  }
  return out
}

export function readEditorMeta(content: Record<string, unknown> | null | undefined): EditorMeta {
  if (!content) return { groups: [] }
  const fromEditor = isRecord(content[EDITOR_META_KEY]) ? content[EDITOR_META_KEY] : null
  const rawGroups = fromEditor && Array.isArray(fromEditor.groups)
    ? fromEditor.groups
    : Array.isArray(content.groups)
      ? content.groups
      : []
  const groups: EditorGroup[] = []
  for (const item of rawGroups) {
    const group = lireGroupe(item)
    if (group) groups.push(group)
  }
  return { groups: sanitizeGroups(groups) }
}

export function writeEditorMeta(
  content: Record<string, unknown>,
  meta: EditorMeta,
): Record<string, unknown> {
  const groups = sanitizeGroups(meta.groups)
  const next = { ...content }
  delete next.groups
  if (groups.length === 0) {
    delete next[EDITOR_META_KEY]
    return next
  }
  next[EDITOR_META_KEY] = { groups }
  return next
}

export function findGroupForSlot(groups: readonly EditorGroup[], slot: string): EditorGroup | undefined {
  const canon = COLOR_ALIAS[slot] ?? slot
  return groups.find((g) => g.slots.includes(slot) || g.slots.includes(canon))
}

/** R12 / R10 — profil de balisage d’un champ du schéma. */
export function markupProfileForField(field: FieldDef | undefined): MarkupProfile {
  if (!field || !field.inlineMarkup) return 'none'
  if (field.type === 'multiline') return 'rich'
  if (field.type === 'text') return 'inline'
  return 'none'
}

/** R11 — la barre de traitement de texte ne s’active que si le patch est permis. */
export function canUseMarkup(content: Record<string, unknown>, slot: string, field?: FieldDef): boolean {
  if (!canPatchSlot(content, slot)) return false
  return markupProfileForField(field) !== 'none'
}

/**
 * R3 — un membre d’un groupe `members` ou `group` ne reçoit pas de patch.
 * Une couleur d’emplacement suit le verrou de l’emplacement qu’elle habille.
 */
export function canPatchSlot(content: Record<string, unknown>, slot: string): boolean {
  const { groups } = readEditorMeta(content)
  const group = findGroupForSlot(groups, slot)
  if (!group) return true
  return group.lock === 'none'
}

export function canGroup(
  content: Record<string, unknown>,
  slots: readonly string[],
  surface: EditorSurface = 'page',
): GroupDecision {
  // R7 — pas de groupes dans le chrome, ni entre en-tête et pied.
  if (surface !== 'page') return { ok: false, reason: 'chrome' }
  const unique = uniqueSlots(slots)
  if (unique.length < 2) return { ok: false, reason: 'need-two' }
  const { groups } = readEditorMeta(content)
  for (const slot of unique) {
    if (findGroupForSlot(groups, slot)) return { ok: false, reason: 'already-grouped' }
  }
  return { ok: true }
}

/** Bloquer : un groupe existant, pas encore en « grouper-bloquer ». */
export function canLock(
  content: Record<string, unknown>,
  groupId: string,
): GroupDecision {
  const group = readEditorMeta(content).groups.find((g) => g.id === groupId)
  if (!group) return { ok: false, reason: 'missing' }
  if (group.lock === 'group') return { ok: false, reason: 'locked' }
  return { ok: true }
}

/** R2 — les slots passés appartiennent déjà à une seule section (un content). */
export function groupSelection(
  content: Record<string, unknown>,
  slots: readonly string[],
  opts: { id: string; label?: string } ,
): Record<string, unknown> {
  const decision = canGroup(content, slots, 'page')
  if (!decision.ok) return content
  const unique = uniqueSlots(slots)
  const meta = readEditorMeta(content)
  const id = opts.id.trim() || `g-${unique.join('_')}`
  meta.groups = [
    ...meta.groups,
    {
      id,
      label: opts.label?.trim() || 'Groupe',
      slots: unique,
      lock: 'none',
    },
  ]
  return writeEditorMeta(content, meta)
}

/** Ajouter des emplacements libres à un groupe existant (même section / même content). */
export function addSlotsToGroup(
  content: Record<string, unknown>,
  groupId: string,
  slots: readonly string[],
): Record<string, unknown> {
  const unique = uniqueSlots(slots)
  if (unique.length === 0) return content
  const meta = readEditorMeta(content)
  const group = meta.groups.find((g) => g.id === groupId)
  if (!group) return content
  for (const slot of unique) {
    const owner = findGroupForSlot(meta.groups, slot)
    if (owner && owner.id !== groupId) return content
  }
  group.slots = uniqueSlots([...group.slots, ...unique])
  return writeEditorMeta(content, meta)
}

/**
 * Mode Grouper : le clic ajoute l’emplacement (même bloc), sans Maj.
 * Un autre bloc recommence la collecte. R5 reste valable hors de ce mode.
 */
export function selectInGroupMode(prev: SelectionState, pointer: SlotPointer): SelectionState {
  if (pointer.surface !== 'page' || !pointer.sectionId || !pointer.slot) {
    return selectClick(prev, { ...pointer, shift: false, toggle: false })
  }
  const same = prev.surface === 'page' && prev.sectionId === pointer.sectionId
  if (!same) {
    return {
      surface: 'page',
      sectionId: pointer.sectionId,
      slots: [pointer.slot],
      groupId: null,
    }
  }
  return {
    surface: 'page',
    sectionId: pointer.sectionId,
    slots: uniqueSlots([...prev.slots, pointer.slot]),
    groupId: prev.groupId,
  }
}

export interface GroupModeClickResult {
  content: Record<string, unknown>
  selection: SelectionState
}

/**
 * Clic en mode Grouper : accumule, crée le groupe dès 2 membres (canGroup),
 * puis ajoute les clics suivants au même groupe.
 */
export function applyGroupModeClick(
  content: Record<string, unknown>,
  prev: SelectionState,
  pointer: SlotPointer,
): GroupModeClickResult {
  if (pointer.surface !== 'page' || !pointer.slot || !pointer.sectionId) {
    return { content, selection: selectClick(prev, { ...pointer, shift: false, toggle: false }) }
  }

  const selection = selectInGroupMode(prev, pointer)
  const meta = readEditorMeta(content)
  const ownerIds: string[] = []
  for (const slot of selection.slots) {
    const owner = findGroupForSlot(meta.groups, slot)
    if (owner && !ownerIds.includes(owner.id)) ownerIds.push(owner.id)
  }

  if (ownerIds.length === 1) {
    const groupId = ownerIds[0]
    const group = meta.groups.find((g) => g.id === groupId)
    if (!group) return { content, selection }
    const nouveaux = selection.slots.filter((slot) => !findGroupForSlot(meta.groups, slot))
    if (nouveaux.length > 0) {
      const next = addSlotsToGroup(content, groupId, nouveaux)
      const updated = readEditorMeta(next).groups.find((g) => g.id === groupId)
      return {
        content: next,
        selection: {
          surface: 'page',
          sectionId: selection.sectionId,
          slots: updated?.slots ?? uniqueSlots([...group.slots, ...nouveaux]),
          groupId,
        },
      }
    }
    return {
      content,
      selection: {
        surface: 'page',
        sectionId: selection.sectionId,
        slots: uniqueSlots([...group.slots, ...selection.slots]),
        groupId,
      },
    }
  }

  if (canGroup(content, selection.slots, 'page').ok) {
    const next = groupSelection(content, selection.slots, {
      id: `g-${selection.slots.join('_')}`,
      label: 'Groupe',
    })
    const created = readEditorMeta(next).groups.find((g) =>
      g.slots.length === selection.slots.length && selection.slots.every((s) => g.slots.includes(s)),
    )
    return {
      content: next,
      selection: {
        surface: 'page',
        sectionId: selection.sectionId,
        slots: created?.slots ?? selection.slots,
        groupId: created?.id ?? null,
      },
    }
  }

  return { content, selection }
}

export function canUngroup(content: Record<string, unknown>, groupId: string): GroupDecision {
  const group = readEditorMeta(content).groups.find((g) => g.id === groupId)
  if (!group) return { ok: false, reason: 'missing' }
  // R9 — un singleton n’est pas un groupe ; le sanitizer l’a déjà retiré.
  if (group.slots.length < 2) return { ok: false, reason: 'singleton' }
  // R4 — grouper-bloquer : déverrouiller d’abord.
  if (group.lock === 'group') return { ok: false, reason: 'locked' }
  return { ok: true }
}

export function ungroup(content: Record<string, unknown>, groupId: string): Record<string, unknown> {
  if (!canUngroup(content, groupId).ok) return content
  const meta = readEditorMeta(content)
  meta.groups = meta.groups.filter((g) => g.id !== groupId)
  return writeEditorMeta(content, meta)
}

export function lockGroup(
  content: Record<string, unknown>,
  groupId: string,
  lock: Exclude<GroupLock, 'none'>,
): Record<string, unknown> {
  const meta = readEditorMeta(content)
  const group = meta.groups.find((g) => g.id === groupId)
  if (!group) return content
  group.lock = lock
  return writeEditorMeta(content, meta)
}

export function unlock(content: Record<string, unknown>, groupId: string): Record<string, unknown> {
  const meta = readEditorMeta(content)
  const group = meta.groups.find((g) => g.id === groupId)
  if (!group) return content
  group.lock = 'none'
  return writeEditorMeta(content, meta)
}

export function renameGroup(
  content: Record<string, unknown>,
  groupId: string,
  label: string,
): Record<string, unknown> {
  const meta = readEditorMeta(content)
  const group = meta.groups.find((g) => g.id === groupId)
  if (!group) return content
  group.label = label.trim() || 'Groupe'
  return writeEditorMeta(content, meta)
}

export function setGroupPackAlign(
  content: Record<string, unknown>,
  groupId: string,
  packAlign: PackAlign,
): Record<string, unknown> {
  const meta = readEditorMeta(content)
  const group = meta.groups.find((g) => g.id === groupId)
  if (!group) return content
  group.packAlign = packAlign
  return writeEditorMeta(content, meta)
}

function toggleSlot(slots: readonly string[], slot: string): string[] {
  return slots.includes(slot) ? slots.filter((s) => s !== slot) : [...slots, slot]
}

/**
 * R5 + R7 — décision de sélection, sans React.
 * Un clic sur un membre d’un groupe sélectionne L’ÉLÉMENT, pas le groupe
 * (sauf clic explicite `groupId` depuis Structure).
 */
export function selectClick(prev: SelectionState, pointer: SlotPointer): SelectionState {
  const etendre = Boolean(pointer.shift || pointer.toggle)

  if (pointer.surface === 'header' || pointer.surface === 'footer') {
    const memeChrome = prev.surface === pointer.surface
    if (etendre && memeChrome && pointer.slot) {
      const base = prev.slots
      return {
        surface: pointer.surface,
        sectionId: null,
        slots: uniqueSlots(toggleSlot(base, pointer.slot)),
        groupId: null,
      }
    }
    return {
      surface: pointer.surface,
      sectionId: null,
      slots: pointer.slot ? [pointer.slot] : [],
      groupId: null,
    }
  }

  if (pointer.groupId) {
    return {
      surface: 'page',
      sectionId: pointer.sectionId,
      slots: [],
      groupId: pointer.groupId,
    }
  }

  if (!pointer.slot) {
    return {
      surface: 'page',
      sectionId: pointer.sectionId,
      slots: [],
      groupId: null,
    }
  }

  const sameSection =
    prev.surface === 'page'
    && prev.sectionId !== null
    && prev.sectionId === pointer.sectionId

  if (etendre && sameSection) {
    const base = prev.groupId ? [] : prev.slots
    const slots = uniqueSlots(toggleSlot(base, pointer.slot))
    return {
      surface: 'page',
      sectionId: pointer.sectionId,
      slots,
      groupId: null,
    }
  }

  return {
    surface: 'page',
    sectionId: pointer.sectionId,
    slots: [pointer.slot],
    groupId: null,
  }
}

/** R5 — le panneau Groupe s’affiche pour 2+ emplacements ou un groupe cliqué. */
export function showsGroupProperties(selection: SelectionState, content?: Record<string, unknown>): boolean {
  if (selection.surface !== 'page') return false
  if (selection.groupId) {
    if (!content) return true
    return readEditorMeta(content).groups.some((g) => g.id === selection.groupId)
  }
  return selection.slots.length >= 2
}

export function slotablesFromFields(fields: readonly FieldDef[]): FieldDef[] {
  return fields.filter((f) => f.type === 'text' || f.type === 'multiline' || f.type === 'group')
}

export function colorFieldForSlot(fields: readonly FieldDef[], slot: string): FieldDef | undefined {
  const wanted = `${slot}Color`.replace(/CtaColor$/, 'Color')
  const aliases: Record<string, string[]> = {
    title: ['titleColor', 'headingColor'],
    tagline: ['taglineColor'],
    primaryCta: ['primaryColor'],
    secondaryCta: ['secondaryColor'],
  }
  const names = aliases[slot] ?? [wanted]
  return fields.find((f) => f.type === 'color' && names.includes(f.name))
}
