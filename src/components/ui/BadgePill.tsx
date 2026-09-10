import { BADGE_DEFS } from '@/config/badges'

export function BadgePill({ b, dark }: { b: string; dark?: boolean }) {
  const def = BADGE_DEFS[b]
  if (!def) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.02em',
      padding: '3px 10px', borderRadius: '100px',
      background: dark ? 'rgba(255,255,255,0.12)' : def.bg,
      color: dark ? 'rgba(255,255,255,0.8)' : def.fg,
      whiteSpace: 'nowrap', lineHeight: 1.4,
      border: dark ? '1px solid rgba(255,255,255,0.15)' : 'none',
    }}>
      {def.label}
    </span>
  )
}
