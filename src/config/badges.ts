export interface BadgeDef {
  label: string
  fg: string
  bg: string
}

export const BADGE_DEFS: Record<string, BadgeDef> = {
  omni:    { label: 'omni',    fg: '#C44536', bg: '#FDE8E4' },
  vege:    { label: 'végé',    fg: '#2D5A27', bg: '#E0EDE0' },
  gluten:  { label: 'gluten',  fg: '#8B6914', bg: '#F5EDD8' },
  arachide:{ label: 'arachide',fg: '#8B4513', bg: '#F0E4D8' },
  lactose: { label: 'lactose', fg: '#4A6FA5', bg: '#E2EAF5' },
}

export type BadgeKey = keyof typeof BADGE_DEFS
