import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSite, type MediaSlot } from '@/contexts/SiteContext'
import { PageHeader, EmptyState, FieldLabel, inputStyle, GhostButton, PrimaryButton, Pagination } from '@/admin/ui'
import { useAuth } from '@/contexts/AuthContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Icon } from '@/lib/icons'
import { ROLES, canAccessModule, canWriteModule, canDo, ROLE_LABELS, ROLE_DESCRIPTIONS, ALL_MODULES, permLevelFor, MODULE_ACCESS, CRUD_ACTIONS, computeEffectiveAccess, roleSummary, type RbacOverrides, type CrudAction } from '@/data/rbac'
import { THEMES } from '@/config/themes'
import { FONTS } from '@/config/fonts'
import { BADGE_DEFS } from '@/config/badges'
import type { MenuItem } from '@/data/menu'
import { upsertMenuItem, deleteMenuItem, fetchMessages, upsertBlogPost, deleteBlogPost, fetchReservations, updateReservationStatus, deleteReservation, fetchOrders, updateOrderStatus, deleteOrder, uploadMedia, deleteMedia, updateMediaSlot, upsertAdminUser, deleteAdminUser, deleteMessage, appendReply, fetchAuditLog, logAudit, saveSiteConfig, updateAdminUserStatus, setUserInvitedAt, type BlogPost, type Reservation, type Order, type AuditEntry } from '@/lib/repository'
import { invokeReplyEmail, invokeReservationStatusEmail, invokeOrderStatusEmail, getSupabase, sendMagicLink } from '@/lib/supabase'
import { resizeImageFile, isResizableImage, RESIZE_PRESETS } from '@/lib/imageResize'
import { productPhotoSlotId } from '@/lib/productPhotoSlot'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { PageEditorWrapper } from '@/admin/editor/PageEditorWrapper'

const ADMIN_URL = 'https://greatlife-conakry.netlify.app/admin'

const NAV_GROUPS: [string, [string, string, string][]][] = [
  ['Pilotage', [
    ['dashboard', 'Tableau de bord', 'grid'],
    ['orders', 'Commandes', 'coin'],
    ['messages', 'Messages', 'mail'],
    ['reservations', 'Réservations', 'calendar'],
  ]],
  ['Contenu', [
    ['content', 'Modifier le site', 'write'],
    ['team', 'Équipe & contenus', 'users'],
    ['menu', 'Carte & prix', 'leaf'],
    ['blog', 'Blog', 'write'],
  ]],
  ['Apparence', [
    ['theme', 'Thème & ambiance', 'palette'],
    ['media', 'Médias', 'image'],
    ['visibility', 'Visibilité', 'eye'],
  ]],
  ['Système', [
    ['users', 'Utilisateurs & rôles', 'users'],
    ['forms', 'Formulaires & emails', 'settings'],
    ['settings', 'Réglages globaux', 'settings'],
    ['audit', "Journal d'activité", 'eye'],
  ]],
]

function AdminShell({ active, setActive, children }: { active: string; setActive: (s: string) => void; children: React.ReactNode }) {
  const { theme: t, unhandledMessagesCount, pendingOrdersCount, pendingReservationsCount } = useSite()
  const { user, logout, roleNotice, dismissRoleNotice } = useAuth()
  const navigate = useNavigate()
  const [mobileNav, setMobileNav] = useState(false)
  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }
  const go = (k: string) => { setActive(k); setMobileNav(false) }
  const NOTIF: Record<string, number> = { messages: unhandledMessagesCount, orders: pendingOrdersCount, reservations: pendingReservationsCount }

  const Sidebar = (
    <aside style={{ background: t.surface, borderRight: `1px solid ${t.shadow}`, padding: '22px 14px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Link to="/" style={{ fontFamily: 'var(--f-heading)', fontWeight: 700, fontSize: '22px', color: t.heading, textDecoration: 'none', letterSpacing: '-0.02em', display: 'inline-flex', alignItems: 'baseline' }}>
        Great<span style={{ color: t.accent }}>life</span> <span style={{ fontSize: '11px', color: t.muted, fontWeight: 500, marginLeft: 4 }}>admin</span>
      </Link>
      <nav style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1, overflow: 'auto' }}>
        {NAV_GROUPS.map(([groupLabel, items]) => (
          <div key={groupLabel}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: t.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>{groupLabel}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {items.filter(([k]) => canAccessModule(k, user?.role ?? '')).map(([k, l, icon]) => {
                const isActive = active === k
                return (
                  <button key={k} onClick={() => go(k)} style={{
                    textAlign: 'left', padding: '9px 12px', borderRadius: 10,
                    fontSize: '13.5px', fontWeight: isActive ? 600 : 500, cursor: 'pointer', border: 'none',
                    background: isActive ? t.primary : 'transparent',
                    color: isActive ? '#fff' : t.text,
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    transition: 'background 0.18s', position: 'relative',
                  }} onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = `${t.primary}0a` }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                    {!isActive && <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 0, borderRadius: 3, background: t.primary, transition: 'height 0.18s' }} />}
                    <span style={{ display: 'inline-flex', opacity: isActive ? 1 : 0.7 }}>{Icon[icon](15, isActive ? '#fff' : t.text)}</span>
                    <span>{l}</span>
                    {NOTIF[k] > 0 && (
                      <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: 100, background: isActive ? 'rgba(255,255,255,0.25)' : t.accent, color: isActive ? '#fff' : '#fff', minWidth: 18, textAlign: 'center' }}>{NOTIF[k]}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div style={{ borderTop: `1px solid ${t.shadow}`, paddingTop: '14px' }}>
        <div style={{ fontSize: '11px', color: t.muted, marginBottom: 2 }}>Connecté en tant que</div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: t.heading }}>{user?.name}</div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: t.accent, marginBottom: '12px' }}>{ROLE_LABELS[user?.role ?? 'guest'] ?? user?.role}</div>
        <button onClick={handleLogout} style={{
          width: '100%', fontSize: '13px', fontWeight: 600, padding: '9px', borderRadius: 10, cursor: 'pointer',
          border: `1px solid ${t.accent}44`, background: 'transparent', color: t.accent,
          display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center',
        }}>{Icon.logout(14)} Déconnexion</button>
        <Link to="/" style={{ display: 'block', marginTop: '10px', fontSize: '12px', fontWeight: 500, color: t.primary, textAlign: 'center', textDecoration: 'none' }}>← Voir le site</Link>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', minHeight: '100vh', background: t.bg }}>
      <div style={{ display: 'grid', gridTemplateColumns: '248px 1fr', minHeight: '100vh' }} className="admin-layout">
<div className="admin-sidebar-desktop">{Sidebar}</div>
        <main className="admin-main-pad" style={{ padding: '32px 36px', overflow: 'auto', position: 'relative' }}>
          <button onClick={() => setMobileNav(true)} className="admin-mobile-menu" style={{ display: 'none', position: 'absolute', top: 16, right: 16, zIndex: 20, border: `1px solid ${t.shadow}`, background: t.surface, borderRadius: 10, padding: '9px 11px', cursor: 'pointer', color: t.heading }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          {roleNotice && (
            <div key={roleNotice.id} style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 60, maxWidth: 'min(92vw, 560px)', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, border: `1px solid ${t.accent}55`, background: t.surface, boxShadow: `0 8px 28px ${t.shadow}`, fontSize: '13px', fontWeight: 500, color: t.heading }}>
              <span style={{ display: 'inline-flex', color: t.accent }}>{Icon.check(18, t.accent)}</span>
              <span style={{ flex: 1 }}>{roleNotice.msg}</span>
              <button onClick={dismissRoleNotice} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: t.muted, fontSize: 16, padding: '0 4px', lineHeight: 1 }}>×</button>
            </div>
          )}
          {children}
        </main>
      </div>
      {mobileNav && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div onClick={() => setMobileNav(false)} style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ width: '260px', maxWidth: '82vw' }}>{Sidebar}</div>
        </div>
      )}
    </div>
  )
}

function DashCard({ label, value, sub, icon, color }: { label: string; value: React.ReactNode; sub: string; icon: React.ReactNode; color: string }) {
  const { theme: t } = useSite()
  return (
    <OrganicCard style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 12, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div style={{ fontSize: '12px', color: t.muted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: 'var(--f-heading)', fontSize: '30px', fontWeight: 700, color: t.heading, margin: '2px 0', letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: '12px', color: t.muted }}>{sub}</div>
    </OrganicCard>
  )
}

function Dashboard() {
  const { menu, messages, theme: t, dataSource, dataLoading, adminUsers, ordersCount, reservationsCount, content } = useSite()
  const dsLabel = dataLoading ? 'Chargement…' : dataSource === 'supabase' ? 'Supabase connecté' : 'Mode démo (local)'
  const dsColor = dataSource === 'supabase' ? t.primary : t.muted
  const recentMessages = messages.slice(0, 4)
  const [period, setPeriod] = useState<'all' | '7' | '30'>('all')
  const [orders, setOrders] = useState<Order[]>([])
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  useEffect(() => {
    if (dataSource !== 'supabase') return
    let active = true
    fetchOrders().then(res => { if (active && res.fromDb) setOrders(res.data) })
    fetchAuditLog().then(res => { if (active && res.fromDb) setAuditEntries(res.data) })
    return () => { active = false }
  }, [dataSource])
  const now = Date.now()
  const periodMs = period === '7' ? 7 * 86400000 : period === '30' ? 30 * 86400000 : 0
  const filteredOrders = period === 'all' ? orders : orders.filter(o => o.created_at && (now - new Date(o.created_at).getTime()) <= periodMs)
  const confirmedOrders = filteredOrders.filter(o => o.status === 'confirmed')
  const parsePrice = (s: string) => { const n = parseInt(String(s).replace(/[^0-9]/g, ''), 10); return Number.isFinite(n) ? n : 0 }
  const revenue = confirmedOrders.reduce((sum, o) => sum + parsePrice(o.total), 0)
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const unhandledMessages = messages.filter(m => !m.handled).length
  const fmt = (n: number) => n.toLocaleString('fr-FR')
  const periodLabel = period === 'all' ? 'tout l\'historique' : `${period} derniers jours`
  const periodOpts: [string, string][] = [['all', 'Tout'], ['30', '30 jours'], ['7', '7 jours']]
  return (
    <div>
      <PageHeader title="Tableau de bord" subtitle="Pilotez votre site en toute liberté."
        badge={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: `${dsColor}12`, border: `1px solid ${dsColor}33`, fontSize: '12px', fontWeight: 600, color: dsColor }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: dsColor }} /> {dsLabel}</span>}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 18, flexWrap: 'wrap' }}>
        {periodOpts.map(([k, l]) => (
          <button key={k} onClick={() => setPeriod(k as 'all' | '7' | '30')} style={{
            fontSize: '12.5px', fontWeight: 600, padding: '7px 14px', borderRadius: 100, cursor: 'pointer',
            border: `1px solid ${period === k ? t.primary : t.shadow}`, background: period === k ? t.primary : 'transparent',
            color: period === k ? '#fff' : t.muted, transition: 'all 0.15s',
          }}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '16px', marginTop: '16px' }}>
        <DashCard label="Produits" value={menu.length} sub="toutes catégories" icon={Icon.leaf(20, t.primary)} color={t.primary} />
        <DashCard label="Messages" value={messages.length} sub={`${unhandledMessages} non traité${unhandledMessages > 1 ? 's' : ''}`} icon={Icon.mail(20, t.accent)} color={t.accent} />
        <DashCard label="Commandes" value={ordersCount} sub={`${pendingOrders} en attente`} icon={Icon.coin(20, t.gold)} color={t.gold} />
        <DashCard label="Réservations" value={reservationsCount} sub="tables" icon={Icon.calendar(20, t.gold)} color={t.gold} />
        <DashCard label="Utilisateurs" value={adminUsers.length} sub="avec rôles" icon={Icon.users(20, t.primary)} color={t.primary} />
        <DashCard label="Chiffre d\'affaires" value={<span>{fmt(revenue)} <span style={{ fontSize: 14, color: t.muted, fontWeight: 600 }}>{content.currency}</span></span>} sub={`${confirmedOrders.length} cmdes confirmées · ${periodLabel}`} icon={Icon.coin(20, t.primary)} color={t.primary} />
      </div>
      {dataSource === 'supabase' && auditEntries.length > 0 && (() => {
        const total = auditEntries.length
        const byActor = new Map<string, number>()
        const byAction = new Map<string, number>()
        for (const e of auditEntries) {
          const a = e.actor || 'système'
          byActor.set(a, (byActor.get(a) ?? 0) + 1)
          byAction.set(e.action, (byAction.get(e.action) ?? 0) + 1)
        }
        const topActors = [...byActor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
        const topActions = [...byAction.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
        const maxActor = topActors[0]?.[1] ?? 1
        const maxAction = topActions[0]?.[1] ?? 1
        const last24 = auditEntries.filter(e => e.created_at && (now - new Date(e.created_at).getTime()) <= 86400000).length
        return (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '28px 0 12px' }}>
              <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Activité du panneau</h3>
              <span style={{ fontSize: 12, color: t.muted, fontWeight: 600 }}>{total} action{total > 1 ? 's' : ''} tracée{total > 1 ? 's' : ''} · {last24} ces 24 h</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              <OrganicCard style={{ padding: '18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.muted, marginBottom: 12 }}>Top utilisateurs</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {topActors.map(([a, n]) => (
                    <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: t.text, minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a === (content as any).email || a === 'système' ? a : a.split('@')[0]}</span>
                      <div style={{ flex: 1, height: 7, borderRadius: 100, background: t.surfaceAlt, overflow: 'hidden' }}><div style={{ width: `${(n / maxActor) * 100}%`, height: '100%', background: t.primary, borderRadius: 100 }} /></div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: t.heading, minWidth: 28, textAlign: 'right' }}>{n}</span>
                    </div>
                  ))}
                </div>
              </OrganicCard>
              <OrganicCard style={{ padding: '18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.muted, marginBottom: 12 }}>Top actions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {topActions.map(([a, n]) => (
                    <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: `${t.accent}14`, color: t.accent, minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a}</span>
                      <div style={{ flex: 1, height: 7, borderRadius: 100, background: t.surfaceAlt, overflow: 'hidden' }}><div style={{ width: `${(n / maxAction) * 100}%`, height: '100%', background: t.accent, borderRadius: 100 }} /></div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: t.heading, minWidth: 28, textAlign: 'right' }}>{n}</span>
                    </div>
                  ))}
                </div>
              </OrganicCard>
            </div>
          </>
        )
      })()}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '28px 0 12px' }}>
        <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Messages récents</h3>
      </div>
      {recentMessages.length === 0 ? <EmptyState icon={Icon.mail(28, t.muted)} title="Aucun message" subtitle="Les soumissions du formulaire de contact apparaîtront ici." /> :
        <div style={{ display: 'grid', gap: 10 }}>
          {recentMessages.map((m, i) => (
            <OrganicCard key={i} style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${t.primary}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: t.primary, flexShrink: 0 }}>{m.nom.charAt(0).toUpperCase()}</div>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: t.heading }}>{m.nom}</span>
                    <span style={{ fontSize: '12px', color: t.muted, marginLeft: 6 }}>{m.email}</span>
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: t.muted, flexShrink: 0 }}>{m.date}</span>
              </div>
              <div style={{ fontSize: '11px', color: t.accent, fontWeight: 600, marginTop: '6px', marginLeft: 40 }}>{m.sujet}</div>
              <p style={{ fontSize: '13px', color: t.text, margin: '6px 0 0 40px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message}</p>
            </OrganicCard>
          ))}
        </div>
      }
    </div>
  )
}

function SaveBar({ status, error }: { status: 'idle' | 'saving' | 'saved' | 'error'; error?: string }) {
  const { theme: t } = useSite()
  const label = status === 'saving' ? 'Enregistrement…' : status === 'saved' ? 'Enregistré ✓' : status === 'error' ? 'Échec de l\'enregistrement' : ''
  if (!label && status === 'idle') return null
  return (
    <span title={error} style={{ fontSize: '13px', fontWeight: 600, color: status === 'error' ? t.accent : status === 'saved' ? t.primary : t.muted, maxWidth: 360, display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}>
      {label}{error ? ` — ${error}` : ''}
    </span>
  )
}

function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  const { theme: t } = useSite()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', fontWeight: 700, color: t.heading, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      <span style={{ width: 4, height: 16, borderRadius: 3, background: color }} />
      {children}
    </div>
  )
}

