import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSite, type MediaSlot } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Icon } from '@/lib/icons'
import { CATEGORY_ORDER } from '@/data/menu'
import { MODULES, ROLES } from '@/data/rbac'
import { THEMES } from '@/config/themes'
import { FONTS } from '@/config/fonts'
import { BADGE_DEFS } from '@/config/badges'
import { upsertMenuItem, deleteMenuItem, fetchMessages, upsertBlogPost, deleteBlogPost, fetchReservations, updateReservationStatus, uploadMedia, deleteMedia, updateMediaSlot, upsertAdminUser, deleteAdminUser, type BlogPost, type Reservation } from '@/lib/repository'
import { invokeReplyEmail, invokeReservationStatusEmail, getSupabase } from '@/lib/supabase'
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
    ['dashboard', 'Tableau de bord'], ['messages', 'Messages'], ['reservations', 'Réservations'], ['content', 'Contenu'], ['menu', 'Carte & prix'],
    ['theme', 'Thème & ambiance'], ['blog', 'Blog'], ['media', 'Médias'], ['visibility', 'Visibilité'],
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
  const { menu, messages, theme: t, dataSource, dataLoading, adminUsers } = useSite()
  const dsLabel = dataLoading ? 'Chargement…' : dataSource === 'supabase' ? 'Supabase connecté' : 'Mode démo (local)'
  const dsColor = dataSource === 'supabase' ? t.primary : t.muted
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '28px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Tableau de bord</h2>
      <p style={{ color: t.muted, marginTop: 0, fontSize: '14px' }}>Bienvenue Mister Marcket. Pilotez votre site en toute liberté.</p>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: '100px', background: `${dsColor}12`, border: `1px solid ${dsColor}33`, fontSize: '12px', fontWeight: 600, color: dsColor, marginTop: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dsColor }} /> {dsLabel}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '16px', marginTop: '24px' }}>
        <DashCard label="Produits dans la carte" value={menu.length} sub="toutes catégories" />
        <DashCard label="Messages reçus" value={messages.length} sub="via formulaires" />
        <DashCard label="Catégories actives" value={CATEGORY_ORDER.length} sub="burgers, wraps, salades…" />
        <DashCard label="Utilisateurs" value={adminUsers.length} sub="avec rôles attribués" />
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

