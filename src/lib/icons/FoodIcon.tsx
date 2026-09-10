import React from 'react'
import type { ThemePalette } from '@/config/themes'

export function FoodIcon({ cat, size = 48, color }: { cat: string; size?: number; color: string }) {
  const icons: Record<string, React.ReactElement> = {
    'Burgers': (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <path d="M8 16c0-5 7-8 16-8s16 3 16 8" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M8 20h32" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <rect x="10" y="22" width="28" height="6" rx="2" fill={color} opacity="0.3"/>
        <path d="M8 30c0 5 7 8 16 8s16-3 16-8" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    'Wraps': (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <path d="M14 10c8 0 14 6 14 14s-6 14-14 14" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M14 10c-3 4-4 8-4 14s1 10 4 14" fill={color} opacity="0.25" stroke={color} strokeWidth="2"/>
        <path d="M18 16l8 8M20 22l6 4" stroke={color} strokeWidth="1.5" opacity="0.5"/>
      </svg>
    ),
    'Salades': (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <path d="M24 10c-6 4-10 10-10 18 0 6 4 10 10 10s10-4 10-10c0-8-4-14-10-18Z" fill={color} opacity="0.2" stroke={color} strokeWidth="2"/>
        <path d="M24 14v24M20 18l4 4M28 18l-4 4M18 24l6 2M30 24l-6 2" stroke={color} strokeWidth="1.5" opacity="0.6"/>
      </svg>
    ),
    'Frites & côtés': (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <rect x="14" y="20" width="4" height="18" rx="1" fill={color} opacity="0.3" stroke={color} strokeWidth="1.5"/>
        <rect x="22" y="14" width="4" height="24" rx="1" fill={color} opacity="0.4" stroke={color} strokeWidth="1.5"/>
        <rect x="30" y="18" width="4" height="20" rx="1" fill={color} opacity="0.3" stroke={color} strokeWidth="1.5"/>
        <path d="M12 38h24" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    'Milkshakes & smoothies': (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <path d="M14 16h20l-3 22c-.5 3-2 5-5 5h-4c-3 0-4.5-2-5-5L14 16Z" fill={color} opacity="0.2" stroke={color} strokeWidth="2"/>
        <path d="M20 10v6M24 8v8M28 10v6" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        <path d="M18 24h12" stroke={color} strokeWidth="1.5" opacity="0.4"/>
      </svg>
    ),
    'Petit-déjeuner': (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <ellipse cx="24" cy="28" rx="14" ry="8" fill={color} opacity="0.2" stroke={color} strokeWidth="2"/>
        <ellipse cx="24" cy="26" rx="10" ry="5" fill={color} opacity="0.3"/>
        <path d="M16 22c2-3 6-3 8 0M24 22c2-3 6-3 8 0" stroke={color} strokeWidth="1.5" opacity="0.6"/>
      </svg>
    ),
    'Desserts': (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <path d="M12 18h24l-2 18c-.5 3-2 4-5 4H19c-3 0-4.5-1-5-4L12 18Z" fill={color} opacity="0.2" stroke={color} strokeWidth="2"/>
        <path d="M12 18h24" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M20 12c0-3 4-3 4 0M26 10c0-3 4-3 4 0" stroke={color} strokeWidth="1.5" opacity="0.6"/>
      </svg>
    ),
    'Boissons chaudes': (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <path d="M14 18h18v16c0 4-3 6-6 6h-6c-3 0-6-2-6-6V18Z" fill={color} opacity="0.2" stroke={color} strokeWidth="2"/>
        <path d="M32 22h4c3 0 3 6 0 6h-4" stroke={color} strokeWidth="2" fill="none"/>
        <path d="M20 12c0-3 3-3 3 0M24 10c0-3 3-3 3 0" stroke={color} strokeWidth="1.5" opacity="0.5"/>
      </svg>
    ),
    'Menu enfant': (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="18" r="8" fill={color} opacity="0.2" stroke={color} strokeWidth="2"/>
        <path d="M14 34c2-6 8-10 10-10s8 4 10 10" fill={color} opacity="0.15" stroke={color} strokeWidth="2"/>
        <circle cx="21" cy="17" r="1.5" fill={color} opacity="0.6"/>
        <circle cx="27" cy="17" r="1.5" fill={color} opacity="0.6"/>
        <path d="M21 21c1 1 5 1 6 0" stroke={color} strokeWidth="1.5" opacity="0.5" strokeLinecap="round"/>
      </svg>
    ),
    'Suggestions': (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <path d="M24 8l3 8 8 1-6 6 2 8-7-4-7 4 2-8-6-6 8-1 3-8Z" fill={color} opacity="0.2" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    ),
  }
  return icons[cat] || icons['Burgers']
}

export function BurgerIllustration({ theme: t }: { theme: ThemePalette }) {
  return (
    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', filter: `drop-shadow(0 8px 24px ${t.shadowDeep})` }}>
      <path d="M 30 75 Q 30 35 100 35 Q 170 35 170 75 Z" fill="#E8A93C" stroke="#C88820" strokeWidth="1.5"/>
      <ellipse cx="65" cy="52" rx="3" ry="2" fill="#F5D896" opacity="0.8"/>
      <ellipse cx="90" cy="45" rx="3" ry="2" fill="#F5D896" opacity="0.8"/>
      <ellipse cx="120" cy="46" rx="3" ry="2" fill="#F5D896" opacity="0.8"/>
      <ellipse cx="145" cy="53" rx="3" ry="2" fill="#F5D896" opacity="0.8"/>
      <path d="M 28 78 Q 40 70 52 78 Q 64 68 76 78 Q 88 68 100 78 Q 112 68 124 78 Q 136 68 148 78 Q 160 68 172 78 L 172 86 L 28 86 Z" fill="#6BAE42" stroke="#4A8A2A" strokeWidth="1"/>
      <path d="M 30 88 L 170 88 L 170 94 Q 170 98 166 98 L 34 98 Q 30 98 30 94 Z" fill="#C44536" opacity="0.85"/>
      <path d="M 32 99 L 168 99 L 164 110 L 36 110 Z" fill="#E8B83C" stroke="#C49B20" strokeWidth="1"/>
      <rect x="32" y="112" width="136" height="22" rx="6" fill="#7B4A2E" stroke="#5C3520" strokeWidth="1.5"/>
      <path d="M 30 136 Q 30 165 100 165 Q 170 165 170 136 Z" fill="#D49B30" stroke="#B88220" strokeWidth="1.5"/>
    </svg>
  )
}
