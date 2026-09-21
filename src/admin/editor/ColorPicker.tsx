/**
 * Sélecteur de couleur — primitive réutilisée sur chaque levier chromatique.
 * Compact par défaut ; le nuancier s’ouvre dans un tiroir (pas d’empilement).
 */
import { useEffect, useId, useState, type CSSProperties } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { FieldLabel } from '@/admin/ui'
import {
  MESSAGE_CONTRASTE,
  contrasteFaible,
  encreSurPastille,
  pastillesDepuisTheme,
  sanitiserHex,
} from '@/cms/model/sections/couleur'
import { Bouton, CIBLE, CLASSE_BOUTON, ESPACE, HAUTEUR, HAUTEUR_ETAT, RAYON, anneauFocus } from './chrome'

export interface ColorPickerProps {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  against?: string
  help?: string
  /** Masque le libellé (quand ColorControl l’affiche déjà). */
  sansLibelle?: boolean
  /** Ouvre le nuancier dès l’affichage (ex. barre d’outils texte). */
  deployeParDefaut?: boolean
}

/** Zone visuelle 40×40 ; `--admin-cible: 100%` évite que le hit 44 chevauche la pastille voisine. */
const styleCible: CSSProperties = {
  width: HAUTEUR,
  height: HAUTEUR,
  minWidth: HAUTEUR,
  minHeight: HAUTEUR,
  padding: 0,
  border: 'none',
  background: 'transparent',
  ['--admin-cible' as string]: '100%',
}

function disqueStyle(opts: {
  fill: string
  encre: string
  bord: string
  surface: string
  selected: boolean
  dashed?: boolean
}): CSSProperties {
  return {
    width: HAUTEUR_ETAT,
    height: HAUTEUR_ETAT,
    borderRadius: 99,
    flexShrink: 0,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: opts.fill,
    border: opts.dashed ? `2px dashed ${opts.bord}` : `1px solid ${opts.bord}`,
    boxShadow: opts.selected
      ? `inset 0 0 0 2px ${opts.encre}`
      : `inset 0 0 0 1px ${opts.surface}`,
  }
}

function Coche({ couleur }: { couleur: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path
        d="M2.4 6.2 L4.9 8.7 L9.6 3.5"
        fill="none"
        stroke={couleur}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Pastille({
  label,
  fill,
  selected,
  onClick,
  dashed,
  inkHex,
}: {
  label: string
  fill: string
  selected: boolean
  onClick: () => void
  dashed?: boolean
  inkHex?: string
}) {
  const { theme: t } = useSite()
  const encre = encreSurPastille(inkHex ?? (fill.startsWith('#') ? fill : t.primary))
  return (
    <Bouton
      carre
      genre="silencieux"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="admin-btn--pastille"
      style={{ ...styleCible, color: encre }}
    >
      <span aria-hidden="true" style={disqueStyle({
        fill,
        encre,
        bord: dashed ? t.primary : t.shadow,
        surface: t.surface,
        selected,
        dashed,
      })}>
        {selected ? <Coche couleur={encre} /> : null}
      </span>
    </Bouton>
  )
}

function AlerteContraste({ id, visible }: { id: string; visible: boolean }) {
  const { theme: t } = useSite()
  if (!visible) return null
  return (
    <p
      id={id}
      role="status"
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: t.accent,
        margin: 0,
        lineHeight: 1.4,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          background: t.accent,
          marginTop: 4,
          flexShrink: 0,
        }}
      />
      {MESSAGE_CONTRASTE}
    </p>
  )
}

