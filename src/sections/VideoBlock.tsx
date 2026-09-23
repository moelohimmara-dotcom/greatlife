import { useSite } from '@/contexts/SiteContext'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import type { SectionComponentProps } from '@/cms/renderer'
import { cmsText } from '@/cms/renderer/compat'
import { coalesceAlt, findMediaByUrl, resolveMediaAlt } from '@/lib/mediaAlt'

/** Adresse https/http uniquement — pas de javascript: ni de chemins relatifs opaques. */
function urlPublique(raw: string | undefined): string | null {
  const s = (raw ?? '').trim()
  if (!s) return null
  try {
    const u = new URL(s)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    return u.toString()
  } catch {
    return null
  }
}

function embedYoutube(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const id = u.searchParams.get('v') || u.pathname.match(/\/embed\/([^/?#]+)/)?.[1]
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
  } catch {
    return null
  }
  return null
}

function embedVimeo(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null
    const id = u.pathname.match(/\/(?:video\/)?(\d+)/)?.[1]
    return id ? `https://player.vimeo.com/video/${id}` : null
  } catch {
    return null
  }
}

function estFichierVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(url)
}

export function VideoBlock({ content: cms, preview }: Partial<SectionComponentProps> = {}) {
  const { theme: t, media } = useSite()
  const title = cmsText(cms, 'title')
  const url = urlPublique(cmsText(cms, 'url'))
  const poster = cmsText(cms, 'poster')
  const posterAsset = poster ? findMediaByUrl(media, poster) : undefined
  const posterAlt = coalesceAlt(resolveMediaAlt(posterAsset), title) || undefined

  if (!url) {
    if (!preview) return null
    return (
      <section className="section-pad" style={{ padding: '72px 24px', maxWidth: 900, margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: 14, color: t.muted, textAlign: 'center' }}>
          Vidéo : collez une adresse (YouTube, Vimeo ou fichier .mp4) dans Modifier.
        </p>
      </section>
    )
  }

  const yt = embedYoutube(url)
  const vim = embedVimeo(url)
  const iframeSrc = yt ?? vim

  return (
    <section className="section-pad" style={{ padding: '100px 24px', maxWidth: 960, margin: '0 auto' }}>
      {title ? (
        <Reveal>
          <SectionHead title={title} align="center" preview={preview} />
        </Reveal>
      ) : null}
      <Reveal delay={0.06}>
        <div
          style={{
            position: 'relative',
            borderRadius: 20,
            overflow: 'hidden',
            background: t.surfaceAlt,
            aspectRatio: '16/9',
          }}
        >
          {iframeSrc ? (
            <iframe
              src={iframeSrc}
              title={title || 'Vidéo'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          ) : estFichierVideo(url) ? (
            <video
              controls
              playsInline
              poster={poster || undefined}
              aria-label={posterAlt}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
            >
              <source src={url} />
            </video>
          ) : (
            <p style={{ padding: 24, margin: 0, color: t.muted, fontSize: 14, textAlign: 'center' }}>
              Adresse non reconnue. Utilisez YouTube, Vimeo ou un fichier .mp4 / .webm.
            </p>
          )}
        </div>
      </Reveal>
    </section>
  )
}
