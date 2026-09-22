/**
 * Tiroir « Mise en page » — gabarit de la page + En-tête / Pied (chrome du site).
 * Progressive disclosure : le tiroir parent peut rester ouvert ; Gabarit est replié
 * par défaut. En-tête et Pied sélectionnent le chrome (inspecteur = ChromePanel).
 */

import { useEffect, useId, useState } from 'react'
import { PAGE_LAYOUTS, type PageLayout } from '@/cms/model/page-layout'
import { Icon, iconByName } from '@/lib/icons'
import {
  Bouton,
  CLASSE_CARTE,
  ESPACE,
  HAUTEUR,
  RAYON,
  styleCarteTiroir,
  styleEnteteTiroir,
} from './chrome'
import { useSite } from '@/contexts/SiteContext'

interface PageLayoutPickerProps {
  value?: PageLayout
  onChange?: (layout: PageLayout) => void
  disabled?: boolean
  chrome: 'header' | 'footer' | null
  onSelectChrome: (id: 'header' | 'footer') => void
}

export function PageLayoutPicker({
  value,
  onChange,
  disabled,
  chrome,
  onSelectChrome,
}: PageLayoutPickerProps) {
  const { theme: t } = useSite()
  const baseId = useId()
  const panelId = `${baseId}-mise`
  const gabaritId = `${baseId}-gabarit`

  const aGabarit = Boolean(value && onChange)
  const actuel = aGabarit ? PAGE_LAYOUTS.find((item) => item.id === value) : undefined
  const libelleGabarit = actuel?.label ?? 'Choisir'

  /* Ouvert par défaut pour garder En-tête / Pied accessibles ; se rouvre si chrome. */
  const [ouvert, setOuvert] = useState(true)
  const [gabaritOuvert, setGabaritOuvert] = useState(false)

  useEffect(() => {
    if (chrome) setOuvert(true)
  }, [chrome])

  return (
    <div
      role="group"
      aria-label="Mise en page"
      className={`${CLASSE_CARTE} admin-layout-drawer`}
      style={{
        ...styleCarteTiroir(t),
        ...(disabled ? { opacity: 0.55, pointerEvents: 'none' as const } : {}),
      }}
      aria-disabled={disabled || undefined}
    >
      <Bouton
        etendu
        disabled={disabled}
        genre="silencieux"
        aria-expanded={ouvert}
        aria-controls={ouvert ? panelId : undefined}
        aria-label={aGabarit ? `Mise en page, ${libelleGabarit}` : 'Mise en page'}
        onClick={() => setOuvert((o) => !o)}
        style={styleEnteteTiroir()}
      >
        <ChevronOuvert ouvert={ouvert} couleur={t.muted} />
        <span aria-hidden="true" style={{ display: 'flex', flexShrink: 0 }}>
          {Icon.layout(16, t.heading)}
        </span>
        <span style={{
          flex: 1, minWidth: 0, textAlign: 'left', fontSize: 13, fontWeight: 700, color: t.heading,
        }}>
          Mise en page
        </span>
      </Bouton>

      {ouvert && (
        <div
          id={panelId}
          role="list"
          aria-label="Éléments de mise en page"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: ESPACE,
            padding: '0 12px 12px',
          }}
        >
          {aGabarit && onChange && value && (
            <div
              role="listitem"
              className={CLASSE_CARTE}
              style={{
                borderRadius: RAYON,
                border: `1px solid ${t.shadow}`,
                overflow: 'hidden',
              }}
            >
              <Bouton
                etendu
                disabled={disabled}
                genre="silencieux"
                aria-expanded={gabaritOuvert}
                aria-controls={gabaritOuvert ? gabaritId : undefined}
                aria-label={`Gabarit, ${libelleGabarit}`}
                onClick={() => setGabaritOuvert((o) => !o)}
                style={{
                  ...styleEnteteTiroir(),
                  borderRadius: 0,
                }}
              >
                <ChevronOuvert ouvert={gabaritOuvert} couleur={t.muted} />
                <span aria-hidden="true" style={{ display: 'flex', flexShrink: 0 }}>
                  {Icon.columns(16, t.muted)}
                </span>
                <span style={{
                  flexShrink: 0, textAlign: 'left', fontSize: 13, fontWeight: 600, color: t.heading,
                }}>
                  Gabarit
                </span>
                <span
                  title={libelleGabarit}
                  style={{
                    flex: 1, minWidth: 0, textAlign: 'right', fontSize: 12, fontWeight: 600,
                    color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {libelleGabarit}
                </span>
              </Bouton>

              {gabaritOuvert && (
                <div
                  id={gabaritId}
                  role="listbox"
                  aria-label="Choix de gabarit"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: ESPACE,
                    padding: '0 12px 12px',
                  }}
                >
                  {PAGE_LAYOUTS.map((item) => {
                    const actif = item.id === value
                    return (
                      <Bouton
                        key={item.id}
                        etendu
                        disabled={disabled}
                        genre="silencieux"
                        role="option"
                        aria-selected={actif}
                        aria-pressed={actif}
                        title={item.help}
                        onClick={() => {
                          onChange(item.id)
                          setGabaritOuvert(false)
                        }}
                        style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
                          height: 'auto', minHeight: HAUTEUR, padding: '8px 12px',
                          whiteSpace: 'normal', overflow: 'hidden', textAlign: 'left',
                          background: actif ? `${t.primary}14` : 'transparent',
                          border: 'none',
                          borderRadius: RAYON,
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'normal', lineHeight: 1.3, color: t.heading }}>
                          {item.label}
                        </span>
                        {actif && (
                          <span aria-hidden="true" style={{ display: 'flex', flexShrink: 0 }}>
                            {Icon.check(16, t.primary)}
                          </span>
                        )}
                      </Bouton>
                    )
                  })}
                  <p style={{
                    fontSize: 12, color: t.muted, lineHeight: 1.45, margin: 0,
                    padding: '0 4px', overflow: 'visible', whiteSpace: 'normal',
                  }}>
                    L’aperçu change tout de suite. Le site public, seulement après « Mettre à jour le site ».
                  </p>
                </div>
              )}
            </div>
          )}

          <RangChrome
            label="En-tête"
            icone="panelTop"
            selected={chrome === 'header'}
            onSelect={() => onSelectChrome('header')}
          />
          <RangChrome
            label="Pied"
            icone="panelBottom"
            selected={chrome === 'footer'}
            onSelect={() => onSelectChrome('footer')}
          />
        </div>
      )}
    </div>
  )
}

