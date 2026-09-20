/**
 * Greatlife — CMS : sélecteur de type de section
 * ================================================
 * Modal qui affiche la grille des 20 types du catalogue.
 * Chaque type est représenté par son label et sa description
 * en langage restaurateur (pas de jargon technique).
 */

import { useEffect } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import { SECTION_TYPES } from '@/cms/model/sections/schemas'
import type { SectionType } from '@/cms/model/section'
import { Bouton } from './chrome'

interface SectionTypePickerProps {
  onSelect: (type: SectionType) => void
  onClose: () => void
}

/** Icône associée à chaque type (pour l'affichage dans la grille). */
const TYPE_ICONS: Partial<Record<string, string>> = {
  hero: 'image',
  text: 'write',
  image_text: 'image',
  menu: 'leaf',
  menu_featured: 'leaf',
  gallery: 'image',
  testimonials: 'users',
  team: 'users',
  story: 'write',
  engagements: 'leaf',
  location: 'pin',
  map: 'pin',
  reservation: 'calendar',
  contact: 'mail',
  blog: 'write',
  faq: 'settings',
  cta: 'arrow',
  video: 'eye',
  spacer: 'grid',
  rich_text: 'write',
}

export function SectionTypePicker({ onSelect, onClose }: SectionTypePickerProps) {
  const { theme: t } = useSite()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.45)',
      }} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ajouter-section-titre"
        style={{
          position: 'relative', background: t.surface, borderRadius: 16,
          padding: '24px 28px', maxWidth: 640, width: '90%', maxHeight: '80vh',
          overflow: 'auto', boxShadow: `0 20px 60px ${t.shadowDeep}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
          <h3 id="ajouter-section-titre" style={{ fontFamily: 'var(--f-heading)', fontSize: 18, fontWeight: 700, color: t.heading, margin: 0 }}>
            Ajouter une section
          </h3>
          <Bouton onClick={onClose} aria-label="Fermer">Fermer</Bouton>
        </div>

        {/* Grille */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
          {SECTION_TYPES.filter((def) => def.implemented).map((def) => {
            const iconName = TYPE_ICONS[def.type] ?? 'write'
            return (
              <Bouton
                key={def.type}
                etendu
                genre="secondaire"
                onClick={() => onSelect(def.type)}
                style={{ flexDirection: 'column', alignItems: 'flex-start', height: 'auto', padding: '12px 16px', gap: 6 }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'flex', color: t.primary }}>
                    {Icon[iconName] ? Icon[iconName](16, t.primary) : Icon.write(16, t.primary)}
                  </span>
                  <span>{def.label}</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 500, color: t.muted, lineHeight: 1.4 }}>
                  {def.description}
                </span>
              </Bouton>
            )
          })}
        </div>
      </div>
    </div>
  )
}
