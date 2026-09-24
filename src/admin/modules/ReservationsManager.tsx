import { useState, useEffect, useMemo } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { Icon } from '@/lib/icons'
import { PageHeader, EmptyState, inputStyle, GhostButton, PrimaryButton, Pagination, BientotDialog } from '@/admin/ui'
import { canDo } from '@/data/rbac'
import {
  updateReservationStatus,
  deleteReservation,
  insertReservation,
  logAudit,
} from '@/lib/repository'
import { invokeReservationStatusEmail } from '@/lib/supabase'
import { Bouton } from '@/admin/editor/chrome'
import { dateFr } from '@/admin/shared'

type ResaView = 'Planning' | 'Liste'

const BIENTOT_TABLES = {
  titre: 'Le plan de salle arrive bientôt',
  message:
    'Pour l’instant, vos clients réservent via le formulaire du site (date, heure, nombre de personnes). '
    + 'Vous voyez et confirmez leurs demandes ici. L’attribution d’une table précise et le plan de salle '
    + 'sont en cours de préparation — on vous préviendra dès que ce sera prêt.',
} as const

const BIENTOT_ATTRIBUER = {
  titre: 'Attribution de table bientôt disponible',
  message:
    'Cette action n’est pas encore branchée : le site public ne propose pas encore de choisir une table. '
    + 'En attendant, confirmez la réservation et contactez le client si besoin. '
    + 'Le plan de salle et l’attribution arriveront dans une prochaine mise à jour.',
} as const

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

/** Date locale YYYY-MM-DD — évite le décalage UTC de toISOString() près de minuit. */
function localIsoDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function compterParStatut(rows: { status: string }[]) {
  return {
    all: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    confirmed: rows.filter((r) => r.status === 'confirmed').length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
  }
}

