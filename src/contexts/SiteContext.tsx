import React, { createContext, useContext, useState, useEffect } from 'react'
import { THEMES } from '@/config/themes'
import type { ThemePalette } from '@/config/themes'
import { FONTS } from '@/config/fonts'
import type { FontPair } from '@/config/fonts'
import { MENU } from '@/data/menu'
import type { MenuItem } from '@/data/menu'
import { fetchMenu, fetchContent, fetchMessages, fetchBlogPosts, saveContent, saveSiteConfig, markMessageHandled, fetchMedia, fetchAdminUsers, fetchOrders, fetchReservations, type BlogPost, type SiteConfig, type CustomColors, type MediaAsset, type AdminUser, type SaveResult } from '@/lib/repository'
import { getSupabase } from '@/lib/supabase'

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
  sectionOrder: string[]
  vertusPanel: boolean
  suggestions: boolean
  testimonials: boolean
  badges: boolean
}

export interface MediaSlot {
  id?: string
  slot: string
  dims: string
  status: string
  url?: string
  filename?: string
  content_type?: string | null
  size_bytes?: number | null
}

export interface ContactMessage {
  id?: string
  nom: string
  email: string
  sujet: string
  message: string
  date?: string
  handled?: boolean
}

interface SiteContextValue {
  themeId: string
  setThemeId: (id: string) => void
  theme: ThemePalette
  customColors: Partial<CustomColors>
  setCustomColors: (c: Partial<CustomColors>) => void
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
  dataSource: 'loading' | 'supabase' | 'local'
  dataLoading: boolean
  saveContentToDb: () => Promise<SaveResult>
  refreshMessages: () => Promise<number>
  lastMessageCount: number
  blogPosts: BlogPost[]
  setBlogPosts: React.Dispatch<React.SetStateAction<BlogPost[]>>
  saveSiteConfigToDb: () => Promise<SaveResult>
  markMessageHandled: (id: string, handled: boolean) => Promise<SaveResult>
  refreshMedia: () => Promise<void>
  adminUsers: AdminUser[]
  refreshAdminUsers: () => Promise<void>
  ordersCount: number
  reservationsCount: number
}

const SiteContext = createContext<SiteContextValue | null>(null)
export const useSite = () => useContext(SiteContext)!

export function useMedia(slot: string): string | undefined {
  const { media } = useContext(SiteContext)!
  return media.find(m => m.slot === slot && m.url)?.url
}

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
  sections: { home: true, carte: true, histoire: true, engagements: true, equipe: true, localisation: true, reservation: true, contact: true, blog: true },
  sectionOrder: ['home', 'carte', 'histoire', 'engagements', 'equipe', 'localisation', 'reservation', 'contact', 'blog'],
  vertusPanel: true, suggestions: true, testimonials: true, badges: true,
}

const DEFAULT_MEDIA: MediaSlot[] = [
  { slot: 'Hero principal', dims: '1920×1080', status: 'à assigner' },
  { slot: 'Photo — Le Greatlife', dims: '800×600', status: 'à assigner' },
  { slot: 'Fond section histoire', dims: '1600×900', status: 'à assigner' },
  { slot: 'Logo / favicon', dims: '512×512', status: 'à assigner' },
]

