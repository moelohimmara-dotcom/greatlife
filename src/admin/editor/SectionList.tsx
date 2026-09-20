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
import { Bouton, RAYON } from './chrome'

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
      <Bouton etendu onClick={onAdd} style={{ marginTop: 8, justifyContent: 'center' }}>
        {Icon.plus(16, t.primary)} Ajouter une section
      </Bouton>
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
          width: '100%', marginTop: 4, borderRadius: RAYON,
          border: `1px solid ${isSelected ? t.primary : t.shadow}`,
          background: isSelected ? `${t.primary}0d` : t.surface,
          display: 'flex', alignItems: 'center', gap: 4, padding: 4,
        }}
      >
        <Bouton
          carre
          genre="silencieux"
          aria-label="Déplacer ce bloc"
          style={{ cursor: 'grab' }}
          {...attributes}
          {...listeners}
        >
          {Icon.grid(16, t.muted)}
        </Bouton>

        <Bouton
          genre="silencieux"
          aria-pressed={isSelected}
          onClick={onSelect}
          style={{ flex: 1, width: 'auto', minWidth: 0, justifyContent: 'flex-start', padding: '0 8px' }}
        >
          <span style={{ display: 'flex', flexShrink: 0 }}>
            {Icon[iconKey] ? Icon[iconKey](16, isSelected ? t.primary : t.muted) : Icon.write(16, isSelected ? t.primary : t.muted)}
          </span>
          <span style={{
            flex: 1, fontSize: 13, fontWeight: 600,
            color: isSelected ? t.heading : t.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left',
          }}>
            {label}
          </span>
        </Bouton>

        <Bouton
          carre
          genre="silencieux"
          aria-pressed={!section.visible}
          aria-label={section.visible ? 'Masquer ce bloc' : 'Afficher ce bloc'}
          onClick={onToggleVisibility}
        >
          {section.visible ? Icon.eye(16, t.muted) : Icon.eye(16, t.accent)}
        </Bouton>

        {confirming ? (
          <>
            <Bouton genre="danger" onClick={onRemove}>Supprimer</Bouton>
            <Bouton genre="secondaire" onClick={() => setConfirming(false)}>Annuler</Bouton>
          </>
        ) : (
          <Bouton
            carre
            genre="silencieux"
            aria-label="Supprimer ce bloc"
            onClick={() => setConfirming(true)}
          >
            {Icon.trash(16, t.muted)}
          </Bouton>
        )}
      </div>
    </div>
  )
}
