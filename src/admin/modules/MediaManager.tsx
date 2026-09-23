import { useEffect, useMemo, useRef, useState } from 'react'
import { useSite, type MediaSlot } from '@/contexts/SiteContext'
import { PageHeader, PrimaryButton, GhostButton, inputStyle } from '@/admin/ui'
import type { MenuItem } from '@/data/menu'
import { uploadMedia, deleteMedia, updateMediaSlot } from '@/lib/repository'
import { resizeImageFile, isResizableImage, RESIZE_PRESETS } from '@/lib/imageResize'
import { productPhotoSlotId } from '@/lib/productPhotoSlot'
import { Icon } from '@/lib/icons'
import { Bouton } from '@/admin/editor/chrome'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const SITE_MEDIA_SLOTS: ReadonlyArray<{ id: string; label: string; dims: string; folder: string }> = [
  { id: 'hero', label: 'Hero principal', dims: '1920×1080', folder: 'hero' },
  { id: 'hero-video', label: 'Vidéo de la bannière', dims: 'vidéo', folder: 'hero' },
  { id: 'logo', label: 'Logo / favicon', dims: '512×512', folder: 'logo' },
  { id: 'histoire', label: 'Fond section histoire', dims: '1600×900', folder: 'galerie' },
  { id: 'equipe-1', label: 'Équipe — Membre 1', dims: '600×600', folder: 'equipe' },
  { id: 'equipe-2', label: 'Équipe — Membre 2', dims: '600×600', folder: 'equipe' },
  { id: 'equipe-3', label: 'Équipe — Membre 3', dims: '600×600', folder: 'equipe' },
  { id: 'equipe-4', label: 'Équipe — Membre 4', dims: '600×600', folder: 'equipe' },
  { id: 'general', label: 'Général / divers', dims: 'libre', folder: 'galerie' },
]

const FOLDERS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'all', label: 'Tous les médias' },
  { id: 'logo', label: 'Logo & identité' },
  { id: 'hero', label: 'Hero' },
  { id: 'carte', label: 'Carte du restaurant' },
  { id: 'galerie', label: 'Galerie' },
  { id: 'equipe', label: 'Équipe' },
]

type MediaFilter = 'Tous' | 'Image' | 'Vidéo' | 'Logo' | 'Non utilisé'
type SortKey = 'recent' | 'name' | 'size'

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
  return [...SITE_MEDIA_SLOTS.map(({ id, label, dims }) => ({ id, label, dims })), ...plats, ...leftovers]
}

function labelForMediaSlot(slot: string, choices: ReadonlyArray<{ id: string; label: string }>): string {
  return choices.find((s) => s.id === slot)?.label || slot
}

function folderForSlot(slot: string): string {
  if (slot === 'logo') return 'logo'
  if (slot === 'hero' || slot === 'hero-video') return 'hero'
  if (slot.startsWith('product-') || slot.startsWith('plat-')) return 'carte'
  if (slot.startsWith('equipe')) return 'equipe'
  const known = SITE_MEDIA_SLOTS.find((s) => s.id === slot)
  return known?.folder ?? 'galerie'
}

function mediaKind(m: MediaSlot): 'Image' | 'Vidéo' | 'Logo' | 'Fichier' {
  if (m.slot === 'logo' || (m.content_type || '').includes('svg')) return 'Logo'
  if ((m.content_type || '').startsWith('video/')) return 'Vidéo'
  if ((m.content_type || '').startsWith('image/') || !m.content_type) return 'Image'
  return 'Fichier'
}

function usageLabel(slot: string, choices: ReadonlyArray<{ id: string; label: string }>): string {
  if (!slot || slot === 'general') return 'Non utilisé'
  return labelForMediaSlot(slot, choices)
}

