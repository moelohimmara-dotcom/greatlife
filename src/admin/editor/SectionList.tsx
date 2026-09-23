/**
 * Greatlife — CMS : colonne Structure
 * =====================================
 * Deux natures :
 *   1. Mise en page — gabarit + En-tête / Pied (chrome hors ordre de page)
 *   2. Blocs — groupés par famille métier (tiroirs d’affichage)
 *
 * Les tiroirs de familles groupent seulement l’AFFICHAGE. Le réordonnancement
 * reste sur la liste à plat (ids dans l’ordre de page). Un bloc dans un tiroir
 * fermé n’est pas une cible de dépôt — l’ordre interne ne change pas.
 * En-tête / Pied ne sont ni réordonnables ni supprimables ici.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createPortal } from 'react-dom'
import { Icon, iconByName } from '@/lib/icons'
import { defaultVariant, getSectionDefinition } from '@/cms/model/sections/schemas'
import type { PageSection, SectionType } from '@/cms/model/section'
import { resolveI18n, type Bilingue } from '@/cms/model/i18n'
import {
  Bouton,
  CLASSE_CARTE,
  ESPACE,
  HAUTEUR,
  RAYON,
  styleCarteTiroir,
  styleEnteteTiroir,
  styleLibelleNature,
  ADMIN_ACTIVE_BG,
  ADMIN_CORAL,
  ADMIN_FOREST,
  ADMIN_INK,
  ADMIN_LINE,
  ADMIN_MUTED,
  ADMIN_SURFACE,
} from './chrome'
import { PageLayoutPicker } from './PageLayoutPicker'
import { libelleStructureBloc, rangsParType } from './structure-labels'
import { FAMILLES_STRUCTURE, TYPE_ICONE, familleStructureDe } from './section-families'
import { readEditorMeta } from '@/cms/model/subblocks'
import type { PageLayout } from '@/cms/model/page-layout'
import type { Locale } from '@/cms/model/i18n'

interface SectionListProps {
  sections: PageSection[]
  selected: number | null
  selectedSlots?: string[]
  selectedGroupId?: string | null
  chrome: 'header' | 'footer' | null
  onSelect: (index: number | null) => void
  onSelectSlot?: (index: number, slot: string, shift: boolean) => void
  onSelectGroup?: (index: number, groupId: string) => void
  onSelectChrome: (id: 'header' | 'footer') => void
  onReorder: (from: number, to: number) => void
  onToggleVisibility: (index: number) => void
  onRemove: (index: number) => void
  onDuplicate: (index: number) => void
  onAdd: () => void
  locale?: Locale
  layout?: PageLayout
  onLayoutChange?: (layout: PageLayout) => void
  layoutDisabled?: boolean
}

/** Alias local — familles partagées avec le picker (`section-families.ts`). */
const FAMILLES = FAMILLES_STRUCTURE

function familleDe(type: string): string {
  return familleStructureDe(type)
}

/** Index sélectionné après un déplacement dans la liste à plat. */
function indexApresDeplacement(from: number, to: number, selected: number | null): number | null {
  if (selected === null || from === to) return selected
  if (selected === from) return to
  if (from < to && selected > from && selected <= to) return selected - 1
  if (from > to && selected >= to && selected < from) return selected + 1
  return selected
}

type PlageFamille = {
  /** Clé unique de plage (plusieurs plages « Autres » possibles). */
  cle: string
  id: string
  label: string
  icone: string
  entrees: { section: PageSection; index: number }[]
}

