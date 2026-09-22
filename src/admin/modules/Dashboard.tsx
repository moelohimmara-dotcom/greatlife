import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { fetchAuditLog, type AuditEntry } from '@/lib/repository'
import { dateFr, heureCourte } from '@/admin/shared'
import { pathForModule } from '@/admin/routes'

type Ticket = {
  id: string
  lane: 'now' | 'next' | 'watch'
  module: string
  kind: string
  title: string
  refTech?: string
  detail: string
  cta: string
  status: string
  statusTone: 'danger' | 'warn' | 'ok'
  urgent?: boolean
}

type ActivityRow = { id: string; title: string; detail: string; when: string }

export function Dashboard() {
  const {
    messages,
    dataSource,
    dataLoading,
    unhandledMessagesCount,
    pendingOrdersCount,
    pendingReservationsCount,
    content,
    orders,
    reservations,
  } = useSite()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [syncedAt, setSyncedAt] = useState<number | null>(null)
  const [auditTried, setAuditTried] = useState(false)

  useEffect(() => {
    if (dataSource === 'loading') return
    let active = true
    if (dataSource !== 'supabase') {
      setAuditTried(true)
      setSyncedAt(Date.now())
      return () => { active = false }
    }
    fetchAuditLog()
      .then((a) => {
        if (!active) return
        if (a.fromDb) setAuditEntries(a.data)
        setSyncedAt(Date.now())
      })
      .catch(() => {
        if (active) setSyncedAt(Date.now())
      })
      .finally(() => {
        if (active) setAuditTried(true)
      })
    return () => { active = false }
  }, [dataSource])

  const pendingOrders = orders.filter((o) => o.status === 'pending').slice(0, 6)
  const pendingResas = reservations.filter((r) => r.status === 'pending').slice(0, 6)
  const openMessages = messages.filter((m) => !m.handled).slice(0, 6)
  const currency = content.currency || 'FG'

  const tickets: Ticket[] = [
    ...pendingOrders.map((o): Ticket => {
      const ageH = o.created_at ? (Date.now() - new Date(o.created_at).getTime()) / 3600000 : 0
      const urgent = ageH >= 12
      return {
        id: `order-${o.id}`,
        lane: 'now',
        module: 'orders',
        kind: 'Commande',
        title: o.nom || o.ref,
        refTech: o.ref,
        detail: `${dateFr(o.created_at)} · ${o.total} ${currency}`.trim(),
        cta: 'Ouvrir',
        status: 'En attente',
        statusTone: urgent ? 'danger' : 'warn',
        urgent,
      }
    }),
    ...pendingResas.map((r): Ticket => ({
      id: `resa-${r.id}`,
      lane: 'next',
      module: 'reservations',
      kind: 'Réservation',
      title: r.nom || 'Client',
      detail: [r.date ? dateFr(r.date) : '', r.time, `${r.guests ?? '?'} pers.`].filter(Boolean).join(' · '),
      cta: 'Confirmer',
      status: 'À confirmer',
      statusTone: 'warn',
    })),
    ...openMessages.map((m): Ticket => ({
      id: `msg-${m.id ?? m.email}-${m.date}`,
      lane: 'watch',
      module: 'messages',
      kind: 'Message',
      title: m.nom,
      detail: m.sujet || 'Message',
      cta: 'Répondre',
      status: 'Non traité',
      statusTone: 'warn',
    })),
  ]

  const lanes: { key: Ticket['lane']; label: string; hint: string }[] = [
    { key: 'now', label: 'Maintenant', hint: 'à traiter tout de suite' },
    { key: 'next', label: 'Ensuite', hint: 'à confirmer' },
    { key: 'watch', label: 'À surveiller', hint: 'messages ouverts' },
  ]

  const activity: ActivityRow[] = (() => {
    if (auditEntries.length > 0) {
      return auditEntries.slice(0, 6).map((e) => ({
        id: String(e.id ?? `${e.action}-${e.created_at}`),
        title: e.action,
        detail: e.target || e.detail || e.actor || '—',
        when: heureCourte(e.created_at) || dateFr(e.created_at),
      }))
    }
    const rows: ActivityRow[] = []
    for (const m of openMessages.slice(0, 3)) {
      rows.push({
        id: `act-msg-${m.id ?? m.email}`,
        title: 'Message reçu',
        detail: `${m.nom} attend une réponse`,
        when: heureCourte(m.date) || dateFr(m.date),
      })
    }
    for (const r of pendingResas.slice(0, 2)) {
      rows.push({
        id: `act-resa-${r.id}`,
        title: 'Réservation à confirmer',
        detail: `${r.nom || 'Client'} · ${r.guests ?? '?'} pers.`,
        when: r.time || dateFr(r.date),
      })
    }
    for (const o of pendingOrders.slice(0, 2)) {
      rows.push({
        id: `act-order-${o.id}`,
        title: 'Commande en attente',
        detail: o.nom || o.ref,
        when: heureCourte(o.created_at) || dateFr(o.created_at),
      })
    }
    return rows.slice(0, 6)
  })()

  const ticketTotal = tickets.length
  const queueBooting = dataSource === 'loading' && ticketTotal === 0 && !auditTried
  const dsLabel = dataLoading
    ? 'Mise à jour…'
    : dataSource === 'supabase'
      ? 'En ligne'
      : 'Aperçu local'
  const kickerDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  const syncNote = (() => {
    if (dataLoading && dataSource === 'loading') return 'Synchronisation en cours…'
    if (dataSource !== 'supabase') return 'Données locales — pas encore synchronisées.'
    if (!syncedAt) return 'Connecté à votre espace en ligne.'
    const mins = Math.max(0, Math.round((Date.now() - syncedAt) / 60000))
    if (mins <= 0) return 'Dernière synchronisation à l’instant.'
    if (mins === 1) return 'Dernière synchronisation il y a 1 min.'
    return `Dernière synchronisation il y a ${mins} min.`
  })()

  const ouvrir = (module: string) => navigate(pathForModule(module))

  return (
    <div className="admin-page admin-page-dash" aria-busy={queueBooting || undefined}>
      <div className="admin-live-status" role="status" aria-live="polite">
        {dataSource === 'loading'
          ? 'Mise à jour des chiffres…'
          : `${pendingOrdersCount} commandes, ${pendingReservationsCount} réservations, ${unhandledMessagesCount} messages en attente.`}
      </div>

      <section className="admin-dash-intro">
        <div>
          <p className="admin-dash-kicker">{kickerDate} · bon service</p>
          <h1 className="admin-page-title admin-dash-hello">Bonjour, {user?.name || 'vous'}</h1>
          <p className="admin-page-sub">Votre service aujourd’hui — ce qui attend une réponse.</p>
        </div>
        <div className="admin-service-summary" aria-label="Résumé du service">
          <span><strong>{dataSource === 'loading' ? '—' : pendingOrdersCount}</strong> commandes à traiter</span>
          <span><strong>{dataSource === 'loading' ? '—' : pendingReservationsCount}</strong> réservation{pendingReservationsCount === 1 ? '' : 's'} à confirmer</span>
          <span><strong>{dataSource === 'loading' ? '—' : unhandledMessagesCount}</strong> messages</span>
        </div>
      </section>

      <div className="admin-dash-layout">
        <section aria-labelledby="file-travail-titre">
          <div className="admin-section-head">
            <h2 id="file-travail-titre" className="admin-section-title">File de travail</h2>
            <span className="admin-section-note">
              {queueBooting
                ? 'Mise à jour…'
                : `${ticketTotal} élément${ticketTotal === 1 ? '' : 's'} · ${dsLabel}`}
            </span>
          </div>
          <div className="admin-work-queue" aria-label="File de travail">
            {lanes.map((lane) => {
              const items = tickets.filter((tk) => tk.lane === lane.key)
              return (
                <section key={lane.key} className="admin-work-lane" aria-labelledby={`lane-${lane.key}`}>
                  <div className="admin-lane-head">
                    <h3 id={`lane-${lane.key}`}>{lane.label}</h3>
                    <span>{queueBooting ? '…' : `${items.length} ${lane.hint}`}</span>
                  </div>
                  {queueBooting ? (
                    <div className="admin-ticket-skeleton" aria-hidden="true">
                      <i /><i /><i />
                    </div>
                  ) : items.length === 0 ? (
                    <div className="admin-empty admin-empty-compact">Rien dans cette file pour l’instant.</div>
                  ) : (
                    items.map((ticket) => (
                      <button
                        key={ticket.id}
                        type="button"
                        className={`admin-ticket${ticket.urgent ? ' is-urgent' : ''}`}
                        onClick={() => ouvrir(ticket.module)}
                        aria-label={`${ticket.cta} — ${ticket.kind} ${ticket.title}, ${ticket.status}`}
                      >
                        <div className="admin-ticket-main">
                          <div className="admin-ticket-meta">
                            <span className="admin-ticket-kind">{ticket.kind}</span>
                            {ticket.refTech && <span className="admin-mono">{ticket.refTech}</span>}
                            <span className="admin-ticket-detail">{ticket.detail}</span>
                          </div>
                          <div className="admin-ticket-title">{ticket.title}</div>
                          <span className="admin-ticket-cta" aria-hidden="true">{ticket.cta}</span>
                        </div>
                        <div className="admin-ticket-action">
                          <span className={`admin-status admin-status-${ticket.statusTone}`}>{ticket.status}</span>
                        </div>
                      </button>
                    ))
                  )}
                </section>
              )
            })}
          </div>
        </section>

        <aside className="admin-dash-aside" aria-label="Activité et état du site">
          <section className="admin-activity-card" aria-labelledby="activite-recente">
            <h3 id="activite-recente">Activité récente</h3>
            {activity.length === 0 ? (
              <div className="admin-empty admin-empty-compact">Rien à signaler pour le moment.</div>
            ) : (
              activity.map((e) => (
                <div key={e.id} className="admin-activity-event">
                  <i className="admin-activity-dot" aria-hidden="true" />
                  <div>
                    <strong>{e.title}</strong>
                    <p>{e.detail}</p>
                  </div>
                  <time>{e.when}</time>
                </div>
              ))
            )}
          </section>

          <section className="admin-activity-card" aria-labelledby="etat-site">
            <div className="admin-site-health">
              <div>
                <div className="admin-dash-kicker" id="etat-site">État du site</div>
                <strong>{dataSource === 'supabase' ? 'Tout fonctionne' : dataSource === 'loading' ? 'Connexion…' : 'Aperçu local'}</strong>
              </div>
              <span className={`admin-status ${dataSource === 'supabase' ? 'admin-status-ok' : 'admin-status-warn'}`}>
                {dsLabel}
              </span>
            </div>
            <p className="admin-section-note">{syncNote}</p>
          </section>
        </aside>
      </div>
    </div>
  )
}
