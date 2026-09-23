import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import { PageHeader, PrimaryButton, GhostButton } from '@/admin/ui'
import { SaveBar } from '@/admin/shared'
import { pathForModule } from '@/admin/routes'

/**
 * Visibilité — réglages d’affichage « live » (docs/21 §5 : chemin direct).
 *
 * Deux vérités coexistent (audit A10 / docs/21 §6) :
 * 1. Cet écran → `site_config.visibility` (extras carte + secours chemin historique).
 * 2. Atelier → masquage d’un bloc (`page_sections.visible`) puis « Mettre à jour le site ».
 *
 * Sur le site publié CMS, les interrupteurs « Pages » ci-dessous NE pilotent plus
 * le rendu : seuls l’œil dans l’Atelier + la publication décident. On le dit
 * clairement au restaurateur (lot J3) sans brancher Visibilité → page_sections
 * (porte docs/21 §6 — touche le public).
 */

const EXTRA_ROWS: ReadonlyArray<{
  key: 'vertusPanel' | 'suggestions' | 'testimonials' | 'badges'
  label: string
  help: string
  appliesTo: string
}> = [
  {
    key: 'vertusPanel',
    label: 'Panneau « Vertus »',
    help: 'Détails nutritionnels dépliables sous chaque plat',
    appliesTo: 'Carte publique',
  },
  {
    key: 'suggestions',
    label: 'Suggestions du moment',
    help: 'Catégorie mise en avant sur la carte',
    appliesTo: 'Carte publique',
  },
  {
    key: 'badges',
    label: 'Badges régime & allergènes',
    help: 'Pastilles omni, gluten, vegan… sur les plats',
    appliesTo: 'Carte publique',
  },
  {
    key: 'testimonials',
    label: 'Témoignages (réglage legacy)',
    help: 'N’affiche les avis que sur le chemin historique ; sur le site CMS, ajoutez un bloc Témoignages dans Modifier le site',
    appliesTo: 'Secours historique',
  },
]

const LEGACY_PAGE_ROWS: ReadonlyArray<{ key: string; label: string; help: string }> = [
  { key: 'home', label: 'Accueil', help: 'Bannière / entrée' },
  { key: 'carte', label: 'La carte', help: 'Plats et prix' },
  { key: 'histoire', label: 'Notre histoire', help: 'Section récit' },
  { key: 'engagements', label: 'Engagements', help: 'Valeurs' },
  { key: 'equipe', label: 'Équipe', help: 'Membres présentés' },
  { key: 'localisation', label: 'Localisation', help: 'Adresse' },
  { key: 'contact', label: 'Contact', help: 'Formulaire' },
  { key: 'blog', label: 'Blog', help: 'Articles' },
]

function VisibilityGuide({ onClose }: { onClose: () => void }) {
  return (
    <section className="admin-wf-media-guide" id="visibility-guide" aria-label="Comment ça marche">
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
          <strong>Éléments de la carte</strong>
          {' '}(Vertus, suggestions, badges) : basculez ici, puis{' '}
          <strong>Enregistrer</strong>
          {' '}— effet immédiat pour les visiteurs, sans republier la page.
        </li>
        <li>
          <strong>Montrer ou cacher un bloc de page</strong>
          {' '}(Histoire, Équipe, Contact…) : ouvrez{' '}
          <Link to={pathForModule('content')}>Modifier le site</Link>
          , utilisez l’œil sur le bloc, puis{' '}
          <strong>Mettre à jour le site</strong>.
        </li>
        <li>
          <strong>Liens du menu</strong>
          {' '}(en-tête / pied) : Atelier → En-tête ou Pied, puis publication. Ce n’est pas cet écran.
        </li>
        <li>
          Les interrupteurs « Secours historique » ne servent que si le site n’est pas encore
          piloté par l’Atelier — sur le site publié actuel, ils ne retirent pas un bloc.
        </li>
      </ol>
    </section>
  )
}

