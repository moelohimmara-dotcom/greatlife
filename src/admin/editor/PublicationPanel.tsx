/**
 * Greatlife — CMS : panneau de publication
 * ========================================
 * Réunit les trois volets du Lot 3 :
 *   - le CONTRÔLE avant publication (les 7 vérifications du TDR §24) ;
 *   - l'affichage des MOTIFS qui bloquent, en langage restaurateur ;
 *   - l'HISTORIQUE des versions, avec l'action « Voir » (TDR §23).
 *
 * Ce panneau ne publie pas : la publication est déclenchée par le bouton de la
 * barre d'outils, qui passe par `publishPage` (contrôle → version → statut).
 * Ici on explique, on ne décide pas.
 */

import { useCallback, useEffect, useState } from 'react'
import type { CheckLevel, PublicationReport } from '@/cms/model/publishing'
import { getSectionDefinition } from '@/cms/model/sections/schemas'
import { checkPublication } from '@/cms/repository/publishing'
import {
  fetchVersion,
  fetchVersions,
  type PageVersionDetail,
  type PageVersionSummary,
} from '@/cms/repository/versions'
import {
  titreColonne,
  ADMIN_ACTIVE_BG,
  ADMIN_CORAL,
  ADMIN_FOREST,
  ADMIN_INK,
  ADMIN_LINE,
  ADMIN_MUTED,
  ADMIN_SAFFRON,
  ADMIN_SURFACE,
} from './chrome'
import { GhostButton } from '@/admin/ui'

interface PublicationPanelProps {
  pageId: string
  /** Rapport d'une tentative de publication bloquée : on montre exactement ce qui a bloqué. */
  blockedReport: PublicationReport | null
  onClose: () => void
}

