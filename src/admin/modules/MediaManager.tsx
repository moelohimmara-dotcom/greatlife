import { useEffect, useMemo, useRef, useState } from 'react'
import { useSite, type MediaSlot } from '@/contexts/SiteContext'
import { PageHeader, PrimaryButton, GhostButton, inputStyle, EmptyState } from '@/admin/ui'
import type { MenuItem } from '@/data/menu'
import { uploadMedia, deleteMedia, updateMediaSlot } from '@/lib/repository'
import { resizeImageFile, isResizableImage, RESIZE_PRESETS } from '@/lib/imageResize'
import { productPhotoSlotId } from '@/lib/productPhotoSlot'
import { Icon } from '@/lib/icons'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const GUIDE_DISMISS_KEY = 'glife.medias.guide-tip.dismissed'

const SITE_MEDIA_SLOTS: ReadonlyArray<{ id: string; label: string; dims: string; folder: string }> = [
  { id: 'hero', label: 'Bannière principale', dims: 'grande photo', folder: 'hero' },
  { id: 'hero-video', label: 'Vidéo de la bannière', dims: 'vidéo', folder: 'hero' },
  { id: 'logo', label: 'Logo', dims: 'carré', folder: 'logo' },
  { id: 'histoire', label: 'Fond « Notre histoire »', dims: 'large', folder: 'galerie' },
  { id: 'equipe-1', label: 'Équipe — Membre 1', dims: 'portrait', folder: 'equipe' },
  { id: 'equipe-2', label: 'Équipe — Membre 2', dims: 'portrait', folder: 'equipe' },
  { id: 'equipe-3', label: 'Équipe — Membre 3', dims: 'portrait', folder: 'equipe' },
  { id: 'equipe-4', label: 'Équipe — Membre 4', dims: 'portrait', folder: 'equipe' },
  { id: 'general', label: 'Réserve (pas encore placé)', dims: 'libre', folder: 'galerie' },
]

const FOLDERS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'all', label: 'Tous les médias' },
  { id: 'logo', label: 'Logo & identité' },
  { id: 'hero', label: 'Bannière' },
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
      dims: 'photo plat',
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
  if (n < 1024) return `${n}\u00a0o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}\u00a0Ko`
  return `${(n / (1024 * 1024)).toFixed(1)}\u00a0Mo`
}

function suggestedAlt(m: MediaSlot, choices: ReadonlyArray<{ id: string; label: string }>): string {
  const slotLabel = labelForMediaSlot(m.slot, choices)
  if (m.slot === 'logo') return 'Logo Greatlife'
  if (m.slot === 'hero' || m.slot === 'hero-video') return 'Bannière du restaurant Greatlife'
  return `Image — ${slotLabel}`
}

function MediaGuide({ onClose }: { onClose: () => void }) {
  return (
    <section className="admin-wf-media-guide" aria-label="Comment ça marche">
      <header className="admin-wf-media-guide-head">
        <strong>
          <span aria-hidden="true">{Icon.eye(15)}</span>
          Comment ça marche
        </strong>
        <GhostButton color="var(--admin-ink)" onClick={onClose}>
          Fermer
        </GhostButton>
      </header>
      <ol>
        <li>
          <strong>Choisissez où afficher</strong>
          {' '}l’image (bannière, plat, équipe…). C’est l’emplacement sur votre site.
        </li>
        <li>
          <strong>Importez</strong>
          {' '}en glissant un fichier ou via «{'\u00a0'}Importer des médias{'\u00a0'}».
        </li>
        <li>
          <strong>Vérifiez le détail</strong>
          {' '}à droite{'\u00a0'}: emplacement, puis Enregistrer si vous changez où ça apparaît.
        </li>
        <li>
          Les <strong>dossiers</strong> (Bannière, Carte, Équipe…) regroupent automatiquement vos fichiers selon l’emplacement — ce ne sont pas des dossiers libres comme sur un ordinateur.
        </li>
      </ol>
    </section>
  )
}