function mediaAssetToSlot(a: MediaAsset): MediaSlot {
  return {
    id: a.id,
    slot: a.slot,
    dims: '',
    status: 'assigné',
    url: a.public_url,
    filename: a.filename,
    content_type: a.content_type,
    size_bytes: a.size_bytes,
  }
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState('gourmand')
  const [fontId, setFontId] = useState('fraunces')
  const [customColors, setCustomColorsState] = useState<Partial<CustomColors>>({})
  const [content, setContent] = useState(DEFAULT_CONTENT)
  const [visibility, setVisibility] = useState(DEFAULT_VISIBILITY)
  const [menu, setMenu] = useState(MENU)
  const [media, setMedia] = useState(DEFAULT_MEDIA)
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [ordersCount, setOrdersCount] = useState(0)
  const [reservationsCount, setReservationsCount] = useState(0)
  const [dataSource, setDataSource] = useState<'loading' | 'supabase' | 'local'>('loading')
  const [dataLoading, setDataLoading] = useState(true)
  const [lastMessageCount, setLastMessageCount] = useState(0)

  const baseTheme = THEMES[themeId] ?? Object.values(THEMES)[0]
  const font = FONTS[fontId]
  const isDark = themeId === 'premium' || themeId === 'nuit'

  function shade(hex: string, amt: number): string {
    const m = hex.replace('#', '')
    if (m.length !== 6) return hex
    const r = Math.max(0, Math.min(255, parseInt(m.slice(0, 2), 16) + amt))
    const g = Math.max(0, Math.min(255, parseInt(m.slice(2, 4), 16) + amt))
    const b = Math.max(0, Math.min(255, parseInt(m.slice(4, 6), 16) + amt))
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
  }

  const theme: ThemePalette = customColors.primary || customColors.accent || customColors.gold || customColors.bg
    ? {
        ...baseTheme,
        ...(customColors.primary ? { primary: customColors.primary, primaryDark: shade(customColors.primary, -28), heading: customColors.primary } : {}),
        ...(customColors.accent ? { accent: customColors.accent, accentSoft: shade(customColors.accent, 24) } : {}),
        ...(customColors.gold ? { gold: customColors.gold, cream: customColors.gold } : {}),
        ...(customColors.bg ? { bg: customColors.bg, surfaceAlt: shade(customColors.bg, 8) } : {}),
      }
    : baseTheme

  const setCustomColors = (c: Partial<CustomColors>) => setCustomColorsState(prev => ({ ...prev, ...c }))

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
    ['--btn-radius' as any]: `${customColors.buttonRadius ?? 100}px`,
    ['--dark' as any]: isDark ? '1' : '0',
  }

  useEffect(() => {
    const id = 'greatlife-btn-radius'
    let el = document.getElementById(id) as HTMLStyleElement | null
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el) }
    el.textContent = `.gbtn { border-radius: var(--btn-radius, 100px) !important; }`
  }, [customColors.buttonRadius])

  useEffect(() => {
    const id = 'greatlife-fonts'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,900&family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;700;900&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&family=Montserrat:wght@400;500;600;700;800&family=Open+Sans:wght@400;500;600;700&family=Poppins:wght@400;500;600;700;800&family=Nunito:wght@400;500;600;700;800&family=Lora:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&family=Merriweather:wght@400;700;900&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&family=Mulish:wght@400;500;600;700&display=swap'
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
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    `
    document.head.appendChild(style)
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      const [menuRes, contentRes, messagesRes, blogRes, mediaRes, adminRes, ordersRes, reservationsRes] = await Promise.all([
        fetchMenu(),
        fetchContent(),
        fetchMessages(),
        fetchBlogPosts(),
        fetchMedia(),
        fetchAdminUsers(),
        fetchOrders(),
        fetchReservations(),
      ])
      if (!active) return
      const anyDb = menuRes.fromDb || contentRes.fromDb || messagesRes.fromDb || blogRes.fromDb || mediaRes.fromDb || adminRes.fromDb || ordersRes.fromDb || reservationsRes.fromDb
      setDataSource(anyDb ? 'supabase' : 'local')
      if (menuRes.fromDb && menuRes.data.length > 0) setMenu(menuRes.data)
      if (contentRes.fromDb && contentRes.data) {
        const cfg = contentRes.data as Partial<SiteConfig>
        if (cfg.content) setContent(prev => ({ ...prev, ...cfg.content }))
        if (cfg.themeId) setThemeId(cfg.themeId)
        if (cfg.fontId) setFontId(cfg.fontId)
        if (cfg.visibility) setVisibility(prev => ({ ...prev, ...(cfg.visibility as Partial<SiteVisibility>) }))
        if (cfg.customColors) setCustomColorsState(cfg.customColors)
      }
      if (messagesRes.fromDb && messagesRes.data.length > 0) {
        setMessages(messagesRes.data)
      }
      if (blogRes.fromDb && blogRes.data.length > 0) {
        setBlogPosts(blogRes.data)
      }
      if (mediaRes.fromDb && mediaRes.data.length > 0) {
        setMedia(mediaRes.data.map(mediaAssetToSlot))
      }
      if (adminRes.fromDb) setAdminUsers(adminRes.data)
      if (ordersRes.fromDb) setOrdersCount(ordersRes.data.length)
      if (reservationsRes.fromDb) setReservationsCount(reservationsRes.data.length)
      setLastMessageCount(messagesRes.data.length)
      setDataLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const saveContentToDb = async () => saveContent(content)

  const saveSiteConfigToDb = async () => {
    const config: SiteConfig = { content, themeId, fontId, visibility, customColors }
    return saveSiteConfig(config)
  }

  const handleMarkMessageHandled = async (id: string, handled: boolean) => {
    const res = await markMessageHandled(id, handled)
    if (res.ok) {
      setMessages(prev => prev.map(m =>
        m.id === id ? { ...m, handled } : m
      ))
    }
    return res
  }

  const refreshMessages = async (): Promise<number> => {
    const res = await fetchMessages()
    if (res.fromDb) {
      setMessages(res.data)
      setLastMessageCount(res.data.length)
      return res.data.length
    }
    return lastMessageCount
  }

  const refreshMedia = async (): Promise<void> => {
    const res = await fetchMedia()
    if (res.fromDb) setMedia(res.data.map(mediaAssetToSlot))
    else setMedia(DEFAULT_MEDIA)
  }

  const refreshAdminUsers = async (): Promise<void> => {
    const res = await fetchAdminUsers()
    if (res.fromDb) setAdminUsers(res.data)
  }

  const refreshMenu = async () => {
    const res = await fetchMenu()
    if (res.fromDb && res.data.length > 0) setMenu(res.data)
  }

  const refreshContent = async () => {
    const res = await fetchContent()
    if (res.fromDb && res.data) {
      const cfg = res.data as Partial<SiteConfig>
      if (cfg.content) setContent(prev => ({ ...prev, ...cfg.content }))
      if (cfg.themeId) setThemeId(cfg.themeId)
      if (cfg.fontId) setFontId(cfg.fontId)
      if (cfg.visibility) setVisibility(prev => ({ ...prev, ...(cfg.visibility as Partial<SiteVisibility>) }))
      if (cfg.customColors) setCustomColorsState(cfg.customColors)
    }
  }

  const refreshBlogPosts = async () => {
    const res = await fetchBlogPosts()
    if (res.fromDb) setBlogPosts(res.data)
  }

  const refreshOrders = async () => {
    const res = await fetchOrders()
    if (res.fromDb) setOrdersCount(res.data.length)
  }

  const refreshReservations = async () => {
    const res = await fetchReservations()
    if (res.fromDb) setReservationsCount(res.data.length)
  }

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return
    let active = true
    const channel = sb
      .channel('public-site-realtime', { config: { private: false } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => { if (active) refreshMenu() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_content' }, () => { if (active) refreshContent() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blog_posts' }, () => { if (active) refreshBlogPosts() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media_assets' }, () => { if (active) refreshMedia() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { if (active) refreshOrders() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => { if (active) refreshReservations() })
      .subscribe()
    return () => {
      active = false
      sb.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value: SiteContextValue = {
    themeId, setThemeId, theme, customColors, setCustomColors, fontId, setFontId, font,
    content, setContent, visibility, setVisibility,
    menu, setMenu, media, setMedia, messages, setMessages,
    rootStyle, isDark, dataSource, dataLoading, saveContentToDb,
    refreshMessages, lastMessageCount,
    blogPosts, setBlogPosts, saveSiteConfigToDb, markMessageHandled: handleMarkMessageHandled,
    refreshMedia, adminUsers, refreshAdminUsers, ordersCount, reservationsCount,
  }

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}
