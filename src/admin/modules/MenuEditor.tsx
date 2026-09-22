import { useState, useEffect, useRef, useCallback } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import { PageHeader, EmptyState, FieldLabel, inputStyle, GhostButton, PrimaryButton } from '@/admin/ui'
import { BADGE_DEFS } from '@/config/badges'
import type { MenuItem } from '@/data/menu'
import { upsertMenuItem, deleteMenuItem } from '@/lib/repository'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { SaveBar } from '@/admin/shared'

export function MenuEditor() {
  const { menu, setMenu, theme: t, dataSource } = useSite()
  
  const [sel, setSel] = useState(0)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const [newCat, setNewCat] = useState('Burgers')
  
  const [dirty, setDirty] = useState(false)
  
  const timerRef = useRef<number | null>(null)
  
  const pendingRef = useRef<{ index: number; item: MenuItem } | null>(null)

  const canPersist = dataSource === 'supabase'

  const selIndex = menu.length ? Math.min(sel, menu.length - 1) : -1
  const item: MenuItem | undefined = selIndex >= 0 ? menu[selIndex] : undefined
  const filtered = query.trim() ? menu.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.cat.toLowerCase().includes(query.toLowerCase())) : menu
  const grouped = filtered.reduce((acc, m) => { (acc[m.cat] = acc[m.cat] || []).push(m); return acc }, {} as Record<string, typeof menu>)
  const categories = Array.from(new Set(menu.map(m => m.cat))).sort()

  
  const persist = useCallback(async (index: number, target: MenuItem) => {
    if (!canPersist) { setDirty(false); setSaveStatus('saved'); return }
    setSaveStatus('saving'); setSaveErr(undefined)
    const res = await upsertMenuItem(target)
    setSaveStatus(res.ok ? 'saved' : 'error')
    setSaveErr(res.ok ? undefined : res.error)
    setDirty(!res.ok)
    if (res.ok && res.id) {
      setMenu(prev => prev.map((m, i) => (i === index && !m.id ? { ...m, id: res.id } : m)))
    }
  }, [canPersist])

  
  const flush = useCallback(() => {
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null }
    const pending = pendingRef.current
    if (pending) { pendingRef.current = null; persist(pending.index, pending.item) }
  }, [persist])

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

    setDirty(true)
    pendingRef.current = { index: selIndex, item: updated }
    if (!canPersist) return
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => { pendingRef.current = null; persist(selIndex, updated) }, 800)
  }

  
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
                if (dataSource === 'supabase' && item.id) {
                  const res = await deleteMenuItem(item.id)
                  if (!res.ok) { setSaveStatus('error'); setSaveErr(res.error); setDirty(true); return }
                }
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