export function ReservationsManager() {
  const { theme: t, dataSource, reservations, refreshReservations } = useSite()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ResaView>('Planning')
  const [focusDate, setFocusDate] = useState(() => localIsoDate())
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [statusSending, setStatusSending] = useState(false)
  const [statusErr, setStatusErr] = useState<string | undefined>(undefined)
  const [creating, setCreating] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [bientot, setBientot] = useState<null | { titre: string; message: string }>(null)
  const [newForm, setNewForm] = useState({
    nom: '',
    email: '',
    phone: '',
    date: localIsoDate(),
    time: '19:00',
    guests: '2',
    message: '',
  })

  const RESA_PAGE = 12
  const today = localIsoDate()
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
    ;(async () => {
      await refreshReservations()
      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [dataSource, refreshReservations])

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

  /* Compteurs GLOBAUX = badge sidebar / « À confirmer ».
     Compteurs DU JOUR = puces de filtre en Planning (sinon badge 3 vs liste vide). */
  const counts = useMemo(() => compterParStatut(reservations), [reservations])
  const dayRows = useMemo(
    () => reservations.filter((r) => r.date === focusDate),
    [reservations, focusDate],
  )
  const dayCounts = useMemo(() => compterParStatut(dayRows), [dayRows])
  const chipCounts = view === 'Liste' ? counts : dayCounts
  const pendingHorsJour = counts.pending - dayCounts.pending
  const todayRows = reservations.filter((r) => r.date === today)
  const todayGuests = todayRows.filter((r) => r.status !== 'cancelled').reduce((n, r) => n + r.guests, 0)
  const focusGuests = matches.filter((r) => r.status !== 'cancelled').reduce((n, r) => n + r.guests, 0)

  const appliquerFiltreStatut = (k: string) => {
    setFilter(k)
    /* En Planning, une puce « En attente » vide alors que le badge affiche N
       hors jour → bascule sur Liste pour montrer la vérité globale. */
    if (view !== 'Liste' && k === 'pending' && dayCounts.pending === 0 && counts.pending > 0) {
      setView('Liste')
    }
  }

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
    const cible = reservations.find((r) => r.id === id)
    const res = await deleteReservation(id)
    if (!res.ok) {
      setStatusErr(res.error || 'Échec de la suppression')
      setTimeout(() => setStatusErr(undefined), 4000)
      return
    }
    setConfirmDel(null)
    if (selectedId === id) setSelectedId(null)
    await refreshReservations()
    await logAudit({
      actor: user?.email ?? '',
      action: 'reservation_delete',
      target: `Réservation ${cible?.nom ?? id}`,
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
    const r = reservations.find((x) => x.id === id)
    await refreshReservations()
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
    const res = await insertReservation({
      nom: newForm.nom.trim(),
      email: newForm.email.trim(),
      phone: newForm.phone.trim(),
      date: newForm.date,
      time: newForm.time,
      guests: Number(newForm.guests) || 1,
      message: newForm.message.trim(),
    })
    setCreating(false)
    if (!res.ok) {
      setStatusErr(res.error || 'Impossible de créer la réservation.')
      setTimeout(() => setStatusErr(undefined), 4000)
      return
    }
    setNewOpen(false)
    setFocusDate(newForm.date)
    await refreshReservations()
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
          className="admin-btn-bientot"
          aria-haspopup="dialog"
          title="Bientôt disponible"
          onClick={() => setBientot(BIENTOT_ATTRIBUER)}
        >
          Attribuer une table
          <span className="admin-btn-bientot-tag">Bientôt</span>
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
              <small>toutes dates · même chiffre que le badge</small>
            </div>
            <div className="is-status">
              <strong>●</strong>
              <span>Confirmées</span>
              <small>{counts.confirmed} au total</small>
            </div>
          </div>

          {pendingHorsJour > 0 && view !== 'Liste' && (
            <section className="admin-wf-alert" aria-label="Alerte réservations" style={{ marginTop: 12 }}>
              <span aria-hidden="true">{Icon.calendar(20, 'var(--admin-coral)')}</span>
              <span>
                <strong>
                  {pendingHorsJour} réservation{pendingHorsJour > 1 ? 's' : ''} à confirmer hors de ce jour
                </strong>
                <small>
                  Le planning n’affiche que le {formatDayLabel(focusDate)}.
                  {dayCounts.pending > 0
                    ? ` ${dayCounts.pending} en attente ici.`
                    : ' Aucune en attente ce jour-là.'}
                </small>
              </span>
              <Bouton
                genre="silencieux"
                onClick={() => { setView('Liste'); setFilter('pending') }}
              >
                Voir les alertes
              </Bouton>
            </section>
          )}

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
              {(['Planning', 'Liste'] as ResaView[]).map((item) => (
                <Bouton
                  key={item}
                  genre={view === item ? 'actif' : 'secondaire'}
                  aria-pressed={view === item}
                  onClick={() => setView(item)}
                >
                  {item}
                </Bouton>
              ))}
              <Bouton
                genre="secondaire"
                className="admin-btn-bientot"
                aria-haspopup="dialog"
                aria-pressed={false}
                title="Bientôt disponible"
                onClick={() => setBientot(BIENTOT_TABLES)}
              >
                Tables
                <span className="admin-btn-bientot-tag">Bientôt</span>
              </Bouton>
            </div>
          </div>

          <div className="admin-toolbar">
            <div className="admin-filter-row" role="group" aria-label="Filtrer par statut" style={{ margin: 0, flex: 1 }}>
              {([['all', 'Toutes'], ['pending', 'En attente'], ['confirmed', 'Confirmées'], ['cancelled', 'Annulées']] as [string, string][]).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  className="admin-filter-chip"
                  aria-pressed={filter === k}
                  title={view === 'Liste' ? 'Compteur sur toutes les dates' : `Compteur du ${focusDate}`}
                  onClick={() => appliquerFiltreStatut(k)}
                >
                  {l} <span style={{ opacity: 0.7 }}>{chipCounts[k as keyof typeof chipCounts] ?? 0}</span>
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
                    {`${listRows.length} affichée${listRows.length > 1 ? 's' : ''}`}
                  </strong>
                </div>
                <span style={{ fontSize: 12, color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)' }}>
                  {view === 'Liste' ? 'Toutes dates filtrées' : formatDayLabel(focusDate)}
                </span>
              </div>

              {listRows.length === 0 ? (
                <div className="admin-loading" style={{ padding: '20px 16px' }}>
                  <p style={{ margin: 0 }}>Aucune réservation dans cette vue.</p>
                  {view !== 'Liste' && counts.pending > 0 && (
                    <p style={{ margin: '8px 0 0', fontSize: 13 }}>
                      {counts.pending} en attente sur d’autres jours.{' '}
                      <button
                        type="button"
                        className="admin-linkish"
                        style={{ background: 'none', border: 0, color: 'var(--admin-forest)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}
                        onClick={() => { setView('Liste'); setFilter('pending') }}
                      >
                        Afficher la liste
                      </button>
                    </p>
                  )}
                </div>
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

      <BientotDialog
        open={bientot != null}
        titre={bientot?.titre ?? ''}
        message={bientot?.message ?? ''}
        onClose={() => setBientot(null)}
      />
    </div>
  )
}
