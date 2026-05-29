import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { useUpdateProfile } from '../lib/queries'
import { LANGUAGES, useT, type Lang } from '../lib/i18n'
import { errorMessage, useToast } from './Toast'
import { Dialog } from './Dialog'
import { Field } from './Field'

interface Props {
  onClose: () => void
}

/**
 * Profielinstellingen voor de huidige gebruiker: naam wijzigen, taal
 * kiezen, role bekijken (read-only — promoten gebeurt door admin via
 * Settings → Gebruikers).
 */
export function ProfileDialog({ onClose }: Props) {
  const { t, lang, setLang } = useT()
  const { profile, user, refreshProfile } = useAuth()
  const update = useUpdateProfile()
  const toast = useToast()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    try {
      await update.mutateAsync({ id: profile.id, full_name: fullName.trim() })
      await refreshProfile()
      toast.success(t('profile.saved'))
      onClose()
    } catch (err) {
      toast.error(t('profile.saveFailed', { error: errorMessage(err) }))
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('profile.title')}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>{t('common.close')}</button>
          <button type="submit" form="profile-form" className="btn btn-primary" disabled={update.isPending}>
            {update.isPending ? '…' : t('common.save')}
          </button>
        </>
      }
    >
      <form id="profile-form" onSubmit={onSubmit} className="space-y-4">
        <div className="card !p-3 bg-paper/40">
          <div className="font-mono text-[10px] uppercase tracking-wider text-[--color-muted] mb-1">
            {t('profile.email')}
          </div>
          <div className="font-mono text-sm">{user?.email}</div>
        </div>

        <Field
          label={t('profile.fullName')}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoFocus
        />

        <div>
          <label className="field-label">{t('profile.language')}</label>
          <div className="flex gap-2 mt-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.value}
                type="button"
                className="chip"
                data-active={lang === l.value || undefined}
                onClick={() => setLang(l.value as Lang)}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
          <div className="font-mono text-[11px] text-[--color-muted] mt-1.5">
            {t('settings.language.note')}
          </div>
        </div>

        <div>
          <label className="field-label">{t('profile.role')}</label>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="chip"
              data-active
              style={{ background: profile?.role === 'admin' ? 'var(--color-brand)' : undefined, color: profile?.role === 'admin' ? 'var(--color-paper)' : undefined }}
            >
              {profile?.role === 'admin' ? t('profile.roleAdmin') : t('profile.roleSales')}
            </span>
            <span className="font-mono text-[11px] text-[--color-muted]">
              {t('profile.roleNote')}
            </span>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
