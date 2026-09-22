import { useState, useEffect } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { Icon } from '@/lib/icons'
import { PageHeader, EmptyState, inputStyle, GhostButton, Pagination } from '@/admin/ui'
import { canDo } from '@/data/rbac'
import { fetchReservations, updateReservationStatus, deleteReservation, logAudit, type Reservation } from '@/lib/repository'
import { invokeReservationStatusEmail, getSupabase } from '@/lib/supabase'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Bouton } from '@/admin/editor/chrome'
import { dateFr } from '@/admin/shared'

export function ReservationsManager() {
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
      <PageHeader
        title="Réservations"
        subtitle="Comprenez l’état du service et agissez en quelques secondes."
        actions={<GhostButton color={t.primary} onClick={exportCsv} disabled={sorted.length === 0}>Exporter</GhostButton>}
      />
      <div className={`admin-status-live${statusErr ? ' is-error' : ''}`} role="status" aria-live="polite">
        {statusSending ? 'Envoi de la notification…' : statusErr ? `Erreur : ${statusErr}` : loading ? 'Chargement des réservations…' : ''}
      </div>
      {loading ? <div className="admin-loading">Chargement…</div> :
        reservations.length === 0 ? <div style={{ marginTop: 20 }}><EmptyState icon={Icon.calendar(28, t.muted)} title="Aucune réservation" subtitle="Les demandes de table apparaîtront ici." /></div> :
        <>
        <div className="admin-wf-resa-summary" aria-label="Résumé des réservations">
          <div>
            <span>Aujourd’hui</span>
            <strong>{reservations.filter((r) => r.date === today).length}</strong>
            <small>{reservations.filter((r) => r.date === today && r.status !== 'cancelled').reduce((n, r) => n + r.guests, 0)} couverts prévus</small>
          </div>
          <div>
            <span>À confirmer</span>
            <strong>{counts.pending}</strong>
            <small>action recommandée</small>
          </div>
          <div>
            <span>Confirmées</span>
            <strong>{counts.confirmed}</strong>
            <small>sur {counts.all} au total</small>
          </div>
          <div className="is-status">
            <strong>●</strong>
            <span>Service ouvert</span>
            <small>{totalGuests} couverts filtrés</small>
          </div>
        </div>
        <div className="admin-toolbar">
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un client ou téléphone…" aria-label="Rechercher une réservation" style={{ ...inputStyle(t), paddingLeft: 34, fontSize: 13, minHeight: 44 }} />
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
          <div role="group" aria-label="Mode d’affichage" style={{ display: 'inline-flex', gap: 6 }}>
            <Bouton genre={view === 'planning' ? 'actif' : 'secondaire'} aria-pressed={view === 'planning'} onClick={() => setView('planning')}>Planning</Bouton>
            <Bouton genre={view === 'list' ? 'actif' : 'secondaire'} aria-pressed={view === 'list'} onClick={() => setView('list')}>Liste</Bouton>
          </div>
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


