import { useState, type FormEvent } from 'react'
import { Clock, MessageSquarePlus, RefreshCcw, FileText, Save } from 'lucide-react'
import { useActivities, useLogActivity } from '../lib/queries'
import { relativeTime } from '../lib/format'
import type { Activity } from '../lib/db'
import { stageLabel, useT, type Lang } from '../lib/i18n'

interface Props {
  opportunityId: string
}

const ICON: Record<string, typeof Clock> = {
  stage_change: RefreshCcw,
  note: MessageSquarePlus,
  order_saved: Save,
  quote_sent: FileText,
  quote_created: FileText,
}

export function ActivityTimeline({ opportunityId }: Props) {
  const { t } = useT()
  const { data: activities = [], isLoading } = useActivities(opportunityId)
  const log = useLogActivity()
  const [note, setNote] = useState('')

  async function addNote(e: FormEvent) {
    e.preventDefault()
    const text = note.trim()
    if (!text) return
    await log.mutateAsync({ opportunity_id: opportunityId, kind: 'note', message: text })
    setNote('')
  }

  return (
    <div className="space-y-3">
      <form onSubmit={addNote} className="flex gap-2">
        <input
          className="field-input flex-1"
          placeholder={t('activity.notePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button type="submit" className="btn" disabled={!note.trim() || log.isPending}>
          {log.isPending ? '…' : t('activity.post')}
        </button>
      </form>

      {isLoading ? <div className="text-[--color-muted] font-mono text-sm">{t('common.loading')}</div> : null}

      {activities.length === 0 && !isLoading ? (
        <div className="text-[--color-muted] font-mono text-sm py-6 text-center border border-dashed border-soft-2">
          {t('activity.emptyDashed')}
        </div>
      ) : null}

      <ol className="space-y-3">
        {activities.map((a) => <ActivityRow key={a.id} a={a} />)}
      </ol>
    </div>
  )
}

function ActivityRow({ a }: { a: Activity }) {
  const { t, lang } = useT()
  const Icon = ICON[a.kind] ?? Clock
  const locale = lang === 'en' ? 'en-GB' : 'nl-BE'
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 border border-ink bg-paper flex items-center justify-center shrink-0">
          <Icon size={13} />
        </div>
        <div className="w-px flex-1 bg-soft-2 mt-1" />
      </div>
      <div className="flex-1 pb-3">
        <div className="font-mono text-sm">{renderActivity(a, lang, t)}</div>
        <div className="font-mono text-[11px] text-[--color-muted] mt-0.5">
          {relativeTime(a.created_at, lang)} · {new Date(a.created_at).toLocaleString(locale)}
        </div>
      </div>
    </li>
  )
}

/**
 * Lokaliseer een activity-tekst. Voor system-events (kind='stage_change',
 * 'order_saved', enz.) bouwen we de tekst client-side op uit kind+meta
 * zodat NL én EN gebruikers het juist zien. Voor user-notes (kind='note')
 * tonen we het opgegeven message ongewijzigd.
 *
 * Legacy data (records van vóór migratie 0013 die NL-message hadden in
 * de DB) blijven werken: als `kind` geen rendering-regel matcht, vallen
 * we terug op `a.message`.
 */
function renderActivity(
  a: Activity,
  lang: Lang,
  t: (key: import('../lib/i18n').TranslationKey, vars?: Record<string, string | number>) => string,
): string {
  if (a.kind === 'stage_change') {
    const meta = a.meta as { from?: string; to?: string } | null
    const from = meta?.from ? stageLabel(meta.from as never, lang) : '?'
    const to = meta?.to ? stageLabel(meta.to as never, lang) : '?'
    return t('activity.stageChange', { from, to })
  }
  // Voor andere kinds: gebruik het opgeslagen message (notities, etc.).
  // Als message leeg is (system-event zonder render-regel), val terug
  // op de generieke kind-label.
  if (a.message) return a.message
  return a.kind
}
