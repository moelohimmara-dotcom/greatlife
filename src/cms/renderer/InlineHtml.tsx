import type { CSSProperties, ElementType, HTMLAttributes } from 'react'
import { contientBalisage, sanitizeInlineHtml, type MarkupProfile } from './inline-html'

/**
 * Affiche une phrase pouvant porter gras / italique / lien / listes bornées.
 * Sans balise autorisée, c’est du texte React — le HTML public reste identique.
 */
export function InlineHtml({
  html,
  as: Tag = 'span',
  style,
  className,
  profile = 'rich',
  ...rest
}: {
  html: string
  as?: ElementType
  style?: CSSProperties
  className?: string
  profile?: MarkupProfile
} & HTMLAttributes<HTMLElement>) {
  if (!contientBalisage(html)) {
    return <Tag style={style} className={className} {...rest}>{html}</Tag>
  }
  return (
    <Tag
      className={className ? `${className} cms-inline-html` : 'cms-inline-html'}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(html, profile) }}
      {...rest}
    />
  )
}
