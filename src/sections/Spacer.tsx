import type { SectionComponentProps } from '@/cms/renderer'
import { cmsText } from '@/cms/renderer/compat'
import { normaliserDisposition } from '@/cms/renderer/disposition'

const DISPOSITIONS = ['sm', 'md', 'lg'] as const

const HAUTEURS: Record<(typeof DISPOSITIONS)[number], number> = {
  sm: 32,
  md: 64,
  lg: 112,
}

/**
 * Espacement vertical entre deux blocs.
 * Le sélecteur « Hauteur » du contenu prime sur la disposition du registre
 * (même échelle sm / md / lg) — les deux restent alignés.
 */
export function Spacer({ content: cms, variant, preview }: Partial<SectionComponentProps> = {}) {
  const fromContent = cmsText(cms, 'size')
  const taille = normaliserDisposition(
    fromContent && (DISPOSITIONS as readonly string[]).includes(fromContent) ? fromContent : variant,
    DISPOSITIONS,
    'md',
  )
  const height = HAUTEURS[taille]

  return (
    <div
      data-cms-spacer={taille}
      data-disposition={taille}
      aria-hidden={preview ? undefined : true}
      style={{
        height,
        width: '100%',
        ...(preview
          ? {
              borderTop: '1px dashed rgba(0,0,0,0.12)',
              borderBottom: '1px dashed rgba(0,0,0,0.12)',
              background: 'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,0,0,0.03) 8px, rgba(0,0,0,0.03) 16px)',
            }
          : {}),
      }}
    >
      {preview ? (
        <span
          style={{
            display: 'block',
            textAlign: 'center',
            fontSize: 11,
            opacity: 0.55,
            lineHeight: `${height}px`,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Espacement
        </span>
      ) : null}
    </div>
  )
}