function SaisiePerso({
  id,
  label,
  value,
  alerte,
  alerteId,
  onChange,
}: {
  id: string
  label: string
  value: string
  alerte: boolean
  alerteId: string
  onChange: (value: string) => void
}) {
  const { theme: t } = useSite()
  const actuel = sanitiserHex(value) ?? '#000000'
  const [saisie, setSaisie] = useState(actuel)

  useEffect(() => {
    setSaisie(actuel)
  }, [actuel])

  return (
    <input
      id={id}
      value={saisie}
      onChange={(e) => {
        const brut = e.target.value.toUpperCase().replace(/[^#0-9A-F]/g, '').slice(0, 7)
        const avecDiese = brut.startsWith('#') ? brut : `#${brut}`
        setSaisie(avecDiese)
        const v = sanitiserHex(avecDiese)
        if (v && v.length === 7) onChange(v)
      }}
      onBlur={() => {
        const v = sanitiserHex(saisie)
        if (v) {
          setSaisie(v)
          onChange(v)
        } else {
          setSaisie(actuel)
        }
      }}
      aria-label={`Personnalisé, ${label}`}
      aria-invalid={alerte || undefined}
      aria-describedby={alerte ? alerteId : undefined}
      spellCheck={false}
      autoComplete="off"
      maxLength={7}
      style={{
        flex: 1,
        minHeight: CIBLE,
        background: t.surfaceAlt,
        border: `1px solid ${alerte ? t.accent : t.shadow}`,
        borderRadius: RAYON,
        padding: '0 12px',
        fontSize: 14,
        color: t.text,
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        letterSpacing: '0.04em',
      }}
      {...anneauFocus(t)}
    />
  )
}

function NuancierPerso({
  id,
  label,
  value,
  selected,
  onPick,
}: {
  id: string
  label: string
  value: string
  selected: boolean
  onPick: (hex: string) => void
}) {
  const { theme: t } = useSite()
  const actuel = sanitiserHex(value) ?? '#000000'
  const encre = encreSurPastille(actuel)
  return (
    <label
      htmlFor={id}
      className={`${CLASSE_BOUTON} admin-btn--pastille`}
      title="Personnalisé"
      style={{
        ...styleCible,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        borderRadius: RAYON,
        cursor: 'pointer',
        color: encre,
      }}
    >
      <input
        id={id}
        type="color"
        value={actuel.toLowerCase()}
        onChange={(e) => {
          const v = sanitiserHex(e.target.value)
          if (v) onPick(v)
        }}
        onClick={() => onPick(actuel)}
        aria-label={`Personnalisé, ${label}`}
        className="admin-focus"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          width: '100%',
          height: '100%',
          cursor: 'pointer',
          border: 0,
          padding: 0,
          outline: 'none',
        }}
      />
      <span
        aria-hidden="true"
        style={{
          ...disqueStyle({
            fill: actuel,
            encre,
            bord: t.shadow,
            surface: t.surface,
            selected,
          }),
          background: `conic-gradient(from 180deg, ${t.primary}, ${t.accent}, ${t.gold}, ${t.primary})`,
          padding: 2,
        }}
      >
        <span style={{
          width: selected ? 16 : 18,
          height: selected ? 16 : 18,
          borderRadius: 99,
          background: actuel,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: selected ? `inset 0 0 0 2px ${encre}` : undefined,
        }}>
          {selected ? <Coche couleur={encre} /> : null}
        </span>
      </span>
    </label>
  )
}

/** Grille du thème + saisie bornée #RRGGBB. Derrière un tiroir. */
export function ColorPicker({ id, label, value, onChange, against, help, sansLibelle, deployeParDefaut = false }: ColorPickerProps) {
  const { theme: t } = useSite()
  const autoId = useId()
  const baseId = id ?? autoId
  const nuancierId = `${baseId}-nuancier`
  const saisieId = `${baseId}-saisie`
  const alerteId = `${baseId}-alerte`
  const panneauId = `${baseId}-panneau`
  const [ouvert, setOuvert] = useState(deployeParDefaut)
  const actuel = sanitiserHex(value) ?? '#000000'
  const pastilles = pastillesDepuisTheme(t, against)
  const alerte = against ? contrasteFaible(against, actuel) || contrasteFaible(actuel, against) : false
  const dansPalette = pastilles.some((p) => p.value === actuel)
  const libelleActuel = dansPalette
    ? (pastilles.find((p) => p.value === actuel)?.label ?? actuel)
    : actuel

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: ESPACE }}>
      {!sansLibelle && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span
            aria-hidden="true"
            style={{
              width: HAUTEUR_ETAT,
              height: HAUTEUR_ETAT,
              borderRadius: 99,
              flexShrink: 0,
              background: actuel,
              border: `1px solid ${t.shadow}`,
              boxShadow: `inset 0 0 0 1px ${t.surface}`,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: t.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>
            {label}
          </span>
        </div>
      )}

      <Bouton
        genre={ouvert ? 'actif' : 'secondaire'}
        aria-expanded={ouvert}
        aria-controls={panneauId}
        onClick={() => setOuvert((v) => !v)}
        style={{ justifyContent: 'flex-start', gap: ESPACE, maxWidth: '100%' }}
      >
        <span
          aria-hidden="true"
          style={{
            width: HAUTEUR_ETAT,
            height: HAUTEUR_ETAT,
            borderRadius: 99,
            flexShrink: 0,
            background: actuel,
            border: `1px solid ${t.shadow}`,
          }}
        />
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
          {ouvert ? 'Fermer le nuancier' : libelleActuel}
        </span>
      </Bouton>

      {ouvert && (
        <div id={panneauId} role="region" aria-label={`Nuancier, ${label}`} style={{ display: 'flex', flexDirection: 'column', gap: ESPACE }}>
          <div
            role="group"
            aria-label={`Couleurs, ${label}`}
            style={{ display: 'flex', flexWrap: 'wrap', gap: ESPACE }}
          >
            {pastilles.map((p) => (
              <Pastille
                key={p.value}
                label={p.label}
                fill={p.value}
                selected={p.value === actuel}
                onClick={() => onChange(p.value)}
              />
            ))}
            <NuancierPerso
              id={nuancierId}
              label={label}
              value={actuel}
              selected={!dansPalette}
              onPick={onChange}
            />
          </div>

          <div style={{ display: 'flex', gap: ESPACE, alignItems: 'center' }}>
            <SaisiePerso
              id={saisieId}
              label={label}
              value={actuel}
              alerte={alerte}
              alerteId={alerteId}
              onChange={onChange}
            />
          </div>
        </div>
      )}

      {help && <p style={{ fontSize: 12, color: t.muted, margin: 0, lineHeight: 1.4 }}>{help}</p>}
      <AlerteContraste id={alerteId} visible={alerte} />
    </div>
  )
}

