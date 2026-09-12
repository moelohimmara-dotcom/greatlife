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
  solar: {
    id: 'solar', label: 'Solaire mangue',
    bg: '#FFFCF5', surface: '#FFFFFF', surfaceAlt: '#FFF8EC',
    primary: '#E07A1F', primaryDark: '#B85F0E',
    accent: '#D6336C', accentSoft: '#E8688C',
    gold: '#F2A93B', cream: '#FFFCF5',
    text: '#2B2418', muted: '#8A7A66',
    heading: '#C95A0E', headingInvert: '#FFFFFF',
    shadow: 'rgba(224,122,31,0.1)', shadowDeep: 'rgba(224,122,31,0.18)',
  },
  ocean: {
    id: 'ocean', label: 'Océan frais',
    bg: '#F4F8FB', surface: '#FFFFFF', surfaceAlt: '#EDF3F7',
    primary: '#0E6E8C', primaryDark: '#0A4F66',
    accent: '#E8995A', accentSoft: '#F2B683',
    gold: '#D9A441', cream: '#F4F8FB',
    text: '#16242B', muted: '#6B818C',
    heading: '#0E6E8C', headingInvert: '#FFFFFF',
    shadow: 'rgba(14,110,140,0.09)', shadowDeep: 'rgba(14,110,140,0.17)',
  },
  chocolat: {
    id: 'chocolat', label: 'Chocolat gourmand',
    bg: '#F7F1EA', surface: '#FFFFFF', surfaceAlt: '#F1E7DC',
    primary: '#5C3A21', primaryDark: '#3D2614',
    accent: '#C75B3F', accentSoft: '#E08266',
    gold: '#B8893A', cream: '#F7F1EA',
    text: '#2B1F16', muted: '#7A6755',
    heading: '#5C3A21', headingInvert: '#FFFFFF',
    shadow: 'rgba(92,58,33,0.1)', shadowDeep: 'rgba(92,58,33,0.19)',
  },
  minimal: {
    id: 'minimal', label: 'Minimaliste clair',
    bg: '#FAFAFA', surface: '#FFFFFF', surfaceAlt: '#F2F2F2',
    primary: '#111111', primaryDark: '#000000',
    accent: '#C8463C', accentSoft: '#E07068',
    gold: '#C9A227', cream: '#FAFAFA',
    text: '#1A1A1A', muted: '#6E6E6E',
    heading: '#111111', headingInvert: '#FFFFFF',
    shadow: 'rgba(0,0,0,0.06)', shadowDeep: 'rgba(0,0,0,0.13)',
  },
  coca: {
    id: 'coca', label: 'Coca cola',
    bg: '#FBF6F2', surface: '#FFFFFF', surfaceAlt: '#F5ECE5',
    primary: '#C8102E', primaryDark: '#9A0A22',
    accent: '#1B1B1B', accentSoft: '#454545',
    gold: '#E8B941', cream: '#FBF6F2',
    text: '#1B1B1B', muted: '#7A6A60',
    heading: '#C8102E', headingInvert: '#FFFFFF',
    shadow: 'rgba(200,16,46,0.1)', shadowDeep: 'rgba(200,16,46,0.19)',
  },
  nuit: {
    id: 'nuit', label: 'Nuit boréale',
    bg: '#0E1525', surface: '#19223A', surfaceAlt: '#141C32',
    primary: '#5EEAD4', primaryDark: '#2DD4BF',
    accent: '#A78BFA', accentSoft: '#C4B5FD',
    gold: '#FBBF24', cream: '#19223A',
    text: '#E2E8F0', muted: '#94A3B8',
    heading: '#5EEAD4', headingInvert: '#0E1525',
    shadow: 'rgba(0,0,0,0.35)', shadowDeep: 'rgba(0,0,0,0.55)',
  },
}
