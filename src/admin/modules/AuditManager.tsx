import { useState, useEffect } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { Icon } from '@/lib/icons'
import { PageHeader, EmptyState, inputStyle, GhostButton } from '@/admin/ui'
import { fetchAuditLog, type AuditEntry } from '@/lib/repository'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { dateFr } from '@/admin/shared'

export function AuditManager() {
  const { theme: t, dataSource } = useSite()
  const { user } = useAuth()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [actorFilter, setActorFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const inp = inputStyle(t)
  useEffect(() => {
    if (dataSource !== 'supabase') { setLoading(false); return }
    let active = true
    const refresh = async () => {
      const res = await fetchAuditLog()
      if (!active || !res.fromDb) return
      setEntries(res.data); setLoading(false)
    }
    refresh()
    const timer = setInterval(refresh, 30000)
    return () => { active = false; clearInterval(timer) }
  }, [dataSource])
  const actions = Array.from(new Set(entries.map(e => e.action))).sort()
  const actors = Array.from(new Set(entries.map(e => e.actor || 'système'))).sort()
  const q = query.trim().toLowerCase()
  const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null
  const toTs = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null
  const filtered = entries.filter(e => {
    if (filter !== 'all' && e.action !== filter) return false
    if (actorFilter !== 'all' && (e.actor || 'système') !== actorFilter) return false
    if (fromTs !== null || toTs !== null) {
      const ts = e.created_at ? new Date(e.created_at).getTime() : NaN
      if (!Number.isFinite(ts)) return false
      if (fromTs !== null && ts < fromTs) return false
      if (toTs !== null && ts > toTs) return false
    }
    if (q && !e.actor.toLowerCase().includes(q) && !e.target.toLowerCase().includes(q) && !e.detail.toLowerCase().includes(q)) return false
    return true
  })
  const hasFilters = filter !== 'all' || actorFilter !== 'all' || dateFrom !== '' || dateTo !== '' || q !== ''
  const resetFilters = () => { setFilter('all'); setActorFilter('all'); setDateFrom(''); setDateTo(''); setQuery('') }
  const actorName = (a: string) => a || 'système'
  const exportCsv = () => {
    const rows = [['Date', 'Acteur', 'Action', 'Cible', 'Détail'].join(';')]
    filtered.forEach(e => {
      rows.push([e.created_at ? new Date(e.created_at).toLocaleString('fr-FR') : '', actorName(e.actor), e.action, (e.target || '').replace(/[\n\r]+/g, ' '), (e.detail || '').replace(/[\n\r]+/g, ' ')].map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    })
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
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
    <div className="admin-page" style={{ maxWidth: 1120 }}>
      <PageHeader title="Journal d'activité" subtitle={`${filtered.length} / ${entries.length} action${entries.length > 1 ? 's' : ''}${hasFilters ? ' (filtré)' : ''}`} />
      <div className="admin-status-live" role="status" aria-live="polite">{loading ? 'Chargement du journal…' : ''}</div>
      <div className="admin-toolbar">
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher (acteur, cible, détail)…" aria-label="Rechercher dans le journal" style={{ ...inp, paddingLeft: 32, fontSize: 13, minHeight: 44 }} />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} aria-hidden="true">{Icon.search(14, t.muted)}</span>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger style={{ ...inp, width: 180, minHeight: 44 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actorFilter} onValueChange={setActorFilter}>
          <SelectTrigger style={{ ...inp, width: 180, minHeight: 44 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les utilisateurs</SelectItem>
            {actors.map(a => <SelectItem key={a} value={a}>{a === 'système' ? 'système' : a.split('@')[0]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="admin-toolbar">
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>Du <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp, width: 150, fontSize: 13, minHeight: 44 }} /></label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>Au <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inp, width: 150, fontSize: 13, minHeight: 44 }} /></label>
        {hasFilters && <GhostButton color={t.muted} onClick={resetFilters}>Réinitialiser les filtres</GhostButton>}
        <GhostButton color={t.primary} onClick={exportCsv} disabled={filtered.length === 0} style={{ marginLeft: 'auto' }}>Exporter CSV</GhostButton>
      </div>
      {loading ? <div className="admin-loading">Chargement…</div> :
        filtered.length === 0 ? <EmptyState icon={Icon.eye(26, t.muted)} title="Aucune entrée" subtitle="Les actions sensibles du panneau seront tracées ici." /> :
        <div className="admin-audit-list">
          {filtered.map(e => (
            <div key={e.id} className="admin-audit-row">
              <span className="admin-mono" style={{ opacity: 0.65 }}>{e.created_at ? dateFr(e.created_at) : ''}</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="admin-chip is-live">{e.action}</span>
                  <strong>{e.target || '—'}</strong>
                </div>
                {e.detail && <div className="admin-ops-meta" style={{ marginTop: 4 }}>{e.detail}</div>}
                <div className="admin-ops-meta" style={{ marginTop: 4 }}>par {actorName(e.actor)}{e.actor === (user?.email ?? '') ? ' (vous)' : ''}</div>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  )
}