function MenuEditor() {
  const { menu, setMenu, theme: t, dataSource } = useSite()
  /**
   * Plat sélectionné, désigné par sa POSITION dans la liste.
   *
   * ⚠️ Ne PAS revenir à une sélection par NOM. Le nom est précisément la donnée
   * que le restaurateur renomme : s'en servir comme clé faisait qu'un renommage
   * changeait la clé en cours de frappe. Conséquences mesurées : l'enregistrement
   * INSÉRAIT une seconde ligne (doublon dans la carte) et l'éditeur perdait sa
   * sélection (« Aucun produit »).
   *
   * La position ne bouge ni quand on renomme, ni quand la base attribue un
   * identifiant à un plat neuf.
   */
  const [sel, setSel] = useState(0)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const [newCat, setNewCat] = useState('Burgers')
  /** Des modifications attendent d'être écrites. */
  const [dirty, setDirty] = useState(false)
  /** Minuteur de la sauvegarde différée. */
  const timerRef = useRef<number | null>(null)
  /**
   * Plat en attente d'écriture — permet de vider la file sans rien perdre.
   * La POSITION est mémorisée avec le plat : `persist` en a besoin pour ranger
   * l'identité attribuée par la base, sans dépendre de la sélection courante
   * (qui a pu changer entre-temps).
   */
  const pendingRef = useRef<{ index: number; item: MenuItem } | null>(null)

  // Les données de démonstration ne sont pas persistées : on n'arme pas de
  // minuteur, pour ne pas afficher un état « non enregistré » trompeur.
  const canPersist = dataSource === 'supabase'

  // Le plat affiché se déduit de sa POSITION, jamais de son nom. La position est
  // bornée : si la carte est rechargée depuis la base avec moins de plats, on ne
  // doit pas tomber sur un écran vide.
  const selIndex = menu.length ? Math.min(sel, menu.length - 1) : -1
  const item: MenuItem | undefined = selIndex >= 0 ? menu[selIndex] : undefined
  const filtered = query.trim() ? menu.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.cat.toLowerCase().includes(query.toLowerCase())) : menu
  const grouped = filtered.reduce((acc, m) => { (acc[m.cat] = acc[m.cat] || []).push(m); return acc }, {} as Record<string, typeof menu>)
  const categories = Array.from(new Set(menu.map(m => m.cat))).sort()

  /**
   * Écrit UN plat en base. Chemin de sauvegarde UNIQUE : la sauvegarde
   * automatique différée comme le bouton « Enregistrer » passent par ici.
   * En cas d'échec, `dirty` reste vrai — le bouton sert alors de rattrapage.
   */
  const persist = useCallback(async (index: number, target: MenuItem) => {
    if (!canPersist) { setDirty(false); setSaveStatus('saved'); return }
    setSaveStatus('saving'); setSaveErr(undefined)
    const res = await upsertMenuItem(target)
    setSaveStatus(res.ok ? 'saved' : 'error')
    setSaveErr(res.ok ? undefined : res.error)
    setDirty(!res.ok)
    // La base vient d'attribuer une identité (plat neuf) : on la range dans
    // l'état. Sans cela le plat resterait sans identifiant, et l'écriture
    // suivante INSÉRERAIT un second exemplaire.
    if (res.ok && res.id) {
      setMenu(prev => prev.map((m, i) => (i === index && !m.id ? { ...m, id: res.id } : m)))
    }
  }, [canPersist])

  /** Vide immédiatement la file d'attente (bouton, changement de plat, sortie). */
  const flush = useCallback(() => {
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null }
    const pending = pendingRef.current
    if (pending) { pendingRef.current = null; persist(pending.index, pending.item) }
  }, [persist])

  // Ne pas perdre une modification en attente en quittant l'écran.
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    const pending = pendingRef.current
    if (pending) persist(pending.index, pending.item)
  }, [persist])

  const update = (k: string, v: string | boolean | string[]) => {
    if (selIndex < 0) return
    const next = menu.map((m, i) => (i === selIndex ? { ...m, [k]: v } : m))
    setMenu(next)
    const updated = next[selIndex]
    if (!updated) return

    // La sauvegarde n'est PAS déclenchée à chaque frappe : on attend une courte
    // pause. Sans ce délai, taper un prix envoyait une requête par caractère,
    // ce qui pouvait se chevaucher et laisser la dernière valeur non écrite.
    setDirty(true)
    pendingRef.current = { index: selIndex, item: updated }
    if (!canPersist) return
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => { pendingRef.current = null; persist(selIndex, updated) }, 800)
  }

  /** Change de plat sans perdre la modification en cours. */
  const selectItem = (index: number) => {
    if (index === selIndex) return
    flush()
    setSel(index)
    setConfirmDel(false)
    setSaveStatus('idle')
  }

  const inp = inputStyle(t)
  if (!item) {
    return (
      <div>
        <PageHeader title="Carte & prix" subtitle="Aucun produit à afficher." />
        <div style={{ marginTop: 20 }}><EmptyState title="Aucun produit" subtitle="Ajoutez votre premier produit pour commencer." /></div>
      </div>
    )
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '28px' }}>
      <div>
        <PageHeader title="Carte & prix" subtitle="Sélectionnez un produit." />
        <div style={{ marginTop: 14, position: 'relative' }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher…" style={{ ...inp, paddingLeft: 36 }} />
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>{Icon.search(15, t.muted)}</span>
        </div>
        <div style={{ maxHeight: '440px', overflow: 'auto', borderRadius: 14, background: t.surface, border: `1px solid ${t.shadow}`, marginTop: 14 }}>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div style={{ padding: '8px 14px 4px', fontSize: '10px', fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.06em', background: t.surfaceAlt, position: 'sticky', top: 0 }}>{cat}</div>
              {items.map(m => {
                // Position RÉELLE dans `menu` : la liste peut être filtrée par la
                // recherche, on ne peut donc pas se fier à l'index du groupe.
                const index = menu.indexOf(m)
                const active = index === selIndex
                return (
                  <button key={m.id ?? `${m.cat}:${m.name}`} onClick={() => selectItem(index)} style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                    fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none',
                    background: active ? `${t.primary}0d` : 'transparent',
                    color: active ? t.primary : t.text, borderBottom: `1px solid ${t.shadow}`,
                  }}>
                    {m.sig ? '★ ' : ''}{m.name} <span style={{ color: t.muted, fontWeight: 400, fontSize: 12 }}>· {m.price}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <button onClick={async () => {
          const cat = newCat.trim() || (categories[0] ?? 'Burgers')
          const newItem: MenuItem = { cat, name: `Nouveau produit ${menu.length + 1}`, sig: false, price: '0', desc: '', vertus: '', badges: [] }
          const index = menu.length
          setMenu(prev => [...prev, newItem])
          setSel(index)
          setConfirmDel(false)
          setSaveStatus('idle')
          if (dataSource !== 'supabase') return
          // Enregistré tout de suite, pour que la base attribue son identité. Le
          // restaurateur peut ensuite renommer : sans identité, la première
          // écriture INSÉRERAIT un second exemplaire.
          const res = await upsertMenuItem(newItem)
          if (res.ok && res.id) {
            setMenu(prev => prev.map((m, i) => (i === index ? { ...m, id: res.id } : m)))
          } else if (!res.ok) {
            setSaveStatus('error'); setSaveErr(res.error); setDirty(true)
          }
        }} style={{
          marginTop: 12, width: '100%', fontSize: '13px', fontWeight: 600, padding: '10px',
          borderRadius: 12, cursor: 'pointer', border: `1px dashed ${t.primary}55`,
          background: 'transparent', color: t.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>{Icon.plus(14, t.primary)} Ajouter un produit</button>
        <div style={{ marginTop: 8 }}>
          <Select value={newCat} onValueChange={setNewCat}>
            <SelectTrigger style={{ borderColor: t.primary + '44', borderRadius: 10, background: t.surfaceAlt, padding: '9px 12px', fontSize: 13 }}>{newCat}</SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{item.name}</h3>
          {/*
            Sauvegarde automatique différée (800 ms) + bouton explicite.
            Le bouton a deux rôles : forcer l'écriture immédiatement, et servir
            de RATTRAPAGE après un échec — l'indicateur « non enregistré » reste
            affiché tant que l'écriture n'a pas réussi.
          */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {dirty && saveStatus !== 'saving' && (
              <span title="Modification en attente d'écriture" style={{ fontSize: 12, fontWeight: 600, color: t.accent }}>
                ● Non enregistré
              </span>
            )}
            <SaveBar status={saveStatus} error={saveErr} />
            <PrimaryButton onClick={flush}>Enregistrer</PrimaryButton>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 14, maxWidth: '560px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 14 }}>
            <div><FieldLabel>Nom</FieldLabel><Input value={item.name} onChange={e => update('name', e.target.value)} style={inp} /></div>
            <div><FieldLabel>Prix (FG)</FieldLabel><Input value={item.price} onChange={e => { const digits = e.target.value.replace(/[^0-9\s]/g, '').trim(); update('price', digits) }} style={inp} inputMode="numeric" placeholder="48 000" /></div>
          </div>
          <div><FieldLabel>Catégorie</FieldLabel>
          <Select value={item.cat} onValueChange={v => update('cat', v)}>
            <SelectTrigger style={{ maxWidth: '340px', borderColor: t.primary + '44', borderRadius: 10, background: t.surfaceAlt, padding: '11px 14px' }}><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select></div>
          <div><FieldLabel>Description percutante</FieldLabel><Textarea rows={3} value={item.desc} onChange={e => update('desc', e.target.value)} style={inp} /></div>
          <div><FieldLabel>Vertus (panneau dépliable)</FieldLabel><Textarea rows={2} value={item.vertus} onChange={e => update('vertus', e.target.value)} style={inp} /></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <FieldLabel>Badges</FieldLabel>
            {['omni', 'vege', 'gluten', 'arachide', 'lactose'].map(b => (
              <button key={b} onClick={() => update('badges', item.badges.includes(b) ? item.badges.filter(x => x !== b) : [...item.badges, b])}
                style={{ fontSize: '11px', padding: '5px 11px', borderRadius: 100, cursor: 'pointer', border: `1px solid ${t.primary}44`, background: item.badges.includes(b) ? t.primary : 'transparent', color: item.badges.includes(b) ? '#fff' : t.text, transition: 'all 0.15s' }}>{BADGE_DEFS[b]?.label}</button>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', fontWeight: 500, color: t.text }}>
            <Switch checked={!!item.sig} onCheckedChange={v => update('sig', v)} /> Produit signature
          </label>
        </div>
        <div style={{ marginTop: '24px' }}>
          {confirmDel ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, border: `1px solid #dc262644`, background: '#dc262608' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>Supprimer « {item.name} » ?</span>
              <button onClick={async () => {
                // Suppression par IDENTITÉ, jamais par nom : le nom est modifiable
                // et, après un renommage, cibler le nom supprimait la mauvaise
                // ligne (ou aucune).
                if (dataSource === 'supabase' && item.id) {
                  const res = await deleteMenuItem(item.id)
                  if (!res.ok) { setSaveStatus('error'); setSaveErr(res.error); setDirty(true); return }
                }
                // Annule toute écriture en attente : sans cela, le minuteur de
                // sauvegarde différée remettrait en base le plat qu'on supprime.
                if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null }
                pendingRef.current = null
                const next = menu.filter((_, i) => i !== selIndex)
                setMenu(next)
                setSel(next.length ? Math.min(selIndex, next.length - 1) : 0)
                setConfirmDel(false)
                setSaveStatus('idle'); setSaveErr(undefined); setDirty(false)
              }} style={{ fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer' }}>Confirmer</button>
              <button onClick={() => setConfirmDel(false)} style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted, cursor: 'pointer' }}>Annuler</button>
            </div>
          ) : (
            <GhostButton color="#dc2626" onClick={() => setConfirmDel(true)} title="Supprimer ce produit">{Icon.trash(13, '#dc2626')} Supprimer ce produit</GhostButton>
          )}
        </div>
      </div>
    </div>
  )
}

function ThemeEditor() {
  const { themeId, setThemeId, fontId, setFontId, theme: t, content, dataSource, saveSiteConfigToDb } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving'); setSaveErr(undefined)
    const res = await saveSiteConfigToDb()
    setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }
  return (
    <div style={{ maxWidth: '800px' }}>
      <PageHeader title="Thème & ambiance" subtitle="Choisissez une ambiance. Le site change en direct."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <div style={{ marginTop: 12, marginBottom: 20 }}><SectionTitle color={t.primary}>Palette de couleurs</SectionTitle></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: '14px' }}>
        {Object.values(THEMES).map(th => (
          <button key={th.id} onClick={() => { setThemeId(th.id); setSaveStatus('idle') }} style={{
            cursor: 'pointer', border: themeId === th.id ? `2px solid ${t.accent}` : `1px solid ${t.shadow}`,
            borderRadius: 16, padding: 16, background: th.surface, textAlign: 'left', transition: 'border 0.2s, transform 0.2s',
            transform: themeId === th.id ? 'translateY(-2px)' : 'none',
          }} onMouseEnter={e => { if (themeId !== th.id) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { if (themeId !== th.id) (e.currentTarget as HTMLButtonElement).style.transform = 'none' }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: '10px' }}>
              {[th.primary, th.accent, th.gold, th.bg].map((c, i) => <div key={i} style={{ width: '22px', height: '22px', borderRadius: 7, background: c, border: `1px solid ${th.shadow}` }} />)}
            </div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: th.heading }}>{th.label}</div>
            {themeId === th.id && <div style={{ fontSize: '11px', color: th.accent, fontWeight: 600, marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{Icon.check(12, th.accent)} Actif</div>}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 28, marginBottom: 20 }}><SectionTitle color={t.accent}>Typographie</SectionTitle></div>
      <Select value={fontId} onValueChange={v => { setFontId(v); setSaveStatus('idle') }}>
        <SelectTrigger style={{ maxWidth: '340px', background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: 10, padding: '11px 14px' }}><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(FONTS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <div style={{ marginTop: 28, marginBottom: 12 }}><SectionTitle color={t.gold}>Aperçu en direct</SectionTitle></div>
      <div style={{ padding: '26px', borderRadius: 18, background: t.surface, border: `1px solid ${t.shadow}` }}>
        <div style={{ fontFamily: 'var(--f-heading)', fontSize: '30px', fontWeight: 700, color: t.heading, letterSpacing: '-0.03em' }}>{content.heroTitle}</div>
        <div style={{ fontSize: '14px', color: t.muted, marginTop: '8px' }}>{content.slogan}</div>
        <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
          <span style={{ padding: '9px 18px', borderRadius: 100, background: t.primary, color: '#fff', fontSize: '13px', fontWeight: 600 }}>Bouton primaire</span>
          <span style={{ padding: '9px 18px', borderRadius: 100, background: t.gold, color: '#fff', fontSize: '13px', fontWeight: 600 }}>Bouton accent</span>
        </div>
      </div>
    </div>
  )
}

const SITE_MEDIA_SLOTS: ReadonlyArray<{ id: string; label: string; dims: string }> = [
  { id: 'hero', label: 'Hero principal', dims: '1920×1080' },
  { id: 'logo', label: 'Logo / favicon', dims: '512×512' },
  { id: 'histoire', label: 'Fond section histoire', dims: '1600×900' },
  { id: 'equipe-1', label: 'Équipe — Membre 1', dims: '600×600' },
  { id: 'equipe-2', label: 'Équipe — Membre 2', dims: '600×600' },
  { id: 'equipe-3', label: 'Équipe — Membre 3', dims: '600×600' },
  { id: 'equipe-4', label: 'Équipe — Membre 4', dims: '600×600' },
  { id: 'general', label: 'Général / divers', dims: 'libre' },
]

function mediaSlotChoices(menu: MenuItem[], existingSlots: string[]): ReadonlyArray<{ id: string; label: string; dims: string }> {
  const plats = menu
    .filter((item): item is MenuItem & { id: string } => Boolean(item.id))
    .map((item) => ({
      id: productPhotoSlotId(item.id),
      label: `Plat — ${item.name}`,
      dims: '800×600',
    }))
  const known = new Set([...SITE_MEDIA_SLOTS.map((s) => s.id), ...plats.map((s) => s.id)])
  const leftovers = [...new Set(existingSlots.filter((slot) => slot && !known.has(slot)))]
    .map((slot) => ({ id: slot, label: slot, dims: '' }))
  return [...SITE_MEDIA_SLOTS, ...plats, ...leftovers]
}

function labelForMediaSlot(slot: string, choices: ReadonlyArray<{ id: string; label: string }>): string {
  return choices.find((s) => s.id === slot)?.label || slot
}

function formatSize(n: number | null | undefined): string {
  if (!n) return ''
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`
}

function MediaManager() {
  const { media, theme: t, dataSource, refreshMedia, menu } = useSite()
  const slotChoices = mediaSlotChoices(menu, media.map((m) => m.slot).filter((s): s is string => Boolean(s)))
  const [slot, setSlot] = useState('hero')
  const [resizePreset, setResizePreset] = useState('original')
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'err' | 'busy'; msg: string }>({ kind: 'idle', msg: '' })
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [editSlotId, setEditSlotId] = useState<string | null>(null)
  const [editSlotValue, setEditSlotValue] = useState('general')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const isSupabase = dataSource === 'supabase'
  const dbAssets = media.filter(m => m.id)
  const resizeMax = RESIZE_PRESETS.find(p => p.id === resizePreset)?.max ?? 0

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!isSupabase) {
      setStatus({ kind: 'err', msg: 'Connexion Supabase requise pour téléverser.' })
      return
    }
    setUploading(true)
    setStatus({ kind: 'busy', msg: `Préparation de ${file.name}…` })
    let finalFile = file
    let dims = ''
    try {
      if (resizeMax > 0 && isResizableImage(file)) {
        const r = await resizeImageFile(file, resizeMax)
        finalFile = r.file
        dims = ` (${r.width}×${r.height})`
      }
    } catch {
      // resize failed: fall back to original
    }
    setStatus({ kind: 'busy', msg: `Téléversement de ${finalFile.name}${dims}…` })
    const res = await uploadMedia(finalFile, slot)
    setUploading(false)
    if (res.data) {
      setStatus({ kind: 'ok', msg: `${res.data.filename} téléversé dans « ${labelForMediaSlot(res.data.slot, slotChoices)} »${dims}.` })
      await refreshMedia()
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec du téléversement.' })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDelete = async (m: MediaSlot) => {
    if (!m.id) return
    setRemovingId(m.id)
    const res = await deleteMedia(m.id, '')
    setRemovingId(null)
    if (res.ok) {
      setStatus({ kind: 'ok', msg: `${m.filename || 'Fichier'} supprimé.` })
      await refreshMedia()
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec de la suppression.' })
    }
  }

  const handleSaveSlot = async (m: MediaSlot) => {
    if (!m.id) return
    const res = await updateMediaSlot(m.id, editSlotValue)
    if (res.ok) {
      setEditSlotId(null)
      await refreshMedia()
      setStatus({ kind: 'ok', msg: 'Emplacement mis à jour.' })
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec de la mise à jour.' })
    }
  }

  return (
    <div style={{ maxWidth: '860px' }}>
      <PageHeader title="Médias" subtitle="Téléversez et redimensionnez vos images, puis assignez-les aux emplacements du site."
        badge={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 100, background: `${t.primary}12`, fontSize: 12, fontWeight: 600, color: t.primary }}>{dbAssets.length} fichier{dbAssets.length > 1 ? 's' : ''}</span>}
      />

      {!isSupabase && (
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: `${t.gold || '#b8860b'}14`, color: t.heading, fontSize: 13, border: `1px solid ${t.primary}22` }}>
          Mode local — la connexion Supabase n'est pas active. Les téléversements sont désactivés.
        </div>
      )}

      <OrganicCard style={{ marginTop: 18, padding: 18, display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <Label style={{ color: t.heading, fontSize: 12, fontWeight: 600 }}>Emplacement cible</Label>
            <Select value={slot} onValueChange={setSlot}>
              <SelectTrigger style={{ borderColor: t.primary + '44', borderRadius: 10, background: t.surfaceAlt, padding: '10px 12px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {slotChoices.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.label} {s.dims ? `· ${s.dims}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <Label style={{ color: t.heading, fontSize: 12, fontWeight: 600 }}>Redimensionnement</Label>
            <Select value={resizePreset} onValueChange={setResizePreset}>
              <SelectTrigger style={{ borderColor: t.primary + '44', borderRadius: 10, background: t.surfaceAlt, padding: '10px 12px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESIZE_PRESETS.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files?.[0])}
        />
        <div
          onClick={() => !uploading && isSupabase && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); if (isSupabase) setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false)
            if (isSupabase && !uploading) handleFile(e.dataTransfer.files?.[0])
          }}
          style={{
            border: `2px dashed ${dragOver ? t.primary : t.primary + '44'}`,
            borderRadius: 14,
            padding: '28px 16px',
            textAlign: 'center',
            cursor: isSupabase && !uploading ? 'pointer' : 'default',
            background: dragOver ? `${t.primary}0d` : t.surfaceAlt,
            transition: 'all 0.15s',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={t.primary} strokeWidth="1.4" style={{ margin: '0 auto 10px', display: 'block' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div style={{ fontWeight: 600, color: t.heading, fontSize: 14 }}>{uploading ? 'Téléversement en cours…' : 'Glissez-déposez ou cliquez pour téléverser'}</div>
          <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>Images & vidéos · {RESIZE_PRESETS.find(p => p.id === resizePreset)?.label.toLowerCase()}</div>
        </div>

        {status.kind !== 'idle' && (
          <div style={{
            fontSize: 13,
            padding: '9px 12px',
            borderRadius: 10,
            background: status.kind === 'ok' ? `${t.primary}12` : status.kind === 'err' ? '#dc262612' : `${t.primary}08`,
            color: status.kind === 'err' ? '#dc2626' : t.heading,
            border: `1px solid ${status.kind === 'err' ? '#dc262633' : t.primary + '22'}`,
          }}>
            {status.kind === 'busy' && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: t.primary, marginRight: 8, animation: 'pulse 1s infinite' }} />}
            {status.msg}
          </div>
        )}
      </OrganicCard>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.heading, marginBottom: 12 }}>Fichiers téléversés</div>
        {dbAssets.length === 0 ? (
          <OrganicCard style={{ padding: '32px 16px', textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={t.muted} strokeWidth="1.3" style={{ margin: '0 auto 10px', display: 'block', opacity: 0.6 }}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 17 5-5 4 4 3-3 6 6" /></svg>
            <div style={{ color: t.muted, fontSize: 13 }}>Aucun fichier téléversé pour le moment.</div>
          </OrganicCard>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {dbAssets.map((m, i) => {
              const isImg = m.content_type?.startsWith('image/')
              const editing = editSlotId === m.id
              return (
                <OrganicCard key={m.id || i} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ width: '100%', aspectRatio: '16 / 10', background: `${t.primary}0d`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                    {isImg && m.url ? (
                      <img src={m.url} alt={m.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={t.primary} strokeWidth="1.3"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 17 5-5 4 4 3-3 6 6" /></svg>
                    )}
                    <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                      {labelForMediaSlot(m.slot, slotChoices)}
                    </span>
                  </div>
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <div style={{ fontWeight: 600, color: t.heading, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.filename}</div>
                    <div style={{ fontSize: 11, color: t.muted }}>{m.content_type || 'fichier'} {formatSize(m.size_bytes) ? `· ${formatSize(m.size_bytes)}` : ''}</div>
                    {editing ? (
                      <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
                        <Select value={editSlotValue} onValueChange={setEditSlotValue}>
                          <SelectTrigger style={{ borderColor: t.primary + '44', borderRadius: 8, background: t.surfaceAlt, padding: '7px 10px', fontSize: 12 }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {slotChoices.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button size="sm" style={{ background: t.primary, color: '#fff', borderRadius: 8, flex: 1 }} onClick={() => handleSaveSlot(m)}>OK</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditSlotId(null)}>Annuler</Button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                        {m.url && (
                          <a href={m.url} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600, padding: '7px 0', borderRadius: 8, border: `1px solid ${t.primary}33`, color: t.primary, textDecoration: 'none' }}>Ouvrir</a>
                        )}
                        <Button size="sm" variant="outline" style={{ flex: 1, borderColor: t.primary + '44', color: t.primary, borderRadius: 8 }} onClick={() => { setEditSlotId(m.id || null); setEditSlotValue(m.slot) }}>Déplacer</Button>
                        <Button size="sm" variant="outline" disabled={removingId === m.id} style={{ borderColor: '#dc262644', color: '#dc2626', borderRadius: 8, opacity: removingId === m.id ? 0.6 : 1 }} onClick={() => handleDelete(m)}>{removingId === m.id ? '…' : 'Suppr.'}</Button>
                      </div>
                    )}
                  </div>
                </OrganicCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function VisibilityEditor() {
  const { visibility, setVisibility, theme: t, dataSource, saveSiteConfigToDb } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const toggle = (k: string) => { setVisibility({ ...visibility, sections: { ...visibility.sections, [k]: !visibility.sections[k] } }); setSaveStatus('idle'); setSaveErr(undefined) }
  const toggleExtra = (k: string) => { setVisibility({ ...visibility, [k]: !visibility[k as keyof typeof visibility] } as typeof visibility); setSaveStatus('idle'); setSaveErr(undefined) }
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving'); setSaveErr(undefined)
    const res = await saveSiteConfigToDb()
    setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }
  const rows: [string, string][] = [['home', 'Accueil'], ['carte', 'La carte'], ['histoire', 'Notre histoire'], ['engagements', 'Engagements'], ['equipe', 'Équipe'], ['localisation', 'Localisation'], ['contact', 'Contact'], ['blog', 'Blog']]
  return (
    <div style={{ maxWidth: '640px' }}>
      <PageHeader title="Visibilité" subtitle="Affichez ou masquez des éléments du site en un clic."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <div style={{ marginTop: 12, marginBottom: 16 }}><SectionTitle color={t.primary}>Sections de page</SectionTitle></div>
      {rows.map(([k, l]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', background: t.surface, border: `1px solid ${t.shadow}`, borderRadius: 12, marginBottom: 8 }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: t.heading }}>{l}</span>
          <Switch checked={visibility.sections[k]} onCheckedChange={() => toggle(k)} />
        </div>
      ))}
      <div style={{ marginTop: 22, marginBottom: 16 }}><SectionTitle color={t.accent}>Éléments de contenu</SectionTitle></div>
      {(['vertusPanel', 'suggestions', 'testimonials', 'badges'] as const).map(k => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', background: t.surface, border: `1px solid ${t.shadow}`, borderRadius: 12, marginBottom: 8 }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: t.heading }}>{k === 'vertusPanel' ? 'Panneau « Vertus » dépliable' : k === 'suggestions' ? 'Suggestions du moment' : k === 'testimonials' ? 'Témoignages' : 'Badges régime & allergènes'}</span>
          <Switch checked={visibility[k]} onCheckedChange={() => toggleExtra(k)} />
        </div>
      ))}
      <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: t.surfaceAlt, fontSize: 12, color: t.muted }}>
        Les changements sont appliqués en direct sur le site après enregistrement.
      </div>
    </div>
  )
}

const ROLE_OPTIONS = ROLES.map(r => ({ id: r.id, name: r.name }))

function emailErrLabel(err?: string): string {
  if (!err) return 'raison inconnue'
  if (err === 'not-configured') return 'Supabase non configuré'
  if (err === 'network') return 'erreur réseau'
  if (err === 'no-credentials') return 'secrets SMTP manquants (SMTP_USER/SMTP_PASS)'
  if (err === 'Authentification requise' || err === 'Session admin invalide') return 'authentification admin requise'
  if (err === 'Acces non autorise' || err === 'Accès non autorisé') return 'accès non autorisé'
  return err
}

function UsersRoles() {
  const { theme: t, dataSource, adminUsers, refreshAdminUsers, rbacOverrides, saveRbac } = useSite()
  const { user: currentUser, refreshRole } = useAuth()
  const isOwner = currentUser?.role === 'owner'
  const permColor = (p: 'write' | 'read' | 'none') => p === 'write' ? t.accent : p === 'read' ? t.primary : t.muted
  const permIcon = (p: 'write' | 'read' | 'none') => p === 'write' ? Icon.write(13, t.accent) : p === 'read' ? Icon.eye(13, t.primary) : '—'

  const isSupabase = dataSource === 'supabase'
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'err' | 'busy'; msg: string }>({ kind: 'idle', msg: '' })
  const [editing, setEditing] = useState<{ id?: string; email: string; name: string; role: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const inp = inputStyle(t)

  const savedOverrides = rbacOverrides ?? null
  const [pendingOverrides, setPendingOverrides] = useState<RbacOverrides | null>(null)
  const effAccess = computeEffectiveAccess(pendingOverrides ?? savedOverrides)
  const pendingCount = (() => {
    if (!pendingOverrides) return 0
    let n = 0
    for (const m of ALL_MODULES) for (const a of CRUD_ACTIONS) {
      const p = pendingOverrides[m]?.[a]
      const s = savedOverrides?.[m]?.[a] ?? MODULE_ACCESS[m].actions[a]
      const pj = p ? JSON.stringify([...p].sort()) : null
      const sj = s ? JSON.stringify([...s].sort()) : null
      if (pj !== sj) n++
    }
    return n
  })()
  const [rbacBusy, setRbacBusy] = useState(false)
  const [rbacStatus, setRbacStatus] = useState<{ kind: 'idle' | 'ok' | 'err'; msg: string }>({ kind: 'idle', msg: '' })
  const [moduleQuery, setModuleQuery] = useState('')
  const filteredModules = ALL_MODULES.filter(m => MODULE_ACCESS[m].module.toLowerCase().includes(moduleQuery.trim().toLowerCase()))
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const RBAC_ACTIONS_SET = new Set(['user_create', 'user_role_update', 'user_delete', 'rbac_update', 'rbac_reset'])
  const [rbacHistory, setRbacHistory] = useState<AuditEntry[]>([])
  const [auditAll, setAuditAll] = useState<AuditEntry[]>([])
  const [rbacHistOpen, setRbacHistOpen] = useState(false)
  useEffect(() => {
    if (dataSource !== 'supabase') return
    let active = true
    const refresh = async () => {
      const res = await fetchAuditLog()
      if (!active || !res.fromDb) return
      setAuditAll(res.data)
      setRbacHistory(res.data.filter(e => RBAC_ACTIONS_SET.has(e.action)))
    }
    refresh()
    const timer = setInterval(refresh, 30000)
    return () => { active = false; clearInterval(timer) }
  }, [dataSource])
  const userActivity = (email: string) => auditAll.filter(e => e.actor.toLowerCase() === email.toLowerCase())

  const actionsFor = (m: string): CrudAction[] => CRUD_ACTIONS.filter(act => MODULE_ACCESS[m].actions[act] !== undefined)
  const roleHas = (m: string, a: CrudAction, role: string): boolean => {
    const roles = effAccess[m].actions[a]
    return roles ? roles.includes(role) : false
  }
  const isLocked = (m: string, role: string): boolean =>
    m === 'users' && role === 'owner'
  const togglePerm = (m: string, a: CrudAction, role: string) => {
    if (!isOwner) return
    if (isLocked(m, role)) return
    const base = pendingOverrides ?? savedOverrides ?? {}
    const next: RbacOverrides = { ...base }
    const cur = effAccess[m].actions[a] ?? []
    const has = cur.includes(role)
    const updated = has ? cur.filter(r => r !== role) : [...cur, role]
    next[m] = { ...next[m], [a]: updated }
    setPendingOverrides(next)
  }
  const discardPerms = () => {
    setPendingOverrides(null)
    setRbacStatus({ kind: 'idle', msg: '' })
  }
  const commitPerms = async () => {
    if (!isOwner || !pendingOverrides) return
    setRbacBusy(true)
    const res = await saveRbac(pendingOverrides)
    setRbacBusy(false)
    if (res.ok) {
      let mailFail = 0
      let mailTotal = 0
      for (const m of ALL_MODULES) for (const a of CRUD_ACTIONS) {
        const p = pendingOverrides[m]?.[a]
        const s = savedOverrides?.[m]?.[a] ?? MODULE_ACCESS[m].actions[a]
        const pj = p ? JSON.stringify([...p].sort()) : null
        const sj = s ? JSON.stringify([...s].sort()) : null
        if (pj !== sj && p) {
          const before = s ?? []
          const added = p.filter(r => !before.includes(r))
          const removed = before.filter(r => !p.includes(r))
          for (const role of [...added, ...removed]) {
            const granted = added.includes(role)
            logAudit({ actor: currentUser?.email ?? '', action: 'rbac_update', target: `${MODULE_ACCESS[m].module} / ${ROLE_LABELS[role] ?? role}`, detail: `${a} ${granted ? 'ajoutée' : 'retirée'}` })
            const permLabel = a === 'create' ? 'Création' : a === 'update' ? 'Modification' : a === 'delete' ? 'Suppression' : 'Publication'
            const permText = `${permLabel} sur le module « ${MODULE_ACCESS[m].module} » ${granted ? 'vous a été accordée' : 'vous a été retirée'}.`
            for (const u of adminUsers.filter(u => u.role === role)) {
              mailTotal++
              const rs = roleSummary(role)
              const dateStr = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })
              const r = await invokeReplyEmail({
                to: u.email,
                subject: `Greatlife - Mise à jour de vos permissions (${ROLE_LABELS[role] ?? role})`,
                replyMessage: `Bonjour ${u.name},

Vos permissions d'accès au panneau d'administration Greatlife ont été modifiées.

Rôle : ${ROLE_LABELS[role] ?? role}
${permText}

Récapitulatif de votre rôle : ${rs.modulesWrite} module(s) en écriture, ${rs.modulesRead} en lecture, ${rs.actionsGranted}/${rs.actionsTotal} actions autorisées.

Pour accéder au panneau d'administration, cliquez sur le lien suivant :
${ADMIN_URL}

Cette modification a été effectuée par ${currentUser?.name ?? currentUser?.email ?? 'un administrateur'} le ${dateStr}. Si vous n'êtes pas à l'origine de cette demande, contactez le propriétaire.

— L'équipe Greatlife`,
                replyFromName: 'Greatlife',
              })
              if (!r.ok) mailFail++
            }
          }
        }
      }
      setPendingOverrides(null)
      const okMsg = 'Permissions enregistrées.'
      if (mailTotal === 0) {
        setRbacStatus({ kind: 'ok', msg: okMsg })
      } else if (mailFail === 0) {
        setRbacStatus({ kind: 'ok', msg: `${okMsg} ${mailTotal} email(s) de notification envoyé(s).` })
      } else {
        setRbacStatus({ kind: 'err', msg: `${okMsg} — ${mailFail}/${mailTotal} email(s) non envoyé(s) (vérifiez les secrets SMTP et l'Edge Function).` })
      }
      refreshRole().catch(() => {})
    } else {
      setRbacStatus({ kind: 'err', msg: res.error || 'Échec.' })
    }
    setTimeout(() => setRbacStatus(s => s.kind === 'ok' ? { kind: 'idle', msg: '' } : s), 2500)
  }
  const resetPerms = async () => {
    if (!isOwner) return
    setPendingOverrides(null)
    setRbacBusy(true)
    const res = await saveRbac(null)
    setRbacBusy(false)
    if (res.ok) {
      logAudit({ actor: currentUser?.email ?? '', action: 'rbac_reset', target: 'Matrice globale', detail: 'Réinitialisation' })
      let mailFail = 0
      for (const u of adminUsers) {
        const rs = roleSummary(u.role)
        const dateStr = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })
        const r = await invokeReplyEmail({
          to: u.email,
          subject: 'Greatlife - Réinitialisation des permissions',
          replyMessage: `Bonjour ${u.name},

La matrice des permissions d'accès au panneau d'administration Greatlife a été réinitialisée à ses valeurs par défaut.

Rôle : ${ROLE_LABELS[u.role] ?? u.role}
Récapitulatif : ${rs.modulesWrite} module(s) en écriture, ${rs.modulesRead} en lecture, ${rs.actionsGranted}/${rs.actionsTotal} actions autorisées.

Pour accéder au panneau d'administration, cliquez sur le lien suivant :
${ADMIN_URL}

Cette réinitialisation a été effectuée par ${currentUser?.name ?? currentUser?.email ?? 'un administrateur'} le ${dateStr}. Si vous n'êtes pas à l'origine de cette demande, contactez le propriétaire.

— L'équipe Greatlife`,
          replyFromName: 'Greatlife',
        })
        if (!r.ok) mailFail++
      }
      const okMsg = 'Permissions réinitialisées (valeurs par défaut).'
      if (mailFail === 0) {
        setRbacStatus({ kind: 'ok', msg: `${okMsg} ${adminUsers.length} email(s) envoyé(s).` })
      } else {
        setRbacStatus({ kind: 'err', msg: `${okMsg} — ${mailFail}/${adminUsers.length} email(s) non envoyé(s) (vérifiez les secrets SMTP et l'Edge Function).` })
      }
      refreshRole().catch(() => {})
    } else {
      setRbacStatus({ kind: 'err', msg: res.error || 'Échec.' })
    }
  }

  const startAdd = () => setEditing({ email: '', name: '', role: 'guest' })
  const startEdit = (u: { id: string; email: string; name: string; role: string }) =>
    setEditing({ id: u.id, email: u.email, name: u.name, role: u.role })

  const saveEdit = async () => {
    if (!editing) return
    if (!editing.email.trim() || !editing.name.trim()) {
      setStatus({ kind: 'err', msg: 'Email et nom requis.' }); return
    }
    const isSelfEdit = !!editing.id && editing.email.trim().toLowerCase() === currentEmail
    if (isSelfEdit && isOwner && editing.role !== 'owner') {
      setStatus({ kind: 'err', msg: 'Vous ne pouvez pas rétrograder votre propre rôle propriétaire.' }); return
    }
    if (editing.id) {
      const target = adminUsers.find(u => u.id === editing.id)
      const otherOwners = adminUsers.filter(u => u.role === 'owner' && u.id !== editing.id).length
      if (target?.role === 'owner' && editing.role !== 'owner' && otherOwners === 0) {
        setStatus({ kind: 'err', msg: 'Impossible : il faut au moins un propriétaire.' }); return
      }
    }
    setStatus({ kind: 'busy', msg: 'Enregistrement…' })
    const res = await upsertAdminUser({
      id: editing.id,
      email: editing.email.trim().toLowerCase(),
      name: editing.name.trim(),
      role: editing.role,
    })
    if (res.ok) {
      logAudit({
        actor: currentUser?.email ?? '',
        action: editing.id ? 'user_role_update' : 'user_create',
        target: editing.email.trim().toLowerCase(),
        detail: `Rôle : ${ROLE_LABELS[editing.role] ?? editing.role}`,
      })
      const dest = editing.email.trim().toLowerCase()
      const rs = roleSummary(editing.role)
      const dateStr = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })
      const mail = await invokeReplyEmail({
        to: dest,
        subject: 'Greatlife - Votre accès au panneau d\'administration',
        replyMessage: `Bonjour ${editing.name.trim()},

Votre compte d'administration Greatlife a été ${editing.id ? 'modifié' : 'créé'}.

Rôle attribué : ${ROLE_LABELS[editing.role] ?? editing.role}${ROLE_DESCRIPTIONS[editing.role] ? '\n' + ROLE_DESCRIPTIONS[editing.role] : ''}
Récapitulatif de votre rôle : ${rs.modulesWrite} module(s) en écriture, ${rs.modulesRead} en lecture, ${rs.actionsGranted}/${rs.actionsTotal} actions autorisées.

Pour accéder au panneau d'administration, cliquez sur le lien suivant :
${ADMIN_URL}

Un lien de connexion sécurisé à usage unique vous a également été envoyé séparément par Supabase : cliquez dessus pour vous connecter sans mot de passe. Cette modification a été effectuée par ${currentUser?.name ?? currentUser?.email ?? 'un administrateur'} le ${dateStr}. Si vous n'êtes pas à l'origine de cette demande, contactez le propriétaire.

— L'équipe Greatlife`,
        replyFromName: 'Greatlife',
      })
      let magic: { ok: boolean; error?: string } = { ok: false }
      if (isSupabase) {
        magic = await sendMagicLink(dest)
        if (magic.ok) await setUserInvitedAt(dest)
      }
      setEditing(null)
      await refreshAdminUsers()
      refreshRole().catch(() => {})
      const okMsg = editing.id ? 'Utilisateur modifié.' : 'Utilisateur ajouté.'
      if (mail.ok && (!isSupabase || magic.ok)) {
        setStatus({ kind: 'ok', msg: `${okMsg} Email de notification + lien de connexion envoyés à ${dest}.` })
      } else if (mail.ok && isSupabase && !magic.ok) {
        setStatus({ kind: 'ok', msg: `${okMsg} Email envoyé à ${dest}. Lien de connexion non envoyé (${emailErrLabel(magic.error)}).` })
      } else {
        setStatus({ kind: 'err', msg: `${okMsg} — Email non envoyé (${emailErrLabel(mail.error)}).` })
      }
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec.' })
    }
  }

  const remove = async (id: string, name: string) => {
    const target = adminUsers.find(u => u.id === id)
    if (target?.role === 'owner' && adminUsers.filter(u => u.role === 'owner').length <= 1) {
      setStatus({ kind: 'err', msg: 'Impossible : il faut au moins un propriétaire.' }); return
    }
    setBusyId(id)
    const res = await deleteAdminUser(id)
    setBusyId(null)
    if (res.ok) {
      logAudit({
        actor: currentUser?.email ?? '',
        action: 'user_delete',
        target: name,
        detail: 'Suppression utilisateur',
      })
      await refreshAdminUsers()
      setStatus({ kind: 'ok', msg: `${name} supprimé.` })
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec de la suppression.' })
    }
  }

  const resendInvite = async (u: { id: string; email: string; name: string; role: string }) => {
    if (!isSupabase) { setStatus({ kind: 'err', msg: 'Supabase non configuré.' }); return }
    setBusyId(u.id)
    const magic = await sendMagicLink(u.email)
    if (magic.ok) await setUserInvitedAt(u.email)
    setBusyId(null)
    if (magic.ok) {
      logAudit({ actor: currentUser?.email ?? '', action: 'user_invite_resend', target: u.email, detail: `Rôle : ${ROLE_LABELS[u.role] ?? u.role}` })
      await refreshAdminUsers()
      setStatus({ kind: 'ok', msg: `Lien de connexion renvoyé à ${u.email}.` })
    } else {
      setStatus({ kind: 'err', msg: `Lien non envoyé (${emailErrLabel(magic.error)}).` })
    }
    setTimeout(() => setStatus(s => s.kind === 'ok' ? { kind: 'idle', msg: '' } : s), 2500)
  }

  const toggleActive = async (u: { id: string; email: string; name: string; role: string; active?: boolean }) => {
    if (u.role === 'owner') { setStatus({ kind: 'err', msg: 'Impossible de suspendre un propriétaire.' }); return }
    const next = !u.active
    setBusyId(u.id)
    const res = await updateAdminUserStatus(u.id, next)
    setBusyId(null)
    if (res.ok) {
      logAudit({ actor: currentUser?.email ?? '', action: next ? 'user_activate' : 'user_suspend', target: u.email, detail: next ? 'Compte réactivé' : 'Compte suspendu' })
      await refreshAdminUsers()
      setStatus({ kind: 'ok', msg: `${u.name} ${next ? 'réactivé' : 'suspendu'}.` })
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec.' })
    }
    setTimeout(() => setStatus(s => s.kind === 'ok' ? { kind: 'idle', msg: '' } : s), 2500)
  }

  const inviteAllPending = async () => {
    if (!isSupabase) { setStatus({ kind: 'err', msg: 'Supabase non configuré.' }); return }
    const pending = adminUsers.filter(u => !u.invited_at && u.role !== 'owner')
    if (pending.length === 0) { setStatus({ kind: 'ok', msg: 'Aucune invitation en attente.' }); return }
    setStatus({ kind: 'busy', msg: `Envoi de ${pending.length} invitation(s)...` })
    let ok = 0
    let fail = 0
    for (const u of pending) {
      const r = await sendMagicLink(u.email)
      if (r.ok) { await setUserInvitedAt(u.email); ok++ } else { fail++ }
    }
    await refreshAdminUsers()
    if (fail === 0) setStatus({ kind: 'ok', msg: `${ok} invitation(s) envoyée(s).` })
    else setStatus({ kind: 'err', msg: `${ok} envoyée(s), ${fail} échec(s).` })
    setTimeout(() => setStatus(s => s.kind === 'ok' ? { kind: 'idle', msg: '' } : s), 3000)
  }

  const currentEmail = currentUser?.email?.toLowerCase()

  return (
    <div style={{ maxWidth: '920px' }}>
      <PageHeader title="Utilisateurs & rôles" subtitle="Permissions granulaires par module (voir / écrire / désactivé)."
        actions={<PrimaryButton onClick={startAdd} disabled={!isSupabase || !!editing || !canDo('users', 'create', currentUser?.role ?? '')}>{Icon.plus(14, '#fff')} Ajouter nouveau</PrimaryButton>}
      />

      {!isSupabase && (
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: `${t.gold || '#b8860b'}14`, color: t.heading, fontSize: 13, border: `1px solid ${t.primary}22` }}>
          Mode local — la gestion des utilisateurs nécessite une connexion Supabase.
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 10px', flexWrap: 'wrap' }}>
        <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '17px', fontWeight: 700, margin: 0 }}>Équipe</h3>
        <span style={{ fontSize: '12px', fontWeight: 600, color: t.muted, background: t.surfaceAlt, padding: '3px 10px', borderRadius: 100 }}>{adminUsers.length}</span>
        {isSupabase && isOwner && adminUsers.some(u => !u.invited_at && u.role !== 'owner') && (
          <GhostButton color={t.primary} onClick={inviteAllPending} disabled={status.kind === 'busy'}>Inviter tous les non-invités</GhostButton>
        )}
      </div>

      {status.kind !== 'idle' && (
        <div style={{
          fontSize: 13, padding: '9px 12px', borderRadius: 10, marginBottom: 12,
          background: status.kind === 'ok' ? `${t.primary}12` : status.kind === 'err' ? '#dc262612' : `${t.primary}08`,
          color: status.kind === 'err' ? '#dc2626' : t.heading,
          border: `1px solid ${status.kind === 'err' ? '#dc262633' : t.primary + '22'}`,
        }}>{status.msg}</div>
      )}

      {editing && (
        <OrganicCard style={{ padding: 16, marginBottom: 12, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <FieldLabel>Nom</FieldLabel>
              <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={inp} placeholder="Nom complet" />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <FieldLabel>Email</FieldLabel>
              <Input value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} style={inp} placeholder="email@greatlife.gn" />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6, maxWidth: 260 }}>
            <FieldLabel>Rôle</FieldLabel>
            <Select value={editing.role} onValueChange={v => setEditing({ ...editing, role: v })}>
              <SelectTrigger style={{ borderColor: t.shadow, borderRadius: 10, background: t.surfaceAlt, padding: '11px 14px', fontSize: 14 }}><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {ROLE_DESCRIPTIONS[editing.role] && (
              <span style={{ fontSize: 12, color: t.muted, lineHeight: 1.4 }}>{ROLE_DESCRIPTIONS[editing.role]}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <PrimaryButton onClick={saveEdit}>Enregistrer</PrimaryButton>
            <GhostButton color={t.muted} onClick={() => setEditing(null)}>Annuler</GhostButton>
          </div>
        </OrganicCard>
      )}

      {adminUsers.length === 0 ? (
        <p style={{ color: t.muted, fontSize: 14, padding: '16px 0' }}>Aucun utilisateur en base. {isSupabase ? 'Cliquez sur « Ajouter ».' : ''}</p>
      ) : (
        adminUsers.map(u => {
          const role = ROLES.find(r => r.id === u.role) || ROLES.find(r => r.id === 'guest')!
          const isSelf = u.email.toLowerCase() === currentEmail
          return (
            <React.Fragment key={u.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: t.surface, border: `1px solid ${t.shadow}`, borderRadius: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{u.name} <span style={{ color: t.muted, fontWeight: 400 }}>· {u.email}{isSelf ? ' (vous)' : ''}</span></span>
                {ROLE_DESCRIPTIONS[role.id] && (
                  <span style={{ fontSize: 11, color: t.muted, lineHeight: 1.3 }}>{ROLE_DESCRIPTIONS[role.id]}</span>
                )}
                {(() => { const s = roleSummary(u.role); return (
                  <span style={{ fontSize: 10, color: t.muted, marginTop: 2 }}>
                    {s.modulesWrite} module{s.modulesWrite > 1 ? 's' : ''} en écriture · {s.modulesRead} en lecture · {s.actionsGranted}/{s.actionsTotal} actions
                  </span>
                ) })()}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, background: `${t.primary}12`, color: t.primary }}>{role.name}</span>
                {u.active === false ? (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: '#dc262612', color: '#dc2626' }}>Suspendu</span>
                ) : isSupabase && !u.invited_at ? (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: `${t.gold || '#b8860b'}14`, color: t.gold || '#b8860b' }}>Invité</span>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: '#16a34a12', color: '#16a34a' }}>Actif</span>
                )}
                {isSupabase && u.active !== false && !u.invited_at && u.role !== 'owner' && canDo('users', 'update', currentUser?.role ?? '') && (
                  <GhostButton color={t.primary} disabled={busyId === u.id} onClick={() => resendInvite(u)}>Inviter</GhostButton>
                )}
                {isSupabase && u.active !== false && u.invited_at && u.role !== 'owner' && canDo('users', 'update', currentUser?.role ?? '') && (
                  <GhostButton color={t.primary} disabled={busyId === u.id} onClick={() => resendInvite(u)}>Renvoyer</GhostButton>
                )}
                {isSupabase && u.role !== 'owner' && canDo('users', 'update', currentUser?.role ?? '') && (
                  <GhostButton color={u.active === false ? '#16a34a' : '#b8860b'} disabled={busyId === u.id} onClick={() => toggleActive(u)}>{u.active === false ? 'Réactiver' : 'Suspendre'}</GhostButton>
                )}
                <GhostButton color={t.primary} disabled={!isSupabase || busyId === u.id || !canDo('users', 'update', currentUser?.role ?? '')} onClick={() => startEdit(u)}>Modifier</GhostButton>
                <GhostButton color="#dc2626" disabled={!isSupabase || isSelf || busyId === u.id || !canDo('users', 'delete', currentUser?.role ?? '')} onClick={() => remove(u.id, u.name)}>{busyId === u.id ? '…' : 'Supprimer'}</GhostButton>
                <GhostButton color={t.muted} onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}>{expandedId === u.id ? 'Masquer' : 'Détails'}</GhostButton>
              </div>
            </div>
            {expandedId === u.id && (
              <div style={{ marginBottom: 8, padding: '14px 16px', background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: 12, fontSize: 12, color: t.text }}>
                {(() => {
                  const writeMods = ALL_MODULES.filter(m => permLevelFor(m, u.role) === 'write').map(m => MODULE_ACCESS[m].module)
                  const readMods = ALL_MODULES.filter(m => permLevelFor(m, u.role) === 'read').map(m => MODULE_ACCESS[m].module)
                  const noneMods = ALL_MODULES.filter(m => permLevelFor(m, u.role) === 'none').map(m => MODULE_ACCESS[m].module)
                  return (
                    <>
                      {writeMods.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.accent, marginBottom: 4 }}>Écriture ({writeMods.length})</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{writeMods.map(m => <span key={m} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: `${t.accent}14`, color: t.accent }}>{m}</span>)}</div>
                        </div>
                      )}
                      {readMods.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.primary, marginBottom: 4 }}>Lecture seule ({readMods.length})</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{readMods.map(m => <span key={m} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: `${t.primary}12`, color: t.primary }}>{m}</span>)}</div>
                        </div>
                      )}
                      {noneMods.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.muted, marginBottom: 4 }}>Aucun accès ({noneMods.length})</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{noneMods.map(m => <span key={m} style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 100, background: t.surface, color: t.muted, border: `1px solid ${t.shadow}` }}>{m}</span>)}</div>
                        </div>
                      )}
                    </>
                  )
                })()}
                {(() => {
                  const acts = userActivity(u.email).slice(0, 8)
                  if (acts.length === 0 && dataSource !== 'supabase') return null
                  return (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${t.shadow}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: t.heading, marginBottom: 6 }}>Activité récente ({acts.length})</div>
                      {acts.length === 0 ? (
                        <div style={{ fontSize: 11, color: t.muted }}>Aucune action enregistrée.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {acts.map(e => (
                            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                              <span style={{ fontSize: 11, color: t.text }}><span style={{ fontWeight: 700, padding: '1px 7px', borderRadius: 100, background: `${t.primary}14`, color: t.primary, marginRight: 6 }}>{e.action}</span>{e.target}{e.detail ? ` — ${e.detail}` : ''}</span>
                              <span style={{ fontSize: 10, color: t.muted, whiteSpace: 'nowrap' }}>{e.created_at ? new Date(e.created_at).toLocaleString('fr-FR') : ''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
            </React.Fragment>
          )
        })
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '24px 0 10px', flexWrap: 'wrap' }}>
        <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '16px', fontWeight: 700, margin: 0 }}>Matrice des permissions</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {rbacStatus.kind !== 'idle' && (
            <span style={{ fontSize: 12, fontWeight: 600, color: rbacStatus.kind === 'err' ? '#dc2626' : t.primary }}>{rbacStatus.msg}</span>
          )}
          {isOwner && (
            <GhostButton color={t.muted} disabled={rbacBusy || !isSupabase} onClick={resetPerms}>Réinitialiser</GhostButton>
          )}
        </div>
      </div>
      {!isOwner && (
        <div style={{ fontSize: 12, color: t.muted, marginBottom: 10 }}>Lecture seule — seul le propriétaire peut modifier les permissions.</div>
      )}
      {pendingCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 14px', borderRadius: 12, background: `${t.accent}12`, border: `1px solid ${t.accent}33`, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: t.heading }}>{pendingCount} modification{pendingCount > 1 ? 's' : ''} en attente</span>
          <PrimaryButton onClick={commitPerms} disabled={rbacBusy || !isSupabase}>{rbacBusy ? 'Enregistrement…' : 'Enregistrer'}</PrimaryButton>
          <GhostButton color={t.muted} disabled={rbacBusy} onClick={discardPerms}>Annuler</GhostButton>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
          <input value={moduleQuery} onChange={e => setModuleQuery(e.target.value)} placeholder="Rechercher un module…" style={{ ...inp, paddingLeft: 30, fontSize: 12 }} />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>{Icon.search(13, t.muted)}</span>
        </div>
        {moduleQuery && <span style={{ fontSize: 11, color: t.muted }}>{filteredModules.length} module{filteredModules.length > 1 ? 's' : ''}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        {ROLES.map(r => {
          const s = roleSummary(r.id)
          return (
            <div key={r.id} style={{ background: t.surface, border: `1px solid ${t.shadow}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 16px', background: t.surfaceAlt, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: t.heading }}>{ROLE_LABELS[r.id] ?? r.name}</span>
                  <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{s.modulesWrite} écriture · {s.modulesRead} lecture · {s.actionsGranted}/{s.actionsTotal} actions</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px 12px', padding: 12 }}>
                {filteredModules.map(m => {
                  const acts = actionsFor(m)
                  const p = permLevelFor(m, r.id)
                  const locked = isLocked(m, r.id)
                  const disabled = !isOwner || rbacBusy || locked
                  return (
                    <div key={m} style={{ padding: '8px 10px', borderRadius: 10, background: p === 'write' ? `${t.accent}0d` : p === 'read' ? `${t.primary}0a` : 'transparent', border: `1px solid ${t.shadow}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: acts.length > 0 ? 6 : 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: t.heading, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{MODULE_ACCESS[m].module}</span>
                        {acts.length === 0 && <span style={{ fontSize: 11, fontWeight: 700, color: permColor(p) }}>{permIcon(p)}</span>}
                      </div>
                      {acts.length > 0 ? (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {acts.map(a => {
                            const on = roleHas(m, a, r.id)
                            const aLabel = a === 'create' ? 'Créer' : a === 'update' ? 'Modif.' : a === 'delete' ? 'Suppr.' : 'Publ.'
                            return (
                              <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }} title={locked ? 'Protégé (propriétaire)' : `${aLabel} : ${on ? 'autorisé' : 'interdit'}`}>
                                <Switch checked={on} onCheckedChange={() => togglePerm(m, a, r.id)} />
                                <span style={{ fontSize: 11, fontWeight: 600, color: on ? t.accent : t.muted }}>{aLabel}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: t.muted }}>{p === 'write' ? 'Écriture' : p === 'read' ? 'Lecture seule' : 'Aucun accès'}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 11, color: t.muted, marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <span>Les modules sans actions (ex. Tableau de bord, Journal) restent en lecture seule. Le rôle propriétaire sur le module Utilisateurs est protégé (anti-verrouillage).</span>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            Historique des changements RBAC
            <span style={{ fontSize: 12, fontWeight: 600, color: t.muted, background: t.surfaceAlt, padding: '2px 10px', borderRadius: 100 }}>{rbacHistory.length}</span>
          </h3>
          <GhostButton color={t.muted} onClick={() => setRbacHistOpen(o => !o)}>{rbacHistOpen ? 'Masquer' : 'Afficher'}</GhostButton>
        </div>
        {rbacHistOpen && (
          rbacHistory.length === 0 ? (
            <p style={{ color: t.muted, fontSize: 13, padding: '8px 0' }}>Aucun changement RBAC enregistré pour le moment.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
              {rbacHistory.slice(0, 50).map(e => (
                <div key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', background: t.surface, border: `1px solid ${t.shadow}`, borderRadius: 10, fontSize: 12 }}>
                  <span style={{ flexShrink: 0, fontSize: 10, color: t.muted, minWidth: 110 }}>{e.created_at ? new Date(e.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  <span style={{ flexShrink: 0, fontWeight: 700, color: t.accent, textTransform: 'capitalize', minWidth: 130 }}>{e.action.replace(/_/g, ' ')}</span>
                  <span style={{ color: t.muted, flexShrink: 0 }}>{e.actor || 'système'}</span>
                  <span style={{ color: t.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>→ {e.target}</span>
                  <span style={{ color: t.muted, flexShrink: 0, fontSize: 11 }}>{e.detail}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

const BLOG_CATEGORIES = ['Actualités', 'Découverte', 'Santé', 'Recettes', 'Producteurs', 'Coulisses', 'Événements']

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function BlogEditor() {
  const { blogPosts, setBlogPosts, theme: t, dataSource } = useSite()
  const { user } = useAuth()
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [coverBusy, setCoverBusy] = useState(false)
  const [coverErr, setCoverErr] = useState<string | undefined>(undefined)
  const coverRef = React.useRef<HTMLInputElement>(null)
  const bodyRef = React.useRef<HTMLTextAreaElement>(null)
  const inp = inputStyle(t)

  const ensureSlug = (p: BlogPost): BlogPost => ({ ...p, slug: p.slug?.trim() ? slugify(p.slug) : slugify(p.title) })

  const save = async () => {
    if (!editing) return
    const finalPost = ensureSlug(editing)
    setEditing(finalPost)
    setSaveStatus('saving'); setSaveErr(undefined)
    if (dataSource === 'supabase') {
      const res = await upsertBlogPost(finalPost)
      setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
      if (res.ok) {
        setBlogPosts(prev => {
          const exists = prev.find(p => p.id === finalPost.id)
          if (exists) return prev.map(p => p.id === finalPost.id ? finalPost : p)
          return [finalPost, ...prev]
        })
      }
    } else {
      setSaveStatus('saved')
    }
    setTimeout(() => setSaveStatus('idle'), 4000)
  }

  const handleCover = async (file: File | undefined) => {
    if (!file || !editing) return
    if (dataSource !== 'supabase') { setCoverErr('Connexion Supabase requise'); return }
    setCoverBusy(true); setCoverErr(undefined)
    try {
      let finalFile = file
      if (isResizableImage(file)) {
        const r = await resizeImageFile(file, 1200)
        finalFile = r.file
      }
      const res = await uploadMedia(finalFile, 'blog-featured')
      setCoverBusy(false)
      if (res.data) {
        setEditing({ ...editing, cover_url: res.data.public_url })
      } else {
        setCoverErr(res.error || 'Échec du téléversement'); setTimeout(() => setCoverErr(undefined), 4000)
      }
    } catch {
      setCoverBusy(false); setCoverErr('Échec du traitement'); setTimeout(() => setCoverErr(undefined), 4000)
    }
    if (coverRef.current) coverRef.current.value = ''
  }

  const removeCover = () => { if (editing) setEditing({ ...editing, cover_url: '' }) }

  const insertMd = (before: string, after = '', placeholder = '') => {
    const el = bodyRef.current
    if (!el || !editing) return
    const start = el.selectionStart ?? editing.body.length
    const end = el.selectionEnd ?? editing.body.length
    const sel = editing.body.slice(start, end) || placeholder
    const next = editing.body.slice(0, start) + before + sel + after + editing.body.slice(end)
    setEditing({ ...editing, body: next })
    requestAnimationFrame(() => { el.focus(); const pos = start + before.length + sel.length + after.length; el.setSelectionRange(pos, pos) })
  }

  const remove = async (post: BlogPost) => {
    if (post.id && dataSource === 'supabase') deleteBlogPost(post.id)
    setBlogPosts(prev => prev.filter(p => p.id !== post.id))
  }

  const toolBtn: React.CSSProperties = { fontSize: 12, fontWeight: 600, padding: '5px 9px', borderRadius: 7, cursor: 'pointer', border: `1px solid ${t.shadow}`, background: t.surfaceAlt, color: t.heading, minWidth: 30 }

  return (
    <div style={{ maxWidth: '820px' }}>
      <PageHeader title="Blog" subtitle="Rédigez et publiez des articles."
        actions={<PrimaryButton onClick={() => setEditing({ title: '', excerpt: '', body: '', category: 'Actualités', published: false, slug: '', cover_url: '', meta_description: '' })} disabled={!canDo('blog', 'create', user?.role ?? '')}>{Icon.plus(14, '#fff')} Nouvel article</PrimaryButton>}
      />
      {editing && (
        <OrganicCard style={{ marginTop: 20, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '18px', fontWeight: 700, margin: 0 }}>{editing.id ? 'Modifier l\'article' : 'Nouvel article'}</h3>
            <button onClick={() => setEditing(null)} style={{ fontSize: '13px', fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{Icon.x(14, t.muted)} Fermer</button>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><FieldLabel>Image à la une</FieldLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ width: 120, height: 72, borderRadius: 10, overflow: 'hidden', background: t.surfaceAlt, border: `1px solid ${t.shadow}`, flexShrink: 0, backgroundImage: editing.cover_url ? `url(${editing.cover_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!editing.cover_url && <span style={{ fontSize: 11, color: t.muted }}>{coverBusy ? '…' : 'Aucune'}</span>}
                </div>
                <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleCover(e.target.files?.[0])} />
                <button onClick={() => coverRef.current?.click()} disabled={coverBusy} style={{ fontSize: '12px', fontWeight: 600, padding: '8px 14px', borderRadius: 10, cursor: coverBusy ? 'wait' : 'pointer', border: `1px solid ${t.primary}44`, background: 'transparent', color: t.primary }}>{coverBusy ? 'Téléversement…' : 'Choisir une image'}</button>
                {editing.cover_url && <GhostButton color="#dc2626" onClick={removeCover}>{Icon.trash(12, '#dc2626')} Retirer</GhostButton>}
                {coverErr && <span style={{ fontSize: '11px', color: t.accent, fontWeight: 600 }}>✗ {coverErr}</span>}
              </div>
            </div>
            <div><FieldLabel>Titre</FieldLabel><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} style={inp} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <FieldLabel>Slug (SEO) <span style={{ fontWeight: 400, color: t.muted }}>(auto si vide)</span></FieldLabel>
                <Input value={editing.slug ?? ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} style={inp} placeholder={slugify(editing.title) || 'mon-article'} />
              </div>
              <div>
                <FieldLabel>Catégorie</FieldLabel>
                <Select value={editing.category} onValueChange={v => setEditing({ ...editing, category: v })}>
                  <SelectTrigger style={{ ...inp, width: '100%' }}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BLOG_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><FieldLabel>Extrait</FieldLabel><Textarea rows={2} value={editing.excerpt} onChange={e => setEditing({ ...editing, excerpt: e.target.value })} style={inp} /></div>
            <div>
              <FieldLabel>Méta-description (SEO) <span style={{ fontWeight: 400, color: t.muted }}>{(editing.meta_description ?? '').length}/160</span></FieldLabel>
              <Textarea rows={2} value={editing.meta_description ?? ''} maxLength={160} onChange={e => setEditing({ ...editing, meta_description: e.target.value })} style={inp} placeholder="Description affichée dans les moteurs de recherche…" />
            </div>
            <div>
              <FieldLabel>Contenu (Markdown)</FieldLabel>
              <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
                <button style={toolBtn} onClick={() => insertMd('**', '**', 'gras')} title="Gras">B</button>
                <button style={{ ...toolBtn, fontStyle: 'italic' }} onClick={() => insertMd('*', '*', 'italique')} title="Italique">I</button>
                <button style={toolBtn} onClick={() => insertMd('## ', '', 'Titre')} title="Titre 2">H2</button>
                <button style={toolBtn} onClick={() => insertMd('### ', '', 'Sous-titre')} title="Titre 3">H3</button>
                <button style={toolBtn} onClick={() => insertMd('> ', '', 'Citation')} title="Citation">❝</button>
                <button style={toolBtn} onClick={() => insertMd('- ', '', 'élément')} title="Liste à puces">• Liste</button>
                <button style={toolBtn} onClick={() => insertMd('[', '](https://)', 'lien')} title="Lien">🔗</button>
              </div>
              <Textarea ref={bodyRef} rows={8} value={editing.body} onChange={e => setEditing({ ...editing, body: e.target.value })} style={{ ...inp, fontFamily: 'var(--f-body)' }} placeholder="Rédigez le contenu de l'article en Markdown…" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', fontWeight: 500, color: t.text, opacity: canDo('blog', 'publish', user?.role ?? '') ? 1 : 0.5, pointerEvents: canDo('blog', 'publish', user?.role ?? '') ? 'auto' : 'none' }} title={canDo('blog', 'publish', user?.role ?? '') ? '' : 'Réservé au propriétaire et au gérant'}>
              <Switch checked={editing.published} onCheckedChange={v => setEditing({ ...editing, published: v })} /> Publier sur le site
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <PrimaryButton onClick={save}>Enregistrer</PrimaryButton>
              <SaveBar status={saveStatus} error={saveErr} />
            </div>
          </div>
        </OrganicCard>
      )}
      <div style={{ marginTop: 24 }}>
        {blogPosts.length === 0 && <EmptyState icon={Icon.write(26, t.muted)} title="Aucun article" subtitle="Cliquez sur « Nouvel article » pour commencer." />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {blogPosts.map(post => (
            <OrganicCard key={post.id} style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ height: 120, background: post.cover_url ? `url(${post.cover_url}) center/cover` : `linear-gradient(135deg, ${t.primary}18, ${t.gold}12)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {!post.cover_url && <span style={{ opacity: 0.5 }}>{Icon.image(28, t.muted)}</span>}
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: t.muted, background: t.surfaceAlt, padding: '3px 9px', borderRadius: 100 }}>{post.category}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: post.published ? `${t.primary}15` : t.surfaceAlt, color: post.published ? t.primary : t.muted }}>{post.published ? 'Publié' : 'Brouillon'}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: t.heading, lineHeight: 1.3 }}>{post.title || 'Sans titre'}</div>
                <div style={{ fontSize: '12px', color: t.muted, fontFamily: 'var(--f-body)' }}>/{post.slug || slugify(post.title)}</div>
                <div style={{ fontSize: '13px', color: t.muted, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.excerpt || 'Aucun extrait'}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <GhostButton color={t.primary} onClick={() => setEditing(post)}>Modifier</GhostButton>
                  {canDo('blog', 'delete', user?.role ?? '') && <GhostButton color="#dc2626" onClick={() => remove(post)}>{Icon.trash(12, '#dc2626')} Supprimer</GhostButton>}
                </div>
              </div>
            </OrganicCard>
          ))}
        </div>
      </div>
    </div>
  )
}

function FormsConfig() {
  const { content, setContent, theme: t, dataSource, saveContentToDb } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const set = (k: string, v: string) => { setContent({ ...content, [k]: v }); setSaveStatus('idle'); setSaveErr(undefined) }
  const inp = inputStyle(t)
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving'); setSaveErr(undefined)
    const res = await saveContentToDb()
    setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }
  return (
    <div style={{ maxWidth: '700px' }}>
      <PageHeader title="Formulaires & emails" subtitle="Configurez les destinataires et l'auto-réponse."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <div style={{ marginTop: 12, marginBottom: 16 }}><SectionTitle color={t.primary}>Destinataires</SectionTitle></div>
      <div style={{ display: 'grid', gap: 14 }}>
        <div><FieldLabel>Destinataire — messages généraux</FieldLabel><Input value={content.emailContact} onChange={e => set('emailContact', e.target.value)} style={inp} /></div>
        <div><FieldLabel>Destinataire — réservations</FieldLabel><Input value={content.emailReservation} onChange={e => set('emailReservation', e.target.value)} style={inp} /></div>
      </div>
      <div style={{ marginTop: 22, marginBottom: 16 }}><SectionTitle color={t.accent}>Auto-réponse</SectionTitle></div>
      <div>
        <FieldLabel>Template d'auto-réponse (variable : {`{nom}`})</FieldLabel>
        <Textarea rows={4} value={content.autoReply} onChange={e => set('autoReply', e.target.value)} style={inp} />
      </div>
      <div style={{ marginTop: 22, marginBottom: 16 }}><SectionTitle color={t.gold}>Pipeline d'envoi</SectionTitle></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: t.muted, fontWeight: 500 }}>
        {['Soumission', 'Table messages', 'Email destinataire', 'Auto-réponse client'].map((s, i, arr) => (
          <React.Fragment key={s}>
            <span style={{ padding: '6px 12px', borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.shadow}`, color: t.heading }}>{s}</span>
            {i < arr.length - 1 && <span style={{ color: t.muted }}>{Icon.arrow(14, t.muted)}</span>}
          </React.Fragment>
        ))}
      </div>
      <div style={{ fontSize: '12px', color: t.muted, marginTop: '12px', lineHeight: 1.6 }}>
        Via Edge Function Supabase + SMTP Google. Historique consultable et exportable depuis le module Messages.
      </div>
    </div>
  )
}

function MessagesManager() {
  const { messages, setMessages, theme: t, dataSource, markMessageHandled } = useSite()
  const { user } = useAuth()
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [live, setLive] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const [handling, setHandling] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unhandled' | 'handled'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkErr, setBulkErr] = useState<string | undefined>(undefined)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const MSG_PAGE = 15
  const inp = inputStyle(t)
  const TEMPLATES = [
    "Bonjour, merci pour votre message. Nous revenons vers vous très vite. — L'équipe Greatlife",
    "Merci pour votre intérêt ! Votre demande est prise en compte, nous vous confirmerons sous 24h.",
    "Bonjour, votre réservation est bien confirmée. Au plaisir de vous accueillir !",
  ]
  const q = query.trim().toLowerCase()
  const filtered = messages.filter(m =>
    (statusFilter === 'all' || (statusFilter === 'unhandled' ? !m.handled : m.handled)) &&
    (!q || m.nom.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.sujet.toLowerCase().includes(q) || m.message.toLowerCase().includes(q))
  )
  const pagedMessages = filtered.slice((page - 1) * MSG_PAGE, page * MSG_PAGE)
  useEffect(() => { setPage(1) }, [query, statusFilter])
  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected = filtered.length > 0 && filtered.every(m => m.id && selectedIds.has(m.id))
  const toggleSelectAll = () => setSelectedIds(allSelected ? new Set() : new Set(filtered.map(m => m.id).filter((id): id is string => Boolean(id))))
  const removeMessage = async (id: string) => {
    setDelBusy(true); setDelErr(undefined)
    const res = await deleteMessage(id)
    setDelBusy(false)
    if (!res.ok) { setDelErr(res.error || 'Échec de la suppression'); setTimeout(() => setDelErr(undefined), 4000); return }
    setMessages(prev => prev.filter(m => m.id !== id))
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    setConfirmDel(null)
    setSelectedIdx(prev => (prev !== null && messages[prev]?.id === id ? null : prev))
  }
  const bulkSetHandled = async (handled: boolean) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkBusy(true); setBulkErr(undefined)
    let failed = 0
    for (const id of ids) { const res = await markMessageHandled(id, handled); if (!res.ok) failed++ }
    setBulkBusy(false)
    if (failed > 0) { setBulkErr(`${failed} échec(s) sur ${ids.length}`); setTimeout(() => setBulkErr(undefined), 4000) }
    setMessages(prev => prev.map(m => (m.id && selectedIds.has(m.id) ? { ...m, handled } : m)))
    setSelectedIds(new Set())
  }
  const bulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkBusy(true); setBulkErr(undefined)
    let failed = 0
    for (const id of ids) { const res = await deleteMessage(id); if (!res.ok) failed++ }
    setBulkBusy(false)
    if (failed > 0) { setBulkErr(`${failed} échec(s) sur ${ids.length}`); setTimeout(() => setBulkErr(undefined), 4000) }
    setMessages(prev => prev.filter(m => !(m.id && selectedIds.has(m.id))))
    setSelectedIds(new Set())
    setSelectedIdx(null)
    setConfirmDel(null)
  }
  const exportCsv = () => {
    const rows = [['Nom', 'Email', 'Sujet', 'Message', 'Date', 'Statut', 'Réponses'].join(';')]
    filtered.forEach(m => {
      rows.push([m.nom, m.email, m.sujet, (m.message || '').replace(/[\n\r]+/g, ' '), m.date || '', m.handled ? 'Traité' : 'Non traité', String(m.replies?.length ?? 0)].map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    })
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `messages-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (dataSource !== 'supabase') return
    let active = true
    let channel: { unsubscribe: () => void } | undefined
    let pollTimer: ReturnType<typeof setInterval> | undefined

    const refresh = async () => {
      const res = await fetchMessages()
      if (!active || !res.fromDb) return
      setMessages(prev => {
        if (res.data.length > prev.length) setNewCount(res.data.length - prev.length)
        return res.data
      })
    }

    refresh()

    const sb = getSupabase()
    if (sb) {
      channel = sb
        .channel('messages-realtime', { config: { private: false } })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          refresh()
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            setLive(true)
            pollTimer = setInterval(refresh, 30000)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setLive(false)
            pollTimer = setInterval(refresh, 10000)
          }
        })
    } else {
      pollTimer = setInterval(refresh, 15000)
    }

    return () => {
      active = false
      if (channel) channel.unsubscribe()
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [dataSource, setMessages])

  const selected = selectedIdx !== null ? messages[selectedIdx] : null

  const [handledErr, setHandledErr] = useState<string | undefined>(undefined)
  const toggleHandled = async () => {
    if (!selected) return
    setHandling(true); setHandledErr(undefined)
    const res = await markMessageHandled(selected.id ?? '', !selected.handled)
    setHandling(false)
    if (!res.ok) { setHandledErr(res.error || 'Échec de la mise à jour'); setTimeout(() => setHandledErr(undefined), 4000) }
  }

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return
    setSending('sending')
    const result = await invokeReplyEmail({
      to: selected.email,
      subject: `Re: ${selected.sujet}`,
      replyMessage: replyText,
      replyFromName: user?.name || 'Greatlife',
      originalMessage: selected.message,
    })
    if (result.ok) {
      setSending('sent')
      const reply = { date: new Date().toISOString(), author: user?.name || 'Greatlife', content: replyText }
      if (selected.id) {
        const saved = await appendReply(selected.id, reply)
        if (saved.ok) {
          setMessages(prev => prev.map(m => m.id === selected.id ? { ...m, replies: [...(m.replies ?? []), reply] } : m))
        }
      }
      setReplyText('')
      setTimeout(() => setSending('idle'), 3000)
    } else {
      setSending('error')
      setTimeout(() => setSending('idle'), 4000)
    }
  }

  if (dataSource !== 'supabase') {
    return (
      <div style={{ maxWidth: '640px' }}>
        <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Messages</h2>
        <div style={{ marginTop: '16px', padding: '20px', borderRadius: '14px', background: t.surfaceAlt, border: `1px dashed ${t.shadow}`, fontSize: '14px', color: t.muted }}>
          Les messages reçus via le formulaire de contact apparaissent ici. Connectez Supabase pour activer la gestion et la réponse aux messages.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '320px 1fr' : '1fr', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <PageHeader title="Messages" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: live ? t.primary : t.muted, animation: live ? 'pulse 2s infinite' : 'none' }} />
          <span style={{ fontSize: '12px', color: t.muted, fontWeight: 500 }}>{live ? 'Temps réel' : 'Actualisation périodique'}</span>
          {newCount > 0 && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: t.accent, color: '#fff' }}>{newCount} nouveau{newCount > 1 ? 'x' : ''}</span>}
          <span style={{ fontSize: '11px', color: t.muted, marginLeft: 'auto' }}>{filtered.length} / {messages.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher…" style={{ ...inp, paddingLeft: 32, fontSize: 13 }} />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>{Icon.search(14, t.muted)}</span>
          </div>
          {([['all', 'Toutes'], ['unhandled', 'Non traitées'], ['handled', 'Traitées']] as ['all' | 'unhandled' | 'handled', string][]).map(([k, l]) => (
            <button key={k} onClick={() => setStatusFilter(k)} style={{ fontSize: '12px', fontWeight: 600, padding: '7px 12px', borderRadius: 100, cursor: 'pointer', border: `1px solid ${statusFilter === k ? t.primary : t.shadow}`, background: statusFilter === k ? t.primary : 'transparent', color: statusFilter === k ? '#fff' : t.muted }}>{l}</button>
          ))}
          <GhostButton color={t.primary} onClick={exportCsv} disabled={filtered.length === 0}>Exporter CSV</GhostButton>
        </div>
        {selectedIds.size > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, padding: '10px 12px', borderRadius: 12, background: `${t.primary}0a`, border: `1px solid ${t.primary}22`, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: t.heading }}>{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
            <button onClick={() => bulkSetHandled(true)} disabled={bulkBusy} style={{ fontSize: '11px', fontWeight: 600, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${t.primary}44`, background: 'transparent', color: t.primary }}>{bulkBusy ? '…' : 'Marquer traités'}</button>
            <button onClick={() => bulkSetHandled(false)} disabled={bulkBusy} style={{ fontSize: '11px', fontWeight: 600, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${t.muted}44`, background: 'transparent', color: t.muted }}>Non traités</button>
            <button onClick={bulkDelete} disabled={bulkBusy} style={{ fontSize: '11px', fontWeight: 600, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: `1px solid #dc262644`, background: 'transparent', color: '#dc2626' }}>{Icon.trash(11, '#dc2626')} Supprimer</button>
            {bulkErr && <span style={{ fontSize: '11px', color: t.accent, fontWeight: 600 }}>✗ {bulkErr}</span>}
            <button onClick={() => setSelectedIds(new Set())} style={{ fontSize: '11px', fontWeight: 600, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted, marginLeft: 'auto' }}>Tout désélectionner</button>
          </div>
        )}
        {messages.length === 0 ? (
          <EmptyState icon={Icon.mail(26, t.muted)} title="Aucun message" subtitle="Les soumissions du formulaire apparaîtront ici." />
        ) : filtered.length === 0 ? (
          <p style={{ color: t.muted, fontSize: 14, padding: '20px 0' }}>Aucun message dans ce filtre.</p>
        ) : (
          <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={toggleSelectAll} style={{ textAlign: 'left', fontSize: '12px', fontWeight: 600, color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', marginBottom: 2 }}>{allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}</button>
            {pagedMessages.map(m => {
              const i = messages.indexOf(m)
              const checked = Boolean(m.id && selectedIds.has(m.id))
              return (
              <div key={m.id ?? i} style={{ display: 'flex', gap: 8, alignItems: 'stretch', border: selectedIdx === i ? `2px solid ${t.primary}` : `1px solid ${t.shadow}`, borderRadius: 14, background: selectedIdx === i ? `${t.primary}08` : (m.handled ? t.surfaceAlt : t.surface), transition: 'all 0.2s', position: 'relative' }}>
                <label style={{ display: 'flex', alignItems: 'center', paddingLeft: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={checked} onChange={() => m.id && toggleSelect(m.id)} style={{ width: 15, height: 15, cursor: 'pointer' }} />
                </label>
                <button onClick={() => { setSelectedIdx(i); setReplyText(''); setSending('idle') }} style={{ flex: 1, textAlign: 'left', padding: '14px 14px 14px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {!m.handled && <span style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', background: t.accent }} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: t.heading }}>{m.nom} {m.handled && <span style={{ fontSize: '10px', color: t.primary, marginLeft: 6 }}>{Icon.check(10, t.primary)}</span>}{(m.replies?.length ?? 0) > 0 && <span style={{ fontSize: '10px', color: t.muted, marginLeft: 6 }} title={`${m.replies!.length} réponse(s)`}>{Icon.mail(10, t.muted)} {m.replies!.length}</span>}</span>
                    <span style={{ fontSize: '11px', color: t.muted }}>{m.date}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: t.accent, fontWeight: 600, marginTop: '2px' }}>{m.sujet}</div>
                  <div style={{ fontSize: '13px', color: t.muted, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message}</div>
                </button>
              </div>
              )
            })}
          </div>
          <Pagination page={page} pageSize={MSG_PAGE} total={filtered.length} onPage={setPage} />
          </>
        )}
      </div>
      {selected && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{selected.nom}</h3>
              <div style={{ fontSize: '13px', color: t.muted, marginTop: '2px' }}>{selected.email} · {selected.date}</div>
              <div style={{ fontSize: '12px', color: t.accent, fontWeight: 600, marginTop: '4px' }}>{selected.sujet}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {selected.handled && <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', background: `${t.primary}15`, color: t.primary }}>✓ Traité</span>}
              {handledErr && <span style={{ fontSize: '11px', fontWeight: 600, color: t.accent }} title={handledErr}>✗ {handledErr}</span>}
              <button onClick={toggleHandled} disabled={handling} style={{
                fontSize: '12px', fontWeight: 600, padding: '7px 14px', borderRadius: '10px', cursor: 'pointer',
                border: `1px solid ${selected.handled ? t.primary : t.shadow}`, background: selected.handled ? `${t.primary}0d` : 'transparent', color: selected.handled ? t.primary : t.muted,
              }}>{selected.handled ? '✓ Traité' : 'Marquer traité'}</button>
              {confirmDel === selected.id ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => selected.id && removeMessage(selected.id)} disabled={delBusy} style={{ fontSize: '12px', fontWeight: 700, padding: '7px 12px', borderRadius: '10px', border: 'none', background: '#dc2626', color: '#fff', cursor: delBusy ? 'wait' : 'pointer' }}>{delBusy ? '…' : 'Confirmer'}</button>
                  <button onClick={() => setConfirmDel(null)} style={{ fontSize: '12px', fontWeight: 600, padding: '7px 12px', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted }}>Annuler</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(selected.id ?? null)} title="Supprimer le message" style={{ fontSize: '12px', fontWeight: 600, padding: '7px 10px', borderRadius: '10px', cursor: 'pointer', border: `1px solid #dc262644`, background: 'transparent', color: '#dc2626' }}>{Icon.trash(13, '#dc2626')}</button>
              )}
              {delErr && <span style={{ fontSize: '11px', color: t.accent, fontWeight: 600 }} title={delErr}>✗ {delErr}</span>}
              <button onClick={() => { setSelectedIdx(null); setReplyText(''); setSending('idle') }} style={{
                fontSize: '13px', fontWeight: 600, padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
                border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted,
              }}>Fermer</button>
            </div>
          </div>
          <OrganicCard style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: t.muted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message original</div>
            <p style={{ fontSize: '14px', color: t.text, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.message}</p>
          </OrganicCard>
          {(selected.replies?.length ?? 0) > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: t.muted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Historique des réponses ({selected.replies!.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selected.replies!.map((rp, idx) => (
                  <div key={idx} style={{ padding: '12px 14px', borderRadius: 12, background: t.surfaceAlt, border: `1px solid ${t.shadow}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: t.heading }}>{rp.author}</span>
                      <span style={{ fontSize: '11px', color: t.muted }}>{rp.date ? new Date(rp.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: t.text, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{rp.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <FieldLabel>Votre réponse</FieldLabel>
            <Textarea rows={5} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Tapez votre réponse au client…" style={inp} />
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: t.muted, fontWeight: 600, alignSelf: 'center' }}>Modèles :</span>
              {TEMPLATES.map((tpl, idx) => (
                <button key={idx} onClick={() => setReplyText(tpl)} title={tpl} style={{ fontSize: '11px', fontWeight: 600, padding: '5px 10px', borderRadius: 100, cursor: 'pointer', border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.slice(0, 28)}…</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '12px', flexWrap: 'wrap' }}>
              <Button onClick={sendReply} disabled={!replyText.trim() || sending === 'sending'} style={{
                background: sending === 'sending' ? t.muted : t.primary, color: '#fff', fontWeight: 600,
                padding: '11px 24px', borderRadius: '100px', border: 'none', cursor: sending === 'sending' ? 'wait' : 'pointer',
                opacity: !replyText.trim() || sending === 'sending' ? 0.6 : 1,
              }}>
                {sending === 'sending' ? 'Envoi…' : 'Répondre par email'}
              </Button>
              {sending === 'sent' && <span style={{ fontSize: '13px', color: t.primary, fontWeight: 600 }}>✓ Email envoyé à {selected.email}</span>}
              {sending === 'error' && <span style={{ fontSize: '13px', color: t.accent, fontWeight: 600 }}>✗ Échec de l'envoi — réessayez</span>}
            </div>
            <div style={{ fontSize: '12px', color: t.muted, marginTop: '10px' }}>L'email sera envoyé depuis moelohimmara@gmail.com vers {selected.email}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrdersManager() {
  const { theme: t, dataSource } = useSite()
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (dataSource !== 'supabase') { setLoading(false); return }
    let active = true
    let timer: ReturnType<typeof setInterval> | undefined
    let channel: { unsubscribe: () => void } | undefined
    const refresh = async () => {
      const res = await fetchOrders()
      if (!active || !res.fromDb) return
      setOrders(res.data)
      setLoading(false)
    }
    refresh()
    const sb = getSupabase()
    if (sb) {
      channel = sb.channel('orders-realtime', { config: { private: false } })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refresh)
        .subscribe()
      timer = setInterval(refresh, 60000)
    } else {
      timer = setInterval(refresh, 30000)
    }
    return () => { active = false; if (channel) channel.unsubscribe(); if (timer) clearInterval(timer) }
  }, [dataSource])
  const statusColor: Record<string, string> = { pending: t.accent, confirmed: t.primary, preparing: t.gold || '#b8860b', ready: t.primary, delivered: t.muted, cancelled: t.muted }
  const statusLabel: Record<string, string> = { pending: 'En attente', confirmed: 'Confirmée', preparing: 'En préparation', ready: 'Prête', delivered: 'Récupérée', cancelled: 'Annulée' }
  const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] as const
  const [filter, setFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const ORDERS_PAGE = 12
  const parsePrice = (s: string) => { const n = parseInt(String(s).replace(/[^0-9]/g, ''), 10); return Number.isFinite(n) ? n : 0 }
  const q = query.trim().toLowerCase()
  useEffect(() => { setPage(1) }, [filter, query, sortKey])
  const matches = orders.filter(o => (filter === 'all' || o.status === filter) && (!q || o.nom.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.ref.toLowerCase().includes(q) || o.phone.toLowerCase().includes(q)))
  const sorted = [...matches].sort((a, b) => {
    if (sortKey === 'amount_desc') return parsePrice(b.total) - parsePrice(a.total)
    if (sortKey === 'amount_asc') return parsePrice(a.total) - parsePrice(b.total)
    const da = a.created_at ? new Date(a.created_at).getTime() : 0
    const db = b.created_at ? new Date(b.created_at).getTime() : 0
    return sortKey === 'date_asc' ? da - db : db - da
  })
  const pagedOrders = sorted.slice((page - 1) * ORDERS_PAGE, page * ORDERS_PAGE)
  const counts = { all: orders.length, pending: orders.filter(o => o.status === 'pending').length, confirmed: orders.filter(o => o.status === 'confirmed').length, preparing: orders.filter(o => o.status === 'preparing').length, ready: orders.filter(o => o.status === 'ready').length, delivered: orders.filter(o => o.status === 'delivered').length, cancelled: orders.filter(o => o.status === 'cancelled').length }
  const exportCsv = () => {
    const rows = [['Réf', 'Nom', 'Email', 'Téléphone', 'Statut', 'Total', 'Retrait', 'Articles', 'Notes', 'Date'].join(';')]
    sorted.forEach(o => {
      rows.push([o.ref, o.nom, o.email, o.phone, statusLabel[o.status] || o.status, o.total, o.pickup_time, o.items.map(i => `${i.qty}x ${i.name}`).join(', '), (o.notes || '').replace(/[\n\r]+/g, ' '), o.created_at ? new Date(o.created_at).toLocaleString('fr-FR') : ''].map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    })
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const removeOrder = async (id: string) => {
    const res = await deleteOrder(id)
    if (!res.ok) { setStatusErr(res.error || 'Échec de la suppression'); setTimeout(() => setStatusErr(undefined), 4000); return }
    setOrders(prev => prev.filter(o => o.id !== id))
    setConfirmDel(null)
    await logAudit({ actor: user?.email ?? '', action: 'order_delete', target: `Commande ${orders.find(o => o.id === id)?.ref ?? id}`, detail: 'Suppression de commande' })
  }
  const [statusSending, setStatusSending] = useState(false)
  const [statusErr, setStatusErr] = useState<string | undefined>(undefined)
  const updateStatus = async (id: string, status: string) => {
    setStatusErr(undefined)
    const res = await updateOrderStatus(id, status)
    if (!res.ok) { setStatusErr(res.error || 'Échec de la mise à jour'); setTimeout(() => setStatusErr(undefined), 4000); return }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    const o = orders.find(x => x.id === id)
    if (o) await logAudit({ actor: user?.email ?? '', action: 'order_status', target: `Commande ${o.ref}`, detail: `→ ${statusLabel[status] ?? status}` })
    if (o) {
      setStatusSending(true)
      await invokeOrderStatusEmail({
        to: o.email,
        nom: o.nom,
        status,
        ref: o.ref,
        items: o.items.map(i => `${i.qty}× ${i.name}`).join(', '),
        total: o.total,
        pickupTime: o.pickup_time,
      })
      setStatusSending(false)
    }
  }
  if (dataSource !== 'supabase') {
    return (
      <div style={{ maxWidth: '640px' }}>
        <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Commandes</h2>
        <div style={{ marginTop: 16, padding: 20, borderRadius: 14, background: t.surfaceAlt, border: `1px dashed ${t.shadow}`, fontSize: 14, color: t.muted }}>
          Les commandes en ligne apparaissent ici. Connectez Supabase pour activer la gestion des commandes.
        </div>
      </div>
    )
  }
  return (
    <div style={{ maxWidth: '840px' }}>
      <PageHeader title="Commandes" subtitle={`${orders.length} commande${orders.length > 1 ? 's' : ''} · actualisation auto`} />
      {loading ? <div style={{ marginTop: 20, color: t.muted, fontSize: 14 }}>Chargement…</div> :
        orders.length === 0 ? <div style={{ marginTop: 20 }}><EmptyState icon={Icon.coin(28, t.muted)} title="Aucune commande" subtitle="Les commandes en ligne des clients apparaîtront ici." /></div> :
        <>
        <div style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher (nom, email, réf, téléphone)…" style={{ ...inputStyle(t), paddingLeft: 34, fontSize: 13 }} />
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>{Icon.search(15, t.muted)}</span>
          </div>
          <Select value={sortKey} onValueChange={v => setSortKey(v as 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc')}>
            <SelectTrigger style={{ width: 160, borderColor: t.shadow, borderRadius: 10, background: t.surfaceAlt, padding: '9px 12px', fontSize: 13 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Plus récentes</SelectItem>
              <SelectItem value="date_asc">Plus anciennes</SelectItem>
              <SelectItem value="amount_desc">Montant ↓</SelectItem>
              <SelectItem value="amount_asc">Montant ↑</SelectItem>
            </SelectContent>
          </Select>
          <GhostButton color={t.primary} onClick={exportCsv} disabled={sorted.length === 0}>Exporter CSV</GhostButton>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {([['all', 'Toutes'], ['pending', 'En attente'], ['confirmed', 'Confirmées'], ['preparing', 'En préparation'], ['ready', 'Prêtes'], ['delivered', 'Récupérées'], ['cancelled', 'Annulées']] as [string, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              fontSize: '12.5px', fontWeight: 600, padding: '7px 14px', borderRadius: 100, cursor: 'pointer', border: `1px solid ${filter === k ? t.primary : t.shadow}`,
              background: filter === k ? t.primary : 'transparent', color: filter === k ? '#fff' : t.muted, transition: 'all 0.15s',
            }}>{l} <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts[k as keyof typeof counts] ?? 0}</span></button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {sorted.length === 0 ? <p style={{ color: t.muted, fontSize: 14, padding: '20px 0' }}>Aucune commande dans ce filtre.</p> :
          pagedOrders.map(o => (
            <OrganicCard key={o.id} style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: t.heading }}>{o.nom} {o.ref && <span style={{ fontSize: '11px', color: t.muted, fontWeight: 600, fontFamily: 'var(--f-body)', marginLeft: 6 }}>· ref {o.ref}</span>}</div>
                  <div style={{ fontSize: '13px', color: t.muted, marginTop: 4 }}>{o.email}{o.phone ? ` · ${o.phone}` : ''} · retrait {o.pickup_time || '—'}{o.created_at ? ` · ${new Date(o.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}</div>
                  {o.items.length > 0 && (
                    <div style={{ fontSize: '13px', color: t.text, marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {o.items.map((it, idx) => (
                        <span key={idx} style={{ padding: '3px 9px', borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.shadow}`, fontSize: '12px' }}>{it.qty}× {it.name}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: '13px', fontWeight: 700, color: t.accent, marginTop: 8 }}>{o.total} FG</div>
                  {o.notes && <div style={{ fontSize: '12px', color: t.muted, marginTop: 6, whiteSpace: 'pre-wrap' }}>Note : {o.notes}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', background: `${statusColor[o.status]}15`, color: statusColor[o.status] }}>{statusLabel[o.status] ?? o.status}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {statusSending && <span style={{ fontSize: '10px', color: t.muted }}>Envoi notif…</span>}
                    {statusErr && <span style={{ fontSize: '10px', color: t.accent, fontWeight: 600, maxWidth: 220 }} title={statusErr}>✗ {statusErr}</span>}
                    <Select value={o.status} onValueChange={v => updateStatus(o.id!, v)}>
                      <SelectTrigger style={{ width: 150, borderColor: t.shadow, borderRadius: 8, background: t.surfaceAlt, padding: '6px 10px', fontSize: 11 }}>{statusLabel[o.status] ?? o.status}</SelectTrigger>
                      <SelectContent>
                        {STATUS_FLOW.map(s => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {canDo('orders', 'delete', user?.role ?? '') && (confirmDel === o.id ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => removeOrder(o.id!)} style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer' }}>Confirmer</button>
                        <button onClick={() => setConfirmDel(null)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted, cursor: 'pointer' }}>Annuler</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDel(o.id ?? null)} title="Supprimer la commande" style={{ fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 8, cursor: 'pointer', border: `1px solid #dc262644`, background: 'transparent', color: '#dc2626' }}>{Icon.trash(12, '#dc2626')}</button>
                    ))}
                  </div>
                </div>
              </div>
            </OrganicCard>
          ))}
        </div>
        <Pagination page={page} pageSize={ORDERS_PAGE} total={sorted.length} onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
        </>
      }
    </div>
  )
}

function ReservationsManager() {
  const { theme: t, dataSource } = useSite()
  const { user } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (dataSource !== 'supabase') { setLoading(false); return }
    let active = true
    let timer: ReturnType<typeof setInterval> | undefined
    let channel: { unsubscribe: () => void } | undefined
    const refresh = async () => {
      const res = await fetchReservations()
      if (!active || !res.fromDb) return
      setReservations(res.data)
      setLoading(false)
    }
    refresh()
    const sb = getSupabase()
    if (sb) {
      channel = sb.channel('reservations-realtime', { config: { private: false } })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, refresh)
        .subscribe()
      timer = setInterval(refresh, 60000)
    } else {
      timer = setInterval(refresh, 30000)
    }
    return () => { active = false; if (channel) channel.unsubscribe(); if (timer) clearInterval(timer) }
  }, [dataSource])
  const statusColor: Record<string, string> = { pending: t.accent, confirmed: t.primary, cancelled: t.muted }
  const statusLabel: Record<string, string> = { pending: 'En attente', confirmed: 'Confirmée', cancelled: 'Annulée' }
  const STATUS_FLOW = ['pending', 'confirmed', 'cancelled'] as const
  const [filter, setFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<'date_desc' | 'date_asc' | 'guests_desc' | 'guests_asc'>('date_desc')
  const [dateFilter, setDateFilter] = useState('')
  const [view, setView] = useState<'list' | 'planning'>('list')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const RESA_PAGE = 12
  const q = query.trim().toLowerCase()
  useEffect(() => { setPage(1) }, [filter, query, sortKey, dateFilter, view])
  const matches = reservations.filter(r => (filter === 'all' || r.status === filter) && (!dateFilter || r.date === dateFilter) && (!q || r.nom.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q) || r.date.toLowerCase().includes(q) || r.time.toLowerCase().includes(q)))
  const sorted = [...matches].sort((a, b) => {
    if (sortKey === 'guests_desc') return b.guests - a.guests
    if (sortKey === 'guests_asc') return a.guests - b.guests
    const ka = `${a.date} ${a.time}`
    const kb = `${b.date} ${b.time}`
    return sortKey === 'date_asc' ? ka.localeCompare(kb) : kb.localeCompare(ka)
  })
  const pagedReservations = sorted.slice((page - 1) * RESA_PAGE, page * RESA_PAGE)
  const counts = { all: reservations.length, pending: reservations.filter(r => r.status === 'pending').length, confirmed: reservations.filter(r => r.status === 'confirmed').length, cancelled: reservations.filter(r => r.status === 'cancelled').length }
  const exportCsv = () => {
    const rows = [['Nom', 'Email', 'Téléphone', 'Date', 'Heure', 'Couverts', 'Statut', 'Message', 'Créée le'].join(';')]
    sorted.forEach(r => {
      rows.push([r.nom, r.email, r.phone, r.date, r.time, String(r.guests), statusLabel[r.status] || r.status, (r.message || '').replace(/[\n\r]+/g, ' '), r.created_at ? new Date(r.created_at).toLocaleString('fr-FR') : ''].map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    })
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reservations-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const removeResa = async (id: string) => {
    const res = await deleteReservation(id)
    if (!res.ok) { setStatusErr(res.error || 'Échec de la suppression'); setTimeout(() => setStatusErr(undefined), 4000); return }
    setReservations(prev => prev.filter(r => r.id !== id))
    setConfirmDel(null)
    await logAudit({ actor: user?.email ?? '', action: 'reservation_delete', target: `Réservation ${reservations.find(r => r.id === id)?.nom ?? id}`, detail: 'Suppression de réservation' })
  }
  const [statusSending, setStatusSending] = useState(false)
  const [statusErr, setStatusErr] = useState<string | undefined>(undefined)
  const updateStatus = async (id: string, status: string) => {
    setStatusErr(undefined)
    const res = await updateReservationStatus(id, status)
    if (!res.ok) { setStatusErr(res.error || 'Échec de la mise à jour'); setTimeout(() => setStatusErr(undefined), 4000); return }
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    const r = reservations.find(x => x.id === id)
    if (r) await logAudit({ actor: user?.email ?? '', action: 'reservation_status', target: `Réservation ${r.nom}`, detail: `→ ${statusLabel[status] ?? status}` })
    if (r) {
      setStatusSending(true)
      await invokeReservationStatusEmail({
        to: r.email,
        nom: r.nom,
        status,
        resaDate: r.date,
        resaTime: r.time,
        resaGuests: String(r.guests),
      })
      setStatusSending(false)
    }
  }
  if (dataSource !== 'supabase') {
    return (
      <div style={{ maxWidth: '640px' }}>
        <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Réservations</h2>
        <div style={{ marginTop: 16, padding: 20, borderRadius: 14, background: t.surfaceAlt, border: `1px dashed ${t.shadow}`, fontSize: 14, color: t.muted }}>
          Les réservations de table apparaissent ici. Connectez Supabase pour activer la gestion des réservations.
        </div>
      </div>
    )
  }
  const today = new Date().toISOString().slice(0, 10)
  const dates = Array.from(new Set(reservations.map(r => r.date))).sort()
  const planningByDate = dates.map(d => ({ date: d, rows: sorted.filter(r => r.date === d) })).filter(g => g.rows.length > 0)
  const fmtDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }) } catch { return d }
  }
  const totalGuests = sorted.reduce((n, r) => n + (r.status !== 'cancelled' ? r.guests : 0), 0)
  return (
    <div style={{ maxWidth: '900px' }}>
      <PageHeader title="Réservations" subtitle={`${reservations.length} réservation${reservations.length > 1 ? 's' : ''} · ${totalGuests} couverts (hors annulées) · actualisation auto`} />
      {loading ? <div style={{ marginTop: 20, color: t.muted, fontSize: 14 }}>Chargement…</div> :
        reservations.length === 0 ? <div style={{ marginTop: 20 }}><EmptyState icon={Icon.calendar(28, t.muted)} title="Aucune réservation" subtitle="Les demandes de table apparaîtront ici." /></div> :
        <>
        <div style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher (nom, email, tel, date, heure)…" style={{ ...inputStyle(t), paddingLeft: 34, fontSize: 13 }} />
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>{Icon.search(15, t.muted)}</span>
          </div>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ ...inputStyle(t), width: 160, fontSize: 13 }} title="Filtrer par date" />
          {dateFilter && <GhostButton color={t.muted} onClick={() => setDateFilter('')} title="Effacer le filtre date">{Icon.x(13, t.muted)}</GhostButton>}
          <Select value={sortKey} onValueChange={v => setSortKey(v as 'date_desc' | 'date_asc' | 'guests_desc' | 'guests_asc')}>
            <SelectTrigger style={{ width: 160, borderColor: t.shadow, borderRadius: 10, background: t.surfaceAlt, padding: '9px 12px', fontSize: 13 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Plus récentes</SelectItem>
              <SelectItem value="date_asc">Plus anciennes</SelectItem>
              <SelectItem value="guests_desc">Couverts ↓</SelectItem>
              <SelectItem value="guests_asc">Couverts ↑</SelectItem>
            </SelectContent>
          </Select>
          <Select value={view} onValueChange={v => setView(v as 'list' | 'planning')}>
            <SelectTrigger style={{ width: 140, borderColor: t.shadow, borderRadius: 10, background: t.surfaceAlt, padding: '9px 12px', fontSize: 13 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="list">Liste</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
            </SelectContent>
          </Select>
          <GhostButton color={t.primary} onClick={exportCsv} disabled={sorted.length === 0}>Exporter CSV</GhostButton>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {([['all', 'Toutes'], ['pending', 'En attente'], ['confirmed', 'Confirmées'], ['cancelled', 'Annulées']] as [string, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              fontSize: '12.5px', fontWeight: 600, padding: '7px 14px', borderRadius: 100, cursor: 'pointer', border: `1px solid ${filter === k ? t.primary : t.shadow}`,
              background: filter === k ? t.primary : 'transparent', color: filter === k ? '#fff' : t.muted, transition: 'all 0.15s',
            }}>{l} <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts[k as keyof typeof counts] ?? 0}</span></button>
          ))}
        </div>
        {sorted.length === 0 ? <p style={{ color: t.muted, fontSize: 14, padding: '20px 0' }}>Aucune réservation dans ce filtre.</p> :
        view === 'planning' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 16 }}>
            {planningByDate.map(g => (
              <div key={g.date}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: t.heading, textTransform: 'capitalize' }}>{fmtDate(g.date)}</span>
                  <span style={{ fontSize: '12px', color: t.muted }}>{g.rows.length} résa · {g.rows.reduce((n, r) => n + (r.status !== 'cancelled' ? r.guests : 0), 0)} couverts</span>
                  {g.date === today && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: `${t.accent}18`, color: t.accent }}>Aujourd'hui</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 12, borderLeft: `2px solid ${t.shadow}` }}>
                  {g.rows.map(r => (
                    <OrganicCard key={r.id} style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: t.heading }}>{r.time} · {r.nom} <span style={{ fontSize: '12px', color: t.muted, fontWeight: 400 }}>· {r.guests} pers.</span></div>
                          <div style={{ fontSize: '12px', color: t.muted, marginTop: 2 }}>{r.email}{r.phone ? ` · ${r.phone}` : ''}{r.message ? ` · ${r.message.slice(0, 60)}${r.message.length > 60 ? '…' : ''}` : ''}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: `${statusColor[r.status]}15`, color: statusColor[r.status] }}>{statusLabel[r.status] ?? r.status}</span>
                          <Select value={r.status} onValueChange={v => updateStatus(r.id!, v)}>
                            <SelectTrigger style={{ width: 120, borderColor: t.shadow, borderRadius: 8, background: t.surfaceAlt, padding: '5px 9px', fontSize: 11 }}>{statusLabel[r.status] ?? r.status}</SelectTrigger>
                            <SelectContent>
                              {STATUS_FLOW.map(s => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {canDo('reservations', 'delete', user?.role ?? '') && (confirmDel === r.id ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <button onClick={() => removeResa(r.id!)} style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 7, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer' }}>OK</button>
                              <button onClick={() => setConfirmDel(null)} style={{ fontSize: 10, fontWeight: 600, padding: '4px 8px', borderRadius: 7, border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted, cursor: 'pointer' }}>Non</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDel(r.id ?? null)} title="Supprimer" style={{ fontSize: 10, fontWeight: 600, padding: '4px 7px', borderRadius: 7, cursor: 'pointer', border: `1px solid #dc262644`, background: 'transparent', color: '#dc2626' }}>{Icon.trash(11, '#dc2626')}</button>
                          ))}
                        </div>
                      </div>
                    </OrganicCard>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {pagedReservations.map(r => (
            <OrganicCard key={r.id} style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: t.heading }}>{r.nom} <span style={{ fontSize: '13px', color: t.muted, fontWeight: 400 }}>· {r.guests} personne{r.guests > 1 ? 's' : ''}</span></div>
                  <div style={{ fontSize: '13px', color: t.muted, marginTop: 4 }}>
                    {r.date} à {r.time} · {r.email}{r.phone ? ` · ${r.phone}` : ''}{r.created_at ? ` · créée ${new Date(r.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
                  </div>
                  {r.message && <div style={{ fontSize: '13px', color: t.text, marginTop: 8, whiteSpace: 'pre-wrap' }}>{r.message}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', background: `${statusColor[r.status]}15`, color: statusColor[r.status] }}>{statusLabel[r.status] ?? r.status}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {statusSending && <span style={{ fontSize: '10px', color: t.muted }}>Envoi notif…</span>}
                    {statusErr && <span style={{ fontSize: '10px', color: t.accent, fontWeight: 600, maxWidth: 220 }} title={statusErr}>✗ {statusErr}</span>}
                    <Select value={r.status} onValueChange={v => updateStatus(r.id!, v)}>
                      <SelectTrigger style={{ width: 140, borderColor: t.shadow, borderRadius: 8, background: t.surfaceAlt, padding: '6px 10px', fontSize: 11 }}>{statusLabel[r.status] ?? r.status}</SelectTrigger>
                      <SelectContent>
                        {STATUS_FLOW.map(s => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {canDo('reservations', 'delete', user?.role ?? '') && (confirmDel === r.id ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => removeResa(r.id!)} style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer' }}>Confirmer</button>
                        <button onClick={() => setConfirmDel(null)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted, cursor: 'pointer' }}>Annuler</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDel(r.id ?? null)} title="Supprimer la réservation" style={{ fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 8, cursor: 'pointer', border: `1px solid #dc262644`, background: 'transparent', color: '#dc2626' }}>{Icon.trash(12, '#dc2626')}</button>
                    ))}
                  </div>
                </div>
              </div>
            </OrganicCard>
          ))}
          </div>
        )}
        {view === 'list' && <Pagination page={page} pageSize={RESA_PAGE} total={sorted.length} onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />}
        </>
      }
    </div>
  )
}

const ENGAGEMENT_ICONS = ['leaf', 'recycle', 'fire', 'search', 'coin', 'star']

function TeamContentsEditor() {
  const { content, setContent, theme: t, dataSource, saveContentToDb } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [tab, setTab] = useState<'team' | 'engagements' | 'testimonials'>('team')
  const inp = inputStyle(t)

  const setTeam = (team: typeof content.team) => { setContent({ ...content, team }); setSaveStatus('idle'); setSaveErr(undefined) }
  const setEngagements = (engagements: typeof content.engagements) => { setContent({ ...content, engagements }); setSaveStatus('idle'); setSaveErr(undefined) }
  const setTestimonials = (testimonials: typeof content.testimonials) => { setContent({ ...content, testimonials }); setSaveStatus('idle'); setSaveErr(undefined) }

  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving'); setSaveErr(undefined)
    const res = await saveContentToDb()
    setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }

  const tabs: [string, string][] = [['team', 'Équipe'], ['engagements', 'Engagements'], ['testimonials', 'Témoignages']]

  return (
    <div style={{ maxWidth: '820px' }}>
      <PageHeader title="Équipe & contenus" subtitle="Gérez les membres de l'équipe, les engagements et les témoignages clients."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 18, flexWrap: 'wrap' }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as 'team' | 'engagements' | 'testimonials')} style={{
            fontSize: '13px', fontWeight: 600, padding: '8px 16px', borderRadius: 100, cursor: 'pointer',
            border: `1px solid ${tab === k ? t.primary : t.shadow}`, background: tab === k ? t.primary : 'transparent',
            color: tab === k ? '#fff' : t.muted, transition: 'all 0.15s',
          }}>{l} <span style={{ opacity: 0.6, marginLeft: 4 }}>{k === 'team' ? content.team.length : k === 'engagements' ? content.engagements.length : content.testimonials.length}</span></button>
        ))}
      </div>

      {tab === 'team' && (
        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          {content.team.map((m, i) => (
            <OrganicCard key={i} style={{ padding: 16, display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><FieldLabel>Nom</FieldLabel><Input value={m.name} onChange={e => setTeam(content.team.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} style={inp} /></div>
                <div><FieldLabel>Rôle</FieldLabel><Input value={m.role} onChange={e => setTeam(content.team.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} style={inp} /></div>
              </div>
              <div><FieldLabel>Description</FieldLabel><Textarea rows={2} value={m.desc} onChange={e => setTeam(content.team.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} style={inp} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <GhostButton color="#dc2626" onClick={() => setTeam(content.team.filter((_, j) => j !== i))}>{Icon.trash(12, '#dc2626')} Retirer</GhostButton>
              </div>
            </OrganicCard>
          ))}
          <button onClick={() => setTeam([...content.team, { name: 'Nouveau membre', role: 'Rôle', desc: '' }])} style={{
            fontSize: 13, fontWeight: 600, padding: 10, borderRadius: 12, cursor: 'pointer',
            border: `1px dashed ${t.primary}55`, background: 'transparent', color: t.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>{Icon.plus(14, t.primary)} Ajouter un membre</button>
        </div>
      )}

      {tab === 'engagements' && (
        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          {content.engagements.map((e, i) => (
            <OrganicCard key={i} style={{ padding: 16, display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 10 }}>
                <div><FieldLabel>Icône</FieldLabel>
                  <Select value={e.icon} onValueChange={v => setEngagements(content.engagements.map((x, j) => j === i ? { ...x, icon: v } : x))}>
                    <SelectTrigger style={{ borderColor: t.primary + '44', borderRadius: 10, background: t.surfaceAlt, padding: '10px 12px' }}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENGAGEMENT_ICONS.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><FieldLabel>Titre</FieldLabel><Input value={e.title} onChange={ev => setEngagements(content.engagements.map((x, j) => j === i ? { ...x, title: ev.target.value } : x))} style={inp} /></div>
              </div>
              <div><FieldLabel>Description</FieldLabel><Textarea rows={2} value={e.desc} onChange={ev => setEngagements(content.engagements.map((x, j) => j === i ? { ...x, desc: ev.target.value } : x))} style={inp} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <GhostButton color="#dc2626" onClick={() => setEngagements(content.engagements.filter((_, j) => j !== i))}>{Icon.trash(12, '#dc2626')} Retirer</GhostButton>
              </div>
            </OrganicCard>
          ))}
          <button onClick={() => setEngagements([...content.engagements, { icon: 'leaf', title: 'Nouvel engagement', desc: '' }])} style={{
            fontSize: 13, fontWeight: 600, padding: 10, borderRadius: 12, cursor: 'pointer',
            border: `1px dashed ${t.primary}55`, background: 'transparent', color: t.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>{Icon.plus(14, t.primary)} Ajouter un engagement</button>
        </div>
      )}

      {tab === 'testimonials' && (
        <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          {content.testimonials.length === 0 && <EmptyState icon={Icon.mail(26, t.muted)} title="Aucun témoignage" subtitle="Ajoutez les avis de vos clients ; ils apparaîtront sur le site (si activés dans Visibilité)." />}
          {content.testimonials.map((tm, i) => (
            <OrganicCard key={i} style={{ padding: 16, display: 'grid', gap: 10 }}>
              <div><FieldLabel>Auteur</FieldLabel><Input value={tm.author} onChange={e => setTestimonials(content.testimonials.map((x, j) => j === i ? { ...x, author: e.target.value } : x))} style={inp} /></div>
              <div><FieldLabel>Témoignage</FieldLabel><Textarea rows={3} value={tm.text} onChange={e => setTestimonials(content.testimonials.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} style={inp} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <GhostButton color="#dc2626" onClick={() => setTestimonials(content.testimonials.filter((_, j) => j !== i))}>{Icon.trash(12, '#dc2626')} Retirer</GhostButton>
              </div>
            </OrganicCard>
          ))}
          <button onClick={() => setTestimonials([...content.testimonials, { author: 'Client', text: '' }])} style={{
            fontSize: 13, fontWeight: 600, padding: 10, borderRadius: 12, cursor: 'pointer',
            border: `1px dashed ${t.primary}55`, background: 'transparent', color: t.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>{Icon.plus(14, t.primary)} Ajouter un témoignage</button>
        </div>
      )}
    </div>
  )
}

function AuditManager() {
  const { theme: t, dataSource } = useSite()
  const { user } = useAuth()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [actorFilter, setActorFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const inp = inputStyle(t)
  useEffect(() => {
    if (dataSource !== 'supabase') { setLoading(false); return }
    let active = true
    const refresh = async () => {
      const res = await fetchAuditLog()
      if (!active || !res.fromDb) return
      setEntries(res.data); setLoading(false)
    }
    refresh()
    const timer = setInterval(refresh, 30000)
    return () => { active = false; clearInterval(timer) }
  }, [dataSource])
  const actions = Array.from(new Set(entries.map(e => e.action))).sort()
  const actors = Array.from(new Set(entries.map(e => e.actor || 'système'))).sort()
  const q = query.trim().toLowerCase()
  const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null
  const toTs = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null
  const filtered = entries.filter(e => {
    if (filter !== 'all' && e.action !== filter) return false
    if (actorFilter !== 'all' && (e.actor || 'système') !== actorFilter) return false
    if (fromTs !== null || toTs !== null) {
      const ts = e.created_at ? new Date(e.created_at).getTime() : NaN
      if (!Number.isFinite(ts)) return false
      if (fromTs !== null && ts < fromTs) return false
      if (toTs !== null && ts > toTs) return false
    }
    if (q && !e.actor.toLowerCase().includes(q) && !e.target.toLowerCase().includes(q) && !e.detail.toLowerCase().includes(q)) return false
    return true
  })
  const hasFilters = filter !== 'all' || actorFilter !== 'all' || dateFrom !== '' || dateTo !== '' || q !== ''
  const resetFilters = () => { setFilter('all'); setActorFilter('all'); setDateFrom(''); setDateTo(''); setQuery('') }
  const actorName = (a: string) => a || 'système'
  const exportCsv = () => {
    const rows = [['Date', 'Acteur', 'Action', 'Cible', 'Détail'].join(';')]
    filtered.forEach(e => {
      rows.push([e.created_at ? new Date(e.created_at).toLocaleString('fr-FR') : '', actorName(e.actor), e.action, (e.target || '').replace(/[\n\r]+/g, ' '), (e.detail || '').replace(/[\n\r]+/g, ' ')].map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    })
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  if (dataSource !== 'supabase') {
    return (
      <div style={{ maxWidth: '640px' }}>
        <PageHeader title="Journal d'activité" />
        <div style={{ marginTop: 16, padding: 20, borderRadius: 14, background: t.surfaceAlt, border: `1px dashed ${t.shadow}`, fontSize: 14, color: t.muted }}>
          Le journal des actions admin apparaît ici. Connectez Supabase pour l'activer.
        </div>
      </div>
    )
  }
  return (
    <div style={{ maxWidth: '900px' }}>
      <PageHeader title="Journal d'activité" subtitle={`${filtered.length} / ${entries.length} action${entries.length > 1 ? 's' : ''}${hasFilters ? ' (filtré)' : ''}`} />
      <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher (acteur, cible, détail)…" style={{ ...inp, paddingLeft: 32, fontSize: 13 }} />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>{Icon.search(14, t.muted)}</span>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger style={{ ...inp, width: 180 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actorFilter} onValueChange={setActorFilter}>
          <SelectTrigger style={{ ...inp, width: 180 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les utilisateurs</SelectItem>
            {actors.map(a => <SelectItem key={a} value={a}>{a === 'système' ? 'système' : a.split('@')[0]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.muted }}>Du <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp, width: 150, fontSize: 13 }} /></label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.muted }}>Au <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inp, width: 150, fontSize: 13 }} /></label>
        {hasFilters && <GhostButton color={t.muted} onClick={resetFilters}>Réinitialiser les filtres</GhostButton>}
        <GhostButton color={t.primary} onClick={exportCsv} disabled={filtered.length === 0} style={{ marginLeft: 'auto' }}>Exporter CSV</GhostButton>
      </div>
      {loading ? <div style={{ marginTop: 20, color: t.muted, fontSize: 14 }}>Chargement…</div> :
        filtered.length === 0 ? <EmptyState icon={Icon.eye(26, t.muted)} title="Aucune entrée" subtitle="Les actions sensibles du panneau seront tracées ici." /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {filtered.map(e => (
            <OrganicCard key={e.id} style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: `${t.primary}14`, color: t.primary }}>{e.action}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: t.heading }}>{e.target || '—'}</span>
                </div>
                <span style={{ fontSize: '11px', color: t.muted }}>{e.created_at ? new Date(e.created_at).toLocaleString('fr-FR') : ''}</span>
              </div>
              {e.detail && <div style={{ fontSize: '12px', color: t.muted, marginTop: 6 }}>{e.detail}</div>}
              <div style={{ fontSize: '11px', color: t.accent, fontWeight: 600, marginTop: 4 }}>par {actorName(e.actor)}{e.actor === (user?.email ?? '') ? ' (vous)' : ''}</div>
            </OrganicCard>
          ))}
        </div>
      }
    </div>
  )
}

function SettingsEditor() {
  const { content, setContent, theme: t, dataSource, saveContentToDb, themeId, setThemeId, fontId, setFontId, visibility, setVisibility, rbacOverrides, setRbacOverridesState, saveRbac } = useSite()
  const { user } = useAuth()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [importStatus, setImportStatus] = useState<'idle' | 'busy' | 'ok' | 'error'>('idle')
  const [importErr, setImportErr] = useState<string | undefined>(undefined)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const set = (k: string, v: string) => { setContent({ ...content, [k]: v }); setSaveStatus('idle'); setSaveErr(undefined) }
  const inp = inputStyle(t)
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving'); setSaveErr(undefined)
    const res = await saveContentToDb()
    setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }
  const buildConfig = () => ({ content, themeId, fontId, visibility, rbacOverrides: rbacOverrides ?? undefined })
  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(buildConfig(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `greatlife-config-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const handleImport = async (file: File | undefined) => {
    if (!file) return
    setImportStatus('busy'); setImportErr(undefined)
    try {
      const text = await file.text()
      const cfg = JSON.parse(text) as { content?: typeof content; themeId?: string; fontId?: string; visibility?: typeof visibility; rbacOverrides?: typeof rbacOverrides }
      if (cfg.content) setContent(cfg.content)
      if (cfg.themeId) setThemeId(cfg.themeId)
      if (cfg.fontId) setFontId(cfg.fontId)
      if (cfg.visibility) setVisibility(cfg.visibility)
      if (cfg.rbacOverrides !== undefined) setRbacOverridesState(cfg.rbacOverrides ?? null)
      if (dataSource === 'supabase') {
        const res = await saveSiteConfig(buildConfig())
        if (res.ok && cfg.rbacOverrides !== undefined) await saveRbac(cfg.rbacOverrides ?? null)
        if (!res.ok) { setImportStatus('error'); setImportErr(res.error || 'Échec de l\'enregistrement'); setTimeout(() => setImportStatus('idle'), 4000); return }
        await logAudit({ actor: user?.email ?? '', action: 'import_config', target: 'site_config', detail: `Importé depuis ${file.name}` })
      }
      setImportStatus('ok'); setTimeout(() => setImportStatus('idle'), 3000)
    } catch {
      setImportStatus('error'); setImportErr('Fichier JSON invalide'); setTimeout(() => setImportStatus('idle'), 4000)
    }
    if (fileRef.current) fileRef.current.value = ''
  }
  return (
    <div style={{ maxWidth: '760px' }}>
      <PageHeader title="Réglages globaux" subtitle="Identité et coordonnées du restaurant, appliquées sur tout le site."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <div style={{ display: 'grid', gap: '22px', marginTop: '24px' }}>
        <div>
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.primary}>Identité</SectionTitle></div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><FieldLabel>Nom du restaurant</FieldLabel><Input value={content.restaurantName} onChange={e => set('restaurantName', e.target.value)} style={inp} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><FieldLabel>Devise</FieldLabel><Input value={content.currency} onChange={e => set('currency', e.target.value)} style={inp} placeholder="FG" /></div>
              <div><FieldLabel>Téléphone</FieldLabel><Input value={content.phone} onChange={e => set('phone', e.target.value)} style={inp} /></div>
            </div>
          </div>
        </div>
        <div>
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.accent}>Localisation & horaires</SectionTitle></div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><FieldLabel>Adresse</FieldLabel><Input value={content.address} onChange={e => set('address', e.target.value)} style={inp} /></div>
            <div><FieldLabel>Horaires d'ouverture</FieldLabel><Input value={content.hours} onChange={e => set('hours', e.target.value)} style={inp} /></div>
          </div>
        </div>
        <div>
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.gold}>Réseaux sociaux</SectionTitle></div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><FieldLabel>Facebook (URL)</FieldLabel><Input value={content.socialFacebook} onChange={e => set('socialFacebook', e.target.value)} style={inp} placeholder="https://facebook.com/..." /></div>
            <div><FieldLabel>Instagram (URL)</FieldLabel><Input value={content.socialInstagram} onChange={e => set('socialInstagram', e.target.value)} style={inp} placeholder="https://instagram.com/..." /></div>
            <div><FieldLabel>WhatsApp (numéro ou lien)</FieldLabel><Input value={content.socialWhatsapp} onChange={e => set('socialWhatsapp', e.target.value)} style={inp} placeholder="+224 ..." /></div>
          </div>
        </div>
        <div>
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.primary}>Sauvegarde & transfert</SectionTitle></div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <GhostButton color={t.primary} onClick={exportConfig}>{Icon.arrow(13, t.primary)} Exporter la configuration</GhostButton>
            <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={e => handleImport(e.target.files?.[0])} />
            <GhostButton color={t.accent} onClick={() => fileRef.current?.click()} disabled={importStatus === 'busy'}>{importStatus === 'busy' ? 'Import…' : 'Importer une configuration'}</GhostButton>
            {importStatus === 'ok' && <span style={{ fontSize: '12px', color: t.primary, fontWeight: 600 }}>✓ Importé</span>}
            {importStatus === 'error' && <span style={{ fontSize: '12px', color: t.accent, fontWeight: 600 }} title={importErr}>✗ {importErr}</span>}
          </div>
          <div style={{ fontSize: '12px', color: t.muted, marginTop: 10 }}>L'export contient le contenu, le thème, les polices et la visibilité. L'import remplace la configuration courante et l'enregistre dans Supabase.</div>
        </div>
      </div>
    </div>
  )
}

const AccessBanner = () => {
  const { theme: t } = useSite()
  const { user } = useAuth()
  const role = user?.role ?? 'guest'
  return (
    <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 12, background: `${t.gold || '#b8860b'}14`, border: `1px solid ${t.primary}22`, fontSize: 13, color: t.heading, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flexShrink: 0 }}>{Icon.eye(16, t.gold || '#b8860b')}</span>
      <span>Accès en lecture seule — votre rôle « {ROLE_LABELS[role] ?? role} » ne permet pas de modifier ce module.</span>
    </div>
  )
}

export function Admin() {
  const [active, setActive] = useState('dashboard')
  const { user } = useAuth()
  const role = user?.role ?? 'guest'
  const effective = canAccessModule(active, role) ? active : 'dashboard'
  const readOnly = !canWriteModule(effective, role)
  return (
    <AdminShell active={effective} setActive={setActive}>
      <AnimatePresence mode="wait">
        <motion.div key={effective} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
          {readOnly && effective !== 'dashboard' && <AccessBanner />}
          <div style={{ position: 'relative', pointerEvents: readOnly && effective !== 'dashboard' ? 'none' : 'auto' }}>
            {effective === 'dashboard' && <Dashboard />}
          {effective === 'messages' && <MessagesManager />}
          {effective === 'orders' && <OrdersManager />}
          {effective === 'reservations' && <ReservationsManager />}
          {effective === 'content' && <PageEditorWrapper />}
          {effective === 'team' && <TeamContentsEditor />}
          {effective === 'menu' && <MenuEditor />}
          {effective === 'theme' && <ThemeEditor />}
          {effective === 'blog' && <BlogEditor />}
          {effective === 'media' && <MediaManager />}
          {effective === 'visibility' && <VisibilityEditor />}
          {effective === 'users' && <UsersRoles />}
          {effective === 'forms' && <FormsConfig />}
          {effective === 'settings' && <SettingsEditor />}
          {effective === 'audit' && <AuditManager />}
          </div>
        </motion.div>
      </AnimatePresence>
    </AdminShell>
  )
}
