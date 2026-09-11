import React from 'react'
import { useSite } from '@/contexts/SiteContext'
import { softShadow, softShadowSm } from './shadows'

export function OrganicCard({
  children, style, onClick, hover, role, tabIndex, ariaLabel, onKeyDown,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  hover?: boolean
  role?: string
  tabIndex?: number
  ariaLabel?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void
}) {
  const { theme: t } = useSite()
  return (
    <div
      onClick={onClick}
      role={role}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      style={{
        background: t.surface, borderRadius: '20px',
        boxShadow: softShadowSm(t),
        border: `1px solid ${t.shadow}`,
        transition: 'box-shadow 0.35s ease, transform 0.35s ease',
        ...(hover ? { cursor: 'pointer' } : {}),
        ...style,
      }}
      onMouseEnter={e => {
        if (hover) {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = softShadow(t)
        }
      }}
      onMouseLeave={e => {
        if (hover) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = softShadowSm(t)
        }
      }}
    >
      {children}
    </div>
  )
}
