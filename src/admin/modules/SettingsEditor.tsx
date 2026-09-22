import { useState, useEffect, useRef } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { Icon } from '@/lib/icons'
import { PageHeader, FieldLabel, inputStyle, GhostButton, PrimaryButton } from '@/admin/ui'
import { logAudit, saveSiteConfig } from '@/lib/repository'
import { Input } from '@/components/ui/input'
import { SETTING_KEYS, fetchSetting, platDepuisRestaurant } from '@/cms/repository/settings'
import { SaveBar, SectionTitle } from '@/admin/shared'

export function SettingsEditor() {
  const { content, setContent, theme: t, dataSource, saveContentFields, themeId, setThemeId, fontId, setFontId, visibility, setVisibility, rbacOverrides, setRbacOverridesState, saveRbac } = useSite()
  const { user } = useAuth()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErr, setSaveErr] = useState<string | undefined>(undefined)
  const [importStatus, setImportStatus] = useState<'idle' | 'busy' | 'ok' | 'error'>('idle')
  const [importErr, setImportErr] = useState<string | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)
  const identiteChargee = useRef(false)

  useEffect(() => {
    if (dataSource === 'loading' || identiteChargee.current) return
    let actif = true
    void fetchSetting(SETTING_KEYS.restaurant).then((res) => {
      if (!actif || !res.ok) return
      identiteChargee.current = true
      const identite = platDepuisRestaurant(res.data, {
        restaurantName: content.restaurantName,
        phone: content.phone,
        address: content.address,
        hours: content.hours,
        emailContact: content.emailContact,
        emailReservation: content.emailReservation,
        slogan: content.slogan,
      })
      setContent({
        ...content,
        restaurantName: identite.restaurantName ?? content.restaurantName,
        phone: identite.phone ?? content.phone,
        address: identite.address ?? content.address,
        hours: identite.hours ?? content.hours,
        emailContact: identite.emailContact ?? content.emailContact,
        emailReservation: identite.emailReservation ?? content.emailReservation,
      })
    })
    return () => { actif = false }
  }, [dataSource])

  const set = (k: string, v: string) => { setContent({ ...content, [k]: v }); setSaveStatus('idle'); setSaveErr(undefined) }
  const inp = inputStyle(t)
  const save = async () => {
    if (dataSource !== 'supabase') { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); return }
    setSaveStatus('saving'); setSaveErr(undefined)
    
    const res = await saveContentFields({
      restaurantName: content.restaurantName,
      currency: content.currency,
      phone: content.phone,
      address: content.address,
      hours: content.hours,
      socialFacebook: content.socialFacebook,
      socialInstagram: content.socialInstagram,
      socialWhatsapp: content.socialWhatsapp,
      emailContact: content.emailContact,
      emailReservation: content.emailReservation,
    })
    setSaveStatus(res.ok ? 'saved' : 'error'); setSaveErr(res.error)
    setTimeout(() => setSaveStatus('idle'), 4000)
  }
  const buildConfig = () => ({ content, themeId, fontId, visibility, rbacOverrides: rbacOverrides ?? undefined })
  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(buildConfig(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `greatlife-config-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const handleImport = async (file: File | undefined) => {
    if (!file) return
    setImportStatus('busy'); setImportErr(undefined)
    try {
      const text = await file.text()
      const cfg = JSON.parse(text) as { content?: typeof content; themeId?: string; fontId?: string; visibility?: typeof visibility; rbacOverrides?: typeof rbacOverrides }
      if (cfg.content) setContent(cfg.content)
      if (cfg.themeId) setThemeId(cfg.themeId)
      if (cfg.fontId) setFontId(cfg.fontId)
      if (cfg.visibility) setVisibility(cfg.visibility)
      if (cfg.rbacOverrides !== undefined) setRbacOverridesState(cfg.rbacOverrides ?? null)
      if (dataSource === 'supabase') {
        const res = await saveSiteConfig(buildConfig())
        if (res.ok && cfg.rbacOverrides !== undefined) await saveRbac(cfg.rbacOverrides ?? null)
        if (!res.ok) { setImportStatus('error'); setImportErr(res.error || 'Échec de l\'enregistrement'); setTimeout(() => setImportStatus('idle'), 4000); return }
        await logAudit({ actor: user?.email ?? '', action: 'import_config', target: 'site_config', detail: `Importé depuis ${file.name}` })
      }
      setImportStatus('ok'); setTimeout(() => setImportStatus('idle'), 3000)
    } catch {
      setImportStatus('error'); setImportErr('Fichier JSON invalide'); setTimeout(() => setImportStatus('idle'), 4000)
    }
    if (fileRef.current) fileRef.current.value = ''
  }
  return (
    <div className="admin-page" style={{ maxWidth: 960 }}>
      <PageHeader title="Réglages du restaurant" subtitle="Identité et coordonnées, appliquées sur tout le site."
        actions={<><SaveBar status={saveStatus} error={saveErr} /><PrimaryButton onClick={save}>Enregistrer</PrimaryButton></>}
      />
      <nav className="admin-settings-toc" aria-label="Sommaire des réglages">
        <a href="#reglages-identite" className="admin-filter-chip" style={{ textDecoration: 'none' }}>Identité</a>
        <a href="#reglages-localisation" className="admin-filter-chip" style={{ textDecoration: 'none' }}>Localisation</a>
        <a href="#reglages-reseaux" className="admin-filter-chip" style={{ textDecoration: 'none' }}>Réseaux</a>
        <a href="#reglages-notifications" className="admin-filter-chip" style={{ textDecoration: 'none' }}>Notifications</a>
      </nav>
      <div style={{ display: 'grid', gap: 24, marginTop: 8 }}>
        <section id="reglages-identite" className="admin-settings-section">
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.primary}>Identité</SectionTitle></div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><FieldLabel>Nom du restaurant</FieldLabel><Input value={content.restaurantName} onChange={e => set('restaurantName', e.target.value)} style={inp} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><FieldLabel>Devise</FieldLabel><Input value={content.currency} onChange={e => set('currency', e.target.value)} style={inp} placeholder="FG" /></div>
              <div><FieldLabel>Téléphone</FieldLabel><Input value={content.phone} onChange={e => set('phone', e.target.value)} style={inp} /></div>
            </div>
          </div>
        </section>
        <section id="reglages-localisation" className="admin-settings-section">
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.accent}>Localisation & horaires</SectionTitle></div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><FieldLabel>Adresse</FieldLabel><Input value={content.address} onChange={e => set('address', e.target.value)} style={inp} /></div>
            <div><FieldLabel>Horaires d'ouverture</FieldLabel><Input value={content.hours} onChange={e => set('hours', e.target.value)} style={inp} /></div>
          </div>
        </section>
        <section id="reglages-reseaux" className="admin-settings-section">
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.gold}>Réseaux sociaux</SectionTitle></div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><FieldLabel>Facebook (URL)</FieldLabel><Input value={content.socialFacebook} onChange={e => set('socialFacebook', e.target.value)} style={inp} placeholder="https://facebook.com/..." /></div>
            <div><FieldLabel>Instagram (URL)</FieldLabel><Input value={content.socialInstagram} onChange={e => set('socialInstagram', e.target.value)} style={inp} placeholder="https://instagram.com/..." /></div>
            <div><FieldLabel>WhatsApp (numéro ou lien)</FieldLabel><Input value={content.socialWhatsapp} onChange={e => set('socialWhatsapp', e.target.value)} style={inp} placeholder="+224 ..." /></div>
          </div>
        </section>
        <section id="reglages-notifications" className="admin-settings-section">
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.accent}>Destinataires & notifications</SectionTitle></div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div><FieldLabel>Destinataire — messages généraux</FieldLabel><Input value={content.emailContact} onChange={e => set('emailContact', e.target.value)} style={inp} placeholder="moelohimmara@gmail.com" /></div>
            <div><FieldLabel>Destinataire — réservations</FieldLabel><Input value={content.emailReservation} onChange={e => set('emailReservation', e.target.value)} style={inp} placeholder="moelohimmara@gmail.com" /></div>
            <div style={{ fontSize: '12px', color: t.muted, lineHeight: 1.5 }}>
              Chaque message, réservation ou commande du site notifie ces adresses, et le visiteur
              reçoit une auto-réponse (template dans « Formulaires & emails »).
            </div>
          </div>
        </section>
        <section className="admin-settings-section">
          <div style={{ marginBottom: 14 }}><SectionTitle color={t.primary}>Sauvegarde & transfert</SectionTitle></div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <GhostButton color={t.primary} onClick={exportConfig}>{Icon.arrow(13, t.primary)} Exporter la configuration</GhostButton>
            <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={e => handleImport(e.target.files?.[0])} />
            <GhostButton color={t.accent} onClick={() => fileRef.current?.click()} disabled={importStatus === 'busy'}>{importStatus === 'busy' ? 'Import…' : 'Importer une configuration'}</GhostButton>
            {importStatus === 'ok' && <span className="admin-status-live is-ok" role="status">Importé</span>}
            {importStatus === 'error' && <span className="admin-status-live is-error" role="status" title={importErr}>{importErr}</span>}
          </div>
          <div style={{ fontSize: '12px', color: t.muted, marginTop: 10 }}>L'export contient le contenu, le thème, les polices et la visibilité. L'import remplace la configuration courante et l'enregistre dans Supabase.</div>
        </section>
      </div>
    </div>
  )
}

