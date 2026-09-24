import { useEffect, useMemo, useRef, useState } from 'react'
import { useSite, type MediaSlot } from '@/contexts/SiteContext'
import { PageHeader, PrimaryButton, GhostButton, inputStyle, EmptyState } from '@/admin/ui'
import type { MenuItem } from '@/data/menu'
import { uploadMedia, deleteMedia, updateMediaAsset } from '@/lib/repository'
import { resizeImageFile, isResizableImage, RESIZE_PRESETS } from '@/lib/imageResize'
import { productPhotoSlotId } from '@/lib/productPhotoSlot'
import { Icon } from '@/lib/icons'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { CONSOLE_TIP_KEYS } from '@/admin/console-prefs'

const GUIDE_DISMISS_KEY = CONSOLE_TIP_KEYS.mediasGuide

type UploadItemStatus = 'waiting' | 'working' | 'ok' | 'err'

type UploadQueueItem = {
  id: string
  name: string
  status: UploadItemStatus
  detail?: string
}

function friendlyUploadError(raw?: string): string {
  if (!raw) return 'Impossible d’importer ce fichier.'
  if (raw === 'not-configured' || /not.?config/i.test(raw)) return 'Connexion requise pour importer.'
  if (/too large|payload|size|maximum/i.test(raw)) return 'Fichier trop volumineux.'
  if (/mime|content.?type|invalid type|not allowed/i.test(raw)) return 'Format non pris en charge.'
  if (/network|fetch|Failed to fetch/i.test(raw)) return 'Réseau indisponible. Réessayez dans un instant.'
  return 'Impossible d’importer ce fichier. Réessayez ou choisissez un autre fichier.'
}

