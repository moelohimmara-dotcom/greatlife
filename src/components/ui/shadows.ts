import type { ThemePalette } from '@/config/themes'

export function softShadow(t: ThemePalette): string {
  return `0 1px 2px ${t.shadow}, 0 4px 12px ${t.shadow}, 0 16px 40px ${t.shadowDeep}`
}

export function softShadowSm(t: ThemePalette): string {
  return `0 1px 3px ${t.shadow}, 0 4px 12px ${t.shadow}`
}
