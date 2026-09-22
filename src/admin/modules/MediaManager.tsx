import { useState, useRef } from 'react'
import { useSite, type MediaSlot } from '@/contexts/SiteContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { PageHeader } from '@/admin/ui'
import type { MenuItem } from '@/data/menu'
import { uploadMedia, deleteMedia, updateMediaSlot } from '@/lib/repository'
import { resizeImageFile, isResizableImage, RESIZE_PRESETS } from '@/lib/imageResize'
import { productPhotoSlotId } from '@/lib/productPhotoSlot'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const SITE_MEDIA_SLOTS: ReadonlyArray<{ id: string; label: string; dims: string }> = [
  { id: 'hero', label: 'Hero principal', dims: '1920×1080' },
  { id: 'hero-video', label: 'Vidéo de la bannière', dims: 'vidéo' },
  { id: 'logo', label: 'Logo / favicon', dims: '512×512' },
  { id: 'histoire', label: 'Fond section histoire', dims: '1600×900' },
  { id: 'equipe-1', label: 'Équipe — Membre 1', dims: '600×600' },
  { id: 'equipe-2', label: 'Équipe — Membre 2', dims: '600×600' },
  { id: 'equipe-3', label: 'Équipe — Membre 3', dims: '600×600' },
  { id: 'equipe-4', label: 'Équipe — Membre 4', dims: '600×600' },
  { id: 'general', label: 'Général / divers', dims: 'libre' },
]

export function mediaSlotChoices(menu: MenuItem[], existingSlots: string[]): ReadonlyArray<{ id: string; label: string; dims: string }> {
  const plats = menu
    .filter((item): item is MenuItem & { id: string } => Boolean(item.id))
    .map((item) => ({
      id: productPhotoSlotId(item.id),
      label: `Plat — ${item.name}`,
      dims: '800×600',
    }))
  const known = new Set([...SITE_MEDIA_SLOTS.map((s) => s.id), ...plats.map((s) => s.id)])
  const leftovers = [...new Set(existingSlots.filter((slot) => slot && !known.has(slot)))]
    .map((slot) => ({ id: slot, label: slot, dims: '' }))
  return [...SITE_MEDIA_SLOTS, ...plats, ...leftovers]
}

function labelForMediaSlot(slot: string, choices: ReadonlyArray<{ id: string; label: string }>): string {
  return choices.find((s) => s.id === slot)?.label || slot
}

