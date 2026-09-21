import React from 'react'
import { useSite } from '@/contexts/SiteContext'
import { softShadow, softShadowSm } from './shadows'

export function OrganicCard({
  children, style, onClick, hover, 'aria-label': ariaLabel,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
  hover?: boolean
  'aria-label'?: string
}) {
  const { theme: t } = useSite()
  const interactive = Boolean(onClick)
  const baseStyle: React.CSSProperties = {
    background: t.surface,
    borderRadius: '20px',
    boxShadow: softShadowSm(t),
    border: `1px solid ${t.shadow}`,
    transition: 'box-shadow 0.35s ease, transform 0.35s ease',
    ...(hover || interactive ? { cursor: 'pointer' } : {}),
    ...style,
  }

  const onEnter = (el: HTMLElement) => {
    if (!hover && !interactive) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.boxShadow = softShadow(t)
      return
    }
    el.style.transform = 'translateY(-4px)'
    el.style.boxShadow = softShadow(t)
  }
  const onLeave = (el: HTMLElement) => {
    if (!hover && !interactive) return
    el.style.transform = 'translateY(0)'
    el.style.boxShadow = softShadowSm(t)
  }

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className="admin-carte"
        style={{
          ...baseStyle,
          display: 'block',
          width: '100%',
          textAlign: 'left',
          font: 'inherit',
          color: 'inherit',
          padding: 0,
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
        onMouseEnter={e => onEnter(e.currentTarget)}
        onMouseLeave={e => onLeave(e.currentTarget)}
      >
        {children}
      </button>
    )
  }

  return (
    <div
      style={baseStyle}
      onMouseEnter={e => onEnter(e.currentTarget)}
      onMouseLeave={e => onLeave(e.currentTarget)}
    >
      {children}
    </div>
  )
}
