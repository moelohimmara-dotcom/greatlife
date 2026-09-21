import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { THEMES } from '@/config/themes'
import type { ThemePalette } from '@/config/themes'
import { FONTS } from '@/config/fonts'
import type { FontPair } from '@/config/fonts'
import { MENU } from '@/data/menu'
import type { MenuItem } from '@/data/menu'
import { fetchMenu, fetchContent, fetchMessages, fetchBlogPosts, updateSiteContentFields, updateSiteConfigFields, markMessageHandled, fetchMedia, fetchAdminUsers, fetchOrders, fetchReservations, type BlogPost, type SiteConfig, type MediaAsset, type AdminUser, type SaveResult } from '@/lib/repository'
import { getSupabase } from '@/lib/supabase'
import { setRbacOverrides, type RbacOverrides } from '@/data/rbac'
import { fetchAllPages as fetchAllPagesCms } from '@/cms/repository/pages'
import { compteursPilotage, compterEnAttente } from '@/cms/model/compteurs'

export interface SiteContent {
  slogan: string
  heroTitle: string
  heroSub: string
  storyTitle: string
  story: string
  emailContact: string
  emailReservation: string
  autoReply: string
  restaurantName: string
  currency: string
  phone: string
  address: string
  hours: string
  socialFacebook: string
  socialInstagram: string
  socialWhatsapp: string
  team: TeamMember[]
  engagements: Engagement[]
  testimonials: Testimonial[]
}

/*
  Les clés du contenu, listées UNE FOIS.
  POURQUOI : `site_config.value` porte ces champs au NIVEAU RACINE (plat) —
  c'est la forme que `saveContent` puis `updateSiteContentFields` ont toujours
  écrite. Un ancien lecteur ne regardait que `value.content` (imbriqué) : les
  écrans pré-remplissaient donc VIDE ou avec d'anciennes valeurs, et la vraie
  coordonnée saisie par le restaurateur restait prisonnière du plat que personne
  ne lisait. Le lecteur applique les DEUX formes, le plat gagne.
*/
const CLES_SITE_CONTENT: (keyof SiteContent)[] = [
  'slogan', 'heroTitle', 'heroSub', 'storyTitle', 'story',
  'emailContact', 'emailReservation', 'autoReply',
  'restaurantName', 'currency', 'phone', 'address', 'hours',
  'socialFacebook', 'socialInstagram', 'socialWhatsapp',
  'team', 'engagements', 'testimonials',
]

