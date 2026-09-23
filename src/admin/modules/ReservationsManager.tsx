import { useState, useEffect, useMemo } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { Icon } from '@/lib/icons'
import { PageHeader, EmptyState, inputStyle, GhostButton, PrimaryButton, Pagination } from '@/admin/ui'
import { canDo } from '@/data/rbac'
import {
  fetchReservations,
  updateReservationStatus,
  deleteReservation,
  insertReservation,
  logAudit,
  type Reservation,
} from '@/lib/repository'
import { invokeReservationStatusEmail, getSupabase } from '@/lib/supabase'
import { Bouton } from '@/admin/editor/chrome'
import { dateFr } from '@/admin/shared'

type ResaView = 'Planning' | 'Liste' | 'Tables'

function initials(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?'
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDayLabel(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function ReservationsManager() {
  const { theme: t, dataSource } = useSite()
  const { user } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ResaView>('Planning')
  const [focusDate, setFocusDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [statusSending, setStatusSending] = useState(false)
  const [statusErr, setStatusErr] = useState<string | undefined>(undefined)
  const [creating, setCreating] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [newForm, setNewForm] = useState({
    nom: '',
    email: '',
    phone: '',
    date: new Date().toISOString().slice(0, 10),
    time: '19:00',
    guests: '2',
    message: '',
  })

  const RESA_PAGE = 12
  const today = new Date().toISOString().slice(0, 10)
  const statusLabel: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    cancelled: 'Annulée',
  }

  useEffect(() => {
    if (dataSource !== 'supabase') {
      setLoading(false)
      return
    }
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
      channel = sb
        .channel('reservations-realtime', { config: { private: false } })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, refresh)
        .subscribe()
      timer = setInterval(refresh, 60000)
    } else {
      timer = setInterval(refresh, 30000)
    }
    return () => {
      active = false
      if (channel) channel.unsubscribe()
      if (timer) clearInterval(timer)
    }
  }, [dataSource])

  useEffect(() => { setPage(1) }, [filter, query, view, focusDate])

  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setSelectedId(null)
        setConfirmDel(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])

  const q = query.trim().toLowerCase()
  const matches = useMemo(() => {
    return reservations.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false
      if (view !== 'Liste' && r.date !== focusDate) return false
      if (!q) return true
      return (
        r.nom.toLowerCase().includes(q)
        || r.email.toLowerCase().includes(q)
        || r.phone.toLowerCase().includes(q)
        || r.date.toLowerCase().includes(q)
        || r.time.toLowerCase().includes(q)
      )
    }).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  }, [reservations, filter, focusDate, q, view])

  const paged = matches.slice((page - 1) * RESA_PAGE, page * RESA_PAGE)
  const listRows = view === 'Liste' ? paged : matches
  const selected = selectedId ? reservations.find((r) => r.id === selectedId) ?? null : null

  const counts = {
    all: reservations.length,
    pending: reservations.filter((r) => r.status === 'pending').length,
    confirmed: reservations.filter((r) => r.status === 'confirmed').length,
    cancelled: reservations.filter((r) => r.status === 'cancelled').length,
  }
  const todayRows = reservations.filter((r) => r.date === today)
  const todayGuests = todayRows.filter((r) => r.status !== 'cancelled').reduce((n, r) => n + r.guests, 0)
  const focusGuests = matches.filter((r) => r.status !== 'cancelled').reduce((n, r) => n + r.guests, 0)

  const exportCsv = () => {
    const rows = [['Nom', 'Email', 'Téléphone', 'Date', 'Heure', 'Couverts', 'Statut', 'Message', 'Créée le'].join(';')]
    matches.forEach((r) => {
      rows.push(
        [r.nom, r.email, r.phone, r.date, r.time, String(r.guests), statusLabel[r.status] || r.status, (r.message || '').replace(/[\n\r]+/g, ' '), r.created_at ? new Date(r.created_at).toLocaleString('fr-FR') : '']
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(';'),
      )
    })
    const blob = new Blob([`\uFEFF${rows.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reservations-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const removeResa = async (id: string) => {
    const res = await deleteReservation(id)
    if (!res.ok) {
      setStatusErr(res.error || 'Échec de la suppression')
      setTimeout(() => setStatusErr(undefined), 4000)
      return
    }
    setReservations((prev) => prev.filter((r) => r.id !== id))
    setConfirmDel(null)
    if (selectedId === id) setSelectedId(null)
    await logAudit({
      actor: user?.email ?? '',
      action: 'reservation_delete',
      target: `Réservation ${reservations.find((r) => r.id === id)?.nom ?? id}`,
      detail: 'Suppression de réservation',
    })
  }

  const updateStatus = async (id: string, status: string) => {
    setStatusErr(undefined)
    const res = await updateReservationStatus(id, status)
    if (!res.ok) {
      setStatusErr(res.error || 'Échec de la mise à jour')
      setTimeout(() => setStatusErr(undefined), 4000)
      return
    }
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    const r = reservations.find((x) => x.id === id)
    if (r) {
      await logAudit({
        actor: user?.email ?? '',
        action: 'reservation_status',
        target: `Réservation ${r.nom}`,
        detail: `→ ${statusLabel[status] ?? status}`,
      })
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

  const createResa = async () => {
    if (!newForm.nom.trim() || !newForm.email.trim()) {
      setStatusErr('Nom et e-mail sont requis.')
      setTimeout(() => setStatusErr(undefined), 4000)
      return
    }
    setCreating(true)
    const ok = await insertReservation({
      nom: newForm.nom.trim(),
      email: newForm.email.trim(),
      phone: newForm.phone.trim(),
      date: newForm.date,
      time: newForm.time,
      guests: Number(newForm.guests) || 1,
      message: newForm.message.trim(),
    })
    setCreating(false)
    if (!ok) {
      setStatusErr('Impossible de créer la réservation.')
      setTimeout(() => setStatusErr(undefined), 4000)
      return
    }
    setNewOpen(false)
    setFocusDate(newForm.date)
    const res = await fetchReservations()
    if (res.fromDb) setReservations(res.data)
    await logAudit({
      actor: user?.email ?? '',
      action: 'reservation_create',
      target: `Réservation ${newForm.nom.trim()}`,
      detail: `${newForm.date} ${newForm.time}`,
    })
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

  const detailPanel = selected ? (
    <aside className="admin-wf-resa-detail" aria-label={`Détail réservation ${selected.nom}`}>
      <p className="admin-wf-eyebrow" style={{ margin: 0 }}>Détail de la réservation</p>
      <div className="admin-wf-resa-client">
        <b className="admin-wf-resa-avatar is-large" aria-hidden="true">{initials(selected.nom)}</b>
        <div>
          <h2>{selected.nom}</h2>
          <small>{selected.phone || selected.email}</small>
        </div>
      </div>
      <div className="admin-wf-resa-detail-grid">
        <div><span>Heure</span><strong>{selected.time}</strong></div>
        <div><span>Couverts</span><strong>{selected.guests} personne{selected.guests > 1 ? 's' : ''}</strong></div>
        <div><span>Date</span><strong>{selected.date}</strong></div>
        <div><span>Statut</span><strong>{statusLabel[selected.status] ?? selected.status}</strong></div>
      </div>
      {selected.message ? (
        <div className="admin-wf-theme-note">Note client : {selected.message}</div>
      ) : (
        <div className="admin-wf-theme-note">Aucune note client.</div>
      )}
      {selected.created_at && (
        <div className="admin-ops-meta">Créée {dateFr(selected.created_at)} · {selected.email}</div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {selected.status !== 'confirmed' && (
          <PrimaryButton onClick={() => updateStatus(selected.id!, 'confirmed')}>Confirmer</PrimaryButton>
        )}
        {selected.email && (
          <GhostButton color={t.primary} onClick={() => { window.location.href = `mailto:${selected.email}` }}>
            Contacter
          </GhostButton>
        )}
        <GhostButton
          color={t.muted}
          title="Aucune table en base pour l’instant"
          onClick={() => setStatusErr('Le plan de salle n’est pas encore configuré — aucune table à attribuer.')}
        >
          Attribuer une table
        </GhostButton>
        {selected.status !== 'cancelled' && (
          <GhostButton color="#dc2626" onClick={() => updateStatus(selected.id!, 'cancelled')}>
            Annuler
          </GhostButton>
        )}
        {canDo('reservations', 'delete', user?.role ?? '') && (
          confirmDel === selected.id ? (
            <>
              <Bouton genre="danger" onClick={() => removeResa(selected.id!)}>Confirmer la suppression</Bouton>
              <Bouton genre="secondaire" onClick={() => setConfirmDel(null)}>Retour</Bouton>
            </>
          ) : (
            <GhostButton color="#dc2626" onClick={() => setConfirmDel(selected.id ?? null)}>
              {Icon.trash(14, '#dc2626')} Supprimer
            </GhostButton>
          )
        )}
      </div>
      <Bouton genre="silencieux" onClick={() => { setSelectedId(null); setConfirmDel(null) }}>Fermer</Bouton>
    </aside>
  ) : (
    <aside className="admin-wf-resa-detail" aria-label="Aucun détail">
      <p className="admin-wf-eyebrow" style={{ margin: 0 }}>Détail de la réservation</p>
      <div className="admin-empty" style={{ padding: '24px 8px', border: 0, background: 'transparent' }}>
        <div style={{ opacity: 0.45, marginBottom: 8 }}>{Icon.calendar(28)}</div>
        <strong>Sélectionnez une réservation</strong>
        <span style={{ display: 'block', marginTop: 6, fontSize: 13, opacity: 0.65 }}>Le détail s’affiche ici.</span>
      </div>
    </aside>
  )

  return (
    <div className="admin-page-wide">
      <PageHeader
        title="Réservations"
        subtitle="Comprenez l’état du service et agissez en quelques secondes."
        actions={
          <>
            <GhostButton color={t.primary} onClick={exportCsv} disabled={matches.length === 0}>Exporter</GhostButton>
            <PrimaryButton onClick={() => setNewOpen((v) => !v)}>Nouvelle réservation</PrimaryButton>
          </>
        }
      />

      <div className={`admin-status-live${statusErr ? ' is-error' : ''}`} role="status" aria-live="polite">
        {statusSending ? 'Envoi de la notification…' : statusErr ? `Erreur : ${statusErr}` : loading ? 'Chargement des réservations…' : ''}
      </div>

      {newOpen && (
        <div className="admin-wf-panel" style={{ marginBottom: 14 }}>
          <div className="admin-wf-panel-head">
            <h2 className="admin-section-title" style={{ margin: 0 }}>Nouvelle réservation</h2>
            <Bouton genre="silencieux" onClick={() => setNewOpen(false)}>Fermer</Bouton>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginTop: 12 }}>
            {([
              ['nom', 'Nom', 'text'],
              ['email', 'E-mail', 'email'],
              ['phone', 'Téléphone', 'tel'],
              ['date', 'Date', 'date'],
              ['time', 'Heure', 'time'],
              ['guests', 'Couverts', 'number'],
            ] as const).map(([key, label, type]) => (
              <label key={key} className="admin-wf-media-field">
                <span>{label}</span>
                <input
                  type={type}
                  value={newForm[key]}
                  onChange={(e) => setNewForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={inputStyle(t)}
                />
              </label>
            ))}
            <label className="admin-wf-media-field" style={{ gridColumn: '1 / -1' }}>
              <span>Note</span>
              <input
                value={newForm.message}
                onChange={(e) => setNewForm((f) => ({ ...f, message: e.target.value }))}
                style={inputStyle(t)}
                placeholder="Anniversaire, allergie…"
              />
            </label>
          </div>
          <div style={{ marginTop: 12 }}>
            <PrimaryButton busy={creating} onClick={createResa}>Enregistrer la réservation</PrimaryButton>
          </div>
        </div>
      )}

      {loading ? (
        <div className="admin-loading">Chargement…</div>
      ) : reservations.length === 0 && !newOpen ? (
        <div style={{ marginTop: 20 }}>
          <EmptyState icon={Icon.calendar(28, t.muted)} title="Aucune réservation" subtitle="Les demandes de table apparaîtront ici." />
        </div>
      ) : (
        <>
          <div className="admin-wf-resa-summary" aria-label="Résumé des réservations">
            <div>
              <span>Aujourd’hui</span>
              <strong>{todayRows.length} réservation{todayRows.length > 1 ? 's' : ''}</strong>
              <small>{todayGuests} couverts prévus</small>
            </div>
            <div>
              <span>Jour affiché</span>
              <strong>{focusGuests} couverts</strong>
              <small>{matches.length} sur la vue</small>
            </div>
            <div>
              <span>À confirmer</span>
              <strong>{counts.pending}</strong>
              <small>action recommandée</small>
            </div>
            <div className="is-status">
              <strong>●</strong>
              <span>Service ouvert</span>
              <small>{counts.confirmed} confirmées</small>
            </div>
          </div>

          <div className="admin-wf-resa-datebar">
            <div className="admin-wf-resa-date-controls">
              <Bouton genre="secondaire" aria-label="Jour précédent" onClick={() => setFocusDate((d) => shiftDate(d, -1))}>
                {Icon.chevronLeft(16)}
              </Bouton>
              <Bouton genre="secondaire" onClick={() => setFocusDate(today)}>
                {Icon.calendar(14)} {formatDayLabel(focusDate)}
              </Bouton>
              <Bouton genre="secondaire" aria-label="Jour suivant" onClick={() => setFocusDate((d) => shiftDate(d, 1))}>
                {Icon.chevronRight(16)}
              </Bouton>
              {focusDate !== today && (
                <GhostButton color={t.primary} onClick={() => setFocusDate(today)}>Aujourd’hui</GhostButton>
              )}
            </div>
            <div className="admin-wf-resa-views" role="group" aria-label="Mode d’affichage">
              {(['Planning', 'Liste', 'Tables'] as ResaView[]).map((item) => (
                <Bouton
                  key={item}
                  genre={view === item ? 'actif' : 'secondaire'}
                  aria-pressed={view === item}
                  onClick={() => setView(item)}
                >
                  {item}
                </Bouton>
              ))}
            </div>
          </div>

          <div className="admin-toolbar">
            <div className="admin-filter-row" role="group" aria-label="Filtrer par statut" style={{ margin: 0, flex: 1 }}>
              {([['all', 'Toutes'], ['pending', 'En attente'], ['confirmed', 'Confirmées'], ['cancelled', 'Annulées']] as [string, string][]).map(([k, l]) => (
                <button key={k} type="button" className="admin-filter-chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                  {l} <span style={{ opacity: 0.7 }}>{counts[k as keyof typeof counts] ?? 0}</span>
                </button>
              ))}
            </div>
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un client ou téléphone"
                aria-label="Rechercher une réservation"
                style={{ ...inputStyle(t), paddingLeft: 34, fontSize: 13, minHeight: 44 }}
              />
              <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} aria-hidden="true">
                {Icon.search(15, t.muted)}
              </span>
            </div>
          </div>

          <div className="admin-wf-resa-layout" style={{ marginTop: 14 }}>
            <main className="admin-wf-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="admin-wf-media-library-head">
                <div>
                  <span className="admin-wf-eyebrow">{view} du service</span>
                  <strong>
                    {view === 'Tables'
                      ? 'Plan de salle'
                      : `${listRows.length} affichée${listRows.length > 1 ? 's' : ''}`}
                  </strong>
                </div>
                <span style={{ fontSize: 12, color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)' }}>
                  {view === 'Liste' ? 'Toutes dates filtrées' : formatDayLabel(focusDate)}
                </span>
              </div>

              {view === 'Tables' ? (
                <div className="admin-wf-resa-tables-disabled">
                  <strong style={{ display: 'block', marginBottom: 6, color: 'var(--admin-ink)' }}>Plan de salle non disponible</strong>
                  Aucune table n’est définie en base pour l’instant. La vue Tables restera désactivée
                  jusqu’à ce que le plan de salle soit configuré — pas de plan inventé.
                </div>
              ) : listRows.length === 0 ? (
                <p className="admin-loading">Aucune réservation dans cette vue.</p>
              ) : (
                <div className="admin-wf-resa-list">
                  {listRows.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`admin-wf-resa-card${selectedId === r.id ? ' is-selected' : ''}`}
                      onClick={() => setSelectedId(r.id ?? null)}
                      aria-pressed={selectedId === r.id}
                    >
                      <time dateTime={`${r.date}T${r.time}`}>{r.time}</time>
                      <b className="admin-wf-resa-avatar" aria-hidden="true">{initials(r.nom)}</b>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: 14 }}>{r.nom}</strong>
                        <small style={{ display: 'block', marginTop: 2, fontSize: 12, opacity: 0.65 }}>
                          {r.guests} couvert{r.guests > 1 ? 's' : ''}
                          {view === 'Liste' ? ` · ${r.date}` : ''}
                          {r.phone ? ` · ${r.phone}` : ''}
                        </small>
                        {r.message ? (
                          <em style={{ display: 'block', marginTop: 4, fontSize: 12, fontStyle: 'normal', opacity: 0.7 }}>
                            {r.message}
                          </em>
                        ) : null}
                      </span>
                      <i className={`admin-chip${r.status === 'pending' ? ' is-danger' : r.status === 'confirmed' ? ' is-live' : ''}`}>
                        {statusLabel[r.status] ?? r.status}
                      </i>
                    </button>
                  ))}
                </div>
              )}

              {view === 'Liste' && (
                <div style={{ padding: '8px 12px' }}>
                  <Pagination
                    page={page}
                    pageSize={RESA_PAGE}
                    total={matches.length}
                    onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  />
                </div>
              )}
            </main>
            {detailPanel}
          </div>
        </>
      )}
    </div>
  )
}