export function MediaManager() {
  const { media, theme: t, dataSource, refreshMedia, menu } = useSite()
  const slotChoices = mediaSlotChoices(menu, media.map((m) => m.slot).filter((s): s is string => Boolean(s)))
  const [slot, setSlot] = useState('hero')
  const [resizePreset, setResizePreset] = useState('original')
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'err' | 'busy'; msg: string }>({ kind: 'idle', msg: '' })
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
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
  const [guideOpen, setGuideOpen] = useState(false)
  const [tipVisible, setTipVisible] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_DISMISS_KEY) !== '1'
    } catch {
      return true
    }
  })
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
    /* « recent » conserve l’ordre fourni par le dépôt (déjà trié du plus récent). */
    rows = [...rows].sort((a, b) => {
      if (sortKey === 'name') return (a.filename || '').localeCompare(b.filename || '', 'fr')
      if (sortKey === 'size') return (b.size_bytes || 0) - (a.size_bytes || 0)
      return 0
    })
    return rows
  }, [dbAssets, folder, filter, query, sortKey, slotChoices])

  const selected = (selectedId ? filtered.find((m) => m.id === selectedId) : null) ?? filtered[0] ?? null
  const totalBytes = dbAssets.reduce((n, m) => n + (m.size_bytes || 0), 0)
  const hasActiveFilters = folder !== 'all' || filter !== 'Tous' || query.trim().length > 0
  const libraryEmptyBecauseFilter = filtered.length === 0 && dbAssets.length > 0

  const selectAsset = (m: MediaSlot) => {
    setSelectedId(m.id ?? null)
    setEditSlot(m.slot || 'general')
    setAltDraft(suggestedAlt(m, slotChoices))
    setCaptionDraft('')
    setConfirmDelete(false)
  }

  useEffect(() => {
    if (!selected) return
    if (selectedId !== selected.id) setSelectedId(selected.id ?? null)
    setEditSlot(selected.slot || 'general')
    setAltDraft((prev) => (prev ? prev : suggestedAlt(selected, slotChoices)))
    setConfirmDelete(false)
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const dismissTip = () => {
    setTipVisible(false)
    try {
      localStorage.setItem(GUIDE_DISMISS_KEY, '1')
    } catch { /* ignore */ }
  }

  const resetFilters = () => {
    setFolder('all')
    setFilter('Tous')
    setQuery('')
    setSelectedId(null)
  }

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
    setConfirmDelete(false)
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
      msg: 'Emplacement enregistré. Le texte alternatif n’est pas encore mémorisé — il reste pour cette session uniquement.',
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
        subtitle="Vos photos et vidéos, prêtes à placer sur le site."
        badge={<span className="admin-chip is-live">{dbAssets.length} fichier{dbAssets.length > 1 ? 's' : ''}</span>}
        actions={
          <>
            <GhostButton
              color={t.primary}
              aria-expanded={guideOpen}
              aria-controls="medias-guide"
              onClick={() => setGuideOpen((v) => !v)}
            >
              {Icon.eye(15)} Comment ça marche
            </GhostButton>
            <PrimaryButton disabled={!isSupabase || uploading} onClick={() => fileRef.current?.click()}>
              {Icon.image(16)} Importer des médias
            </PrimaryButton>
          </>
        }
      />

      {guideOpen && (
        <div id="medias-guide">
          <MediaGuide onClose={() => setGuideOpen(false)} />
        </div>
      )}

      {tipVisible && (
        <div className="admin-wf-media-tip" role="status">
          <div>
            <strong>Astuce</strong>
            <p>
              Importez d’abord, puis choisissez où ça apparaît (bannière, plat, équipe).
              Les dossiers du bas suivent automatiquement cet emplacement.
            </p>
          </div>
          <div className="admin-wf-media-tip-actions">
            <GhostButton color={t.primary} onClick={() => { setGuideOpen(true); dismissTip() }}>
              Voir le guide
            </GhostButton>
            <GhostButton color={t.muted} onClick={dismissTip}>
              Compris
            </GhostButton>
          </div>
        </div>
      )}

      <div className={`admin-status-live${status.kind === 'err' ? ' is-error' : status.kind === 'ok' ? ' is-ok' : ''}`} role="status" aria-live="polite">
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
            autoComplete="off"
            name="media-search"
            spellCheck={false}
          />
        </label>
        <div className="admin-wf-media-toolbar-actions">
          <GhostButton
            color={t.muted}
            title="Les dossiers suivent l’emplacement sur le site (bannière, plats…). Pas de dossier libre pour l’instant."
            onClick={() => {
              setGuideOpen(true)
              setStatus({
                kind: 'ok',
                msg: 'Les dossiers suivent l’emplacement sur le site — pas de dossier libre pour l’instant.',
              })
            }}
          >
            À propos des dossiers
          </GhostButton>
          <GhostButton
            color={t.primary}
            aria-pressed={view === 'list'}
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
          >
            {view === 'grid' ? Icon.list(15) : Icon.grid(15)} {view === 'grid' ? 'Liste' : 'Grille'}
          </GhostButton>
        </div>
      </div>

      <div className="admin-wf-media-upload-row">
        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <span className="admin-wf-eyebrow" id="media-slot-label">Où l’afficher</span>
          <Select value={slot} onValueChange={setSlot}>
            <SelectTrigger
              aria-labelledby="media-slot-label"
              style={{ borderColor: 'var(--admin-line)', borderRadius: 12, background: 'var(--admin-surface)', padding: '10px 12px', minHeight: 44 }}
            >
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
          <span className="admin-wf-eyebrow" id="media-resize-label">Taille à l’import</span>
          <Select value={resizePreset} onValueChange={setResizePreset}>
            <SelectTrigger
              aria-labelledby="media-resize-label"
              style={{ borderColor: 'var(--admin-line)', borderRadius: 12, background: 'var(--admin-surface)', padding: '10px 12px', minHeight: 44 }}
            >
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
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div
        className={`admin-wf-media-drop${dragOver ? ' is-drag' : ''}${!isSupabase || uploading ? ' is-disabled' : ''}`}
        onClick={() => !uploading && isSupabase && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (isSupabase) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (isSupabase && !uploading) handleFile(e.dataTransfer.files?.[0])
        }}
        role="button"
        tabIndex={isSupabase && !uploading ? 0 : -1}
        aria-disabled={!isSupabase || uploading}
        aria-label="Zone de dépôt d’images — glisser un fichier ou activer pour parcourir"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!uploading && isSupabase) fileRef.current?.click()
          }
        }}
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
              aria-pressed={filter === item}
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
                style={{ ...inp, minHeight: 44, width: 'auto', padding: '6px 10px', fontSize: 12 }}
              >
                <option value="recent">Plus récents</option>
                <option value="name">Nom A-Z</option>
                <option value="size">Taille</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="admin-wf-media-empty">
              {libraryEmptyBecauseFilter ? (
                <EmptyState
                  icon={Icon.search(28, t.muted)}
                  title="Aucun résultat avec ces filtres"
                  subtitle={
                    filter === 'Non utilisé'
                      ? 'Tous vos fichiers ont déjà un emplacement sur le site. Élisez « Tous » pour les revoir.'
                      : 'Élargissez la recherche ou les dossiers pour retrouver vos fichiers.'
                  }
                />
              ) : (
                <EmptyState
                  icon={Icon.image(28, t.muted)}
                  title="Aucune photo pour l’instant"
                  subtitle="Ajoutez la photo de la bannière ou d’un plat — elle apparaîtra ici, prête à placer sur le site."
                />
              )}
              <div className="admin-wf-media-empty-actions">
                {libraryEmptyBecauseFilter && hasActiveFilters && (
                  <GhostButton color={t.primary} onClick={resetFilters}>
                    Afficher tous les médias
                  </GhostButton>
                )}
                {!libraryEmptyBecauseFilter && (
                  <PrimaryButton disabled={!isSupabase || uploading} onClick={() => fileRef.current?.click()}>
                    {Icon.image(16)} Importer une photo
                  </PrimaryButton>
                )}
              </div>
            </div>
          ) : (
            <div className="admin-wf-media-grid">
              {filtered.map((m) => {
                const kind = mediaKind(m)
                const active = selected?.id === m.id
                const isImg = (m.content_type || '').startsWith('image/')
                const used = usageLabel(m.slot, slotChoices)
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
                        <img
                          src={m.url}
                          alt=""
                          width={320}
                          height={200}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span aria-hidden="true">{Icon.image(22, 'var(--admin-forest)')}</span>
                      )}
                      {kind === 'Vidéo' && <b>Vidéo</b>}
                    </span>
                    <span className="admin-wf-media-item-copy">
                      <strong title={m.filename || 'Sans nom'}>{m.filename || 'Sans nom'}</strong>
                      <small title={labelForMediaSlot(m.slot, slotChoices)}>
                        {labelForMediaSlot(m.slot, slotChoices)} · {formatSize(m.size_bytes)}
                      </small>
                    </span>
                    <i
                      className={used === 'Non utilisé' ? 'is-unused' : undefined}
                      aria-label={used === 'Non utilisé' ? 'Média non utilisé' : 'Média utilisé'}
                      title={used === 'Non utilisé' ? 'Non utilisé sur le site' : `Utilisé : ${used}`}
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
              </div>
              <div className="admin-wf-media-detail-preview">
                {(selected.content_type || '').startsWith('image/') && selected.url ? (
                  <img
                    src={selected.url}
                    alt={altDraft || selected.filename || ''}
                    width={640}
                    height={400}
                    decoding="async"
                  />
                ) : (
                  <span aria-hidden="true">{Icon.image(36, 'var(--admin-forest)')}</span>
                )}
              </div>
              <div className="admin-wf-media-detail-title">
                <div>
                  <h2 title={selected.filename || 'Sans nom'}>{selected.filename || 'Sans nom'}</h2>
                  <small>{mediaKind(selected)} · {formatSize(selected.size_bytes)} · {selected.content_type || 'fichier'}</small>
                </div>
                <span className="admin-chip" title={labelForMediaSlot(selected.slot, slotChoices)}>
                  {labelForMediaSlot(selected.slot, slotChoices)}
                </span>
              </div>

              <label className="admin-wf-media-field">
                <span>Où l’afficher</span>
                <Select value={editSlot || selected.slot} onValueChange={setEditSlot}>
                  <SelectTrigger
                    aria-label="Où l’afficher"
                    style={{ borderColor: 'var(--admin-line)', borderRadius: 10, background: 'var(--admin-paper-muted)', padding: '9px 12px', minHeight: 44 }}
                  >
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
                  placeholder="Décrivez l’image pour les visiteurs qui ne la voient pas…"
                  name="media-alt"
                  autoComplete="off"
                />
                <small className="admin-hint-box" style={{ marginTop: 0 }}>
                  Pas encore mémorisé en base — brouillon de session uniquement. Utile pour préparer la description.
                </small>
              </label>

              <label className="admin-wf-media-field">
                <span>Légende</span>
                <input
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  placeholder="Optionnel…"
                  name="media-caption"
                  autoComplete="off"
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
                {confirmDelete ? (
                  <div className="admin-wf-media-confirm-del" role="group" aria-label="Confirmer la suppression">
                    <span>Supprimer définitivement{'\u00a0'}?</span>
                    <GhostButton
                      color="#dc2626"
                      disabled={removingId === selected.id}
                      onClick={() => handleDelete(selected)}
                    >
                      {removingId === selected.id ? 'Suppression…' : 'Confirmer'}
                    </GhostButton>
                    <GhostButton color={t.muted} onClick={() => setConfirmDelete(false)}>Annuler</GhostButton>
                  </div>
                ) : (
                  <GhostButton
                    color="#dc2626"
                    disabled={removingId === selected.id}
                    onClick={() => setConfirmDelete(true)}
                  >
                    {Icon.trash(14, '#dc2626')} Supprimer
                  </GhostButton>
                )}
              </div>
            </>
          ) : (
            <div className="admin-empty" style={{ padding: '32px 12px', border: 0, background: 'transparent' }}>
              <div style={{ opacity: 0.45, marginBottom: 8 }} aria-hidden="true">{Icon.image(28)}</div>
              <strong>Sélectionnez un média</strong>
              <span style={{ display: 'block', marginTop: 6, fontSize: 13, opacity: 0.65 }}>Le détail s’affiche ici.</span>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
