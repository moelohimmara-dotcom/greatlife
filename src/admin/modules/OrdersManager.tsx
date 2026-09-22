import { useState, useEffect } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { Icon } from '@/lib/icons'
import { PageHeader, EmptyState, inputStyle, GhostButton, Pagination } from '@/admin/ui'
import { canDo } from '@/data/rbac'
import { fetchOrders, updateOrderStatus, deleteOrder, logAudit, type Order } from '@/lib/repository'
import { invokeOrderStatusEmail, getSupabase } from '@/lib/supabase'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Bouton } from '@/admin/editor/chrome'
import { dateFr } from '@/admin/shared'

export function OrdersManager() {
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
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban')
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
      <PageHeader
        title="Commandes"
        subtitle="Traitez chaque commande sans perdre de temps."
        actions={<GhostButton color={t.primary} onClick={exportCsv} disabled={sorted.length === 0}>Exporter</GhostButton>}
      />
      <div className="admin-status-live" role="status" aria-live="polite">
        {statusSending ? 'Envoi de la notification…' : statusErr ? `Erreur : ${statusErr}` : loading ? 'Chargement des commandes…' : ''}
      </div>
      {!loading && orders.length > 0 && (
        <>
          <div className="admin-wf-kpis" aria-label="Indicateurs commandes">
            <div>
              <strong>{counts.pending}</strong>
              <span>À traiter maintenant</span>
              <small>en attente de confirmation</small>
            </div>
            <div>
              <strong>{counts.preparing}</strong>
              <span>En préparation</span>
              <small>cuisine en cours</small>
            </div>
            <div>
              <strong>{counts.all}</strong>
              <span>Commandes au total</span>
              <small>{counts.ready} prêtes</small>
            </div>
            <div>
              <strong>{counts.pending + counts.confirmed}</strong>
              <span>File active</span>
              <small>attente + confirmées</small>
            </div>
          </div>
          {counts.pending > 0 && (
            <section className="admin-wf-alert" aria-label="Alerte commandes">
              <span aria-hidden="true">{Icon.coin(20, 'var(--admin-coral)')}</span>
              <span>
                <strong>{counts.pending} commande{counts.pending > 1 ? 's' : ''} nécessitent votre attention</strong>
                <small>Confirmez ou préparez-les pour ne pas faire attendre vos clients.</small>
              </span>
              <Bouton genre="silencieux" onClick={() => setFilter('pending')}>Voir les alertes</Bouton>
            </section>
          )}
        </>
      )}
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
          <div role="group" aria-label="Mode d’affichage" style={{ display: 'inline-flex', gap: 6 }}>
            <Bouton genre={viewMode === 'kanban' ? 'actif' : 'secondaire'} aria-pressed={viewMode === 'kanban'} onClick={() => setViewMode('kanban')}>Kanban</Bouton>
            <Bouton genre={viewMode === 'list' ? 'actif' : 'secondaire'} aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}>Liste</Bouton>
          </div>
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
        {viewMode === 'kanban' ? (
          <>
            <div className="admin-wf-kanban" aria-label="Kanban des commandes">
              {([
                ['pending', 'Nouvelles'],
                ['confirmed', 'Confirmées'],
                ['preparing', 'En préparation'],
                ['ready', 'Prêtes'],
                ['delivered', 'Terminées'],
              ] as const).map(([status, label]) => {
                const col = sorted.filter((o) => o.status === status)
                return (
                  <section key={status} className="admin-wf-kanban-col" aria-labelledby={`kanban-${status}`}>
                    <div className="admin-wf-kanban-head">
                      <strong id={`kanban-${status}`}>{label}</strong>
                      <b>{col.length}</b>
                    </div>
                    {col.length === 0 ? (
                      <div className="admin-empty admin-empty-compact">Vide</div>
                    ) : col.map((o) => {
                      const qty = o.items.reduce((n, it) => n + it.qty, 0)
                      const cta = status === 'pending' ? 'Confirmer' : status === 'preparing' ? 'Continuer' : status === 'ready' ? 'Marquer terminée' : 'Voir détail'
                      return (
                        <button
                          key={o.id}
                          type="button"
                          className={`admin-wf-kanban-card${selectedId === o.id ? ' is-selected' : ''}`}
                          onClick={() => setSelectedId(o.id ?? null)}
                          aria-pressed={selectedId === o.id}
                        >
                          <span>
                            <strong>{o.ref || o.nom}</strong>
                            <small>{o.pickup_time || '—'} · {o.created_at ? dateFr(o.created_at) : ''}</small>
                          </span>
                          <div>
                            <strong>{o.nom}</strong>
                            <small>{qty} article{qty > 1 ? 's' : ''} · {o.total} FG</small>
                          </div>
                          <em>{cta}</em>
                        </button>
                      )
                    })}
                  </section>
                )
              })}
            </div>
            {selected && (
              <div className="admin-ops-split" style={{ marginTop: 16 }}>
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
                <section className="admin-wf-panel" aria-label="Vue cuisine">
                  <div className="admin-wf-panel-head">
                    <h2 style={{ margin: 0, fontFamily: 'var(--admin-font-display)', fontSize: 18 }}>Vue cuisine</h2>
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)' }}>
                    Affichage simplifié pour l’équipe — les commandes en préparation.
                  </p>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {orders.filter((o) => o.status === 'preparing' || o.status === 'ready').slice(0, 6).map((o) => (
                      <button
                        key={`kit-${o.id}`}
                        type="button"
                        className="admin-wf-kanban-card"
                        onClick={() => setSelectedId(o.id ?? null)}
                      >
                        <span>
                          <strong>{o.ref || o.nom}</strong>
                          <small>{statusLabel[o.status]}</small>
                        </span>
                        <div>
                          <strong>{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ') || '—'}</strong>
                          <small>Retrait {o.pickup_time || '—'}</small>
                        </div>
                      </button>
                    ))}
                    {orders.filter((o) => o.status === 'preparing' || o.status === 'ready').length === 0 && (
                      <div className="admin-empty admin-empty-compact">Rien en cuisine pour l’instant.</div>
                    )}
                  </div>
                </section>
              </div>
            )}
          </>
        ) : (
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
        )}
        {viewMode === 'list' && <Pagination page={page} pageSize={ORDERS_PAGE} total={sorted.length} onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />}
        </>
      }
    </div>
  )
}

