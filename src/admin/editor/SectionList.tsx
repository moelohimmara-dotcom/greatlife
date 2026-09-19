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
              onSelect={() => onSelect(selected === index ? null : index)}
              onToggleVisibility={() => onToggleVisibility(index)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Bouton Ajouter */}
      <button onClick={onAdd} style={{
        width: '100%', marginTop: 8, padding: '10px 14px', borderRadius: 10,
        border: `2px dashed ${t.primary}33`, background: 'transparent',
        color: t.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        transition: 'all 0.15s',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${t.primary}08`; e.currentTarget.style.borderColor = `${t.primary}66` }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${t.primary}33` }}
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
      <button
        onClick={onSelect}
        style={{
          width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 10,
          border: `1px solid ${isSelected ? t.primary : t.shadow}`,
          background: isSelected ? `${t.primary}0d` : t.surface,
          cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 8,
          transition: 'all 0.15s',
        }}
      >
        {/* Poignée de drag */}
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: t.muted, display: 'flex', flexShrink: 0, opacity: 0.5 }}
          title="Glisser pour réordonner"
        >
          {Icon.grid(14, t.muted)}
        </span>

        {/* Icône du type */}
        <span style={{ display: 'flex', flexShrink: 0 }}>
          {Icon[iconKey] ? Icon[iconKey](15, isSelected ? t.primary : t.muted) : Icon.write(15, isSelected ? t.primary : t.muted)}
        </span>

        {/* Label */}
        <span style={{
          flex: 1, fontSize: 13, fontWeight: isSelected ? 600 : 500,
          color: isSelected ? t.heading : t.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </span>

        {/* Visibilité */}
        <span
          onClick={(e) => { e.stopPropagation(); onToggleVisibility() }}
          style={{ cursor: 'pointer', color: section.visible ? t.muted : '#dc2626', display: 'flex', flexShrink: 0, opacity: section.visible ? 0.6 : 1 }}
          title={section.visible ? 'Masquer' : 'Masqué'}
        >
          {section.visible ? Icon.eye(13, t.muted) : Icon.eye(13, '#dc2626')}
        </span>

        {/*
          Supprimer — EN DEUX TEMPS.
          Le premier clic ne supprime pas : il demande confirmation. Retirer une
          section efface le texte que le restaurateur y a écrit, et l'éditeur
          n'offre aucun retour en arrière après enregistrement. L'infobulle
          annonçait auparavant « Masquer la section » alors que le geste ne
          masquait rien — l'œil juste à gauche fait déjà cela, et il persiste.
        */}
        {confirming ? (
          <>
            <span
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              style={{ cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#dc2626', display: 'flex', flexShrink: 0 }}
              title="Confirmer : la section sera supprimée à l'enregistrement"
            >
              Supprimer
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); setConfirming(false) }}
              style={{ cursor: 'pointer', fontSize: 11, fontWeight: 600, color: t.muted, display: 'flex', flexShrink: 0 }}
              title="Ne pas supprimer"
            >
              Annuler
            </span>
          </>
        ) : (
          <span
            onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
            style={{ cursor: 'pointer', color: t.muted, display: 'flex', flexShrink: 0, opacity: 0.5 }}
            title="Supprimer la section"
          >
            {Icon.trash(13, t.muted)}
          </span>
        )}
      </button>
    </div>
  )
}
