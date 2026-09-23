/**
 * Inspecteur En-tête / Pied — éléments nommés (logo, liens, slogan, réseaux).
 * Lit/écrit `site_content.restaurant` et, si elle existe, `navigation_items`.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { FieldLabel, inputStyle } from '@/admin/ui'
import type { Locale } from '@/cms/model/i18n'
import {
  CHROME_EFFECTS,
  FOOTER_EFFECTS,
  FOOTER_LAYOUTS,
  HEADER_LAYOUTS,
  HEADER_OVERLAYS,
  LOGO_TAILLES,
  ANNONCE_CIBLES,
  chromeDepuisReglages,
  fusionnerPresentation,
  presentationVersReglages,
  schemesDepuisTheme,
  couleursEntete,
  couleursPied,
  couleursAnnonce,
  type ChromePresentation,
} from '@/cms/model/sections/chrome-presentation'
import {
  CIBLES_LIEN,
  LIENS_ENTETE_DEFAUT,
  LIENS_PIED_DEFAUT,
  PLAFOND_LIENS_CHROME,
  cibleLienConnue,
  liensDepuisReglages,
  liensVersReglages,
  nouveauLienChrome,
  normaliserCibleLien,
  type ChromeId,
  type LienChrome,
} from '@/cms/model/sections/site-chrome'
import {
  createNavigationItem,
  deleteNavigationItem,
  fetchNavigation,
  reorderNavigationItems,
  updateNavigationItem,
  type NavigationTree,
} from '@/cms/repository/navigation'
import {
  SETTING_KEYS,
  fetchSetting,
  saveSetting,
  registerRestaurantDraftFlush,
  toRestaurantSettings,
  completerRestaurantDepuisPlat,
  type RestaurantSettings,
} from '@/cms/repository/settings'
import { Bouton, CLASSE_CARTE, CIBLE, RAYON, TiroirInspecteur, anneauFocus, titreColonne } from './chrome'
import { ColorControl } from './ColorPicker'
import { Switch } from '@/components/ui/switch'
import { Icon } from '@/lib/icons'

interface ChromePanelProps {
  chrome: ChromeId
  locale: Locale
  onRestaurantResolved: (settings: RestaurantSettings) => void
  onPresentationChange?: (presentation: ChromePresentation) => void
  onLiensChange?: (liens: LienChrome[]) => void
  onOuvrirApparence?: () => void
}

function liensDepuisNav(tree: NavigationTree | null): LienChrome[] {
  if (!tree) return []
  return tree.items.map((item) => ({
    id: item.id,
    label: item.label,
    target: item.targetValue ?? '',
    visible: item.visible,
    isCta: item.isCta,
    source: 'nav' as const,
  }))
}

function bilingue(value: RestaurantSettings['name'], locale: Locale, next: string): RestaurantSettings['name'] {
  if (typeof value === 'string') {
    return locale === 'fr' ? { fr: next, en: '' } : { fr: value, en: next }
  }
  return { ...value, [locale]: next }
}

function texteLocale(value: RestaurantSettings['name'], locale: Locale): string {
  if (typeof value === 'string') return locale === 'fr' ? value : ''
  return value[locale] ?? ''
}

function optionsCible(actuel: string): readonly { id: string; label: string }[] {
  const id = normaliserCibleLien(actuel)
  if (!id || cibleLienConnue(id)) return CIBLES_LIEN
  return [{ id, label: id }, ...CIBLES_LIEN]
}

function CarteLien({
  lien,
  index,
  total,
  locale,
  onPatch,
  onMonter,
  onDescendre,
  onRetirer,
}: {
  lien: LienChrome
  index: number
  total: number
  locale: Locale
  onPatch: (patch: Partial<LienChrome>) => void
  onMonter: () => void
  onDescendre: () => void
  onRetirer: () => void
}) {
  const { theme: t } = useSite()
  const [confirme, setConfirme] = useState(false)
  const actuel = typeof lien.label === 'string' ? { fr: lien.label, en: '' } : { fr: '', en: '', ...lien.label }
  return (
    <div
      className={CLASSE_CARTE}
      style={{ padding: 10, borderRadius: RAYON, border: `1px solid ${t.shadow}`, marginBottom: 8 }}
    >
      <FieldLabel htmlFor={`lien-lib-${lien.id}`}>Lien</FieldLabel>
      <div style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>
        {locale === 'fr' ? 'Texte en français' : 'Text in English'}
      </div>
      <input
        id={`lien-lib-${lien.id}`}
        value={actuel[locale] ?? ''}
        onChange={(e) => onPatch({ label: { ...actuel, [locale]: e.target.value } })}
        style={{ ...inputStyle(t), marginBottom: 8 }}
        {...anneauFocus(t)}
      />
      <FieldLabel htmlFor={`lien-cib-${lien.id}`}>Page du site</FieldLabel>
      <select
        id={`lien-cib-${lien.id}`}
        value={normaliserCibleLien(lien.target)}
        onChange={(e) => onPatch({ target: e.target.value })}
        style={{ ...inputStyle(t), cursor: 'pointer', marginBottom: 10 }}
        {...anneauFocus(t)}
      >
        {optionsCible(lien.target).map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: t.text, minHeight: CIBLE, marginBottom: 8 }}>
        <Switch
          id={`lien-vis-${lien.id}`}
          checked={lien.visible}
          onCheckedChange={(v) => onPatch({ visible: v })}
          aria-label="Afficher"
        />
        Afficher
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Bouton
          genre="secondaire"
          disabled={index === 0}
          aria-label="Monter"
          onClick={onMonter}
        >
          Monter
        </Bouton>
        <Bouton
          genre="secondaire"
          disabled={index === total - 1}
          aria-label="Descendre"
          onClick={onDescendre}
        >
          Descendre
        </Bouton>
        {confirme ? (
          <>
            <Bouton genre="danger" onClick={onRetirer}>Retirer</Bouton>
            <Bouton genre="secondaire" onClick={() => setConfirme(false)}>Annuler</Bouton>
          </>
        ) : (
          <Bouton genre="danger" aria-label="Retirer" onClick={() => setConfirme(true)}>
            Retirer
          </Bouton>
        )}
      </div>
    </div>
  )
}

export function ChromePanel({ chrome, locale, onRestaurantResolved, onPresentationChange, onLiensChange, onOuvrirApparence }: ChromePanelProps) {
  const { theme: t, content: platSite } = useSite()
  const platRef = useRef(platSite)
  platRef.current = platSite
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [statut, setStatut] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [restau, setRestau] = useState<RestaurantSettings | null>(null)
  const [liens, setLiens] = useState<LienChrome[]>([])
  const [navDisponible, setNavDisponible] = useState(false)
  const [navId, setNavId] = useState<string | null>(null)
  const [navAjoutBloque, setNavAjoutBloque] = useState(false)
  const [presentation, setPresentation] = useState<ChromePresentation>({})
  const presentationTouchee = useRef(false)
  const sauvegardeRef = useRef(0)
  const ignorerProchain = useRef(true)
  const rawRef = useRef<Record<string, unknown>>({})
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const etatRef = useRef({ restau, liens, presentation })
  etatRef.current = { restau, liens, presentation }

  const titre = chrome === 'header' ? 'En-tête' : 'Pied de page'
  const description = chrome === 'header'
    ? 'Nom affiché, liens du menu et bouton Réserver. Ils s’appliquent à tout le site.'
    : 'Nom, phrase d’accroche, liens, horaires, coordonnées et réseaux. Une seule source, partout.'

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur(null)
    const [reglages, nav] = await Promise.all([
      fetchSetting(SETTING_KEYS.restaurant),
      fetchNavigation(chrome, { includeHidden: true }),
    ])
    if (!reglages.ok) {
      setErreur('Impossible de charger les informations du restaurant.')
      setChargement(false)
      return
    }
    const objet = completerRestaurantDepuisPlat(reglages.data ?? {}, {
      restaurantName: platRef.current.restaurantName,
      phone: platRef.current.phone,
      address: platRef.current.address,
      hours: platRef.current.hours,
      emailContact: platRef.current.emailContact,
      emailReservation: platRef.current.emailReservation,
      slogan: platRef.current.slogan,
    })
    const settings = toRestaurantSettings(objet)
    rawRef.current = objet
    const lu = chromeDepuisReglages(objet)
    setPresentation(lu)
    presentationTouchee.current = false
    onPresentationChange?.(lu)
    setRestau(settings)
    onRestaurantResolved(settings)

    let depuisNav: LienChrome[] = []
    let idNav: string | null = null
    if (nav.ok && nav.data && nav.data.items.length > 0) {
      depuisNav = liensDepuisNav(nav.data)
      idNav = nav.data.items[0]?.navigationId ?? null
      setNavDisponible(true)
      setNavId(idNav)
      setNavAjoutBloque(false)
    } else {
      setNavDisponible(false)
      setNavId(null)
      setNavAjoutBloque(false)
    }

    const suivants = depuisNav.length > 0
      ? depuisNav
      : (() => {
        const cle = chrome === 'header' ? 'menuLinks' : 'footerLinks'
        const depuisJson = liensDepuisReglages(objet[cle])
        const defaut = chrome === 'header' ? LIENS_ENTETE_DEFAUT : LIENS_PIED_DEFAUT
        return depuisJson.length > 0
          ? depuisJson
          : defaut.map((l) => ({ ...l, source: 'settings' as const }))
      })()
    setLiens(suivants)
    onLiensChange?.(suivants)
    ignorerProchain.current = true
    setChargement(false)
  }, [chrome, onRestaurantResolved, onPresentationChange, onLiensChange])

  useEffect(() => {
    void charger()
  }, [charger])

  const ecrire = useCallback(async (suivantRestau: RestaurantSettings, suivantsLiens: LienChrome[], suivantePres: ChromePresentation) => {
    const ticket = ++sauvegardeRef.current
    setStatut('saving')
    const payload: Record<string, unknown> = {
      name: suivantRestau.name,
      slogan: suivantRestau.slogan,
      address: suivantRestau.address,
      hours: suivantRestau.hours,
      phone: suivantRestau.phone,
      emailContact: suivantRestau.emailContact,
      emailReservation: suivantRestau.emailReservation,
      currency: suivantRestau.currency,
      social: suivantRestau.social,
    }
    payload.chromePresentation = presentationVersReglages(suivantePres)
    if (!navDisponible) {
      const cle = chrome === 'header' ? 'menuLinks' : 'footerLinks'
      payload[cle] = liensVersReglages(suivantsLiens)
    }
    const sauve = await saveSetting(SETTING_KEYS.restaurant, payload, { merge: true })
    if (ticket !== sauvegardeRef.current) return
    if (!sauve.ok) {
      setErreur('L’enregistrement n’a pas abouti. Réessayez.')
      setStatut('idle')
      throw new Error('L’enregistrement de l’apparence n’a pas abouti. Réessayez avant de publier.')
    }
    rawRef.current = { ...rawRef.current, ...payload }
    if (navDisponible) {
      let suivants = [...suivantsLiens]
      if (navId) {
        for (let i = 0; i < suivants.length; i += 1) {
          const lien = suivants[i]
          if (lien.source === 'nav') continue
          const cible = normaliserCibleLien(lien.target)
          const cree = await createNavigationItem({
            navigationId: navId,
            label: typeof lien.label === 'string' ? { fr: lien.label, en: '' } : lien.label,
            targetType: cible.startsWith('http') ? 'url' : 'anchor',
            targetValue: cible,
            position: i,
            visible: lien.visible,
            isCta: lien.isCta,
          })
          if (!cree.ok) {
            setErreur('Ce lien n’a pas pu être ajouté.')
            setNavAjoutBloque(true)
            setStatut('idle')
            throw new Error('L’enregistrement de l’apparence n’a pas abouti. Réessayez avant de publier.')
          }
          const adopte: LienChrome = {
            id: cree.data.id,
            label: cree.data.label,
            target: cree.data.targetValue ?? cible,
            visible: cree.data.visible,
            isCta: cree.data.isCta,
            source: 'nav',
          }
          suivants[i] = adopte
          const idLocal = lien.id
          ignorerProchain.current = true
          setLiens((prev) => prev.map((l) => (l.id === idLocal ? adopte : l)))
          if (ticket !== sauvegardeRef.current) return
        }
      }
      const idsNav = suivants.filter((l) => l.source === 'nav').map((l) => l.id)
      if (idsNav.length > 0) {
        const ordre = await reorderNavigationItems(idsNav)
        if (!ordre.ok) {
          setErreur('L’ordre des liens n’a pas pu être enregistré.')
          setStatut('idle')
          throw new Error('L’enregistrement de l’apparence n’a pas abouti. Réessayez avant de publier.')
        }
      }
      for (const lien of suivants) {
        if (lien.source !== 'nav') continue
        const cible = normaliserCibleLien(lien.target)
        const maj = await updateNavigationItem(lien.id, {
          label: typeof lien.label === 'string' ? { fr: lien.label, en: '' } : lien.label,
          targetType: cible.startsWith('http') ? 'url' : 'anchor',
          targetValue: cible,
          visible: lien.visible,
          isCta: lien.isCta,
        })
        if (!maj.ok) {
          setErreur('Un lien du menu n’a pas pu être enregistré.')
          setStatut('idle')
          throw new Error('L’enregistrement de l’apparence n’a pas abouti. Réessayez avant de publier.')
        }
      }
    }
    onRestaurantResolved(suivantRestau)
    setErreur(null)
    setStatut('saved')
  }, [chrome, navDisponible, navId, onRestaurantResolved, onLiensChange])

  useEffect(() => {
    if (!restau || chargement) return
    if (ignorerProchain.current) {
      ignorerProchain.current = false
      return
    }
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      void ecrire(restau, liens, presentation).catch(() => {})
    }, 900)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [restau, liens, presentation, chargement, ecrire])

  useEffect(() => {
    const vider = async () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      const etat = etatRef.current
      if (!etat.restau) return
      await ecrire(etat.restau, etat.liens, etat.presentation)
    }
    const retirer = registerRestaurantDraftFlush(vider)
    return () => {
      void vider().catch(() => {})
      retirer()
    }
  }, [ecrire])

  useEffect(() => {
    if (chargement) return
    onLiensChange?.(liens)
  }, [liens, chargement, onLiensChange])

  const patchLien = (id: string, patch: Partial<LienChrome>) => {
    setLiens((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const appliquerLiens = (suivants: LienChrome[]) => {
    setLiens(suivants)
  }

  const liensMenu = liens.filter((l) => !l.isCta)
  const lienCta = liens.find((l) => l.isCta)

  const ajouterLien = () => {
    if (navAjoutBloque) return
    if (liensMenu.length >= PLAFOND_LIENS_CHROME) return
    void (async () => {
      const nouveau = nouveauLienChrome(liens)
      if (navDisponible && navId) {
        const cree = await createNavigationItem({
          navigationId: navId,
          label: typeof nouveau.label === 'string' ? { fr: nouveau.label, en: '' } : nouveau.label,
          targetType: 'anchor',
          targetValue: nouveau.target,
          position: liensMenu.length,
          visible: true,
          isCta: false,
        })
        if (!cree.ok) {
          setErreur('Ce lien n’a pas pu être ajouté.')
          setNavAjoutBloque(true)
          return
        }
        nouveau.id = cree.data.id
        nouveau.source = 'nav'
      }
      ignorerProchain.current = nouveau.source === 'nav'
      appliquerLiens([...liens.filter((l) => !l.isCta), nouveau, ...liens.filter((l) => l.isCta)])
    })()
  }

  const deplacerLien = (id: string, delta: number) => {
    const index = liensMenu.findIndex((l) => l.id === id)
    const vers = index + delta
    if (index < 0 || vers < 0 || vers >= liensMenu.length) return
    const suivants = [...liensMenu]
    const [deplace] = suivants.splice(index, 1)
    suivants.splice(vers, 0, deplace)
    appliquerLiens([...suivants, ...liens.filter((l) => l.isCta)])
  }

  const retirerLien = async (id: string) => {
    const cible = liens.find((l) => l.id === id)
    if (!cible || cible.isCta) return
    if (cible.source === 'nav') {
      const ok = await deleteNavigationItem(id)
      if (!ok.ok) {
        setErreur('Ce lien n’a pas pu être retiré.')
        return
      }
    }
    appliquerLiens(liens.filter((l) => l.id !== id))
  }

  const patchPres = (patch: ChromePresentation) => {
    presentationTouchee.current = true
    const suivant = fusionnerPresentation(presentation, patch)
    setPresentation(suivant)
    onPresentationChange?.(suivant)
  }

  if (chargement || !restau) {
    return (
      <div style={{ padding: '0 12px 12px' }}>
        <div style={titreColonne(t)}>{titre}</div>
        <p style={{ fontSize: 14, color: t.muted }}>Chargement…</p>
      </div>
    )
  }

  const blocLiens = (
    <>
      <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.4, margin: '0 0 8px' }}>
        {chrome === 'header'
          ? 'Chaque ligne a un nom et une page du site. Le bouton Réserver reste à part.'
          : 'Liens affichés dans le pied de page.'}
      </p>
      <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.4, margin: '0 0 10px' }}>
        {liensMenu.length}/{PLAFOND_LIENS_CHROME} liens
      </p>
      {liensMenu.length === 0 && (
        <p style={{ fontSize: 13, color: t.muted, lineHeight: 1.45, margin: '0 0 10px' }}>
          Aucun lien — Ajouter un lien
        </p>
      )}
      {navAjoutBloque && (
        <p role="status" style={{ fontSize: 13, color: t.accent, margin: '0 0 10px' }}>
          L’ajout de liens n’est pas disponible pour ce menu.
        </p>
      )}
      {liensMenu.map((lien, index) => (
        <CarteLien
          key={lien.id}
          lien={lien}
          index={index}
          total={liensMenu.length}
          locale={locale}
          onPatch={(patch) => patchLien(lien.id, patch)}
          onMonter={() => deplacerLien(lien.id, -1)}
          onDescendre={() => deplacerLien(lien.id, 1)}
          onRetirer={() => { void retirerLien(lien.id) }}
        />
      ))}
      {!navAjoutBloque && liensMenu.length < PLAFOND_LIENS_CHROME && (
        <Bouton etendu genre="secondaire" onClick={ajouterLien} style={{ marginTop: 4 }}>
          {Icon.plus(16, t.primary)} Ajouter un lien
        </Bouton>
      )}
    </>
  )

  const blocCta = chrome === 'header' && lienCta ? (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${t.shadow}` }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: t.heading, margin: '0 0 8px' }}>Bouton Réserver</p>
      <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.4, margin: '0 0 8px' }}>
        Ce bouton reste à droite du menu. Ce n’est pas un lien de plus dans la liste.
      </p>
      <FieldLabel htmlFor={`lien-lib-${lienCta.id}`}>Nom du bouton</FieldLabel>
      <div style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>
        {locale === 'fr' ? 'Texte en français' : 'Text in English'}
      </div>
      <input
        id={`lien-lib-${lienCta.id}`}
        value={typeof lienCta.label === 'string' ? (locale === 'fr' ? lienCta.label : '') : (lienCta.label[locale] ?? '')}
        onChange={(e) => {
          const actuel = typeof lienCta.label === 'string' ? { fr: lienCta.label, en: '' } : { fr: '', en: '', ...lienCta.label }
          patchLien(lienCta.id, { label: { ...actuel, [locale]: e.target.value } })
        }}
        style={{ ...inputStyle(t), marginBottom: 8 }}
        {...anneauFocus(t)}
      />
      <FieldLabel htmlFor={`lien-cib-${lienCta.id}`}>Page du site</FieldLabel>
      <select
        id={`lien-cib-${lienCta.id}`}
        value={normaliserCibleLien(lienCta.target)}
        onChange={(e) => patchLien(lienCta.id, { target: e.target.value })}
        style={{ ...inputStyle(t), cursor: 'pointer' }}
        {...anneauFocus(t)}
      >
        {optionsCible(lienCta.target).map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>
    </div>
  ) : null

  return (
    <div style={{ padding: '0 12px 12px' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={titreColonne(t)}>{titre}</div>
        <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.5 }}>{description}</div>
        {onOuvrirApparence ? (
          <Bouton
            genre="silencieux"
            onClick={onOuvrirApparence}
            style={{ marginTop: 8, padding: 0, height: 'auto', minHeight: 44, justifyContent: 'flex-start', color: t.primary }}
          >
            Polices : Thème & ambiance
          </Bouton>
        ) : (
          <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.45, margin: '8px 0 0' }}>
            Polices : Thème & ambiance
          </p>
        )}
        <div role="status" style={{ fontSize: 12, color: t.muted, marginTop: 8 }}>
          {statut === 'saving' ? 'Enregistrement…' : statut === 'saved' ? 'Enregistré' : ''}
        </div>
        {erreur && <p role="alert" style={{ fontSize: 13, color: t.accent }}>{erreur}</p>}
      </div>

      {chrome === 'header' ? (
        <>
          <PresentationEntete presentation={presentation} onPatch={patchPres} />
          <TiroirInspecteur id="contenu-entete" titre="Contenu" icone="write" ouvertParDefaut>
            <FieldLabel htmlFor={`chrome-nom-${chrome}`}>Nom du restaurant</FieldLabel>
            <div style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>
              {locale === 'fr' ? 'Texte en français' : 'Text in English'}
            </div>
            <input
              id={`chrome-nom-${chrome}`}
              value={texteLocale(restau.name, locale)}
              onChange={(e) => setRestau({ ...restau, name: bilingue(restau.name, locale, e.target.value) })}
              style={{ ...inputStyle(t), marginBottom: 14 }}
              {...anneauFocus(t)}
            />
            <ChampLogo
              presentation={presentation}
              nom={texteLocale(restau.name, locale) || 'Greatlife'}
              onPatch={patchPres}
            />
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${t.shadow}` }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: t.heading, margin: '0 0 8px' }}>Liens du menu</p>
              {blocLiens}
            </div>
            {blocCta}
          </TiroirInspecteur>
          <CouleursEntete presentation={presentation} onPatch={patchPres} />
          <TiroirInspecteur id="effets-entete" titre="Effets" icone="eye" ouvertParDefaut={false}>
            <EffetsEntete presentation={presentation} onPatch={patchPres} />
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${t.shadow}` }}>
              <BarreAnnonce presentation={presentation} locale={locale} onPatch={patchPres} />
            </div>
          </TiroirInspecteur>
        </>
      ) : (
        <>
          <PresentationPied presentation={presentation} onPatch={patchPres} />
          <TiroirInspecteur id="contenu-pied" titre="Contenu" icone="write" ouvertParDefaut>
            <FieldLabel htmlFor={`chrome-nom-${chrome}`}>Nom du restaurant</FieldLabel>
            <div style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>
              {locale === 'fr' ? 'Texte en français' : 'Text in English'}
            </div>
            <input
              id={`chrome-nom-${chrome}`}
              value={texteLocale(restau.name, locale)}
              onChange={(e) => setRestau({ ...restau, name: bilingue(restau.name, locale, e.target.value) })}
              style={{ ...inputStyle(t), marginBottom: 14 }}
              {...anneauFocus(t)}
            />
            <FieldLabel htmlFor="chrome-slogan">Phrase d’accroche</FieldLabel>
            <textarea
              id="chrome-slogan"
              value={texteLocale(restau.slogan, locale)}
              onChange={(e) => setRestau({ ...restau, slogan: bilingue(restau.slogan, locale, e.target.value) })}
              rows={3}
              style={{ ...inputStyle(t), resize: 'vertical', minHeight: 72, marginBottom: 14, fontSize: 13 }}
              {...anneauFocus(t)}
            />
            <div style={{ marginTop: 8, paddingTop: 12, borderTop: `1px solid ${t.shadow}` }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: t.heading, margin: '0 0 8px' }}>Liens</p>
              {blocLiens}
            </div>
          </TiroirInspecteur>
          <TiroirInspecteur id="coordonnees-pied" titre="Coordonnées" icone="pin" ouvertParDefaut={false}>
            <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.4, margin: '0 0 8px' }}>
              Les mêmes que partout ailleurs sur le site.
            </p>
            <FieldLabel htmlFor="chrome-adresse">Adresse</FieldLabel>
            <input
              id="chrome-adresse"
              value={texteLocale(restau.address, locale)}
              onChange={(e) => setRestau({ ...restau, address: bilingue(restau.address, locale, e.target.value) })}
              style={{ ...inputStyle(t), marginBottom: 10 }}
              {...anneauFocus(t)}
            />
            <FieldLabel htmlFor="chrome-horaires">Horaires</FieldLabel>
            <input
              id="chrome-horaires"
              value={texteLocale(restau.hours, locale)}
              onChange={(e) => setRestau({ ...restau, hours: bilingue(restau.hours, locale, e.target.value) })}
              style={{ ...inputStyle(t), marginBottom: 10 }}
              {...anneauFocus(t)}
            />
            <FieldLabel htmlFor="chrome-tel">Téléphone</FieldLabel>
            <input
              id="chrome-tel"
              value={restau.phone}
              onChange={(e) => setRestau({ ...restau, phone: e.target.value })}
              style={{ ...inputStyle(t), marginBottom: 10 }}
              {...anneauFocus(t)}
            />
            <FieldLabel htmlFor="chrome-mail">E-mail</FieldLabel>
            <input
              id="chrome-mail"
              value={restau.emailContact}
              onChange={(e) => setRestau({ ...restau, emailContact: e.target.value })}
              style={{ ...inputStyle(t), marginBottom: 14 }}
              {...anneauFocus(t)}
            />
            <p style={{ fontSize: 13, fontWeight: 700, color: t.heading, margin: '0 0 8px' }}>Réseaux</p>
            <FieldLabel htmlFor="chrome-fb">Facebook</FieldLabel>
            <input
              id="chrome-fb"
              value={restau.social.facebook}
              onChange={(e) => setRestau({ ...restau, social: { ...restau.social, facebook: e.target.value } })}
              style={{ ...inputStyle(t), marginBottom: 10 }}
              {...anneauFocus(t)}
            />
            <FieldLabel htmlFor="chrome-ig">Instagram</FieldLabel>
            <input
              id="chrome-ig"
              value={restau.social.instagram}
              onChange={(e) => setRestau({ ...restau, social: { ...restau.social, instagram: e.target.value } })}
              style={{ ...inputStyle(t), marginBottom: 10 }}
              {...anneauFocus(t)}
            />
            <FieldLabel htmlFor="chrome-wa">WhatsApp</FieldLabel>
            <input
              id="chrome-wa"
              value={restau.social.whatsapp}
              onChange={(e) => setRestau({ ...restau, social: { ...restau.social, whatsapp: e.target.value } })}
              style={{ ...inputStyle(t) }}
              {...anneauFocus(t)}
            />
          </TiroirInspecteur>
          <CouleursPied presentation={presentation} onPatch={patchPres} />
          <TiroirInspecteur id="effets-pied" titre="Effets" icone="eye" ouvertParDefaut={false}>
            <EffetsPied presentation={presentation} onPatch={patchPres} />
          </TiroirInspecteur>
        </>
      )}
    </div>
  )
}

function PresentationEntete({
  presentation,
  onPatch,
}: {
  presentation: ChromePresentation
  onPatch: (patch: ChromePresentation) => void
}) {
  const { theme: t } = useSite()
  const layout = presentation.header?.layout ?? 'logoLeft'
  const overlay = presentation.header?.overlay

  return (
    <TiroirInspecteur id="modele-entete" titre="Modèle" icone="columns" ouvertParDefaut>
      <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.4, margin: '0 0 8px' }}>
        Choisissez comment le nom et le menu se placent.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        {HEADER_LAYOUTS.map((item) => (
          <Bouton
            key={item.id}
            etendu
            genre={layout === item.id ? 'actif' : 'secondaire'}
            aria-pressed={layout === item.id}
            title={item.help}
            onClick={() => onPatch({ header: { layout: item.id } })}
            style={{ height: 'auto', minHeight: CIBLE, justifyContent: 'flex-start', padding: '8px 12px', textAlign: 'left' }}
          >
            <MiniEntete modele={item.id} actif={layout === item.id} />
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span>{item.label}</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: t.muted }}>{item.help}</span>
            </span>
          </Bouton>
        ))}
      </div>
      <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.4, margin: '12px 0 8px' }}>
        Placement par rapport à la bannière. Sans choix, l’en-tête suit la mise en page de la page.
      </p>
      <div role="group" aria-label="Placement" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {HEADER_OVERLAYS.map((item) => (
          <Bouton
            key={item.id}
            etendu
            genre={overlay === item.id ? 'actif' : 'secondaire'}
            aria-pressed={overlay === item.id}
            title={item.help}
            onClick={() => onPatch({ header: { overlay: item.id } })}
            style={{ height: 'auto', minHeight: CIBLE, justifyContent: 'flex-start', whiteSpace: 'normal', textAlign: 'left' }}
          >
            {item.label}
          </Bouton>
        ))}
      </div>
    </TiroirInspecteur>
  )
}

function CouleursEntete({
  presentation,
  onPatch,
}: {
  presentation: ChromePresentation
  onPatch: (patch: ChromePresentation) => void
}) {
  const { theme: t } = useSite()
  const schemes = schemesDepuisTheme(t)
  const schemeId = presentation.header?.scheme ?? 'surface'

  return (
    <TiroirInspecteur id="couleurs-entete" titre="Couleurs" icone="palette" ouvertParDefaut={false}>
      <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.4, margin: '0 0 8px' }}>
        Jeux tirés de l’apparence du site. Seuls les couples assez contrastés sont proposés.
      </p>
      <div role="listbox" aria-label="Couleurs de l’en-tête" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {schemes.map((s) => {
          const actif = schemeId === s.id
          return (
            <Bouton
              key={s.id}
              genre={actif ? 'actif' : 'secondaire'}
              aria-pressed={actif}
              aria-label={s.label}
              title={s.label}
              onClick={() => onPatch({ header: { scheme: s.id } })}
              style={{ height: 'auto', minHeight: CIBLE, padding: '6px 10px', gap: 8 }}
            >
              <span aria-hidden="true" style={{
                width: 22, height: 22, borderRadius: 99, flexShrink: 0,
                background: s.bg, border: `2px solid ${s.accent}`, boxShadow: `inset 0 0 0 3px ${s.text}`,
              }} />
              {s.label}
            </Bouton>
          )
        })}
      </div>
      <TiroirInspecteur id="teintes-entete" titre="Teintes précises" ouvertParDefaut={false}>
        <LeviersCouleurEntete presentation={presentation} onPatch={onPatch} />
      </TiroirInspecteur>
    </TiroirInspecteur>
  )
}

function EffetsEntete({
  presentation,
  onPatch,
}: {
  presentation: ChromePresentation
  onPatch: (patch: ChromePresentation) => void
}) {
  const collant = presentation.header?.stick !== 'static'
  const effet = presentation.header?.effect ?? 'blur'
  return (
    <>
      <div role="group" aria-label="Effet visuel" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {CHROME_EFFECTS.map((item) => (
          <Bouton
            key={item.id}
            genre={effet === item.id ? 'actif' : 'secondaire'}
            aria-pressed={effet === item.id}
            onClick={() => onPatch({ header: { effect: item.id } })}
          >
            {item.label}
          </Bouton>
        ))}
      </div>
      <Bouton
        etendu
        genre={collant ? 'actif' : 'secondaire'}
        aria-pressed={collant}
        onClick={() => onPatch({ header: { stick: collant ? 'static' : 'stick' } })}
        style={{ justifyContent: 'flex-start' }}
      >
        Reste visible en descendant
      </Bouton>
    </>
  )
}

function PresentationPied({
  presentation,
  onPatch,
}: {
  presentation: ChromePresentation
  onPatch: (patch: ChromePresentation) => void
}) {
  const { theme: t } = useSite()
  const layout = presentation.footer?.layout ?? 'columns'

  return (
    <TiroirInspecteur id="modele-pied" titre="Modèle" icone="columns" ouvertParDefaut>
      <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.4, margin: '0 0 8px' }}>
        Colonnes, centré, ou un gros bandeau avec les réseaux.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FOOTER_LAYOUTS.map((item) => (
          <Bouton
            key={item.id}
            etendu
            genre={layout === item.id ? 'actif' : 'secondaire'}
            aria-pressed={layout === item.id}
            title={item.help}
            onClick={() => onPatch({ footer: { layout: item.id } })}
            style={{ height: 'auto', minHeight: CIBLE, justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal' }}
          >
            {item.label}
          </Bouton>
        ))}
      </div>
    </TiroirInspecteur>
  )
}

function CouleursPied({
  presentation,
  onPatch,
}: {
  presentation: ChromePresentation
  onPatch: (patch: ChromePresentation) => void
}) {
  const { theme: t } = useSite()
  const schemes = schemesDepuisTheme(t)
  const schemeId = presentation.footer?.scheme ?? 'ink'

  return (
    <TiroirInspecteur id="couleurs-pied" titre="Couleurs" icone="palette" ouvertParDefaut={false}>
      <div role="listbox" aria-label="Couleurs du pied" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {schemes.map((s) => {
          const actif = schemeId === s.id
          return (
            <Bouton
              key={s.id}
              genre={actif ? 'actif' : 'secondaire'}
              aria-pressed={actif}
              aria-label={s.label}
              onClick={() => onPatch({ footer: { scheme: s.id } })}
              style={{ height: 'auto', minHeight: CIBLE, padding: '6px 10px', gap: 8 }}
            >
              <span aria-hidden="true" style={{
                width: 22, height: 22, borderRadius: 99, flexShrink: 0,
                background: s.bg, border: `2px solid ${s.accent}`, boxShadow: `inset 0 0 0 3px ${s.text}`,
              }} />
              {s.label}
            </Bouton>
          )
        })}
      </div>
      <TiroirInspecteur id="teintes-pied" titre="Teintes précises" ouvertParDefaut={false}>
        <LeviersCouleurPied presentation={presentation} onPatch={onPatch} />
      </TiroirInspecteur>
    </TiroirInspecteur>
  )
}

function EffetsPied({
  presentation,
  onPatch,
}: {
  presentation: ChromePresentation
  onPatch: (patch: ChromePresentation) => void
}) {
  const effet = presentation.footer?.effect ?? 'none'
  return (
    <div role="group" aria-label="Effet visuel" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {FOOTER_EFFECTS.map((item) => (
        <Bouton
          key={item.id}
          genre={effet === item.id ? 'actif' : 'secondaire'}
          aria-pressed={effet === item.id}
          onClick={() => onPatch({ footer: { effect: item.id } })}
        >
          {item.label}
        </Bouton>
      ))}
    </div>
  )
}

function LeviersCouleurEntete({
  presentation,
  onPatch,
}: {
  presentation: ChromePresentation
  onPatch: (patch: ChromePresentation) => void
}) {
  const { theme: t } = useSite()
  const c = couleursEntete(t, presentation)
  const h = presentation.header
  return (
    <>
      <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.4, margin: '0 0 10px' }}>
        Chaque élément peut suivre l’apparence, ou prendre une couleur à part.
      </p>
      <ColorControl
        label="Fond"
        value={h?.bg}
        inherited={c.bg}
        against={c.text}
        onChange={(v) => onPatch({ header: { bg: v } })}
      />
      <ColorControl
        label="Texte et liens"
        value={h?.text}
        inherited={c.text}
        against={c.bg}
        onChange={(v) => onPatch({ header: { text: v } })}
      />
      <ColorControl
        label="Lien actif"
        value={h?.accent}
        inherited={c.accent}
        against={c.bg}
        onChange={(v) => onPatch({ header: { accent: v } })}
      />
      <ColorControl
        label="Fond du bouton Réserver"
        value={h?.ctaBg}
        inherited={c.ctaBg}
        against={c.ctaText}
        onChange={(v) => onPatch({ header: { ctaBg: v } })}
      />
      <ColorControl
        label="Texte du bouton Réserver"
        value={h?.ctaText}
        inherited={c.ctaText}
        against={c.ctaBg}
        onChange={(v) => onPatch({ header: { ctaText: v } })}
      />
    </>
  )
}

function LeviersCouleurPied({
  presentation,
  onPatch,
}: {
  presentation: ChromePresentation
  onPatch: (patch: ChromePresentation) => void
}) {
  const { theme: t } = useSite()
  const c = couleursPied(t, presentation)
  const f = presentation.footer
  return (
    <>
      <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.4, margin: '0 0 10px' }}>
        Chaque élément peut suivre l’apparence, ou prendre une couleur à part.
      </p>
      <ColorControl
        label="Fond"
        value={f?.bg}
        inherited={c.bg}
        against={c.text}
        onChange={(v) => onPatch({ footer: { bg: v } })}
      />
      <ColorControl
        label="Texte"
        value={f?.text}
        inherited={c.text}
        against={c.bg}
        onChange={(v) => onPatch({ footer: { text: v } })}
      />
      <ColorControl
        label="Liens"
        value={f?.links}
        inherited={c.links}
        against={c.bg}
        onChange={(v) => onPatch({ footer: { links: v } })}
      />
      <ColorControl
        label="Réseaux"
        value={f?.social}
        inherited={c.social}
        against={c.bg}
        onChange={(v) => onPatch({ footer: { social: v } })}
      />
      <ColorControl
        label="Survol"
        value={f?.accent}
        inherited={c.accent}
        against={c.bg}
        onChange={(v) => onPatch({ footer: { accent: v } })}
      />
    </>
  )
}

function MiniEntete({ modele, actif }: { modele: 'logoLeft' | 'logoCenter' | 'compact'; actif: boolean }) {
  const { theme: t } = useSite()
  const barre = actif ? t.primary : t.muted
  return (
    <span aria-hidden="true" style={{
      width: 44, height: 28, borderRadius: 6, flexShrink: 0,
      border: `1px solid ${t.shadow}`, background: t.surfaceAlt,
      display: 'flex', flexDirection: 'column', justifyContent: modele === 'logoCenter' ? 'space-between' : 'center',
      padding: modele === 'compact' ? '4px 5px' : '5px',
      boxSizing: 'border-box',
    }}>
      {modele === 'logoCenter' ? (
        <>
          <span style={{ height: 4, width: '40%', background: barre, borderRadius: 2, margin: '0 auto', display: 'block' }} />
          <span style={{ height: 3, width: '80%', background: barre, opacity: 0.45, borderRadius: 2, margin: '0 auto', display: 'block' }} />
        </>
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ height: modele === 'compact' ? 3 : 4, width: '28%', background: barre, borderRadius: 2, display: 'block' }} />
          <span style={{ height: 3, width: '48%', background: barre, opacity: 0.4, borderRadius: 2, display: 'block' }} />
        </span>
      )}
    </span>
  )
}

function ChampLogo({
  presentation,
  nom,
  onPatch,
}: {
  presentation: ChromePresentation
  nom: string
  onPatch: (patch: ChromePresentation) => void
}) {
  const { theme: t, media } = useSite()
  const actuel = presentation.header?.logoUrl?.trim() ?? ''
  const taille = presentation.header?.logoSize ?? 'normal'
  const photos = media.filter((m) => m.url && (m.content_type?.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(m.url)))
  return (
    <>
      <FieldLabel htmlFor={photos.length > 0 ? 'chrome-logo-photo' : 'chrome-logo-url'}>Image du logo</FieldLabel>
      <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.4, margin: '0 0 8px' }}>
        Sans image, le nom du restaurant s’affiche.
      </p>
      {photos.length > 0 && (
        <select
          id="chrome-logo-photo"
          value={photos.some((m) => m.url === actuel) ? actuel : ''}
          onChange={(e) => { if (e.target.value) onPatch({ header: { logoUrl: e.target.value } }) }}
          style={{ ...inputStyle(t), cursor: 'pointer', marginBottom: 8 }}
          {...anneauFocus(t)}
        >
          <option value="">Choisir une photo déjà téléversée</option>
          {photos.map((m) => (
            <option key={m.id || m.url} value={m.url}>{m.filename || m.slot}</option>
          ))}
        </select>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <input
          id="chrome-logo-url"
          value={actuel}
          onChange={(e) => onPatch({ header: { logoUrl: e.target.value } })}
          style={{ ...inputStyle(t), marginBottom: 0, flex: 1 }}
          placeholder="Ou coller l’adresse d’une image…"
          {...anneauFocus(t)}
        />
        {actuel ? (
          <Bouton
            carre
            genre="danger"
            aria-label="Retirer le logo"
            title="Retirer le logo"
            onClick={() => onPatch({ header: { logoUrl: '' } })}
          >
            {Icon.trash(16, t.accent)}
          </Bouton>
        ) : null}
      </div>
      {actuel ? (
        <img
          src={actuel}
          alt={nom}
          style={{ height: 40, width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block', marginBottom: 12 }}
        />
      ) : null}
      <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.4, margin: '0 0 8px' }}>Taille</p>
      <div role="group" aria-label="Taille du logo" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {LOGO_TAILLES.map((item) => (
          <Bouton
            key={item.id}
            genre={taille === item.id ? 'actif' : 'secondaire'}
            aria-pressed={taille === item.id}
            onClick={() => onPatch({ header: { logoSize: item.id } })}
          >
            {item.label}
          </Bouton>
        ))}
      </div>
    </>
  )
}

function BarreAnnonce({
  presentation,
  locale,
  onPatch,
}: {
  presentation: ChromePresentation
  locale: Locale
  onPatch: (patch: ChromePresentation) => void
}) {
  const { theme: t } = useSite()
  const a = presentation.header?.announcement
  const visible = a?.visible === true
  const message = texteLocale(a?.message ?? { fr: '', en: '' }, locale)
  const teintes = couleursAnnonce(t, presentation)
  return (
    <>
      <p style={{ fontSize: 13, fontWeight: 700, color: t.heading, margin: '0 0 8px' }}>Barre d’annonce</p>
      <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.4, margin: '0 0 10px' }}>
        Bandeau optionnel au-dessus du menu. Un texte court, un lien vers une page du site.
      </p>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: t.text, marginBottom: 14, minHeight: CIBLE }}>
        <Switch id="chrome-annonce-visible" checked={visible} onCheckedChange={(v) => onPatch({ header: { announcement: { visible: v } } })} aria-label="Afficher la barre" />
        Afficher la barre
      </label>
      {visible && (
        <>
          <FieldLabel htmlFor="chrome-annonce-texte">Texte</FieldLabel>
          <div style={{ fontSize: 12, color: t.muted, marginBottom: 4 }}>
            {locale === 'fr' ? 'Texte en français' : 'Text in English'}
          </div>
          <input
            id="chrome-annonce-texte"
            value={message}
            onChange={(e) => onPatch({ header: { announcement: { message: bilingue(a?.message ?? { fr: '', en: '' }, locale, e.target.value) } } })}
            style={{ ...inputStyle(t), marginBottom: 14 }}
            placeholder="Ex. Livraison offerte ce week-end"
            {...anneauFocus(t)}
          />
          <FieldLabel htmlFor="chrome-annonce-lien">Lien</FieldLabel>
          <select
            id="chrome-annonce-lien"
            value={a?.link ?? ''}
            onChange={(e) => onPatch({ header: { announcement: { link: e.target.value as typeof ANNONCE_CIBLES[number]['id'] } } })}
            style={{ ...inputStyle(t), cursor: 'pointer', marginBottom: 14 }}
            {...anneauFocus(t)}
          >
            {ANNONCE_CIBLES.map((item) => (
              <option key={item.id || 'aucun'} value={item.id}>{item.label}</option>
            ))}
          </select>
          <TiroirInspecteur id="annonce-couleurs" titre="Couleurs de la barre" ouvertParDefaut={false}>
            <ColorControl
              label="Fond"
              value={a?.bg}
              inherited={teintes.bg}
              against={teintes.fg}
              onChange={(v) => onPatch({ header: { announcement: { bg: v } } })}
            />
            <ColorControl
              label="Texte"
              value={a?.fg}
              inherited={teintes.fg}
              against={teintes.bg}
              onChange={(v) => onPatch({ header: { announcement: { fg: v } } })}
            />
          </TiroirInspecteur>
        </>
      )}
    </>
  )
}
