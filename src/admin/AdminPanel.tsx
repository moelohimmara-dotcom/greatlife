import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSite, type MediaSlot } from '@/contexts/SiteContext'
import { PageHeader, EmptyState, FieldLabel, inputStyle, GhostButton, PrimaryButton, Pagination, formePastille, ESPACE, HAUTEUR_ETAT, StatusPill } from '@/admin/ui'
import { lireNavPref, ecrireNavPref, type AdminNavPref } from '@/admin/admin-nav'
import '@/admin/console.css'
import { useAuth } from '@/contexts/AuthContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Icon } from '@/lib/icons'
import { ROLES, canAccessModule, canWriteModule, canDo, ROLE_LABELS, ROLE_DESCRIPTIONS, ALL_MODULES, permLevelFor, MODULE_ACCESS, CRUD_ACTIONS, computeEffectiveAccess, roleSummary, type RbacOverrides, type CrudAction } from '@/data/rbac'
import { THEMES } from '@/config/themes'
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
import { Bouton } from '@/admin/editor/chrome'
import { TypoPanel } from '@/admin/editor/TypoPanel'
import { SETTING_KEYS, fetchSetting, platDepuisRestaurant } from '@/cms/repository/settings'

const ADMIN_URL = 'https://greatlife-conakry.netlify.app/admin'

/*
  Une date affichable, en français, sans afficher d'ISO brut.
  `Invalid Date` ou vide -> on rend ce qui est reçu (les dates de test
  historiques n'étaient pas toutes des ISO).
*/
function dateFr(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const NAV_GROUPS: [string, [string, string, string][]][] = [
  ['Opérations', [
    ['dashboard', 'Vue d’ensemble', 'grid'],
    ['orders', 'Commandes', 'coin'],
    ['reservations', 'Réservations', 'calendar'],
    ['messages', 'Messages', 'mail'],
  ]],
  ['Contenu', [
    ['content', 'Éditeur du site', 'write'],
    ['menu', 'Carte & prix', 'leaf'],
    ['blog', 'Blog', 'write'],
    ['media', 'Médiathèque', 'image'],
    ['team', 'Équipe & engagements', 'users'],
  ]],
  ['Configuration', [
    ['theme', 'Apparence', 'palette'],
    ['visibility', 'Visibilité', 'eye'],
    ['settings', 'Réglages du restaurant', 'settings'],
    ['forms', 'Formulaires & notifications', 'settings'],
    ['users', 'Utilisateurs & rôles', 'users'],
    ['audit', "Journal d'activité", 'eye'],
  ]],
]

const MOBILE_TAB_KEYS = ['dashboard', 'orders', 'reservations', 'messages', 'content'] as const

function menuEstMobile() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
}

function IconeMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function AdminShell({ active, setActive, children }: { active: string; setActive: (s: string) => void; children: React.ReactNode }) {
  const { theme: t, rootStyle, unhandledMessagesCount, pendingOrdersCount, pendingReservationsCount } = useSite()
  const { user, logout, roleNotice, dismissRoleNotice } = useAuth()
  const navigate = useNavigate()
  const [mobileNav, setMobileNav] = useState(false)
  const [navPref, setNavPref] = useState<AdminNavPref>(lireNavPref)
  const [editorRail, setEditorRail] = useState(() => lireNavPref() === 'rail')
  const menuToggleRef = useRef<HTMLButtonElement>(null)
  const drawerPanelRef = useRef<HTMLDivElement>(null)
  const focusAvantTiroir = useRef<HTMLElement | null>(null)
  const editorFocus = active === 'content'
  const editorHidesNav = editorFocus && !editorRail
  const rail = editorFocus || navPref === 'rail'
  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }
  const go = (k: string) => { setActive(k); setMobileNav(false) }
  const NOTIF: Record<string, number> = { messages: unhandledMessagesCount, orders: pendingOrdersCount, reservations: pendingReservationsCount }

  useEffect(() => {
    const html = document.documentElement
    if (!editorFocus) {
      html.classList.remove('admin-editor-lock')
      return
    }
    html.classList.add('admin-editor-lock')
    return () => { html.classList.remove('admin-editor-lock') }
  }, [editorFocus])

  useEffect(() => {
    if (editorFocus) setEditorRail(navPref === 'rail')
  }, [editorFocus, navPref])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = () => { if (!mq.matches) setMobileNav(false) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  /*
    Tiroir mobile (D2) : focus initial dans le panneau, piège Tab, Esc ferme
    et restitue le focus au hamburger. Backdrop hors tab order.
  */
  useEffect(() => {
    if (!mobileNav) return
    focusAvantTiroir.current = (document.activeElement as HTMLElement) || menuToggleRef.current
    const panel = drawerPanelRef.current
    const selecteurs = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusables = () =>
      panel ? Array.from(panel.querySelectorAll<HTMLElement>(selecteurs)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
      ) : []
    const premier = focusables()[0]
    premier?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMobileNav(false)
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const list = focusables()
      if (list.length === 0) return
      const first = list[0]
      const last = list[list.length - 1]
      const actif = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (actif === first || !panel.contains(actif)) {
          e.preventDefault()
          last.focus()
        }
      } else if (actif === last || !panel.contains(actif)) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      const cible = focusAvantTiroir.current || menuToggleRef.current
      window.setTimeout(() => cible?.focus(), 0)
    }
  }, [mobileNav])

  const toggleNav = useCallback(() => {
    if (menuEstMobile()) {
      setMobileNav((open) => !open)
      return
    }
    if (editorFocus) {
      setEditorRail((open) => {
        const next = !open
        if (next) {
          setNavPref('rail')
          ecrireNavPref('rail')
        }
        return next
      })
      return
    }
    setNavPref((prev) => {
      const next: AdminNavPref = prev === 'open' ? 'rail' : 'open'
      ecrireNavPref(next)
      return next
    })
  }, [editorFocus])

  const toggleLabel = (() => {
    if (menuEstMobile()) return mobileNav ? 'Fermer le menu' : 'Ouvrir le menu'
    if (editorHidesNav) return 'Ouvrir le menu'
    if (rail) return 'Déplier le menu'
    return 'Replier le menu'
  })()
  const toggleExpanded = menuEstMobile() ? mobileNav : !editorHidesNav && !rail
  const toggleIcon = (() => {
    if (menuEstMobile()) return mobileNav ? Icon.x(20, t.heading) : <IconeMenu />
    if (editorHidesNav) return <IconeMenu />
    return rail ? Icon.chevronRight(20, t.heading) : Icon.chevronLeft(20, t.heading)
  })()

  const boutonMenu = (place: 'sidebar' | 'main') => (
    <Bouton
      ref={place === 'main' ? menuToggleRef : undefined}
      carre
      genre="secondaire"
      aria-label={toggleLabel}
      title={toggleLabel}
      aria-expanded={toggleExpanded}
      aria-controls={menuEstMobile() ? 'admin-console-nav-tiroir' : 'admin-console-nav'}
      className={place === 'main' ? 'admin-nav-toggle-main admin-mobile-menu' : 'admin-nav-toggle-side'}
      onClick={toggleNav}
      style={place === 'main' ? { display: 'none', position: 'absolute', top: 12, left: 12, zIndex: 20 } : undefined}
    >
      {toggleIcon}
    </Bouton>
  )

  /* `minHeight: 0` : sans lui le nav ne défile pas et allonge la coquille. */
  const renderNav = (compact: boolean, navId: string) => (
    <aside id={navId} className={compact ? 'admin-nav-rail admin-rail' : 'admin-rail'} style={{
        background: 'var(--admin-ink)', borderRight: '1px solid var(--admin-rail-line)',
        padding: compact ? '16px 8px' : '22px 14px',
        display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        className="admin-nav-brand"
        style={{
          display: 'flex',
          flexDirection: compact ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: compact ? 'center' : 'space-between',
          gap: ESPACE,
          minHeight: 40,
        }}
      >
        {compact ? (
          <Link
            to="/"
            title="Voir le site"
            aria-label="Greatlife, voir le site"
            style={{
              fontFamily: 'var(--admin-font-display)',
              fontWeight: 700,
              fontSize: '20px',
              color: 'var(--admin-on-ink)',
              textDecoration: 'none',
              letterSpacing: '-0.02em',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 12,
              flexShrink: 0,
            }}
          >
            G<span aria-hidden="true" style={{ color: 'var(--admin-lime)', fontSize: 11, marginLeft: 1 }}>.</span>
          </Link>
        ) : (
          <Link
            to="/"
            title="Voir le site"
            aria-label="Greatlife, voir le site"
            style={{
              fontFamily: 'var(--admin-font-display)',
              fontWeight: 700,
              fontSize: '20px',
              color: 'var(--admin-on-ink)',
              textDecoration: 'none',
              letterSpacing: '-0.02em',
              display: 'inline-flex',
              alignItems: 'baseline',
              minWidth: 0,
            }}
          >
            GREATLIFE
          </Link>
        )}
        {boutonMenu('sidebar')}
      </div>
      <nav aria-label="Navigation de la console" style={{ marginTop: compact ? 16 : 24, display: 'flex', flexDirection: 'column', gap: compact ? 12 : 18, flex: 1, overflow: 'auto', minHeight: 0 }}>
        {NAV_GROUPS.map(([groupLabel, items]) => (
          <div key={groupLabel}>
            <div
              className="admin-nav-group"
              style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-on-ink-soft)', marginBottom: 8, paddingLeft: 4 }}
            >{groupLabel}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: ESPACE, alignItems: compact ? 'center' : undefined }}>
              {items.filter(([k]) => canAccessModule(k, user?.role ?? '')).map(([k, l, icon]) => {
                const isActive = active === k
                return (
                  <Bouton
                    key={k}
                    etendu={!compact}
                    carre={compact}
                    genre={isActive ? 'primaire' : 'nav'}
                    className={`admin-nav-item${isActive ? ' is-active' : ''}`}
                    onClick={() => go(k)}
                    title={l}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={NOTIF[k] > 0 ? `${l}, ${NOTIF[k]} en attente` : l}
                    style={{
                      position: 'relative',
                      justifyContent: compact ? 'center' : undefined,
                      background: isActive ? 'var(--admin-forest)' : 'transparent',
                      borderColor: isActive ? 'var(--admin-forest)' : 'transparent',
                      color: isActive ? 'var(--admin-on-ink)' : 'var(--admin-on-ink-muted)',
                    }}
                  >
                    <span aria-hidden="true" style={{ display: 'inline-flex', opacity: isActive ? 1 : 0.85 }}>
                      {Icon[icon](16, isActive ? 'var(--admin-on-ink)' : 'var(--admin-on-ink-muted)')}
                    </span>
                    {!compact && <span style={{ flex: 1, textAlign: 'left' }}>{l}</span>}
                    {NOTIF[k] > 0 && (
                      <span
                        aria-hidden="true"
                        className="admin-nav-badge"
                        style={{
                          ...formePastille(),
                          ...(compact
                            ? { position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, padding: '0 4px', fontSize: 10 }
                            : { minWidth: HAUTEUR_ETAT, padding: '0 6px' }),
                          background: 'var(--admin-coral)',
                          color: 'var(--admin-on-ink)',
                        }}
                      >{compact && NOTIF[k] > 9 ? '9+' : NOTIF[k]}</span>
                    )}
                  </Bouton>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="admin-nav-foot" style={{ borderTop: '1px solid var(--admin-rail-line)', paddingTop: '14px', display: 'flex', flexDirection: 'column', alignItems: compact ? 'center' : undefined }}>
        {!compact && (
          <>
            <div style={{ fontSize: '11px', marginBottom: 2, opacity: 0.7 }}>Compte</div>
            <strong style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-on-ink)' }}>{user?.name}</strong>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-lime)', marginBottom: '12px' }}>{ROLE_LABELS[user?.role ?? 'guest'] ?? user?.role}</div>
          </>
        )}
        <div style={{ display: 'flex', flexDirection: compact ? 'column' : 'row', gap: ESPACE, width: compact ? undefined : '100%' }}>
          <Bouton
            etendu={!compact}
            carre={compact}
            genre="secondaire"
            onClick={() => { window.open('/', '_blank', 'noopener,noreferrer') }}
            title="Voir le site"
            aria-label="Voir le site"
            style={{
              justifyContent: compact ? 'center' : undefined,
              background: 'transparent',
              borderColor: 'var(--admin-rail-border-soft)',
              color: 'var(--admin-on-ink)',
              flex: compact ? undefined : 1,
            }}
          >
            {!compact && 'Voir le site'}
            {compact && <span aria-hidden="true">{Icon.eye(16, 'var(--admin-on-ink)')}</span>}
          </Bouton>
          <Bouton
            etendu={!compact}
            carre={compact}
            genre="danger"
            onClick={handleLogout}
            title="Déconnexion"
            aria-label="Déconnexion"
            style={{
              justifyContent: compact ? 'center' : undefined,
              background: 'transparent',
              borderColor: 'var(--admin-coral)',
              color: 'var(--admin-coral)',
              flex: compact ? undefined : 1,
            }}
          >
            <span aria-hidden="true">{Icon.logout(16, 'var(--admin-coral)')}</span>
            {!compact && ' Déconnexion'}
          </Bouton>
        </div>
      </div>
    </aside>
  )

  const layoutNav = editorHidesNav ? 'hidden' : rail ? 'rail' : 'open'
  const mobileTabs = MOBILE_TAB_KEYS
    .map((k) => {
      const found = NAV_GROUPS.flatMap(([, items]) => items).find(([key]) => key === k)
      return found && canAccessModule(k, user?.role ?? '') ? found : null
    })
    .filter((x): x is [string, string, string] => Boolean(x))

  return (
    /*
      `...rootStyle` en premier : polices Fraunces/DM Sans sur la console.
      Coquille bornée à 100dvh — seul `main` défile ; la nav défile dans son aside.
      Modes : ouvert (248px) · rail d’icônes (64px) · masqué en édition (hamburger).
    */
    <div
      data-admin-shell=""
      data-admin-drawer={mobileNav ? 'open' : 'closed'}
      style={{ ...rootStyle, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)', height: '100dvh', overflow: 'hidden', background: 'var(--admin-paper)', fontFamily: 'var(--admin-font-ui)' }}
    >
      <a href="#contenu-console" className="admin-skip-link">Aller au contenu</a>
      <div
        data-admin-nav={layoutNav}
        className={editorFocus ? 'admin-layout admin-layout-editor' : 'admin-layout'}
        style={{ height: '100%', minHeight: 0, overflow: 'hidden', gridTemplateRows: 'minmax(0, 1fr)' }}
      >
        {!editorHidesNav && (
          <div className="admin-sidebar-desktop" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
            {renderNav(rail, 'admin-console-nav')}
          </div>
        )}
        <main
          id="contenu-console"
          className={active === 'content' ? 'admin-main-pad admin-main-editor' : 'admin-main-pad'}
          style={{
          overflow: active === 'content' ? 'hidden' : 'auto',
          position: 'relative',
          minHeight: 0,
          height: active === 'content' ? '100%' : undefined,
          display: active === 'content' ? 'flex' : undefined,
          flexDirection: 'column',
        }}
        >
          {boutonMenu('main')}
          {active !== 'content' && (
            <div className="admin-topbar" role="region" aria-label="Actions de la console">
              <StatusPill
                label={unhandledMessagesCount + pendingOrdersCount + pendingReservationsCount > 0 ? 'Service en cours' : 'À jour'}
                color={unhandledMessagesCount + pendingOrdersCount + pendingReservationsCount > 0 ? 'var(--admin-saffron)' : 'var(--admin-forest)'}
                title="État du service aujourd’hui"
              />
              <Bouton
                genre="secondaire"
                onClick={() => window.open('/', '_blank', 'noopener,noreferrer')}
                aria-label="Voir le site public"
                style={{ borderColor: 'var(--admin-line)', background: 'var(--admin-surface)' }}
              >
                Voir le site
              </Bouton>
            </div>
          )}
          {roleNotice && (
            <div key={roleNotice.id} role="status" aria-live="polite" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 60, maxWidth: 'min(92vw, 560px)', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--admin-line)', background: 'var(--admin-surface)', boxShadow: 'var(--admin-shadow)', fontSize: '13px', fontWeight: 500, color: 'var(--admin-ink)' }}>
              <span style={{ display: 'inline-flex', color: 'var(--admin-forest)' }}>{Icon.check(18, 'var(--admin-forest)')}</span>
              <span style={{ flex: 1 }}>{roleNotice.msg}</span>
              <Bouton carre genre="silencieux" aria-label="Fermer" onClick={dismissRoleNotice}>×</Bouton>
            </div>
          )}
          {children}
        </main>
      </div>
      {mobileNav && (
        <div role="dialog" aria-modal="true" aria-label="Menu de la console" className="admin-nav-drawer">
          <button
            type="button"
            className="admin-nav-drawer-backdrop"
            aria-label="Fermer le menu"
            onClick={() => setMobileNav(false)}
          />
          <div ref={drawerPanelRef} className="admin-nav-drawer-panel">
            {renderNav(false, 'admin-console-nav-tiroir')}
          </div>
        </div>
      )}
      {!editorFocus && mobileTabs.length > 0 && (
        <nav className="admin-bottom-nav" aria-label="Raccourcis mobiles">
          {mobileTabs.map(([k, l, icon]) => {
            const isActive = active === k
            const count = NOTIF[k] ?? 0
            return (
              <button
                key={k}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                aria-label={count > 0 ? `${l}, ${count} en attente` : l}
                onClick={() => go(k)}
              >
                <span aria-hidden="true">{Icon[icon](18, isActive ? 'var(--admin-on-ink)' : 'var(--admin-on-ink-muted)')}</span>
                <span>{l.split(' ')[0]}</span>
                {count > 0 && <span className="admin-bottom-dot" aria-hidden="true" />}
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}


function Dashboard() {
  const { menu, messages, theme: t, dataSource, dataLoading, adminUsers, ordersCount, reservationsCount, content, unhandledMessagesCount, pendingOrdersCount, pendingReservationsCount } = useSite()
  const dsLabel = dataLoading
    ? 'Mise à jour…'
    : dataSource === 'supabase'
      ? 'En ligne'
      : 'Aperçu local'
  const dsDetail = dataLoading
    ? 'Les chiffres se mettent à jour.'
    : dataSource === 'supabase'
      ? 'Connecté à votre espace en ligne.'
      : 'Données locales d’aperçu — pas encore synchronisées.'
  const { user } = useAuth()
  const navigate = useNavigate()
  const ouvrir = (module: string) => navigate(`/admin?module=${module}`)
  const [period, setPeriod] = useState<'all' | '7' | '30'>('all')
  const [orders, setOrders] = useState<Order[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  useEffect(() => {
    if (dataSource !== 'supabase') return
    let active = true
    fetchOrders().then(res => { if (active && res.fromDb) setOrders(res.data) })
    fetchReservations().then(res => { if (active && res.fromDb) setReservations(res.data) })
    fetchAuditLog().then(res => { if (active && res.fromDb) setAuditEntries(res.data) })
    return () => { active = false }
  }, [dataSource])
  const now = Date.now()
  const periodMs = period === '7' ? 7 * 86400000 : period === '30' ? 30 * 86400000 : 0
  const filteredOrders = period === 'all' ? orders : orders.filter(o => o.created_at && (now - new Date(o.created_at).getTime()) <= periodMs)
  const confirmedOrders = filteredOrders.filter(o => o.status === 'confirmed')
  const parsePrice = (s: string) => { const n = parseInt(String(s).replace(/[^0-9]/g, ''), 10); return Number.isFinite(n) ? n : 0 }
  const revenue = confirmedOrders.reduce((sum, o) => sum + parsePrice(o.total), 0)
  const fmt = (n: number) => n.toLocaleString('fr-FR')
  const periodLabel = period === 'all' ? 'tout l\'historique' : `${period} derniers jours`
  const periodOpts: [string, string][] = [['all', 'Tout'], ['30', '30 jours'], ['7', '7 jours']]
  const afficher = (n: number) => (dataLoading ? '—' : n)

  type Ticket = {
    id: string
    lane: 'now' | 'next' | 'watch'
    module: string
    kind: string
    title: string
    meta: string
    cta: string
    urgent?: boolean
  }

  const pendingOrders = orders.filter(o => o.status === 'pending').slice(0, 6)
  const pendingResas = reservations.filter(r => r.status === 'pending').slice(0, 6)
  const openMessages = messages.filter(m => !m.handled).slice(0, 6)

  const tickets: Ticket[] = [
    ...pendingOrders.map((o): Ticket => ({
      id: `order-${o.id}`,
      lane: 'now',
      module: 'orders',
      kind: 'Commande',
      title: o.nom || o.ref,
      meta: `${o.ref} · ${dateFr(o.created_at)} · ${o.total}`,
      cta: 'Ouvrir',
      urgent: true,
    })),
    ...pendingResas.map((r): Ticket => ({
      id: `resa-${r.id}`,
      lane: 'next',
      module: 'reservations',
      kind: 'Réservation',
      title: r.nom || 'Client',
      meta: `${r.date || ''} ${r.time || ''} · ${r.guests ?? '?'} pers.`,
      cta: 'Confirmer',
      urgent: true,
    })),
    ...openMessages.map((m): Ticket => ({
      id: `msg-${m.id ?? m.email}-${m.date}`,
      lane: 'watch',
      module: 'messages',
      kind: 'Message',
      title: m.nom,
      meta: m.sujet || dateFr(m.date),
      cta: 'Répondre',
    })),
  ]

  const lanes: { key: Ticket['lane']; label: string; hint: string }[] = [
    { key: 'now', label: 'Maintenant', hint: 'à traiter tout de suite' },
    { key: 'next', label: 'Ensuite', hint: 'à confirmer' },
    { key: 'watch', label: 'À surveiller', hint: 'messages ouverts' },
  ]

  const activity = auditEntries.slice(0, 6)

  return (
    <div className="admin-page" aria-busy={dataLoading || undefined}>
      <div className="admin-live-status" role="status" aria-live="polite">
        {dataLoading ? 'Mise à jour des chiffres…' : `${pendingOrdersCount} commandes, ${pendingReservationsCount} réservations, ${unhandledMessagesCount} messages en attente.`}
      </div>

      <PageHeader
        title={`Bonjour, ${user?.name || 'vous'}`}
        subtitle="Votre service aujourd’hui — ce qui attend une réponse."
        badge={<span className={`admin-chip ${dataSource === 'supabase' ? 'is-live' : ''}`}>{dsLabel}</span>}
        actions={
          <Bouton genre="primaire" onClick={() => window.open('/', '_blank', 'noopener,noreferrer')}>
            Voir le site
          </Bouton>
        }
      />
      <p className="cms-sr-only">{dsDetail}</p>

      <div className="admin-work-lanes" aria-label="File de travail">
        {lanes.map((lane) => {
          const items = tickets.filter(t => t.lane === lane.key)
          return (
            <section key={lane.key} className="admin-work-lane" aria-labelledby={`lane-${lane.key}`}>
              <h3 id={`lane-${lane.key}`}>
                {lane.label}
                <span>{dataLoading ? '…' : `${items.length} · ${lane.hint}`}</span>
              </h3>
              {dataLoading ? (
                <div className="admin-empty" style={{ padding: 20 }}>Chargement…</div>
              ) : items.length === 0 ? (
                <div className="admin-empty" style={{ padding: 20, fontSize: 13 }}>
                  Rien dans cette file pour l’instant.
                </div>
              ) : (
                items.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    className={`admin-ticket${ticket.urgent ? ' is-urgent' : ''}`}
                    onClick={() => ouvrir(ticket.module)}
                  >
                    <div className="admin-ticket-meta">
                      <span>{ticket.kind}</span>
                      <span className="admin-mono">{ticket.meta}</span>
                    </div>
                    <div className="admin-ticket-title">{ticket.title}</div>
                    <div className="admin-ticket-cta">{ticket.cta}</div>
                  </button>
                ))
              )}
            </section>
          )
        })}
      </div>

      <div className="admin-split">
        <div className="admin-stat-editorial">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-ink)', opacity: 0.6 }}>Performance commerciale</div>
              <div className="admin-stat-figure" style={{ marginTop: 12 }}>
                {fmt(revenue)} <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.55 }}>{content.currency}</span>
              </div>
              <div style={{ fontSize: 13, marginTop: 8, opacity: 0.65 }}>
                {revenue === 0
                  ? 'Aucune commande confirmée sur la période — ouvrir les commandes en attente.'
                  : `${confirmedOrders.length} commande${confirmedOrders.length > 1 ? 's' : ''} confirmée${confirmedOrders.length > 1 ? 's' : ''} · ${periodLabel}`}
              </div>
              {revenue === 0 && (
                <div style={{ marginTop: 12 }}>
                  <Bouton genre="primaire" onClick={() => ouvrir('orders')}>Ouvrir les commandes</Bouton>
                </div>
              )}
            </div>
            <div role="group" aria-label="Période du chiffre d'affaires" style={{ display: 'flex', gap: ESPACE, flexWrap: 'wrap' }}>
              {periodOpts.map(([k, l]) => (
                <Bouton
                  key={k}
                  genre={period === k ? 'primaire' : 'secondaire'}
                  aria-pressed={period === k}
                  onClick={() => setPeriod(k as 'all' | '7' | '30')}
                >{l}</Bouton>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-stat-editorial">
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.6, marginBottom: 12 }}>Ressources du site</div>
          {([
            ['Produits dans la carte', menu.length],
            ['Commandes au total', ordersCount],
            ['Réservations au total', reservationsCount],
            ['Comptes de la console', adminUsers.length],
          ] as [string, number][]).map(([lab, val]) => (
            <div key={lab} className="admin-activity-row" style={{ padding: '8px 0' }}>
              <span style={{ fontSize: 13 }}>{lab}</span>
              <strong style={{ fontFamily: 'var(--admin-font-display)', fontSize: 18 }}>{afficher(val)}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-split-equal">
        <section className="admin-stat-editorial" aria-labelledby="activite-recente">
          <h3 id="activite-recente" style={{ fontFamily: 'var(--admin-font-display)', fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>
            Activité récente
          </h3>
          {activity.length === 0 ? (
            <div className="admin-empty" style={{ padding: 20, fontSize: 13 }}>Pas encore d’activité tracée.</div>
          ) : (
            activity.map((e) => (
              <div key={e.id ?? `${e.action}-${e.created_at}`} className="admin-activity-row">
                <div>
                  <div style={{ fontWeight: 600 }}>{e.action}</div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>{e.target || e.detail || e.actor}</div>
                </div>
                <span className="admin-mono">{dateFr(e.created_at)}</span>
              </div>
            ))
          )}
        </section>

        <section className="admin-stat-editorial" aria-labelledby="messages-recents">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 id="messages-recents" style={{ fontFamily: 'var(--admin-font-display)', fontSize: 18, fontWeight: 700, margin: 0 }}>
              Messages
            </h3>
            <Bouton genre="silencieux" onClick={() => ouvrir('messages')}>Tout voir</Bouton>
          </div>
          {messages.length === 0 ? (
            <EmptyState icon={Icon.mail(28, t.muted)} title="Aucun message" subtitle="Les demandes des clients apparaîtront ici." />
          ) : (
            messages.slice(0, 4).map((m, i) => (
              <button
                key={m.id ?? i}
                type="button"
                className={`admin-ticket${!m.handled ? ' is-urgent' : ''}`}
                onClick={() => ouvrir('messages')}
                style={{ marginBottom: 8 }}
              >
                <div className="admin-ticket-meta">
                  <span>{m.handled ? 'Traité' : 'Non traité'}</span>
                  <span>{dateFr(m.date)}</span>
                </div>
                <div className="admin-ticket-title">{m.nom}</div>
                <div style={{ fontSize: 13, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.sujet}</div>
              </button>
            ))
          )}
        </section>
      </div>
    </div>
  )
}



function SaveBar({ status, error }: { status: 'idle' | 'saving' | 'saved' | 'error'; error?: string }) {
  const label = status === 'saving' ? 'Enregistrement…' : status === 'saved' ? 'Enregistré' : status === 'error' ? 'Échec de l\'enregistrement' : ''
  if (!label && status === 'idle') return null
  const tone = status === 'error' ? 'is-error' : status === 'saved' ? 'is-ok' : 'is-busy'
  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      title={error}
      className={`admin-save-live ${tone}`}
    >
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
      <div className="admin-page">
        <PageHeader title="Carte & prix" subtitle="Aucun produit à afficher." />
        <div style={{ marginTop: 20 }}><EmptyState title="Aucun produit" subtitle="Ajoutez votre premier produit pour commencer." /></div>
      </div>
    )
  }
  return (
    <div className="admin-page-wide admin-menu-layout">
      <div>
        <PageHeader title="Carte & prix" subtitle={dirty ? 'Modifications non enregistrées' : 'Sélectionnez un produit.'} />
        <div style={{ marginTop: 14, position: 'relative' }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher un produit" style={{ ...inp, paddingLeft: 36, minHeight: 44 }} />
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} aria-hidden="true">{Icon.search(15, t.muted)}</span>
        </div>
        <div className="admin-menu-list" style={{ marginTop: 14 }}>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="admin-menu-cat">{cat}</div>
              {items.map(m => {
                const index = menu.indexOf(m)
                const active = index === selIndex
                return (
                  <button key={m.id ?? `${m.cat}:${m.name}`} type="button" className={`admin-menu-item${active ? ' is-selected' : ''}`} onClick={() => selectItem(index)}>
                    {m.sig ? <span className="admin-menu-sig" aria-label="Produit signature">★</span> : null}
                    <span>{m.name}</span>
                    <span className="admin-menu-price">{m.price}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <button type="button" onClick={async () => {
          const cat = newCat.trim() || (categories[0] ?? 'Burgers')
          const newItem: MenuItem = { cat, name: `Nouveau produit ${menu.length + 1}`, sig: false, price: '0', desc: '', vertus: '', badges: [] }
          const index = menu.length
          setMenu(prev => [...prev, newItem])
          setSel(index)
          setConfirmDel(false)
          setSaveStatus('idle')
          if (dataSource !== 'supabase') return
          const res = await upsertMenuItem(newItem)
          if (res.ok && res.id) {
            setMenu(prev => prev.map((m, i) => (i === index ? { ...m, id: res.id } : m)))
          } else if (!res.ok) {
            setSaveStatus('error'); setSaveErr(res.error); setDirty(true)
          }
        }} style={{
          marginTop: 12, width: '100%', fontSize: 13, fontWeight: 600, padding: 12, minHeight: 44,
          borderRadius: 12, cursor: 'pointer', border: '1px dashed var(--admin-forest)',
          background: 'transparent', color: 'var(--admin-forest)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit',
        }}>{Icon.plus(14, 'var(--admin-forest)')} Ajouter un produit</button>
        <div style={{ marginTop: 8 }}>
          <Select value={newCat} onValueChange={setNewCat}>
            <SelectTrigger style={{ borderColor: t.primary + '44', borderRadius: 12, background: t.surfaceAlt, padding: '9px 12px', fontSize: 13, minHeight: 44 }}>{newCat}</SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ fontFamily: 'var(--admin-font-display)', color: 'var(--admin-ink)', fontSize: 24, fontWeight: 700, margin: 0 }}>{item.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {dirty && saveStatus !== 'saving' && (
              <span className="admin-status-live is-error" role="status" aria-live="polite">Non enregistré</span>
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
  const { themeId, setThemeId, fontId, setFontId, theme: t, content, dataSource, saveApparenceFields } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving'); setSaveErr(undefined)
    const res = await saveApparenceFields({ themeId, fontId })
    setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }
  return (
    <div className="admin-page" style={{ maxWidth: 800 }}>
      <PageHeader
        title="Apparence"
        subtitle="Couleurs et polices du site public. Les changements s’appliquent tout de suite à l’aperçu."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <div className="admin-settings-section" style={{ marginTop: 20 }}>
        <SectionTitle color={t.primary}>Palette de couleurs</SectionTitle>
        <p className="admin-page-sub" style={{ color: t.muted, margin: '4px 0 12px' }}>Choisissez l’ambiance du restaurant. Une seule palette active à la fois.</p>
        <div className="admin-ops-list" role="listbox" aria-label="Palettes de couleurs">
          {Object.values(THEMES).map(th => {
            const actif = themeId === th.id
            return (
              <button
                key={th.id}
                type="button"
                role="option"
                aria-selected={actif}
                className={`admin-theme-row${actif ? ' is-selected' : ''}`}
                onClick={() => { setThemeId(th.id); setSaveStatus('idle') }}
              >
                <span className="admin-theme-swatches" aria-hidden="true">
                  {[th.primary, th.accent, th.gold, th.bg].map((c, i) => (
                    <span key={i} className="admin-theme-swatch" style={{ background: c }} />
                  ))}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--admin-ink)' }}>{th.label}</span>
                  {actif && <span className="admin-chip is-live" style={{ marginTop: 6 }}>Active</span>}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="admin-settings-section">
        <SectionTitle color={t.accent}>Polices</SectionTitle>
        <p className="admin-page-sub" style={{ color: t.muted, margin: '4px 0 12px' }}>Titres et textes du site. Visible pour vos clients dès la publication.</p>
        <TypoPanel onLotApplique={(id) => { setFontId(id); setSaveStatus('idle') }} />
      </div>
      <div className="admin-settings-section">
        <SectionTitle color={t.gold}>Aperçu</SectionTitle>
        <div className="admin-preview-surface">
          <div style={{ fontFamily: 'var(--f-heading)', fontSize: 28, fontWeight: 700, color: t.heading, letterSpacing: '-0.03em' }}>{content.heroTitle}</div>
          <div style={{ fontSize: 14, color: t.muted, marginTop: 8 }}>{content.slogan}</div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ padding: '9px 18px', borderRadius: 12, background: t.primary, color: '#fff', fontSize: 13, fontWeight: 600 }}>Bouton principal</span>
            <span style={{ padding: '9px 18px', borderRadius: 12, background: t.gold, color: '#fff', fontSize: 13, fontWeight: 600 }}>Bouton accent</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const SITE_MEDIA_SLOTS: ReadonlyArray<{ id: string; label: string; dims: string }> = [
  { id: 'hero', label: 'Hero principal', dims: '1920×1080' },
  { id: 'hero-video', label: 'Vidéo de la bannière', dims: 'vidéo' },
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
    <div className="admin-page" style={{ maxWidth: 1120 }}>
      <PageHeader title="Médias" subtitle="Téléversez et redimensionnez vos images, puis assignez-les aux emplacements du site."
        badge={<span className="admin-chip is-live">{dbAssets.length} fichier{dbAssets.length > 1 ? 's' : ''}</span>}
      />
      <div className="admin-status-live" role="status" aria-live="polite">{uploading ? 'Téléversement en cours…' : status.kind === 'ok' || status.kind === 'err' || status.kind === 'busy' ? status.msg : ''}</div>
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
          className="admin-media-drop"
          onClick={() => !uploading && isSupabase && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); if (isSupabase) setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false)
            if (isSupabase && !uploading) handleFile(e.dataTransfer.files?.[0])
          }}
          style={{
            borderColor: dragOver ? 'var(--admin-forest)' : undefined,
            cursor: isSupabase && !uploading ? 'pointer' : 'default',
            background: dragOver ? 'color-mix(in srgb, var(--admin-forest) 8%, var(--admin-paper-muted))' : undefined,
          }}
          role="button"
          tabIndex={0}
          aria-label="Zone de dépôt d'images"
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!uploading && isSupabase) fileRef.current?.click() } }}
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
  const { visibility, setVisibility, theme: t, dataSource, saveApparenceFields } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const toggle = (k: string) => { setVisibility({ ...visibility, sections: { ...visibility.sections, [k]: !visibility.sections[k] } }); setSaveStatus('idle'); setSaveErr(undefined) }
  const toggleExtra = (k: string) => { setVisibility({ ...visibility, [k]: !visibility[k as keyof typeof visibility] } as typeof visibility); setSaveStatus('idle'); setSaveErr(undefined) }
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving'); setSaveErr(undefined)
    const res = await saveApparenceFields({ visibility })
    setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }
  const rows: [string, string][] = [['home', 'Accueil'], ['carte', 'La carte'], ['histoire', 'Notre histoire'], ['engagements', 'Engagements'], ['equipe', 'Équipe'], ['localisation', 'Localisation'], ['contact', 'Contact'], ['blog', 'Blog']]
  return (
    <div className="admin-page" style={{ maxWidth: 640 }}>
      <PageHeader title="Visibilité" subtitle="Affichez ou masquez des éléments du site en un clic."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <div className="admin-settings-section" style={{ marginTop: 20 }}>
        <SectionTitle color={t.primary}>Sections de page</SectionTitle>
        <div style={{ marginTop: 12 }}>
          {rows.map(([k, l]) => (
            <div key={k} className="admin-toggle-row">
              <span className="admin-toggle-row-label">{l}</span>
              <Switch checked={visibility.sections[k]} onCheckedChange={() => toggle(k)} />
            </div>
          ))}
        </div>
      </div>
      <div className="admin-settings-section">
        <SectionTitle color={t.accent}>Éléments de contenu</SectionTitle>
        <div style={{ marginTop: 12 }}>
          {(['vertusPanel', 'suggestions', 'testimonials', 'badges'] as const).map(k => (
            <div key={k} className="admin-toggle-row">
              <span className="admin-toggle-row-label">{k === 'vertusPanel' ? 'Panneau « Vertus » dépliable' : k === 'suggestions' ? 'Suggestions du moment' : k === 'testimonials' ? 'Témoignages' : 'Badges régime & allergènes'}</span>
              <Switch checked={visibility[k]} onCheckedChange={() => toggleExtra(k)} />
            </div>
          ))}
        </div>
      </div>
      <div className="admin-hint-box">
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
    <div className="admin-page" style={{ maxWidth: 920 }}>
      <PageHeader title="Utilisateurs & rôles" subtitle="Permissions granulaires par module (voir / écrire / désactivé)."
        actions={<PrimaryButton onClick={startAdd} disabled={!isSupabase || !!editing || !canDo('users', 'create', currentUser?.role ?? '')}>{Icon.plus(14, '#fff')} Ajouter nouveau</PrimaryButton>}
      />

      {!isSupabase && (
        <div className="admin-empty" style={{ marginTop: 14, fontSize: 13 }}>
          Mode local — la gestion des utilisateurs nécessite une connexion en ligne.
        </div>
      )}

      <div className="admin-settings-section" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <h3 className="admin-editor-col-title" style={{ margin: 0 }}>Équipe</h3>
          <span className="admin-chip">{adminUsers.length}</span>
          {isSupabase && isOwner && adminUsers.some(u => !u.invited_at && u.role !== 'owner') && (
            <GhostButton color={t.primary} onClick={inviteAllPending} disabled={status.kind === 'busy'}>Inviter tous les non-invités</GhostButton>
          )}
        </div>

        {status.kind !== 'idle' && (
          <div className={`admin-status-live${status.kind === 'err' ? ' is-error' : status.kind === 'ok' ? ' is-ok' : ''}`} role="status" aria-live="polite" style={{ marginBottom: 12 }}>
            {status.msg}
          </div>
        )}

        {editing && (
          <div className="admin-detail-panel" style={{ position: 'static', maxHeight: 'none', marginBottom: 12 }}>
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
            <div style={{ display: 'grid', gap: 6, maxWidth: 260, marginTop: 12 }}>
              <FieldLabel>Rôle</FieldLabel>
              <Select value={editing.role} onValueChange={v => setEditing({ ...editing, role: v })}>
                <SelectTrigger style={{ borderColor: 'var(--admin-line)', borderRadius: 12, background: 'var(--admin-paper-muted)', padding: '11px 14px', fontSize: 14 }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {ROLE_DESCRIPTIONS[editing.role] && (
                <span className="admin-page-sub">{ROLE_DESCRIPTIONS[editing.role]}</span>
              )}
            </div>
            <div className="admin-ops-actions" style={{ marginTop: 12, justifyContent: 'flex-start' }}>
              <PrimaryButton onClick={saveEdit}>Enregistrer</PrimaryButton>
              <GhostButton color={t.muted} onClick={() => setEditing(null)}>Annuler</GhostButton>
            </div>
          </div>
        )}

        {adminUsers.length === 0 ? (
          <p className="admin-loading">Aucun utilisateur en base. {isSupabase ? 'Cliquez sur « Ajouter ».' : ''}</p>
        ) : (
          <div className="admin-ops-list">
            {adminUsers.map(u => {
              const role = ROLES.find(r => r.id === u.role) || ROLES.find(r => r.id === 'guest')!
              const isSelf = u.email.toLowerCase() === currentEmail
              return (
                <React.Fragment key={u.id}>
                  <div className={`admin-ops-row${expandedId === u.id ? ' is-selected' : ''}`}>
                    <div className="admin-ops-main">
                      <div className="admin-ops-title">
                        {u.name}{' '}
                        <span style={{ fontWeight: 400, opacity: 0.65 }}>· {u.email}{isSelf ? ' (vous)' : ''}</span>
                      </div>
                      {ROLE_DESCRIPTIONS[role.id] && (
                        <div className="admin-ops-meta">{ROLE_DESCRIPTIONS[role.id]}</div>
                      )}
                      {(() => { const s = roleSummary(u.role); return (
                        <div className="admin-ops-meta">
                          {s.modulesWrite} module{s.modulesWrite > 1 ? 's' : ''} en écriture · {s.modulesRead} en lecture · {s.actionsGranted}/{s.actionsTotal} actions
                        </div>
                      ) })()}
                    </div>
                    <div className="admin-ops-aside">
                      <span className="admin-chip is-live">{role.name}</span>
                      {u.active === false ? (
                        <span className="admin-chip is-danger">Suspendu</span>
                      ) : isSupabase && !u.invited_at ? (
                        <span className="admin-chip is-warn">Invité</span>
                      ) : (
                        <span className="admin-chip is-live">Actif</span>
                      )}
                      <div className="admin-ops-actions">
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
                  </div>
                  {expandedId === u.id && (
                    <div className="admin-user-detail">
                      {(() => {
                        const writeMods = ALL_MODULES.filter(m => permLevelFor(m, u.role) === 'write').map(m => MODULE_ACCESS[m].module)
                        const readMods = ALL_MODULES.filter(m => permLevelFor(m, u.role) === 'read').map(m => MODULE_ACCESS[m].module)
                        const noneMods = ALL_MODULES.filter(m => permLevelFor(m, u.role) === 'none').map(m => MODULE_ACCESS[m].module)
                        return (
                          <>
                            {writeMods.length > 0 && (
                              <div className="admin-user-detail-group">
                                <div className="admin-user-detail-label is-write">Écriture ({writeMods.length})</div>
                                <div className="admin-user-detail-chips">{writeMods.map(m => <span key={m} className="admin-chip is-live">{m}</span>)}</div>
                              </div>
                            )}
                            {readMods.length > 0 && (
                              <div className="admin-user-detail-group">
                                <div className="admin-user-detail-label is-read">Lecture seule ({readMods.length})</div>
                                <div className="admin-user-detail-chips">{readMods.map(m => <span key={m} className="admin-chip">{m}</span>)}</div>
                              </div>
                            )}
                            {noneMods.length > 0 && (
                              <div className="admin-user-detail-group">
                                <div className="admin-user-detail-label">Aucun accès ({noneMods.length})</div>
                                <div className="admin-user-detail-chips">{noneMods.map(m => <span key={m} className="admin-chip" style={{ opacity: 0.7 }}>{m}</span>)}</div>
                              </div>
                            )}
                          </>
                        )
                      })()}
                      {(() => {
                        const acts = userActivity(u.email).slice(0, 8)
                        if (acts.length === 0 && dataSource !== 'supabase') return null
                        return (
                          <div className="admin-user-activity">
                            <div className="admin-user-detail-label">Activité récente ({acts.length})</div>
                            {acts.length === 0 ? (
                              <div className="admin-ops-meta">Aucune action enregistrée.</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {acts.map(e => (
                                  <div key={e.id} className="admin-user-activity-row">
                                    <span className="admin-ops-meta"><span className="admin-chip" style={{ marginRight: 6 }}>{e.action}</span>{e.target}{e.detail ? ` — ${e.detail}` : ''}</span>
                                    <span className="admin-mono" style={{ opacity: 0.6, whiteSpace: 'nowrap' }}>{e.created_at ? dateFr(e.created_at) : ''}</span>
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
            })}
          </div>
        )}
      </div>

      <div className="admin-settings-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <h3 className="admin-editor-col-title" style={{ margin: 0 }}>Matrice des permissions</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {rbacStatus.kind !== 'idle' && (
            <span className={`admin-status-live${rbacStatus.kind === 'err' ? ' is-error' : ' is-ok'}`}>{rbacStatus.msg}</span>
          )}
          {isOwner && (
            <GhostButton color={t.muted} disabled={rbacBusy || !isSupabase} onClick={resetPerms}>Réinitialiser</GhostButton>
          )}
        </div>
      </div>
      {!isOwner && (
        <div className="admin-ops-meta" style={{ marginBottom: 10 }}>Lecture seule — seul le propriétaire peut modifier les permissions.</div>
      )}
      {pendingCount > 0 && (
        <div className="admin-rbac-pending">
          <span className="admin-rbac-pending-label">{pendingCount} modification{pendingCount > 1 ? 's' : ''} en attente</span>
          <PrimaryButton onClick={commitPerms} disabled={rbacBusy || !isSupabase}>{rbacBusy ? 'Enregistrement…' : 'Enregistrer'}</PrimaryButton>
          <GhostButton color={t.muted} disabled={rbacBusy} onClick={discardPerms}>Annuler</GhostButton>
        </div>
      )}
      <div className="admin-toolbar" style={{ marginTop: 0, marginBottom: 10 }}>
        <div className="admin-search-field">
          <input value={moduleQuery} onChange={e => setModuleQuery(e.target.value)} placeholder="Rechercher un module…" aria-label="Rechercher un module" />
          <span className="admin-search-field-icon" aria-hidden="true">{Icon.search(13, t.muted)}</span>
        </div>
        {moduleQuery && <span className="admin-ops-meta">{filteredModules.length} module{filteredModules.length > 1 ? 's' : ''}</span>}
      </div>
      <div className="admin-rbac-stack">
        {ROLES.map(r => {
          const s = roleSummary(r.id)
          return (
            <div key={r.id} className="admin-rbac-role">
              <div className="admin-rbac-role-head">
                <div>
                  <div className="admin-rbac-role-title">{ROLE_LABELS[r.id] ?? r.name}</div>
                  <div className="admin-rbac-role-meta">{s.modulesWrite} écriture · {s.modulesRead} lecture · {s.actionsGranted}/{s.actionsTotal} actions</div>
                </div>
              </div>
              <div className="admin-rbac-modules">
                {filteredModules.map(m => {
                  const acts = actionsFor(m)
                  const p = permLevelFor(m, r.id)
                  const locked = isLocked(m, r.id)
                  const disabled = !isOwner || rbacBusy || locked
                  return (
                    <div key={m} className={`admin-rbac-module${p === 'write' ? ' is-write' : p === 'read' ? ' is-read' : ''}`}>
                      <div className={`admin-rbac-module-head${acts.length > 0 ? ' has-actions' : ''}`}>
                        <span className="admin-rbac-module-name">{MODULE_ACCESS[m].module}</span>
                        {acts.length === 0 && <span style={{ fontSize: 11, fontWeight: 700, color: permColor(p) }}>{permIcon(p)}</span>}
                      </div>
                      {acts.length > 0 ? (
                        <div className="admin-rbac-actions">
                          {acts.map(a => {
                            const on = roleHas(m, a, r.id)
                            const aLabel = a === 'create' ? 'Créer' : a === 'update' ? 'Modif.' : a === 'delete' ? 'Suppr.' : 'Publ.'
                            return (
                              <div key={a} className={`admin-rbac-action${disabled ? ' is-disabled' : ''}`} title={locked ? 'Protégé (propriétaire)' : `${aLabel} : ${on ? 'autorisé' : 'interdit'}`}>
                                <Switch checked={on} onCheckedChange={() => togglePerm(m, a, r.id)} />
                                <span className={`admin-rbac-action-label${on ? ' is-on' : ''}`}>{aLabel}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="admin-rbac-module-level">{p === 'write' ? 'Écriture' : p === 'read' ? 'Lecture seule' : 'Aucun accès'}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="admin-rbac-footnote">
        <span>Les modules sans actions (ex. Tableau de bord, Journal) restent en lecture seule. Le rôle propriétaire sur le module Utilisateurs est protégé (anti-verrouillage).</span>
      </div>

      <div className="admin-rbac-hist">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <h3 className="admin-editor-col-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            Historique des changements RBAC
            <span className="admin-chip">{rbacHistory.length}</span>
          </h3>
          <GhostButton color={t.muted} onClick={() => setRbacHistOpen(o => !o)}>{rbacHistOpen ? 'Masquer' : 'Afficher'}</GhostButton>
        </div>
        {rbacHistOpen && (
          rbacHistory.length === 0 ? (
            <p className="admin-loading" style={{ marginTop: 0 }}>Aucun changement RBAC enregistré pour le moment.</p>
          ) : (
            <div className="admin-rbac-hist-list">
              {rbacHistory.slice(0, 50).map(e => (
                <div key={e.id} className="admin-rbac-hist-row">
                  <span className="admin-rbac-hist-when">{e.created_at ? new Date(e.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  <span className="admin-rbac-hist-action">{e.action.replace(/_/g, ' ')}</span>
                  <span className="admin-ops-meta" style={{ flexShrink: 0 }}>{e.actor || 'système'}</span>
                  <span className="admin-ops-meta" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>→ {e.target}</span>
                  <span className="admin-ops-meta" style={{ flexShrink: 0, fontSize: 11 }}>{e.detail}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
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
    <div className="admin-page" style={{ maxWidth: 960 }}>
      <PageHeader title="Blog" subtitle="Rédigez et publiez des articles."
        actions={<PrimaryButton onClick={() => setEditing({ title: '', excerpt: '', body: '', category: 'Actualités', published: false, slug: '', cover_url: '', meta_description: '' })} disabled={!canDo('blog', 'create', user?.role ?? '')}>{Icon.plus(14, '#fff')} Nouvel article</PrimaryButton>}
      />
      <div className="admin-status-live" role="status" aria-live="polite">
        {saveStatus === 'saving' ? 'Enregistrement…' : saveStatus === 'saved' ? 'Article enregistré' : saveStatus === 'error' ? (saveErr || 'Échec') : ''}
      </div>
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
  const { content, setContent, theme: t, dataSource, saveContentFields } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const set = (k: string, v: string) => { setContent({ ...content, [k]: v }); setSaveStatus('idle'); setSaveErr(undefined) }
  const inp = inputStyle(t)
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving'); setSaveErr(undefined)
    /*
      Écriture PAR DOMAINE : cet écran n'écrit QUE l'auto-réponse. Les
      destinataires sont gérés dans « Réglages globaux » — les écrire ici
      écraserait l'adresse réelle avec la valeur périmée affichée.
    */
    const res = await saveContentFields({ autoReply: content.autoReply })
    setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }
  return (
    <div style={{ maxWidth: '700px' }}>
      <PageHeader title="Formulaires & emails" subtitle="L'auto-réponse envoyée aux visiteurs, et le chemin de la notification."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <div style={{ marginTop: 12, marginBottom: 16 }}><SectionTitle color={t.accent}>Auto-réponse</SectionTitle></div>
      <div>
        <FieldLabel>Template d'auto-réponse (variable : {`{nom}`})</FieldLabel>
        <Textarea rows={4} value={content.autoReply} onChange={e => set('autoReply', e.target.value)} style={inp} />
      </div>
      <div style={{ fontSize: '12.5px', color: t.muted, marginBottom: 6 }}>
        Les destinataires se règlent dans « Réglages globaux », section « Destinataires & notifications ».
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
      <div className="admin-page">
        <PageHeader title="Messages" subtitle="Les demandes des clients apparaissent ici." />
        <div className="admin-empty" style={{ marginTop: 16, fontSize: 14 }}>
          Connectez votre espace en ligne pour activer la gestion et la réponse aux messages.
        </div>
      </div>
    )
  }

  return (
    <div className={`admin-page-wide admin-msg-split${selected ? '' : ' is-list-only'}`} style={{ gridTemplateColumns: selected ? undefined : '1fr' }}>
      <div>
        <PageHeader title="Messages" subtitle={`${filtered.length} / ${messages.length} · ${live ? 'temps réel' : 'actualisation périodique'}`} />
        <div className="admin-status-live" role="status" aria-live="polite">
          {newCount > 0 ? `${newCount} nouveau${newCount > 1 ? 'x' : ''} message${newCount > 1 ? 's' : ''}` : sending === 'sending' ? 'Envoi de la réponse…' : sending === 'sent' ? 'Réponse envoyée' : sending === 'error' ? 'Échec de l\'envoi' : bulkErr || delErr || handledErr || ''}
        </div>
        <div className="admin-toolbar">
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher un message" style={{ ...inp, paddingLeft: 32, fontSize: 13, minHeight: 44 }} />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} aria-hidden="true">{Icon.search(14, t.muted)}</span>
          </div>
          {([['all', 'Toutes'], ['unhandled', 'Non traitées'], ['handled', 'Traitées']] as ['all' | 'unhandled' | 'handled', string][]).map(([k, l]) => (
            <button key={k} type="button" className="admin-filter-chip" aria-pressed={statusFilter === k} onClick={() => setStatusFilter(k)}>{l}</button>
          ))}
          <GhostButton color={t.primary} onClick={exportCsv} disabled={filtered.length === 0}>Exporter CSV</GhostButton>
        </div>
        {selectedIds.size > 0 && (
          <div className="admin-toolbar" style={{ background: 'var(--admin-paper-muted)', padding: 12, borderRadius: 12, border: '1px solid var(--admin-line)' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
            <Bouton genre="secondaire" onClick={() => bulkSetHandled(true)} disabled={bulkBusy}>Marquer traités</Bouton>
            <Bouton genre="silencieux" onClick={() => bulkSetHandled(false)} disabled={bulkBusy}>Non traités</Bouton>
            <Bouton genre="danger" onClick={bulkDelete} disabled={bulkBusy}>Supprimer</Bouton>
            <Bouton genre="silencieux" onClick={() => setSelectedIds(new Set())}>Tout désélectionner</Bouton>
          </div>
        )}
        {messages.length === 0 ? (
          <EmptyState icon={Icon.mail(26, t.muted)} title="Aucun message" subtitle="Les soumissions du formulaire apparaîtront ici." />
        ) : filtered.length === 0 ? (
          <p className="admin-loading">Aucun message dans ce filtre.</p>
        ) : (
          <>
          <div className="admin-ops-list" style={{ marginTop: 12 }}>
            <button type="button" onClick={toggleSelectAll} className="admin-ops-row" style={{ fontWeight: 600, color: 'var(--admin-forest)', cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>
              {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
            {pagedMessages.map(m => {
              const i = messages.indexOf(m)
              const checked = Boolean(m.id && selectedIds.has(m.id))
              return (
              <div key={m.id ?? i} className={`admin-ops-row${!m.handled ? ' is-urgent' : ''}${selectedIdx === i ? ' is-selected' : ''}`}>
                <label style={{ display: 'flex', alignItems: 'center', minHeight: 44, paddingRight: 4, cursor: 'pointer' }}>
                  <input type="checkbox" checked={checked} onChange={() => m.id && toggleSelect(m.id)} aria-label={`Sélectionner ${m.nom}`} style={{ width: 18, height: 18 }} />
                </label>
                <button type="button" onClick={() => { setSelectedIdx(i); setReplyText(''); setSending('idle') }} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', padding: 0, minHeight: 44 }}>
                  <div className="admin-ops-title">
                    {!m.handled && <span className="admin-status-dot" aria-hidden="true" />}
                    {m.nom}
                    <span className="cms-sr-only">{m.handled ? 'Traité' : 'Non traité'}</span>
                    {!m.handled && <span className="admin-chip is-danger" style={{ marginLeft: 8 }}>Non traité</span>}
                  </div>
                  <div className="admin-ops-meta" style={{ color: 'var(--admin-forest)' }}>{m.sujet}</div>
                  <div className="admin-ops-meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message}</div>
                </button>
                <span className="admin-mono" style={{ fontSize: 12, opacity: 0.6 }}>{dateFr(m.date)}</span>
              </div>
              )
            })}
          </div>
          <Pagination page={page} pageSize={MSG_PAGE} total={filtered.length} onPage={setPage} />
          </>
        )}
      </div>
      {selected && (
        <div className="admin-conversation">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--admin-font-display)', color: 'var(--admin-ink)', fontSize: 24, fontWeight: 700, margin: 0 }}>{selected.nom}</h3>
              <div className="admin-ops-meta">{selected.email} · {selected.date}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-forest)', marginTop: 4 }}>{selected.sujet}</div>
            </div>
            <div className="admin-ops-actions">
              {selected.handled && <span className="admin-chip is-live">Traité</span>}
              <Bouton genre={selected.handled ? 'actif' : 'secondaire'} onClick={toggleHandled} disabled={handling} busy={handling}>
                {selected.handled ? 'Traité' : 'Marquer traité'}
              </Bouton>
              {confirmDel === selected.id ? (
                <>
                  <Bouton genre="danger" onClick={() => selected.id && removeMessage(selected.id)} disabled={delBusy}>{delBusy ? '…' : 'Confirmer'}</Bouton>
                  <Bouton genre="secondaire" onClick={() => setConfirmDel(null)}>Annuler</Bouton>
                </>
              ) : (
                <Bouton genre="danger" aria-label="Supprimer le message" onClick={() => setConfirmDel(selected.id ?? null)}>{Icon.trash(14, 'var(--admin-coral)')}</Bouton>
              )}
              <Bouton genre="silencieux" onClick={() => { setSelectedIdx(null); setReplyText(''); setSending('idle') }}>Fermer</Bouton>
            </div>
          </div>
          <div style={{ padding: 16, marginBottom: 16, borderRadius: 12, background: 'var(--admin-paper-muted)', border: '1px solid var(--admin-line)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.6 }}>Message original</div>
            <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.message}</p>
          </div>
          {(selected.replies?.length ?? 0) > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, opacity: 0.6 }}>Historique des réponses ({selected.replies!.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selected.replies!.map((rp, idx) => (
                  <div key={idx} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--admin-surface)', border: '1px solid var(--admin-line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{rp.author}</span>
                      <span className="admin-mono" style={{ fontSize: 11, opacity: 0.6 }}>{rp.date ? dateFr(rp.date) : ''}</span>
                    </div>
                    <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{rp.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <FieldLabel>Votre réponse</FieldLabel>
            <Textarea rows={5} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Tapez votre réponse au client…" style={inp} />
            <div className="admin-filter-row">
              <span style={{ fontSize: 12, fontWeight: 600, alignSelf: 'center', opacity: 0.6 }}>Modèles :</span>
              {TEMPLATES.map((tpl, idx) => (
                <button key={idx} type="button" className="admin-filter-chip" onClick={() => setReplyText(tpl)} title={tpl}>{tpl.slice(0, 28)}…</button>
              ))}
            </div>
            <div className="admin-ops-actions" style={{ marginTop: 12, justifyContent: 'flex-start' }}>
              <PrimaryButton onClick={sendReply} disabled={!replyText.trim() || sending === 'sending'} busy={sending === 'sending'}>
                {sending === 'sending' ? 'Envoi…' : 'Répondre par email'}
              </PrimaryButton>
              <span className={`admin-status-live${sending === 'error' ? ' is-error' : sending === 'sent' ? ' is-ok' : ''}`} role="status" aria-live="polite">
                {sending === 'sent' ? `Email envoyé à ${selected.email}` : sending === 'error' ? 'Échec de l\'envoi — réessayez' : ''}
              </span>
            </div>
            <div className="admin-ops-meta" style={{ marginTop: 10 }}>L&apos;email sera envoyé vers {selected.email}</div>
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
  const statusLabel: Record<string, string> = { pending: 'En attente', confirmed: 'Confirmée', preparing: 'En préparation', ready: 'Prête', delivered: 'Récupérée', cancelled: 'Annulée' }
  const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] as const
  const [filter, setFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
  const selected = selectedId ? orders.find(o => o.id === selectedId) ?? null : null
  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setSelectedId(null); setConfirmDel(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])
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
    if (selectedId === id) setSelectedId(null)
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
      <div className="admin-page">
        <PageHeader title="Commandes" subtitle="Les commandes en ligne apparaissent ici." />
        <div className="admin-empty" style={{ marginTop: 16, fontSize: 14 }}>
          Connectez votre espace en ligne pour activer la gestion des commandes.
        </div>
      </div>
    )
  }
  return (
    <div className="admin-page-wide">
      <PageHeader title="Commandes" subtitle={`${orders.length} commande${orders.length > 1 ? 's' : ''} · actualisation auto`} />
      <div className="admin-status-live" role="status" aria-live="polite">
        {statusSending ? 'Envoi de la notification…' : statusErr ? `Erreur : ${statusErr}` : loading ? 'Chargement des commandes…' : ''}
      </div>
      {loading ? <div className="admin-loading">Chargement…</div> :
        orders.length === 0 ? <div style={{ marginTop: 20 }}><EmptyState icon={Icon.coin(28, t.muted)} title="Aucune commande" subtitle="Les commandes en ligne des clients apparaîtront ici." /></div> :
        <>
        <div className="admin-toolbar">
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher (nom, email, réf, téléphone)…" aria-label="Rechercher une commande" style={{ ...inputStyle(t), paddingLeft: 34, fontSize: 13, minHeight: 44 }} />
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} aria-hidden="true">{Icon.search(15, t.muted)}</span>
          </div>
          <Select value={sortKey} onValueChange={v => setSortKey(v as 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc')}>
            <SelectTrigger style={{ width: 160, borderColor: t.shadow, borderRadius: 12, background: t.surfaceAlt, padding: '9px 12px', fontSize: 13, minHeight: 44 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Plus récentes</SelectItem>
              <SelectItem value="date_asc">Plus anciennes</SelectItem>
              <SelectItem value="amount_desc">Montant ↓</SelectItem>
              <SelectItem value="amount_asc">Montant ↑</SelectItem>
            </SelectContent>
          </Select>
          <GhostButton color={t.primary} onClick={exportCsv} disabled={sorted.length === 0}>Exporter CSV</GhostButton>
        </div>
        <div className="admin-filter-row" role="group" aria-label="Filtrer par statut">
          {([['all', 'Toutes'], ['pending', 'En attente'], ['confirmed', 'Confirmées'], ['preparing', 'En préparation'], ['ready', 'Prêtes'], ['delivered', 'Récupérées'], ['cancelled', 'Annulées']] as [string, string][]).map(([k, l]) => (
            <button
              key={k}
              type="button"
              className="admin-filter-chip"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
            >{l} <span style={{ opacity: 0.7 }}>{counts[k as keyof typeof counts] ?? 0}</span></button>
          ))}
        </div>
        <div className={`admin-ops-split${selected ? '' : ' is-list-only'}`}>
          <div className="admin-ops-list">
            {sorted.length === 0 ? <div className="admin-ops-row" style={{ color: t.muted }}>Aucune commande dans ce filtre.</div> :
            pagedOrders.map(o => (
              <button
                key={o.id}
                type="button"
                className={`admin-ops-row is-clickable${o.status === 'pending' ? ' is-urgent' : ''}${selectedId === o.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedId(o.id ?? null)}
                aria-pressed={selectedId === o.id}
              >
                <div className="admin-ops-main">
                  <div className="admin-ops-title">
                    {o.nom}{' '}
                    {o.ref && <span className="admin-mono" style={{ fontWeight: 500, opacity: 0.65 }}>· {o.ref}</span>}
                  </div>
                  <div className="admin-ops-meta">
                    retrait {o.pickup_time || '—'}
                    {o.created_at ? ` · ${dateFr(o.created_at)}` : ''}
                    {o.items.length > 0 ? ` · ${o.items.reduce((n, it) => n + it.qty, 0)} article${o.items.reduce((n, it) => n + it.qty, 0) > 1 ? 's' : ''}` : ''}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-forest)', marginTop: 8 }}>{o.total} FG</div>
                </div>
                <div className="admin-ops-aside">
                  <span className={`admin-chip${o.status === 'pending' ? ' is-danger' : o.status === 'confirmed' || o.status === 'ready' ? ' is-live' : ' is-warn'}`}>
                    {statusLabel[o.status] ?? o.status}
                  </span>
                  <span className="admin-ticket-cta">Ouvrir</span>
                </div>
              </button>
            ))}
          </div>
          {selected && (
            <aside className="admin-detail-panel" aria-label={`Détail commande ${selected.ref || selected.nom}`}>
              <div className="admin-detail-head">
                <div>
                  <div className="admin-ops-title">{selected.nom}</div>
                  <div className="admin-ops-meta">
                    {selected.ref && <span className="admin-mono">{selected.ref}</span>}
                    {selected.created_at ? ` · ${dateFr(selected.created_at)}` : ''}
                  </div>
                </div>
                <Bouton genre="silencieux" aria-label="Fermer le détail" onClick={() => { setSelectedId(null); setConfirmDel(null) }}>Fermer</Bouton>
              </div>
              <span className={`admin-chip${selected.status === 'pending' ? ' is-danger' : selected.status === 'confirmed' || selected.status === 'ready' ? ' is-live' : ' is-warn'}`}>
                {statusLabel[selected.status] ?? selected.status}
              </span>
              <div className="admin-ops-meta" style={{ marginTop: 14 }}>
                {selected.email}{selected.phone ? ` · ${selected.phone}` : ''}
              </div>
              <div className="admin-ops-meta">Retrait : {selected.pickup_time || '—'}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--admin-forest)', marginTop: 12 }}>{selected.total} FG</div>
              {selected.items.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.6 }}>Articles</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {selected.items.map((it, idx) => (
                      <li key={idx} style={{ fontSize: 14, marginBottom: 4 }}>{it.qty}× {it.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selected.notes && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'var(--admin-paper-muted)', border: '1px solid var(--admin-line)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, opacity: 0.6 }}>Note client</div>
                  <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap' }}>{selected.notes}</p>
                </div>
              )}
              <div className="admin-ops-actions" style={{ marginTop: 20, justifyContent: 'flex-start' }}>
                <Select value={selected.status} onValueChange={v => updateStatus(selected.id!, v)}>
                  <SelectTrigger aria-label={`Statut de la commande ${selected.ref || selected.nom}`} style={{ width: 160, borderColor: t.shadow, borderRadius: 12, background: t.surfaceAlt, padding: '8px 12px', fontSize: 13, minHeight: 44 }}>{statusLabel[selected.status] ?? selected.status}</SelectTrigger>
                  <SelectContent>
                    {STATUS_FLOW.map(s => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
                {canDo('orders', 'delete', user?.role ?? '') && (confirmDel === selected.id ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Bouton genre="danger" onClick={() => removeOrder(selected.id!)}>Confirmer</Bouton>
                    <Bouton genre="secondaire" onClick={() => setConfirmDel(null)}>Annuler</Bouton>
                  </div>
                ) : (
                  <Bouton genre="danger" aria-label="Supprimer la commande" title="Supprimer la commande" onClick={() => setConfirmDel(selected.id ?? null)}>
                    {Icon.trash(14, 'var(--admin-coral)')}
                  </Bouton>
                ))}
              </div>
            </aside>
          )}
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
  const statusLabel: Record<string, string> = { pending: 'En attente', confirmed: 'Confirmée', cancelled: 'Annulée' }
  const STATUS_FLOW = ['pending', 'confirmed', 'cancelled'] as const
  const [filter, setFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<'date_desc' | 'date_asc' | 'guests_desc' | 'guests_asc'>('date_desc')
  const [dateFilter, setDateFilter] = useState('')
  const [view, setView] = useState<'list' | 'planning'>('list')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
  const selected = selectedId ? reservations.find(r => r.id === selectedId) ?? null : null
  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setSelectedId(null); setConfirmDel(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])
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
    if (selectedId === id) setSelectedId(null)
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
      <div className="admin-page">
        <PageHeader title="Réservations" subtitle="Les demandes de table apparaissent ici." />
        <div className="admin-empty" style={{ marginTop: 16, fontSize: 14 }}>
          Connectez votre espace en ligne pour activer la gestion des réservations.
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
  const resaActions = (r: Reservation) => (
    <div className="admin-ops-actions">
      <Select value={r.status} onValueChange={v => updateStatus(r.id!, v)}>
        <SelectTrigger aria-label={`Statut réservation ${r.nom}`} style={{ width: 140, borderColor: t.shadow, borderRadius: 12, background: t.surfaceAlt, padding: '8px 12px', fontSize: 13, minHeight: 44 }}>{statusLabel[r.status] ?? r.status}</SelectTrigger>
        <SelectContent>
          {STATUS_FLOW.map(s => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
        </SelectContent>
      </Select>
      {canDo('reservations', 'delete', user?.role ?? '') && (confirmDel === r.id ? (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Bouton genre="danger" onClick={() => removeResa(r.id!)}>Confirmer</Bouton>
          <Bouton genre="secondaire" onClick={() => setConfirmDel(null)}>Annuler</Bouton>
        </div>
      ) : (
        <Bouton genre="danger" aria-label="Supprimer la réservation" title="Supprimer" onClick={() => setConfirmDel(r.id ?? null)}>
          {Icon.trash(14, 'var(--admin-coral)')}
        </Bouton>
      ))}
    </div>
  )
  const detailPanel = selected ? (
    <aside className="admin-detail-panel" aria-label={`Détail réservation ${selected.nom}`}>
      <div className="admin-detail-head">
        <div>
          <div className="admin-ops-title">{selected.nom}</div>
          <div className="admin-ops-meta">{selected.date} à {selected.time} · {selected.guests} personne{selected.guests > 1 ? 's' : ''}</div>
        </div>
        <Bouton genre="silencieux" aria-label="Fermer le détail" onClick={() => { setSelectedId(null); setConfirmDel(null) }}>Fermer</Bouton>
      </div>
      <span className={`admin-chip${selected.status === 'pending' ? ' is-danger' : selected.status === 'confirmed' ? ' is-live' : ''}`}>
        {statusLabel[selected.status] ?? selected.status}
      </span>
      <div className="admin-ops-meta" style={{ marginTop: 14 }}>
        {selected.email}{selected.phone ? ` · ${selected.phone}` : ''}
      </div>
      {selected.created_at && <div className="admin-ops-meta">Créée {dateFr(selected.created_at)}</div>}
      {selected.message && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: 'var(--admin-paper-muted)', border: '1px solid var(--admin-line)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, opacity: 0.6 }}>Message</div>
          <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap' }}>{selected.message}</p>
        </div>
      )}
      <div style={{ marginTop: 20 }}>{resaActions(selected)}</div>
    </aside>
  ) : null
  return (
    <div className="admin-page-wide">
      <PageHeader title="Réservations" subtitle={`${reservations.length} réservation${reservations.length > 1 ? 's' : ''} · ${totalGuests} couverts (hors annulées) · actualisation auto`} />
      <div className={`admin-status-live${statusErr ? ' is-error' : ''}`} role="status" aria-live="polite">
        {statusSending ? 'Envoi de la notification…' : statusErr ? `Erreur : ${statusErr}` : loading ? 'Chargement des réservations…' : ''}
      </div>
      {loading ? <div className="admin-loading">Chargement…</div> :
        reservations.length === 0 ? <div style={{ marginTop: 20 }}><EmptyState icon={Icon.calendar(28, t.muted)} title="Aucune réservation" subtitle="Les demandes de table apparaîtront ici." /></div> :
        <>
        <div className="admin-toolbar">
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher (nom, email, tel, date, heure)…" aria-label="Rechercher une réservation" style={{ ...inputStyle(t), paddingLeft: 34, fontSize: 13, minHeight: 44 }} />
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} aria-hidden="true">{Icon.search(15, t.muted)}</span>
          </div>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ ...inputStyle(t), width: 160, fontSize: 13, minHeight: 44 }} title="Filtrer par date" aria-label="Filtrer par date" />
          {dateFilter && <GhostButton color={t.muted} onClick={() => setDateFilter('')} title="Effacer le filtre date">{Icon.x(13, t.muted)}</GhostButton>}
          <Select value={sortKey} onValueChange={v => setSortKey(v as 'date_desc' | 'date_asc' | 'guests_desc' | 'guests_asc')}>
            <SelectTrigger style={{ width: 160, borderColor: t.shadow, borderRadius: 12, background: t.surfaceAlt, padding: '9px 12px', fontSize: 13, minHeight: 44 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Plus récentes</SelectItem>
              <SelectItem value="date_asc">Plus anciennes</SelectItem>
              <SelectItem value="guests_desc">Couverts ↓</SelectItem>
              <SelectItem value="guests_asc">Couverts ↑</SelectItem>
            </SelectContent>
          </Select>
          <Select value={view} onValueChange={v => setView(v as 'list' | 'planning')}>
            <SelectTrigger style={{ width: 140, borderColor: t.shadow, borderRadius: 12, background: t.surfaceAlt, padding: '9px 12px', fontSize: 13, minHeight: 44 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="list">Liste</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
            </SelectContent>
          </Select>
          <GhostButton color={t.primary} onClick={exportCsv} disabled={sorted.length === 0}>Exporter CSV</GhostButton>
        </div>
        <div className="admin-filter-row" role="group" aria-label="Filtrer par statut">
          {([['all', 'Toutes'], ['pending', 'En attente'], ['confirmed', 'Confirmées'], ['cancelled', 'Annulées']] as [string, string][]).map(([k, l]) => (
            <button key={k} type="button" className="admin-filter-chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {l} <span style={{ opacity: 0.7 }}>{counts[k as keyof typeof counts] ?? 0}</span>
            </button>
          ))}
        </div>
        {sorted.length === 0 ? <p className="admin-loading">Aucune réservation dans ce filtre.</p> :
        <div className={`admin-ops-split${selected ? '' : ' is-list-only'}`}>
          <div>
            {view === 'planning' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                {planningByDate.map(g => (
                  <div key={g.date}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--admin-font-display)', fontSize: 18, fontWeight: 700, color: 'var(--admin-ink)', textTransform: 'capitalize' }}>{fmtDate(g.date)}</span>
                      <span className="admin-ops-meta">{g.rows.length} résa · {g.rows.reduce((n, r) => n + (r.status !== 'cancelled' ? r.guests : 0), 0)} couverts</span>
                      {g.date === today && <span className="admin-chip is-warn">Aujourd&apos;hui</span>}
                    </div>
                    <div className="admin-ops-list">
                      {g.rows.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          className={`admin-ops-row is-clickable${r.status === 'pending' ? ' is-urgent' : ''}${selectedId === r.id ? ' is-selected' : ''}`}
                          onClick={() => setSelectedId(r.id ?? null)}
                          aria-pressed={selectedId === r.id}
                        >
                          <div className="admin-ops-main">
                            <div className="admin-ops-title">{r.time} · {r.nom} <span style={{ fontWeight: 400, opacity: 0.65 }}>· {r.guests} pers.</span></div>
                            <div className="admin-ops-meta">{r.email}{r.phone ? ` · ${r.phone}` : ''}</div>
                          </div>
                          <div className="admin-ops-aside">
                            <span className={`admin-chip${r.status === 'pending' ? ' is-danger' : r.status === 'confirmed' ? ' is-live' : ''}`}>{statusLabel[r.status] ?? r.status}</span>
                            <span className="admin-ticket-cta">Ouvrir</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-ops-list">
                {pagedReservations.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    className={`admin-ops-row is-clickable${r.status === 'pending' ? ' is-urgent' : ''}${selectedId === r.id ? ' is-selected' : ''}`}
                    onClick={() => setSelectedId(r.id ?? null)}
                    aria-pressed={selectedId === r.id}
                  >
                    <div className="admin-ops-main">
                      <div className="admin-ops-title">{r.nom} <span style={{ fontWeight: 400, opacity: 0.65 }}>· {r.guests} personne{r.guests > 1 ? 's' : ''}</span></div>
                      <div className="admin-ops-meta">
                        {r.date} à {r.time}{r.created_at ? ` · créée ${dateFr(r.created_at)}` : ''}
                      </div>
                    </div>
                    <div className="admin-ops-aside">
                      <span className={`admin-chip${r.status === 'pending' ? ' is-danger' : r.status === 'confirmed' ? ' is-live' : ''}`}>{statusLabel[r.status] ?? r.status}</span>
                      <span className="admin-ticket-cta">Ouvrir</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {view === 'list' && <Pagination page={page} pageSize={RESA_PAGE} total={sorted.length} onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />}
          </div>
          {detailPanel}
        </div>}
        </>
      }
    </div>
  )
}

const ENGAGEMENT_ICONS = ['leaf', 'recycle', 'fire', 'search', 'coin', 'star']

function TeamContentsEditor() {
  const { content, setContent, theme: t, dataSource, saveContentFields } = useSite()
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
    /*
      Écriture PAR DOMAINE (plan P0) : cet écran gère équipe, engagements et
      témoignages — RAS. Surtout pas le `content` global : l'écrire avait le
      pouvoir d'écraser des coordonnées saisies depuis un autre écran.
    */
    const res = await saveContentFields({
      team: content.team,
      engagements: content.engagements,
      testimonials: content.testimonials,
    })
    setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }

  const tabs: [string, string][] = [['team', 'Équipe'], ['engagements', 'Engagements'], ['testimonials', 'Témoignages']]

  return (
    <div className="admin-page" style={{ maxWidth: 820 }}>
      <PageHeader title="Équipe & contenus" subtitle="Gérez les membres de l'équipe, les engagements et les témoignages clients."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <div className="admin-segment" role="tablist" aria-label="Sections équipe et contenus">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={`admin-segment-btn${tab === k ? ' is-active' : ''}`}
            onClick={() => setTab(k as 'team' | 'engagements' | 'testimonials')}
          >
            {l} <span className="admin-segment-count">{k === 'team' ? content.team.length : k === 'engagements' ? content.engagements.length : content.testimonials.length}</span>
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <div className="admin-content-stack">
          {content.team.map((m, i) => (
            <div key={i} className="admin-content-card">
              <div className="admin-grid-2">
                <div><FieldLabel>Nom</FieldLabel><Input value={m.name} onChange={e => setTeam(content.team.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} style={inp} /></div>
                <div><FieldLabel>Rôle</FieldLabel><Input value={m.role} onChange={e => setTeam(content.team.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} style={inp} /></div>
              </div>
              <div><FieldLabel>Description</FieldLabel><Textarea rows={2} value={m.desc} onChange={e => setTeam(content.team.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} style={inp} /></div>
              <div className="admin-ops-actions" style={{ justifyContent: 'flex-end' }}>
                <GhostButton color="#dc2626" onClick={() => setTeam(content.team.filter((_, j) => j !== i))}>{Icon.trash(12, '#dc2626')} Retirer</GhostButton>
              </div>
            </div>
          ))}
          <button type="button" className="admin-add-dashed" onClick={() => setTeam([...content.team, { name: 'Nouveau membre', role: 'Rôle', desc: '' }])}>
            {Icon.plus(14, 'var(--admin-forest)')} Ajouter un membre
          </button>
        </div>
      )}

      {tab === 'engagements' && (
        <div className="admin-content-stack">
          {content.engagements.map((e, i) => (
            <div key={i} className="admin-content-card">
              <div className="admin-grid-icon-title">
                <div><FieldLabel>Icône</FieldLabel>
                  <Select value={e.icon} onValueChange={v => setEngagements(content.engagements.map((x, j) => j === i ? { ...x, icon: v } : x))}>
                    <SelectTrigger style={{ borderColor: 'var(--admin-line)', borderRadius: 12, background: 'var(--admin-paper-muted)', padding: '10px 12px', minHeight: 44 }}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENGAGEMENT_ICONS.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><FieldLabel>Titre</FieldLabel><Input value={e.title} onChange={ev => setEngagements(content.engagements.map((x, j) => j === i ? { ...x, title: ev.target.value } : x))} style={inp} /></div>
              </div>
              <div><FieldLabel>Description</FieldLabel><Textarea rows={2} value={e.desc} onChange={ev => setEngagements(content.engagements.map((x, j) => j === i ? { ...x, desc: ev.target.value } : x))} style={inp} /></div>
              <div className="admin-ops-actions" style={{ justifyContent: 'flex-end' }}>
                <GhostButton color="#dc2626" onClick={() => setEngagements(content.engagements.filter((_, j) => j !== i))}>{Icon.trash(12, '#dc2626')} Retirer</GhostButton>
              </div>
            </div>
          ))}
          <button type="button" className="admin-add-dashed" onClick={() => setEngagements([...content.engagements, { icon: 'leaf', title: 'Nouvel engagement', desc: '' }])}>
            {Icon.plus(14, 'var(--admin-forest)')} Ajouter un engagement
          </button>
        </div>
      )}

      {tab === 'testimonials' && (
        <div className="admin-content-stack">
          {content.testimonials.length === 0 && <EmptyState icon={Icon.mail(26, t.muted)} title="Aucun témoignage" subtitle="Ajoutez les avis de vos clients ; ils apparaîtront sur le site (si activés dans Visibilité)." />}
          {content.testimonials.map((tm, i) => (
            <div key={i} className="admin-content-card">
              <div><FieldLabel>Auteur</FieldLabel><Input value={tm.author} onChange={e => setTestimonials(content.testimonials.map((x, j) => j === i ? { ...x, author: e.target.value } : x))} style={inp} /></div>
              <div><FieldLabel>Témoignage</FieldLabel><Textarea rows={3} value={tm.text} onChange={e => setTestimonials(content.testimonials.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} style={inp} /></div>
              <div className="admin-ops-actions" style={{ justifyContent: 'flex-end' }}>
                <GhostButton color="#dc2626" onClick={() => setTestimonials(content.testimonials.filter((_, j) => j !== i))}>{Icon.trash(12, '#dc2626')} Retirer</GhostButton>
              </div>
            </div>
          ))}
          <button type="button" className="admin-add-dashed" onClick={() => setTestimonials([...content.testimonials, { author: 'Client', text: '' }])}>
            {Icon.plus(14, 'var(--admin-forest)')} Ajouter un témoignage
          </button>
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
      <div className="admin-page">
        <PageHeader title="Journal d'activité" subtitle="Les actions sensibles sont tracées ici." />
        <div className="admin-empty" style={{ marginTop: 16, fontSize: 14 }}>
          Connectez votre espace en ligne pour activer le journal.
        </div>
      </div>
    )
  }
  return (
    <div className="admin-page" style={{ maxWidth: 1120 }}>
      <PageHeader title="Journal d'activité" subtitle={`${filtered.length} / ${entries.length} action${entries.length > 1 ? 's' : ''}${hasFilters ? ' (filtré)' : ''}`} />
      <div className="admin-status-live" role="status" aria-live="polite">{loading ? 'Chargement du journal…' : ''}</div>
      <div className="admin-toolbar">
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher (acteur, cible, détail)…" aria-label="Rechercher dans le journal" style={{ ...inp, paddingLeft: 32, fontSize: 13, minHeight: 44 }} />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} aria-hidden="true">{Icon.search(14, t.muted)}</span>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger style={{ ...inp, width: 180, minHeight: 44 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actorFilter} onValueChange={setActorFilter}>
          <SelectTrigger style={{ ...inp, width: 180, minHeight: 44 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les utilisateurs</SelectItem>
            {actors.map(a => <SelectItem key={a} value={a}>{a === 'système' ? 'système' : a.split('@')[0]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="admin-toolbar">
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>Du <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp, width: 150, fontSize: 13, minHeight: 44 }} /></label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>Au <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inp, width: 150, fontSize: 13, minHeight: 44 }} /></label>
        {hasFilters && <GhostButton color={t.muted} onClick={resetFilters}>Réinitialiser les filtres</GhostButton>}
        <GhostButton color={t.primary} onClick={exportCsv} disabled={filtered.length === 0} style={{ marginLeft: 'auto' }}>Exporter CSV</GhostButton>
      </div>
      {loading ? <div className="admin-loading">Chargement…</div> :
        filtered.length === 0 ? <EmptyState icon={Icon.eye(26, t.muted)} title="Aucune entrée" subtitle="Les actions sensibles du panneau seront tracées ici." /> :
        <div className="admin-audit-list">
          {filtered.map(e => (
            <div key={e.id} className="admin-audit-row">
              <span className="admin-mono" style={{ opacity: 0.65 }}>{e.created_at ? dateFr(e.created_at) : ''}</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="admin-chip is-live">{e.action}</span>
                  <strong>{e.target || '—'}</strong>
                </div>
                {e.detail && <div className="admin-ops-meta" style={{ marginTop: 4 }}>{e.detail}</div>}
                <div className="admin-ops-meta" style={{ marginTop: 4 }}>par {actorName(e.actor)}{e.actor === (user?.email ?? '') ? ' (vous)' : ''}</div>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  )
}

function SettingsEditor() {
  const { content, setContent, theme: t, dataSource, saveContentFields, themeId, setThemeId, fontId, setFontId, visibility, setVisibility, rbacOverrides, setRbacOverridesState, saveRbac } = useSite()
  const { user } = useAuth()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [importStatus, setImportStatus] = useState<'idle' | 'busy' | 'ok' | 'error'>('idle')
  const [importErr, setImportErr] = useState<string | undefined>(undefined)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const identiteChargee = React.useRef(false)

  useEffect(() => {
    if (dataSource === 'loading' || identiteChargee.current) return
    let actif = true
    void fetchSetting(SETTING_KEYS.restaurant).then((res) => {
      if (!actif || !res.ok) return
      identiteChargee.current = true
      const identite = platDepuisRestaurant(res.data, {
        restaurantName: content.restaurantName,
        phone: content.phone,
        address: content.address,
        hours: content.hours,
        emailContact: content.emailContact,
        emailReservation: content.emailReservation,
        slogan: content.slogan,
      })
      setContent({
        ...content,
        restaurantName: identite.restaurantName ?? content.restaurantName,
        phone: identite.phone ?? content.phone,
        address: identite.address ?? content.address,
        hours: identite.hours ?? content.hours,
        emailContact: identite.emailContact ?? content.emailContact,
        emailReservation: identite.emailReservation ?? content.emailReservation,
      })
    })
    return () => { actif = false }
  }, [dataSource])

  const set = (k: string, v: string) => { setContent({ ...content, [k]: v }); setSaveStatus('idle'); setSaveErr(undefined) }
  const inp = inputStyle(t)
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving'); setSaveErr(undefined)
    /*
      Écriture PAR DOMAINE (plan P0) : identité, coordonnées, horaires, réseaux,
      destinataires. Rien d'autre — la sauvegarde ne peut plus écraser l'équipe
      ou les témoignages gérés par l'écran « Équipe & contenus ».
    */
    const res = await saveContentFields({
      restaurantName: content.restaurantName,
      currency: content.currency,
      phone: content.phone,
      address: content.address,
      hours: content.hours,
      socialFacebook: content.socialFacebook,
      socialInstagram: content.socialInstagram,
      socialWhatsapp: content.socialWhatsapp,
      emailContact: content.emailContact,
      emailReservation: content.emailReservation,
    })
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
    <div className="admin-page" style={{ maxWidth: 960 }}>
      <PageHeader title="Réglages du restaurant" subtitle="Identité et coordonnées, appliquées sur tout le site."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <nav className="admin-settings-toc" aria-label="Sommaire des réglages">
        <a href="#reglages-identite" className="admin-filter-chip" style={{ textDecoration: 'none' }}>Identité</a>
        <a href="#reglages-localisation" className="admin-filter-chip" style={{ textDecoration: 'none' }}>Localisation</a>
        <a href="#reglages-reseaux" className="admin-filter-chip" style={{ textDecoration: 'none' }}>Réseaux</a>
        <a href="#reglages-notifications" className="admin-filter-chip" style={{ textDecoration: 'none' }}>Notifications</a>
      </nav>
      <div style={{ display: 'grid', gap: 24, marginTop: 8 }}>
        <section id="reglages-identite" className="admin-settings-section">
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.primary}>Identité</SectionTitle></div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><FieldLabel>Nom du restaurant</FieldLabel><Input value={content.restaurantName} onChange={e => set('restaurantName', e.target.value)} style={inp} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><FieldLabel>Devise</FieldLabel><Input value={content.currency} onChange={e => set('currency', e.target.value)} style={inp} placeholder="FG" /></div>
              <div><FieldLabel>Téléphone</FieldLabel><Input value={content.phone} onChange={e => set('phone', e.target.value)} style={inp} /></div>
            </div>
          </div>
        </section>
        <section id="reglages-localisation" className="admin-settings-section">
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.accent}>Localisation & horaires</SectionTitle></div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><FieldLabel>Adresse</FieldLabel><Input value={content.address} onChange={e => set('address', e.target.value)} style={inp} /></div>
            <div><FieldLabel>Horaires d'ouverture</FieldLabel><Input value={content.hours} onChange={e => set('hours', e.target.value)} style={inp} /></div>
          </div>
        </section>
        <section id="reglages-reseaux" className="admin-settings-section">
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.gold}>Réseaux sociaux</SectionTitle></div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><FieldLabel>Facebook (URL)</FieldLabel><Input value={content.socialFacebook} onChange={e => set('socialFacebook', e.target.value)} style={inp} placeholder="https://facebook.com/..." /></div>
            <div><FieldLabel>Instagram (URL)</FieldLabel><Input value={content.socialInstagram} onChange={e => set('socialInstagram', e.target.value)} style={inp} placeholder="https://instagram.com/..." /></div>
            <div><FieldLabel>WhatsApp (numéro ou lien)</FieldLabel><Input value={content.socialWhatsapp} onChange={e => set('socialWhatsapp', e.target.value)} style={inp} placeholder="+224 ..." /></div>
          </div>
        </section>
        <section id="reglages-notifications" className="admin-settings-section">
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.accent}>Destinataires & notifications</SectionTitle></div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><FieldLabel>Destinataire — messages généraux</FieldLabel><Input value={content.emailContact} onChange={e => set('emailContact', e.target.value)} style={inp} placeholder="moelohimmara@gmail.com" /></div>
            <div><FieldLabel>Destinataire — réservations</FieldLabel><Input value={content.emailReservation} onChange={e => set('emailReservation', e.target.value)} style={inp} placeholder="moelohimmara@gmail.com" /></div>
            <div style={{ fontSize: '12px', color: t.muted, lineHeight: 1.5 }}>
              Chaque message, réservation ou commande du site notifie ces adresses, et le visiteur
              reçoit une auto-réponse (template dans « Formulaires & emails »).
            </div>
          </div>
        </section>
        <section className="admin-settings-section">
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.primary}>Sauvegarde & transfert</SectionTitle></div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <GhostButton color={t.primary} onClick={exportConfig}>{Icon.arrow(13, t.primary)} Exporter la configuration</GhostButton>
            <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={e => handleImport(e.target.files?.[0])} />
            <GhostButton color={t.accent} onClick={() => fileRef.current?.click()} disabled={importStatus === 'busy'}>{importStatus === 'busy' ? 'Import…' : 'Importer une configuration'}</GhostButton>
            {importStatus === 'ok' && <span className="admin-status-live is-ok" role="status">Importé</span>}
            {importStatus === 'error' && <span className="admin-status-live is-error" role="status" title={importErr}>{importErr}</span>}
          </div>
          <div style={{ fontSize: '12px', color: t.muted, marginTop: 10 }}>L'export contient le contenu, le thème, les polices et la visibilité. L'import remplace la configuration courante et l'enregistre dans Supabase.</div>
        </section>
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
  const location = useLocation()
  /*
    SAUT DEPUIS LE TABLEAU DE BORD : les cartes « À traiter » naviguent en
    écrivant /admin?module=… dans l'URL. Ici, on fait suivre : un changement
    de recherche met à jour le module actif — le restaurateur ne perd pas la page
    où il voulait aller. Sans cet effet, un lien par défaut ne placeholder
    jamais rien (défaut mesuré).
  */
  useEffect(() => {
    const m = new URLSearchParams(location.search).get('module')
    if (m) setActive(m)
  }, [location.search])
  const { user } = useAuth()
  const role = user?.role ?? 'guest'
  const effective = canAccessModule(active, role) ? active : 'dashboard'
  const readOnly = !canWriteModule(effective, role)
  const editeurPleinEcran = effective === 'content'
  const remplissageEditeur = editeurPleinEcran
    ? {
        position: 'absolute' as const,
        inset: 0,
        display: 'flex' as const,
        flexDirection: 'column' as const,
        overflow: 'hidden' as const,
      }
    : undefined
  return (
    <AdminShell active={effective} setActive={setActive}>
      <AnimatePresence mode="wait">
        <motion.div
          key={effective}
          initial={{ opacity: 0, y: editeurPleinEcran ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={remplissageEditeur}
        >
          {readOnly && effective !== 'dashboard' && <AccessBanner />}
          <div style={{
            position: 'relative',
            pointerEvents: readOnly && effective !== 'dashboard' ? 'none' : 'auto',
            ...remplissageEditeur,
          }}>
            {effective === 'dashboard' && <Dashboard />}
          {effective === 'messages' && <MessagesManager />}
          {effective === 'orders' && <OrdersManager />}
          {effective === 'reservations' && <ReservationsManager />}
          {effective === 'content' && (
            <PageEditorWrapper
              onQuitConsole={() => setActive('dashboard')}
              onOuvrirApparence={() => setActive('theme')}
            />
          )}
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
