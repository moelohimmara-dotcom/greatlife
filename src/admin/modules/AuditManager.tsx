import { useState, useEffect, useMemo } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { Icon } from '@/lib/icons'
import { PageHeader, EmptyState, GhostButton } from '@/admin/ui'
import { fetchAuditLog, type AuditEntry } from '@/lib/repository'
import { dateFr, heureCourte } from '@/admin/shared'

type ActivityFilter = 'all' | 'publish' | 'edit' | 'media' | 'security' | 'team'

function classifyAction(action: string): ActivityFilter {
  const a = action.toLowerCase()
  if (a.includes('publish') || a.includes('unpublish') || a.includes('publication')) return 'publish'
  if (a.includes('media') || a.includes('image') || a.includes('upload')) return 'media'
  if (a.includes('login') || a.includes('logout') || a.includes('auth') || a.includes('rbac') || a.includes('suspend') || a.includes('activate')) return 'security'
  if (a.includes('user') || a.includes('invite') || a.includes('role')) return 'team'
  return 'edit'
}

function moduleLabel(action: string, target: string): string {
  const a = action.toLowerCase()
  if (a.includes('order')) return 'Commandes'
  if (a.includes('reservation') || a.includes('resa')) return 'Réservations'
  if (a.includes('message')) return 'Messages'
  if (a.includes('menu') || a.includes('plat')) return 'Carte & prix'
  if (a.includes('blog')) return 'Blog'
  if (a.includes('media')) return 'Médias'
  if (a.includes('user') || a.includes('invite') || a.includes('rbac')) return 'Utilisateurs'
  if (a.includes('publish') || a.includes('page') || a.includes('section')) return 'Modifier le site'
  if (a.includes('visibility')) return 'Visibilité'
  if (a.includes('theme') || a.includes('apparence')) return 'Thème & ambiance'
  if (target) return target.split('/')[0]?.trim() || 'Console'
  return 'Console'
}

function dayLabel(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((startToday.getTime() - startThat.getTime()) / 86400000)
  if (diff === 0) return 'Aujourd’hui'
  if (diff === 1) return 'Hier'
  return dateFr(iso)
}

function initials(actor: string): string {
  const base = (actor || 'SY').split('@')[0] || 'SY'
  const parts = base.replace(/[._-]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return base.slice(0, 2).toUpperCase()
}

function toneFor(kind: ActivityFilter): string {
  if (kind === 'publish') return 'success'
  if (kind === 'security') return 'security'
  if (kind === 'team') return 'warning'
  return 'info'
}

function iconFor(kind: ActivityFilter) {
  if (kind === 'publish') return Icon.check
  if (kind === 'media') return Icon.image
  if (kind === 'security') return Icon.settings
  if (kind === 'team') return Icon.users
  return Icon.write
}

const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'publish', label: 'Publications' },
  { id: 'edit', label: 'Modifications' },
  { id: 'media', label: 'Médias' },
  { id: 'security', label: 'Sécurité' },
  { id: 'team', label: 'Équipe' },
]

