import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { formePastille, ESPACE, HAUTEUR, HAUTEUR_ETAT } from '@/admin/ui'
import { lireNavPref, ecrireNavPref, type AdminNavPref } from '@/admin/admin-nav'
import '@/admin/console.css'
import { Icon } from '@/lib/icons'
import { canAccessModule, ROLE_LABELS } from '@/data/rbac'
import { Bouton } from '@/admin/editor/chrome'
import {
  NAV_GROUPS,
  MOBILE_TAB_KEYS,
  MOBILE_TAB_LABELS,
  MOBILE_MORE_KEYS,
  MOBILE_MORE_LABELS,
  pathForModule,
  moduleFromPathname,
  type AdminModuleKey,
} from '@/admin/routes'

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

export function AdminShell() {
  const { theme: t, rootStyle, unhandledMessagesCount, pendingOrdersCount, pendingReservationsCount, dataSource, dataLoading } = useSite()
  const { user, logout, roleNotice, dismissRoleNotice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const active = moduleFromPathname(location.pathname)
  const [mobileNav, setMobileNav] = useState(false)
  const [plusOpen, setPlusOpen] = useState(false)
  const [navPref, setNavPref] = useState<AdminNavPref>(lireNavPref)
  const [editorRail, setEditorRail] = useState(() => lireNavPref() === 'rail')
  const menuToggleRef = useRef<HTMLButtonElement>(null)
  const drawerPanelRef = useRef<HTMLDivElement>(null)
  const focusAvantTiroir = useRef<HTMLElement | null>(null)
  const editorFocus = active === 'content'
  const editorHidesNav = editorFocus && !editorRail
  const rail = editorFocus || navPref === 'rail'
  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }
  const go = (k: AdminModuleKey) => {
    navigate(pathForModule(k))
    setMobileNav(false)
    setPlusOpen(false)
  }
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
    const onChange = () => {
      if (!mq.matches) {
        setMobileNav(false)
        setPlusOpen(false)
      }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

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

  useEffect(() => {
    if (!plusOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setPlusOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [plusOpen])

  const toggleNav = useCallback(() => {
    if (menuEstMobile()) {
      setPlusOpen(false)
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
      {!compact && (
        <button type="button" className="admin-wf-shell-switcher" title="Restaurant">
          <span className="admin-wf-shell-switcher-avatar" aria-hidden="true">GL</span>
          <span className="admin-wf-shell-switcher-copy">
            <strong>Greatlife</strong>
            <small>Restaurant principal</small>
          </span>
        </button>
      )}
      <nav aria-label="Navigation de la console" style={{ marginTop: compact ? 16 : 16, display: 'flex', flexDirection: 'column', gap: compact ? 12 : 18, flex: 1, overflow: 'auto', minHeight: 0 }}>
        {NAV_GROUPS.map(([groupLabel, items]) => (
          <div key={groupLabel}>
            <div
              className="admin-nav-group"
              style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-on-ink-soft)', marginBottom: 8, paddingLeft: 4 }}
            >{groupLabel}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: ESPACE, alignItems: compact ? 'center' : undefined }}>
              {items.filter(([k]) => canAccessModule(k, user?.role ?? '')).map(([k, l, icon]) => (
                <NavLink
                  key={k}
                  to={pathForModule(k)}
                  end={k === 'dashboard'}
                  title={l}
                  onClick={() => setMobileNav(false)}
                  aria-label={NOTIF[k] > 0 ? `${l}, ${NOTIF[k]} en attente` : l}
                  className={({ isActive }) => `admin-nav-item${isActive ? ' is-active' : ''}${compact ? ' is-compact' : ''}`}
                  style={({ isActive }) => ({
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: compact ? 'center' : 'flex-start',
                    gap: ESPACE,
                    boxSizing: 'border-box',
                    width: compact ? HAUTEUR : '100%',
                    minHeight: HAUTEUR,
                    padding: compact ? 0 : '0 12px',
                    borderRadius: 12,
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    background: isActive ? 'var(--admin-forest)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--admin-forest)' : 'transparent'}`,
                    color: isActive ? 'var(--admin-on-ink)' : 'var(--admin-on-ink-muted)',
                  })}
                >
                  {({ isActive }) => (
                    <>
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
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="admin-nav-foot" style={{ borderTop: '1px solid var(--admin-rail-line)', paddingTop: '14px', display: 'flex', flexDirection: 'column', alignItems: compact ? 'center' : undefined, gap: 10 }}>
        {!compact && (
          <Bouton
            etendu
            genre="secondaire"
            onClick={() => window.open('/', '_blank', 'noopener,noreferrer')}
            aria-label="Voir le site public"
            style={{
              justifyContent: 'flex-start',
              background: 'transparent',
              borderColor: 'var(--admin-rail-border-soft)',
              color: 'var(--admin-on-ink)',
              width: '100%',
            }}
          >
            Voir le site
          </Bouton>
        )}
        {!compact && (
          <>
            <strong style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-on-ink)' }}>{user?.name}</strong>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-lime)', marginBottom: '4px' }}>{ROLE_LABELS[user?.role ?? 'guest'] ?? user?.role}</div>
          </>
        )}
        <div className="admin-profile-actions" style={{ display: 'flex', flexDirection: compact ? 'column' : 'row', gap: ESPACE, width: compact ? undefined : '100%' }}>
          <Bouton
            etendu={!compact}
            carre={compact}
            genre="secondaire"
            onClick={() => go('settings')}
            title="Réglages"
            aria-label="Ouvrir les réglages"
            style={{
              justifyContent: compact ? 'center' : undefined,
              background: 'transparent',
              borderColor: 'var(--admin-rail-border-soft)',
              color: 'var(--admin-on-ink)',
              flex: compact ? undefined : 1,
            }}
          >
            {!compact && 'Réglages'}
            {compact && <span aria-hidden="true">{Icon.settings(16, 'var(--admin-on-ink)')}</span>}
          </Bouton>
          <Bouton
            etendu={!compact}
            carre={compact}
            genre="danger"
            onClick={handleLogout}
            title="Déconnexion"
            aria-label="Se déconnecter"
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
  const navItems = NAV_GROUPS.flatMap(([, items]) => items)
  const role = user?.role ?? ''
  const mobileTabs = MOBILE_TAB_KEYS
    .map((k) => {
      const found = navItems.find(([key]) => key === k)
      return found && canAccessModule(k, role) ? found : null
    })
    .filter((x): x is [AdminModuleKey, string, string] => Boolean(x))
  const mobileMore = MOBILE_MORE_KEYS
    .map((k) => {
      const found = navItems.find(([key]) => key === k)
      return found && canAccessModule(k, role) ? found : null
    })
    .filter((x): x is [AdminModuleKey, string, string] => Boolean(x))
  const showPlus = mobileMore.length > 0
  const plusHighlighted = showPlus && !MOBILE_TAB_KEYS.includes(active)
  const radioCols = mobileTabs.length + (showPlus ? 1 : 0)
  const openPlus = () => {
    setMobileNav(false)
    setPlusOpen(true)
  }
  const closePlus = () => setPlusOpen(false)

  return (
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
              <div className="admin-topbar-service">
                <div className="admin-topbar-crumb" aria-label="Fil d’Ariane">
                  Greatlife
                  <span aria-hidden="true">{Icon.chevronRight(14, 'var(--admin-ink)')}</span>
                  <strong>
                    {NAV_GROUPS.flatMap(([, items]) => items).find(([k]) => k === active)?.[1]
                      ?? 'Console'}
                  </strong>
                </div>
                <span className={`admin-chip${dataSource === 'supabase' ? ' is-live' : ''}`}>
                  <i aria-hidden="true" />
                  {dataLoading ? 'Mise à jour…' : dataSource === 'supabase' ? 'En ligne' : 'Aperçu local'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
                <label className="admin-wf-top-search">
                  <span aria-hidden="true">{Icon.search(14, 'currentColor')}</span>
                  <input
                    type="search"
                    placeholder="Rechercher…"
                    aria-label="Rechercher dans la console"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      const q = (e.currentTarget.value || '').trim().toLowerCase()
                      if (!q) return
                      if (q.includes('commande')) go('orders')
                      else if (q.includes('résa') || q.includes('resa') || q.includes('reservation')) go('reservations')
                      else if (q.includes('message') || q.includes('mail')) go('messages')
                      else if (q.includes('carte') || q.includes('plat') || q.includes('menu')) go('menu')
                      else if (q.includes('média') || q.includes('media') || q.includes('image')) go('media')
                      else if (q.includes('site') || q.includes('page') || q.includes('éditeur') || q.includes('editeur')) go('content')
                      else go('dashboard')
                    }}
                  />
                </label>
                <Bouton
                  genre="secondaire"
                  onClick={() => window.open('/', '_blank', 'noopener,noreferrer')}
                  aria-label="Voir le site public"
                  style={{ borderColor: 'var(--admin-line)', background: 'var(--admin-surface)' }}
                >
                  Voir le site
                </Bouton>
                <button
                  type="button"
                  className="admin-topbar-account"
                  onClick={() => go('settings')}
                  title="Compte et réglages"
                  aria-label={`Compte ${user?.name ?? 'administrateur'}, ouvrir les réglages`}
                >
                  <span className="admin-topbar-account-avatar" aria-hidden="true">
                    {(user?.name || user?.email || 'GL').slice(0, 2).toUpperCase()}
                  </span>
                  <span className="admin-topbar-account-copy">
                    <strong>{user?.name || 'Compte'}</strong>
                    <small>{ROLE_LABELS[user?.role ?? 'guest'] ?? user?.role}</small>
                  </span>
                </button>
              </div>
            </div>
          )}
          {roleNotice && (
            <div key={roleNotice.id} role="status" aria-live="polite" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 60, maxWidth: 'min(92vw, 560px)', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--admin-line)', background: 'var(--admin-surface)', boxShadow: 'var(--admin-shadow)', fontSize: '13px', fontWeight: 500, color: 'var(--admin-ink)' }}>
              <span style={{ display: 'inline-flex', color: 'var(--admin-forest)' }}>{Icon.check(18, 'var(--admin-forest)')}</span>
              <span style={{ flex: 1 }}>{roleNotice.msg}</span>
              <Bouton carre genre="silencieux" aria-label="Fermer" onClick={dismissRoleNotice}>×</Bouton>
            </div>
          )}
          <Outlet />
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
      {plusOpen && showPlus && (
        <div role="dialog" aria-modal="true" aria-label="Plus de modules" className="admin-plus-sheet">
          <button
            type="button"
            className="admin-plus-sheet-backdrop"
            aria-label="Fermer"
            onClick={closePlus}
          />
          <div id="admin-plus-sheet-panel" className="admin-plus-sheet-panel">
            <div className="admin-plus-sheet-head">
              <strong>Plus</strong>
              <button type="button" className="admin-plus-sheet-close" aria-label="Fermer" onClick={closePlus}>
                <span aria-hidden="true">{Icon.x(18, 'var(--admin-on-ink)')}</span>
              </button>
            </div>
            <nav aria-label="Modules hors radio" className="admin-plus-sheet-list">
              {mobileMore.map(([k, l, icon]) => {
                const label = MOBILE_MORE_LABELS[k] ?? l
                const isActive = active === k
                return (
                  <NavLink
                    key={k}
                    to={pathForModule(k)}
                    onClick={closePlus}
                    aria-label={label}
                    className={isActive ? 'is-active' : undefined}
                  >
                    <span aria-hidden="true">{Icon[icon](18, isActive ? 'var(--admin-on-ink)' : 'var(--admin-on-ink-muted)')}</span>
                    <span>{label}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>
        </div>
      )}
      {!editorFocus && mobileTabs.length > 0 && (
        <nav
          className="admin-bottom-nav"
          aria-label="Radio de service"
          style={{ ['--admin-radio-cols' as string]: String(Math.max(radioCols, 1)) }}
        >
          {mobileTabs.map(([k, l, icon]) => {
            const count = NOTIF[k] ?? 0
            const label = MOBILE_TAB_LABELS[k] ?? l
            return (
              <NavLink
                key={k}
                to={pathForModule(k)}
                end={k === 'dashboard'}
                aria-label={count > 0 ? `${label}, ${count} en attente` : label}
                className={({ isActive }) => isActive ? 'is-active' : undefined}
                style={{ textDecoration: 'none' }}
                onClick={() => setPlusOpen(false)}
              >
                {({ isActive }) => (
                  <>
                    <span className="admin-bottom-icon" aria-hidden="true">
                      {Icon[icon](18, isActive ? 'var(--admin-on-ink)' : 'var(--admin-on-ink-muted)')}
                      {count > 0 && (
                        <span className="admin-bottom-badge">{count > 9 ? '9+' : count}</span>
                      )}
                    </span>
                    <span className="admin-bottom-label">{label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
          {showPlus && (
            <button
              type="button"
              className={plusHighlighted || plusOpen ? 'is-active' : undefined}
              aria-label="Plus de modules"
              aria-expanded={plusOpen}
              aria-controls="admin-plus-sheet-panel"
              onClick={() => (plusOpen ? closePlus() : openPlus())}
            >
              <span className="admin-bottom-icon" aria-hidden="true">
                {Icon.more(18, plusHighlighted || plusOpen ? 'var(--admin-on-ink)' : 'var(--admin-on-ink-muted)')}
                {plusHighlighted && !plusOpen && <span className="admin-bottom-dot" />}
              </span>
              <span className="admin-bottom-label">Plus</span>
            </button>
          )}
        </nav>
      )}
    </div>
  )
}
