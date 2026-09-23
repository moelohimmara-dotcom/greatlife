import { useState, useEffect } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { Icon } from '@/lib/icons'
import { PageHeader, EmptyState, FieldLabel, inputStyle, GhostButton, PrimaryButton, Pagination } from '@/admin/ui'
import { fetchMessages, deleteMessage, appendReply } from '@/lib/repository'
import { invokeReplyEmail, getSupabase } from '@/lib/supabase'
import { Textarea } from '@/components/ui/textarea'
import { Bouton } from '@/admin/editor/chrome'
import { dateFr } from '@/admin/shared'

export function MessagesManager() {
  const { messages, setMessages, theme: t, dataSource, markMessageHandled } = useSite()
  const { user } = useAuth()
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [live, setLive] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const [handling, setHandling] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unhandled' | 'handled'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkErr, setBulkErr] = useState<string | undefined>(undefined)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const MSG_PAGE = 15
  const inp = inputStyle(t)
  const TEMPLATES = [
    "Bonjour, merci pour votre message. Nous revenons vers vous très vite. — L'équipe Greatlife",
    "Merci pour votre intérêt ! Votre demande est prise en compte, nous vous confirmerons sous 24h.",
    "Bonjour, votre réservation est bien confirmée. Au plaisir de vous accueillir !",
  ]
  const q = query.trim().toLowerCase()
  const filtered = messages.filter(m =>
    (statusFilter === 'all' || (statusFilter === 'unhandled' ? !m.handled : m.handled)) &&
    (!q || m.nom.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.sujet.toLowerCase().includes(q) || m.message.toLowerCase().includes(q))
  )
  const pagedMessages = filtered.slice((page - 1) * MSG_PAGE, page * MSG_PAGE)
  useEffect(() => { setPage(1) }, [query, statusFilter])
  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected = filtered.length > 0 && filtered.every(m => m.id && selectedIds.has(m.id))
  const toggleSelectAll = () => setSelectedIds(allSelected ? new Set() : new Set(filtered.map(m => m.id).filter((id): id is string => Boolean(id))))
  const removeMessage = async (id: string) => {
    setDelBusy(true); setDelErr(undefined)
    const res = await deleteMessage(id)
    setDelBusy(false)
    if (!res.ok) { setDelErr(res.error || 'Échec de la suppression'); setTimeout(() => setDelErr(undefined), 4000); return }
    setMessages(prev => prev.filter(m => m.id !== id))
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    setConfirmDel(null)
    setSelectedIdx(prev => (prev !== null && messages[prev]?.id === id ? null : prev))
  }
  const bulkSetHandled = async (handled: boolean) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkBusy(true); setBulkErr(undefined)
    let failed = 0
    for (const id of ids) { const res = await markMessageHandled(id, handled); if (!res.ok) failed++ }
    setBulkBusy(false)
    if (failed > 0) { setBulkErr(`${failed} échec(s) sur ${ids.length}`); setTimeout(() => setBulkErr(undefined), 4000) }
    setMessages(prev => prev.map(m => (m.id && selectedIds.has(m.id) ? { ...m, handled } : m)))
    setSelectedIds(new Set())
  }
  const bulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkBusy(true); setBulkErr(undefined)
    let failed = 0
    for (const id of ids) { const res = await deleteMessage(id); if (!res.ok) failed++ }
    setBulkBusy(false)
    if (failed > 0) { setBulkErr(`${failed} échec(s) sur ${ids.length}`); setTimeout(() => setBulkErr(undefined), 4000) }
    setMessages(prev => prev.filter(m => !(m.id && selectedIds.has(m.id))))
    setSelectedIds(new Set())
    setSelectedIdx(null)
    setConfirmDel(null)
  }
  const exportCsv = () => {
    const rows = [['Nom', 'Email', 'Sujet', 'Message', 'Date', 'Statut', 'Réponses'].join(';')]
    filtered.forEach(m => {
      rows.push([m.nom, m.email, m.sujet, (m.message || '').replace(/[\n\r]+/g, ' '), m.date || '', m.handled ? 'Traité' : 'Non traité', String(m.replies?.length ?? 0)].map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    })
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `messages-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (dataSource !== 'supabase') return
    let active = true
    let channel: { unsubscribe: () => void } | undefined
    let pollTimer: ReturnType<typeof setInterval> | undefined

    const refresh = async () => {
      const res = await fetchMessages()
      if (!active || !res.fromDb) return
      setMessages(prev => {
        if (res.data.length > prev.length) setNewCount(res.data.length - prev.length)
        return res.data
      })
    }

    refresh()

    const sb = getSupabase()
    if (sb) {
      channel = sb
        .channel('messages-realtime', { config: { private: false } })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          refresh()
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            setLive(true)
            pollTimer = setInterval(refresh, 30000)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setLive(false)
            pollTimer = setInterval(refresh, 10000)
          }
        })
    } else {
      pollTimer = setInterval(refresh, 15000)
    }

    return () => {
      active = false
      if (channel) channel.unsubscribe()
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [dataSource, setMessages])

  const selected = selectedIdx !== null ? messages[selectedIdx] : null

  const [handledErr, setHandledErr] = useState<string | undefined>(undefined)
  const toggleHandled = async () => {
    if (!selected) return
    setHandling(true); setHandledErr(undefined)
    const res = await markMessageHandled(selected.id ?? '', !selected.handled)
    setHandling(false)
    if (!res.ok) { setHandledErr(res.error || 'Échec de la mise à jour'); setTimeout(() => setHandledErr(undefined), 4000) }
  }

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return
    setSending('sending')
    const result = await invokeReplyEmail({
      to: selected.email,
      subject: `Re: ${selected.sujet}`,
      replyMessage: replyText,
      replyFromName: user?.name || 'Greatlife',
      originalMessage: selected.message,
    })
    if (result.ok) {
      setSending('sent')
      const reply = { date: new Date().toISOString(), author: user?.name || 'Greatlife', content: replyText }
      if (selected.id) {
        const saved = await appendReply(selected.id, reply)
        if (saved.ok) {
          setMessages(prev => prev.map(m => m.id === selected.id ? { ...m, replies: [...(m.replies ?? []), reply] } : m))
        }
      }
      setReplyText('')
      setTimeout(() => setSending('idle'), 3000)
    } else {
      setSending('error')
      setTimeout(() => setSending('idle'), 4000)
    }
  }

  if (dataSource !== 'supabase') {
    return (
      <div className="admin-page">
        <PageHeader title="Messages" subtitle="Les demandes des clients apparaissent ici." />
        <div className="admin-empty" style={{ marginTop: 16, fontSize: 14 }}>
          Connectez votre espace en ligne pour activer la gestion et la réponse aux messages.
        </div>
      </div>
    )
  }

  return (
    <div className={`admin-page-wide admin-msg-split${selected ? '' : ' is-list-only'}`} style={{ gridTemplateColumns: selected ? undefined : '1fr' }}>
      <div>
        <PageHeader
          title="Messages"
          subtitle="Centralisez les demandes et répondez sans perdre le fil."
          actions={<GhostButton color={t.primary} onClick={exportCsv} disabled={filtered.length === 0}>Exporter</GhostButton>}
        />
        <div className="admin-status-live" role="status" aria-live="polite">
          {newCount > 0 ? `${newCount} nouveau${newCount > 1 ? 'x' : ''} message${newCount > 1 ? 's' : ''}` : sending === 'sending' ? 'Envoi de la réponse…' : sending === 'sent' ? 'Réponse envoyée' : sending === 'error' ? 'Échec de l\'envoi' : bulkErr || delErr || handledErr || ''}
        </div>
        <div className="admin-wf-kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} aria-label="Indicateurs messages">
          <div>
            <strong>{messages.filter((m) => !m.handled).length}</strong>
            <span>Non lus</span>
            <small>à traiter aujourd’hui</small>
          </div>
          <div>
            <strong>{messages.length}</strong>
            <span>Messages au total</span>
            <small>{live ? 'temps réel' : 'actualisation périodique'}</small>
          </div>
          <div>
            <strong>{messages.filter((m) => m.handled).length}</strong>
            <span>Traités</span>
            <small>déjà répondus</small>
          </div>
        </div>
        <div className="admin-toolbar">
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher un message" style={{ ...inp, paddingLeft: 32, fontSize: 13, minHeight: 44 }} />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} aria-hidden="true">{Icon.search(14, t.muted)}</span>
          </div>
          {([['all', 'Toutes'], ['unhandled', 'Non lus'], ['handled', 'Traités']] as ['all' | 'unhandled' | 'handled', string][]).map(([k, l]) => (
            <button key={k} type="button" className="admin-filter-chip" aria-pressed={statusFilter === k} onClick={() => setStatusFilter(k)}>
              {l}{' '}
              <span style={{ opacity: 0.7 }}>
                {k === 'all' ? messages.length : k === 'unhandled' ? messages.filter((m) => !m.handled).length : messages.filter((m) => m.handled).length}
              </span>
            </button>
          ))}
        </div>
        {selectedIds.size > 0 && (
          <div className="admin-toolbar" style={{ background: 'var(--admin-paper-muted)', padding: 12, borderRadius: 12, border: '1px solid var(--admin-line)' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
            <Bouton genre="secondaire" onClick={() => bulkSetHandled(true)} disabled={bulkBusy}>Marquer traités</Bouton>
            <Bouton genre="silencieux" onClick={() => bulkSetHandled(false)} disabled={bulkBusy}>Non traités</Bouton>
            <Bouton genre="danger" onClick={bulkDelete} disabled={bulkBusy}>Supprimer</Bouton>
            <Bouton genre="silencieux" onClick={() => setSelectedIds(new Set())}>Tout désélectionner</Bouton>
          </div>
        )}
        {messages.length === 0 ? (
          <EmptyState icon={Icon.mail(26, t.muted)} title="Aucun message" subtitle="Les soumissions du formulaire apparaîtront ici." />
        ) : filtered.length === 0 ? (
          <p className="admin-loading">Aucun message dans ce filtre.</p>
        ) : (
          <>
          <div className="admin-ops-list" style={{ marginTop: 12 }}>
            <button type="button" onClick={toggleSelectAll} className="admin-ops-row" style={{ fontWeight: 600, color: 'var(--admin-forest)', cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>
              {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
            {pagedMessages.map(m => {
              const i = messages.indexOf(m)
              const checked = Boolean(m.id && selectedIds.has(m.id))
              return (
              <div key={m.id ?? i} className={`admin-ops-row${!m.handled ? ' is-urgent' : ''}${selectedIdx === i ? ' is-selected' : ''}`}>
                <label style={{ display: 'flex', alignItems: 'center', minHeight: 44, paddingRight: 4, cursor: 'pointer' }}>
                  <input type="checkbox" checked={checked} onChange={() => m.id && toggleSelect(m.id)} aria-label={`Sélectionner ${m.nom}`} style={{ width: 18, height: 18 }} />
                </label>
                <button type="button" onClick={() => { setSelectedIdx(i); setReplyText(''); setSending('idle') }} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', padding: 0, minHeight: 44 }}>
                  <div className="admin-ops-title">
                    {!m.handled && <span className="admin-status-dot" aria-hidden="true" />}
                    {m.nom}
                    <span className="cms-sr-only">{m.handled ? 'Traité' : 'Non traité'}</span>
                    {!m.handled && <span className="admin-chip is-danger" style={{ marginLeft: 8 }}>Non traité</span>}
                  </div>
                  <div className="admin-ops-meta" style={{ color: 'var(--admin-forest)' }}>{m.sujet}</div>
                  <div className="admin-ops-meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message}</div>
                </button>
                <span className="admin-mono" style={{ fontSize: 12, opacity: 0.6 }}>{dateFr(m.date)}</span>
              </div>
              )
            })}
          </div>
          <Pagination page={page} pageSize={MSG_PAGE} total={filtered.length} onPage={setPage} />
          </>
        )}
      </div>
      {selected && (
        <div className="admin-conversation">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--admin-font-display)', color: 'var(--admin-ink)', fontSize: 24, fontWeight: 700, margin: 0 }}>{selected.nom}</h3>
              <div className="admin-ops-meta">{selected.email} · {selected.date}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-forest)', marginTop: 4 }}>{selected.sujet}</div>
            </div>
            <div className="admin-ops-actions">
              {selected.handled && <span className="admin-chip is-live">Traité</span>}
              <Bouton genre={selected.handled ? 'actif' : 'secondaire'} onClick={toggleHandled} disabled={handling} busy={handling}>
                {selected.handled ? 'Traité' : 'Marquer traité'}
              </Bouton>
              {confirmDel === selected.id ? (
                <>
                  <Bouton genre="danger" onClick={() => selected.id && removeMessage(selected.id)} disabled={delBusy}>{delBusy ? '…' : 'Confirmer'}</Bouton>
                  <Bouton genre="secondaire" onClick={() => setConfirmDel(null)}>Annuler</Bouton>
                </>
              ) : (
                <Bouton genre="danger" aria-label="Supprimer le message" onClick={() => setConfirmDel(selected.id ?? null)}>{Icon.trash(14, 'var(--admin-coral)')}</Bouton>
              )}
              <Bouton genre="silencieux" onClick={() => { setSelectedIdx(null); setReplyText(''); setSending('idle') }}>Fermer</Bouton>
            </div>
          </div>
          <div style={{ padding: 16, marginBottom: 16, borderRadius: 12, background: 'var(--admin-paper-muted)', border: '1px solid var(--admin-line)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.6 }}>Message original</div>
            <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.message}</p>
          </div>
          {(selected.replies?.length ?? 0) > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, opacity: 0.6 }}>Historique des réponses ({selected.replies!.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selected.replies!.map((rp, idx) => (
                  <div key={idx} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--admin-surface)', border: '1px solid var(--admin-line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{rp.author}</span>
                      <span className="admin-mono" style={{ fontSize: 11, opacity: 0.6 }}>{rp.date ? dateFr(rp.date) : ''}</span>
                    </div>
                    <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{rp.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <FieldLabel>Votre réponse</FieldLabel>
            <Textarea rows={5} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Tapez votre réponse au client…" style={inp} />
            <div className="admin-filter-row">
              <span style={{ fontSize: 12, fontWeight: 600, alignSelf: 'center', opacity: 0.6 }}>Modèles :</span>
              {TEMPLATES.map((tpl, idx) => (
                <button key={idx} type="button" className="admin-filter-chip" onClick={() => setReplyText(tpl)} title={tpl}>{tpl.slice(0, 28)}…</button>
              ))}
            </div>
            <div className="admin-ops-actions" style={{ marginTop: 12, justifyContent: 'flex-start' }}>
              <PrimaryButton onClick={sendReply} disabled={!replyText.trim() || sending === 'sending'} busy={sending === 'sending'}>
                {sending === 'sending' ? 'Envoi…' : 'Répondre par email'}
              </PrimaryButton>
              <span className={`admin-status-live${sending === 'error' ? ' is-error' : sending === 'sent' ? ' is-ok' : ''}`} role="status" aria-live="polite">
                {sending === 'sent' ? `Email envoyé à ${selected.email}` : sending === 'error' ? 'Échec de l\'envoi — réessayez' : ''}
              </span>
            </div>
            <div className="admin-ops-meta" style={{ marginTop: 10 }}>L&apos;email sera envoyé vers {selected.email}</div>
          </div>
        </div>
      )}
    </div>
  )
}

