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
  type ConsoleAccent,
  type ConsoleChrome,
  type ConsoleDensity,
  type ConsolePrefs,
  type ConsoleTheme,
} from '@/admin/console-prefs'
import type { AdminNavPref } from '@/admin/admin-nav'

const THEME_OPTIONS: ReadonlyArray<{ id: ConsoleTheme; title: string; blurb: string }> = [
  { id: 'clair', title: 'Mode clair', blurb: 'Papier crème — lecture de jour.' },
  { id: 'nuit', title: 'Mode nuit', blurb: 'Fond sombre type rail — confort le soir.' },
]

const CHROME_OPTIONS: ReadonlyArray<{ id: ConsoleChrome; title: string; blurb: string }> = [
  { id: 'creme', title: 'Crème', blurb: 'Ivoire doux — charte actuelle.' },
  { id: 'foret', title: 'Forêt', blurb: 'Teinte verte un peu plus marquée.' },
]

const ACCENT_OPTIONS: ReadonlyArray<{ id: ConsoleAccent; title: string; blurb: string }> = [
  { id: 'foret', title: 'Forêt', blurb: 'Vert — actions et liens.' },
  { id: 'corail', title: 'Corail', blurb: 'Rouge chaud — plus visible.' },
  { id: 'safran', title: 'Safran', blurb: 'Ambre — accent plus doux.' },
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

function ToggleRow({
  id,
  title,
  blurb,
  checked,
  onChange,
}: {
  id: string
  title: string
  blurb: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="admin-wf-prefs-toggle" htmlFor={id}>
      <span className="admin-wf-prefs-toggle-copy">
        <strong>{title}</strong>
        <small>{blurb}</small>
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
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

  const patch = (p: Partial<ConsolePrefs>) => setPrefs(ecrireConsolePrefs(p))

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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link
            className="admin-chip is-live"
            to={pathForModule('account')}
            style={{ textDecoration: 'none' }}
            title="Changer l’email ou le mot de passe"
          >
            Mon compte · mot de passe
          </Link>
          <Link
            className="admin-chip is-live"
            to={pathForModule('settings')}
            style={{ textDecoration: 'none' }}
          >
            Réglages du restaurant
          </Link>
        </div>
      </div>

      <div className="admin-wf-prefs-grid">
        <section className="admin-wf-panel admin-wf-settings-card admin-wf-prefs-span">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Affichage</span>
              <h2 style={{ margin: '4px 0 0' }}>Mode clair ou nuit</h2>
            </div>
          </div>
          <p className="admin-wf-prefs-help">
            S’applique tout de suite au menu et aux pages de la console. Le site public garde son
            propre thème (<Link to={pathForModule('theme')}>Thème &amp; ambiance</Link>).
          </p>
          <ChoiceCard
            name="Mode clair ou nuit"
            options={THEME_OPTIONS}
            value={prefs.theme}
            onChange={(theme) => patch({ theme })}
          />
        </section>

        <section className="admin-wf-panel admin-wf-settings-card">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Chrome</span>
              <h2 style={{ margin: '4px 0 0' }}>Ambiance (mode clair)</h2>
            </div>
          </div>
          <p className="admin-wf-prefs-help">
            Nuance du fond de travail en mode clair. En mode nuit, le fond reste sombre.
          </p>
          <ChoiceCard
            name="Ambiance de la console"
            options={CHROME_OPTIONS}
            value={prefs.chrome}
            onChange={(chrome) => patch({ chrome })}
          />
        </section>

        <section className="admin-wf-panel admin-wf-settings-card">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Couleur</span>
              <h2 style={{ margin: '4px 0 0' }}>Accent des actions</h2>
            </div>
          </div>
          <p className="admin-wf-prefs-help">Boutons actifs, liens et pastilles de la console.</p>
          <ChoiceCard
            name="Accent des actions"
            options={ACCENT_OPTIONS}
            value={prefs.accent}
            onChange={(accent) => patch({ accent })}
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
            onChange={(density) => patch({ density })}
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
            Même réglage que « Replier / Déplier le menu ». Astuce : le rail d’icônes laisse plus
            de place pour éditer les pages.
          </p>
          <ChoiceCard
            name="Menu latéral"
            options={NAV_OPTIONS}
            value={prefs.nav}
            onChange={(nav) => patch({ nav })}
          />
        </section>

        <section className="admin-wf-panel admin-wf-settings-card">
          <div className="admin-wf-panel-head">
            <div>
              <span className="admin-wf-eyebrow">Confort</span>
              <h2 style={{ margin: '4px 0 0' }}>Compteurs et mouvement</h2>
            </div>
          </div>
          <p className="admin-wf-prefs-help">
            Affinez l’interface sans changer le contenu du restaurant.
          </p>
          <div className="admin-wf-prefs-toggles">
            <ToggleRow
              id="prefs-show-badges"
              title="Pastilles compteurs"
              blurb="Nombres sur Messages, Commandes et Réservations dans le menu."
              checked={prefs.showBadges}
              onChange={(showBadges) => patch({ showBadges })}
            />
            <ToggleRow
              id="prefs-reduce-motion"
              title="Réduire les animations"
              blurb="Moins de transitions — utile si le mouvement fatigue."
              checked={prefs.reduceMotion}
              onChange={(reduceMotion) => patch({ reduceMotion })}
            />
          </div>
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
