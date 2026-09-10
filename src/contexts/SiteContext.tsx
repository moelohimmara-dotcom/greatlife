import React, { createContext, useContext, useState, useEffect } from 'react'
import { THEMES } from '@/config/themes'
import type { ThemePalette } from '@/config/themes'
import { FONTS } from '@/config/fonts'
import type { FontPair } from '@/config/fonts'
import { MENU } from '@/data/menu'
import type { MenuItem } from '@/data/menu'

export interface SiteContent {
  slogan: string
  heroTitle: string
  heroSub: string
  storyTitle: string
  story: string
  emailContact: string
  emailReservation: string
  autoReply: string
}

export interface SiteVisibility {
  sections: Record<string, boolean>
  vertusPanel: boolean
  suggestions: boolean
  testimonials: boolean
  badges: boolean
}

export interface MediaSlot {
  slot: string
  dims: string
  status: string
}

export interface ContactMessage {
  nom: string
  email: string
  sujet: string
  message: string
  date: string
}

interface SiteContextValue {
  themeId: string
  setThemeId: (id: string) => void
  theme: ThemePalette
  fontId: string
  setFontId: (id: string) => void
  font: FontPair
  content: SiteContent
  setContent: (c: SiteContent) => void
  visibility: SiteVisibility
  setVisibility: (v: SiteVisibility) => void
  menu: MenuItem[]
  setMenu: (m: MenuItem[]) => void
  media: MediaSlot[]
  setMedia: (m: MediaSlot[]) => void
  messages: ContactMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ContactMessage[]>>
  rootStyle: React.CSSProperties
  isDark: boolean
}

const SiteContext = createContext<SiteContextValue | null>(null)
export const useSite = () => useContext(SiteContext)!

const DEFAULT_CONTENT: SiteContent = {
  slogan: 'Manger vite. Manger bio. Manger gourmand.',
  heroTitle: 'Le fast-food sans culpabilité.',
  heroSub: "Produits bio, emballages écologiques, cuisson saine et saveurs tropicales — Greatlife prouve que le bien manger n'est pas un luxe.",
  storyTitle: 'Notre histoire',
  story: "Greatlife est né d'une frustration simple : aimer le fast-food, mais refuser de le payer avec sa santé. Ayant grandi avec la street-food africaine, j'ai vu qu'on pouvait allier vitesse, goût intense et produits sains. J'ai voulu prouver que le bio n'est pas un luxe — c'est juste une question d'honnêteté.",
  emailContact: 'contact@greatlife.gn',
  emailReservation: 'resa@greatlife.gn',
  autoReply: 'Bonjour {nom}, merci pour votre message à Greatlife ! Nous revenons vers vous sous 24h. — L\'équipe Greatlife',
}

const DEFAULT_VISIBILITY: SiteVisibility = {
  sections: { home: true, carte: true, histoire: true, engagements: true, equipe: true, localisation: true, contact: true, blog: true },
  vertusPanel: true, suggestions: true, testimonials: true, badges: true,
}

const DEFAULT_MEDIA: MediaSlot[] = [
  { slot: 'Hero principal', dims: '1920×1080', status: 'assigné' },
  { slot: 'Photo — Le Greatlife', dims: '800×600', status: 'assigné' },
  { slot: 'Fond section histoire', dims: '1600×900', status: 'à assigner' },
  { slot: 'Logo / favicon', dims: '512×512', status: 'assigné' },
]

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState('gourmand')
  const [fontId, setFontId] = useState('fraunces')
  const [content, setContent] = useState(DEFAULT_CONTENT)
  const [visibility, setVisibility] = useState(DEFAULT_VISIBILITY)
  const [menu, setMenu] = useState(MENU)
  const [media, setMedia] = useState(DEFAULT_MEDIA)
  const [messages, setMessages] = useState<ContactMessage[]>([])

  const theme = THEMES[themeId]
  const font = FONTS[fontId]
  const isDark = themeId === 'premium'

  const rootStyle: React.CSSProperties = {
    background: theme.bg, color: theme.text, fontFamily: font.body,
    ['--c-primary' as any]: theme.primary,
    ['--c-primary-dark' as any]: theme.primaryDark,
    ['--c-accent' as any]: theme.accent,
    ['--c-accent-soft' as any]: theme.accentSoft,
    ['--c-gold' as any]: theme.gold,
    ['--c-cream' as any]: theme.cream,
    ['--c-surface' as any]: theme.surface,
    ['--c-surface-alt' as any]: theme.surfaceAlt,
    ['--c-heading' as any]: theme.heading,
    ['--c-muted' as any]: theme.muted,
    ['--c-text' as any]: theme.text,
    ['--c-shadow' as any]: theme.shadow,
    ['--c-shadow-deep' as any]: theme.shadowDeep,
    ['--c-heading-invert' as any]: theme.headingInvert,
    ['--f-heading' as any]: font.heading,
    ['--f-body' as any]: font.body,
    ['--dark' as any]: isDark ? '1' : '0',
  }

  useEffect(() => {
    const id = 'greatlife-fonts'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,900&family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;700;900&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap'
    document.head.appendChild(link)
  }, [])

  useEffect(() => {
    const id = 'greatlife-global'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
      html { scroll-behavior: smooth; }
      section[id] { scroll-margin-top: 80px; }
      *:focus-visible { outline: 2px solid var(--c-primary, #2D5A27); outline-offset: 2px; border-radius: 4px; }
      ::selection { background: var(--c-primary, #2D5A27); color: #fff; }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(45,90,39,0.2); border-radius: 100px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(45,90,39,0.35); }
    `
    document.head.appendChild(style)
  }, [])

  const value: SiteContextValue = {
    themeId, setThemeId, theme, fontId, setFontId, font,
    content, setContent, visibility, setVisibility,
    menu, setMenu, media, setMedia, messages, setMessages,
    rootStyle, isDark,
  }

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}
