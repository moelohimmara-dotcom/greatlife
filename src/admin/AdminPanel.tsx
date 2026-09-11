import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSite, type MediaSlot } from '@/contexts/SiteContext'
import { PageHeader, EmptyState, FieldLabel, inputStyle, GhostButton, PrimaryButton } from '@/admin/ui'
import { useAuth } from '@/contexts/AuthContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Icon } from '@/lib/icons'
import { MODULES, ROLES } from '@/data/rbac'
import { THEMES } from '@/config/themes'
import { FONTS } from '@/config/fonts'
import { BADGE_DEFS } from '@/config/badges'
import { upsertMenuItem, deleteMenuItem, fetchMessages, upsertBlogPost, deleteBlogPost, fetchReservations, updateReservationStatus, uploadMedia, deleteMedia, updateMediaSlot, upsertAdminUser, deleteAdminUser, type BlogPost, type Reservation } from '@/lib/repository'
import { invokeReplyEmail, invokeReservationStatusEmail, getSupabase } from '@/lib/supabase'
import { resizeImageFile, isResizableImage, RESIZE_PRESETS } from '@/lib/imageResize'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const NAV_GROUPS: [string, [string, string, string][]][] = [
  ['Pilotage', [
    ['dashboard', 'Tableau de bord', 'grid'],
    ['messages', 'Messages', 'mail'],
    ['reservations', 'Réservations', 'calendar'],
  ]],
  ['Contenu', [
    ['content', 'Contenu', 'write'],
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
  ]],
]

function AdminShell({ active, setActive, children }: { active: string; setActive: (s: string) => void; children: React.ReactNode }) {
  const { theme: t } = useSite()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileNav, setMobileNav] = useState(false)
  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }
  const go = (k: string) => { setActive(k); setMobileNav(false) }

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
              {items.map(([k, l, icon]) => {
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
        <div style={{ fontSize: '12px', fontWeight: 600, color: t.accent, marginBottom: '12px' }}>{user?.role === 'owner' ? 'Propriétaire' : 'Gérant'}</div>
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
  const { menu, messages, theme: t, dataSource, dataLoading, adminUsers } = useSite()
  const dsLabel = dataLoading ? 'Chargement…' : dataSource === 'supabase' ? 'Supabase connecté' : 'Mode démo (local)'
  const dsColor = dataSource === 'supabase' ? t.primary : t.muted
  const recentMessages = messages.slice(0, 4)
  return (
    <div>
      <PageHeader title="Tableau de bord" subtitle="Pilotez votre site en toute liberté."
        badge={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: `${dsColor}12`, border: `1px solid ${dsColor}33`, fontSize: '12px', fontWeight: 600, color: dsColor }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: dsColor }} /> {dsLabel}</span>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '16px', marginTop: '24px' }}>
        <DashCard label="Produits" value={menu.length} sub="toutes catégories" icon={Icon.leaf(20, t.primary)} color={t.primary} />
        <DashCard label="Messages" value={messages.length} sub="via formulaires" icon={Icon.mail(20, t.accent)} color={t.accent} />
        <DashCard label="Réservations" value={messages.length} sub="tables" icon={Icon.calendar(20, t.gold)} color={t.gold} />
        <DashCard label="Utilisateurs" value={adminUsers.length} sub="avec rôles" icon={Icon.users(20, t.primary)} color={t.primary} />
      </div>
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