export function VisibilityEditor() {
  const { visibility, setVisibility, theme: t, dataSource, saveApparenceFields, content } = useSite()
  const navigate = useNavigate()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [legacyOpen, setLegacyOpen] = useState(false)

  const toggleExtra = (k: (typeof EXTRA_ROWS)[number]['key']) => {
    setVisibility({ ...visibility, [k]: !visibility[k] })
    setPending(true)
    setSaveStatus('idle')
    setSaveErr(undefined)
  }

  const toggleLegacy = (k: string) => {
    setVisibility({ ...visibility, sections: { ...visibility.sections, [k]: !visibility.sections[k] } })
    setPending(true)
    setSaveStatus('idle')
    setSaveErr(undefined)
  }

  const save = async () => {
    if (dataSource !== 'supabase') {
      setSaveStatus('saved')
      setPending(false)
      setNotice('Aperçu local — connectez-vous pour synchroniser.')
      setTimeout(() => setSaveStatus('idle'), 2000)
      return
    }
    setSaveStatus('saving')
    setSaveErr(undefined)
    const res = await saveApparenceFields({ visibility })
    setSaveStatus(res.ok ? 'saved' : 'error')
    setSaveErr(res.error)
    if (res.ok) {
      setPending(false)
      setNotice('Visibilité enregistrée — les éléments de carte s’appliquent tout de suite.')
    }
    setTimeout(() => setSaveStatus('idle'), 4000)
  }

  const extrasOn = EXTRA_ROWS.filter((r) => visibility[r.key]).length
  const essentialsOk = Boolean(content.restaurantName?.trim() && content.phone?.trim() && content.address?.trim())
  const syncLabel = dataSource === 'supabase' ? 'Enregistré en direct' : 'Aperçu local'

  const checks: ReadonlyArray<{ ok: boolean; label: string; hint: string }> = [
    {
      ok: Boolean(visibility.sections.carte) && Boolean(visibility.suggestions || visibility.badges || visibility.vertusPanel),
      label: 'La carte a des options d’affichage actives',
      hint: extrasOn > 0 ? 'Vertus / badges / suggestions configurés' : 'Activez au moins un élément ci-dessus',
    },
    {
      ok: essentialsOk,
      label: 'Coordonnées essentielles renseignées',
      hint: essentialsOk ? 'Nom, téléphone, adresse OK' : 'Complétez dans Réglages du restaurant',
    },
    {
      ok: true,
      label: 'Blocs de page = Modifier le site',
      hint: 'Masquer Histoire / Contact… se fait dans l’Atelier, pas ici',
    },
  ]

  return (
    <div className="admin-page-wide">
      <PageHeader
        title="Visibilité"
        subtitle="Ce qui s’affiche sur la carte tout de suite — pour cacher un bloc de page, utilisez Modifier le site."
        actions={(
          <>
            <GhostButton
              color={t.primary}
              aria-expanded={guideOpen}
              aria-controls="visibility-guide"
              onClick={() => setGuideOpen((v) => !v)}
            >
              {Icon.eye(15)} Comment ça marche
            </GhostButton>
            <SaveBar status={saveStatus} error={saveErr} />
            <PrimaryButton onClick={() => void save()} disabled={saveStatus === 'saving'}>
              {pending ? 'Enregistrer les changements' : 'Enregistrer'}
            </PrimaryButton>
          </>
        )}
      />

      {guideOpen && <VisibilityGuide onClose={() => setGuideOpen(false)} />}

      {notice ? <div className="admin-status-live is-ok" role="status">{notice}</div> : null}

      <div className="admin-wf-site-status" aria-label="Statut de la visibilité">
        <div>
          <p className="admin-wf-eyebrow" style={{ margin: 0 }}>Réglages d’affichage</p>
          <strong>{syncLabel}</strong>
          <small>
            {extrasOn} élément{extrasOn > 1 ? 's' : ''} de carte actif{extrasOn > 1 ? 's' : ''}
            {content.restaurantName ? ` · ${content.restaurantName}` : ''}
            {pending ? ' · Modifications non enregistrées' : ''}
          </small>
        </div>
        <span className="admin-chip is-live"><i />Effet immédiat</span>
      </div>

      <div className="admin-hint-box" style={{ marginBottom: 16 }}>
        <strong>Deux endroits, deux rôles.</strong>
        {' '}
        Ici : options de la carte (enregistrées tout de suite).
        {' '}
        Pour retirer un bloc entier du site public :{' '}
        <Link to={pathForModule('content')} style={{ color: 'var(--admin-forest)', fontWeight: 600 }}>
          Modifier le site
        </Link>
        {' '}→ œil sur le bloc → <strong>Mettre à jour le site</strong>.
        {' '}
        Liens du menu : Atelier → En-tête / Pied.
      </div>

      <div className="admin-wf-visibility-grid">
        <section className="admin-wf-panel">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Carte</span>
              <h2>Éléments de contenu</h2>
            </div>
            <span className="admin-chip">{extrasOn}/{EXTRA_ROWS.length}</span>
          </div>
          <div className="admin-wf-page-visibility-list">
            {EXTRA_ROWS.map((row) => {
              const on = Boolean(visibility[row.key])
              return (
                <div className="admin-wf-page-visibility-item" key={row.key}>
                  <div>
                    <strong>{row.label}</strong>
                    <small>
                      {on ? 'Visible' : 'Masqué'}
                      {' · '}
                      {row.appliesTo}
                      {' · '}
                      {row.help}
                    </small>
                  </div>
                  <label className="admin-wf-switch">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleExtra(row.key)}
                      aria-label={`${row.label} — ${on ? 'visible' : 'masqué'}`}
                    />
                    <span />
                  </label>
                </div>
              )
            })}
          </div>
        </section>

        <section className="admin-wf-panel">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Contrôle</span>
              <h2>Avant d’enregistrer</h2>
            </div>
          </div>
          <div className="admin-wf-publish-checks">
            {checks.map((c) => (
              <div key={c.label}>
                <span aria-hidden="true" style={{ color: c.ok ? 'var(--admin-forest)' : 'var(--admin-saffron)' }}>
                  {c.ok ? Icon.check(17) : Icon.eye(17)}
                </span>
                <span>
                  {c.label}
                  <small style={{ display: 'block', opacity: 0.75 }}>{c.hint}</small>
                </span>
                {c.label.includes('Modifier le site') ? (
                  <Link to={pathForModule('content')} className="admin-chip" style={{ textDecoration: 'none' }}>
                    Ouvrir
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setNotice(c.ok ? `${c.label} — OK` : `À corriger : ${c.hint}`)}
                  >
                    {c.ok ? 'Voir' : 'Corriger'}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="admin-hint-box" style={{ marginTop: 14 }}>
            « Enregistrer » applique les options de carte immédiatement (pas de brouillon).
            {pending ? ' Des modifications attendent d’être enregistrées.' : ''}
          </div>
        </section>
      </div>

      <div className="admin-wf-visibility-grid" style={{ marginTop: 16 }}>
        <section className="admin-wf-panel">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Blocs de page</span>
              <h2>Montrer ou cacher une section</h2>
            </div>
          </div>
          <div className="admin-wf-schedule-card">
            {Icon.write(26, 'var(--admin-forest)')}
            <div>
              <strong>Dans Modifier le site</strong>
              <small>
                Chaque bloc a un œil (visible / masqué). Après changement : prévisualisez, puis
                « Mettre à jour le site ». C’est la commande unique pour le site publié.
              </small>
            </div>
            <PrimaryButton type="button" onClick={() => navigate(pathForModule('content'))}>
              Ouvrir l’Atelier
            </PrimaryButton>
          </div>
        </section>

        <section className="admin-wf-panel">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Programmation</span>
              <h2>Publication planifiée</h2>
            </div>
          </div>
          <div className="admin-wf-schedule-card">
            {Icon.calendar(26, 'var(--admin-forest)')}
            <div>
              <strong>Pas encore disponible</strong>
              <small>
                Pas de date de mise en ligne automatique ici. Les options carte s’enregistrent
                tout de suite ; les blocs de page suivent le flux de l’Atelier.
              </small>
            </div>
          </div>
        </section>
      </div>

      <section className="admin-wf-panel" style={{ marginTop: 16 }}>
        <div className="admin-wf-panel-head">
          <div>
            <span className="admin-wf-eyebrow">Secours</span>
            <h2>Chemin historique (rare)</h2>
          </div>
          <GhostButton color={t.muted} onClick={() => setLegacyOpen((v) => !v)} aria-expanded={legacyOpen}>
            {legacyOpen ? 'Masquer' : 'Afficher'}
          </GhostButton>
        </div>
        {!legacyOpen ? (
          <p style={{ margin: '0 0 4px', fontSize: 13, opacity: 0.8 }}>
            Ces interrupteurs ne retirent pas un bloc du site publié actuel (piloté par l’Atelier).
            Conservés pour un site encore en mode historique.
          </p>
        ) : (
          <>
            <div className="admin-hint-box" style={{ marginBottom: 12 }}>
              Sur le site CMS publié, masquer « Histoire » ici <strong>ne change rien</strong> pour
              les visiteurs. Préférez l’œil dans l’Atelier.
            </div>
            <div className="admin-wf-page-visibility-list">
              {LEGACY_PAGE_ROWS.map((row) => {
                const on = Boolean(visibility.sections[row.key])
                return (
                  <div className="admin-wf-page-visibility-item" key={row.key}>
                    <div>
                      <strong>{row.label}</strong>
                      <small>
                        {on ? 'On (historique)' : 'Off (historique)'}
                        {' · '}
                        {row.help}
                      </small>
                    </div>
                    <label className="admin-wf-switch">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleLegacy(row.key)}
                        aria-label={`${row.label} — secours historique, ${on ? 'visible' : 'masquée'}`}
                      />
                      <span />
                    </label>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
