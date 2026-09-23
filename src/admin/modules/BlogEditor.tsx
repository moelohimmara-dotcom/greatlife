import { useMemo, useState, useRef, type CSSProperties } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { Icon } from '@/lib/icons'
import { PageHeader, EmptyState, FieldLabel, inputStyle, GhostButton, PrimaryButton } from '@/admin/ui'
import { canDo } from '@/data/rbac'
import { upsertBlogPost, deleteBlogPost, uploadMedia, type BlogPost } from '@/lib/repository'
import { resizeImageFile, isResizableImage } from '@/lib/imageResize'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { SaveBar, dateFr } from '@/admin/shared'

const BLOG_CATEGORIES = ['Actualités', 'Découverte', 'Santé', 'Recettes', 'Producteurs', 'Coulisses', 'Événements']

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

type BlogFilter = 'Tous' | 'Publié' | 'Brouillon'

function statusLabel(post: BlogPost): 'Publié' | 'Brouillon' {
  return post.published ? 'Publié' : 'Brouillon'
}

export function BlogEditor() {
  const { blogPosts, setBlogPosts, theme: t, dataSource } = useSite()
  const { user } = useAuth()
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<BlogFilter>('Tous')
  const [query, setQuery] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [coverBusy, setCoverBusy] = useState(false)
  const [coverErr, setCoverErr] = useState<string | undefined>(undefined)
  const [notice, setNotice] = useState('')
  const coverRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const inp = inputStyle(t)

  const ensureSlug = (p: BlogPost): BlogPost => ({ ...p, slug: p.slug?.trim() ? slugify(p.slug) : slugify(p.title) })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return blogPosts.filter((p) => {
      const st = statusLabel(p)
      if (filter !== 'Tous' && st !== filter) return false
      if (!q) return true
      return (
        (p.title || '').toLowerCase().includes(q)
        || (p.excerpt || '').toLowerCase().includes(q)
        || (p.category || '').toLowerCase().includes(q)
      )
    })
  }, [blogPosts, filter, query])

  const selected = (selectedId
    ? filtered.find((p) => p.id === selectedId) ?? blogPosts.find((p) => p.id === selectedId)
    : null) ?? filtered[0] ?? null

  const publishedCount = blogPosts.filter((p) => p.published).length
  const draftCount = blogPosts.length - publishedCount
  const withCover = blogPosts.filter((p) => Boolean(p.cover_url)).length
  const lastPublished = blogPosts
    .filter((p) => p.published)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0]

  const save = async () => {
    if (!editing) return
    const finalPost = ensureSlug(editing)
    setEditing(finalPost)
    setSaveStatus('saving')
    setSaveErr(undefined)
    if (dataSource === 'supabase') {
      const res = await upsertBlogPost(finalPost)
      setSaveStatus(res.ok ? 'saved' : 'error')
      setSaveErr(res.error)
      if (res.ok) {
        setBlogPosts((prev) => {
          const exists = prev.find((p) => p.id === finalPost.id)
          if (exists) return prev.map((p) => (p.id === finalPost.id ? finalPost : p))
          return [finalPost, ...prev]
        })
        if (finalPost.id) setSelectedId(finalPost.id)
        setNotice('Article enregistré.')
      }
    } else {
      setSaveStatus('saved')
      setNotice('Aperçu local enregistré.')
    }
    setTimeout(() => setSaveStatus('idle'), 4000)
  }

  const handleCover = async (file: File | undefined) => {
    if (!file || !editing) return
    if (dataSource !== 'supabase') {
      setCoverErr('Connexion requise')
      return
    }
    setCoverBusy(true)
    setCoverErr(undefined)
    try {
      let finalFile = file
      if (isResizableImage(file)) {
        const r = await resizeImageFile(file, 1200)
        finalFile = r.file
      }
      const res = await uploadMedia(finalFile, 'blog-featured')
      setCoverBusy(false)
      if (res.data) setEditing({ ...editing, cover_url: res.data.public_url })
      else {
        setCoverErr(res.error || 'Échec du téléversement')
        setTimeout(() => setCoverErr(undefined), 4000)
      }
    } catch {
      setCoverBusy(false)
      setCoverErr('Échec du traitement')
      setTimeout(() => setCoverErr(undefined), 4000)
    }
    if (coverRef.current) coverRef.current.value = ''
  }

  const removeCover = () => {
    if (editing) setEditing({ ...editing, cover_url: '' })
  }

  const insertMd = (before: string, after = '', placeholder = '') => {
    const el = bodyRef.current
    if (!el || !editing) return
    const start = el.selectionStart ?? editing.body.length
    const end = el.selectionEnd ?? editing.body.length
    const sel = editing.body.slice(start, end) || placeholder
    const next = editing.body.slice(0, start) + before + sel + after + editing.body.slice(end)
    setEditing({ ...editing, body: next })
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + before.length + sel.length + after.length
      el.setSelectionRange(pos, pos)
    })
  }

  const remove = async (post: BlogPost) => {
    if (post.id && dataSource === 'supabase') await deleteBlogPost(post.id)
    setBlogPosts((prev) => prev.filter((p) => p.id !== post.id))
    if (selectedId === post.id) setSelectedId(null)
    if (editing?.id === post.id) setEditing(null)
  }

  const startNew = () => {
    setEditing({
      title: '',
      excerpt: '',
      body: '',
      category: 'Actualités',
      published: false,
      slug: '',
      cover_url: '',
      meta_description: '',
    })
  }

  const toolBtn: CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    padding: '5px 9px',
    borderRadius: 7,
    cursor: 'pointer',
    border: '1px solid var(--admin-line)',
    background: 'var(--admin-paper-muted)',
    color: 'var(--admin-ink)',
    minWidth: 30,
  }

  if (editing) {
    return (
      <div className="admin-page-wide">
        <PageHeader
          title={editing.id ? 'Modifier l’article' : 'Nouvel article'}
          subtitle="Rédigez le contenu, puis enregistrez pour le publier ou le garder en brouillon."
          actions={(
            <>
              <SaveBar status={saveStatus} error={saveErr} />
              <GhostButton color={t.muted} onClick={() => setEditing(null)}>Retour à la liste</GhostButton>
              <PrimaryButton onClick={() => void save()}>Enregistrer</PrimaryButton>
            </>
          )}
        />
        <div className="admin-wf-panel" style={{ maxWidth: 760 }}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <FieldLabel>Image à la une</FieldLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div
                  className="admin-wf-blog-cover"
                  style={{
                    width: 140,
                    height: 84,
                    marginBottom: 0,
                    backgroundImage: editing.cover_url ? `url(${editing.cover_url})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {!editing.cover_url && <span>{coverBusy ? '…' : Icon.image(22)}</span>}
                </div>
                <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => void handleCover(e.target.files?.[0])} />
                <GhostButton color={t.primary} disabled={coverBusy} onClick={() => coverRef.current?.click()}>
                  {coverBusy ? 'Téléversement…' : 'Choisir une image'}
                </GhostButton>
                {editing.cover_url && (
                  <GhostButton color="var(--admin-coral)" onClick={removeCover}>
                    {Icon.trash(12, 'var(--admin-coral)')} Retirer
                  </GhostButton>
                )}
                {coverErr && <span className="admin-status-live is-error">{coverErr}</span>}
              </div>
            </div>
            <div>
              <FieldLabel>Titre</FieldLabel>
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} style={inp} />
            </div>
            <div className="admin-wf-menu-edit-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <FieldLabel>Slug (SEO)</FieldLabel>
                <Input
                  value={editing.slug ?? ''}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  style={inp}
                  placeholder={slugify(editing.title) || 'mon-article'}
                />
              </div>
              <div>
                <FieldLabel>Catégorie</FieldLabel>
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger style={{ ...inp, width: '100%' }}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BLOG_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <FieldLabel>Extrait</FieldLabel>
              <Textarea rows={2} value={editing.excerpt} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} style={inp} />
            </div>
            <div>
              <FieldLabel>Méta-description ({(editing.meta_description ?? '').length}/160)</FieldLabel>
              <Textarea
                rows={2}
                value={editing.meta_description ?? ''}
                maxLength={160}
                onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })}
                style={inp}
              />
            </div>
            <div>
              <FieldLabel>Contenu (Markdown)</FieldLabel>
              <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
                <button type="button" style={toolBtn} onClick={() => insertMd('**', '**', 'gras')} title="Gras">B</button>
                <button type="button" style={{ ...toolBtn, fontStyle: 'italic' }} onClick={() => insertMd('*', '*', 'italique')} title="Italique">I</button>
                <button type="button" style={toolBtn} onClick={() => insertMd('## ', '', 'Titre')} title="Titre 2">H2</button>
                <button type="button" style={toolBtn} onClick={() => insertMd('### ', '', 'Sous-titre')} title="Titre 3">H3</button>
                <button type="button" style={toolBtn} onClick={() => insertMd('> ', '', 'Citation')} title="Citation">❝</button>
                <button type="button" style={toolBtn} onClick={() => insertMd('- ', '', 'élément')} title="Liste">• Liste</button>
                <button type="button" style={toolBtn} onClick={() => insertMd('[', '](https://)', 'lien')} title="Lien">Lien</button>
              </div>
              <Textarea
                ref={bodyRef}
                rows={10}
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                style={inp}
                placeholder="Rédigez le contenu de l’article…"
              />
            </div>
            <label
              className="admin-wf-menu-sig-row"
              style={{
                opacity: canDo('blog', 'publish', user?.role ?? '') ? 1 : 0.5,
                pointerEvents: canDo('blog', 'publish', user?.role ?? '') ? 'auto' : 'none',
              }}
              title={canDo('blog', 'publish', user?.role ?? '') ? '' : 'Réservé au propriétaire et au gérant'}
            >
              <Switch checked={editing.published} onCheckedChange={(v) => setEditing({ ...editing, published: v })} />
              <span>Publier sur le site</span>
            </label>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page-wide">
      <PageHeader
        title="Blog"
        subtitle="Écrivez, organisez et publiez les histoires de Greatlife."
        badge={<span className="admin-chip is-live">{blogPosts.length} article{blogPosts.length > 1 ? 's' : ''}</span>}
        actions={(
          <PrimaryButton onClick={startNew} disabled={!canDo('blog', 'create', user?.role ?? '')}>
            {Icon.plus(14, '#fff')} Nouvel article
          </PrimaryButton>
        )}
      />

      {notice ? <div className="admin-status-live is-ok" role="status">{notice}</div> : null}

      <div className="admin-wf-site-status">
        <div>
          <p className="admin-wf-eyebrow" style={{ margin: 0 }}>Espace éditorial</p>
          <strong>{publishedCount > 0 ? 'Blog en ligne' : 'Aucun article publié'}</strong>
          <small>
            {lastPublished
              ? `Dernière publication : ${lastPublished.title || 'Sans titre'}`
              : 'Publiez un article pour le rendre visible sur le site.'}
          </small>
        </div>
        <div className="admin-wf-menu-status-actions">
          <span className="admin-chip is-live"><i />Blog en ligne</span>
          <GhostButton color={t.primary} onClick={() => window.open('/blog', '_blank', 'noopener')}>
            {Icon.eye(15)} Voir le blog
          </GhostButton>
        </div>
      </div>

      <div className="admin-wf-kpis" aria-label="Résumé du blog">
        <div>
          <strong>{publishedCount}</strong>
          <span>Articles publiés</span>
          <small>sur {blogPosts.length}</small>
        </div>
        <div>
          <strong>{draftCount}</strong>
          <span>Brouillons</span>
          <small>{draftCount > 0 ? 'à terminer' : 'aucun'}</small>
        </div>
        <div>
          <strong>0</strong>
          <span>Programmé</span>
          <small>non disponible</small>
        </div>
        <div>
          <strong>{withCover}</strong>
          <span>Avec image</span>
          <small>à la une</small>
        </div>
      </div>

      <div className="admin-wf-menu-toolbar">
        <label className="admin-wf-menu-search">
          <span aria-hidden="true">{Icon.search(15)}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un article"
            aria-label="Rechercher un article"
          />
        </label>
        <div className="admin-wf-menu-tabs" role="tablist" aria-label="Statut">
          {(['Tous', 'Publié', 'Brouillon'] as BlogFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={filter === item}
              className={filter === item ? 'is-active' : undefined}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <GhostButton color={t.muted} onClick={() => setNotice('Utilisez les onglets Publié / Brouillon pour filtrer.')}>
          {Icon.list(15)} Filtrer
        </GhostButton>
      </div>

      <div className="admin-wf-menu-layout admin-wf-blog-layout">
        <section className="admin-wf-panel" aria-label="Liste des articles">
          <div className="admin-wf-menu-list-head">
            <div>
              <p className="admin-wf-eyebrow" style={{ margin: 0 }}>Articles</p>
              <h2>{filtered.length} contenu{filtered.length > 1 ? 's' : ''}</h2>
            </div>
            <GhostButton color={t.muted} onClick={() => setNotice('Le calendrier éditorial n’est pas encore disponible.')}>
              {Icon.calendar(15)} Calendrier
            </GhostButton>
          </div>

          {filtered.map((post) => {
            const st = statusLabel(post)
            const active = selected?.id === post.id
            return (
              <button
                key={post.id ?? post.slug ?? post.title}
                type="button"
                className={`admin-wf-blog-item${active ? ' is-selected' : ''}`}
                onClick={() => setSelectedId(post.id ?? null)}
              >
                <span className={`admin-wf-menu-thumb${post.cover_url ? ' has-photo' : ''}`} aria-hidden="true">
                  {post.cover_url ? Icon.image(18) : Icon.write(18)}
                </span>
                <span className="admin-wf-menu-item-copy">
                  <strong>{post.title || 'Sans titre'}</strong>
                  <small>{post.excerpt || 'Sans extrait'}</small>
                  <em>{post.category || 'Sans catégorie'}</em>
                </span>
                <span className="admin-wf-blog-item-meta">
                  <b className={`admin-wf-blog-badge${st === 'Brouillon' ? ' is-draft' : ''}`}>{st}</b>
                  <small>{post.created_at ? dateFr(post.created_at) : '—'}</small>
                </span>
                <span className="admin-wf-menu-chevron" aria-hidden="true">{Icon.chevronRight(16)}</span>
              </button>
            )
          })}

          {filtered.length === 0 && (
            <div className="admin-wf-menu-empty">
              {Icon.search(28)}
              <strong>Aucun article trouvé</strong>
              <small>Essayez une autre recherche ou réinitialisez les filtres.</small>
            </div>
          )}
          {blogPosts.length === 0 && (
            <EmptyState icon={Icon.write(26)} title="Aucun article" subtitle="Cliquez sur « Nouvel article » pour commencer." />
          )}
        </section>

        <aside className="admin-wf-panel admin-wf-blog-detail" aria-label="Détail article">
          {!selected ? (
            <EmptyState title="Sélectionnez un article" subtitle="Choisissez un contenu dans la liste." />
          ) : (
            <>
              <div className="admin-wf-menu-preview-head">
                <div>
                  <p className="admin-wf-eyebrow" style={{ margin: 0 }}>Article sélectionné</p>
                  <h2>Résumé éditorial</h2>
                </div>
                <span className={`admin-wf-blog-badge${statusLabel(selected) === 'Brouillon' ? ' is-draft' : ''}`}>
                  {statusLabel(selected)}
                </span>
              </div>
              <div
                className="admin-wf-blog-cover"
                style={selected.cover_url ? { backgroundImage: `url(${selected.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              >
                {!selected.cover_url && Icon.image(36)}
              </div>
              <h3>{selected.title || 'Sans titre'}</h3>
              <p className="admin-wf-blog-excerpt">{selected.excerpt || 'Aucun extrait.'}</p>
              <div className="admin-wf-blog-detail-grid">
                <div><span>Catégorie</span><strong>{selected.category || '—'}</strong></div>
                <div><span>Slug</span><strong>/{selected.slug || slugify(selected.title)}</strong></div>
                <div><span>Publication</span><strong>{selected.created_at ? dateFr(selected.created_at) : '—'}</strong></div>
                <div><span>Image</span><strong>{selected.cover_url ? 'Présente' : 'Manquante'}</strong></div>
              </div>
              <div className="admin-wf-blog-checklist">
                <div>
                  <span aria-hidden="true">{selected.cover_url ? Icon.check(16, 'var(--admin-forest)') : Icon.eye(16, 'var(--admin-saffron)')}</span>
                  <span>
                    <strong>Image de couverture</strong>
                    <small>{selected.cover_url ? 'Présente' : 'À ajouter'}</small>
                  </span>
                </div>
                <div>
                  <span aria-hidden="true">{(selected.meta_description || selected.excerpt) ? Icon.check(16, 'var(--admin-forest)') : Icon.eye(16, 'var(--admin-saffron)')}</span>
                  <span>
                    <strong>SEO de base</strong>
                    <small>{selected.meta_description || selected.excerpt ? 'Titre et description renseignés' : 'Méta à compléter'}</small>
                  </span>
                </div>
              </div>
              <div className="admin-wf-menu-edit-actions">
                <GhostButton color={t.primary} onClick={() => setEditing(selected)}>
                  {Icon.write(15)} Modifier
                </GhostButton>
                <GhostButton
                  color={t.muted}
                  onClick={() => window.open(selected.published ? `/blog/${selected.slug || slugify(selected.title)}` : '/blog', '_blank', 'noopener')}
                >
                  {Icon.eye(15)} Prévisualiser
                </GhostButton>
                {canDo('blog', 'delete', user?.role ?? '') && (
                  <GhostButton color="var(--admin-coral)" onClick={() => void remove(selected)}>
                    {Icon.trash(13, 'var(--admin-coral)')} Supprimer
                  </GhostButton>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
