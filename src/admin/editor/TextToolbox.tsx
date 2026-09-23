/**
 * Boîte à outils texte.
 *
 * R12 — champ court (titre) : gras / italique / lien. Pas un Docs.
 * Champs longs (accroche, corps, pied) : barre essentielle + tiroir « Plus ».
 * R11 — désactivée si le verrou interdit le patch.
 * R13 — coller Word/Docs = balises autorisées seulement.
 *
 * Ce n’est PAS Google Docs : pas de pagination A4, pas de suggestions,
 * pas de collab temps réel, pas d’images ni de tableaux.
 */
import { useEffect, useRef, useState, type ClipboardEvent, type ReactNode, type RefObject } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { FieldLabel, inputStyle } from '@/admin/ui'
import { Icon } from '@/lib/icons'
import {
  collerExterne,
  envelopperAlignement,
  envelopperCitation,
  envelopperListe,
  envelopperSelection,
  envelopperTaille,
  hrefAutorise,
  retirerFormat,
  sanitizeInlineHtml,
  type MarkupProfile,
} from '@/cms/renderer/inline-html'
import {
  Bouton,
  ESPACE,
  anneauFocus,
  ADMIN_CORAL,
  ADMIN_INK,
  ADMIN_MUTED,
} from './chrome'
import { ColorControl } from './ColorPicker'
import { insertNode, wrapSelection, type CibleApercu } from './inplace-dom'

interface TextToolboxProps {
  id: string
  label: string
  required?: boolean
  help?: string
  localeHint?: string
  value: string
  multiline?: boolean
  /** `inline` = titres ; `rich` = corps. Défaut : inline si une ligne, rich si multiligne. */
  profile?: MarkupProfile
  disabled?: boolean
  onChange: (next: string) => void
  /** Couleur d’emplacement (titre entier) — niveau 1. */
  slotColor?: string
  inheritedColor?: string
  onSlotColorChange?: (hex: string | undefined) => void
  /** Si l’aperçu a le curseur, gras etc. s’appliquent à cette sélection. */
  cibleApercu?: CibleApercu | null
}

function Outil({
  label,
  actif,
  disabled,
  onClick,
  children,
  controls,
  expanded,
}: {
  label: string
  actif?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
  controls?: string
  expanded?: boolean
}) {
  return (
    <Bouton
      carre
      genre={actif ? 'actif' : 'silencieux'}
      aria-label={label}
      title={label}
      aria-pressed={actif}
      aria-controls={controls}
      aria-expanded={controls ? expanded : undefined}
      aria-haspopup={controls ? 'true' : undefined}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Bouton>
  )
}

