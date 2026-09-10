export interface ThemePalette {
  id: string
  label: string
  bg: string
  surface: string
  surfaceAlt: string
  primary: string
  primaryDark: string
  accent: string
  accentSoft: string
  gold: string
  cream: string
  text: string
  muted: string
  heading: string
  headingInvert: string
  shadow: string
  shadowDeep: string
}

export const THEMES: Record<string, ThemePalette> = {
  gourmand: {
    id: 'gourmand', label: 'Gourmand chaleureux',
    bg: '#F5EFE6', surface: '#FFFFFF', surfaceAlt: '#FAF6F0',
    primary: '#2D5A27', primaryDark: '#1E3D1A',
    accent: '#C44536', accentSoft: '#E8704D',
    gold: '#D4912F', cream: '#F5EFE6',
    text: '#2A2620', muted: '#7A716A',
    heading: '#2D5A27', headingInvert: '#FFFFFF',
    shadow: 'rgba(45,90,39,0.08)', shadowDeep: 'rgba(45,90,39,0.16)',
  },
  premium: {
    id: 'premium', label: 'Premium nocturne',
    bg: '#1A1F1A', surface: '#252B25', surfaceAlt: '#1E241E',
    primary: '#5A9E4A', primaryDark: '#3D7A30',
    accent: '#D4912F', accentSoft: '#E8B055',
    gold: '#C9A227', cream: '#2A302A',
    text: '#E8E5E0', muted: '#9AA89A',
    heading: '#8FCB7F', headingInvert: '#1A1F1A',
    shadow: 'rgba(0,0,0,0.3)', shadowDeep: 'rgba(0,0,0,0.5)',
  },
  nature: {
    id: 'nature', label: 'Nature brute',
    bg: '#EEEAE0', surface: '#FFFFFF', surfaceAlt: '#F8F5EE',
    primary: '#4A7C3A', primaryDark: '#356028',
    accent: '#B85C38', accentSoft: '#D17A52',
    gold: '#C49B30', cream: '#EEEAE0',
    text: '#28241E', muted: '#75706A',
    heading: '#4A7C3A', headingInvert: '#FFFFFF',
    shadow: 'rgba(74,124,58,0.08)', shadowDeep: 'rgba(74,124,58,0.15)',
  },
  tropical: {
    id: 'tropical', label: 'Tropical vif',
    bg: '#FFF9F0', surface: '#FFFFFF', surfaceAlt: '#FFF4E5',
    primary: '#1E7A3D', primaryDark: '#125527',
    accent: '#E63946', accentSoft: '#FF6B5B',
    gold: '#FFB627', cream: '#FFF9F0',
    text: '#1C1A16', muted: '#7A756E',
    heading: '#1E7A3D', headingInvert: '#FFFFFF',
    shadow: 'rgba(30,122,61,0.08)', shadowDeep: 'rgba(30,122,61,0.16)',
  },
}
