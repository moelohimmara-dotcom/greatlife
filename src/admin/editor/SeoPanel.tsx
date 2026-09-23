/**
 * Panneau Referencement (SEO) — atelier, lot J7.
 * Vocabulaire restaurateur : Titre Google, Texte de partage, Image de partage.
 */

import { useMemo } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { FieldLabel, inputStyle } from '@/admin/ui'
import { resolveI18n, type Locale } from '@/cms/model/i18n'
import type { PageSeo } from '@/cms/model/page'
import { ecrireSeoLocale, normaliserPageSeo } from '@/cms/model/page-seo'
import {
  Bouton,
  anneauFocus,
  titreColonne,
  ADMIN_MUTED,
  ADMIN_CORAL,
} from './chrome'
import { Icon } from '@/lib/icons'
import { Switch } from '@/components/ui/switch'

interface SeoPanelProps {
  seo: PageSeo
  locale: Locale
  onChange: (next: PageSeo) => void
  onClose: () => void
  persisting?: boolean
}

export function SeoPanel({ seo, locale, onChange, onClose, persisting = false }: SeoPanelProps) {
  const { media } = useSite()
  const courant = useMemo(() => normaliserPageSeo(seo), [seo])
  const titre = resolveI18n(courant.title, locale)
  const texte = resolveI18n(courant.description, locale)
  const image = courant.image ?? ''
  const photos = media.filter(
    (m) =>
      m.url &&
      (m.content_type?.startsWith('image/') ||
        /\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(m.url)),
  )

  const patcher = (next: PageSeo) => onChange(normaliserPageSeo(next))

  return (
    <div className="admin-seo-panel" role="region" aria-labelledby="seo-panel-titre">
      <div className="admin-editor-col-head" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div id="seo-panel-titre" style={{ ...titreColonne(), flex: 1, marginBottom: 0 }}>
          Référencement
        </div>
        <Bouton carre genre="secondaire" aria-label="Fermer" title="Fermer" onClick={onClose}>
          <span aria-hidden="true">{Icon.x(16, 'currentColor')}</span>
        </Bouton>
      </div>

      <div className="admin-inspector-scroll" style={{ padding: '0 14px 20px' }}>
        <p style={{ fontSize: 12, color: ADMIN_MUTED, lineHeight: 1.45, margin: '0 0 14px' }}>
          Ce que Google et les réseaux voient pour cette page. Les visiteurs ne
          reçoivent ces textes qu’après « Mettre à jour le site ».
          {persisting ? ' Enregistrement…' : ''}
        </p>

        <FieldLabel htmlFor="seo-titre-google">Titre Google</FieldLabel>
        <p style={{ fontSize: 12, color: ADMIN_MUTED, lineHeight: 1.4, margin: '0 0 6px' }}>
          Onglet du navigateur et résultat de recherche. Environ 60 caractères.
        </p>
        <input
          id="seo-titre-google"
          value={titre}
          maxLength={120}
          onChange={(e) => patcher(ecrireSeoLocale(courant, 'title', locale, e.target.value))}
          style={{ ...inputStyle(), marginBottom: 14 }}
          placeholder="Greatlife — Fast-food bio | Conakry"
          {...anneauFocus()}
        />

        <FieldLabel htmlFor="seo-texte-partage">Texte de partage</FieldLabel>
        <p style={{ fontSize: 12, color: ADMIN_MUTED, lineHeight: 1.4, margin: '0 0 6px' }}>
          Court résumé sous le titre (Google, WhatsApp, Facebook…). Environ 155 caractères.
        </p>
        <textarea
          id="seo-texte-partage"
          value={texte}
          maxLength={320}
          rows={4}
          onChange={(e) => patcher(ecrireSeoLocale(courant, 'description', locale, e.target.value))}
          style={{ ...inputStyle(), marginBottom: 14, resize: 'vertical', minHeight: 88 }}
          placeholder="Burgers, wraps et smoothies bio à Conakry…"
          {...anneauFocus()}
        />

        <FieldLabel htmlFor={photos.length > 0 ? 'seo-image-photo' : 'seo-image-url'}>
          Image de partage
        </FieldLabel>
        <p style={{ fontSize: 12, color: ADMIN_MUTED, lineHeight: 1.4, margin: '0 0 8px' }}>
          Photo affichée quand quelqu’un partage le lien. Sans image, le site garde
          celle prévue par défaut.
        </p>
        {photos.length > 0 && (
          <select
            id="seo-image-photo"
            value={photos.some((m) => m.url === image) ? image : ''}
            onChange={(e) => {
              if (e.target.value) patcher({ ...courant, image: e.target.value })
            }}
            style={{ ...inputStyle(), cursor: 'pointer', marginBottom: 8 }}
            {...anneauFocus()}
          >
            <option value="">Choisir une photo déjà téléversée</option>
            {photos.map((m) => (
              <option key={m.id || m.url} value={m.url}>
                {m.filename || m.slot}
              </option>
            ))}
          </select>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <input
            id="seo-image-url"
            value={image}
            onChange={(e) => patcher({ ...courant, image: e.target.value.trim() })}
            style={{ ...inputStyle(), marginBottom: 0, flex: 1 }}
            placeholder="Ou coller l’adresse d’une image…"
            {...anneauFocus()}
          />
          {image ? (
            <Bouton
              carre
              genre="danger"
              aria-label="Retirer l’image de partage"
              title="Retirer l’image de partage"
              onClick={() => {
                const { image: _retiree, ...reste } = courant
                patcher(reste)
              }}
            >
              {Icon.trash(16, ADMIN_CORAL)}
            </Bouton>
          ) : null}
        </div>
        {image ? (
          <img
            src={image}
            alt=""
            style={{
              width: '100%',
              maxHeight: 140,
              objectFit: 'cover',
              borderRadius: 8,
              display: 'block',
              marginBottom: 14,
            }}
          />
        ) : null}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 4,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Masquer des moteurs de recherche</div>
            <p style={{ fontSize: 12, color: ADMIN_MUTED, lineHeight: 1.4, margin: '4px 0 0' }}>
              Demande à Google de ne pas indexer cette page. Rarement utile pour l’accueil.
            </p>
          </div>
          <Switch
            checked={courant.noindex === true}
            onCheckedChange={(v) => patcher({ ...courant, noindex: v === true ? true : undefined })}
            aria-label="Masquer des moteurs de recherche"
          />
        </div>
      </div>
    </div>
  )
}