function uploadStatusLabel(status: UploadItemStatus): string {
  if (status === 'waiting') return 'En attente'
  if (status === 'working') return 'En cours…'
  if (status === 'ok') return 'Importé'
  return 'Échec'
}

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
type SortKey = 'recent' | 'oldest' | 'name' | 'size'

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
  /* `produit-<uuid>` est le slot canonique des plats (productPhotoSlotId).
     Les anciens préfixes product-/plat- restent pour le repli historique. */
  if (
    slot.startsWith('produit-')
    || slot.startsWith('product-')
    || slot.startsWith('plat-')
  ) return 'carte'
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
          <strong>Importez une ou plusieurs photos</strong>
          {' '}en les glissant ici, ou via «{'\u00a0'}Importer des médias{'\u00a0'}». Vous pouvez sélectionner plusieurs fichiers d’un coup.
        </li>
        <li>
          <strong>Suivez la file d’attente</strong>
          {' '}(succès / échecs), puis ouvrez le détail à droite{'\u00a0'}: emplacement, texte alternatif, légende — puis Enregistrer.
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
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([])
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
  const [savingDetail, setSavingDetail] = useState(false)
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
    /* Tri date : created_at BDD (sinon ordre dépôt). */
    rows = [...rows].sort((a, b) => {
      if (sortKey === 'name') return (a.filename || '').localeCompare(b.filename || '', 'fr')
      if (sortKey === 'size') return (b.size_bytes || 0) - (a.size_bytes || 0)
      const da = a.created_at ? new Date(a.created_at).getTime() : 0
      const db = b.created_at ? new Date(b.created_at).getTime() : 0
      if (da || db) return sortKey === 'oldest' ? da - db : db - da
      return 0
    })
    return rows
  }, [dbAssets, folder, filter, query, sortKey, slotChoices])

  /* Ne JAMAIS substituer filtered[0] quand un id est choisi mais hors filtre :
     après un changement d’emplacement, le fichier quitte le dossier courant —
     sinon l’UI « saute » sur une autre image et le restaurateur croit que
     l’enregistrement a échoué / que rien ne s’affiche. */
  const selected = selectedId
    ? (dbAssets.find((m) => m.id === selectedId) ?? null)
    : (filtered[0] ?? null)
  const totalBytes = dbAssets.reduce((n, m) => n + (m.size_bytes || 0), 0)
  const hasActiveFilters = folder !== 'all' || filter !== 'Tous' || query.trim().length > 0
  const libraryEmptyBecauseFilter = filtered.length === 0 && dbAssets.length > 0
  const detailSlot = selected ? (editSlot || selected.slot) : ''
  const detailPlace = detailSlot ? slotChoices.find((s) => s.id === detailSlot) : undefined
  const detailUsed = detailSlot ? usageLabel(detailSlot, slotChoices) : 'Non utilisé'
  const detailUnused = detailUsed === 'Non utilisé'
  const savedAlt = (selected?.alt_text ?? '').trim()
  const savedCaption = (selected?.caption ?? '').trim()
  const detailSlotDirty = Boolean(selected && detailSlot !== selected.slot)
  const detailDescDirty = Boolean(
    selected && (altDraft.trim() !== savedAlt || captionDraft.trim() !== savedCaption),
  )
  const detailDirty = detailSlotDirty || detailDescDirty
  const detailKind = selected ? mediaKind(selected) : 'Fichier'
  const detailIsImage = Boolean(selected && (selected.content_type || '').startsWith('image/'))

  const hydrateDetailDrafts = (m: MediaSlot) => {
    setEditSlot(m.slot || 'general')
    setAltDraft(m.alt_text ?? '')
    setCaptionDraft(m.caption ?? '')
    setConfirmDelete(false)
  }

  const selectAsset = (m: MediaSlot) => {
    setSelectedId(m.id ?? null)
    hydrateDetailDrafts(m)
  }

  useEffect(() => {
    if (!selected) return
    if (selectedId !== selected.id) setSelectedId(selected.id ?? null)
    hydrateDetailDrafts(selected)
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

  const handleFiles = async (fileList: FileList | File[] | null | undefined) => {
    const files = Array.from(fileList ?? []).filter((f): f is File => Boolean(f))
    if (files.length === 0) return
    if (!isSupabase) {
      setStatus({ kind: 'err', msg: 'Connexion requise pour importer.' })
      return
    }
    if (uploading) return

    const total = files.length
    const queue: UploadQueueItem[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      name: file.name,
      status: 'waiting',
    }))
    setUploadQueue(queue)
    setUploading(true)

    let okCount = 0
    let failCount = 0
    let lastOkId: string | null = null
    let lastOkSlot = slot
    const targetLabel = labelForMediaSlot(slot, slotChoices)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const itemId = queue[i].id
      setUploadQueue((prev) => prev.map((q) => (q.id === itemId ? { ...q, status: 'working', detail: undefined } : q)))
      setStatus({
        kind: 'busy',
        msg: total === 1
          ? `Préparation de ${file.name}…`
          : `Import ${i + 1} sur ${total} — préparation de ${file.name}…`,
      })

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

      setStatus({
        kind: 'busy',
        msg: total === 1
          ? `Import de ${finalFile.name}${dims}…`
          : `Import ${i + 1} sur ${total} — ${finalFile.name}${dims}…`,
      })

      const res = await uploadMedia(finalFile, slot)
      if (res.data) {
        okCount += 1
        lastOkId = res.data.id
        lastOkSlot = res.data.slot
        setUploadQueue((prev) => prev.map((q) => (
          q.id === itemId
            ? { ...q, status: 'ok', detail: `Dans « ${labelForMediaSlot(res.data!.slot, slotChoices)} »` }
            : q
        )))
      } else {
        failCount += 1
        const detail = friendlyUploadError(res.error)
        setUploadQueue((prev) => prev.map((q) => (
          q.id === itemId ? { ...q, status: 'err', detail } : q
        )))
      }
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''

    if (okCount > 0) {
      await refreshMedia()
      if (lastOkId) {
        setSelectedId(lastOkId)
        setEditSlot(lastOkSlot)
      }
    }

    if (failCount === 0) {
      setStatus({
        kind: 'ok',
        msg: okCount === 1
          ? `1 fichier importé dans « ${targetLabel} ».`
          : `${okCount} fichiers importés dans « ${targetLabel} ».`,
      })
    } else if (okCount === 0) {
      setStatus({
        kind: 'err',
        msg: total === 1
          ? 'Import impossible. Vérifiez le fichier et réessayez.'
          : `Aucun fichier importé (${failCount} échec${failCount > 1 ? 's' : ''}).`,
      })
    } else {
      setStatus({
        kind: 'err',
        msg: `${okCount} importé${okCount > 1 ? 's' : ''}, ${failCount} échec${failCount > 1 ? 's' : ''} — voyez la liste ci-dessous.`,
      })
    }
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
    if (!selected?.id || !detailDirty) return
    const nextSlot = editSlot || selected.slot
    const nextAlt = altDraft.trim()
    const nextCaption = captionDraft.trim()
    const savedId = selected.id
    const slotChanged = nextSlot !== selected.slot
    setSavingDetail(true)
    setStatus({ kind: 'busy', msg: 'Enregistrement…' })
    try {
      const res = await updateMediaAsset(savedId, {
        slot: nextSlot,
        alt_text: nextAlt || null,
        caption: nextCaption || null,
      })
      if (!res.ok) {
        setStatus({ kind: 'err', msg: res.error || 'Impossible d’enregistrer. Réessayez.' })
        return
      }
      /* Suivre le fichier dans son dossier après changement d’emplacement. */
      if (slotChanged) {
        const destFolder = folderForSlot(nextSlot)
        if (folder !== 'all' && folder !== destFolder) setFolder(destFolder)
      }
      setSelectedId(savedId)
      await refreshMedia()
      const parts: string[] = []
      if (slotChanged) parts.push('emplacement')
      if (nextAlt !== savedAlt || nextCaption !== savedCaption) parts.push('description')
      setStatus({
        kind: 'ok',
        msg: parts.length === 2
          ? 'Emplacement et description enregistrés.'
          : parts[0] === 'emplacement'
            ? 'Emplacement enregistré.'
            : 'Description enregistrée.',
      })
    } catch {
      setStatus({ kind: 'err', msg: 'Impossible d’enregistrer. Réessayez.' })
    } finally {
      setSavingDetail(false)
    }
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

  const queueDone = uploadQueue.filter((q) => q.status === 'ok' || q.status === 'err').length
  const queueOk = uploadQueue.filter((q) => q.status === 'ok').length
  const queueErr = uploadQueue.filter((q) => q.status === 'err').length
  const queueCurrent = Math.min(queueDone + (uploading ? 1 : 0), uploadQueue.length || 0)

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
              Vous pouvez importer plusieurs photos d’un coup. Choisissez ensuite où chacune apparaît
              (bannière, plat, équipe). Les dossiers du bas suivent automatiquement cet emplacement.
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
        {uploading
          ? (uploadQueue.length > 1
            ? `Import en cours (${queueCurrent} sur ${uploadQueue.length})…`
            : 'Import en cours…')
          : status.kind !== 'idle' ? status.msg : ''}
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
        multiple
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div
        className={`admin-wf-media-drop${dragOver ? ' is-drag' : ''}${!isSupabase || uploading ? ' is-disabled' : ''}`}
        onClick={() => !uploading && isSupabase && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (isSupabase) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (isSupabase && !uploading) handleFiles(e.dataTransfer.files)
        }}
        role="button"
        tabIndex={isSupabase && !uploading ? 0 : -1}
        aria-disabled={!isSupabase || uploading}
        aria-label="Zone de dépôt — glisser une ou plusieurs photos, ou activer pour parcourir"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!uploading && isSupabase) fileRef.current?.click()
          }
        }}
      >
        {Icon.image(28, 'var(--admin-forest)')}
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>{uploading ? 'Import en cours…' : 'Glissez vos fichiers ici'}</strong>
          <span>plusieurs fichiers acceptés · JPG, PNG, SVG, MP4 · {RESIZE_PRESETS.find((p) => p.id === resizePreset)?.label}</span>
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

      {uploadQueue.length > 0 && (
        <section
          className={`admin-wf-media-queue${uploading ? ' is-busy' : ''}`}
          aria-label="File d’import"
        >
          <header className="admin-wf-media-queue-head">
            <div>
              <strong>
                {uploading
                  ? `Import ${queueCurrent} sur ${uploadQueue.length}`
                  : queueErr === 0
                    ? `Import terminé — ${queueOk} fichier${queueOk > 1 ? 's' : ''} prêt${queueOk > 1 ? 's' : ''}`
                    : `Import terminé — ${queueOk} réussi${queueOk > 1 ? 's' : ''}, ${queueErr} échec${queueErr > 1 ? 's' : ''}`}
              </strong>
              {!uploading && queueErr > 0 && (
                <p>Corrigez les fichiers en échec, puis réessayez l’import.</p>
              )}
            </div>
            {!uploading && (
              <GhostButton color={t.muted} onClick={() => setUploadQueue([])}>
                Masquer
              </GhostButton>
            )}
          </header>
          <ul className="admin-wf-media-queue-list">
            {uploadQueue.map((item) => (
              <li key={item.id} className={`is-${item.status}`}>
                <span className="admin-wf-media-queue-name" title={item.name}>{item.name}</span>
                <span className="admin-wf-media-queue-state">
                  {uploadStatusLabel(item.status)}
                  {item.detail ? ` · ${item.detail}` : ''}
                </span>
              </li>
            ))}
          </ul>
          <div
            className="admin-wf-media-queue-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={uploadQueue.length}
            aria-valuenow={queueDone}
            aria-label="Progression de l’import"
          >
            <i
              style={{
                width: `${Math.round((queueDone / Math.max(uploadQueue.length, 1)) * 100)}%`,
              }}
            />
          </div>
        </section>
      )}

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
                <option value="oldest">Plus anciens</option>
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
                    {Icon.image(16)} Importer des photos
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
              <header className="admin-wf-media-details-head">
                <div className="admin-wf-media-details-head-copy">
                  <span className="admin-wf-eyebrow">Détail</span>
                  <h2 className="admin-wf-media-detail-name" title={selected.filename || 'Sans nom'}>
                    {selected.filename || 'Sans nom'}
                  </h2>
                  <p className="admin-wf-media-detail-meta">
                    {detailKind}
                    <span aria-hidden="true"> · </span>
                    {formatSize(selected.size_bytes)}
                  </p>
                </div>
                <span
                  className={`admin-chip${detailUnused ? ' is-warn' : ' is-live'}`}
                  title={detailUnused ? 'Pas encore placé sur le site' : `Placé : ${detailUsed}`}
                >
                  {detailUnused ? 'Non placé' : 'Sur le site'}
                </span>
              </header>

              <div className="admin-wf-media-detail-preview" data-kind={detailKind.toLowerCase()}>
                {detailIsImage && selected.url ? (
                  <img
                    src={selected.url}
                    alt={altDraft || selected.filename || ''}
                    width={640}
                    height={400}
                    decoding="async"
                  />
                ) : (
                  <span className="admin-wf-media-detail-preview-fallback" aria-hidden="true">
                    {Icon.image(36, 'var(--admin-forest)')}
                    <small>{detailKind}</small>
                  </span>
                )}
              </div>

              <section className="admin-wf-media-detail-seg" aria-labelledby="media-place-heading">
                <div className="admin-wf-media-detail-seg-head">
                  <h3 id="media-place-heading">Emplacement sur le site</h3>
                  <p>Choisissez où vos clients verront cette image (bannière, plat, équipe…).</p>
                </div>
                <label className="admin-wf-media-field" htmlFor="media-place-trigger">
                  <span>Où l’afficher</span>
                  <Select value={detailSlot} onValueChange={setEditSlot}>
                    <SelectTrigger
                      id="media-place-trigger"
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
                  {detailPlace?.dims ? (
                    <small className="admin-wf-media-field-hint">Format conseillé : {detailPlace.dims}</small>
                  ) : null}
                </label>
                <div className={`admin-wf-media-usage${detailUnused ? ' is-unused' : ''}`} role="status">
                  <strong>{detailUnused ? 'Pas encore sur le site' : 'Visible ici'}</strong>
                  <span>
                    {Icon.check(14, detailUnused ? 'var(--admin-saffron)' : 'var(--admin-forest)')}
                    {detailUnused ? 'Réserve — choisissez un emplacement ci-dessus' : detailUsed}
                  </span>
                </div>
              </section>

              <section className="admin-wf-media-detail-seg" aria-labelledby="media-desc-heading">
                <div className="admin-wf-media-detail-seg-head">
                  <h3 id="media-desc-heading">Description</h3>
                  <p>Pour les visiteurs qui ne voient pas l’image. Mémorisé avec le fichier.</p>
                </div>
                <label className="admin-wf-media-field" htmlFor="media-alt">
                  <span>Texte alternatif</span>
                  <textarea
                    id="media-alt"
                    value={altDraft}
                    onChange={(e) => setAltDraft(e.target.value)}
                    rows={3}
                    placeholder={selected ? suggestedAlt(selected, slotChoices) : 'Ex. : Assiette de fruits tropicaux sur la terrasse…'}
                    name="media-alt"
                    autoComplete="off"
                  />
                  <small className="admin-wf-media-field-hint">
                    Décrivez ce que montre la photo — utile si l’image ne s’affiche pas.
                  </small>
                </label>
                <label className="admin-wf-media-field" htmlFor="media-caption">
                  <span>Légende <em>(optionnel)</em></span>
                  <input
                    id="media-caption"
                    value={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    placeholder="Courte phrase sous la photo…"
                    name="media-caption"
                    autoComplete="off"
                  />
                </label>
              </section>

              <footer className="admin-wf-media-detail-actions">
                <div className="admin-wf-media-detail-actions-primary">
                  <PrimaryButton
                    disabled={!detailDirty || savingDetail || !isSupabase}
                    busy={savingDetail}
                    onClick={() => { void handleSaveDetail() }}
                  >
                    {Icon.check(14)} {savingDetail ? 'Enregistrement…' : 'Enregistrer'}
                  </PrimaryButton>
                  <GhostButton color={t.primary} disabled={!selected.url} onClick={copyLink}>
                    {Icon.link(14)} Copier le lien
                  </GhostButton>
                </div>
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
              </footer>
            </>
          ) : (
            <div className="admin-wf-media-detail-empty">
              <EmptyState
                icon={Icon.image(28, t.muted)}
                title="Aucun média sélectionné"
                subtitle="Cliquez une photo dans la bibliothèque pour voir l’aperçu, choisir où l’afficher, et préparer la description."
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
