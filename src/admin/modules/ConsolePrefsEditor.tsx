import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, GhostButton, PrimaryButton } from '@/admin/ui'
import { Icon } from '@/lib/icons'
import { pathForModule } from '@/admin/routes'
import {
  CONSOLE_PREFS_EVENT,
  ecrireConsolePrefs,
  lireConsolePrefs,
  reinitialiserGuidesConsole,
  type ConsoleChrome,
  type ConsoleDensity,
  type ConsolePrefs,
} from '@/admin/console-prefs'
import type { AdminNavPref } from '@/admin/admin-nav'

const CHROME_OPTIONS: ReadonlyArray<{ id: ConsoleChrome; title: string; blurb: string }> = [
  { id: 'creme', title: 'Crème', blurb: 'Papier ivoire et rail sombre — charte actuelle.' },
  { id: 'foret', title: 'Forêt', blurb: 'Fond plus vert, accents forêt renforcés.' },
]

const DENSITY_OPTIONS: ReadonlyArray<{ id: ConsoleDensity; title: string; blurb: string }> = [
  { id: 'confortable', title: 'Confortable', blurb: 'Espacements larges, lecture détendue.' },
  { id: 'compacte', title: 'Compacte', blurb: 'Plus d’informations visibles à l’écran.' },
]

const NAV_OPTIONS: ReadonlyArray<{ id: AdminNavPref; title: string; blurb: string }> = [
  { id: 'open', title: 'Menu déplié', blurb: 'Libellés visibles à gauche.' },
  { id: 'rail', title: 'Rail d’icônes', blurb: 'Menu étroit — plus d’espace pour le travail.' },
]

function ChoiceCard<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: ReadonlyArray<{ id: T; title: string; blurb: string }>
  value: T
  onChange: (id: T) => void
  name: string
}) {
  return (
    <div className="admin-wf-prefs-choices" role="radiogroup" aria-label={name}>
      {options.map((opt) => {
        const active = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={`admin-wf-prefs-choice${active ? ' is-active' : ''}`}
            onClick={() => onChange(opt.id)}
          >
            <strong>{opt.title}</strong>
            <small>{opt.blurb}</small>
          </button>
        )
      })}
    </div>
  )
}

export function ConsolePrefsEditor() {
  const [prefs, setPrefs] = useState<ConsolePrefs>(() => lireConsolePrefs())
  const [guideMsg, setGuideMsg] = useState<string | null>(null)

  useEffect(() => {
    const onChange = () => setPrefs(lireConsolePrefs())
    window.addEventListener(CONSOLE_PREFS_EVENT, onChange)
    return () => window.removeEventListener(CONSOLE_PREFS_EVENT, onChange)
  }, [])

  const setChrome = (chrome: ConsoleChrome) => setPrefs(ecrireConsolePrefs({ chrome }))
  const setDensity = (density: ConsoleDensity) => setPrefs(ecrireConsolePrefs({ density }))
  const setNav = (nav: AdminNavPref) => setPrefs(ecrireConsolePrefs({ nav }))

  const resetGuides = () => {
    const n = reinitialiserGuidesConsole()
    setGuideMsg(
      n > 0
        ? 'Les guides masqués réapparaissent sur les écrans concernés (ex. Médias).'
        : 'Aucun guide masqué à restaurer pour l’instant.',
    )
  }

  return (
    <div className="admin-page-wide">
      <PageHeader
        title="Préférences de la console"
        subtitle="Apparence et confort de votre espace de travail — sans toucher au site public ni à l’identité du restaurant."
      />

      <div className="admin-wf-site-status" role="status">
        <div>
          <span className="admin-wf-eyebrow">Espace opérateur</span>
          <strong>Mémorisé sur cet appareil</strong>
          <small>Ces choix ne changent pas le thème vu par vos clients.</small>
        </div>
        <Link
          className="admin-chip is-live"
          to={pathForModule('settings')}
          style={{ textDecoration: 'none' }}
        >
          Réglages du restaurant
        </Link>
      </div>

      <div className="admin-wf-prefs-grid">
        <section className="admin-wf-panel admin-wf-settings-card">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Chrome</span>
              <h2 style={{ margin: '4px 0 0' }}>Ambiance de la console</h2>
            </div>
          </div>
          <p className="admin-wf-prefs-help">
            Couleurs du menu et du fond de travail uniquement. Pour le site public, ouvrez{' '}
            <Link to={pathForModule('theme')}>Thème &amp; ambiance</Link>.
          </p>
          <ChoiceCard
            name="Ambiance de la console"
            options={CHROME_OPTIONS}
            value={prefs.chrome}
            onChange={setChrome}
          />
        </section>

        <section className="admin-wf-panel admin-wf-settings-card">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Lecture</span>
              <h2 style={{ margin: '4px 0 0' }}>Densité d’affichage</h2>
            </div>
          </div>
          <p className="admin-wf-prefs-help">Ajuste les marges des panneaux de la console.</p>
          <ChoiceCard
            name="Densité d’affichage"
            options={DENSITY_OPTIONS}
            value={prefs.density}
            onChange={setDensity}
          />
        </section>

        <section className="admin-wf-panel admin-wf-settings-card">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Navigation</span>
              <h2 style={{ margin: '4px 0 0' }}>Menu latéral</h2>
            </div>
          </div>
          <p className="admin-wf-prefs-help">
            Même réglage que le bouton « Replier / Déplier le menu » — centralisé ici.
          </p>
          <ChoiceCard
            name="Menu latéral"
            options={NAV_OPTIONS}
            value={prefs.nav}
            onChange={setNav}
          />
        </section>

        <section className="admin-wf-panel admin-wf-settings-card">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Guides</span>
              <h2 style={{ margin: '4px 0 0' }}>Astuces d’écran</h2>
            </div>
          </div>
          <p className="admin-wf-prefs-help">
            Si vous avez fermé un bandeau « Comment ça marche », vous pouvez le faire réapparaître.
          </p>
          <div className="admin-wf-prefs-actions">
            <PrimaryButton onClick={resetGuides}>
              {Icon.eye(15)} Réafficher les guides
            </PrimaryButton>
            <GhostButton color="var(--admin-ink)" onClick={() => setGuideMsg(null)}>
              Effacer le message
            </GhostButton>
          </div>
          {guideMsg && (
            <p className="admin-wf-prefs-status" role="status" aria-live="polite">
              {guideMsg}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}