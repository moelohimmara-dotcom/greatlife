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
import { useSite } from '@/contexts/SiteContext'
import type { CheckLevel, PublicationReport } from '@/cms/model/publishing'
import { getSectionDefinition } from '@/cms/model/sections/schemas'
import { checkPublication } from '@/cms/repository/publishing'
import {
  fetchVersion,
  fetchVersions,
  type PageVersionDetail,
  type PageVersionSummary,
} from '@/cms/repository/versions'

interface PublicationPanelProps {
  pageId: string
  /** Rapport d'une tentative de publication bloquée : on montre exactement ce qui a bloqué. */
  blockedReport: PublicationReport | null
  onClose: () => void
}

export function PublicationPanel({ pageId, blockedReport, onClose }: PublicationPanelProps) {
  const { theme: t } = useSite()
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
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--f-heading)', fontSize: 14, fontWeight: 700, color: t.heading ?? t.text }}>
          Avant de publier
        </span>
        <button
          onClick={load}
          disabled={loading}
          style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '4px 10px',
            borderRadius: 6, border: `1px solid ${t.shadow}`, background: 'transparent',
            color: t.muted, cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? '…' : 'Revérifier'}
        </button>
        <button
          onClick={onClose}
          style={{
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
            border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted, cursor: 'pointer',
          }}
        >
          Fermer
        </button>
      </div>

      {error && (
        <div style={{
          margin: '0 16px 10px', padding: '8px 10px', borderRadius: 8, fontSize: 12,
          background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
        }}>
          {error}
        </div>
      )}

      {report && (
        <>
          <div style={{
            margin: '0 16px 12px', padding: '9px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: report.publishable ? `${t.primary}12` : '#fef2f2',
            border: `1px solid ${report.publishable ? `${t.primary}33` : '#fecaca'}`,
            color: report.publishable ? t.primary : '#b91c1c',
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
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: check.level === 'ok' || check.level === 'skipped' ? t.muted : t.text }}>
                    {check.label}
                  </span>
                </div>
                {/* Pourquoi ce contrôle n'a pas été exécuté — dit franchement. */}
                {check.note && (
                  <div style={{ marginLeft: 19, marginTop: 3, fontSize: 11.5, color: t.muted, lineHeight: 1.45 }}>
                    {check.note}
                  </div>
                )}
                {check.findings.map((finding, index) => (
                  <div key={`${check.id}-${index}`} style={{ marginLeft: 19, marginTop: 3 }}>
                    <div style={{ fontSize: 12, color: finding.level === 'error' ? '#b91c1c' : '#a16207', lineHeight: 1.45 }}>
                      {finding.message}
                    </div>
                    {finding.where && (
                      <div style={{ fontSize: 11, color: t.muted, marginTop: 1 }}>{finding.where}</div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ borderTop: `1px solid ${t.shadow}`, padding: '12px 16px 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
          Versions
        </div>

        {versions.length === 0 ? (
          <p style={{ fontSize: 12, color: t.muted, margin: 0, lineHeight: 1.5 }}>
            Aucune version pour l'instant. Une version est enregistrée à chaque publication : elle permet
            de retrouver un état antérieur du site.
          </p>
        ) : (
          versions.map((version) => (
            <div key={version.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>
                  Version {version.version}
                </span>
                <span style={{ fontSize: 11, color: t.muted }}>
                  {formatDate(version.createdAt)}
                  {version.createdBy ? ` — ${version.createdBy}` : ''}
                </span>
                <button
                  onClick={() => openVersion(version.id)}
                  style={{
                    marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                    border: `1px solid ${t.shadow}`, background: 'transparent', color: t.primary, cursor: 'pointer',
                  }}
                >
                  Voir
                </button>
              </div>
              {version.note && (
                <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{version.note}</div>
              )}
            </div>
          ))
        )}
      </div>

      {detail && (
        <div style={{
          position: 'sticky', bottom: 0, borderTop: `1px solid ${t.shadow}`,
          background: t.surface, padding: '12px 16px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>
              Version {detail.summary.version}
            </span>
            <button
              onClick={() => setDetail(null)}
              style={{
                marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                border: `1px solid ${t.shadow}`, background: 'transparent', color: t.muted, cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </div>
          <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.55 }}>
            <div>
              Titre enregistré : <strong style={{ color: t.text }}>{resolveTitle(detail)}</strong>
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
  if (level === 'ok') return '#16a34a'
  // Un contrôle NON VÉRIFIÉ n'est ni vert ni rouge : il est neutre. Le peindre
  // en vert laisserait croire qu'il a été exécuté et qu'il est conforme.
  if (level === 'skipped') return '#9ca3af'
  return level === 'warning' ? '#a16207' : '#b91c1c'
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
