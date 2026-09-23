/**
 * Greatlife — CMS : sélecteur de type de section
 * ================================================
 * Modal « Ajouter un bloc » : types déjà branchés, groupés par intention
 * (Contenu / Formulaire / Lieu), avec recherche et libellés restaurateur.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Icon, iconByName } from '@/lib/icons'
import { SECTION_TYPES } from '@/cms/model/sections/schemas'
import type { SectionType } from '@/cms/model/section'
import { Bouton, ESPACE } from './chrome'
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
  const { theme: t } = useSite()
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
          background: t.surface,
          boxShadow: `0 20px 60px ${t.shadowDeep}`,
          color: t.text,
        }}
      >
        <div className="admin-block-picker-head">
          <div className="admin-block-picker-titles">
            <h3 id={titreId} style={{ fontFamily: 'var(--f-heading)', color: t.heading }}>
              Ajouter un bloc
            </h3>
            <p id={descId} style={{ color: t.muted }}>
              Choisissez ce que vous voulez ajouter à la page. Vous pourrez le déplacer ensuite dans Structure.
            </p>
          </div>
          <Bouton onClick={onClose} aria-label="Fermer la fenêtre">Fermer</Bouton>
        </div>

        <label className="admin-block-picker-search" htmlFor={searchId}>
          <span className="admin-block-picker-search-icon" aria-hidden="true" style={{ color: t.muted }}>
            {Icon.search(16, t.muted)}
          </span>
          <input
            ref={searchRef}
            id={searchId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un bloc…"
            autoComplete="off"
            style={{ color: t.text, borderColor: t.shadow }}
          />
        </label>

        <div className="admin-block-picker-body">
          {groupesVisibles.length === 0 ? (
            <p className="admin-block-picker-empty" style={{ color: t.muted }} role="status">
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
                    <h4 id={gid} style={{ color: t.heading }}>{groupe.label}</h4>
                    <p style={{ color: t.muted }}>{groupe.hint}</p>
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
                            <span aria-hidden="true" style={{ display: 'flex', color: t.primary }}>
                              {render(16, t.primary)}
                            </span>
                            <span style={{ color: t.heading }}>{def.label}</span>
                          </span>
                          <span
                            className="admin-block-picker-tile-desc"
                            style={{ color: t.muted }}
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