function formatSize(n: number | null | undefined): string {
  if (!n) return '—'
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`
}

function suggestedAlt(m: MediaSlot, choices: ReadonlyArray<{ id: string; label: string }>): string {
  const slotLabel = labelForMediaSlot(m.slot, choices)
  if (m.slot === 'logo') return 'Logo Greatlife'
  if (m.slot === 'hero' || m.slot === 'hero-video') return 'Bannière du restaurant Greatlife'
  return `Image — ${slotLabel}`
}

export function MediaManager() {
  const { media, theme: t, dataSource, refreshMedia, menu } = useSite()
  const slotChoices = mediaSlotChoices(menu, media.map((m) => m.slot).filter((s): s is string => Boolean(s)))
  const [slot, setSlot] = useState('hero')
  const [resizePreset, setResizePreset] = useState('original')
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'err' | 'busy'; msg: string }>({ kind: 'idle', msg: '' })
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [query, setQuery] = useState('')
  const [folder, setFolder] = useState('all')
  const [filter, setFilter] = useState<MediaFilter>('Tous')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editSlot, setEditSlot] = useState('')
  const [altDraft, setAltDraft] = useState('')
  const [captionDraft, setCaptionDraft] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const isSupabase = dataSource === 'supabase'
  const dbAssets = media.filter((m) => m.id)
  const resizeMax = RESIZE_PRESETS.find((p) => p.id === resizePreset)?.max ?? 0
  const inp = inputStyle(t)

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { all: dbAssets.length }
    for (const f of FOLDERS) {
      if (f.id === 'all') continue
      counts[f.id] = dbAssets.filter((m) => folderForSlot(m.slot) === f.id).length
    }
    return counts
  }, [dbAssets])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = dbAssets.filter((m) => {
      if (folder !== 'all' && folderForSlot(m.slot) !== folder) return false
      const kind = mediaKind(m)
      const used = usageLabel(m.slot, slotChoices)
      if (filter === 'Image' && kind !== 'Image') return false
      if (filter === 'Vidéo' && kind !== 'Vidéo') return false
      if (filter === 'Logo' && kind !== 'Logo') return false
      if (filter === 'Non utilisé' && used !== 'Non utilisé') return false
      if (!q) return true
      const hay = `${m.filename || ''} ${m.slot} ${labelForMediaSlot(m.slot, slotChoices)}`.toLowerCase()
      return hay.includes(q)
    })
    rows = [...rows].sort((a, b) => {
      if (sortKey === 'name') return (a.filename || '').localeCompare(b.filename || '', 'fr')
      if (sortKey === 'size') return (b.size_bytes || 0) - (a.size_bytes || 0)
      return 0
    })
    return rows
  }, [dbAssets, folder, filter, query, sortKey, slotChoices])

  const selected = (selectedId ? filtered.find((m) => m.id === selectedId) : null) ?? filtered[0] ?? null
  const totalBytes = dbAssets.reduce((n, m) => n + (m.size_bytes || 0), 0)

  const selectAsset = (m: MediaSlot) => {
    setSelectedId(m.id ?? null)
    setEditSlot(m.slot || 'general')
    setAltDraft(suggestedAlt(m, slotChoices))
    setCaptionDraft('')
  }

  useEffect(() => {
    if (!selected) return
    if (selectedId !== selected.id) setSelectedId(selected.id ?? null)
    setEditSlot(selected.slot || 'general')
    setAltDraft((prev) => (prev ? prev : suggestedAlt(selected, slotChoices)))
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!isSupabase) {
      setStatus({ kind: 'err', msg: 'Connexion requise pour téléverser.' })
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
      /* garder l’original */
    }
    setStatus({ kind: 'busy', msg: `Téléversement de ${finalFile.name}${dims}…` })
    const res = await uploadMedia(finalFile, slot)
    setUploading(false)
    if (res.data) {
      setStatus({ kind: 'ok', msg: `${res.data.filename} téléversé dans « ${labelForMediaSlot(res.data.slot, slotChoices)} »${dims}.` })
      await refreshMedia()
      setSelectedId(res.data.id)
      setEditSlot(res.data.slot)
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
      if (selectedId === m.id) setSelectedId(null)
      await refreshMedia()
    } else {
      setStatus({ kind: 'err', msg: res.error || 'Échec de la suppression.' })
    }
  }

  const handleSaveDetail = async () => {
    if (!selected?.id) return
    if (editSlot !== selected.slot) {
      const res = await updateMediaSlot(selected.id, editSlot)
      if (!res.ok) {
        setStatus({ kind: 'err', msg: res.error || 'Échec de la mise à jour.' })
        return
      }
      await refreshMedia()
    }
    setStatus({
      kind: 'ok',
      msg: 'Emplacement enregistré. Le texte alternatif n’est pas encore stocké en base — il restera local à cette session.',
    })
  }

  const copyLink = async () => {
    if (!selected?.url) return
    try {
      await navigator.clipboard.writeText(selected.url)
      setStatus({ kind: 'ok', msg: 'Lien copié.' })
    } catch {
      setStatus({ kind: 'err', msg: 'Impossible de copier le lien.' })
    }
  }

  return (
    <div className="admin-page-wide">
      <PageHeader
        title="Médias"
        subtitle="Organisez vos images, vidéos et documents au même endroit."
        badge={<span className="admin-chip is-live">{dbAssets.length} fichier{dbAssets.length > 1 ? 's' : ''}</span>}
        actions={
          <PrimaryButton disabled={!isSupabase || uploading} onClick={() => fileRef.current?.click()}>
            {Icon.image(16)} Importer des médias
          </PrimaryButton>
        }
      />

      <div className={`admin-status-live${status.kind === 'err' ? ' is-error' : ''}`} role="status" aria-live="polite">
        {uploading ? 'Téléversement en cours…' : status.kind !== 'idle' ? status.msg : ''}
      </div>

      {!isSupabase && (
        <div className="admin-wf-alert" role="status">
          <span>
            <strong>Mode local</strong>
            <small>La connexion n’est pas active. Les téléversements sont désactivés.</small>
          </span>
        </div>
      )}

      <div className="admin-wf-media-toolbar">
        <label className="admin-wf-media-search">
          <span aria-hidden="true">{Icon.search(15)}</span>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedId(null) }}
            placeholder="Rechercher un média, un emplacement…"
            aria-label="Rechercher un média"
          />
        </label>
        <div className="admin-wf-media-toolbar-actions">
          <GhostButton
            color={t.muted}
            title="Les dossiers correspondent aux emplacements du site (Hero, Logo, plats…)."
            onClick={() => setStatus({ kind: 'ok', msg: 'Les dossiers suivent les emplacements existants — pas de dossier libre pour l’instant.' })}
          >
            Nouveau dossier
          </GhostButton>
          <GhostButton color={t.primary} onClick={() => setView(view === 'grid' ? 'list' : 'grid')}>
            {view === 'grid' ? Icon.list(15) : Icon.grid(15)} {view === 'grid' ? 'Liste' : 'Grille'}
          </GhostButton>
        </div>
      </div>

      <div className="admin-wf-media-upload-row">
        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <span className="admin-wf-eyebrow">Emplacement cible</span>
          <Select value={slot} onValueChange={setSlot}>
            <SelectTrigger style={{ borderColor: 'var(--admin-line)', borderRadius: 12, background: 'var(--admin-surface)', padding: '10px 12px', minHeight: 44 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {slotChoices.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}{s.dims ? ` · ${s.dims}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <span className="admin-wf-eyebrow">Redimensionnement</span>
          <Select value={resizePreset} onValueChange={setResizePreset}>
            <SelectTrigger style={{ borderColor: 'var(--admin-line)', borderRadius: 12, background: 'var(--admin-surface)', padding: '10px 12px', minHeight: 44 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESIZE_PRESETS.map((p) => (
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
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div
        className={`admin-wf-media-drop${dragOver ? ' is-drag' : ''}`}
        onClick={() => !uploading && isSupabase && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (isSupabase) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (isSupabase && !uploading) handleFile(e.dataTransfer.files?.[0])
        }}
        role="button"
        tabIndex={0}
        aria-label="Zone de dépôt d’images"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!uploading && isSupabase) fileRef.current?.click()
          }
        }}
        style={{ cursor: isSupabase && !uploading ? 'pointer' : 'default' }}
      >
        {Icon.image(28, 'var(--admin-forest)')}
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>{uploading ? 'Téléversement en cours…' : 'Glissez vos fichiers ici'}</strong>
          <span>ou cliquez pour parcourir · JPG, PNG, SVG, MP4 · {RESIZE_PRESETS.find((p) => p.id === resizePreset)?.label}</span>
        </div>
        <span
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <GhostButton
            color={t.primary}
            disabled={!isSupabase || uploading}
            onClick={() => fileRef.current?.click()}
          >
            Importer
          </GhostButton>
        </span>
      </div>

      <div className="admin-wf-media-folders" role="tablist" aria-label="Dossiers">
        <span className="admin-wf-eyebrow">Dossiers</span>
        {FOLDERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={folder === f.id}
            className={folder === f.id ? 'is-active' : undefined}
            onClick={() => { setFolder(f.id); setSelectedId(null) }}
          >
            {f.label}
            <small>{folderCounts[f.id] ?? 0}</small>
          </button>
        ))}
      </div>

      <div className="admin-wf-media-filters">
        <div role="group" aria-label="Filtrer par type">
          {(['Tous', 'Image', 'Vidéo', 'Logo', 'Non utilisé'] as MediaFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'is-active' : undefined}
              onClick={() => { setFilter(item); setSelectedId(null) }}
            >
              {item}
            </button>
          ))}
        </div>
        <span>{dbAssets.length} médias · {formatSize(totalBytes)} utilisés</span>
      </div>

      <div className="admin-wf-media-layout">
        <main className={`admin-wf-media-library${view === 'list' ? ' is-list' : ''}`}>
          <div className="admin-wf-media-library-head">
            <div>
              <span className="admin-wf-eyebrow">Bibliothèque</span>
              <strong>{filtered.length} fichier{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}</strong>
            </div>
            <div className="admin-wf-media-library-tools">
              <select
                aria-label="Trier les médias"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                style={{ ...inp, minHeight: 36, width: 'auto', padding: '6px 10px', fontSize: 12 }}
              >
                <option value="recent">Plus récents</option>
                <option value="name">Nom A-Z</option>
                <option value="size">Taille</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="admin-empty" style={{ margin: 12, padding: '28px 16px' }}>
              <div style={{ opacity: 0.5, marginBottom: 8 }}>{Icon.image(28, t.muted)}</div>
              <strong style={{ display: 'block', marginBottom: 4 }}>Aucun média</strong>
              <span style={{ fontSize: 13, color: 'color-mix(in srgb, var(--admin-ink) 55%, transparent)' }}>
                Importez une image ou élargissez les filtres.
              </span>
            </div>
          ) : (
            <div className="admin-wf-media-grid">
              {filtered.map((m) => {
                const kind = mediaKind(m)
                const active = selected?.id === m.id
                const isImg = (m.content_type || '').startsWith('image/')
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`admin-wf-media-item${active ? ' is-selected' : ''}`}
                    onClick={() => selectAsset(m)}
                    aria-pressed={active}
                  >
                    <span className="admin-wf-media-thumb">
                      {isImg && m.url ? (
                        <img src={m.url} alt="" />
                      ) : (
                        Icon.image(22, 'var(--admin-forest)')
                      )}
                      {kind === 'Vidéo' && <b>Vidéo</b>}
                    </span>
                    <span className="admin-wf-media-item-copy">
                      <strong>{m.filename || 'Sans nom'}</strong>
                      <small>{labelForMediaSlot(m.slot, slotChoices)} · {formatSize(m.size_bytes)}</small>
                    </span>
                    <i
                      className={usageLabel(m.slot, slotChoices) === 'Non utilisé' ? 'is-unused' : undefined}
                      aria-label={usageLabel(m.slot, slotChoices) === 'Non utilisé' ? 'Média non utilisé' : 'Média utilisé'}
                    />
                  </button>
                )
              })}
            </div>
          )}
        </main>

        <aside className="admin-wf-media-details" aria-label="Détail du média">
          {selected ? (
            <>
              <div className="admin-wf-media-details-head">
                <span className="admin-wf-eyebrow">Détail du média</span>
                <Bouton genre="silencieux" aria-label="Options" title="Options">
                  {Icon.more(16)}
                </Bouton>
              </div>
              <div className="admin-wf-media-detail-preview">
                {(selected.content_type || '').startsWith('image/') && selected.url ? (
                  <img src={selected.url} alt={altDraft || selected.filename || ''} />
                ) : (
                  Icon.image(36, 'var(--admin-forest)')
                )}
              </div>
              <div className="admin-wf-media-detail-title">
                <div>
                  <h2>{selected.filename || 'Sans nom'}</h2>
                  <small>{mediaKind(selected)} · {formatSize(selected.size_bytes)} · {selected.content_type || 'fichier'}</small>
                </div>
                <span className="admin-chip">{labelForMediaSlot(selected.slot, slotChoices)}</span>
              </div>

              <label className="admin-wf-media-field">
                <span>Emplacement</span>
                <Select value={editSlot || selected.slot} onValueChange={setEditSlot}>
                  <SelectTrigger style={{ borderColor: 'var(--admin-line)', borderRadius: 10, background: 'var(--admin-paper-muted)', padding: '9px 12px' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {slotChoices.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="admin-wf-media-field">
                <span>Texte alternatif</span>
                <textarea
                  value={altDraft}
                  onChange={(e) => setAltDraft(e.target.value)}
                  rows={3}
                  placeholder="Décrivez l’image pour l’accessibilité"
                />
                <small>Pas encore enregistré en base — brouillon de session uniquement.</small>
              </label>

              <label className="admin-wf-media-field">
                <span>Légende</span>
                <input
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  placeholder="Optionnel"
                />
              </label>

              <div className="admin-wf-media-usage">
                <strong>Utilisé dans</strong>
                <span>
                  {Icon.check(14, usageLabel(selected.slot, slotChoices) === 'Non utilisé' ? 'var(--admin-saffron)' : 'var(--admin-forest)')}
                  {usageLabel(selected.slot, slotChoices)}
                </span>
              </div>

              <div className="admin-wf-media-detail-actions">
                <GhostButton color={t.primary} onClick={handleSaveDetail}>{Icon.check(14)} Enregistrer</GhostButton>
                <GhostButton color={t.primary} disabled={!selected.url} onClick={copyLink}>{Icon.link(14)} Copier le lien</GhostButton>
                <GhostButton
                  color="#dc2626"
                  disabled={removingId === selected.id}
                  onClick={() => handleDelete(selected)}
                >
                  {Icon.trash(14, '#dc2626')} {removingId === selected.id ? '…' : 'Supprimer'}
                </GhostButton>
              </div>
            </>
          ) : (
            <div className="admin-empty" style={{ padding: '32px 12px', border: 0, background: 'transparent' }}>
              <div style={{ opacity: 0.45, marginBottom: 8 }}>{Icon.image(28)}</div>
              <strong>Sélectionnez un média</strong>
              <span style={{ display: 'block', marginTop: 6, fontSize: 13, opacity: 0.65 }}>Le détail s’affiche ici.</span>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