export function SectionList({
  sections,
  selected,
  selectedSlots = [],
  selectedGroupId = null,
  chrome,
  onSelect,
  onSelectSlot,
  onSelectGroup,
  onSelectChrome,
  onReorder,
  onToggleVisibility,
  onRemove,
  onDuplicate,
  onAdd,
  locale = 'fr',
  layout,
  onLayoutChange,
  layoutDisabled,
}: SectionListProps) {
  const baseId = useId()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const items = useMemo(() => sections.map((s) => s.id), [sections])

  /*
   * Tiroirs = affichage. Pour que dnd-kit garde un ordre visuel = ordre de page,
   * on groupe par plages consécutives (pas un seau par famille qui réordonnerait
   * le DOM). Un type isolé n’ouvre pas de tiroir vide : pas de plage, pas de groupe.
   */
  const groupes = useMemo((): PlageFamille[] => {
    const plages: PlageFamille[] = []
    sections.forEach((section, index) => {
      const id = familleDe(section.type)
      const meta = FAMILLES.find((f) => f.id === id) ?? FAMILLES[FAMILLES.length - 1]
      const derniere = plages[plages.length - 1]
      if (derniere && derniere.id === id) {
        derniere.entrees.push({ section, index })
      } else {
        plages.push({
          cle: `${id}-${index}`,
          id,
          label: meta.label,
          icone: meta.icone,
          entrees: [{ section, index }],
        })
      }
    })
    return plages
  }, [sections])

  const plageSelectionnee = useMemo(() => {
    if (selected === null) return null
    return groupes.find((g) => g.entrees.some((e) => e.index === selected))?.cle ?? null
  }, [groupes, selected])

  const [ouverts, setOuverts] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    if (plageSelectionnee) init[plageSelectionnee] = true
    return init
  })

  useEffect(() => {
    if (!plageSelectionnee) return
    setOuverts((prev) => (prev[plageSelectionnee] ? prev : { ...prev, [plageSelectionnee]: true }))
  }, [plageSelectionnee])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.indexOf(active.id as string)
    const newIndex = items.indexOf(over.id as string)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(oldIndex, newIndex)
    const suivant = indexApresDeplacement(oldIndex, newIndex, selected)
    if (suivant !== selected) onSelect(suivant)
  }

  function deplacer(from: number, to: number) {
    if (to < 0 || to >= sections.length) return
    onReorder(from, to)
    const suivant = indexApresDeplacement(from, to, selected)
    if (suivant !== selected) onSelect(suivant)
  }

  const libelleCompte = (n: number) => `${n} bloc${n > 1 ? 's' : ''}`
  const { total: totalParType, rang: rangParIndex } = useMemo(() => rangsParType(sections), [sections])

  return (
    <div className="admin-block-tree">
      {/* Nature 1 — Mise en page (gabarit + chrome En-tête / Pied) */}
      <PageLayoutPicker
        value={layout}
        onChange={onLayoutChange}
        disabled={layoutDisabled}
        chrome={chrome}
        onSelectChrome={onSelectChrome}
      />

      {/* Nature 2 — Blocs de contenu, par famille métier */}
      <div role="group" aria-label="Blocs de contenu" className="admin-block-tree-blocs">
        <div className="admin-editor-nature-label" style={styleLibelleNature()}>Blocs</div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {groupes.map((groupe) => {
              const ouvert = Boolean(ouverts[groupe.cle])
              const panelId = `${baseId}-${groupe.cle}`
              const n = groupe.entrees.length
              const compte = libelleCompte(n)
              const iconeFamille = iconByName(groupe.icone) ?? Icon.more
              return (
                <div
                  key={groupe.cle}
                  role="group"
                  aria-label={`${groupe.label}, ${compte}`}
                  className={`${CLASSE_CARTE} admin-block-family`}
                  style={styleCarteTiroir()}
                >
                  <Bouton
                    etendu
                    genre="silencieux"
                    aria-expanded={ouvert}
                    aria-controls={ouvert ? panelId : undefined}
                    aria-label={`${groupe.label}, ${compte}`}
                    title={n > 1 ? compte : undefined}
                    onClick={() => setOuverts((prev) => ({ ...prev, [groupe.cle]: !prev[groupe.cle] }))}
                    style={styleEnteteTiroir()}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'flex',
                        flexShrink: 0,
                        transform: ouvert ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      {Icon.chevronDown(16, ADMIN_MUTED)}
                    </span>
                    <span aria-hidden="true" style={{ display: 'flex', flexShrink: 0 }}>
                      {iconeFamille(16, ADMIN_INK)}
                    </span>
                    <span aria-hidden="true" style={{
                      flex: 1, minWidth: 0, textAlign: 'left', fontSize: 13, fontWeight: 700, color: ADMIN_INK,
                      whiteSpace: 'nowrap',
                    }}>
                      {groupe.label}
                      {n > 1 && (
                        <span style={{ fontWeight: 500, color: ADMIN_MUTED, marginLeft: 8 }}>{compte}</span>
                      )}
                    </span>
                  </Bouton>

                  {ouvert && (
                    <div id={panelId} role="list" aria-label={`Blocs · ${groupe.label}`} style={{ padding: '0 12px 12px' }}>
                      {groupe.entrees.map(({ section, index }) => (
                        <div key={section.id} role="listitem">
                          <SortableItem
                            id={section.id}
                            section={section}
                            index={index}
                            total={sections.length}
                            locale={locale}
                            typeRang={rangParIndex[index] ?? 1}
                            typeTotal={totalParType[section.type] ?? 1}
                            isSelected={selected === index}
                            selectedSlots={selected === index ? selectedSlots : []}
                            selectedGroupId={selected === index ? selectedGroupId : null}
                            onSelect={() => {
                              setOuverts((prev) => ({ ...prev, [groupe.cle]: true }))
                              onSelect(index)
                            }}
                            onSelectSlot={(slot, shift) => onSelectSlot?.(index, slot, shift)}
                            onSelectGroup={(groupId) => onSelectGroup?.(index, groupId)}
                            onToggleVisibility={() => onToggleVisibility(index)}
                            onRemove={() => onRemove(index)}
                            onDuplicate={() => onDuplicate(index)}
                            onMoveUp={() => deplacer(index, index - 1)}
                            onMoveDown={() => deplacer(index, index + 1)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </SortableContext>
        </DndContext>

        {groupes.length === 0 && (
          <p style={{ margin: '0 0 8px', fontSize: 13, lineHeight: 1.45, color: ADMIN_MUTED }}>
            Aucun bloc sur cette page pour l’instant.
          </p>
        )}

        <Bouton etendu onClick={onAdd} className="admin-block-add" style={{ marginTop: 4, justifyContent: 'center' }}>
          <span aria-hidden="true">{Icon.plus(16, ADMIN_FOREST)}</span>
          Ajouter un bloc
        </Bouton>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Item draggable                                                      */
/* ------------------------------------------------------------------ */

interface SortableItemProps {
  id: string
  section: PageSection
  index: number
  total: number
  locale: Locale
  typeRang: number
  typeTotal: number
  isSelected: boolean
  selectedSlots: string[]
  selectedGroupId: string | null
  onSelect: () => void
  onSelectSlot?: (slot: string, shift: boolean) => void
  onSelectGroup?: (groupId: string) => void
  onToggleVisibility: () => void
  onRemove: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function SortableItem({
  id,
  section,
  index,
  total,
  locale,
  typeRang,
  typeTotal,
  isSelected,
  selectedSlots,
  selectedGroupId,
  onSelect,
  onSelectSlot,
  onSelectGroup,
  onToggleVisibility,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: SortableItemProps) {
  const menuId = useId()
  const menuRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    /* Masqué = œil barré seul (pas d’opacité forte ni pastille « Masqué » en plus). */
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto' as const,
  }

  const def = getSectionDefinition(section.type)
  const typeLabel = def?.label ?? section.type
  const libelle = libelleStructureBloc(section, typeLabel, locale, typeRang, typeTotal)
  const iconeNom = TYPE_ICONE[section.type] ?? 'type'
  const icone = iconByName(iconeNom) ?? Icon.type
  const couleurIcone = isSelected ? ADMIN_FOREST : ADMIN_MUTED
  /* Sous-lignes (Titre, etc.) seulement si le bloc est visible — pas sous un masqué. */
  const montrerSous = isSelected && section.visible
  const labelCourt = libelle.primary
  const labelAria = section.visible ? libelle.aria : `${libelle.aria}, masqué`

  function fermerMenu() {
    setMenuOuvert(false)
    setConfirming(false)
  }

  useEffect(() => {
    if (!menuOuvert) {
      setMenuPos(null)
      return
    }
    const place = () => {
      const el = moreRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const largeur = 200
      const left = Math.max(8, Math.min(r.right - largeur, window.innerWidth - largeur - 8))
      setMenuPos({ top: r.bottom + 4, left })
    }
    place()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      fermerMenu()
      moreRef.current?.focus()
    }
    const onPointer = (e: MouseEvent) => {
      const node = e.target as Node
      if (menuRef.current?.contains(node) || moreRef.current?.contains(node)) return
      fermerMenu()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    window.addEventListener('resize', fermerMenu)
    document.addEventListener('scroll', fermerMenu, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
      window.removeEventListener('resize', fermerMenu)
      document.removeEventListener('scroll', fermerMenu, true)
    }
  }, [menuOuvert])

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={isSelected ? `${CLASSE_CARTE} admin-block-item is-selected` : `${CLASSE_CARTE} admin-block-item`}
        style={{
          width: '100%',
          marginTop: 4,
          borderRadius: RAYON,
          border: `1px solid ${ADMIN_LINE}`,
          padding: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: ESPACE, minWidth: 0 }}>
          <Bouton
            carre
            genre="silencieux"
            aria-label={`Déplacer ${labelCourt}`}
            title={`Déplacer ${labelCourt}`}
            style={{ cursor: 'grab', flexShrink: 0 }}
            {...attributes}
            {...listeners}
          >
            {Icon.grip(16, ADMIN_MUTED)}
          </Bouton>

          <Bouton
            genre="silencieux"
            aria-pressed={isSelected}
            aria-label={labelAria}
            title={labelAria}
            onClick={onSelect}
            style={{
              flex: 1, width: 'auto', minWidth: 0, justifyContent: 'flex-start',
              padding: '4px', gap: 6, height: 'auto', minHeight: HAUTEUR,
            }}
          >
            <span style={{ display: 'flex', flexShrink: 0 }} aria-hidden="true">
              {icone(16, couleurIcone)}
            </span>
            <span style={{
              flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start', gap: 1, overflow: 'hidden',
            }}>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%', minWidth: 0,
              }}>
                <span
                  title={libelle.primary}
                  style={{
                    flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600,
                    color: ADMIN_INK,
                    overflow: 'hidden', textAlign: 'left', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {libelle.primary}
                </span>
                {libelle.badge && (
                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0, fontSize: 11, fontWeight: 700, color: ADMIN_MUTED,
                      background: `${ADMIN_LINE}`,
                      borderRadius: 6, padding: '1px 6px', lineHeight: 1.3,
                    }}
                  >
                    {libelle.badge}
                  </span>
                )}
              </span>
              {libelle.secondary && (
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 11, fontWeight: 500, color: ADMIN_MUTED,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
                  }}
                >
                  {libelle.secondary}
                </span>
              )}
            </span>
          </Bouton>

          <Bouton
            carre
            genre="silencieux"
            aria-pressed={!section.visible}
            aria-label={section.visible ? `Masquer ${labelCourt}` : `Afficher ${labelCourt}`}
            title={section.visible ? 'Visible — cliquer pour masquer' : 'Masqué — cliquer pour afficher'}
            onClick={(e) => {
              e.stopPropagation()
              onToggleVisibility()
            }}
            style={{ flexShrink: 0 }}
          >
            {section.visible ? Icon.eye(16, ADMIN_MUTED) : Icon.eyeOff(16, ADMIN_CORAL)}
          </Bouton>

          <Bouton
            ref={moreRef}
            carre
            genre="silencieux"
            aria-expanded={menuOuvert}
            aria-controls={menuOuvert ? menuId : undefined}
            aria-haspopup="menu"
            aria-label={`Actions pour ${labelCourt}`}
            title={`Actions pour ${labelCourt}`}
            onClick={(e) => {
              e.stopPropagation()
              setMenuOuvert((o) => !o)
              setConfirming(false)
            }}
            style={{ flexShrink: 0 }}
          >
            {Icon.more(16, ADMIN_MUTED)}
          </Bouton>
        </div>
        {montrerSous && (
          <SousEmplacements
            section={section}
            selectedSlots={selectedSlots}
            selectedGroupId={selectedGroupId}
            onSelectSlot={onSelectSlot}
            onSelectGroup={onSelectGroup}
            locale={locale}
          />
        )}
      </div>

      {menuOuvert && menuPos && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={`Actions pour ${labelCourt}`}
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 1000,
            width: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: 6,
            borderRadius: RAYON,
            border: `1px solid ${ADMIN_LINE}`,
            background: ADMIN_SURFACE,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <Bouton
            genre="silencieux"
            etendu
            disabled={index === 0}
            role="menuitem"
            aria-label={`Monter ${labelCourt}`}
            onClick={(e) => { e.stopPropagation(); onMoveUp(); fermerMenu() }}
          >
            Monter
          </Bouton>
          <Bouton
            genre="silencieux"
            etendu
            disabled={index === total - 1}
            role="menuitem"
            aria-label={`Descendre ${labelCourt}`}
            onClick={(e) => { e.stopPropagation(); onMoveDown(); fermerMenu() }}
          >
            Descendre
          </Bouton>
          <Bouton
            genre="silencieux"
            etendu
            role="menuitem"
            aria-label={`Dupliquer ${labelCourt}`}
            onClick={(e) => { e.stopPropagation(); onDuplicate(); fermerMenu() }}
          >
            {Icon.copy(16, ADMIN_MUTED)} Dupliquer
          </Bouton>
          {confirming ? (
            <>
              <Bouton genre="danger" etendu role="menuitem" onClick={(e) => { e.stopPropagation(); onRemove(); fermerMenu() }}>
                Supprimer
              </Bouton>
              <Bouton genre="secondaire" etendu role="menuitem" onClick={(e) => { e.stopPropagation(); setConfirming(false) }}>
                Annuler
              </Bouton>
            </>
          ) : (
            <Bouton
              genre="danger"
              etendu
              role="menuitem"
              aria-label={`Supprimer ${labelCourt}`}
              onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
            >
              {Icon.trash(16, ADMIN_CORAL)} Supprimer
            </Bouton>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}

/** Emplacements Structure : textes, boutons, groupes et listes (sous-éléments). */
function champStructureVisible(
  field: { type: string; name: string; forVariants?: readonly string[] },
  variant: string | null,
  type: SectionType | string,
): boolean {
  if (field.type !== 'text' && field.type !== 'multiline' && field.type !== 'group' && field.type !== 'list') {
    return false
  }
  if (!field.forVariants || field.forVariants.length === 0) return true
  const actuelle = variant || defaultVariant(type as SectionType) || ''
  return field.forVariants.includes(actuelle)
}

function libelleListeStructure(
  field: { name: string; label: string },
  content: Record<string, unknown> | null | undefined,
): string {
  const raw = content?.[field.name]
  const items = Array.isArray(raw) ? raw : []
  if (items.length === 0) return field.label
  return `${field.label} (${items.length})`
}

function apercuLigneListe(
  item: unknown,
  field: { itemType?: string; itemFields?: readonly { name: string; label: string }[] },
  locale: Locale,
  index: number,
): string {
  if (field.itemType) {
    const texte = typeof item === 'string'
      ? item
      : resolveI18n(item as Bilingue, locale)
    return texte.trim() || `Ligne ${index + 1}`
  }
  if (field.itemFields && typeof item === 'object' && item !== null) {
    const obj = item as Record<string, unknown>
    for (const sub of field.itemFields) {
      const v = obj[sub.name]
      const texte = typeof v === 'string' ? v : resolveI18n(v as Bilingue, locale)
      if (texte.trim()) return texte.trim()
    }
  }
  return `Élément ${index + 1}`
}

function SousEmplacements({
  section,
  selectedSlots,
  selectedGroupId,
  onSelectSlot,
  onSelectGroup,
  locale = 'fr',
}: {
  section: PageSection
  selectedSlots: string[]
  selectedGroupId: string | null
  onSelectSlot?: (slot: string, shift: boolean) => void
  onSelectGroup?: (groupId: string) => void
  locale?: Locale
}) {
  const def = getSectionDefinition(section.type)
  if (!def) return null
  const champs = def.fields.filter((f) => champStructureVisible(f, section.variant, section.type))
  const groupes = readEditorMeta(section.content).groups
  if (champs.length === 0 && groupes.length === 0) return null
  return (
    <div style={{ padding: '0 8px 8px 36px', display: 'flex', flexDirection: 'column', gap: ESPACE, minWidth: 0 }}>
      {groupes.map((g) => (
        <Bouton
          key={g.id}
          genre="silencieux"
          etendu
          aria-pressed={selectedGroupId === g.id}
          aria-label={g.label}
          title={g.label}
          onClick={(e) => { e.stopPropagation(); onSelectGroup?.(g.id) }}
          style={{
            height: 'auto',
            minHeight: 36,
            justifyContent: 'flex-start',
            fontSize: 12,
            fontWeight: 600,
            color: ADMIN_INK,
            background: selectedGroupId === g.id ? ADMIN_ACTIVE_BG : 'transparent',
          }}
        >
          {g.lock === 'group' ? Icon.lock(14, ADMIN_INK) : Icon.group(14, ADMIN_INK)}
          {g.label}
        </Bouton>
      ))}
      {champs.map((f) => {
        const libelle = f.type === 'list'
          ? libelleListeStructure(f, section.content)
          : f.label
        const items = f.type === 'list' && Array.isArray(section.content?.[f.name])
          ? (section.content![f.name] as unknown[])
          : null
        return (
          <div key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <Bouton
              genre="silencieux"
              etendu
              aria-pressed={selectedSlots.includes(f.name)}
              aria-label={libelle}
              title={libelle}
              onClick={(e) => { e.stopPropagation(); onSelectSlot?.(f.name, e.shiftKey) }}
              style={{
                height: 'auto',
                minHeight: 36,
                justifyContent: 'flex-start',
                fontSize: 12,
                fontWeight: 500,
                color: ADMIN_INK,
                background: selectedSlots.includes(f.name) ? ADMIN_ACTIVE_BG : 'transparent',
                whiteSpace: 'normal',
                overflow: 'visible',
                textAlign: 'left',
              }}
            >
              {f.type === 'list' ? Icon.list(14, ADMIN_INK) : f.type === 'group' ? Icon.group(14, ADMIN_INK) : null}
              {libelle}
            </Bouton>
            {items && items.length > 0 && selectedSlots.includes(f.name) && (
              <div
                role="list"
                aria-label={`Éléments de ${f.label}`}
                style={{ paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                {items.map((item, i) => {
                  const apercu = apercuLigneListe(item, f, locale, i)
                  return (
                    <div
                      key={i}
                      role="listitem"
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: ADMIN_MUTED,
                        padding: '4px 8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={apercu}
                    >
                      {i + 1}. {apercu}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
