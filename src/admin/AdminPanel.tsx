import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Icon } from '@/lib/icons'
import { CATEGORY_ORDER } from '@/data/menu'
import { USERS } from '@/data/users'
import { MODULES, ROLES } from '@/data/rbac'
import { THEMES } from '@/config/themes'
import { FONTS } from '@/config/fonts'
import { BADGE_DEFS } from '@/config/badges'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

function AdminShell({ active, setActive, children }: { active: string; setActive: (s: string) => void; children: React.ReactNode }) {
  const { theme: t } = useSite()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navItems: [string, string][] = [
    ['dashboard', 'Tableau de bord'], ['content', 'Contenu'], ['menu', 'Carte & prix'],
    ['theme', 'Thème & ambiance'], ['media', 'Médias'], ['visibility', 'Visibilité'],
    ['users', 'Utilisateurs & rôles'], ['forms', 'Formulaires & emails'],
  ]
  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', minHeight: '100vh', background: t.bg }}>
      <aside style={{ background: t.surface, borderRight: `1px solid ${t.shadow}`, padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
        <Link to="/" style={{ fontFamily: 'var(--f-heading)', fontWeight: 700, fontSize: '22px', color: t.heading, textDecoration: 'none', letterSpacing: '-0.02em' }}>
          Great<span style={{ color: t.accent }}>life</span> <span style={{ fontSize: '11px', color: t.muted, fontWeight: 500 }}>admin</span>
        </Link>
        <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navItems.map(([k, l]) => (
            <button key={k} onClick={() => setActive(k)} style={{
              textAlign: 'left', padding: '11px 14px', borderRadius: '12px',
              fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none',
              background: active === k ? t.primary : 'transparent',
              color: active === k ? '#fff' : t.text,
              transition: 'background 0.2s',
            }}>{l}</button>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${t.shadow}`, paddingTop: '16px' }}>
          <div style={{ fontSize: '11px', color: t.muted, marginBottom: '2px' }}>Connecté en tant que</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: t.heading }}>{user?.name}</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: t.accent, marginBottom: '12px' }}>{user?.role === 'owner' ? 'Propriétaire' : 'Gérant'}</div>
          <button onClick={handleLogout} style={{
            width: '100%', fontSize: '13px', fontWeight: 600, padding: '9px',
            borderRadius: '10px', cursor: 'pointer',
            border: `1px solid ${t.accent}44`, background: 'transparent', color: t.accent,
            display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center',
          }}>{Icon.logout(14)} Déconnexion</button>
          <Link to="/" style={{ display: 'block', marginTop: '10px', fontSize: '12px', fontWeight: 500, color: t.primary, textAlign: 'center', textDecoration: 'none' }}>← Voir le site</Link>
        </div>
      </aside>
      <main style={{ padding: '32px 36px', overflow: 'auto' }}>{children}</main>
    </div>
  )
}

function DashCard({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  const { theme: t } = useSite()
  return (
    <OrganicCard style={{ padding: '24px' }}>
      <div style={{ fontSize: '12px', color: t.muted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: 'var(--f-heading)', fontSize: '32px', fontWeight: 700, color: t.heading, margin: '4px 0', letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: '12px', color: t.muted }}>{sub}</div>
    </OrganicCard>
  )
}

function Dashboard() {
  const { menu, messages, theme: t } = useSite()
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '28px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Tableau de bord</h2>
      <p style={{ color: t.muted, marginTop: 0, fontSize: '14px' }}>Bienvenue Mister Marcket. Pilotez votre site en toute liberté.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '16px', marginTop: '24px' }}>
        <DashCard label="Produits dans la carte" value={menu.length} sub="toutes catégories" />
        <DashCard label="Messages reçus" value={messages.length} sub="via formulaires" />
        <DashCard label="Catégories actives" value={CATEGORY_ORDER.length} sub="burgers, wraps, salades…" />
        <DashCard label="Utilisateurs" value={USERS.length} sub="avec rôles attribués" />
      </div>
      <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '18px', fontWeight: 700, margin: '28px 0 12px', letterSpacing: '-0.02em' }}>Messages récents</h3>
      {messages.length === 0 ? <p style={{ color: t.muted, fontSize: '14px' }}>Aucun message pour l'instant. Les soumissions du formulaire de contact apparaissent ici.</p> :
        messages.map((m, i) => (
          <OrganicCard key={i} style={{ padding: '16px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: t.heading }}>
              <span>{m.nom} — {m.email}</span><span style={{ color: t.muted, fontWeight: 400 }}>{m.date}</span>
            </div>
            <div style={{ fontSize: '11px', color: t.accent, fontWeight: 600, marginTop: '3px' }}>{m.sujet}</div>
            <p style={{ fontSize: '13px', color: t.text, margin: '8px 0 0' }}>{m.message}</p>
          </OrganicCard>
        ))}
    </div>
  )
}

function ContentEditor() {
  const { content, setContent, theme: t } = useSite()
  const set = (k: string, v: string) => setContent({ ...content, [k]: v })
  const inputStyle: React.CSSProperties = { background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: t.text, width: '100%' }
  return (
    <div style={{ maxWidth: '720px' }}>
      <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Contenu du site</h2>
      <p style={{ color: t.muted, fontSize: '14px', marginTop: 0 }}>Modifiez tous les textes. Les changements sont appliqués en direct.</p>
      <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
        <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Slogan</Label><Input value={content.slogan} onChange={e => set('slogan', e.target.value)} style={inputStyle} /></div>
        <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Titre Hero</Label><Input value={content.heroTitle} onChange={e => set('heroTitle', e.target.value)} style={inputStyle} /></div>
        <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Sous-titre Hero</Label><Textarea rows={3} value={content.heroSub} onChange={e => set('heroSub', e.target.value)} style={inputStyle} /></div>
        <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Notre histoire</Label><Textarea rows={4} value={content.story} onChange={e => set('story', e.target.value)} style={inputStyle} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Email contact</Label><Input value={content.emailContact} onChange={e => set('emailContact', e.target.value)} style={inputStyle} /></div>
          <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Email réservation</Label><Input value={content.emailReservation} onChange={e => set('emailReservation', e.target.value)} style={inputStyle} /></div>
        </div>
      </div>
    </div>
  )
}

function MenuEditor() {
  const { menu, setMenu, theme: t } = useSite()
  const [sel, setSel] = useState(menu[0].name)
  const item = menu.find(m => m.name === sel)!
  const update = (k: string, v: string | boolean | string[]) => setMenu(menu.map(m => m.name === sel ? { ...m, [k]: v } : m))
  const inputStyle: React.CSSProperties = { background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: t.text, width: '100%' }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '28px' }}>
      <div>
        <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>Carte & prix</h2>
        <p style={{ color: t.muted, fontSize: '13px', marginTop: 0 }}>Sélectionnez un produit.</p>
        <div style={{ maxHeight: '520px', overflow: 'auto', borderRadius: '14px', background: t.surface, border: `1px solid ${t.shadow}` }}>
          {menu.map(m => (
            <button key={m.name} onClick={() => setSel(m.name)} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '11px 14px',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none',
              background: sel === m.name ? `${t.primary}0d` : 'transparent',
              color: sel === m.name ? t.primary : t.text,
              borderBottom: `1px solid ${t.shadow}`,
            }}>
              {m.sig ? '★ ' : ''}{m.name} <span style={{ color: t.muted, fontWeight: 400 }}>· {m.price}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '22px', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.02em' }}>{item.name}</h3>
        <div style={{ display: 'grid', gap: '14px', maxWidth: '560px' }}>
          <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Nom</Label><Input value={item.name} onChange={e => update('name', e.target.value)} style={inputStyle} /></div>
          <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Prix (FG)</Label><Input value={item.price} onChange={e => update('price', e.target.value)} style={inputStyle} /></div>
          <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Description percutante</Label><Textarea rows={3} value={item.desc} onChange={e => update('desc', e.target.value)} style={inputStyle} /></div>
          <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Vertus (panneau dépliable)</Label><Textarea rows={2} value={item.vertus} onChange={e => update('vertus', e.target.value)} style={inputStyle} /></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginRight: 4 }}>Badges :</Label>
            {['omni', 'vege', 'gluten', 'arachide', 'lactose'].map(b => (
              <button key={b} onClick={() => update('badges', item.badges.includes(b) ? item.badges.filter(x => x !== b) : [...item.badges, b])}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '100px', cursor: 'pointer', border: `1px solid ${t.primary}33`, background: item.badges.includes(b) ? t.primary : 'transparent', color: item.badges.includes(b) ? '#fff' : t.text }}>{BADGE_DEFS[b]?.label}</button>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', fontWeight: 500, color: t.text }}>
            <Switch checked={!!item.sig} onCheckedChange={v => update('sig', v)} /> Produit signature
          </label>
        </div>
      </div>
    </div>
  )
}

function ThemeEditor() {
  const { themeId, setThemeId, fontId, setFontId, theme: t, content } = useSite()
  return (
    <div style={{ maxWidth: '760px' }}>
      <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Thème & ambiance</h2>
      <p style={{ color: t.muted, fontSize: '14px', marginTop: 0 }}>Choisissez une ambiance. Le site change en direct.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: '16px', marginTop: '20px' }}>
        {Object.values(THEMES).map(th => (
          <button key={th.id} onClick={() => setThemeId(th.id)} style={{
            cursor: 'pointer', border: themeId === th.id ? `3px solid ${t.accent}` : `1px solid ${t.shadow}`,
            borderRadius: '16px', padding: '16px', background: th.surface, textAlign: 'left', transition: 'border 0.2s',
          }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: '10px' }}>
              {[th.primary, th.accent, th.gold, th.bg].map((c, i) => <div key={i} style={{ width: '24px', height: '24px', borderRadius: '7px', background: c, border: `1px solid ${th.shadow}` }} />)}
            </div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: th.heading }}>{th.label}</div>
            {themeId === th.id && <div style={{ fontSize: '11px', color: th.accent, fontWeight: 600, marginTop: 2 }}>✓ Actif</div>}
          </button>
        ))}
      </div>
      <div style={{ marginTop: '28px' }}>
        <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Typographie</Label>
        <Select value={fontId} onValueChange={setFontId}>
          <SelectTrigger style={{ maxWidth: '320px', background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: '12px', padding: '12px 14px' }}><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(FONTS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Separator style={{ margin: '28px 0' }} />
      <div style={{ fontSize: '12px', fontWeight: 600, color: t.muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Aperçu en direct</div>
      <div style={{ marginTop: '12px', padding: '24px', borderRadius: '18px', background: t.surface, border: `1px solid ${t.shadow}` }}>
        <div style={{ fontFamily: 'var(--f-heading)', fontSize: '30px', fontWeight: 700, color: t.heading, letterSpacing: '-0.03em' }}>{content.heroTitle}</div>
        <div style={{ fontSize: '14px', color: t.muted, marginTop: '8px' }}>{content.slogan}</div>
        <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
          <span style={{ padding: '8px 16px', borderRadius: '100px', background: t.primary, color: '#fff', fontSize: '13px', fontWeight: 600 }}>Bouton primaire</span>
          <span style={{ padding: '8px 16px', borderRadius: '100px', background: t.gold, color: '#fff', fontSize: '13px', fontWeight: 600 }}>Bouton accent</span>
        </div>
      </div>
    </div>
  )
}

function MediaManager() {
  const { media, theme: t } = useSite()
  return (
    <div style={{ maxWidth: '820px' }}>
      <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Médias & dimensions</h2>
      <p style={{ color: t.muted, fontSize: '14px', marginTop: 0 }}>Uploadez images/vidéos, recadrez et assignez aux emplacements.</p>
      <div style={{ display: 'grid', gap: '12px', marginTop: '20px' }}>
        {media.map((m, i) => (
          <OrganicCard key={i} style={{ padding: '16px', display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: '14px', alignItems: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: `${t.primary}0d`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={t.primary} strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 17 5-5 4 4 3-3 6 6" /></svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: t.heading, fontSize: '15px' }}>{m.slot}</div>
              <div style={{ fontSize: '12px', color: t.muted, marginTop: '2px' }}>Dimensions : {m.dims} · {m.status}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" variant="outline" style={{ borderColor: t.primary + '44', color: t.primary, borderRadius: '10px' }}>Redimensionner</Button>
              <Button size="sm" style={{ background: t.primary, color: '#fff', borderRadius: '10px' }}>Remplacer</Button>
            </div>
          </OrganicCard>
        ))}
      </div>
    </div>
  )
}

function VisibilityEditor() {
  const { visibility, setVisibility, theme: t } = useSite()
  const toggle = (k: string) => setVisibility({ ...visibility, sections: { ...visibility.sections, [k]: !visibility.sections[k] } })
  const toggleExtra = (k: string) => setVisibility({ ...visibility, [k]: !visibility[k as keyof typeof visibility] } as typeof visibility)
  const rows: [string, string][] = [['home', 'Accueil'], ['carte', 'La carte'], ['histoire', 'Notre histoire'], ['engagements', 'Engagements'], ['equipe', 'Équipe'], ['localisation', 'Localisation'], ['contact', 'Contact'], ['blog', 'Blog']]
  return (
    <div style={{ maxWidth: '640px' }}>
      <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Visibilité</h2>
      <p style={{ color: t.muted, fontSize: '14px', marginTop: 0 }}>Affichez ou masquez des éléments du site en un clic.</p>
      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: t.muted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' }}>Sections de page</div>
        {rows.map(([k, l]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: t.surface, border: `1px solid ${t.shadow}`, borderRadius: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{l}</span>
            <Switch checked={visibility.sections[k]} onCheckedChange={() => toggle(k)} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: '22px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: t.muted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' }}>Éléments</div>
        {(['vertusPanel', 'suggestions', 'testimonials', 'badges'] as const).map(k => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: t.surface, border: `1px solid ${t.shadow}`, borderRadius: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{k === 'vertusPanel' ? 'Panneau « Vertus » dépliable' : k === 'suggestions' ? 'Suggestions du moment' : k === 'testimonials' ? 'Témoignages' : 'Badges régime & allergènes'}</span>
            <Switch checked={visibility[k]} onCheckedChange={() => toggleExtra(k)} />
          </div>
        ))}
      </div>
    </div>
  )
}

function UsersRoles() {
  const { theme: t } = useSite()
  const cellStyle: React.CSSProperties = { padding: '10px 12px', fontSize: '12px', fontWeight: 500, textAlign: 'center' }
  const permColor = (p: string) => p === 'écrire' ? t.accent : p === 'lecture' || p === 'carte' || p === 'blog' ? t.primary : t.muted
  const permIcon = (p: string) => p === 'écrire' ? Icon.write(13, t.accent) : p === 'lecture' ? Icon.eye(13, t.primary) : p === 'carte' ? Icon.leaf(13, t.gold) : p === 'blog' ? Icon.write(13, t.primary) : '—'
  return (
    <div style={{ maxWidth: '920px' }}>
      <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Utilisateurs & rôles</h2>
      <p style={{ color: t.muted, fontSize: '14px', marginTop: 0 }}>Permissions granulaires par module (voir / écrire / désactivé).</p>
      <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '16px', fontWeight: 700, margin: '20px 0 10px' }}>Équipe</h3>
      {USERS.map(u => {
        const role = ROLES.find(r => r.id === u.role)!
        return (
          <div key={u.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: t.surface, border: `1px solid ${t.shadow}`, borderRadius: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{u.name} <span style={{ color: t.muted, fontWeight: 400 }}>· {u.email}</span></span>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '100px', background: `${t.primary}12`, color: t.primary }}>{role.name}</span>
          </div>
        )
      })}
      <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '16px', fontWeight: 700, margin: '24px 0 10px' }}>Matrice des permissions</h3>
      <div style={{ overflowX: 'auto', borderRadius: '14px', border: `1px solid ${t.shadow}` }}>
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

function FormsConfig() {
  const { content, setContent, theme: t } = useSite()
  const set = (k: string, v: string) => setContent({ ...content, [k]: v })
  const inputStyle: React.CSSProperties = { background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: t.text, width: '100%' }
  return (
    <div style={{ maxWidth: '680px' }}>
      <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Formulaires & emails</h2>
      <p style={{ color: t.muted, fontSize: '14px', marginTop: 0 }}>Configurez les destinataires et l'auto-réponse envoyée au client.</p>
      <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
        <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Destinataire — messages généraux</Label><Input value={content.emailContact} onChange={e => set('emailContact', e.target.value)} style={inputStyle} /></div>
        <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Destinataire — réservations</Label><Input value={content.emailReservation} onChange={e => set('emailReservation', e.target.value)} style={inputStyle} /></div>
        <div>
          <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Template d'auto-réponse (variable : {`{nom}`})</Label>
          <Textarea rows={4} value={content.autoReply} onChange={e => set('autoReply', e.target.value)} style={inputStyle} />
        </div>
      </div>
      <Separator style={{ margin: '24px 0' }} />
      <div style={{ fontSize: '13px', fontWeight: 600, color: t.heading }}>Pipeline d'envoi</div>
      <div style={{ fontSize: '13px', color: t.muted, marginTop: '8px', lineHeight: 1.7 }}>
        Soumission → stockage table <code>messages</code> → email au destinataire → auto-réponse au client (via Edge Function Supabase + fournisseur SMTP/Resend). Historique consultable et exportable.
      </div>
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
          {active === 'content' && <ContentEditor />}
          {active === 'menu' && <MenuEditor />}
          {active === 'theme' && <ThemeEditor />}
          {active === 'media' && <MediaManager />}
          {active === 'visibility' && <VisibilityEditor />}
          {active === 'users' && <UsersRoles />}
          {active === 'forms' && <FormsConfig />}
        </motion.div>
      </AnimatePresence>
    </AdminShell>
  )
}