function formatSize(n: number | null | undefined): string {
  if (!n) return ''
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`
}

export function MediaManager() {
  const { media, theme: t, dataSource, refreshMedia, menu } = useSite()
  const slotChoices = mediaSlotChoices(menu, media.map((m) => m.slot).filter((s): s is string => Boolean(s)))
  const [slot, setSlot] = useState('hero')
  const [resizePreset, setResizePreset] = useState('original')
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'err' | 'busy'; msg: string }>({ kind: 'idle', msg: '' })
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [editSlotId, setEditSlotId] = useState<string | null>(null)
  const [editSlotValue, setEditSlotValue] = useState('general')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const isSupabase = dataSource === 'supabase'
  const dbAssets = media.filter(m => m.id)
  const resizeMax = RESIZE_PRESETS.find(p => p.id === resizePreset)?.max ?? 0

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!isSupabase) {
      setStatus({ kind: 'err', msg: 'Connexion Supabase requise pour téléverser.' })
      return
    }
    setUploading(true)
    setStatus({ kind: 'busy', msg: `Préparation de ${file.name}…` })
    let finalFile = file
    let dims = ''
    try {
      if (resizeMax > 0 && isResizableImage(file)) {
        const r = await resizeImageFile(file, resizeMax)
        finalFile = r.file
        dims = ` (${r.width}×${r.height})`
      }
    } catch {
    }
    setStatus({ kind: 'busy', msg: `Téléversement de ${finalFile.name}${dims}…` })
    const res = await uploadMedia(finalFile, slot)
    setUploading(false)
    if (res.data) {
      setStatus({ kind: 'ok', msg: `${res.data.filename} téléversé dans « ${labelForMediaSlot(res.data.slot, slotChoices)} »${dims}.` })
      await refreshMedia()
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec du téléversement.' })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDelete = async (m: MediaSlot) => {
    if (!m.id) return
    setRemovingId(m.id)
    const res = await deleteMedia(m.id, '')
    setRemovingId(null)
    if (res.ok) {
      setStatus({ kind: 'ok', msg: `${m.filename || 'Fichier'} supprimé.` })
      await refreshMedia()
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec de la suppression.' })
    }
  }

  const handleSaveSlot = async (m: MediaSlot) => {
    if (!m.id) return
    const res = await updateMediaSlot(m.id, editSlotValue)
    if (res.ok) {
      setEditSlotId(null)
      await refreshMedia()
      setStatus({ kind: 'ok', msg: 'Emplacement mis à jour.' })
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec de la mise à jour.' })
    }
  }

  return (
    <div className="admin-page" style={{ maxWidth: 1120 }}>
      <PageHeader title="Médias" subtitle="Organisez vos images, vidéos et documents au même endroit."
        badge={<span className="admin-chip is-live">{dbAssets.length} fichier{dbAssets.length > 1 ? 's' : ''}</span>}
        actions={
          <Button
            type="button"
            disabled={!isSupabase || uploading}
            onClick={() => fileRef.current?.click()}
            style={{ borderRadius: 12 }}
          >
            Importer des médias
          </Button>
        }
      />
      <div className="admin-status-live" role="status" aria-live="polite">{uploading ? 'Téléversement en cours…' : status.kind === 'ok' || status.kind === 'err' || status.kind === 'busy' ? status.msg : ''}</div>
      {!isSupabase && (
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: `${t.gold || '#b8860b'}14`, color: t.heading, fontSize: 13, border: `1px solid ${t.primary}22` }}>
          Mode local — la connexion n'est pas active. Les téléversements sont désactivés.
        </div>
      )}

      <OrganicCard style={{ marginTop: 18, padding: 18, display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <Label style={{ color: t.heading, fontSize: 12, fontWeight: 600 }}>Emplacement cible</Label>
            <Select value={slot} onValueChange={setSlot}>
              <SelectTrigger style={{ borderColor: t.primary + '44', borderRadius: 10, background: t.surfaceAlt, padding: '10px 12px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {slotChoices.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.label} {s.dims ? `· ${s.dims}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <Label style={{ color: t.heading, fontSize: 12, fontWeight: 600 }}>Redimensionnement</Label>
            <Select value={resizePreset} onValueChange={setResizePreset}>
              <SelectTrigger style={{ borderColor: t.primary + '44', borderRadius: 10, background: t.surfaceAlt, padding: '10px 12px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESIZE_PRESETS.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files?.[0])}
        />
        <div
          className="admin-wf-media-drop"
          onClick={() => !uploading && isSupabase && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); if (isSupabase) setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false)
            if (isSupabase && !uploading) handleFile(e.dataTransfer.files?.[0])
          }}
          style={{
            borderColor: dragOver ? 'var(--admin-forest)' : undefined,
            cursor: isSupabase && !uploading ? 'pointer' : 'default',
            background: dragOver ? 'color-mix(in srgb, var(--admin-forest) 8%, var(--admin-paper-muted))' : undefined,
          }}
          role="button"
          tabIndex={0}
          aria-label="Zone de dépôt d'images"
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!uploading && isSupabase) fileRef.current?.click() } }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={t.primary} strokeWidth="1.4" style={{ margin: '0 auto 10px', display: 'block' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div style={{ fontWeight: 600, color: t.heading, fontSize: 14 }}>{uploading ? 'Téléversement en cours…' : 'Glissez-déposez ou cliquez pour téléverser'}</div>
          <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>Images & vidéos · {RESIZE_PRESETS.find(p => p.id === resizePreset)?.label.toLowerCase()}</div>
        </div>

        {status.kind !== 'idle' && (
          <div style={{
            fontSize: 13,
            padding: '9px 12px',
            borderRadius: 10,
            background: status.kind === 'ok' ? `${t.primary}12` : status.kind === 'err' ? '#dc262612' : `${t.primary}08`,
            color: status.kind === 'err' ? '#dc2626' : t.heading,
            border: `1px solid ${status.kind === 'err' ? '#dc262633' : t.primary + '22'}`,
          }}>
            {status.kind === 'busy' && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: t.primary, marginRight: 8, animation: 'pulse 1s infinite' }} />}
            {status.msg}
          </div>
        )}
      </OrganicCard>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.heading, marginBottom: 12 }}>Fichiers téléversés</div>
        {dbAssets.length === 0 ? (
          <OrganicCard style={{ padding: '32px 16px', textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={t.muted} strokeWidth="1.3" style={{ margin: '0 auto 10px', display: 'block', opacity: 0.6 }}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 17 5-5 4 4 3-3 6 6" /></svg>
            <div style={{ color: t.muted, fontSize: 13 }}>Aucun fichier téléversé pour le moment.</div>
          </OrganicCard>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {dbAssets.map((m, i) => {
              const isImg = m.content_type?.startsWith('image/')
              const editing = editSlotId === m.id
              return (
                <OrganicCard key={m.id || i} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ width: '100%', aspectRatio: '16 / 10', background: `${t.primary}0d`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                    {isImg && m.url ? (
                      <img src={m.url} alt={m.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={t.primary} strokeWidth="1.3"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 17 5-5 4 4 3-3 6 6" /></svg>
                    )}
                    <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                      {labelForMediaSlot(m.slot, slotChoices)}
                    </span>
                  </div>
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <div style={{ fontWeight: 600, color: t.heading, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.filename}</div>
                    <div style={{ fontSize: 11, color: t.muted }}>{m.content_type || 'fichier'} {formatSize(m.size_bytes) ? `· ${formatSize(m.size_bytes)}` : ''}</div>
                    {editing ? (
                      <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
                        <Select value={editSlotValue} onValueChange={setEditSlotValue}>
                          <SelectTrigger style={{ borderColor: t.primary + '44', borderRadius: 8, background: t.surfaceAlt, padding: '7px 10px', fontSize: 12 }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {slotChoices.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button size="sm" style={{ background: t.primary, color: '#fff', borderRadius: 8, flex: 1 }} onClick={() => handleSaveSlot(m)}>OK</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditSlotId(null)}>Annuler</Button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                        {m.url && (
                          <a href={m.url} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600, padding: '7px 0', borderRadius: 8, border: `1px solid ${t.primary}33`, color: t.primary, textDecoration: 'none' }}>Ouvrir</a>
                        )}
                        <Button size="sm" variant="outline" style={{ flex: 1, borderColor: t.primary + '44', color: t.primary, borderRadius: 8 }} onClick={() => { setEditSlotId(m.id || null); setEditSlotValue(m.slot) }}>Déplacer</Button>
                        <Button size="sm" variant="outline" disabled={removingId === m.id} style={{ borderColor: '#dc262644', color: '#dc2626', borderRadius: 8, opacity: removingId === m.id ? 0.6 : 1 }} onClick={() => handleDelete(m)}>{removingId === m.id ? '…' : 'Suppr.'}</Button>
                      </div>
                    )}
                  </div>
                </OrganicCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

