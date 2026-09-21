/**
 * État de la « Console d’édition » (pastille du bandeau).
 *
 * Machine à priorité : le signal le plus grave gagne.
 *   probleme (rouge) > brouillon (jaune) > ok (vert)
 *
 * Vocabulaire restaurateur uniquement.
 */

export type EtatConsole = 'ok' | 'brouillon' | 'probleme'

export interface SignauxConsole {
  erreurSauvegarde: string | null
  erreurAction: string | null
  publicationBloquee: boolean
  enregistrementEnCours: boolean
  /** Contenu local pas encore écrit en base. */
  brouillonSale: boolean
  /** Brouillon (même enregistré) pas encore reflété sur le site public. */
  sitePasAJour: boolean
  pagePubliee: boolean
  avertissement: string | null
}

export interface PresentationConsole {
  etat: EtatConsole
  label: string
  title: string
  teinte: 'accent' | 'gold' | 'primary'
}

export function resoudreEtatConsole(s: SignauxConsole): PresentationConsole {
  const detailProbleme = premierTexte(s.erreurSauvegarde, s.erreurAction)

  if (detailProbleme || s.publicationBloquee) {
    return {
      etat: 'probleme',
      label: 'Problème',
      teinte: 'accent',
      title: detailProbleme
        ?? (s.publicationBloquee
          ? 'La mise en ligne est bloquée. Ouvrez Contrôle pour voir ce qui manque.'
          : 'Un problème empêche l’éditeur de fonctionner correctement.'),
    }
  }

  if (
    !s.pagePubliee
    || s.brouillonSale
    || s.sitePasAJour
    || s.enregistrementEnCours
    || Boolean(s.avertissement)
  ) {
    let title = 'Des changements ne sont pas encore sur le site.'
    if (s.enregistrementEnCours) {
      title = 'Enregistrement du brouillon…'
    } else if (s.avertissement) {
      title = s.avertissement
    } else if (s.brouillonSale) {
      title = 'Des changements ne sont pas encore enregistrés.'
    } else if (!s.pagePubliee) {
      title = 'Cette page est en brouillon. Publiez pour que les visiteurs la voient.'
    } else if (s.sitePasAJour) {
      title = 'Des changements ne sont pas encore sur le site. Cliquez « Mettre à jour le site ».'
    }
    return {
      etat: 'brouillon',
      label: 'Brouillon',
      teinte: 'gold',
      title,
    }
  }

  return {
    etat: 'ok',
    label: 'En ligne',
    teinte: 'primary',
    title: 'Le site public est à jour. Aucune modification en attente.',
  }
}

function premierTexte(...vals: Array<string | null | undefined>): string | null {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}
