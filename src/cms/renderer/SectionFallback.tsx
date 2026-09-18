/**
 * Greatlife — CMS : rendu générique de secours
 * =============================================
 * Utilisé tant qu'un type de section n'a pas de composant dédié branché sur
 * les données (voir `registry.ts`).
 *
 * Deux situations distinctes, deux comportements (§5.5 de l'architecture) :
 *
 *   - type CONNU mais pas encore implémenté → rendu générique lisible
 *     (titre + sous-titre), pour que la page ne soit jamais vide ;
 *   - type INCONNU du catalogue          → rien en public (la page reste
 *     propre), un signalement discret en prévisualisation.
 *
 * Aucun cas ne doit produire d'erreur bloquante : une section cassée ne doit
 * jamais empêcher le reste du site de s'afficher.
 */

import type { CSSProperties } from 'react'
import type { ResolvedRestaurant } from '../repository/settings'
import { getSectionDefinition } from '../model/sections/schemas'

export interface SectionFallbackProps {
  type: string
  content: Record<string, unknown>
  variant: string | null
  restaurant: ResolvedRestaurant
  /** `true` en prévisualisation d'administration : affiche les signalements. */
  preview?: boolean
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function SectionFallback({
  type,
  content,
  variant,
  restaurant,
  preview = false,
}: SectionFallbackProps) {
  const definition = getSectionDefinition(type)

  // Type inconnu du catalogue : jamais montré au public.
  if (!definition) {
    return preview ? (
      <div style={noticeStyle()} data-cms-notice="unknown-type">
        Bloc « {type} » inconnu — il n’est pas affiché sur le site public.
      </div>
    ) : null
  }

  // Les sections qui consomment un module (carte, journal) ne montrent pas
  // leur contenu ici : elles attendent leur composant dédié.
  if (definition.providesFrom) {
    return preview ? (
      <div style={noticeStyle()} data-cms-notice="module-section">
        Bloc « {definition.label} » en attente : il affiche le contenu du module{' '}
        {definition.providesFrom === 'menu' ? 'Carte' : 'Journal'}.
      </div>
    ) : null
  }

  const title = text(content.title)
  const subtitle = text(content.subtitle)
  const body = text(content.body)
  const address = definition.usesRestaurantSettings ? restaurant.address : ''
  const hours = definition.usesRestaurantSettings ? restaurant.hours : ''

  // Rien à afficher et pas de signalement demandé : on n'encombre pas la page.
  if (!title && !subtitle && !body && !address) {
    if (!preview) return null
  }

  return (
    <div
      data-cms-section={type}
      data-cms-variant={variant ?? undefined}
      style={{
        padding: '72px 24px',
        maxWidth: 1100,
        margin: '0 auto',
        color: 'var(--c-text, #2f3b32)',
      }}
    >
      {title && (
        <h2
          style={{
            fontFamily: 'var(--f-heading, inherit)',
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
            color: 'var(--c-heading, inherit)',
          }}
        >
          {title}
        </h2>
      )}
      {subtitle && (
        <p style={{ fontSize: 17, lineHeight: 1.7, margin: '0 0 16px', opacity: 0.85 }}>{subtitle}</p>
      )}
      {body && <p style={{ fontSize: 16, lineHeight: 1.8, margin: 0 }}>{body}</p>}
      {(address || hours) && (
        <p style={{ fontSize: 15, lineHeight: 1.8, margin: '16px 0 0', opacity: 0.8 }}>
          {address}
          {address && hours ? ' · ' : ''}
          {hours}
        </p>
      )}
      {preview && (
        <div style={noticeStyle()} data-cms-notice="pending-component">
          Aperçu générique : la mise en forme définitive de « {definition.label} » arrive avec l’éditeur.
        </div>
      )}
    </div>
  )
}

function noticeStyle(): CSSProperties {
  return {
    marginTop: 16,
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px dashed var(--c-shadow, rgba(0,0,0,0.2))',
    background: 'var(--c-surface-alt, rgba(0,0,0,0.03))',
    fontSize: 12,
    lineHeight: 1.6,
    opacity: 0.8,
  }
}