function ContentEditor() {
  const { content, setContent, theme: t, dataSource, saveContentToDb } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const set = (k: string, v: string) => { setContent({ ...content, [k]: v }); setSaveStatus('idle') }
  const inputStyle: React.CSSProperties = { background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: t.text, width: '100%' }
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving')
    const ok = await saveContentToDb()
    setSaveStatus(ok ? 'saved' : 'error')
    setTimeout(() => setSaveStatus('idle'), 3000)
  }
  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Contenu du site</h2>
          <p style={{ color: t.muted, fontSize: '14px', marginTop: 0 }}>Modifiez tous les textes. Les changements sont appliqués en direct.</p>
        </div>
        <Button onClick={save} style={{ background: t.primary, color: '#fff', fontWeight: 600, padding: '10px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer' }}>Enregistrer</Button>
      </div>
      {saveStatus !== 'idle' && <div style={{ marginTop: 8 }}><SaveBar status={saveStatus} /></div>}
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
  const { menu, setMenu, theme: t, dataSource } = useSite()
  const [sel, setSel] = useState(menu[0]?.name ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const item = menu.find(m => m.name === sel)
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
  const inputStyle: React.CSSProperties = { background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: t.text, width: '100%' }
  if (!item) {
    return (
      <div>
        <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>Carte & prix</h2>
        <p style={{ color: t.muted, fontSize: '14px' }}>Aucun produit à afficher pour le moment.</p>
      </div>
    )
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '28px' }}>
      <div>
        <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>Carte & prix</h2>
        <p style={{ color: t.muted, fontSize: '13px', marginTop: 0 }}>Sélectionnez un produit.</p>
        <div style={{ maxHeight: '480px', overflow: 'auto', borderRadius: '14px', background: t.surface, border: `1px solid ${t.shadow}` }}>
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
        <button onClick={() => {
          const newItem = { cat: 'Burgers', name: `Nouveau produit ${menu.length + 1}`, sig: false, price: '0', desc: '', vertus: '', badges: [] }
          setMenu([...menu, newItem])
          if (dataSource === 'supabase') upsertMenuItem(newItem)
          setSel(newItem.name)
        }} style={{
          marginTop: 12, width: '100%', fontSize: '13px', fontWeight: 600, padding: '10px',
          borderRadius: '12px', cursor: 'pointer', border: `1px dashed ${t.primary}44`,
          background: 'transparent', color: t.primary,
        }}>+ Ajouter un produit</button>
      </div>
      <div>
        <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '22px', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.02em' }}>{item.name}</h3>
        {saveStatus !== 'idle' && <div style={{ marginBottom: 12 }}><SaveBar status={saveStatus} /></div>}
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
        <div style={{ marginTop: '20px', display: 'flex', gap: 10 }}>
          <button onClick={() => {
            if (dataSource === 'supabase') deleteMenuItem(item.name)
            setMenu(menu.filter(m => m.name !== item.name))
            setSel(menu[0]?.name ?? '')
          }} style={{
            fontSize: '12px', fontWeight: 600, padding: '8px 16px', borderRadius: '10px',
            cursor: 'pointer', border: `1px solid ${t.accent}44`, background: 'transparent', color: t.accent,
          }}>Supprimer ce produit</button>
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
    <div style={{ maxWidth: '760px' }}>
      <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Thème & ambiance</h2>
      <p style={{ color: t.muted, fontSize: '14px', marginTop: 0 }}>Choisissez une ambiance. Le site change en direct.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: '16px', marginTop: '20px' }}>
        {Object.values(THEMES).map(th => (
          <button key={th.id} onClick={() => { setThemeId(th.id); setSaveStatus('idle') }} style={{
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
        <Select value={fontId} onValueChange={v => { setFontId(v); setSaveStatus('idle') }}>
          <SelectTrigger style={{ maxWidth: '320px', background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: '12px', padding: '12px 14px' }}><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(FONTS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Separator style={{ margin: '28px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: t.muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Aperçu en direct</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saveStatus !== 'idle' && <SaveBar status={saveStatus} />}
          <Button onClick={save} style={{ background: t.primary, color: '#fff', fontWeight: 600, padding: '9px 18px', borderRadius: '100px', border: 'none', cursor: 'pointer' }}>Enregistrer</Button>
        </div>
      </div>
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

const MEDIA_SLOTS: string[] = ['hero', 'logo', 'histoire', 'greatlife', 'general']
const SLOT_LABELS: Record<string, string> = {
  hero: 'Hero principal',
  logo: 'Logo / favicon',
  histoire: 'Fond section histoire',
  greatlife: 'Photo — Le Greatlife',
  general: 'Général / divers',
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
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'err' | 'busy'; msg: string }>({ kind: 'idle', msg: '' })
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [editSlotId, setEditSlotId] = useState<string | null>(null)
  const [editSlotValue, setEditSlotValue] = useState('general')
  const fileRef = React.useRef<HTMLInputElement>(null)

  const isSupabase = dataSource === 'supabase'
  const dbAssets = media.filter(m => m.id)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!isSupabase) {
      setStatus({ kind: 'err', msg: 'Connexion Supabase requise pour téléverser.' })
      return
    }
    setUploading(true)
    setStatus({ kind: 'busy', msg: `Téléversement de ${file.name}…` })
    const res = await uploadMedia(file, slot)
    setUploading(false)
    if (res.data) {
      setStatus({ kind: 'ok', msg: `${res.data.filename} téléversé dans « ${SLOT_LABELS[res.data.slot] || res.data.slot} ».` })
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
      <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Médias</h2>
      <p style={{ color: t.muted, fontSize: '14px', marginTop: 0 }}>Téléversez images/vidéos dans le bucket Supabase « media » et assignez-les aux emplacements du site.</p>

      {!isSupabase && (
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: `${t.gold || '#b8860b'}14`, color: t.heading, fontSize: 13, border: `1px solid ${t.primary}22` }}>
          Mode local — la connexion Supabase n'est pas active. Les téléversements sont désactivés.
        </div>
      )}

      <OrganicCard style={{ marginTop: 18, padding: 18, display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'end' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <Label style={{ color: t.heading, fontSize: 13, fontWeight: 600 }}>Emplacement cible</Label>
            <Select value={slot} onValueChange={setSlot}>
              <SelectTrigger style={{ borderColor: t.primary + '44', borderRadius: 10 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEDIA_SLOTS.map(s => (
                  <SelectItem key={s} value={s}>{SLOT_LABELS[s] || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files?.[0])}
            />
            <Button
              size="md"
              disabled={uploading || !isSupabase}
              style={{ background: t.primary, color: '#fff', borderRadius: 10, padding: '9px 18px', opacity: uploading || !isSupabase ? 0.6 : 1 }}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Téléversement…' : 'Téléverser un fichier'}
            </Button>
          </div>
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

      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.heading, marginBottom: 12 }}>
          Fichiers téléversés ({dbAssets.length})
        </div>
        {dbAssets.length === 0 ? (
          <div style={{ color: t.muted, fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
            Aucun fichier téléversé pour le moment.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {dbAssets.map((m, i) => {
              const isImg = m.content_type?.startsWith('image/')
              const editing = editSlotId === m.id
              return (
                <OrganicCard key={m.id || i} style={{ padding: 14, display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', background: `${t.primary}0d`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isImg && m.url ? (
                      <img src={m.url} alt={m.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={t.primary} strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 17 5-5 4 4 3-3 6 6" /></svg>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: t.heading, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.filename}</div>
                    <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
                      {SLOT_LABELS[m.slot] || m.slot} · {m.content_type || 'fichier'} {formatSize(m.size_bytes) ? `· ${formatSize(m.size_bytes)}` : ''}
                    </div>
                    {m.url && (
                      <a href={m.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: t.primary, textDecoration: 'underline' }}>Voir le fichier</a>
                    )}
                    {editing && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Select value={editSlotValue} onValueChange={setEditSlotValue}>
                          <SelectTrigger style={{ borderColor: t.primary + '44', borderRadius: 8, height: 32, fontSize: 12 }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEDIA_SLOTS.map(s => (
                              <SelectItem key={s} value={s}>{SLOT_LABELS[s] || s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" style={{ background: t.primary, color: '#fff', borderRadius: 8 }} onClick={() => handleSaveSlot(m)}>OK</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditSlotId(null)}>Annuler</Button>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!editing && (
                      <Button size="sm" variant="outline" style={{ borderColor: t.primary + '44', color: t.primary, borderRadius: 10 }} onClick={() => { setEditSlotId(m.id || null); setEditSlotValue(m.slot) }}>
                        Emplacement
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={removingId === m.id}
                      style={{ borderColor: '#dc262644', color: '#dc2626', borderRadius: 10, opacity: removingId === m.id ? 0.6 : 1 }}
                      onClick={() => handleDelete(m)}
                    >
                      {removingId === m.id ? '…' : 'Supprimer'}
                    </Button>
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
      <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Visibilité</h2>
      <p style={{ color: t.muted, fontSize: '14px', marginTop: 0 }}>Affichez ou masquez des éléments du site en un clic.</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 12 }}>
        {saveStatus !== 'idle' && <SaveBar status={saveStatus} />}
        <Button onClick={save} style={{ background: t.primary, color: '#fff', fontWeight: 600, padding: '9px 18px', borderRadius: '100px', border: 'none', cursor: 'pointer' }}>Enregistrer</Button>
      </div>
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
  const inputStyle: React.CSSProperties = { background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: 10, padding: '9px 12px', fontSize: 14, color: t.text, width: '100%' }

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
      <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Utilisateurs & rôles</h2>
      <p style={{ color: t.muted, fontSize: '14px', marginTop: 0 }}>Permissions granulaires par module (voir / écrire / désactivé).</p>

      {!isSupabase && (
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: `${t.gold || '#b8860b'}14`, color: t.heading, fontSize: 13, border: `1px solid ${t.primary}22` }}>
          Mode local — la gestion des utilisateurs nécessite une connexion Supabase.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 10px' }}>
        <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '16px', fontWeight: 700, margin: 0 }}>Équipe</h3>
        <Button size="sm" disabled={!isSupabase || !!editing} style={{ background: t.primary, color: '#fff', borderRadius: 10, opacity: !isSupabase || editing ? 0.6 : 1 }} onClick={startAdd}>+ Ajouter</Button>
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
              <Label style={{ fontSize: 12, color: t.muted, fontWeight: 600 }}>Nom</Label>
              <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={inputStyle} placeholder="Nom complet" />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <Label style={{ fontSize: 12, color: t.muted, fontWeight: 600 }}>Email</Label>
              <Input value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} style={inputStyle} placeholder="email@greatlife.gn" disabled={!!editing.id} />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6, maxWidth: 260 }}>
            <Label style={{ fontSize: 12, color: t.muted, fontWeight: 600 }}>Rôle</Label>
            <Select value={editing.role} onValueChange={v => setEditing({ ...editing, role: v })}>
              <SelectTrigger style={{ borderColor: t.primary + '44', borderRadius: 10, background: t.surfaceAlt, padding: '9px 12px' }}><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" style={{ background: t.primary, color: '#fff', borderRadius: 10 }} onClick={saveEdit}>Enregistrer</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
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
                <Button size="sm" variant="outline" disabled={!isSupabase || busyId === u.id} style={{ borderColor: t.primary + '44', color: t.primary, borderRadius: 10 }} onClick={() => startEdit(u)}>Modifier</Button>
                <Button size="sm" variant="outline" disabled={!isSupabase || isSelf || busyId === u.id} style={{ borderColor: '#dc262644', color: '#dc2626', borderRadius: 10, opacity: isSelf || busyId === u.id ? 0.5 : 1 }} onClick={() => remove(u.id, u.name)}>{busyId === u.id ? '…' : 'Supprimer'}</Button>
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
  const inputStyle: React.CSSProperties = { background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: t.text, width: '100%' }

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
    <div style={{ maxWidth: '760px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Blog</h2>
          <p style={{ color: t.muted, fontSize: '14px', marginTop: 0 }}>Rédigez et publiez des articles.</p>
        </div>
        <Button onClick={() => setEditing({ title: '', excerpt: '', body: '', category: 'Actualités', published: false })} style={{ background: t.primary, color: '#fff', fontWeight: 600, padding: '10px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer' }}>+ Nouvel article</Button>
      </div>
      {editing && (
        <div style={{ marginTop: 20, padding: 24, borderRadius: 16, background: t.surface, border: `1px solid ${t.shadow}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '18px', fontWeight: 700, margin: 0 }}>{editing.id ? 'Modifier' : 'Nouvel article'}</h3>
            <button onClick={() => setEditing(null)} style={{ fontSize: '13px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted }}>Fermer</button>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Titre</Label><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} style={inputStyle} /></div>
            <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Catégorie</Label><Input value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} style={inputStyle} /></div>
            <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Extrait</Label><Textarea rows={2} value={editing.excerpt} onChange={e => setEditing({ ...editing, excerpt: e.target.value })} style={inputStyle} /></div>
            <div><Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Contenu</Label><Textarea rows={6} value={editing.body} onChange={e => setEditing({ ...editing, body: e.target.value })} style={inputStyle} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', fontWeight: 500, color: t.text }}>
              <Switch checked={editing.published} onCheckedChange={v => setEditing({ ...editing, published: v })} /> Publier sur le site
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button onClick={save} style={{ background: t.primary, color: '#fff', fontWeight: 600, padding: '10px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer' }}>Enregistrer</Button>
              {saveStatus !== 'idle' && <SaveBar status={saveStatus} />}
            </div>
          </div>
        </div>
      )}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {blogPosts.length === 0 && <p style={{ color: t.muted, fontSize: '14px' }}>Aucun article. Cliquez sur « Nouvel article » pour commencer.</p>}
        {blogPosts.map(post => (
          <div key={post.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: t.surface, border: `1px solid ${t.shadow}`, borderRadius: '12px' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: t.heading }}>{post.title}</span>
              <span style={{ fontSize: '11px', fontWeight: 600, marginLeft: 8, padding: '2px 8px', borderRadius: '100px', background: post.published ? `${t.primary}15` : t.surfaceAlt, color: post.published ? t.primary : t.muted }}>{post.published ? 'Publié' : 'Brouillon'}</span>
              <div style={{ fontSize: '12px', color: t.muted, marginTop: 2 }}>{post.category} · {post.excerpt.slice(0, 60)}{post.excerpt.length > 60 ? '…' : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditing(post)} style={{ fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${t.primary}44`, background: 'transparent', color: t.primary }}>Modifier</button>
              <button onClick={() => remove(post)} style={{ fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${t.accent}44`, background: 'transparent', color: t.accent }}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FormsConfig() {
  const { content, setContent, theme: t, dataSource, saveContentToDb } = useSite()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const set = (k: string, v: string) => { setContent({ ...content, [k]: v }); setSaveStatus('idle') }
  const inputStyle: React.CSSProperties = { background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: t.text, width: '100%' }
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving')
    const ok = await saveContentToDb()
    setSaveStatus(ok ? 'saved' : 'error')
    setTimeout(() => setSaveStatus('idle'), 3000)
  }
  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Formulaires & emails</h2>
          <p style={{ color: t.muted, fontSize: '14px', marginTop: 0 }}>Configurez les destinataires et l'auto-réponse envoyée au client.</p>
        </div>
        <Button onClick={save} style={{ background: t.primary, color: '#fff', fontWeight: 600, padding: '10px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer' }}>Enregistrer</Button>
      </div>
      {saveStatus !== 'idle' && <div style={{ marginTop: 8 }}><SaveBar status={saveStatus} /></div>}
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

function MessagesManager() {
  const { messages, setMessages, theme: t, dataSource, markMessageHandled } = useSite()
  const { user } = useAuth()
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [live, setLive] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const [handling, setHandling] = useState(false)
  const inputStyle: React.CSSProperties = { background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: '12px', padding: '12px 14px', fontSize: '14px', color: t.text, width: '100%' }

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
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '300px 1fr' : '1fr', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Messages</h2>
          {newCount > 0 && (
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', background: t.accent, color: '#fff' }}>{newCount} nouveau{newCount > 1 ? 'x' : ''}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 16 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: live ? t.primary : t.muted, animation: live ? 'pulse 2s infinite' : 'none' }} />
          <span style={{ fontSize: '12px', color: t.muted }}>{live ? 'Temps réel' : 'Actualisation périodique'}</span>
        </div>
        {messages.length === 0 ? (
          <p style={{ color: t.muted, fontSize: '14px' }}>Aucun message pour l'instant.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {messages.map((m, i) => (
              <button key={i} onClick={() => { setSelectedIdx(i); setReplyText(''); setSending('idle') }} style={{
                textAlign: 'left', padding: '14px 16px', borderRadius: '14px', cursor: 'pointer',
                border: selectedIdx === i ? `2px solid ${t.primary}` : `1px solid ${t.shadow}`,
                background: selectedIdx === i ? `${t.primary}08` : t.surface,
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: t.heading }}>{m.nom} {m.handled && <span style={{ fontSize: '10px', color: t.primary, marginLeft: 6 }}>✓</span>}</span>
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
            <div style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '8px' }}>Message original</div>
            <p style={{ fontSize: '14px', color: t.text, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.message}</p>
          </OrganicCard>
          <div>
            <Label style={{ fontSize: '13px', fontWeight: 600, color: t.muted, marginBottom: '6px' }}>Votre réponse</Label>
            <Textarea rows={5} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Tapez votre réponse au client…" style={inputStyle} />
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
    <div style={{ maxWidth: '820px' }}>
      <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>Réservations</h2>
      <p style={{ color: t.muted, fontSize: '14px', marginTop: 0 }}>{reservations.length} réservation{reservations.length > 1 ? 's' : ''} · actualisation auto (30s)</p>
      {loading ? <p style={{ color: t.muted, fontSize: 14 }}>Chargement…</p> :
        reservations.length === 0 ? <p style={{ color: t.muted, fontSize: 14 }}>Aucune réservation pour l'instant.</p> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          {reservations.map(r => (
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