export interface SiteVisibility {
  sections: Record<string, boolean>
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

export interface MessageReply {
  date: string
  author: string
  content: string
}

export interface ContactMessage {
  id?: string
  nom: string
  email: string
  sujet: string
  message: string
  date?: string
  handled?: boolean
  replies?: MessageReply[]
}

export interface TeamMember {
  name: string
  role: string
  desc: string
}

export interface Engagement {
  icon: string
  title: string
  desc: string
}

export interface Testimonial {
  author: string
  text: string
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
  // Vrai setter React : accepte aussi la forme fonctionnelle, indispensable pour
  // ranger l'identité qu'attribue la base à un plat neuf sans écraser une frappe
  // en cours. Déclarer `(m: MenuItem[]) => void` mentait sur ce qui est transmis.
  setMenu: React.Dispatch<React.SetStateAction<MenuItem[]>>
  media: MediaSlot[]
  setMedia: (m: MediaSlot[]) => void
  messages: ContactMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ContactMessage[]>>
  cmsSections: unknown[]
  rootStyle: React.CSSProperties
  isDark: boolean
  dataSource: 'loading' | 'supabase' | 'local'
  dataLoading: boolean
  saveContentFields: (fields: Partial<SiteContent>) => Promise<SaveResult>
  refreshMessages: () => Promise<number>
  lastMessageCount: number
  blogPosts: BlogPost[]
  setBlogPosts: React.Dispatch<React.SetStateAction<BlogPost[]>>
  saveApparenceFields: (fields: { themeId?: string; fontId?: string; visibility?: SiteVisibility }) => Promise<SaveResult>
  rbacOverrides: RbacOverrides | null
  setRbacOverridesState: (o: RbacOverrides | null) => void
  saveRbac: (overrides: RbacOverrides | null) => Promise<SaveResult>
  markMessageHandled: (id: string, handled: boolean) => Promise<SaveResult>
  refreshMedia: () => Promise<void>
  adminUsers: AdminUser[]
  refreshAdminUsers: () => Promise<void>
  ordersCount: number
  reservationsCount: number
  pendingOrdersCount: number
  pendingReservationsCount: number
  unhandledMessagesCount: number
}

const SiteContext = createContext<SiteContextValue | null>(null)
export const useSite = () => useContext(SiteContext)!

export function useFirstMedia(slots: readonly string[]): string | undefined {
  const { media } = useContext(SiteContext)!
  for (const slot of slots) {
    const url = media.find(m => m.slot === slot && m.url)?.url
    if (url) return url
  }
  return undefined
}

export function useMedia(slot: string): string | undefined {
  return useFirstMedia([slot])
}

const DEFAULT_CONTENT: SiteContent = {
  slogan: 'Manger vite. Manger bio. Manger gourmand.',
  heroTitle: 'Le fast-food sans culpabilité.',
  heroSub: "Produits bio, emballages écologiques, cuisson saine et saveurs tropicales — Greatlife prouve que le bien manger n'est pas un luxe.",
  storyTitle: 'Notre histoire',
  story: "Greatlife est né d'une frustration simple : aimer le fast-food, mais refuser de le payer avec sa santé. Ayant grandi avec la street-food africaine, j'ai vu qu'on pouvait allier vitesse, goût intense et produits sains. J'ai voulu prouver que le bio n'est pas un luxe — c'est juste une question d'honnêteté.",
  restaurantName: 'Greatlife',
  currency: 'FG',
  phone: '+224 000 00 00 00',
  address: 'Conakry, Guinée',
  hours: 'Tous les jours · 11h00 — 23h00',
  emailContact: 'contact@greatlife.gn',
  emailReservation: 'resa@greatlife.gn',
  socialFacebook: '',
  socialInstagram: '',
  socialWhatsapp: '',
  team: [
    { name: 'Mister Marcket', role: 'Fondateur & Propriétaire', desc: 'Visionnaire derrière le concept de fast-food bio accessible. Passionné par la valorisation du terroir guinéen.' },
    { name: 'Aïssa Koné', role: 'Cheffe de cuisine', desc: 'Créatrice de nos recettes tropicales bio. Elle marie la street-food africaine et la cuisson saine avec brio.' },
    { name: 'Ibrahima Camara', role: 'Responsable qualité & fournisseurs', desc: 'Le gardien du circuit court. Il sélectionne chaque producteur partenaire de la Fouta-Djallon à Conakry.' },
    { name: 'Fatou Bérété', role: 'Hôte & Maître d\'hôtel', desc: 'Votre premier contact à Greatlife. Son accueil chaleureux donne le ton de l\'expérience gourmande.' },
  ],
  engagements: [
    { icon: 'leaf', title: 'Produits 100% bio', desc: 'Circuit court, fournisseurs locaux de Guinée, labels vérifiés.' },
    { icon: 'recycle', title: 'Emballages écologiques', desc: 'Compostables et recyclables, zéro plastique à usage unique.' },
    { icon: 'fire', title: 'Cuisson saine', desc: 'Modes de cuisson légers, gras maîtrisé, nutriments préservés.' },
    { icon: 'search', title: 'Transparence totale', desc: 'Origine, prix et vertus affichés sur chaque produit.' },
    { icon: 'coin', title: 'Bio accessible', desc: 'Des prix justes en FG : le bio n\'est pas un luxe.' },
    { icon: 'leaf', title: 'Végé-friendly', desc: 'Une vraie offre végétale et vegan à chaque catégorie.' },
  ],
  testimonials: [],
  autoReply: 'Bonjour {nom}, merci pour votre message à Greatlife ! Nous revenons vers vous sous 24h. — L\'équipe Greatlife',
}

const DEFAULT_VISIBILITY: SiteVisibility = {
  sections: { home: true, carte: true, histoire: true, engagements: true, equipe: true, localisation: true, contact: true, blog: true },
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
  const [content, setContent] = useState(DEFAULT_CONTENT)
  const [visibility, setVisibility] = useState(DEFAULT_VISIBILITY)
  const [menu, setMenu] = useState(MENU)
  const [media, setMedia] = useState(DEFAULT_MEDIA)
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [cmsSections, setCmsSections] = useState<unknown[]>([])
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [ordersCount, setOrdersCount] = useState(0)
  const [reservationsCount, setReservationsCount] = useState(0)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
  const [pendingReservationsCount, setPendingReservationsCount] = useState(0)
  const unhandledMessagesCount = messages.filter(m => !m.handled).length
  const [dataSource, setDataSource] = useState<'loading' | 'supabase' | 'local'>('loading')
  const [dataLoading, setDataLoading] = useState(true)
  const [lastMessageCount, setLastMessageCount] = useState(0)
  const [rbacOverrides, setRbacOverridesState] = useState<RbacOverrides | null>(null)

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
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    `
    document.head.appendChild(style)
  }, [])

  /*
    LE CHARGEMENT DOIT SUIVRE LA SESSION (défaut bloquant, revue du 2026-09-20).

    DÉFAUT MESURÉ
    Se connecter depuis l'écran de connexion laissait la console sur
    « 0 message · 0 commande · 0 réservation · 0 utilisateur », alors que la base
    en contient 46, 4, 12 et 4. Un rechargement manuel les faisait apparaître.
    Le restaurateur concluait donc avoir perdu ses données.

    CAUSE
    Ce chargement partait UNE SEULE FOIS, au montage (`useEffect(…, [])`), et
    `SiteProvider` ENVELOPPE `AuthProvider` dans `App.tsx`. Les lectures
    partaient donc avant que la session existe : les policies RLS
    (`messages_admin_read`, `orders_admin_read`, `reservations_admin_read`,
    `admin_users_owner_manage`) répondaient 0 ligne, et RIEN ne relançait le
    chargement après la connexion.

    CORRECTIF : le chargement est relancé quand l'état d'authentification change.
    `load` est extrait pour être appelable des deux endroits ; il est différé
    car appeler Supabase depuis le rappel de `onAuthStateChange` peut bloquer le
    client (recommandation de supabase-js v2).
  */
  const estMonte = useRef(true)
  useEffect(
    () => () => {
      estMonte.current = false
    },
    [],
  )

  /*
    NORMALISATION DE LECTURE (plan P0, arbitrage du 2026-09-20).
    `site_config.value` porte les champs du contenu AU NIVEAU RACINE (plat) :
    c'est la forme que les écrivains (`saveContent`, puis
    `updateSiteContentFields`) ont toujours écrite. Un lecteur ne regardait que
    `value.content` (imbriqué) : les écrans pré-remplissaient VIDE ou avec
    d'anciennes valeurs, et la vraie coordonnée saisie par le restaurateur
    restait prisonnière du plat que personne ne lisait — mesuré :
        value.phone        = +224 661 16 44 58  (le VRAI, écrit)
        value.content.phone = +224 000 00 00 00 (l'ancien, lu)
    Désormais : l'imbriqué est appliqué d'abord (pour les lignes qui n'existeraient
    qu'en cette forme), puis les champs plats PRÉSENTS écrasent. Le plat gagne :
    c'est la forme écrite par le seul écrivain que la base ait connu.
  */
  const appliquerContenuDeLaBase = useCallback((valeur: unknown) => {
    const cfg = valeur as Partial<SiteConfig>
    const imbric = ((cfg.content ?? {}) as Partial<SiteContent>) ?? {}
    const plat = valeur as Partial<SiteContent>
    const fusion: Partial<SiteContent> = { ...imbric }
    for (const c of CLES_SITE_CONTENT) {
      if (plat[c] !== undefined) (fusion as Record<string, unknown>)[c] = plat[c]
    }
    setContent(prev => ({ ...prev, ...fusion }))
    if (typeof (cfg as Record<string, unknown>).themeId === 'string') setThemeId((cfg as Record<string, unknown>).themeId as string)
    if (typeof (cfg as Record<string, unknown>).fontId === 'string') setFontId((cfg as Record<string, unknown>).fontId as string)
    if ((cfg as Partial<SiteConfig>).visibility) setVisibility(prev => ({ ...prev, ...((cfg as Partial<SiteConfig>).visibility as Partial<SiteVisibility>) }))
    if ((cfg as Partial<SiteConfig>).rbacOverrides) {
      const ov = (cfg as Partial<SiteConfig>).rbacOverrides as RbacOverrides
      setRbacOverridesState(ov)
      setRbacOverrides(ov)
    }
  }, [])

  const load = useCallback(async () => {
    const [menuRes, contentRes, messagesRes, blogRes, mediaRes, adminRes, ordersRes, resaRes] = await Promise.all([
      fetchMenu(),
      fetchContent(),
      fetchMessages(),
      fetchBlogPosts(),
      fetchMedia(),
      fetchAdminUsers(),
      fetchOrders(),
      fetchReservations(),
    ])
    if (!estMonte.current) return
    const anyDb = menuRes.fromDb || contentRes.fromDb || messagesRes.fromDb || blogRes.fromDb || mediaRes.fromDb || adminRes.fromDb || ordersRes.fromDb || resaRes.fromDb
    setDataSource(anyDb ? 'supabase' : 'local')
    if (menuRes.fromDb && menuRes.data.length > 0) setMenu(menuRes.data)
    if (contentRes.fromDb && contentRes.data) {
      appliquerContenuDeLaBase(contentRes.data)
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
    // Les QUATRE compteurs viennent de la même règle pure (`@/cms/model/compteurs`).
    // Avant, seuls les totaux étaient posés ici : les compteurs « à traiter »
    // restaient à 0 jusqu'à ce qu'un événement temps réel les réveille — d'où
    // « 0 » affiché alors que la base portait 1 réservation et 4 commandes.
    const compteurs = compteursPilotage(
      ordersRes.fromDb ? ordersRes.data : [],
      resaRes.fromDb ? resaRes.data : [],
    )
    if (ordersRes.fromDb) {
      setOrdersCount(compteurs.ordersCount)
      setPendingOrdersCount(compteurs.pendingOrdersCount)
    }
    if (resaRes.fromDb) {
      setReservationsCount(compteurs.reservationsCount)
      setPendingReservationsCount(compteurs.pendingReservationsCount)
    }
    setLastMessageCount(messagesRes.data.length)
    setDataLoading(false)
  }, [])

  // Chargement initial : inchangé (site public, premier rendu).
  useEffect(() => {
    load()
  }, [load])

  /*
    ET LE CHARGEMENT SUIT LA SESSION.
    `SIGNED_IN` couvre la connexion SANS rechargement — le cas qui affichait 0.
    `SIGNED_OUT` remet les compteurs administrateur à zéro, ce qui est correct :
    sans session, ces tables ne sont plus lisibles.
    `INITIAL_SESSION` n'est PAS écouté : il ferait un second chargement inutile au
    montage, et le cas « page rechargée avec session » fonctionne déjà.
  */
  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return
      setTimeout(() => {
        load()
      }, 0)
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [load])

  /*
    SAUVEGARDE PAR DOMAINE (plan P0).
    Le restaurateur ne « tout enregistre » plus : chaque écran envoie SEULEMENT
    les champs qu'il affiche. Ce qui règle à la racine le piège mesuré — un
    champ vide dans l'écran A écrasait la valeur publiée depuis l'écran B.
  */
  const saveContentFields = useCallback(async (fields: Partial<SiteContent>): Promise<SaveResult> => {
    setContent(prev => ({ ...prev, ...fields }))
    return updateSiteContentFields(fields)
  }, [])

  const saveApparenceFields = useCallback(async (
    fields: { themeId?: string; fontId?: string; visibility?: SiteVisibility },
  ): Promise<SaveResult> => {
    if (fields.themeId) setThemeId(fields.themeId)
    if (fields.fontId) setFontId(fields.fontId)
    if (fields.visibility) setVisibility(prev => ({ ...prev, ...fields.visibility }))
    return updateSiteConfigFields(fields as Record<string, unknown>)
  }, [])

  const saveRbac = async (overrides: RbacOverrides | null) => {
    setRbacOverridesState(overrides)
    setRbacOverrides(overrides)
    /*
      RBAC par domaine : ne plus passer par `saveSiteConfig(config)`, qui
      REMPLACEAIT site_config.value entier (et le `content` global au passage).
      Seul l'annuaire de rôles est écrit ici.
    */
    return updateSiteConfigFields({ rbacOverrides: overrides ?? undefined })
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
      appliquerContenuDeLaBase(res.data)
    }
  }

  const refreshBlogPosts = async () => {
    const res = await fetchBlogPosts()
    if (res.fromDb) setBlogPosts(res.data)
  }

  const refreshCmsSections = async () => {
    try {
      /*
        SIGNAL de rafraîchissement, pas source de rendu.

        `page_sections` est désormais la table de TRAVAIL : on ne la lit plus
        ici. Le rendu public repasse par `useCmsSections`, qui lit l'instantané
        figé à la publication. Ce canal ne fait que signaler « quelque chose a
        changé » pour déclencher cette relecture.

        On se contente donc de l'identité de la page publiée : si elle existe,
        `useCmsSections` ira chercher son instantané ; sinon, rendu historique.
      */
      const pagesRes = await fetchAllPagesCms()
      if (!pagesRes.ok) return
      const published = pagesRes.data.find((p) => p.status === 'published')
      setCmsSections(published ? [published] : [])
    } catch { /* CMS pas encore prêt */ }
  }

  const refreshOrders = async () => {
    const res = await fetchOrders()
    if (res.fromDb) {
      setOrdersCount(res.data.length)
      setPendingOrdersCount(compterEnAttente(res.data))
    }
  }

  const refreshReservations = async () => {
    const res = await fetchReservations()
    if (res.fromDb) {
      setReservationsCount(res.data.length)
      setPendingReservationsCount(compterEnAttente(res.data))
    }
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
      // `pages` porte le STATUT de publication ET l'instantané publié : c'est
      // donc LA table qui décide de ce que voit le visiteur (TDR §22).
      //
      // On n'écoute plus `page_sections` : c'est la table de TRAVAIL. L'écouter
      // ferait recharger le site public à chaque frappe de l'éditeur, pour
      // relire un contenu qui n'est pas encore publié.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, () => { if (active) refreshCmsSections() })
      .subscribe()
    return () => {
      active = false
      sb.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value: SiteContextValue = {
    themeId, setThemeId, theme, fontId, setFontId, font,
    content, setContent, visibility, setVisibility,
    menu, setMenu, media, setMedia, messages, setMessages,
    cmsSections,
    rootStyle, isDark, dataSource, dataLoading, saveContentFields,
    refreshMessages, lastMessageCount,
    blogPosts, setBlogPosts, saveApparenceFields, rbacOverrides, setRbacOverridesState, saveRbac, markMessageHandled: handleMarkMessageHandled,
    refreshMedia, adminUsers, refreshAdminUsers, ordersCount, reservationsCount,
    pendingOrdersCount, pendingReservationsCount, unhandledMessagesCount,
  }

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}