export function PublicationPanel({ pageId, blockedReport, onClose }: PublicationPanelProps) {
  const [report, setReport] = useState<PublicationReport | null>(blockedReport)
  const [versions, setVersions] = useState<PageVersionSummary[]>([])
  const [detail, setDetail] = useState<PageVersionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [check, history] = await Promise.all([checkPublication(pageId), fetchVersions(pageId)])

    if (check.ok) setReport(check.data)
    else setError(check.error)

    if (history.ok) setVersions(history.data)
    setLoading(false)
  }, [pageId])

  useEffect(() => {
    void load()
  }, [load])

  // Une tentative bloquée fait autorité : elle vient d'être calculée.
  useEffect(() => {
    if (blockedReport) setReport(blockedReport)
  }, [blockedReport])

  const openVersion = useCallback(async (versionId: string) => {
    setError(null)
    const res = await fetchVersion(versionId)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setDetail(res.data)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span id="controle-publication-titre" style={{ fontFamily: 'var(--f-heading)', fontSize: 16, fontWeight: 700, color: ADMIN_INK, marginRight: 'auto' }}>
          Avant de publier
        </span>
        <GhostButton color={ADMIN_INK} disabled={loading} busy={loading} onClick={() => { void load() }}>
          {loading ? 'Vérification…' : 'Revérifier'}
        </GhostButton>
        <GhostButton color={ADMIN_INK} onClick={onClose}>Fermer</GhostButton>
      </div>

      {error && (
        <div style={{
          margin: '0 16px 10px', padding: '10px 12px', borderRadius: 8, fontSize: 13,
          background: 'color-mix(in srgb, var(--admin-coral) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--admin-coral) 40%, transparent)',
          color: ADMIN_CORAL,
        }}>
          {error}
        </div>
      )}

      {report && (
        <>
          <div style={{
            margin: '0 16px 12px', padding: '9px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: report.publishable ? ADMIN_ACTIVE_BG : 'color-mix(in srgb, var(--admin-coral) 12%, transparent)',
            border: `1px solid ${report.publishable ? 'color-mix(in srgb, var(--admin-forest) 33%, transparent)' : 'color-mix(in srgb, var(--admin-coral) 40%, transparent)'}`,
            color: report.publishable ? ADMIN_FOREST : ADMIN_CORAL,
          }}>
            {report.summary}
          </div>

          <div style={{ padding: '0 16px 16px' }}>
            {report.checks.map((check) => (
              <div key={check.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <span style={{ fontSize: 12, width: 12, flex: '0 0 12px', color: iconColor(check.level) }}>
                    {iconFor(check.level)}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: check.level === 'ok' || check.level === 'skipped' ? ADMIN_MUTED : ADMIN_INK }}>
                    {check.label}
                  </span>
                </div>
                {/* Pourquoi ce contrôle n'a pas été exécuté — dit franchement. */}
                {check.note && (
                  <div style={{ marginLeft: 19, marginTop: 3, fontSize: 11.5, color: ADMIN_MUTED, lineHeight: 1.45 }}>
                    {check.note}
                  </div>
                )}
                {check.findings.map((finding, index) => (
                  <div key={`${check.id}-${index}`} style={{ marginLeft: 19, marginTop: 3 }}>
                    <div style={{ fontSize: 12, color: finding.level === 'error' ? ADMIN_CORAL : ADMIN_SAFFRON, lineHeight: 1.45 }}>
                      {finding.message}
                    </div>
                    {finding.where && (
                      <div style={{ fontSize: 11, color: ADMIN_MUTED, marginTop: 1 }}>{finding.where}</div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ borderTop: `1px solid ${ADMIN_LINE}`, padding: '12px 16px 20px' }}>
        <div style={{ ...titreColonne(), marginBottom: 8 }}>
          Versions
        </div>

        {versions.length === 0 ? (
          <p style={{ fontSize: 12, color: ADMIN_MUTED, margin: 0, lineHeight: 1.5 }}>
            Aucune version pour l'instant. Une version est enregistrée à chaque publication : elle permet
            de retrouver un état antérieur du site.
          </p>
        ) : (
          versions.map((version) => (
            <div key={version.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: ADMIN_INK }}>
                  Version {version.version}
                </span>
                <span style={{ fontSize: 11, color: ADMIN_MUTED }}>
                  {formatDate(version.createdAt)}
                  {version.createdBy ? ` · ${version.createdBy}` : ''}
                </span>
                <GhostButton color={ADMIN_FOREST} onClick={() => { void openVersion(version.id) }} style={{ marginLeft: 'auto' }}>
                  Voir
                </GhostButton>
              </div>
              {version.note && (
                <div style={{ fontSize: 11, color: ADMIN_MUTED, marginTop: 2 }}>{version.note}</div>
              )}
            </div>
          ))
        )}
      </div>

      {detail && (
        <div style={{
          position: 'sticky', bottom: 0, borderTop: `1px solid ${ADMIN_LINE}`,
          background: ADMIN_SURFACE, padding: '12px 16px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: ADMIN_INK }}>
              Version {detail.summary.version}
            </span>
            <GhostButton color={ADMIN_INK} onClick={() => setDetail(null)} style={{ marginLeft: 'auto' }}>
              Fermer
            </GhostButton>
          </div>
          <div style={{ fontSize: 12, color: ADMIN_MUTED, lineHeight: 1.55 }}>
            <div>
              Titre enregistré : <strong style={{ color: ADMIN_INK }}>{resolveTitle(detail)}</strong>
            </div>
            <div>
              {detail.snapshot.sections.length} section
              {detail.snapshot.sections.length > 1 ? 's' : ''} dans cette version :
            </div>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {detail.snapshot.sections.map((section) => (
                <li key={section.id}>
                  {getSectionDefinition(section.type)?.label ?? section.type}
                  {section.visible ? '' : ' (masquée)'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- utilitaires

function iconFor(level: CheckLevel): string {
  if (level === 'ok') return '✓'
  if (level === 'skipped') return '–'
  return level === 'warning' ? '!' : '✕'
}

function iconColor(level: CheckLevel): string {
  if (level === 'ok') return ADMIN_FOREST
  if (level === 'skipped') return ADMIN_MUTED
  return level === 'warning' ? ADMIN_SAFFRON : ADMIN_CORAL
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function resolveTitle(detail: PageVersionDetail): string {
  const title = detail.snapshot.page.title
  if (typeof title === 'string') return title || '—'
  const value = title?.fr ?? title?.en
  return typeof value === 'string' && value ? value : '—'
}