function SaveBar({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  const { theme: t } = useSite()
  const label = status === 'saving' ? 'Enregistrement…' : status === 'saved' ? 'Enregistré ✓' : status === 'error' ? 'Échec de l\'enregistrement' : ''
  if (!label && status === 'idle') return null
  return (
    <span style={{ fontSize: '13px', fontWeight: 600, color: status === 'error' ? t.accent : status === 'saved' ? t.primary : t.muted }}>
      {label}
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

function ContentEditor() {
  const { content, setContent, theme: t, dataSource, saveContentToDb } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const set = (k: string, v: string) => { setContent({ ...content, [k]: v }); setSaveStatus('idle') }
  const inp = inputStyle(t)
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving')
    const ok = await saveContentToDb()
    setSaveStatus(ok ? 'saved' : 'error')
    setTimeout(() => setSaveStatus('idle'), 3000)
  }
  return (
    <div style={{ maxWidth: '760px' }}>
      <PageHeader title="Contenu du site" subtitle="Modifiez tous les textes. Les changements sont appliqués en direct."
        actions={<><SaveBar status={saveStatus} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <div style={{ display: 'grid', gap: '22px', marginTop: '24px' }}>
        <div>
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.primary}>Section d'accueil</SectionTitle></div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><FieldLabel>Slogan</FieldLabel><Input value={content.slogan} onChange={e => set('slogan', e.target.value)} style={inp} /></div>
            <div><FieldLabel>Titre principal (Hero)</FieldLabel><Input value={content.heroTitle} onChange={e => set('heroTitle', e.target.value)} style={inp} /></div>
            <div><FieldLabel>Sous-titre Hero</FieldLabel><Textarea rows={3} value={content.heroSub} onChange={e => set('heroSub', e.target.value)} style={inp} /></div>
          </div>
        </div>
        <div>
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.accent}>Section histoire</SectionTitle></div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><FieldLabel>Notre histoire</FieldLabel><Textarea rows={5} value={content.story} onChange={e => set('story', e.target.value)} style={inp} /></div>
          </div>
        </div>
        <div>
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.gold}>Coordonnées</SectionTitle></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><FieldLabel>Email contact</FieldLabel><Input value={content.emailContact} onChange={e => set('emailContact', e.target.value)} style={inp} /></div>
            <div><FieldLabel>Email réservation</FieldLabel><Input value={content.emailReservation} onChange={e => set('emailReservation', e.target.value)} style={inp} /></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MenuEditor() {
  const { menu, setMenu, theme: t, dataSource } = useSite()
  const [sel, setSel] = useState(menu[0]?.name ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [query, setQuery] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const item = menu.find(m => m.name === sel)
  const filtered = query.trim() ? menu.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.cat.toLowerCase().includes(query.toLowerCase())) : menu
  const grouped = filtered.reduce((acc, m) => { (acc[m.cat] = acc[m.cat] || []).push(m); return acc }, {} as Record<string, typeof menu>)
  const update = (k: string, v: string | boolean | string[]) => {
    const next = menu.map(m => m.name === sel ? { ...m, [k]: v } : m)
    setMenu(next)
    const updated = next.find(m => m.name === sel)
    if (updated && dataSource === 'supabase') {
      setSaveStatus('saving')
      upsertMenuItem(updated).then(ok => {
        setSaveStatus(ok ? 'saved' : 'error')
        setTimeout(() => setSaveStatus('idle'), 2000)
      })
    }
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
              {items.map(m => (
                <button key={m.name} onClick={() => setSel(m.name)} style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none',
                  background: sel === m.name ? `${t.primary}0d` : 'transparent',
                  color: sel === m.name ? t.primary : t.text, borderBottom: `1px solid ${t.shadow}`,
                }}>
                  {m.sig ? '★ ' : ''}{m.name} <span style={{ color: t.muted, fontWeight: 400, fontSize: 12 }}>· {m.price}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <button onClick={() => {
          const newItem = { cat: 'Burgers', name: `Nouveau produit ${menu.length + 1}`, sig: false, price: '0', desc: '', vertus: '', badges: [] }
          setMenu([...menu, newItem])
          if (dataSource === 'supabase') upsertMenuItem(newItem)
          setSel(newItem.name)
        }} style={{
          marginTop: 12, width: '100%', fontSize: '13px', fontWeight: 600, padding: '10px',
          borderRadius: 12, cursor: 'pointer', border: `1px dashed ${t.primary}55`,
          background: 'transparent', color: t.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>{Icon.plus(14, t.primary)} Ajouter un produit</button>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{item.name}</h3>
          <SaveBar status={saveStatus} />
        </div>
        <div style={{ display: 'grid', gap: 14, maxWidth: '560px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 14 }}>
            <div><FieldLabel>Nom</FieldLabel><Input value={item.name} onChange={e => update('name', e.target.value)} style={inp} /></div>
            <div><FieldLabel>Prix (FG)</FieldLabel><Input value={item.price} onChange={e => update('price', e.target.value)} style={inp} /></div>
          </div>
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
              <button onClick={() => {
                if (dataSource === 'supabase') deleteMenuItem(item.name)
                setMenu(menu.filter(m => m.name !== item.name))
                setSel(menu[0]?.name ?? '')
                setConfirmDel(false)
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
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving')
    const ok = await saveSiteConfigToDb()
    setSaveStatus(ok ? 'saved' : 'error')
    setTimeout(() => setSaveStatus('idle'), 3000)
  }
  return (
    <div style={{ maxWidth: '800px' }}>
      <PageHeader title="Thème & ambiance" subtitle="Choisissez une ambiance. Le site change en direct."
        actions={<><SaveBar status={saveStatus} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
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

const MEDIA_SLOTS: string[] = ['hero', 'logo', 'histoire', 'greatlife', 'general']
const SLOT_LABELS: Record<string, string> = {
  hero: 'Hero principal',
  logo: 'Logo / favicon',
  histoire: 'Fond section histoire',
  greatlife: 'Photo — Le Greatlife',
  general: 'Général / divers',
}
const SLOT_DIMS: Record<string, string> = {
  hero: '1920×1080',
  logo: '512×512',
  histoire: '1600×900',
  greatlife: '800×600',
  general: 'libre',
}

function formatSize(n: number | null | undefined): string {
  if (!n) return ''
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`
}

function MediaManager() {
  const { media, theme: t, dataSource, refreshMedia } = useSite()
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
      setStatus({ kind: 'ok', msg: `${res.data.filename} téléversé dans « ${SLOT_LABELS[res.data.slot] || res.data.slot} »${dims}.` })
      await refreshMedia()
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec du téléversement.' })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDelete = async (m: MediaSlot) => {
    if (!m.id) return
    setRemovingId(m.id)
    const ok = await deleteMedia(m.id, '')
    setRemovingId(null)
    if (ok) {
      setStatus({ kind: 'ok', msg: `${m.filename || 'Fichier'} supprimé.` })
      await refreshMedia()
    } else {
      setStatus({ kind: 'err', msg: 'Échec de la suppression.' })
    }
  }

  const handleSaveSlot = async (m: MediaSlot) => {
    if (!m.id) return
    const ok = await updateMediaSlot(m.id, editSlotValue)
    if (ok) {
      setEditSlotId(null)
      await refreshMedia()
      setStatus({ kind: 'ok', msg: 'Emplacement mis à jour.' })
    } else {
      setStatus({ kind: 'err', msg: 'Échec de la mise à jour.' })
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
                {MEDIA_SLOTS.map(s => (
                  <SelectItem key={s} value={s}>{SLOT_LABELS[s] || s} {SLOT_DIMS[s] ? `· ${SLOT_DIMS[s]}` : ''}</SelectItem>
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
                      {SLOT_LABELS[m.slot] || m.slot}
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
                            {MEDIA_SLOTS.map(s => (
                              <SelectItem key={s} value={s}>{SLOT_LABELS[s] || s}</SelectItem>
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
  const toggle = (k: string) => { setVisibility({ ...visibility, sections: { ...visibility.sections, [k]: !visibility.sections[k] } }); setSaveStatus('idle') }
  const toggleExtra = (k: string) => { setVisibility({ ...visibility, [k]: !visibility[k as keyof typeof visibility] } as typeof visibility); setSaveStatus('idle') }
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving')
    const ok = await saveSiteConfigToDb()
    setSaveStatus(ok ? 'saved' : 'error')
    setTimeout(() => setSaveStatus('idle'), 3000)
  }
  const rows: [string, string][] = [['home', 'Accueil'], ['carte', 'La carte'], ['histoire', 'Notre histoire'], ['engagements', 'Engagements'], ['equipe', 'Équipe'], ['localisation', 'Localisation'], ['contact', 'Contact'], ['blog', 'Blog']]
  return (
    <div style={{ maxWidth: '640px' }}>
      <PageHeader title="Visibilité" subtitle="Affichez ou masquez des éléments du site en un clic."
        actions={<><SaveBar status={saveStatus} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
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

function UsersRoles() {
  const { theme: t, dataSource, adminUsers, refreshAdminUsers } = useSite()
  const { user: currentUser } = useAuth()
  const cellStyle: React.CSSProperties = { padding: '10px 12px', fontSize: '12px', fontWeight: 500, textAlign: 'center' }
  const permColor = (p: string) => p === 'écrire' ? t.accent : p === 'lecture' || p === 'carte' || p === 'blog' ? t.primary : t.muted
  const permIcon = (p: string) => p === 'écrire' ? Icon.write(13, t.accent) : p === 'lecture' ? Icon.eye(13, t.primary) : p === 'carte' ? Icon.leaf(13, t.gold) : p === 'blog' ? Icon.write(13, t.primary) : '—'

  const isSupabase = dataSource === 'supabase'
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'err' | 'busy'; msg: string }>({ kind: 'idle', msg: '' })
  const [editing, setEditing] = useState<{ id?: string; email: string; name: string; role: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const inp = inputStyle(t)

  const startAdd = () => setEditing({ email: '', name: '', role: 'guest' })
  const startEdit = (u: { id: string; email: string; name: string; role: string }) =>
    setEditing({ id: u.id, email: u.email, name: u.name, role: u.role })

  const saveEdit = async () => {
    if (!editing) return
    if (!editing.email.trim() || !editing.name.trim()) {
      setStatus({ kind: 'err', msg: 'Email et nom requis.' }); return
    }
    setStatus({ kind: 'busy', msg: 'Enregistrement…' })
    const res = await upsertAdminUser({
      id: editing.id,
      email: editing.email.trim().toLowerCase(),
      name: editing.name.trim(),
      role: editing.role,
    })
    if (res.ok) {
      setEditing(null)
      await refreshAdminUsers()
      setStatus({ kind: 'ok', msg: editing.id ? 'Utilisateur modifié.' : 'Utilisateur ajouté.' })
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec.' })
    }
  }

  const remove = async (id: string, name: string) => {
    setBusyId(id)
    const res = await deleteAdminUser(id)
    setBusyId(null)
    if (res.ok) {
      await refreshAdminUsers()
      setStatus({ kind: 'ok', msg: `${name} supprimé.` })
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec de la suppression.' })
    }
  }

  const currentEmail = currentUser?.email?.toLowerCase()

  return (
    <div style={{ maxWidth: '920px' }}>
      <PageHeader title="Utilisateurs & rôles" subtitle="Permissions granulaires par module (voir / écrire / désactivé)."
        actions={<PrimaryButton onClick={startAdd} disabled={!isSupabase || !!editing}>{Icon.plus(14, '#fff')} Ajouter nouveau</PrimaryButton>}
      />

      {!isSupabase && (
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: `${t.gold || '#b8860b'}14`, color: t.heading, fontSize: 13, border: `1px solid ${t.primary}22` }}>
          Mode local — la gestion des utilisateurs nécessite une connexion Supabase.
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 10px' }}>
        <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '17px', fontWeight: 700, margin: 0 }}>Équipe</h3>
        <span style={{ fontSize: '12px', fontWeight: 600, color: t.muted, background: t.surfaceAlt, padding: '3px 10px', borderRadius: 100 }}>{adminUsers.length}</span>
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
              <Input value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} style={inp} placeholder="email@greatlife.gn" disabled={!!editing.id} />
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
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: t.surface, border: `1px solid ${t.shadow}`, borderRadius: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{u.name} <span style={{ color: t.muted, fontWeight: 400 }}>· {u.email}{isSelf ? ' (vous)' : ''}</span></span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, background: `${t.primary}12`, color: t.primary }}>{role.name}</span>
                <GhostButton color={t.primary} disabled={!isSupabase || busyId === u.id} onClick={() => startEdit(u)}>Modifier</GhostButton>
                <GhostButton color="#dc2626" disabled={!isSupabase || isSelf || busyId === u.id} onClick={() => remove(u.id, u.name)}>{busyId === u.id ? '…' : 'Supprimer'}</GhostButton>
              </div>
            </div>
          )
        })
      )}

      <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '16px', fontWeight: 700, margin: '24px 0 10px' }}>Matrice des permissions</h3>
      <div style={{ overflowX: 'auto', borderRadius: 14, border: `1px solid ${t.shadow}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: t.surface }}>
          <thead>
            <tr style={{ background: t.surfaceAlt }}>
              <th style={{ ...cellStyle, textAlign: 'left', paddingLeft: 16, color: t.heading }}>Rôle</th>
              {MODULES.map(m => <th key={m} style={{ ...cellStyle, color: t.heading }}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {ROLES.map(r => (
              <tr key={r.id} style={{ borderTop: `1px solid ${t.shadow}` }}>
                <td style={{ ...cellStyle, textAlign: 'left', paddingLeft: 16, color: t.heading, fontWeight: 600 }}>{r.name}</td>
                {MODULES.map(m => <td key={m} style={{ ...cellStyle, color: permColor(r.perms[m] || '—') }}>{permIcon(r.perms[m] || '—')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BlogEditor() {
  const { blogPosts, setBlogPosts, theme: t, dataSource } = useSite()
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const inp = inputStyle(t)

  const save = async () => {
    if (!editing) return
    setSaveStatus('saving')
    if (dataSource === 'supabase') {
      const ok = await upsertBlogPost(editing)
      setSaveStatus(ok ? 'saved' : 'error')
      if (ok) {
        setBlogPosts(prev => {
          const exists = prev.find(p => p.id === editing.id)
          if (exists) return prev.map(p => p.id === editing.id ? editing : p)
          return [editing, ...prev]
        })
      }
    } else {
      setSaveStatus('saved')
    }
    setTimeout(() => setSaveStatus('idle'), 3000)
  }

  const remove = async (post: BlogPost) => {
    if (post.id && dataSource === 'supabase') deleteBlogPost(post.id)
    setBlogPosts(prev => prev.filter(p => p.id !== post.id))
  }

  return (
    <div style={{ maxWidth: '780px' }}>
      <PageHeader title="Blog" subtitle="Rédigez et publiez des articles."
        actions={<PrimaryButton onClick={() => setEditing({ title: '', excerpt: '', body: '', category: 'Actualités', published: false })}>{Icon.plus(14, '#fff')} Nouvel article</PrimaryButton>}
      />
      {editing && (
        <OrganicCard style={{ marginTop: 20, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '18px', fontWeight: 700, margin: 0 }}>{editing.id ? 'Modifier l\'article' : 'Nouvel article'}</h3>
            <button onClick={() => setEditing(null)} style={{ fontSize: '13px', fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{Icon.x(14, t.muted)} Fermer</button>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 14 }}>
              <div><FieldLabel>Titre</FieldLabel><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} style={inp} /></div>
              <div><FieldLabel>Catégorie</FieldLabel><Input value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} style={inp} /></div>
            </div>
            <div><FieldLabel>Extrait</FieldLabel><Textarea rows={2} value={editing.excerpt} onChange={e => setEditing({ ...editing, excerpt: e.target.value })} style={inp} /></div>
            <div><FieldLabel>Contenu</FieldLabel><Textarea rows={6} value={editing.body} onChange={e => setEditing({ ...editing, body: e.target.value })} style={inp} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', fontWeight: 500, color: t.text }}>
              <Switch checked={editing.published} onCheckedChange={v => setEditing({ ...editing, published: v })} /> Publier sur le site
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <PrimaryButton onClick={save}>Enregistrer</PrimaryButton>
              <SaveBar status={saveStatus} />
            </div>
          </div>
        </OrganicCard>
      )}
      <div style={{ marginTop: 24 }}>
        {blogPosts.length === 0 && <EmptyState icon={Icon.write(26, t.muted)} title="Aucun article" subtitle="Cliquez sur « Nouvel article » pour commencer." />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {blogPosts.map(post => (
            <OrganicCard key={post.id} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: t.muted, background: t.surfaceAlt, padding: '3px 9px', borderRadius: 100 }}>{post.category}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: post.published ? `${t.primary}15` : t.surfaceAlt, color: post.published ? t.primary : t.muted }}>{post.published ? 'Publié' : 'Brouillon'}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: t.heading, lineHeight: 1.3 }}>{post.title || 'Sans titre'}</div>
              <div style={{ fontSize: '13px', color: t.muted, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.excerpt || 'Aucun extrait'}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <GhostButton color={t.primary} onClick={() => setEditing(post)}>Modifier</GhostButton>
                <GhostButton color="#dc2626" onClick={() => remove(post)}>{Icon.trash(12, '#dc2626')} Supprimer</GhostButton>
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
  const set = (k: string, v: string) => { setContent({ ...content, [k]: v }); setSaveStatus('idle') }
  const inp = inputStyle(t)
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving')
    const ok = await saveContentToDb()
    setSaveStatus(ok ? 'saved' : 'error')
    setTimeout(() => setSaveStatus('idle'), 3000)
  }
  return (
    <div style={{ maxWidth: '700px' }}>
      <PageHeader title="Formulaires & emails" subtitle="Configurez les destinataires et l'auto-réponse."
        actions={<><SaveBar status={saveStatus} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
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
  const inp = inputStyle(t)

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
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
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

  const toggleHandled = async () => {
    if (!selected) return
    setHandling(true)
    await markMessageHandled(selected.id ?? '', !selected.handled)
    setHandling(false)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 16 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: live ? t.primary : t.muted, animation: live ? 'pulse 2s infinite' : 'none' }} />
          <span style={{ fontSize: '12px', color: t.muted, fontWeight: 500 }}>{live ? 'Temps réel' : 'Actualisation périodique'}</span>
          {newCount > 0 && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: t.accent, color: '#fff', marginLeft: 'auto' }}>{newCount} nouveau{newCount > 1 ? 'x' : ''}</span>}
        </div>
        {messages.length === 0 ? (
          <EmptyState icon={Icon.mail(26, t.muted)} title="Aucun message" subtitle="Les soumissions du formulaire apparaîtront ici." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {messages.map((m, i) => (
              <button key={i} onClick={() => { setSelectedIdx(i); setReplyText(''); setSending('idle') }} style={{
                textAlign: 'left', padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                border: selectedIdx === i ? `2px solid ${t.primary}` : `1px solid ${t.shadow}`,
                background: selectedIdx === i ? `${t.primary}08` : (m.handled ? t.surfaceAlt : t.surface),
                transition: 'all 0.2s', position: 'relative',
              }}>
                {!m.handled && <span style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', background: t.accent }} />}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: t.heading }}>{m.nom} {m.handled && <span style={{ fontSize: '10px', color: t.primary, marginLeft: 6 }}>{Icon.check(10, t.primary)}</span>}</span>
                  <span style={{ fontSize: '11px', color: t.muted }}>{m.date}</span>
                </div>
                <div style={{ fontSize: '12px', color: t.accent, fontWeight: 600, marginTop: '2px' }}>{m.sujet}</div>
                <div style={{ fontSize: '13px', color: t.muted, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message}</div>
              </button>
            ))}
          </div>
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
            <div style={{ display: 'flex', gap: 8 }}>
              {selected.handled && <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', background: `${t.primary}15`, color: t.primary }}>✓ Traité</span>}
              <button onClick={toggleHandled} disabled={handling} style={{
                fontSize: '12px', fontWeight: 600, padding: '7px 14px', borderRadius: '10px', cursor: 'pointer',
                border: `1px solid ${selected.handled ? t.primary : t.shadow}`, background: selected.handled ? `${t.primary}0d` : 'transparent', color: selected.handled ? t.primary : t.muted,
              }}>{selected.handled ? '✓ Traité' : 'Marquer traité'}</button>
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
          <div>
            <FieldLabel>Votre réponse</FieldLabel>
            <Textarea rows={5} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Tapez votre réponse au client…" style={inp} />
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

function ReservationsManager() {
  const { theme: t, dataSource } = useSite()
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
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reservations' }, refresh)
        .subscribe()
      timer = setInterval(refresh, 60000)
    } else {
      timer = setInterval(refresh, 30000)
    }
    return () => { active = false; if (channel) channel.unsubscribe(); if (timer) clearInterval(timer) }
  }, [dataSource])
  const statusColor: Record<string, string> = { pending: t.accent, confirmed: t.primary, cancelled: t.muted }
  const statusLabel: Record<string, string> = { pending: 'En attente', confirmed: 'Confirmée', cancelled: 'Annulée' }
  const [filter, setFilter] = useState<string>('all')
  const filteredResa = filter === 'all' ? reservations : reservations.filter(r => r.status === filter)
  const counts = { all: reservations.length, pending: reservations.filter(r => r.status === 'pending').length, confirmed: reservations.filter(r => r.status === 'confirmed').length, cancelled: reservations.filter(r => r.status === 'cancelled').length }
  const [statusSending, setStatusSending] = useState(false)
  const updateStatus = async (id: string, status: string) => {
    const ok = await updateReservationStatus(id, status)
    if (!ok) return
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    const r = reservations.find(x => x.id === id)
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
  return (
    <div style={{ maxWidth: '840px' }}>
      <PageHeader title="Réservations" subtitle={`${reservations.length} réservation${reservations.length > 1 ? 's' : ''} · actualisation auto`} />
      {loading ? <div style={{ marginTop: 20, color: t.muted, fontSize: 14 }}>Chargement…</div> :
        reservations.length === 0 ? <div style={{ marginTop: 20 }}><EmptyState icon={Icon.calendar(28, t.muted)} title="Aucune réservation" subtitle="Les demandes de table apparaîtront ici." /></div> :
        <>
        <div style={{ display: 'flex', gap: 6, marginTop: 18, flexWrap: 'wrap' }}>
          {([['all', 'Toutes'], ['pending', 'En attente'], ['confirmed', 'Confirmées'], ['cancelled', 'Annulées']] as [string, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              fontSize: '12.5px', fontWeight: 600, padding: '7px 14px', borderRadius: 100, cursor: 'pointer', border: `1px solid ${filter === k ? t.primary : t.shadow}`,
              background: filter === k ? t.primary : 'transparent', color: filter === k ? '#fff' : t.muted, transition: 'all 0.15s',
            }}>{l} <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts[k as keyof typeof counts]}</span></button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {filteredResa.length === 0 ? <p style={{ color: t.muted, fontSize: 14, padding: '20px 0' }}>Aucune réservation dans ce filtre.</p> :
          filteredResa.map(r => (
            <OrganicCard key={r.id} style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: t.heading }}>{r.nom} <span style={{ fontSize: '13px', color: t.muted, fontWeight: 400 }}>· {r.guests} personne{r.guests > 1 ? 's' : ''}</span></div>
                  <div style={{ fontSize: '13px', color: t.muted, marginTop: 4 }}>
                    {r.date} à {r.time} · {r.email}{r.phone ? ` · ${r.phone}` : ''}
                  </div>
                  {r.message && <div style={{ fontSize: '13px', color: t.text, marginTop: 8, whiteSpace: 'pre-wrap' }}>{r.message}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', background: `${statusColor[r.status]}15`, color: statusColor[r.status] }}>{statusLabel[r.status]}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {statusSending && <span style={{ fontSize: '10px', color: t.muted }}>Envoi notif…</span>}
                    {r.status !== 'confirmed' && <button onClick={() => updateStatus(r.id!, 'confirmed')} style={{ fontSize: '11px', fontWeight: 600, padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${t.primary}44`, background: 'transparent', color: t.primary }}>Confirmer</button>}
                    {r.status !== 'pending' && <button onClick={() => updateStatus(r.id!, 'pending')} style={{ fontSize: '11px', fontWeight: 600, padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${t.muted}44`, background: 'transparent', color: t.muted }}>En attente</button>}
                    {r.status !== 'cancelled' && <button onClick={() => updateStatus(r.id!, 'cancelled')} style={{ fontSize: '11px', fontWeight: 600, padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${t.accent}44`, background: 'transparent', color: t.accent }}>Annuler</button>}
                  </div>
                </div>
              </div>
            </OrganicCard>
          ))}
        </div>
        </>
      }
    </div>
  )
}

export function Admin() {
  const [active, setActive] = useState('dashboard')
  return (
    <AdminShell active={active} setActive={setActive}>
      <AnimatePresence mode="wait">
        <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
          {active === 'dashboard' && <Dashboard />}
          {active === 'messages' && <MessagesManager />}
          {active === 'reservations' && <ReservationsManager />}
          {active === 'content' && <ContentEditor />}
          {active === 'menu' && <MenuEditor />}
          {active === 'theme' && <ThemeEditor />}
          {active === 'blog' && <BlogEditor />}
          {active === 'media' && <MediaManager />}
          {active === 'visibility' && <VisibilityEditor />}
          {active === 'users' && <UsersRoles />}
          {active === 'forms' && <FormsConfig />}
        </motion.div>
      </AnimatePresence>
    </AdminShell>
  )
}
