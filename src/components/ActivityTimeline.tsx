import { useState, type FormEvent } from 'react'
import { Clock, MessageSquarePlus, RefreshCcw, FileText, Save } from 'lucide-react'
import { useActivities, useLogActivity } from '../lib/queries'
import { relativeTime } from '../lib/format'
import type { Activity } from '../lib/db'
import { useT } from '../lib/i18n'

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
  const { lang } = useT()
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
        <div className="font-mono text-sm">{a.message}</div>
        <div className="font-mono text-[11px] text-[--color-muted] mt-0.5">
          {relativeTime(a.created_at, lang)} · {new Date(a.created_at).toLocaleString(locale)}
        </div>
      </div>
    </li>
  )
}