export function TextToolbox({
  id,
  label,
  required,
  help,
  localeHint,
  value,
  multiline,
  profile,
  disabled,
  onChange,
  slotColor,
  inheritedColor,
  onSlotColorChange,
  cibleApercu = null,
}: TextToolboxProps) {
  const { theme: t } = useSite()
  const mode: MarkupProfile = profile ?? (multiline ? 'rich' : 'inline')
  const champRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)
  const richRef = useRef<HTMLDivElement>(null)
  const lastRich = useRef(value)
  const [lienOuvert, setLienOuvert] = useState(false)
  const [hrefSaisi, setHrefSaisi] = useState('https://')
  const [erreurLien, setErreurLien] = useState<string | null>(null)
  const [plusOuvert, setPlusOuvert] = useState(false)
  const [past, setPast] = useState<string[]>([])
  const [future, setFuture] = useState<string[]>([])
  const [panneau, setPanneau] = useState<null | 'fg' | 'hl'>(null)
  const rangeRef = useRef<Range | null>(null)

  const sauverRange = () => {
    const prendre = (doc: Document, root: HTMLElement | null) => {
      if (!root) return
      const sel = doc.getSelection()
      if (!sel || sel.rangeCount === 0) return
      const r = sel.getRangeAt(0)
      if (root.contains(r.commonAncestorContainer)) rangeRef.current = r.cloneRange()
    }
    prendre(document, richRef.current)
    if (cibleApercu) prendre(cibleApercu.doc, cibleApercu.root)
  }

  useEffect(() => {
    const onSel = () => sauverRange()
    document.addEventListener('selectionchange', onSel)
    const docApercu = cibleApercu?.doc
    docApercu?.addEventListener('selectionchange', onSel)
    return () => {
      document.removeEventListener('selectionchange', onSel)
      docApercu?.removeEventListener('selectionchange', onSel)
    }
  }, [cibleApercu])

  useEffect(() => {
    if (mode !== 'rich' || !richRef.current) return
    if (document.activeElement === richRef.current) return
    if (richRef.current.innerHTML === (value || '')) return
    richRef.current.innerHTML = value || ''
    lastRich.current = value
  }, [value, mode])

  const pousser = (actuel: string) => {
    setPast((p) => [...p.slice(-40), actuel])
    setFuture([])
  }

  const racineApercu = (): HTMLElement | null => {
    if (!cibleApercu) return null
    if (document.activeElement === richRef.current || document.activeElement === champRef.current) return null
    const sel = cibleApercu.doc.getSelection()
    if (sel && sel.rangeCount > 0 && cibleApercu.root.contains(sel.anchorNode)) return cibleApercu.root
    if (cibleApercu.doc.activeElement === cibleApercu.root) return cibleApercu.root
    if (cibleApercu.root.isContentEditable && cibleApercu.doc.hasFocus()) return cibleApercu.root
    return null
  }

  const ecrire = (next: string) => {
    const propre = sanitizeInlineHtml(next, mode)
    lastRich.current = propre
    onChange(propre)
  }

  const ecrireDepuis = (root: HTMLElement, profil: MarkupProfile | 'plain') => {
    if (profil === 'plain') {
      onChange((root.innerText || root.textContent || '').replace(/\s*\n+\s*/g, ' '))
      return
    }
    ecrire(root.innerHTML)
  }

  const racineEdition = (): HTMLElement | null => racineApercu() ?? (mode === 'rich' ? richRef.current : null)

  const appliquerCourt = (commande: 'strong' | 'em' | 'u' | 'a', href?: string) => {
    if (disabled) return
    const root = racineEdition()
    if (root) {
      pousser(value)
      const ok = wrapSelection(root, () => {
        const el = root.ownerDocument.createElement(commande === 'a' ? 'a' : commande)
        if (commande === 'a' && href) el.setAttribute('href', href)
        return el
      }, rangeRef.current)
      if (ok) {
        ecrireDepuis(root, cibleApercu?.profile === 'plain' ? 'plain' : mode)
        return
      }
    }
    const el = champRef.current
    const debut = el?.selectionStart ?? value.length
    const fin = el?.selectionEnd ?? value.length
    if (debut === fin) return
    pousser(value)
    onChange(envelopperSelection(value, debut, fin, commande, href, mode))
  }

  const appliquerHtmlSelection = (transformer: (html: string) => string) => {
    if (disabled) return
    const root = racineEdition()
    if (!root) return
    pousser(value)
    const sel = root.ownerDocument.getSelection()
    const range = rangeRef.current
    if (range && sel) {
      try {
        sel.removeAllRanges()
        sel.addRange(range)
      } catch {
        /* range devenu invalide */
      }
    }
    const actuel = sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed
      ? (() => {
        const r = sel.getRangeAt(0)
        const tmp = root.ownerDocument.createElement('div')
        tmp.appendChild(r.cloneContents())
        return tmp.innerHTML
      })()
      : root.innerHTML
    const suivant = transformer(actuel)
    if (actuel && sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
      insertNode(root, suivant, rangeRef.current)
    } else {
      root.innerHTML = suivant
    }
    ecrireDepuis(root, mode)
  }

  const coller = (e: ClipboardEvent) => {
    if (disabled) {
      e.preventDefault()
      return
    }
    e.preventDefault()
    const html = e.clipboardData.getData('text/html')
    const plain = e.clipboardData.getData('text/plain')
    const fragment = collerExterne(html || null, plain, mode)
    pousser(value)
    const root = racineEdition()
    if (mode === 'rich' && root) {
      insertNode(root, fragment, rangeRef.current)
      ecrire(root.innerHTML)
      return
    }
    const el = champRef.current
    if (!el) {
      onChange(sanitizeInlineHtml(value + fragment, mode))
      return
    }
    const debut = el.selectionStart ?? value.length
    const fin = el.selectionEnd ?? value.length
    onChange(sanitizeInlineHtml(value.slice(0, debut) + fragment + value.slice(fin), mode))
  }

  const confirmerLien = () => {
    if (!hrefAutorise(hrefSaisi)) {
      setErreurLien('Indiquez une adresse web (https://), un e-mail (mailto:), un téléphone ou une ancre (#carte).')
      return
    }
    setErreurLien(null)
    appliquerCourt('a', hrefSaisi.trim())
    setLienOuvert(false)
  }

  const annuler = () => {
    if (disabled || past.length === 0) return
    const prev = past[past.length - 1]
    setPast((p) => p.slice(0, -1))
    setFuture((f) => [value, ...f])
    lastRich.current = prev
    onChange(prev)
    if (mode === 'rich' && richRef.current) richRef.current.innerHTML = prev || ''
  }

  const retablir = () => {
    if (disabled || future.length === 0) return
    const next = future[0]
    setFuture((f) => f.slice(1))
    setPast((p) => [...p, value])
    lastRich.current = next
    onChange(next)
    if (mode === 'rich' && richRef.current) richRef.current.innerHTML = next || ''
  }

  const champStyle = {
    ...inputStyle(t),
    fontSize: 13,
    ...(multiline ? { resize: 'vertical' as const, minHeight: 96 } : {}),
    ...(disabled ? { opacity: 0.65, cursor: 'default' } : {}),
  }

  const aide = help
    ?? (mode === 'rich'
      ? 'Gras, listes, lien. Le collage reprend le texte autorisé, sans mise en page d’un autre logiciel.'
      : 'Gras, italique et lien seulement. Une seule ligne — le titre reste un titre.')

  return (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel htmlFor={id}>{label}{required ? ' *' : ''}</FieldLabel>
      {localeHint && (
        <div style={{ fontSize: 12, color: ADMIN_MUTED, marginBottom: 4 }}>{localeHint}</div>
      )}
      <div
        role="toolbar"
        aria-label="Mise en forme du texte"
        aria-disabled={disabled || undefined}
        style={{ display: 'flex', flexWrap: 'wrap', gap: ESPACE, marginBottom: 6 }}
      >
        <Outil label="Gras" disabled={disabled} onClick={() => appliquerCourt('strong')}>
          {Icon.bold(16, ADMIN_INK)}
        </Outil>
        <Outil label="Italique" disabled={disabled} onClick={() => appliquerCourt('em')}>
          {Icon.italic(16, ADMIN_INK)}
        </Outil>
        {mode === 'rich' && (
          <Outil label="Souligné" disabled={disabled} onClick={() => appliquerCourt('u')}>
            {Icon.underline(16, ADMIN_INK)}
          </Outil>
        )}
        {mode === 'rich' && (
          <Outil label="Liste à puces" disabled={disabled} onClick={() => appliquerHtmlSelection((h) => envelopperListe(h, 'ul'))}>
            {Icon.list(16, ADMIN_INK)}
          </Outil>
        )}
        {mode === 'rich' && (
          <Outil label="Liste numérotée" disabled={disabled} onClick={() => appliquerHtmlSelection((h) => envelopperListe(h, 'ol'))}>
            {Icon.listOrdered(16, ADMIN_INK)}
          </Outil>
        )}
        <Outil label="Lien" actif={lienOuvert} disabled={disabled} controls={`${id}-lien-panneau`} expanded={lienOuvert} onClick={() => { setErreurLien(null); setLienOuvert((o) => !o) }}>
          {Icon.link(16, ADMIN_INK)}
        </Outil>
        {(mode === 'rich' || onSlotColorChange) && (
          <Outil
            label="Couleur du texte"
            actif={panneau === 'fg'}
            disabled={disabled}
            controls={`${id}-couleur`}
            expanded={panneau === 'fg'}
            onClick={() => setPanneau((p) => (p === 'fg' ? null : 'fg'))}
          >
            {Icon.palette(16, ADMIN_INK)}
          </Outil>
        )}
        {mode === 'rich' && (
          <Outil
            label="Surbrillance"
            actif={panneau === 'hl'}
            disabled={disabled}
            controls={`${id}-surbrillance`}
            expanded={panneau === 'hl'}
            onClick={() => setPanneau((p) => (p === 'hl' ? null : 'hl'))}
          >
            {Icon.highlight(16, ADMIN_INK)}
          </Outil>
        )}
        {mode === 'rich' && (
          <>
            <Outil label="Aligner à gauche" disabled={disabled} onClick={() => appliquerHtmlSelection((h) => envelopperAlignement(h, 'left'))}>
              {Icon.alignLeft(16, ADMIN_INK)}
            </Outil>
            <Outil label="Aligner au centre" disabled={disabled} onClick={() => appliquerHtmlSelection((h) => envelopperAlignement(h, 'center'))}>
              {Icon.alignCenter(16, ADMIN_INK)}
            </Outil>
          </>
        )}
        <Outil label="Annuler" disabled={disabled || past.length === 0} onClick={annuler}>
          {Icon.undo(16, ADMIN_INK)}
        </Outil>
        <Outil label="Rétablir" disabled={disabled || future.length === 0} onClick={retablir}>
          {Icon.redo(16, ADMIN_INK)}
        </Outil>
        {mode === 'rich' && (
          <Bouton
            genre={plusOuvert ? 'actif' : 'silencieux'}
            aria-label="Plus d’outils de mise en forme"
            aria-expanded={plusOuvert}
            aria-controls={`${id}-plus`}
            disabled={disabled}
            onClick={() => setPlusOuvert((o) => !o)}
          >
            Plus
          </Bouton>
        )}
      </div>
      {lienOuvert && !disabled && (
        <div id={`${id}-lien-panneau`} role="region" aria-label="Adresse du lien" style={{ marginBottom: 8 }}>
          <FieldLabel htmlFor={`${id}-lien`}>Adresse du lien</FieldLabel>
          <div style={{ display: 'flex', gap: ESPACE, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              id={`${id}-lien`}
              value={hrefSaisi}
              onChange={(e) => setHrefSaisi(e.target.value)}
              style={{ ...inputStyle(t), flex: 1, minWidth: 160 }}
              {...anneauFocus(t)}
            />
            <Bouton genre="primaire" onClick={confirmerLien}>Appliquer</Bouton>
            <Bouton genre="silencieux" onClick={() => setLienOuvert(false)}>Fermer</Bouton>
          </div>
          {erreurLien && (
            <div role="alert" style={{ fontSize: 12, color: ADMIN_CORAL, marginTop: 4 }}>{erreurLien}</div>
          )}
        </div>
      )}
      {mode === 'rich' && plusOuvert && !disabled && (
        <div id={`${id}-plus`} role="region" aria-label="Outils supplémentaires" style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: ESPACE }}>
          <div role="group" aria-label="Citation et taille" style={{ display: 'flex', flexWrap: 'wrap', gap: ESPACE }}>
            <Outil label="Citation" onClick={() => appliquerHtmlSelection(envelopperCitation)}>
              {Icon.quote(16, ADMIN_INK)}
            </Outil>
            <Outil label="Un peu plus grand" onClick={() => appliquerHtmlSelection((h) => envelopperTaille(h, 'large'))}>
              <span style={{ fontSize: 14, fontWeight: 700 }} aria-hidden="true">A+</span>
            </Outil>
            <Outil label="Taille normale" onClick={() => appliquerHtmlSelection((h) => envelopperTaille(h, 'normal'))}>
              <span style={{ fontSize: 13, fontWeight: 700 }} aria-hidden="true">A</span>
            </Outil>
            <Outil label="Retirer le format" onClick={() => {
              pousser(value)
              onChange(retirerFormat(richRef.current?.innerHTML ?? value))
              if (richRef.current) richRef.current.innerHTML = retirerFormat(richRef.current.innerHTML)
            }}>
              {Icon.eraser(16, ADMIN_INK)}
            </Outil>
          </div>
          <p style={{ fontSize: 12, color: ADMIN_MUTED, margin: 0, lineHeight: 1.4 }}>
            Taille, citation et nettoyage. Couleur et surbrillance sont dans la barre du haut.
          </p>
        </div>
      )}
      {panneau === 'fg' && !disabled && (
        <div id={`${id}-couleur`} role="region" aria-label="Couleur du texte" onMouseDown={(e) => e.preventDefault()} style={{ marginBottom: 8 }}>
          <ColorControl
            label="Couleur du texte"
            value={mode === 'rich' ? undefined : slotColor}
            inherited={inheritedColor ?? t.text}
            against={t.bg}
            deployeParDefaut
            help={mode === 'rich'
              ? 'Sélectionnez un mot, puis une pastille. La couleur reste après enregistrement.'
              : 'Couleur de tout ce texte.'}
            onChange={(hex) => {
              if (mode !== 'rich') {
                onSlotColorChange?.(hex)
                return
              }
              if (!hex) return
              const root = racineApercu() ?? richRef.current
              if (!root) return
              pousser(value)
              const ok = wrapSelection(root, () => {
                const span = root.ownerDocument.createElement('span')
                span.setAttribute('data-cms-fg', hex)
                span.style.color = hex
                return span
              }, rangeRef.current)
              if (ok) ecrire(root.innerHTML)
            }}
          />
        </div>
      )}
      {panneau === 'hl' && mode === 'rich' && !disabled && (
        <div id={`${id}-surbrillance`} role="region" aria-label="Surbrillance" onMouseDown={(e) => e.preventDefault()} style={{ marginBottom: 8 }}>
          <ColorControl
            label="Surbrillance"
            value={undefined}
            inherited={t.gold}
            against={t.bg}
            deployeParDefaut
            help="Sélectionnez un mot, puis une pastille. Le marqueur reste après enregistrement."
            onChange={(hex) => {
              if (!hex) return
              const root = racineApercu() ?? richRef.current
              if (!root) return
              pousser(value)
              const ok = wrapSelection(root, () => {
                const mark = root.ownerDocument.createElement('mark')
                mark.setAttribute('data-cms-hl', hex)
                mark.style.backgroundColor = hex
                return mark
              }, rangeRef.current)
              if (ok) ecrire(root.innerHTML)
            }}
          />
        </div>
      )}
      {mode === 'rich' ? (
        <div
          ref={richRef}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          aria-disabled={disabled || undefined}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onMouseUp={sauverRange}
          onKeyUp={sauverRange}
          onInput={() => {
            if (disabled || !richRef.current) return
            const html = richRef.current.innerHTML
            lastRich.current = html
            onChange(html)
          }}
          onPaste={coller}
          onBlur={() => {
            if (disabled || !richRef.current) return
            ecrire(richRef.current.innerHTML)
          }}
          style={{
            ...champStyle,
            minHeight: 120,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            cursor: disabled ? 'default' : 'text',
          }}
          {...anneauFocus(t)}
        />
      ) : multiline ? (
        <textarea
          ref={champRef as RefObject<HTMLTextAreaElement>}
          id={id}
          value={value}
          rows={4}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onChange(sanitizeInlineHtml(e.target.value, mode))}
          onPaste={coller}
          style={champStyle}
          {...anneauFocus(t)}
        />
      ) : (
        <input
          ref={champRef as RefObject<HTMLInputElement>}
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onChange(sanitizeInlineHtml(e.target.value, mode))}
          onPaste={coller}
          style={champStyle}
          {...anneauFocus(t)}
        />
      )}
      {disabled && (
        <div style={{ fontSize: 12, color: ADMIN_MUTED, marginTop: 4 }}>Ce texte est bloqué avec son groupe.</div>
      )}
      <div style={{ fontSize: 12, color: ADMIN_MUTED, marginTop: 4, lineHeight: 1.4 }}>{aide}</div>
    </div>
  )
}