function ChevronOuvert({ ouvert, couleur }: { ouvert: boolean; couleur: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'flex',
        flexShrink: 0,
        transform: ouvert ? 'rotate(0deg)' : 'rotate(-90deg)',
        transition: 'transform 0.15s ease',
      }}
    >
      {Icon.chevronDown(16, couleur)}
    </span>
  )
}

function RangChrome({
  label,
  icone,
  selected,
  onSelect,
}: {
  label: string
  icone: string
  selected: boolean
  onSelect: () => void
}) {
  const { theme: t } = useSite()
  const dessin = iconByName(icone) ?? Icon.layout
  return (
    <div
      role="listitem"
      className={selected ? `${CLASSE_CARTE} is-selected` : CLASSE_CARTE}
      style={{
        borderRadius: RAYON,
        border: `1px solid ${t.shadow}`,
      }}
    >
      <Bouton
        genre="silencieux"
        aria-pressed={selected}
        aria-label={label}
        title={label}
        onClick={onSelect}
        style={{
          width: '100%',
          minWidth: 0,
          minHeight: HAUTEUR,
          justifyContent: 'flex-start',
          padding: '0 12px',
          gap: ESPACE,
          border: 'none',
          borderRadius: RAYON,
        }}
      >
        <span style={{ display: 'flex', flexShrink: 0 }} aria-hidden="true">
          {dessin(16, selected ? t.primary : t.muted)}
        </span>
        <span style={{
          flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600,
          color: selected ? t.heading : t.text,
          textAlign: 'left',
        }}>
          {label}
        </span>
      </Bouton>
    </div>
  )
}
