import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { fetchAuditLog, type AuditEntry } from '@/lib/repository'
import { dateFr, heureCourte, ageRelatifFr } from '@/admin/shared'
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
  age?: string
  source?: string
  urgent?: boolean
}

type ActivityRow = { id: string; title: string; detail: string; when: string }

const LANE_EMPTY: Record<Ticket['lane'], { title: string; hint: string }> = {
  now: {
    title: 'File claire',
    hint: 'Aucune commande en attente. Les nouvelles demandes apparaîtront ici pour traitement immédiat.',
  },
  next: {
    title: 'Rien à confirmer',
    hint: 'Aucune réservation en attente. Ouvrez Réservations pour l’historique ou les tables du jour.',
  },
  watch: {
    title: 'Boîte à jour',
    hint: 'Tous les messages sont traités. Ouvrez Messages pour relire ou répondre à nouveau.',
  },
}

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
  const [nowTick, setNowTick] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 30000)
    return () => window.clearInterval(id)
  }, [])

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

  const currency = content.currency || 'FG'

  const { tickets, pendingOrders, pendingResas, openMessages } = useMemo(() => {
    const pendingOrders = orders.filter((o) => o.status === 'pending').slice(0, 8)
    const pendingResas = reservations.filter((r) => r.status === 'pending').slice(0, 8)
    const openMessages = messages.filter((m) => !m.handled).slice(0, 8)
    const tickets: Ticket[] = [
      ...pendingOrders.map((o): Ticket => {
        const ageH = o.created_at ? (nowTick - new Date(o.created_at).getTime()) / 3600000 : 0
        const urgent = ageH >= 12
        const age = ageRelatifFr(o.created_at, nowTick)
        return {
          id: `order-${o.id}`,
          lane: 'now',
          module: 'orders',
          kind: 'Commande',
          title: o.nom || o.ref,
          refTech: o.ref,
          detail: [o.pickup_time ? `Retrait ${o.pickup_time}` : '', `${o.total} ${currency}`].filter(Boolean).join(' · '),
          cta: 'Traiter',
          status: urgent ? 'En retard' : 'À préparer',
          statusTone: urgent ? 'danger' : 'warn',
          age,
          source: 'Site',
          urgent,
        }
      }),
      ...pendingResas.map((r): Ticket => {
        const age = ageRelatifFr(r.created_at, nowTick)
        const when = [r.date ? dateFr(r.date) : '', r.time, `${r.guests ?? '?'} pers.`].filter(Boolean).join(' · ')
        return {
          id: `resa-${r.id}`,
          lane: 'next',
          module: 'reservations',
          kind: 'Réservation',
          title: r.nom || 'Client',
          detail: when,
          cta: 'Confirmer',
          status: 'À confirmer',
          statusTone: 'warn',
          age,
          source: 'Site',
        }
      }),
      ...openMessages.map((m): Ticket => {
        const age = ageRelatifFr(m.date, nowTick)
        return {
          id: `msg-${m.id ?? m.email}-${m.date}`,
          lane: 'watch',
          module: 'messages',
          kind: 'Message',
          title: m.nom,
          detail: m.sujet || 'Message',
          cta: 'Répondre',
          status: 'Non lu',
          statusTone: 'warn',
          age,
          source: 'Contact',
        }
      }),
    ]
    return { tickets, pendingOrders, pendingResas, openMessages }
  }, [orders, reservations, messages, currency, nowTick])

  const lanes: { key: Ticket['lane']; label: string; hint: string }[] = [
    { key: 'now', label: 'Maintenant', hint: 'à traiter' },
    { key: 'next', label: 'Ensuite', hint: 'à confirmer' },
    { key: 'watch', label: 'À surveiller', hint: 'ouverts' },
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
  const dsConnected = dataSource === 'supabase'
  const dsBadge = dataLoading
    ? 'Mise à jour…'
    : dsConnected
      ? 'Supabase connecté'
      : dataSource === 'loading'
        ? 'Connexion…'
        : 'Mode démo'
  const kickerDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  const syncNote = (() => {
    if (dataLoading && dataSource === 'loading') return 'Synchronisation en cours…'
    if (dataSource !== 'supabase') return 'Mode démo — données locales, pas encore synchronisées.'
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
        <div className="admin-dash-intro-aside">
          <span
            className={`admin-ds-badge${dsConnected ? ' is-live' : dataSource === 'loading' ? '' : ' is-demo'}`}
            title={syncNote}
          >
            <i className="admin-ds-dot" aria-hidden="true" />
            {dsBadge}
          </span>
        </div>
      </section>

      <div className="admin-kpi-strip" aria-label="Indicateurs du service">
        <button type="button" className="admin-kpi" onClick={() => ouvrir('orders')}>
          <strong>{pendingOrdersCount}</strong>
          <span>Commandes</span>
        </button>
        <button type="button" className="admin-kpi" onClick={() => ouvrir('reservations')}>
          <strong>{pendingReservationsCount}</strong>
          <span>Réservations</span>
        </button>
        <button type="button" className="admin-kpi" onClick={() => ouvrir('messages')}>
          <strong>{unhandledMessagesCount}</strong>
          <span>Messages</span>
        </button>
        <div className="admin-kpi admin-kpi-total" aria-hidden={queueBooting || undefined}>
          <strong>{ticketTotal}</strong>
          <span>En file</span>
        </div>
      </div>

      <div className="admin-dash-layout">
        <section aria-labelledby="file-travail-titre">
          <div className="admin-section-head">
            <h2 id="file-travail-titre" className="admin-section-title">File de travail</h2>
            <span className="admin-section-note">
              {queueBooting
                ? 'Mise à jour…'
                : `${ticketTotal} élément${ticketTotal === 1 ? '' : 's'}`}
            </span>
          </div>
          <div className="admin-work-queue admin-work-queue-board" aria-label="File de travail">
            {lanes.map((lane) => {
              const items = tickets.filter((tk) => tk.lane === lane.key)
              const empty = LANE_EMPTY[lane.key]
              return (
                <section key={lane.key} className="admin-work-lane" aria-labelledby={`lane-${lane.key}`}>
                  <div className="admin-lane-head">
                    <h3 id={`lane-${lane.key}`}>
                      {lane.label}
                      <span className="admin-lane-count">{queueBooting ? '…' : items.length}</span>
                    </h3>
                    <span>{lane.hint}</span>
                  </div>
                  {queueBooting ? (
                    <div className="admin-ticket-skeleton" aria-hidden="true">
                      <i /><i /><i />
                    </div>
                  ) : items.length === 0 ? (
                    <div className="admin-empty admin-empty-compact admin-lane-empty">
                      <strong>{empty.title}</strong>
                      <p>{empty.hint}</p>
                    </div>
                  ) : (
                    items.map((ticket) => (
                      <button
                        key={ticket.id}
                        type="button"
                        className={`admin-ticket${ticket.urgent ? ' is-urgent' : ''}`}
                        onClick={() => ouvrir(ticket.module)}
                        aria-label={`${ticket.cta} — ${ticket.kind} ${ticket.title}, ${ticket.status}${ticket.age ? `, ${ticket.age}` : ''}`}
                      >
                        <div className="admin-ticket-main">
                          <div className="admin-ticket-meta">
                            <span className="admin-ticket-kind">{ticket.kind}</span>
                            {ticket.source && (
                              <span className="admin-ticket-source">{ticket.source}</span>
                            )}
                            {ticket.refTech && <span className="admin-mono">{ticket.refTech}</span>}
                            {ticket.age && (
                              <span className={`admin-ticket-age${ticket.urgent ? ' is-urgent' : ''}`}>
                                {ticket.age}
                              </span>
                            )}
                          </div>
                          <div className="admin-ticket-title">{ticket.title}</div>
                          {ticket.detail && (
                            <div className="admin-ticket-detail">{ticket.detail}</div>
                          )}
                        </div>
                        <div className="admin-ticket-action">
                          <span className={`admin-status admin-status-${ticket.statusTone}`}>{ticket.status}</span>
                          <span className="admin-ticket-cta" aria-hidden="true">{ticket.cta}</span>
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
                <strong>{dsConnected ? 'Tout fonctionne' : dataSource === 'loading' ? 'Connexion…' : 'Mode démo'}</strong>
              </div>
              <span className={`admin-status ${dsConnected ? 'admin-status-ok' : 'admin-status-warn'}`}>
                {dsBadge}
              </span>
            </div>
            <p className="admin-section-note">{syncNote}</p>
          </section>
        </aside>
      </div>
    </div>
  )
}
