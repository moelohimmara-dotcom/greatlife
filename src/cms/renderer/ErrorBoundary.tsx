/**
 * Greatlife — CMS : garde-fou contre les erreurs de rendu
 * =======================================================
 * Sans cette garde, un composant de section qui plante (donnée malformée,
 * composant tiers, valeur d'icône non résolue malgré le garde `iconByName`)
 * ferait planter TOUTE la page — le site public entier deviendrait blanc.
 *
 * Ce garde-fou intercepte les erreurs au niveau de CHAQUE section, affiche un
 * rendu de repli minimal (la section cassée ne disparaît pas silencieusement),
 * et laisse le reste du site intact.
 *
 * TDR §41 : non-régression — une section qui plante ne doit pas dégrader les
 * autres sections du même rendu.
 *
 * Placé ici (renderer) et non dans les composants individuels : c'est un
 * garde-fou transversal, applicable une seule fois au point d'assemblage.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  /** Type de la section, pour le message de repli. */
  sectionType: string
  /** Label lisible de la section, pour le message de repli. */
  sectionLabel?: string
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class SectionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Les erreurs de rendu sont des erreurs applicatives, pas des erreurs
    // système : on les journalise en console pour le diagnostic (debug),
    // mais on ne les propage pas — le site doit rester navigable.
    console.error(
      `[CMS] Erreur dans la section « ${this.props.sectionType} » :`,
      error.message,
      info.componentStack,
    )
  }

  render() {
    if (this.state.hasError) {
      const label = this.props.sectionLabel ?? this.props.sectionType
      return (
        <div
          data-cms-section={this.props.sectionType}
          data-cms-error="true"
          style={{
            padding: '40px 24px',
            maxWidth: 800,
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              padding: '24px 32px',
              borderRadius: 14,
              background: 'rgba(220,38,38,0.06)',
              border: '1px solid rgba(220,38,38,0.15)',
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 600, color: '#b91c1c', margin: '0 0 8px' }}>
              Le bloc « {label} » ne s'affiche pas correctement.
            </p>
            <p style={{ fontSize: 13, color: '#991b1b', margin: 0, lineHeight: 1.5 }}>
              Le reste du site fonctionne normalement. Réessayez plus tard ou contactez le support.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
