import { useState, useRef, type CSSProperties } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Icon } from '@/lib/icons'
import { PageHeader, EmptyState, FieldLabel, inputStyle, GhostButton, PrimaryButton } from '@/admin/ui'
import { canDo } from '@/data/rbac'
import { upsertBlogPost, deleteBlogPost, uploadMedia, type BlogPost } from '@/lib/repository'
import { resizeImageFile, isResizableImage } from '@/lib/imageResize'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { SaveBar } from '@/admin/shared'

const BLOG_CATEGORIES = ['Actualités', 'Découverte', 'Santé', 'Recettes', 'Producteurs', 'Coulisses', 'Événements']

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function BlogEditor() {
  const { blogPosts, setBlogPosts, theme: t, dataSource } = useSite()
  const { user } = useAuth()
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [coverBusy, setCoverBusy] = useState(false)
  const [coverErr, setCoverErr] = useState<string | undefined>(undefined)
  const coverRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const inp = inputStyle(t)

  const ensureSlug = (p: BlogPost): BlogPost => ({ ...p, slug: p.slug?.trim() ? slugify(p.slug) : slugify(p.title) })

  const save = async () => {
    if (!editing) return
    const finalPost = ensureSlug(editing)
    setEditing(finalPost)
    setSaveStatus('saving'); setSaveErr(undefined)
    if (dataSource === 'supabase') {
      const res = await upsertBlogPost(finalPost)
      setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
      if (res.ok) {
        setBlogPosts(prev => {
          const exists = prev.find(p => p.id === finalPost.id)
          if (exists) return prev.map(p => p.id === finalPost.id ? finalPost : p)
          return [finalPost, ...prev]
        })
      }
    } else {
      setSaveStatus('saved')
    }
    setTimeout(() => setSaveStatus('idle'), 4000)
  }

  const handleCover = async (file: File | undefined) => {
    if (!file || !editing) return
    if (dataSource !== 'supabase') { setCoverErr('Connexion Supabase requise'); return }
    setCoverBusy(true); setCoverErr(undefined)
    try {
      let finalFile = file
      if (isResizableImage(file)) {
        const r = await resizeImageFile(file, 1200)
        finalFile = r.file
      }
      const res = await uploadMedia(finalFile, 'blog-featured')
      setCoverBusy(false)
      if (res.data) {
        setEditing({ ...editing, cover_url: res.data.public_url })
      } else {
        setCoverErr(res.error || 'Échec du téléversement'); setTimeout(() => setCoverErr(undefined), 4000)
      }
    } catch {
      setCoverBusy(false); setCoverErr('Échec du traitement'); setTimeout(() => setCoverErr(undefined), 4000)
    }
    if (coverRef.current) coverRef.current.value = ''
  }

  const removeCover = () => { if (editing) setEditing({ ...editing, cover_url: '' }) }

  const insertMd = (before: string, after = '', placeholder = '') => {
    const el = bodyRef.current
    if (!el || !editing) return
    const start = el.selectionStart ?? editing.body.length
    const end = el.selectionEnd ?? editing.body.length
    const sel = editing.body.slice(start, end) || placeholder
    const next = editing.body.slice(0, start) + before + sel + after + editing.body.slice(end)
    setEditing({ ...editing, body: next })
    requestAnimationFrame(() => { el.focus(); const pos = start + before.length + sel.length + after.length; el.setSelectionRange(pos, pos) })
  }

  const remove = async (post: BlogPost) => {
    if (post.id && dataSource === 'supabase') deleteBlogPost(post.id)
    setBlogPosts(prev => prev.filter(p => p.id !== post.id))
  }

  const toolBtn: CSSProperties = { fontSize: 12, fontWeight: 600, padding: '5px 9px', borderRadius: 7, cursor: 'pointer', border: `1px solid ${t.shadow}`, background: t.surfaceAlt, color: t.heading, minWidth: 30 }
  const publishedCount = blogPosts.filter(p => p.published).length
  const draftCount = blogPosts.length - publishedCount
  const categoriesUsed = new Set(blogPosts.map(p => p.category).filter(Boolean)).size
  const withCover = blogPosts.filter(p => Boolean(p.cover_url)).length
  const lastPublished = blogPosts.filter(p => p.published).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0]

  return (
    <div className="admin-page" style={{ maxWidth: 960 }}>
      <PageHeader title="Blog" subtitle="Écrivez, organisez et publiez les histoires de Greatlife."
        actions={<PrimaryButton onClick={() => setEditing({ title: '', excerpt: '', body: '', category: 'Actualités', published: false, slug: '', cover_url: '', meta_description: '' })} disabled={!canDo('blog', 'create', user?.role ?? '')}>{Icon.plus(14, '#fff')} Nouvel article</PrimaryButton>}
      />
      <div className="admin-wf-site-status" role="status">
        <div>
          <span className="admin-wf-eyebrow">ESPACE ÉDITORIAL</span>
          <strong>{publishedCount > 0 ? 'Blog en ligne' : 'Aucun article publié'}</strong>
          <small>
            {lastPublished
              ? `Dernière publication : ${lastPublished.title || 'Sans titre'}`
              : 'Publiez un article pour le rendre visible sur le site.'}
          </small>
        </div>
        <a className="admin-chip is-live" href="/blog" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          Voir le blog
        </a>
      </div>
      <div className="admin-wf-kpis" aria-label="Résumé du blog">
        <div>
          <strong>{publishedCount}</strong>
          <span>Articles publiés</span>
          <small>sur {blogPosts.length} au total</small>
        </div>
        <div>
          <strong>{draftCount}</strong>
          <span>Brouillons</span>
          <small>{draftCount > 0 ? 'à terminer' : 'aucun en attente'}</small>
        </div>
        <div>
          <strong>{categoriesUsed}</strong>
          <span>Catégories</span>
          <small>utilisées</small>
        </div>
        <div>
          <strong>{withCover}</strong>
          <span>Avec image</span>
          <small>à la une</small>
        </div>
      </div>
      <div className="admin-status-live" role="status" aria-live="polite">
        {saveStatus === 'saving' ? 'Enregistrement…' : saveStatus === 'saved' ? 'Article enregistré' : saveStatus === 'error' ? (saveErr || 'Échec') : ''}
      </div>
      {editing && (
        <OrganicCard style={{ marginTop: 20, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '18px', fontWeight: 700, margin: 0 }}>{editing.id ? 'Modifier l\'article' : 'Nouvel article'}</h3>
            <button onClick={() => setEditing(null)} style={{ fontSize: '13px', fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{Icon.x(14, t.muted)} Fermer</button>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><FieldLabel>Image à la une</FieldLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ width: 120, height: 72, borderRadius: 10, overflow: 'hidden', background: t.surfaceAlt, border: `1px solid ${t.shadow}`, flexShrink: 0, backgroundImage: editing.cover_url ? `url(${editing.cover_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!editing.cover_url && <span style={{ fontSize: 11, color: t.muted }}>{coverBusy ? '…' : 'Aucune'}</span>}
                </div>
                <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleCover(e.target.files?.[0])} />
                <button onClick={() => coverRef.current?.click()} disabled={coverBusy} style={{ fontSize: '12px', fontWeight: 600, padding: '8px 14px', borderRadius: 10, cursor: coverBusy ? 'wait' : 'pointer', border: `1px solid ${t.primary}44`, background: 'transparent', color: t.primary }}>{coverBusy ? 'Téléversement…' : 'Choisir une image'}</button>
                {editing.cover_url && <GhostButton color="#dc2626" onClick={removeCover}>{Icon.trash(12, '#dc2626')} Retirer</GhostButton>}
                {coverErr && <span style={{ fontSize: '11px', color: t.accent, fontWeight: 600 }}>✗ {coverErr}</span>}
              </div>
            </div>
            <div><FieldLabel>Titre</FieldLabel><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} style={inp} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <FieldLabel>Slug (SEO) <span style={{ fontWeight: 400, color: t.muted }}>(auto si vide)</span></FieldLabel>
                <Input value={editing.slug ?? ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} style={inp} placeholder={slugify(editing.title) || 'mon-article'} />
              </div>
              <div>
                <FieldLabel>Catégorie</FieldLabel>
                <Select value={editing.category} onValueChange={v => setEditing({ ...editing, category: v })}>
                  <SelectTrigger style={{ ...inp, width: '100%' }}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BLOG_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><FieldLabel>Extrait</FieldLabel><Textarea rows={2} value={editing.excerpt} onChange={e => setEditing({ ...editing, excerpt: e.target.value })} style={inp} /></div>
            <div>
              <FieldLabel>Méta-description (SEO) <span style={{ fontWeight: 400, color: t.muted }}>{(editing.meta_description ?? '').length}/160</span></FieldLabel>
              <Textarea rows={2} value={editing.meta_description ?? ''} maxLength={160} onChange={e => setEditing({ ...editing, meta_description: e.target.value })} style={inp} placeholder="Description affichée dans les moteurs de recherche…" />
            </div>
            <div>
              <FieldLabel>Contenu (Markdown)</FieldLabel>
              <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
                <button style={toolBtn} onClick={() => insertMd('**', '**', 'gras')} title="Gras">B</button>
                <button style={{ ...toolBtn, fontStyle: 'italic' }} onClick={() => insertMd('*', '*', 'italique')} title="Italique">I</button>
                <button style={toolBtn} onClick={() => insertMd('## ', '', 'Titre')} title="Titre 2">H2</button>
                <button style={toolBtn} onClick={() => insertMd('### ', '', 'Sous-titre')} title="Titre 3">H3</button>
                <button style={toolBtn} onClick={() => insertMd('> ', '', 'Citation')} title="Citation">❝</button>
                <button style={toolBtn} onClick={() => insertMd('- ', '', 'élément')} title="Liste à puces">• Liste</button>
                <button style={toolBtn} onClick={() => insertMd('[', '](https://)', 'lien')} title="Lien">🔗</button>
              </div>
              <Textarea ref={bodyRef} rows={8} value={editing.body} onChange={e => setEditing({ ...editing, body: e.target.value })} style={{ ...inp, fontFamily: 'var(--f-body)' }} placeholder="Rédigez le contenu de l'article en Markdown…" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', fontWeight: 500, color: t.text, opacity: canDo('blog', 'publish', user?.role ?? '') ? 1 : 0.5, pointerEvents: canDo('blog', 'publish', user?.role ?? '') ? 'auto' : 'none' }} title={canDo('blog', 'publish', user?.role ?? '') ? '' : 'Réservé au propriétaire et au gérant'}>
              <Switch checked={editing.published} onCheckedChange={v => setEditing({ ...editing, published: v })} /> Publier sur le site
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <PrimaryButton onClick={save}>Enregistrer</PrimaryButton>
              <SaveBar status={saveStatus} error={saveErr} />
            </div>
          </div>
        </OrganicCard>
      )}
      <div style={{ marginTop: 24 }}>
        {blogPosts.length === 0 && <EmptyState icon={Icon.write(26, t.muted)} title="Aucun article" subtitle="Cliquez sur « Nouvel article » pour commencer." />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {blogPosts.map(post => (
            <OrganicCard key={post.id} style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ height: 120, background: post.cover_url ? `url(${post.cover_url}) center/cover` : `linear-gradient(135deg, ${t.primary}18, ${t.gold}12)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {!post.cover_url && <span style={{ opacity: 0.5 }}>{Icon.image(28, t.muted)}</span>}
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: t.muted, background: t.surfaceAlt, padding: '3px 9px', borderRadius: 100 }}>{post.category}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: post.published ? `${t.primary}15` : t.surfaceAlt, color: post.published ? t.primary : t.muted }}>{post.published ? 'Publié' : 'Brouillon'}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: t.heading, lineHeight: 1.3 }}>{post.title || 'Sans titre'}</div>
                <div style={{ fontSize: '12px', color: t.muted, fontFamily: 'var(--f-body)' }}>/{post.slug || slugify(post.title)}</div>
                <div style={{ fontSize: '13px', color: t.muted, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.excerpt || 'Aucun extrait'}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <GhostButton color={t.primary} onClick={() => setEditing(post)}>Modifier</GhostButton>
                  {canDo('blog', 'delete', user?.role ?? '') && <GhostButton color="#dc2626" onClick={() => remove(post)}>{Icon.trash(12, '#dc2626')} Supprimer</GhostButton>}
                </div>
              </div>
            </OrganicCard>
          ))}
        </div>
      </div>
    </div>
  )
}

