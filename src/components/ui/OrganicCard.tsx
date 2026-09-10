import React from 'react'
import { useSite } from '@/contexts/SiteContext'
import { softShadow, softShadowSm } from './shadows'

export function OrganicCard({
  children, style, onClick, hover,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
  hover?: boolean
}) {
  const { theme: t } = useSite()
  return (
    <div
      onClick={onClick}
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
