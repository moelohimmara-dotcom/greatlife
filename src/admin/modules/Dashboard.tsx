import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { fetchAuditLog, type AuditEntry } from '@/lib/repository'
import { dateFr, heureCourte } from '@/admin/shared'
import { pathForModule } from '@/admin/routes'
import { Icon } from '@/lib/icons'
import { Bouton } from '@/admin/editor/chrome'

type Period = 'today' | '7d' | '30d'
type ActivityRow = { id: string; title: string; detail: string; when: string; status: string }

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function periodStart(period: Period): Date {
  const now = new Date()
  if (period === 'today') return startOfDay(now)
  const days = period === '7d' ? 7 : 30
  const s = startOfDay(now)
  s.setDate(s.getDate() - (days - 1))
  return s
}

function inPeriod(iso: string | undefined, from: Date): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return Number.isFinite(t) && t >= from.getTime()
}

function parseAmount(s: string): number {
  const n = parseInt(String(s).replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

function formatFg(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n)
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Aujourd’hui',
  '7d': '7 jours',
  '30d': '30 jours',
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
    menu,
    media,
    orders,
    reservations,
  } = useSite()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [syncedAt, setSyncedAt] = useState<number | null>(null)
  const [auditTried, setAuditTried] = useState(false)
  const [period, setPeriod] = useState<Period>('today')

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

  const from = useMemo(() => periodStart(period), [period])
  const currency = content.currency || 'FG'

  const periodOrders = useMemo(
    () => orders.filter((o) => inPeriod(o.created_at, from)),
    [orders, from],
  )
  const periodResas = useMemo(
    () => reservations.filter((r) => inPeriod(r.date || r.created_at, from)),
    [reservations, from],
  )
  const periodMessages = useMemo(
    () => messages.filter((m) => inPeriod(m.date, from)),
    [messages, from],
  )

  const ca = periodOrders.reduce((sum, o) => sum + parseAmount(o.total), 0)
  const pendingInPeriod = periodOrders.filter((o) => o.status === 'pending').length
  const openNow = pendingOrdersCount + pendingReservationsCount + unhandledMessagesCount
  const menuCount = menu.length
  const galleryOk = media.some((m) => Boolean(m.url))

  const chartDays = useMemo(() => {
    const labels: string[] = []
    const orderCounts: number[] = []
    const resaCounts: number[] = []
    const dayCount = period === 'today' ? 1 : period === '7d' ? 7 : 14
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = startOfDay(new Date())
      d.setDate(d.getDate() - i)
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      const label = period === 'today'
        ? 'Aujourd’hui'
        : new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d)
      labels.push(label)
      orderCounts.push(
        orders.filter((o) => {
          if (!o.created_at) return false
          const t = new Date(o.created_at).getTime()
          return t >= d.getTime() && t < next.getTime()
        }).length,
      )
      resaCounts.push(
        reservations.filter((r) => {
          const iso = r.date || r.created_at
          if (!iso) return false
          const t = new Date(iso).getTime()
          return t >= d.getTime() && t < next.getTime()
        }).length,
      )
    }
    return { labels, orderCounts, resaCounts }
  }, [orders, reservations, period])

  const chartPolylines = useMemo(() => {
    const { orderCounts, resaCounts } = chartDays
    const max = Math.max(1, ...orderCounts, ...resaCounts)
    const w = 600
    const h = 160
    const n = Math.max(1, orderCounts.length - 1)
    const toPoints = (vals: number[]) =>
      vals
        .map((v, i) => {
          const x = vals.length === 1 ? w / 2 : (i / n) * w
          const y = h - (v / max) * (h - 12)
          return `${x},${y}`
        })
        .join(' ')
    return {
      orders: toPoints(orderCounts),
      resas: toPoints(resaCounts),
      max,
    }
  }, [chartDays])

  const activity: ActivityRow[] = (() => {
    if (auditEntries.length > 0) {
      return auditEntries.slice(0, 6).map((e) => ({
        id: String(e.id ?? `${e.action}-${e.created_at}`),
        title: e.action,
        detail: e.target || e.detail || e.actor || '—',
        when: heureCourte(e.created_at) || dateFr(e.created_at),
        status: 'Terminé',
      }))
    }
    const rows: ActivityRow[] = []
    for (const o of orders.filter((x) => x.status === 'pending').slice(0, 2)) {
      rows.push({
        id: `act-order-${o.id}`,
        title: `Commande ${o.ref || o.nom}`,
        detail: o.nom || 'Client',
        when: heureCourte(o.created_at) || dateFr(o.created_at),
        status: 'À traiter',
      })
    }
    for (const r of reservations.filter((x) => x.status === 'pending').slice(0, 2)) {
      rows.push({
        id: `act-resa-${r.id}`,
        title: `Réservation · ${r.nom || 'Client'}`,
        detail: `${r.guests ?? '?'} pers.`,
        when: r.time || dateFr(r.date),
        status: 'À confirmer',
      })
    }
    for (const m of messages.filter((x) => !x.handled).slice(0, 2)) {
      rows.push({
        id: `act-msg-${m.id ?? m.email}`,
        title: m.sujet || 'Message reçu',
        detail: m.nom,
        when: heureCourte(m.date) || dateFr(m.date),
        status: 'Non lu',
      })
    }
    return rows.slice(0, 6)
  })()

  const queueBooting = dataSource === 'loading' && !auditTried
  const dsLabel = dataLoading
    ? 'Mise à jour…'
    : dataSource === 'supabase'
      ? 'En ligne'
      : 'Aperçu local'

  const syncNote = (() => {
    if (dataLoading && dataSource === 'loading') return 'Synchronisation en cours…'
    if (dataSource !== 'supabase') return 'Données locales — pas encore synchronisées.'
    if (!syncedAt) return 'Connecté à votre espace en ligne.'
    const mins = Math.max(0, Math.round((Date.now() - syncedAt) / 60000))
    if (mins <= 0) return 'Dernière synchronisation à l’instant.'
    if (mins === 1) return 'Dernière synchronisation il y a 1 min.'
    return `Dernière synchronisation il y a ${mins} min.`
  })()

  const essentials = [
    { ok: Boolean(content.phone || content.address), label: 'Coordonnées' },
    { ok: menuCount > 0, label: 'Carte' },
    { ok: galleryOk, label: 'Galerie' },
  ]
  const completion = Math.round((essentials.filter((e) => e.ok).length / essentials.length) * 100)

  const ouvrir = (module: string) => navigate(pathForModule(module))
  const attentionCount =
    (pendingOrdersCount > 0 ? 1 : 0) +
    (pendingReservationsCount > 0 ? 1 : 0) +
    (unhandledMessagesCount > 0 ? 1 : 0)

  return (
    <div className="admin-page admin-page-dash" aria-busy={queueBooting || undefined}>
      <div className="admin-live-status" role="status" aria-live="polite">
        {dataSource === 'loading'
          ? 'Mise à jour des chiffres…'
          : `${pendingOrdersCount} commandes, ${pendingReservationsCount} réservations, ${unhandledMessagesCount} messages en attente.`}
      </div>

      <header className="admin-wf-header">
        <div>
          <p className="admin-wf-eyebrow">GREATLIFE / ADMINISTRATION</p>
          <h1 className="admin-page-title">Tableau de bord</h1>
          <p className="admin-page-sub">
            Bonjour{user?.name ? `, ${user.name}` : ''} — comprenez la situation et agissez tout de suite.
          </p>
        </div>
        <Bouton
          genre="secondaire"
          onClick={() => window.open('/', '_blank', 'noopener,noreferrer')}
          aria-label="Voir le site public"
        >
          Voir le site
        </Bouton>
      </header>

      <div className="admin-wf-toolbar">
        <div className="admin-wf-toolbar-left">
          <span className="admin-wf-resto-chip" title="Restaurant">
            <i aria-hidden="true" />
            Greatlife · Restaurant principal
          </span>
          <span className={`admin-chip${dataSource === 'supabase' ? ' is-live' : ''}`}>
            <i aria-hidden="true" />
            {dsLabel}
          </span>
        </div>
        <div className="admin-wf-periods" role="group" aria-label="Période">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`admin-wf-period${period === key ? ' is-active' : ''}`}
              aria-pressed={period === key}
              onClick={() => setPeriod(key)}
            >
              {PERIOD_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <section className="admin-wf-attention" aria-labelledby="attention-titre">
        <div className="admin-wf-attention-intro">
          <span className="admin-wf-attention-label">À traiter maintenant</span>
          <h2 id="attention-titre">
            {queueBooting
              ? 'Mise à jour…'
              : attentionCount === 0
                ? 'Rien d’urgent'
                : `${attentionCount} action${attentionCount > 1 ? 's' : ''} prioritaire${attentionCount > 1 ? 's' : ''}`}
          </h2>
          <p>
            {openNow === 0
              ? 'Le service est à jour pour l’instant.'
              : 'Ces éléments méritent votre attention tout de suite.'}
          </p>
        </div>
        <Bouton genre="silencieux" onClick={() => ouvrir('orders')}>
          Tout voir →
        </Bouton>
        <div className="admin-wf-attention-items">
          <button type="button" onClick={() => ouvrir('orders')} aria-label="Ouvrir les commandes">
            <span aria-hidden="true">{Icon.coin(20, 'var(--admin-forest)')}</span>
            <span>
              <strong>{dataSource === 'loading' ? '—' : pendingOrdersCount} commandes</strong>
              <small>à préparer pour le service</small>
            </span>
            <span aria-hidden="true">{Icon.chevronRight(16, 'var(--admin-ink)')}</span>
          </button>
          <button type="button" onClick={() => ouvrir('reservations')} aria-label="Ouvrir les réservations">
            <span aria-hidden="true">{Icon.calendar(20, 'var(--admin-forest)')}</span>
            <span>
              <strong>{dataSource === 'loading' ? '—' : pendingReservationsCount} réservations</strong>
              <small>à confirmer</small>
            </span>
            <span aria-hidden="true">{Icon.chevronRight(16, 'var(--admin-ink)')}</span>
          </button>
          <button type="button" onClick={() => ouvrir('messages')} aria-label="Ouvrir les messages">
            <span aria-hidden="true">{Icon.mail(20, 'var(--admin-forest)')}</span>
            <span>
              <strong>{dataSource === 'loading' ? '—' : unhandledMessagesCount} messages</strong>
              <small>sans réponse</small>
            </span>
            <span aria-hidden="true">{Icon.chevronRight(16, 'var(--admin-ink)')}</span>
          </button>
        </div>
      </section>

      <div className="admin-wf-stats">
        <div className="admin-wf-stat">
          <span>Chiffre d’affaires<small>{PERIOD_LABELS[period]}</small></span>
          <strong>{queueBooting ? '—' : `${formatFg(ca)} ${currency}`}</strong>
          <b>{periodOrders.length} commande{periodOrders.length === 1 ? '' : 's'}</b>
        </div>
        <div className="admin-wf-stat">
          <span>Réservations<small>{PERIOD_LABELS[period]}</small></span>
          <strong>{queueBooting ? '—' : periodResas.length}</strong>
          <b>{pendingReservationsCount} à confirmer</b>
        </div>
        <div className="admin-wf-stat">
          <span>Commandes<small>{PERIOD_LABELS[period]}</small></span>
          <strong>{queueBooting ? '—' : periodOrders.length}</strong>
          <b>{pendingInPeriod} en attente</b>
        </div>
        <div className="admin-wf-stat">
          <span>Messages<small>{PERIOD_LABELS[period]}</small></span>
          <strong>{queueBooting ? '—' : periodMessages.length}</strong>
          <b>{unhandledMessagesCount} non traités</b>
        </div>
      </div>

      <div className="admin-wf-grid">
        <section className="admin-wf-panel" aria-labelledby="perf-titre">
          <div className="admin-wf-panel-head">
            <h2 id="perf-titre">Performance du restaurant</h2>
            <Bouton genre="silencieux" onClick={() => ouvrir('orders')}>
              Voir les commandes →
            </Bouton>
          </div>
          <div className="admin-wf-chart-head">
            <div>
              <strong>Réservations et commandes</strong>
              <small>Évolution · {PERIOD_LABELS[period].toLowerCase()}</small>
            </div>
            <span>
              <i className="admin-wf-legend is-resa" /> Réservations
              <i className="admin-wf-legend is-orders" /> Commandes
            </span>
          </div>
          <div className="admin-wf-line-chart" role="img" aria-label="Graphique réservations et commandes">
            <div className="admin-wf-chart-y">
              <span>{chartPolylines.max}</span>
              <span>{Math.round(chartPolylines.max / 2)}</span>
              <span>0</span>
            </div>
            <div className="admin-wf-chart-area">
              <div className="admin-wf-grid-lines" aria-hidden="true" />
              <svg viewBox="0 0 600 180" preserveAspectRatio="none">
                <polyline points={chartPolylines.resas} className="is-resa" />
                <polyline points={chartPolylines.orders} className="is-orders" />
              </svg>
              <div className="admin-wf-chart-labels">
                {chartDays.labels.map((l, i) => (
                  <span key={`${l}-${i}`}>{l}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="admin-wf-panel" aria-labelledby="etat-site">
          <div className="admin-wf-panel-head">
            <h2 id="etat-site">État du site</h2>
            <Bouton genre="silencieux" onClick={() => ouvrir('content')}>
              Modifier le site →
            </Bouton>
          </div>
          <div className="admin-wf-site-state">
            <div>
              <span className={`admin-chip${dataSource === 'supabase' ? ' is-live' : ''}`}>
                <i aria-hidden="true" />
                {dataSource === 'supabase' ? 'Site en ligne' : dataSource === 'loading' ? 'Connexion…' : 'Aperçu local'}
              </span>
              <small>{syncNote}</small>
            </div>
          </div>
          <div className="admin-health-progress" aria-hidden="true">
            <i style={{ width: `${completion}%` }} />
          </div>
          <div className="admin-wf-completion">
            <strong>{completion}%</strong>
            <span>des contenus essentiels sont complétés</span>
          </div>
          <div className="admin-wf-site-checks">
            {essentials.map((e) => (
              <span key={e.label} className={e.ok ? 'is-ok' : 'is-todo'}>
                <span aria-hidden="true">{e.ok ? Icon.check(14, 'var(--admin-forest)') : '○'}</span>
                {e.label}
              </span>
            ))}
          </div>
        </section>
      </div>

      <div className="admin-wf-grid admin-wf-grid-secondary">
        <section className="admin-wf-panel" aria-labelledby="activite-recente">
          <div className="admin-wf-panel-head">
            <h2 id="activite-recente">Activité récente</h2>
            <Bouton genre="silencieux" onClick={() => ouvrir('audit')}>
              Tout voir →
            </Bouton>
          </div>
          {activity.length === 0 ? (
            <div className="admin-empty admin-empty-compact">Rien à signaler pour le moment.</div>
          ) : (
            <div className="admin-wf-table" role="table" aria-label="Activité récente">
              <div className="admin-wf-table-row admin-wf-table-head" role="row">
                <span role="columnheader">Événement</span>
                <span role="columnheader">Date</span>
                <span role="columnheader">État</span>
              </div>
              {activity.map((e) => (
                <div key={e.id} className="admin-wf-table-row" role="row">
                  <span role="cell">
                    <strong>{e.title}</strong>
                    <small>{e.detail}</small>
                  </span>
                  <span role="cell">{e.when}</span>
                  <span role="cell">
                    <b className="admin-status admin-status-warn">{e.status}</b>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-wf-panel" aria-labelledby="actions-rapides">
          <div className="admin-wf-panel-head">
            <h2 id="actions-rapides">Actions rapides</h2>
          </div>
          <div className="admin-wf-quick-grid">
            <button type="button" className="admin-wf-quick" onClick={() => ouvrir('menu')}>
              <span aria-hidden="true">{Icon.plus(18, 'var(--admin-forest)')}</span>
              Ajouter un plat
            </button>
            <button type="button" className="admin-wf-quick" onClick={() => ouvrir('content')}>
              <span aria-hidden="true">{Icon.write(18, 'var(--admin-forest)')}</span>
              Modifier une page
            </button>
            <button type="button" className="admin-wf-quick" onClick={() => ouvrir('reservations')}>
              <span aria-hidden="true">{Icon.calendar(18, 'var(--admin-forest)')}</span>
              Voir les réservations
            </button>
            <button type="button" className="admin-wf-quick" onClick={() => ouvrir('content')}>
              <span aria-hidden="true">{Icon.check(18, 'var(--admin-forest)')}</span>
              Publier les modifications
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
