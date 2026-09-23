import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import { PageHeader, EmptyState, FieldLabel, inputStyle, GhostButton, PrimaryButton } from '@/admin/ui'
import { BADGE_DEFS } from '@/config/badges'
import { CATEGORY_ORDER, type MenuItem } from '@/data/menu'
import { upsertMenuItem, deleteMenuItem } from '@/lib/repository'
import { productPhotoCandidates } from '@/lib/productPhotoSlot'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { SaveBar } from '@/admin/shared'

function parsePrice(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

function formatPrice(raw: string, currency: string): string {
  const n = parsePrice(raw)
  if (!n) return raw ? `${raw} ${currency}`.trim() : `— ${currency}`
  return `${n.toLocaleString('fr-FR')} ${currency}`
}

function itemTag(item: MenuItem): string {
  if (item.sig) return 'Signature'
  const first = item.badges[0]
  if (first && BADGE_DEFS[first]) return BADGE_DEFS[first].label
  return item.cat
}

function itemKey(item: MenuItem, index: number): string {
  return item.id ?? `tmp:${index}:${item.name}`
}

export function MenuEditor() {
  const { menu, setMenu, theme: t, dataSource, media, content } = useSite()
  const currency = content.currency || 'FG'

  const [sel, setSel] = useState(0)
  const [section, setSection] = useState('Tous')
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'preview' | 'edit'>('preview')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [confirmDel, setConfirmDel] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [notice, setNotice] = useState('')

  const baselineRef = useRef<MenuItem | null>(null)
  const pendingRef = useRef<{ index: number; item: MenuItem } | null>(null)

  const canPersist = dataSource === 'supabase'
  const categories = useMemo(() => {
    const live = Array.from(new Set(menu.map((m) => m.cat)))
    const ordered = CATEGORY_ORDER.filter((c) => live.includes(c))
    const rest = live.filter((c) => !CATEGORY_ORDER.includes(c)).sort()
    return [...ordered, ...rest]
  }, [menu])

  const tabs = useMemo(() => ['Tous', ...categories], [categories])

  const photoSlots = useMemo(() => new Set(media.map((m) => m.slot).filter(Boolean)), [media])

  const hasPhoto = useCallback((item: MenuItem) => {
    return productPhotoCandidates(item).some((slot) => photoSlots.has(slot))
  }, [photoSlots])

  const selIndex = menu.length ? Math.min(sel, menu.length - 1) : -1
  const item: MenuItem | undefined = selIndex >= 0 ? menu[selIndex] : undefined

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return menu
      .map((m, index) => ({ m, index }))
      .filter(({ m }) => {
        if (section !== 'Tous' && m.cat !== section) return false
        if (!q) return true
        return (
          m.name.toLowerCase().includes(q)
          || m.cat.toLowerCase().includes(q)
          || m.desc.toLowerCase().includes(q)
        )
      })
  }, [menu, query, section])

  const signatures = menu.filter((m) => m.sig).length
  const missingPhotos = menu.filter((m) => !hasPhoto(m)).length
  const avgPrice = (() => {
    const nums = menu.map((m) => parsePrice(m.price)).filter((n) => n > 0)
    if (!nums.length) return 0
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
  })()

  useEffect(() => {
    if (!item) {
      baselineRef.current = null
      return
    }
    if (!dirty) baselineRef.current = { ...item, badges: [...item.badges] }
  }, [item?.id, item?.name, dirty]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(id)
  }, [notice])

  const persist = useCallback(async (index: number, target: MenuItem) => {
    if (!canPersist) {
      setDirty(false)
      setSaveStatus('saved')
      baselineRef.current = { ...target, badges: [...target.badges] }
      pendingRef.current = null
      return true
    }
    setSaveStatus('saving')
    setSaveErr(undefined)
    const res = await upsertMenuItem(target)
    setSaveStatus(res.ok ? 'saved' : 'error')
    setSaveErr(res.ok ? undefined : res.error)
    setDirty(!res.ok)
    if (res.ok) {
      baselineRef.current = { ...target, badges: [...target.badges], id: res.id ?? target.id }
      pendingRef.current = null
      if (res.id) {
        setMenu((prev) => prev.map((m, i) => (i === index && !m.id ? { ...m, id: res.id } : m)))
      }
    }
    return res.ok
  }, [canPersist, setMenu])

  const flush = useCallback(async () => {
    const pending = pendingRef.current
    if (pending) {
      await persist(pending.index, pending.item)
      return
    }
    if (selIndex >= 0 && item && dirty) await persist(selIndex, item)
  }, [persist, selIndex, item, dirty])

  const update = (k: string, v: string | boolean | string[]) => {
    if (selIndex < 0) return
    const next = menu.map((m, i) => (i === selIndex ? { ...m, [k]: v } : m))
    setMenu(next)
    const updated = next[selIndex]
    if (!updated) return
    setDirty(true)
    setSaveStatus('idle')
    pendingRef.current = { index: selIndex, item: updated }
  }

  const selectItem = (index: number) => {
    if (index === selIndex) {
      setMode('preview')
      return
    }
    if (dirty) {
      setNotice('Enregistrez ou annulez les modifications avant de changer de plat.')
      return
    }
    setSel(index)
    setConfirmDel(false)
    setSaveStatus('idle')
    setMode('preview')
  }

  const discard = () => {
    const base = baselineRef.current
    if (selIndex < 0 || !base) {
      setDirty(false)
      pendingRef.current = null
      return
    }
    setMenu((prev) => prev.map((m, i) => (i === selIndex ? { ...base, badges: [...base.badges] } : m)))
    pendingRef.current = null
    setDirty(false)
    setSaveStatus('idle')
    setSaveErr(undefined)
    setConfirmDel(false)
  }

  const addDish = async () => {
    if (dirty) {
      setNotice('Enregistrez ou annulez les modifications avant d’ajouter un plat.')
      return
    }
    const cat = section !== 'Tous' ? section : (categories[0] ?? 'Burgers')
    const newItem: MenuItem = {
      cat,
      name: `Nouveau produit ${menu.length + 1}`,
      sig: false,
      price: '0',
      desc: '',
      vertus: '',
      badges: [],
    }
    const index = menu.length
    setMenu((prev) => [...prev, newItem])
    setSel(index)
    setConfirmDel(false)
    setSaveStatus('idle')
    setDirty(true)
    setMode('edit')
    pendingRef.current = { index, item: newItem }
    if (!canPersist) return
    const res = await upsertMenuItem(newItem)
    if (res.ok && res.id) {
      setMenu((prev) => prev.map((m, i) => (i === index ? { ...m, id: res.id } : m)))
      pendingRef.current = { index, item: { ...newItem, id: res.id } }
      setDirty(false)
      setSaveStatus('saved')
      baselineRef.current = { ...newItem, id: res.id, badges: [] }
    } else if (!res.ok) {
      setSaveStatus('error')
      setSaveErr(res.error)
    }
  }

  const duplicateDish = async () => {
    if (!item) return
    if (dirty) {
      setNotice('Enregistrez ou annulez avant de dupliquer.')
      return
    }
    const copy: MenuItem = {
      ...item,
      id: undefined,
      name: `${item.name} (copie)`,
      sig: false,
      badges: [...item.badges],
    }
    const index = menu.length
    setMenu((prev) => [...prev, copy])
    setSel(index)
    setMode('edit')
    setDirty(true)
    pendingRef.current = { index, item: copy }
    setNotice(`${item.name} dupliqué — complétez puis enregistrez.`)
    if (!canPersist) return
    const res = await upsertMenuItem(copy)
    if (res.ok && res.id) {
      setMenu((prev) => prev.map((m, i) => (i === index ? { ...m, id: res.id } : m)))
      pendingRef.current = { index, item: { ...copy, id: res.id } }
      setDirty(false)
      setSaveStatus('saved')
      baselineRef.current = { ...copy, id: res.id, badges: [...copy.badges] }
    } else if (!res.ok) {
      setSaveStatus('error')
      setSaveErr(res.error)
    }
  }

  const removeDish = async () => {
    if (!item || selIndex < 0) return
    if (canPersist && item.id) {
      const res = await deleteMenuItem(item.id)
      if (!res.ok) {
        setSaveStatus('error')
        setSaveErr(res.error)
        setDirty(true)
        return
      }
    }
    pendingRef.current = null
    const next = menu.filter((_, i) => i !== selIndex)
    setMenu(next)
    setSel(next.length ? Math.min(selIndex, next.length - 1) : 0)
    setConfirmDel(false)
    setSaveStatus('idle')
    setSaveErr(undefined)
    setDirty(false)
    setMode('preview')
  }

  const inp = inputStyle(t)

  if (!menu.length) {
    return (
      <div className="admin-page">
        <PageHeader
          title="Carte & prix"
          subtitle="Gérez vos plats, vos prix et ce qui est visible sur la carte publique."
          actions={<PrimaryButton onClick={() => void addDish()}>{Icon.plus(14, '#fff')} Ajouter un plat</PrimaryButton>}
        />
        <div style={{ marginTop: 20 }}>
          <EmptyState title="Aucun produit" subtitle="Ajoutez votre premier produit pour commencer." />
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page-wide">
      <PageHeader
        title="Carte & prix"
        subtitle="Gérez vos plats, vos prix et ce qui est visible sur la carte publique."
        badge={<span className="admin-chip is-live">{menu.length} plat{menu.length > 1 ? 's' : ''}</span>}
        actions={<PrimaryButton onClick={() => void addDish()}>{Icon.plus(14, '#fff')} Ajouter un plat</PrimaryButton>}
      />

      {notice ? (
        <div className="admin-status-live" role="status" aria-live="polite">{notice}</div>
      ) : null}

      <div className="admin-wf-site-status" aria-label="Statut de la carte">
        <div>
          <p className="admin-wf-eyebrow" style={{ margin: 0 }}>Carte active</p>
          <strong>Carte du restaurant</strong>
          <small>
            {menu.length} plat{menu.length > 1 ? 's' : ''} · {categories.length} catégorie{categories.length > 1 ? 's' : ''}
            {canPersist ? ' · synchronisée' : ' · aperçu local'}
          </small>
        </div>
        <div className="admin-wf-menu-status-actions">
          <span className="admin-chip is-live"><i />Publiée</span>
          <GhostButton color={t.primary} onClick={() => window.open('/#carte', '_blank', 'noopener')}>
            {Icon.eye(15)} Voir la carte
          </GhostButton>
          <PrimaryButton onClick={() => void flush()} disabled={!dirty && saveStatus !== 'error'}>
            Enregistrer
          </PrimaryButton>
        </div>
      </div>

      <div className="admin-wf-menu-summary" aria-label="Résumé de la carte">
        <div>
          <strong>{menu.length}</strong>
          <span>Plats publiés</span>
          <small>{categories.length} catégories</small>
        </div>
        <div>
          <strong>{signatures}</strong>
          <span>Signatures</span>
          <small>mis en avant</small>
        </div>
        <div>
          <strong>{avgPrice ? avgPrice.toLocaleString('fr-FR') : '—'}</strong>
          <span>Prix moyen ({currency})</span>
          <small>sur la carte actuelle</small>
        </div>
        <div>
          <strong>{missingPhotos}</strong>
          <span>Sans photo</span>
          <small>à compléter en Médias</small>
        </div>
      </div>

      <div className="admin-wf-menu-toolbar">
        <label className="admin-wf-menu-search">
          <span aria-hidden="true">{Icon.search(15)}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un plat"
            aria-label="Rechercher un plat"
          />
        </label>
        <div className="admin-wf-menu-tabs" role="tablist" aria-label="Catégories">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={section === tab}
              className={section === tab ? 'is-active' : undefined}
              onClick={() => setSection(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <GhostButton
          color={t.muted}
          title="Les onglets de catégorie filtrent déjà la liste."
          onClick={() => setNotice('Utilisez les onglets de catégorie pour filtrer la carte.')}
        >
          {Icon.list(15)} Filtrer
        </GhostButton>
      </div>

      <div className="admin-wf-menu-layout">
        <section className="admin-wf-panel admin-wf-menu-list" aria-label="Liste des plats">
          <div className="admin-wf-menu-list-head">
            <div>
              <p className="admin-wf-eyebrow" style={{ margin: 0 }}>Carte du restaurant</p>
              <h2>{filtered.length} plat{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}</h2>
            </div>
            <GhostButton
              color={t.primary}
              onClick={() => setNotice('Les catégories viennent des plats existants — créez un plat dans une nouvelle catégorie pour l’ajouter.')}
            >
              {Icon.plus(14)} Nouvelle section
            </GhostButton>
          </div>

          {filtered.map(({ m, index }) => {
            const active = index === selIndex
            const photo = hasPhoto(m)
            return (
              <button
                key={itemKey(m, index)}
                type="button"
                className={`admin-wf-menu-item${active ? ' is-selected' : ''}`}
                onClick={() => selectItem(index)}
              >
                <span className={`admin-wf-menu-thumb${photo ? ' has-photo' : ''}`} aria-hidden="true">
                  {photo ? Icon.image(18) : Icon.leaf(18)}
                </span>
                <span className="admin-wf-menu-item-copy">
                  <strong>{m.name}</strong>
                  <small>{m.desc || 'Sans description'}</small>
                  <em>{itemTag(m)}</em>
                </span>
                <span className="admin-wf-menu-item-price">
                  {formatPrice(m.price, currency)}
                  <small>{m.cat}</small>
                </span>
                <label
                  className="admin-wf-menu-switch"
                  title="Produit signature"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    aria-label={`Signature — ${m.name}`}
                    checked={!!m.sig}
                    onChange={() => {
                      if (index !== selIndex) {
                        if (dirty) {
                          setNotice('Enregistrez ou annulez avant de modifier un autre plat.')
                          return
                        }
                        setSel(index)
                      }
                      const next = menu.map((row, i) => (i === index ? { ...row, sig: !row.sig } : row))
                      setMenu(next)
                      const updated = next[index]
                      if (!updated) return
                      setDirty(true)
                      setSaveStatus('idle')
                      pendingRef.current = { index, item: updated }
                      setSel(index)
                    }}
                  />
                  <span aria-hidden="true" />
                </label>
                <span className="admin-wf-menu-chevron" aria-hidden="true">{Icon.chevronRight(16)}</span>
              </button>
            )
          })}

          {filtered.length === 0 && (
            <div className="admin-wf-menu-empty">
              {Icon.search(28)}
              <strong>Aucun plat trouvé</strong>
              <small>Essayez une autre recherche ou réinitialisez le filtre.</small>
            </div>
          )}
        </section>

        <aside className="admin-wf-panel admin-wf-menu-preview" aria-label="Aperçu du plat">
          {!item ? (
            <EmptyState title="Sélectionnez un plat" subtitle="Choisissez un produit dans la liste." />
          ) : mode === 'preview' ? (
            <>
              <div className="admin-wf-menu-preview-head">
                <div>
                  <p className="admin-wf-eyebrow" style={{ margin: 0 }}>Aperçu du plat</p>
                  <h2>Carte publique</h2>
                </div>
                <span className="admin-chip">Mobile</span>
              </div>
              <div className="admin-wf-menu-preview-card">
                <span className={`admin-wf-menu-preview-image${hasPhoto(item) ? ' has-photo' : ''}`} aria-hidden="true">
                  {hasPhoto(item) ? Icon.image(36) : Icon.leaf(36)}
                </span>
                <p className="admin-wf-eyebrow">{item.cat}</p>
                <h3>{item.name}</h3>
                <p>{item.desc || 'Ajoutez une description pour ce plat.'}</p>
                <div>
                  <strong>{formatPrice(item.price, currency)}</strong>
                  <em>{itemTag(item)}</em>
                </div>
              </div>
              <div className="admin-wf-menu-edit-actions">
                <GhostButton color={t.primary} onClick={() => setMode('edit')}>
                  {Icon.write(15)} Modifier le plat
                </GhostButton>
                <GhostButton color={t.muted} onClick={() => void duplicateDish()}>
                  {Icon.copy(15)} Dupliquer
                </GhostButton>
              </div>
            </>
          ) : (
            <>
              <div className="admin-wf-menu-preview-head">
                <div>
                  <p className="admin-wf-eyebrow" style={{ margin: 0 }}>Édition</p>
                  <h2>{item.name}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <SaveBar status={saveStatus} error={saveErr} />
                  <GhostButton color={t.muted} onClick={() => { if (!dirty) setMode('preview') }}>
                    Aperçu
                  </GhostButton>
                </div>
              </div>

              <div className="admin-wf-menu-edit-form">
                <div className="admin-wf-menu-edit-row">
                  <div>
                    <FieldLabel>Nom</FieldLabel>
                    <Input value={item.name} onChange={(e) => update('name', e.target.value)} style={inp} />
                  </div>
                  <div>
                    <FieldLabel>Prix ({currency})</FieldLabel>
                    <Input
                      value={item.price}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9\s]/g, '').trim()
                        update('price', digits)
                      }}
                      style={inp}
                      inputMode="numeric"
                      placeholder="48 000"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Catégorie</FieldLabel>
                  <Select value={item.cat} onValueChange={(v) => update('cat', v)}>
                    <SelectTrigger style={{ borderColor: 'var(--admin-line)', borderRadius: 12, background: 'var(--admin-paper-muted)', padding: '11px 14px', minHeight: 44 }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FieldLabel>Description</FieldLabel>
                  <Textarea rows={3} value={item.desc} onChange={(e) => update('desc', e.target.value)} style={inp} />
                </div>

                <div>
                  <FieldLabel>Vertus (panneau dépliable)</FieldLabel>
                  <Textarea rows={2} value={item.vertus} onChange={(e) => update('vertus', e.target.value)} style={inp} />
                </div>

                <div>
                  <FieldLabel>Badges</FieldLabel>
                  <div className="admin-wf-menu-badges">
                    {(['omni', 'vege', 'gluten', 'arachide', 'lactose'] as const).map((b) => {
                      const on = item.badges.includes(b)
                      return (
                        <button
                          key={b}
                          type="button"
                          className={on ? 'is-on' : undefined}
                          onClick={() => update('badges', on ? item.badges.filter((x) => x !== b) : [...item.badges, b])}
                        >
                          {BADGE_DEFS[b]?.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <label className="admin-wf-menu-sig-row">
                  <Switch checked={!!item.sig} onCheckedChange={(v) => update('sig', v)} />
                  <span>Produit signature</span>
                </label>

                <div className="admin-hint-box">
                  La disponibilité temporaire (épuisé) n’est pas encore stockée en base — le commutateur de la liste pilote la signature.
                </div>

                <div style={{ marginTop: 8 }}>
                  {confirmDel ? (
                    <div className="admin-wf-menu-confirm-del">
                      <span>Supprimer « {item.name} » ?</span>
                      <PrimaryButton onClick={() => void removeDish()}>Confirmer</PrimaryButton>
                      <GhostButton color={t.muted} onClick={() => setConfirmDel(false)}>Annuler</GhostButton>
                    </div>
                  ) : (
                    <GhostButton color="var(--admin-coral)" onClick={() => setConfirmDel(true)}>
                      {Icon.trash(13, 'var(--admin-coral)')} Supprimer ce produit
                    </GhostButton>
                  )}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {dirty ? (
        <div className="admin-wf-dirty-bar" role="status" aria-live="polite">
          <span>
            <strong>1 modification non enregistrée</strong>
            <small>{canPersist ? 'Enregistrez pour synchroniser la carte.' : 'Aperçu local — connexion requise pour synchroniser.'}</small>
          </span>
          <div>
            <GhostButton color={t.muted} onClick={discard}>Annuler</GhostButton>
            <PrimaryButton onClick={() => void flush()} busy={saveStatus === 'saving'}>Enregistrer</PrimaryButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}