export interface ColorControlProps {
  label: string
  /** Couleur personnalisée, ou vide = hérite du thème. */
  value: string | undefined
  /** Couleur actuellement produite par l’apparence / le jeu choisi. */
  inherited: string
  onChange: (value: string | undefined) => void
  against?: string
  help?: string
  /** Ouvre le nuancier dès l’affichage (ex. barre d’outils texte). */
  deployeParDefaut?: boolean
}

/** Thème (hérite) + nuancier en tiroir, sous le libellé de l’élément. */
export function ColorControl({ label, value, inherited, onChange, against, help, deployeParDefaut = false }: ColorControlProps) {
  const { theme: t } = useSite()
  const id = useId()
  const labelId = `${id}-libelle`
  const alerteId = `${id}-alerte`
  const saisieId = `${id}-saisie`
  const persoId = `${id}-perso`
  const panneauId = `${id}-panneau`
  const [ouvert, setOuvert] = useState(deployeParDefaut)
  const perso = sanitiserHex(value)
  const modePerso = Boolean(perso)
  const herite = sanitiserHex(inherited) ?? '#000000'
  const affiche = perso ?? herite
  const pastilles = pastillesDepuisTheme(t, against)
  const dansPalette = pastilles.some((p) => p.value === affiche)
  const alerte = against ? contrasteFaible(against, affiche) || contrasteFaible(affiche, against) : false
  const fillTheme = `linear-gradient(135deg, ${herite} 50%, ${t.surface} 50%)`
  const libelleActuel = !modePerso
    ? 'Couleur du thème'
    : (pastilles.find((p) => p.value === affiche)?.label ?? affiche)

  const nuancier = (
    <div id={panneauId} role="region" aria-label={`Nuancier, ${label}`}>
      <div
        role="group"
        aria-labelledby={labelId}
        style={{ display: 'flex', flexWrap: 'wrap', gap: ESPACE, marginBottom: ESPACE }}
      >
        <Pastille
          label="Couleur du thème"
          fill={fillTheme}
          inkHex={herite}
          dashed
          selected={!modePerso}
          onClick={() => onChange(undefined)}
        />
        {pastilles.map((p) => (
          <Pastille
            key={p.value}
            label={p.label}
            fill={p.value}
            selected={modePerso && p.value === affiche}
            onClick={() => onChange(p.value)}
          />
        ))}
        <NuancierPerso
          id={persoId}
          label={label}
          value={affiche}
          selected={modePerso && !dansPalette}
          onPick={(hex) => onChange(hex)}
        />
      </div>
      {modePerso && (
        <div style={{ display: 'flex', gap: ESPACE, alignItems: 'center', marginBottom: help || alerte ? ESPACE : 0 }}>
          <SaisiePerso
            key={affiche}
            id={saisieId}
            label={label}
            value={affiche}
            alerte={alerte}
            alerteId={alerteId}
            onChange={(v) => onChange(v)}
          />
        </div>
      )}
    </div>
  )

  return (
    <div style={{ marginBottom: 12 }}>
      <FieldLabel>
        <span id={labelId}>{label}</span>
      </FieldLabel>
      {deployeParDefaut ? (
        nuancier
      ) : (
        <>
          <Bouton
            genre={ouvert ? 'actif' : 'secondaire'}
            aria-expanded={ouvert}
            aria-controls={panneauId}
            aria-labelledby={labelId}
            onClick={() => setOuvert((v) => !v)}
            style={{ justifyContent: 'flex-start', gap: ESPACE, maxWidth: '100%', marginBottom: ouvert || help || alerte ? ESPACE : 0 }}
          >
            <span
              aria-hidden="true"
              style={{
                width: HAUTEUR_ETAT,
                height: HAUTEUR_ETAT,
                borderRadius: 99,
                flexShrink: 0,
                background: modePerso ? affiche : fillTheme,
                border: modePerso ? `1px solid ${t.shadow}` : `2px dashed ${t.primary}`,
                boxSizing: 'border-box',
              }}
            />
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
              {ouvert ? 'Fermer le nuancier' : libelleActuel}
            </span>
          </Bouton>
          {ouvert && nuancier}
        </>
      )}
      {help && <p style={{ fontSize: 12, color: t.muted, margin: '0 0 6px', lineHeight: 1.4 }}>{help}</p>}
      <AlerteContraste id={alerteId} visible={alerte} />
    </div>
  )
}
