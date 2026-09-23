/**
 * Apparence → Typo : lots composés ou composition manuelle.
 * Vocabulaire restaurateur uniquement. Persistance : `restaurant.typography`.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { FieldLabel, inputStyle } from '@/admin/ui'
import { TYPO_LOTS, assurerPolicesChargees, policesTextes, policesTitres } from '@/config/fonts'
import {
  TITRE_GRAISSES,
  TYPO_ECHELLES,
  styleTypo,
  typoDepuisFontId,
  typoDepuisReglages,
  typoVersReglages,
  type TypoMode,
  type TypoReglages,
} from '@/cms/model/sections/typo'
import { SETTING_KEYS, fetchSetting, saveSetting, registerRestaurantDraftFlush } from '@/cms/repository/settings'
import { Bouton, CLASSE_CARTE, ESPACE, HAUTEUR, RAYON } from './chrome'

const PHRASE_TITRE = 'Le fast-food sans complexe'
const PHRASE_TEXTE = 'Réservez une table'

interface TypoPanelProps {
  onLotApplique?: (lotId: string) => void
}

export function TypoPanel({ onLotApplique }: TypoPanelProps) {
  const { theme: t, fontId, dataSource } = useSite()
  const [typo, setTypo] = useState<TypoReglages>(() => typoDepuisFontId(fontId))
  const [statut, setStatut] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const rawRef = useRef<Record<string, unknown>>({})
  const ignorer = useRef(true)
  const ticketRef = useRef(0)
  const groupeId = useId()

  useEffect(() => {
    assurerPolicesChargees()
  }, [])

  useEffect(() => {
    let actif = true
    fetchSetting(SETTING_KEYS.restaurant).then((res) => {
      if (!actif) return
      rawRef.current = res.ok && res.data ? res.data : {}
      const lu = typoDepuisReglages(rawRef.current)
      ignorer.current = true
      setTypo(lu ?? typoDepuisFontId(fontId))
    })
    return () => { actif = false }
  }, [fontId])

  const ecrire = useCallback(async (suivant: TypoReglages) => {
    if (dataSource !== 'supabase') {
      setStatut('saved')
      window.setTimeout(() => setStatut('idle'), 2000)
      return
    }
    const ticket = ++ticketRef.current
    setStatut('saving')
    const payload: Record<string, unknown> = {
      typography: typoVersReglages(suivant),
    }
    const sauve = await saveSetting(SETTING_KEYS.restaurant, payload, { merge: true })
    if (ticket !== ticketRef.current) return
    if (!sauve.ok) {
      setStatut('error')
      throw new Error('L’enregistrement de la typographie n’a pas abouti. Réessayez avant de publier.')
    }
    rawRef.current = payload
    setStatut('saved')
    window.setTimeout(() => setStatut('idle'), 2500)
  }, [dataSource])

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typoRef = useRef(typo)
  typoRef.current = typo

  useEffect(() => {
    if (ignorer.current) {
      ignorer.current = false
      return
    }
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      void ecrire(typo).catch(() => {})
    }, 400)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [typo, ecrire])

  useEffect(() => {
    const vider = async () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      await ecrire(typoRef.current)
    }
    const retirer = registerRestaurantDraftFlush(vider)
    return () => {
      void vider().catch(() => {})
      retirer()
    }
  }, [ecrire])

  const appliquer = (suivant: TypoReglages) => {
    setTypo(suivant)
    if (suivant.mode === 'lot') onLotApplique?.(suivant.lot)
  }

  const vars = styleTypo(typo)
  const inp = { ...inputStyle(t), height: HAUTEUR, minHeight: 44, padding: '0 12px' }

  return (
    <div style={vars}>
      <p style={{ fontSize: 13, color: t.muted, margin: `0 0 ${ESPACE * 2}px`, lineHeight: 1.45 }}>
        Ensemble pose les titres et les textes ensemble. À la carte, vous composez les deux.
      </p>

      <div
        className="admin-apercu-segment"
        role="radiogroup"
        aria-label="Mode des polices"
        style={{ marginBottom: 16 }}
      >
        {([
          { id: 'lot' as const, label: 'Ensemble' },
          { id: 'manuel' as const, label: 'À la carte' },
        ]).map((item) => {
          const actif = typo.mode === item.id
          return (
            <Bouton
              key={item.id}
              genre={actif ? 'actif' : 'secondaire'}
              aria-checked={actif}
              role="radio"
              onClick={() => appliquer({ ...typo, mode: item.id as TypoMode })}
            >
              {item.label}
            </Bouton>
          )
        })}
      </div>

      {typo.mode === 'lot' && (
        <div
          role="listbox"
          aria-label="Lots de polices"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: ESPACE }}
        >
          {TYPO_LOTS.map((lot) => {
            const actif = typo.lot === lot.id
            return (
              <button
                key={lot.id}
                type="button"
                role="option"
                aria-selected={actif}
                className={`${CLASSE_CARTE} admin-btn${actif ? ' is-selected' : ''}`}
                onClick={() => appliquer({
                  ...typo,
                  mode: 'lot',
                  lot: lot.id,
                })}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  minHeight: 44,
                  padding: '14px 14px 14px 16px',
                  textAlign: 'left',
                  border: `1px solid ${t.shadow}`,
                  borderRadius: RAYON,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: t.text,
                }}
              >
                <div aria-hidden="true" style={{ fontFamily: lot.heading, fontSize: 28, fontWeight: 700, lineHeight: 1, color: t.heading, letterSpacing: '-0.03em' }}>
                  Aa
                </div>
                <div style={{ fontFamily: lot.heading, fontWeight: 700, fontSize: 14, color: t.heading, marginTop: 8 }}>
                  {lot.label}
                </div>
                <div style={{ fontFamily: lot.body, fontSize: 12, color: t.muted, marginTop: 4, lineHeight: 1.4 }}>
                  {lot.sample ?? PHRASE_TITRE}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {typo.mode === 'manuel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <FieldLabel htmlFor={`${groupeId}-titres`}>Police des titres</FieldLabel>
            <select
              id={`${groupeId}-titres`}
              className="admin-focus"
              value={typo.heading}
              onChange={(e) => appliquer({ ...typo, heading: e.target.value })}
              style={inp}
            >
              {policesTitres().map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor={`${groupeId}-textes`}>Police des textes</FieldLabel>
            <select
              id={`${groupeId}-textes`}
              className="admin-focus"
              value={typo.body}
              onChange={(e) => appliquer({ ...typo, body: e.target.value })}
              style={inp}
            >
              {policesTextes().map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor={`${groupeId}-graisse`}>Graisse des titres</FieldLabel>
            <select
              id={`${groupeId}-graisse`}
              className="admin-focus"
              value={typo.headingWeight}
              onChange={(e) => appliquer({ ...typo, headingWeight: e.target.value as TypoReglages['headingWeight'] })}
              style={inp}
            >
              {TITRE_GRAISSES.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor={`${groupeId}-echelle`}>Taille</FieldLabel>
            <select
              id={`${groupeId}-echelle`}
              className="admin-focus"
              value={typo.scale}
              onChange={(e) => appliquer({ ...typo, scale: e.target.value as TypoReglages['scale'] })}
              style={inp}
            >
              {TYPO_ECHELLES.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: RAYON,
          background: t.surface,
          border: `1px solid ${t.shadow}`,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-heading, var(--f-heading))',
            fontWeight: 'var(--font-heading-weight, 700)' as unknown as number,
            fontSize: `calc(30px * var(--font-scale, 1))`,
            color: t.heading,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}
        >
          {PHRASE_TITRE}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body, var(--f-body))',
            fontSize: `calc(15px * var(--font-scale, 1))`,
            color: t.muted,
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          {PHRASE_TEXTE}
        </div>
      </div>

      <p role="status" style={{ fontSize: 12, color: t.muted, margin: '10px 0 0', minHeight: 18 }}>
        {statut === 'saving' ? 'Enregistrement…' : statut === 'saved' ? 'Typo appliquée au site.' : statut === 'error' ? 'L’enregistrement n’a pas abouti. Réessayez.' : ''}
      </p>
    </div>
  )
}
