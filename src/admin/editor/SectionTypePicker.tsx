/**
 * Greatlife — CMS : sélecteur de type de section
 * ================================================
 * Modal « Ajouter un bloc » : types déjà branchés, groupés par intention
 * (Contenu / Formulaire / Lieu), avec recherche et libellés restaurateur.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Icon, iconByName } from '@/lib/icons'
import { SECTION_TYPES } from '@/cms/model/sections/schemas'
import type { SectionType } from '@/cms/model/section'
import {
  Bouton,
  ESPACE,
  ADMIN_FOREST,
  ADMIN_INK,
  ADMIN_LINE,
  ADMIN_MUTED,
  ADMIN_SURFACE,
} from './chrome'
import { GROUPES_PICKER, TYPE_ICONE } from './section-families'

interface SectionTypePickerProps {
  onSelect: (type: SectionType) => void
  onClose: () => void
}

function normaliser(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

export function SectionTypePicker({ onSelect, onClose }: SectionTypePickerProps) {
  const baseId = useId()
  const titreId = `${baseId}-titre`
  const descId = `${baseId}-desc`
  const searchId = `${baseId}-search`
  const searchRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [q, setQ] = useState('')

  const disponibles = useMemo(
    () => SECTION_TYPES.filter((def) => def.implemented),
    [],
  )

  const filtrés = useMemo(() => {
    const needle = normaliser(q)
    if (!needle) return disponibles
    return disponibles.filter((def) => {
      const hay = normaliser(`${def.label} ${def.description}`)
      return hay.includes(needle)
    })
  }, [disponibles, q])

  const groupesVisibles = useMemo(() => {
    return GROUPES_PICKER
      .map((groupe) => ({
        ...groupe,
        items: groupe.types
          .map((type) => filtrés.find((def) => def.type === type))
          .filter((def): def is (typeof filtrés)[number] => Boolean(def)),
      }))
      .filter((g) => g.items.length > 0)
  }, [filtrés])

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const tmr = window.setTimeout(() => searchRef.current?.focus(), 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusables = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(tmr)
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [onClose])

  return (
    <div className="admin-block-picker-root" role="presentation">
      <button
        type="button"
        className="admin-block-picker-backdrop"
        aria-label="Fermer"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titreId}
        aria-describedby={descId}
        className="admin-block-picker"
        style={{
          background: ADMIN_SURFACE,
          boxShadow: `0 20px 60px ${'var(--admin-shadow)'}`,
          color: ADMIN_INK,
        }}
      >
        <div className="admin-block-picker-head">
          <div className="admin-block-picker-titles">
            <h3 id={titreId} style={{ fontFamily: 'var(--f-heading)', color: ADMIN_INK }}>
              Ajouter un bloc
            </h3>
            <p id={descId} style={{ color: ADMIN_MUTED }}>
              Choisissez ce que vous voulez ajouter à la page. Vous pourrez le déplacer ensuite dans Structure.
            </p>
          </div>
          <Bouton onClick={onClose} aria-label="Fermer la fenêtre">Fermer</Bouton>
        </div>

        <label className="admin-block-picker-search" htmlFor={searchId}>
          <span className="admin-block-picker-search-icon" aria-hidden="true" style={{ color: ADMIN_MUTED }}>
            {Icon.search(16, ADMIN_MUTED)}
          </span>
          <input
            ref={searchRef}
            id={searchId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un bloc…"
            autoComplete="off"
            style={{ color: ADMIN_INK, borderColor: ADMIN_LINE }}
          />
        </label>

        <div className="admin-block-picker-body">
          {groupesVisibles.length === 0 ? (
            <p className="admin-block-picker-empty" style={{ color: ADMIN_MUTED }} role="status">
              Aucun bloc ne correspond à « {q.trim()} ». Essayez « carte », « avis » ou « réservation ».
            </p>
          ) : (
            groupesVisibles.map((groupe) => {
              const gid = `${baseId}-${groupe.id}`
              return (
                <section
                  key={groupe.id}
                  className="admin-block-picker-group"
                  aria-labelledby={gid}
                >
                  <header className="admin-block-picker-group-head">
                    <h4 id={gid} style={{ color: ADMIN_INK }}>{groupe.label}</h4>
                    <p style={{ color: ADMIN_MUTED }}>{groupe.hint}</p>
                  </header>
                  <div className="admin-block-picker-grid">
                    {groupe.items.map((def) => {
                      const iconName = TYPE_ICONE[def.type] ?? 'type'
                      const render = iconByName(iconName) ?? Icon.type
                      return (
                        <Bouton
                          key={def.type}
                          etendu
                          genre="secondaire"
                          className="admin-block-picker-tile"
                          onClick={() => onSelect(def.type)}
                          aria-label={`${def.label}. ${def.description}`}
                          style={{
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            height: 'auto',
                            minHeight: 72,
                            padding: '12px 14px',
                            gap: ESPACE - 2,
                          }}
                        >
                          <span className="admin-block-picker-tile-title">
                            <span aria-hidden="true" style={{ display: 'flex', color: ADMIN_FOREST }}>
                              {render(16, ADMIN_FOREST)}
                            </span>
                            <span style={{ color: ADMIN_INK }}>{def.label}</span>
                          </span>
                          <span
                            className="admin-block-picker-tile-desc"
                            style={{ color: ADMIN_MUTED }}
                          >
                            {def.description}
                          </span>
                        </Bouton>
                      )
                    })}
                  </div>
                </section>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