export function AuditManager() {
  const { theme: t, dataSource } = useSite()
  const { user } = useAuth()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (dataSource !== 'supabase') { setLoading(false); return }
    let active = true
    const refresh = async () => {
      const res = await fetchAuditLog()
      if (!active || !res.fromDb) return
      setEntries(res.data)
      setLoading(false)
    }
    refresh()
    const timer = setInterval(refresh, 30000)
    return () => { active = false; clearInterval(timer) }
  }, [dataSource])

  const enriched = useMemo(() => entries.map((e) => {
    const kind = classifyAction(e.action)
    return {
      ...e,
      kind,
      tone: toneFor(kind),
      module: moduleLabel(e.action, e.target),
      day: dayLabel(e.created_at),
      time: heureCourte(e.created_at) || '—',
      actorLabel: e.actor || 'système',
    }
  }), [entries])

  const q = query.trim().toLowerCase()
  const filtered = enriched.filter((e) => {
    if (filter !== 'all' && e.kind !== filter) return false
    if (!q) return true
    const hay = `${e.action} ${e.actor} ${e.target} ${e.detail} ${e.module}`.toLowerCase()
    return hay.includes(q)
  })

  const selected = selectedId
    ? filtered.find((e) => e.id === selectedId) ?? enriched.find((e) => e.id === selectedId) ?? null
    : filtered[0] ?? null

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(String(filtered[0].id))
  }, [filtered, selectedId])

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000
  const last24h = entries.filter((e) => e.created_at && new Date(e.created_at).getTime() >= dayAgo).length
  const uniqueActors = new Set(entries.map((e) => e.actor || 'système')).size
  const pendingTeam = enriched.filter((e) => e.kind === 'team' && /invite/i.test(e.action)).length

  const exportCsv = () => {
    const rows = [['Date', 'Acteur', 'Action', 'Module', 'Cible', 'Détail'].join(';')]
    filtered.forEach((e) => {
      rows.push([
        e.created_at ? new Date(e.created_at).toLocaleString('fr-FR') : '',
        e.actorLabel,
        e.action,
        e.module,
        (e.target || '').replace(/[\n\r]+/g, ' '),
        (e.detail || '').replace(/[\n\r]+/g, ' '),
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    })
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetFilters = () => { setFilter('all'); setQuery('') }

  if (dataSource !== 'supabase') {
    return (
      <div className="admin-page">
        <PageHeader title="Journal d'activité" subtitle="Les actions sensibles sont tracées ici." />
        <div className="admin-empty" style={{ marginTop: 16, fontSize: 14 }}>
          Connectez votre espace en ligne pour activer le journal.
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page-wide">
      <PageHeader
        title="Journal d'activité"
        subtitle="Comprenez qui a fait quoi, quand et avec quel résultat."
        actions={<GhostButton color={t.primary} onClick={exportCsv} disabled={filtered.length === 0}>Exporter le journal</GhostButton>}
      />

      <div className="admin-wf-kpis admin-wf-activity-kpis" aria-label="Résumé du journal">
        <div>
          <strong>{entries.length}</strong>
          <span>Actions enregistrées</span>
          <small>{filtered.length} affichée{filtered.length > 1 ? 's' : ''}</small>
        </div>
        <div>
          <strong>{uniqueActors}</strong>
          <span>Utilisateurs actifs</span>
          <small>dans le journal</small>
        </div>
        <div>
          <strong>{pendingTeam}</strong>
          <span>Actions équipe</span>
          <small>invitations / rôles</small>
        </div>
        <div>
          <strong>{last24h}</strong>
          <span>Dernières 24 h</span>
          <small>actions récentes</small>
        </div>
      </div>

      <div className="admin-status-live" role="status" aria-live="polite">{loading ? 'Chargement du journal…' : ''}</div>

      <div className="admin-wf-activity-toolbar">
        <label className="admin-wf-activity-search">
          <span aria-hidden="true">{Icon.search(14, 'currentColor')}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une action, un utilisateur…"
            aria-label="Rechercher dans le journal"
          />
        </label>
        <div className="admin-wf-activity-filter-list" role="group" aria-label="Filtrer par type">
          {FILTERS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={filter === item.id ? 'is-active' : undefined}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <GhostButton color={t.muted} onClick={resetFilters}>Réinitialiser</GhostButton>
      </div>

      {loading ? (
        <div className="admin-loading">Chargement…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Icon.eye(26, t.muted)} title="Aucun événement trouvé" subtitle="Essayez une autre recherche ou réinitialisez les filtres." />
      ) : (
        <div className="admin-wf-activity-layout">
          <section className="admin-wf-activity-timeline" aria-label="Activités récentes">
            <div className="admin-wf-activity-section-head">
              <div>
                <p className="admin-wf-eyebrow">Activités récentes</p>
                <h2>{filtered.length} événement{filtered.length > 1 ? 's' : ''}</h2>
              </div>
            </div>
            <div className="admin-wf-activity-list">
              {filtered.map((e) => {
                const id = String(e.id)
                const active = selected?.id === e.id
                const IconFn = iconFor(e.kind)
                return (
                  <button
                    type="button"
                    key={id}
                    className={`admin-wf-activity-event${active ? ' is-selected' : ''}`}
                    onClick={() => setSelectedId(id)}
                    aria-pressed={active}
                  >
                    <time dateTime={e.created_at || undefined}>
                      <strong>{e.time}</strong>
                      <small>{e.day}</small>
                    </time>
                    <span className={`admin-wf-activity-icon is-${e.tone}`} aria-hidden="true">
                      {IconFn(14, 'currentColor')}
                    </span>
                    <span className="admin-wf-activity-event-copy">
                      <strong>{e.action.replace(/_/g, ' ')}</strong>
                      <small>{e.actorLabel} · {e.module}</small>
                    </span>
                    <em className={`admin-wf-activity-badge is-${e.tone}`}>Enregistré</em>
                    <span aria-hidden="true" className="admin-wf-activity-chevron">{Icon.chevronRight(16, 'currentColor')}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <aside className="admin-wf-activity-detail" aria-label="Détail de l’action">
            {selected ? (
              <>
                <p className="admin-wf-eyebrow">Détail de l’action</p>
                <div className="admin-wf-activity-detail-user">
                  <span aria-hidden="true">{initials(selected.actorLabel)}</span>
                  <div>
                    <strong>{selected.actorLabel}{selected.actor === (user?.email ?? '') ? ' (vous)' : ''}</strong>
                    <small>{selected.day} · {selected.time}</small>
                  </div>
                </div>
                <div className={`admin-wf-activity-detail-status is-${selected.tone}`}>
                  <span aria-hidden="true">{Icon.check(18, 'currentColor')}</span>
                  <span>
                    <strong>Enregistré</strong>
                    <small>Action tracée dans le journal</small>
                  </span>
                </div>
                <div className="admin-wf-activity-detail-row">
                  <span>Action</span>
                  <strong>{selected.action.replace(/_/g, ' ')}</strong>
                </div>
                <div className="admin-wf-activity-detail-row">
                  <span>Section</span>
                  <strong>{selected.module}</strong>
                </div>
                <div className="admin-wf-activity-detail-row">
                  <span>Cible</span>
                  <strong>{selected.target || '—'}</strong>
                </div>
                {selected.detail && (
                  <div className="admin-wf-activity-detail-row">
                    <span>Description</span>
                    <strong>{selected.detail}</strong>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="admin-wf-eyebrow">Détail de l’action</p>
                <h2>Sélectionnez une entrée</h2>
                <p className="admin-page-sub" style={{ color: t.muted, margin: 0 }}>Cliquez une ligne du journal pour voir le détail.</p>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
