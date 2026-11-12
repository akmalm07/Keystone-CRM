import { useEffect, useId, useState } from 'react'
import { CalendarDays, Database, Image, FileText, Sparkles } from 'lucide-react'

export type DemoMemoryEntry = {
  id: string
  title: string
  detail: string
} & (
  { kind: 'fact' } |
  { kind: 'calendar'; openSlot: string } |
  { kind: 'photo'; path: string; alt: string }
)

export function DemoMemory({ entries, matchedIds, searching }: {
  entries: DemoMemoryEntry[]
  matchedIds: string[]
  searching: boolean
}) {
  const gradient = useId()
  const [turn, setTurn] = useState(0)
  useEffect(() => {
    if (!searching || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setTurn(value => value + 1), 600)
    return () => window.clearInterval(timer)
  }, [searching])

  const matched = entries.filter(entry => matchedIds.includes(entry.id))
  const offset = entries.length ? turn % entries.length : 0
  const shuffled = [...entries.slice(offset), ...entries.slice(0, offset)].slice(0, 3)
  const preview = searching ? shuffled : matched.length ? matched : entries.slice(0, 3)

  return (
    <div className="demo-memory">
      <svg className="demo-memory-light" data-searching={searching} viewBox="0 0 520 42" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradient}><stop stopColor="#20a6ec" /><stop offset=".45" stopColor="#814cf5" /><stop offset="1" stopColor="#dc8e27" /></linearGradient>
        </defs>
        <path d="M 0 8 H 185 Q 209 8 226 23 Q 244 36 268 36 H 520" fill="none" stroke="#d9e0ee" strokeWidth="1.4" />
        <path className="demo-light-draw" d="M 0 8 H 185 Q 209 8 226 23 Q 244 36 268 36 H 520" fill="none" stroke={`url(#${gradient})`} strokeWidth="3" pathLength="100" />
      </svg>
      <div className="demo-memory-box">
        <div className="demo-memory-header">
          <Database size={18} aria-hidden="true" />
          <div><h3>Alex’s memory box</h3><p>Listing details, photos, and calendar</p></div>
          {searching && <span className="demo-memory-status" role="status"><Sparkles size={13} aria-hidden="true" /> Searching</span>}
          {!searching && matched.length > 0 && <span className="demo-memory-status">Retrieved</span>}
        </div>
        <ul className="demo-memory-cards" data-searching={searching} aria-hidden={searching || undefined}>
          {preview.map(entry => {
            const Icon = entry.kind === 'photo' ? Image : entry.kind === 'calendar' ? CalendarDays : FileText
            return (
              <li key={entry.id} data-match={!searching && matchedIds.includes(entry.id)}>
                <Icon size={15} aria-hidden="true" />
                <div><strong>{entry.title}</strong>{!searching && matchedIds.includes(entry.id) && <p>{entry.detail}</p>}</div>
              </li>
            )
          })}
        </ul>
        {!searching && matched.length === 0 && <p className="demo-memory-empty">{matchedIds.length ? 'Loading matched details…' : 'Matching details appear here when Keystone replies.'}</p>}
      </div>
    </div>
  )
}
