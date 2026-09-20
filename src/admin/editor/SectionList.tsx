/**
 * Greatlife — CMS : colonne Structure
 * =====================================
 * Liste draggable des sections de la page.
 * Utilise @dnd-kit pour le drag & drop.
 *
 * Chaque élément affiche :
 * - une poignée de drag
 * - le type de section (label du registre)
 * - un bouton de visibilité (œil)
 * - un bouton de suppression (poubelle), en DEUX TEMPS
 */

import { useMemo, useState } from 'react'
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
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import { getSectionDefinition } from '@/cms/model/sections/schemas'
import type { PageSection } from '@/cms/model/section'
import { anneauFocus, boutonOutil, CIBLE } from './chrome'

interface SectionListProps {
  sections: PageSection[]
  selected: number | null
  onSelect: (index: number | null) => void
  onReorder: (from: number, to: number) => void
  onToggleVisibility: (index: number) => void
  onRemove: (index: number) => void
  onAdd: () => void
}

export function SectionList({
  sections,
  selected,
  onSelect,
  onReorder,
  onToggleVisibility,
  onRemove,
  onAdd,
}: SectionListProps) {
  const { theme: t } = useSite()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const items = useMemo(() => sections.map((_, i) => `section-${i}`), [sections])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.indexOf(active.id as string)
    const newIndex = items.indexOf(over.id as string)
    onReorder(oldIndex, newIndex)
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {sections.map((section, index) => (
            <SortableItem
              key={`section-${index}`}
              id={`section-${index}`}
              section={section}
              isSelected={selected === index}
              onSelect={() => onSelect(index)}
              onToggleVisibility={() => onToggleVisibility(index)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Bouton Ajouter */}
      <button type="button" onClick={onAdd} style={{
        width: '100%', marginTop: 8, ...boutonOutil(t, {}),
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        borderStyle: 'dashed',
      }}
        {...anneauFocus(t)}
      >
        {Icon.plus(14, t.primary)} Ajouter une section
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Item draggable                                                      */
/* ------------------------------------------------------------------ */

interface SortableItemProps {
  id: string
  section: PageSection
  isSelected: boolean
  onSelect: () => void
  onToggleVisibility: () => void
  onRemove: () => void
}

function SortableItem({ id, section, isSelected, onSelect, onToggleVisibility, onRemove }: SortableItemProps) {
  const { theme: t } = useSite()
  const [confirming, setConfirming] = useState(false)
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
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto' as const,
  }

  const def = getSectionDefinition(section.type)
  const label = def?.label ?? section.type
  const iconKey = section.type === 'menu' ? 'leaf' : section.type === 'team' ? 'users' : section.type === 'contact' ? 'mail' : 'write'

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          width: '100%', marginTop: 4, borderRadius: 10,
          border: `1px solid ${isSelected ? t.primary : t.shadow}`,
          background: isSelected ? `${t.primary}0d` : t.surface,
          display: 'flex', alignItems: 'center', gap: 4, padding: 4,
        }}
      >
        <button
          type="button"
          aria-label="Déplacer ce bloc"
          {...attributes}
          {...listeners}
          style={{
            minWidth: CIBLE, minHeight: CIBLE, border: 'none', background: 'transparent',
            cursor: 'grab', color: t.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          {...anneauFocus(t)}
        >
          {Icon.grid(16, t.muted)}
        </button>

        <button
          type="button"
          onClick={onSelect}
          aria-pressed={isSelected}
          style={{
            flex: 1, minHeight: CIBLE, border: 'none', background: 'transparent',
            cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px',
          }}
          {...anneauFocus(t)}
        >
          <span style={{ display: 'flex', flexShrink: 0 }}>
            {Icon[iconKey] ? Icon[iconKey](15, isSelected ? t.primary : t.muted) : Icon.write(15, isSelected ? t.primary : t.muted)}
          </span>
          <span style={{
            flex: 1, fontSize: 13, fontWeight: isSelected ? 600 : 500,
            color: isSelected ? t.heading : t.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {label}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleVisibility}
          aria-pressed={!section.visible}
          aria-label={section.visible ? 'Masquer ce bloc' : 'Afficher ce bloc'}
          style={{
            minWidth: CIBLE, minHeight: CIBLE, border: 'none', background: 'transparent',
            cursor: 'pointer', color: section.visible ? t.muted : t.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          {...anneauFocus(t)}
        >
          {section.visible ? Icon.eye(16, t.muted) : Icon.eye(16, t.accent)}
        </button>

        {confirming ? (
          <>
            <button
              type="button"
              onClick={onRemove}
              style={{ ...boutonOutil(t, { danger: true }), minHeight: CIBLE, padding: '8px 10px' }}
              {...anneauFocus(t)}
            >
              Supprimer
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              style={{ ...boutonOutil(t, {}), minHeight: CIBLE, padding: '8px 10px' }}
              {...anneauFocus(t)}
            >
              Annuler
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Supprimer ce bloc"
            style={{
              minWidth: CIBLE, minHeight: CIBLE, border: 'none', background: 'transparent',
              cursor: 'pointer', color: t.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            {...anneauFocus(t)}
          >
            {Icon.trash(16, t.muted)}
          </button>
        )}
      </div>
    </div>
  )
}
