import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Building2, Clock, Copy, Mail, MapPin,
  Phone, Send, Sparkles, StickyNote,
} from 'lucide-react'
import { useApi } from '../hooks/useApi'
import type { Lead, Message, Note } from '../services/api'
import { api } from '../services/api'
import { BACKEND_URL } from '../consts'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { LeadStatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Input'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton } from '../components/ui/Skeleton'
import { formatDate, formatRelativeTime, getInitials } from '../lib/utils'

type LeadDetailMessage = Omit<Message, 'leadId' | 'leadName'>

interface LeadDetail extends Omit<Lead, 'messages'> {
  aiEnabled?: boolean
  notes?: Note[]
  messages?: LeadDetailMessage[]
}

interface AiDraft {
  channel: 'sms' | 'email'
  body: string
  subject?: string
  readyToBook: boolean
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: lead, loading, error, refetch } = useApi<LeadDetail>(`${BACKEND_URL}api/leads/${id}`)
  const [activeTab, setActiveTab] = useState<'conversation' | 'notes'>('conversation')
  const [noteText, setNoteText] = useState('')
  const [messageText, setMessageText] = useState('')
  const [messageSubject, setMessageSubject] = useState('')
  const [messageChannel, setMessageChannel] = useState<'sms' | 'email'>('sms')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [submittingMessage, setSubmittingMessage] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState<AiDraft | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const activeChannel = lead?.phone ? messageChannel : 'email'
  const inboundMessage = lead?.messages?.some((message) => message.direction === 'inbound') ?? false

  const handleGenerateDraft = async () => {
    if (!id) return
    setGenerating(true)
    setActionError(null)
    try {
      const response = await fetch(`${BACKEND_URL}api/leads/${id}/generate-draft`, {
        method: 'POST',
        credentials: 'include',
      })
      const payload = await response.json().catch(() => ({})) as AiDraft & { error?: string }
      if (!response.ok) throw new Error(payload.error ?? 'Unable to generate a reply draft.')
      setDraft(payload)
      setMessageChannel(payload.channel)
      setMessageText(payload.body)
      setMessageSubject(payload.subject ?? '')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to generate a reply draft.')
    } finally {
      setGenerating(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteText.trim() || !id) return
    setSubmittingNote(true)
    setActionError(null)
    try {
      await api.postNote({ leadId: id, content: noteText.trim() })
      setNoteText('')
      refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add note.')
    } finally {
      setSubmittingNote(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() || !id) return
    if (activeChannel === 'email' && !messageSubject.trim()) {
      setActionError('Add an email subject before sending.')
      return
    }
    setSubmittingMessage(true)
    setActionError(null)
    try {
      await api.postMessage({
        leadId: id,
        content: messageText.trim(),
        channel: activeChannel,
        subject: activeChannel === 'email' ? messageSubject.trim() : undefined,
      })
      setMessageText('')
      setMessageSubject('')
      setDraft(null)
      refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to send message.')
    } finally {
      setSubmittingMessage(false)
    }
  }

  const useDraft = () => {
    if (!draft) return
    setMessageText(draft.body)
    setMessageSubject(draft.subject ?? '')
    setMessageChannel(draft.channel)
  }

  if (error && !lead) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <button onClick={() => navigate('/leads')} className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-slate-500 transition hover:text-[#14253a]">
        <ArrowLeft className="h-3.5 w-3.5" /> All leads
      </button>

      <Card className="overflow-hidden border-slate-200 shadow-none">
        <CardContent className="p-0">
          {loading || !lead ? <LeadHeaderSkeleton /> : (
            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="flex min-w-0 gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#e7edf2] text-lg font-semibold text-[#20384f]">{getInitials(lead.name)}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-semibold tracking-[-.02em] text-[#14253a]">{lead.name}</h1>
                    <LeadStatusBadge status={lead.status} />
                    {lead.aiEnabled !== false && <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f4ee] px-2 py-0.5 text-[11px] font-medium text-[#277451]"><Sparkles className="h-3 w-3" /> AI active</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                    {lead.email && <span className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" />{lead.email}</span>}
                    {lead.phone && <span className="inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" />{lead.phone}</span>}
                    <span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" />{lead.source}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-7 border-t border-slate-100 pt-4 text-right lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                <Metric label="Created" value={formatDate(lead.createdAt)} />
                <Metric label="Last activity" value={formatRelativeTime(lead.updatedAt)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {actionError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-5 border-b border-slate-200">
              {(['conversation', 'notes'] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`-mb-px border-b-2 px-1 pb-2.5 text-sm font-medium capitalize transition ${activeTab === tab ? 'border-[#c8793c] text-[#14253a]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{tab}</button>)}
            </div>
            {activeTab === 'conversation' && <span className="text-xs text-slate-400">Review before anything is sent</span>}
          </div>

          {activeTab === 'conversation' ? (
            <Card className="overflow-hidden border-slate-200 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between border-slate-100 px-5 py-4"><CardTitle>Conversation</CardTitle><span className="text-xs text-slate-400">{lead?.messages?.length ?? 0} messages</span></CardHeader>
              <div className="min-h-[280px] space-y-4 bg-[#fcfcfb] px-5 py-5">
                {loading ? <MessageSkeletons /> : (lead?.messages?.length ?? 0) === 0 ? <p className="py-16 text-center text-sm text-slate-400">No conversation history yet.</p> : lead?.messages?.map((message) => <MessageBubble key={message.id} message={message} />)}
              </div>

              <div className="border-t border-slate-200 bg-white p-5">
                {draft && <AiDraftPanel draft={draft} onUse={useDraft} onDismiss={() => setDraft(null)} />}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    {lead?.phone && <ChannelButton active={activeChannel === 'sms'} onClick={() => setMessageChannel('sms')} icon={<Phone className="h-3.5 w-3.5" />} label="Text" />}
                    {lead?.email && <ChannelButton active={activeChannel === 'email'} onClick={() => setMessageChannel('email')} icon={<Mail className="h-3.5 w-3.5" />} label="Email" />}
                  </div>
                  <Button variant="secondary" size="sm" loading={generating} disabled={!inboundMessage || lead?.aiEnabled === false} onClick={handleGenerateDraft} icon={<Sparkles className="h-3.5 w-3.5" />}>Generate reply</Button>
                </div>
                {!inboundMessage && <p className="mb-3 text-xs text-slate-500">An inbound message is needed before the assistant can prepare a reply.</p>}
                {activeChannel === 'email' && <input aria-label="Email subject" value={messageSubject} onChange={(event) => setMessageSubject(event.target.value)} placeholder="Subject" className="mb-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#c8793c] focus:ring-2 focus:ring-orange-100" />}
                <div className="flex gap-2"><Textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder={`Write a ${activeChannel === 'sms' ? 'text' : 'reply'}…`} rows={3} className="flex-1 border-slate-200 focus:border-[#c8793c]" /><Button size="sm" loading={submittingMessage} onClick={handleSendMessage} icon={<Send className="h-3.5 w-3.5" />} className="self-end bg-[#14253a] hover:bg-[#20384f]">Send</Button></div>
              </div>
            </Card>
          ) : <NotesPanel loading={loading} notes={lead?.notes ?? []} value={noteText} onChange={setNoteText} onAdd={handleAddNote} adding={submittingNote} />}
        </section>

        <aside className="space-y-4">
          <Card className="border-slate-200 shadow-none"><CardHeader className="border-slate-100"><CardTitle>Lead context</CardTitle></CardHeader><CardContent className="space-y-3">{loading || !lead ? <ContextSkeleton /> : <dl className="space-y-3 text-sm"><ContextRow label="Source" value={lead.source} /><ContextRow label="Status" value={<LeadStatusBadge status={lead.status} />} /><ContextRow label="AI handling" value={lead.aiEnabled === false ? 'Paused' : 'Active'} /><ContextRow label="Updated" value={formatRelativeTime(lead.updatedAt)} /></dl>}</CardContent></Card>
          {lead?.propertyInterest && <Card className="border-slate-200 bg-[#f8f6f1] shadow-none"><CardContent className="p-5"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-[#87613d]"><Building2 className="h-4 w-4" /> Property interest</div><p className="text-sm leading-6 text-[#3b3127]">{lead.propertyInterest}</p></CardContent></Card>}
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Workflow note</p><p className="mt-2 text-sm leading-5 text-slate-600">Generated drafts remain editable. The agent controls the final message.</p></div>
        </aside>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-[#14253a]">{value}</p></div> }
function ContextRow({ label, value }: { label: string; value: React.ReactNode }) { return <div className="flex items-center justify-between gap-4"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-[#14253a]">{value}</dd></div> }
function ChannelButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) { return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${active ? 'border-[#20384f] bg-[#20384f] text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>{icon}{label}</button> }
function MessageBubble({ message }: { message: LeadDetailMessage }) { const outbound = message.direction === 'outbound'; return <div className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-lg px-4 py-3 text-sm leading-6 ${outbound ? 'bg-[#20384f] text-white' : 'border border-slate-200 bg-white text-[#27384a]'}`}><div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[.1em] opacity-60">{message.channel === 'sms' ? <Phone className="h-3 w-3" /> : <Mail className="h-3 w-3" />}{outbound ? 'Sent' : 'Received'}</div><p>{message.body}</p><p className={`mt-1.5 text-[11px] ${outbound ? 'text-slate-300' : 'text-slate-400'}`}>{formatRelativeTime(message.sentAt)}</p></div></div> }
function AiDraftPanel({ draft, onUse, onDismiss }: { draft: AiDraft; onUse: () => void; onDismiss: () => void }) { return <div className="mb-4 rounded-lg border border-[#ead6be] bg-[#fffaf3] p-4"><div className="flex items-start justify-between gap-4"><div><p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6d4827]"><Sparkles className="h-4 w-4" /> Draft ready for review</p><p className="mt-1 text-xs text-[#8c6b4c]">Grounded in the lead’s latest message and property context.</p></div><button type="button" onClick={onDismiss} className="text-xs font-medium text-[#8c6b4c] hover:text-[#6d4827]">Dismiss</button></div>{draft.subject && <p className="mt-3 text-sm font-medium text-[#3b3127]">{draft.subject}</p>}<p className="mt-2 text-sm leading-6 text-[#3b3127]">{draft.body}</p><div className="mt-3 flex items-center justify-between"><span className="text-[11px] text-[#8c6b4c]">{draft.readyToBook ? 'Booking intent detected' : 'Review and adjust before sending'}</span><button type="button" onClick={onUse} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6d4827] hover:text-[#3b3127]"><Copy className="h-3.5 w-3.5" /> Use draft</button></div></div> }
function NotesPanel({ loading, notes, value, onChange, onAdd, adding }: { loading: boolean; notes: Note[]; value: string; onChange: (value: string) => void; onAdd: () => void; adding: boolean }) { return <Card className="border-slate-200 shadow-none"><CardHeader className="border-slate-100"><CardTitle>Private notes</CardTitle></CardHeader><CardContent className="space-y-4">{loading ? <MessageSkeletons /> : notes.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">No notes for this lead.</p> : notes.map((note) => <div key={note.id} className="border-b border-slate-100 pb-4 last:border-0"><p className="text-sm leading-6 text-[#27384a]">{note.note}</p><p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3 w-3" /> {formatRelativeTime(note.createdAt)}</p></div>)}<div className="border-t border-slate-100 pt-4"><Textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder="Add a private note…" rows={3} /><Button size="sm" loading={adding} onClick={onAdd} icon={<StickyNote className="h-3.5 w-3.5" />} className="mt-2 bg-[#14253a] hover:bg-[#20384f]">Save note</Button></div></CardContent></Card> }
function LeadHeaderSkeleton() { return <div className="flex gap-4 p-6"><Skeleton className="h-14 w-14 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-72" /></div></div> }
function MessageSkeletons() { return <div className="space-y-3 py-4"><Skeleton className="h-16 w-2/3 rounded-lg" /><Skeleton className="ml-auto h-16 w-1/2 rounded-lg" /><Skeleton className="h-16 w-3/5 rounded-lg" /></div> }
function ContextSkeleton() { return <div className="space-y-4"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-3/5" /></div> }
