import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, ArrowUp, Check, House, MessageCircle, RotateCcw, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PublicBrand, publicField, publicPrimary, publicSecondary } from '../components/public/PublicBrand'
import { BACKEND_URL } from '../consts'
import { DemoMemory, type DemoMemoryEntry } from './DemoMemory'
import './DemoPage.css'

type Scene = 'welcome' | 'question' | 'showing'
type Step = 'listing' | 'waiting' | 'notification' | Scene | 'handoff' | 'manual'
type Message = { author: 'buyer' | 'assistant' | 'sample' | 'agent'; text: string; photoIds?: string[] }
const prompts = {
  welcome: 'Hi, is 841 Maple Avenue still available?',
  question: 'Is the backyard fully fenced? Can you text me a photo?',
  showing: 'Could I see the house this weekend?',
}
const stages = ['Inquiry', 'First text', 'Property question', 'Showing', 'Take over']
const stageIndex: Record<Step, number> = { listing: 0, waiting: 0, notification: 1, welcome: 1, question: 2, showing: 3, handoff: 4, manual: 4 }
const nextStep: Record<Scene, Step> = { welcome: 'question', question: 'showing', showing: 'handoff' }
const sampleReplies: Record<Scene, string> = {
  welcome: 'Thanks for asking, Morgan! 841 Maple Avenue is still available. What would you like to know about it?',
  question: 'The listing notes confirm a fully fenced backyard and one garage space. Alex can confirm any details beyond the listing notes.',
  showing: 'I checked the calendar and have Saturday at 11:30 a.m. Eastern open. Does that work for you?',
}
const sampleMemory: Record<Scene, string[]> = { welcome: ['availability'], question: ['backyard', 'parking'], showing: ['calendar'] }

function Transcript({ messages, pending, entries, buyer }: { messages: Message[]; pending: boolean; entries: DemoMemoryEntry[]; buyer?: boolean }) {
  const scroll = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight
  }, [messages, pending, entries])
  return (
    <div className="demo-transcript" ref={scroll} role="log" aria-label={buyer ? 'Buyer SMS thread' : 'Agent SMS conversation'}>
      {!messages.length && <p className="text-sm text-slate-600">The conversation will appear here when the inquiry arrives.</p>}
      {messages.map((message, index) => {
        const own = buyer ? message.author === 'buyer' : message.author !== 'buyer'
        const name = {
          buyer: buyer ? 'You' : 'Morgan Ellis',
          assistant: buyer ? 'Alex, your agent' : 'Keystone · AI reply',
          sample: buyer ? 'Alex · sample reply' : 'Keystone · sample reply',
          agent: buyer ? 'Alex, your agent' : 'You · manual reply',
        }[message.author]
        return (
          <div key={index} className={`demo-message ${own ? 'demo-message-own' : ''}`}>
            <p className={buyer && message.author !== 'sample' ? 'sr-only' : 'mb-1 text-xs font-semibold'}>{name}</p>
            <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p>
            {entries.filter(entry => message.photoIds?.includes(entry.id)).map(entry => entry.kind === 'photo' && (
              <figure className="demo-photo" key={entry.id}>
                <a href={entry.path} target="_blank" rel="noreferrer">
                  <img src={entry.path} alt={entry.alt} width={280} height={168} />
                </a>
                <figcaption>{entry.title} · sample</figcaption>
              </figure>
            ))}
          </div>
        )
      })}
      {pending && (
        <div className="demo-message demo-skeleton" role="status" aria-label={buyer ? 'Agent is preparing a reply' : 'Generating AI reply'}>
          <span /><span /><span />
        </div>
      )}
    </div>
  )
}

export default function DemoPage() {
  const [step, setStep] = useState<Step>('listing')
  const [inquiry, setInquiry] = useState(prompts.welcome)
  const [buyerText, setBuyerText] = useState('')
  const [agentText, setAgentText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState<{ scene: Scene; message: string; error: string } | null>(null)
  const [entries, setEntries] = useState<DemoMemoryEntry[]>([])
  const [matchedIds, setMatchedIds] = useState<string[]>([])
  const [searching, setSearching] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const request = useRef<AbortController | null>(null)
  const notification = useRef<HTMLButtonElement>(null)
  const agentReply = useRef<HTMLTextAreaElement>(null)
  const cinematic = step === 'listing' || step === 'waiting' || step === 'notification'
  const focus = cinematic ? 'buyer' : pending || failed || step === 'handoff' ? 'agent' : 'both'
  const stage = stageIndex[step]

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
    request.current?.abort()
  }, [])
  useEffect(() => {
    if (step === 'notification') notification.current?.focus()
    if (step === 'manual') agentReply.current?.focus()
  }, [step])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/demo-memory.json', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Memory catalog unavailable')
        return response.json()
      })
      .then(data => setEntries(data))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  function finishReply(scene: Scene, reply: string, author: 'assistant' | 'sample', photoIds: string[] = []) {
    setMessages(current => [...current, { author, text: reply, photoIds }])
    setBuyerText(scene === 'welcome' ? prompts.question : scene === 'question' ? prompts.showing : '')
    setStep(nextStep[scene])
  }

  async function generate(scene: Scene, message: string) {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setPending(true)
    setSearching(true)
    setMatchedIds([])
    setFailed(null)
    try {
      const response = await fetch(`${BACKEND_URL}api/demo/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene, message }),
        signal: controller.signal,
      })
      const data = await response.json()
      if (!response.ok || typeof data.reply !== 'string') {
        throw new Error(data.error || 'The reply couldn’t be generated. Try again.')
      }
      if (controller.signal.aborted) return
      const photoIds: string[] = Array.isArray(data.photoIds) ? data.photoIds : []
      setMatchedIds([...(Array.isArray(data.memoryIds) ? data.memoryIds : []), ...photoIds])
      setSearching(false)
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        await new Promise(resolve => window.setTimeout(resolve, 450))
      }
      if (!controller.signal.aborted) finishReply(scene, data.reply, 'assistant', photoIds)
    } catch (error) {
      if (controller.signal.aborted) return
      const detail = error instanceof Error ? error.message : ''
      setFailed({ scene, message, error: detail.startsWith('Live replies') || detail.startsWith('The demo') || detail.startsWith('The reply')
        ? detail
        : 'Couldn’t connect to live replies. Retry or take over to answer yourself.' })
    } finally {
      if (request.current === controller) {
        request.current = null
        setPending(false)
        setSearching(false)
      }
    }
  }

  function continueWithSample() {
    if (!failed) return
    setFailed(null)
    const photoIds = failed.scene === 'question' && /backyard|yard|fenc/i.test(failed.message) ? ['yard-photo'] : []
    setMatchedIds([...sampleMemory[failed.scene], ...photoIds])
    finishReply(failed.scene, sampleReplies[failed.scene], 'sample', photoIds)
  }

  function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!inquiry.trim() || step !== 'listing') return
    setStep('waiting')
    timer.current = setTimeout(() => {
      timer.current = null
      setStep('notification')
    }, 500)
  }

  function openText() {
    setMessages([{ author: 'buyer', text: inquiry.trim() }])
    setStep('welcome')
    void generate('welcome', inquiry)
  }

  function sendBuyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!buyerText.trim() || pending || failed) return
    const message = buyerText.trim()
    setMessages(current => [...current, { author: 'buyer', text: message }])
    setBuyerText('')
    if (step === 'question' || step === 'showing') void generate(step, message)
  }

  function takeOver() {
    request.current?.abort()
    request.current = null
    setPending(false)
    setSearching(false)
    setFailed(null)
    setStep('manual')
    if (step === 'handoff') {
      setMessages(current => [...current, { author: 'buyer', text: 'That works for me! Where should I meet you?' }])
    }
  }

  function sendAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!agentText.trim()) return
    setMessages(current => [...current, { author: 'agent', text: agentText.trim() }])
    setAgentText('')
  }

  function replay() {
    request.current?.abort()
    request.current = null
    if (timer.current) clearTimeout(timer.current)
    setPending(false)
    setFailed(null)
    setMessages([])
    setMatchedIds([])
    setSearching(false)
    setInquiry(prompts.welcome)
    setBuyerText('')
    setAgentText('')
    setStep('listing')
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#172033]">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <PublicBrand />
        <Link to="/request-access" className={publicSecondary}>Request access <ArrowRight size={15} aria-hidden="true" /></Link>
      </header>
      <main className="mx-auto max-w-7xl px-5 pb-14 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 pt-4 sm:pt-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">From inquiry to showing.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Send a listing inquiry, open the buyer’s texts, and watch Keystone find the details behind each reply.</p>
          </div>
          <button type="button" className={publicSecondary} onClick={replay}><RotateCcw size={15} aria-hidden="true" /> Replay</button>
        </div>
        <div className="demo-stage">
          <ol className="demo-timeline" aria-label="Demo progress">
            {stages.map((label, index) => (
              <li key={label} aria-current={index === stage ? 'step' : undefined} className={index < stage ? 'demo-step-complete' : ''}>
                <span>{index < stage ? <Check size={13} aria-hidden="true" /> : index + 1}</span>{label}
              </li>
            ))}
          </ol>
          <div className="demo-views" data-cinematic={cinematic} data-focus={focus}>
            <section className="demo-panel demo-buyer" data-screen={cinematic ? 'listing' : 'texts'} aria-labelledby="demo-buyer-title" inert={focus === 'agent'}>
              {cinematic ? (
                <div className="demo-listing-header">
                  <img src="/zillow-logo.png" alt="Zillow" width={89} height={19} />
                  <h2 id="demo-buyer-title">Sample listing</h2>
                </div>
              ) : (
                <div className="demo-phone-header">
                  <div className="demo-phone-avatar" aria-hidden="true">A</div>
                  <h2 id="demo-buyer-title">Alex</h2>
                  <p>Text Message · SMS</p>
                </div>
              )}
              {cinematic ? (
                <div className="relative">
                  <figure className="demo-property">
                    <img src="/demo-maple-avenue.jpg" alt="Sample white farmhouse with a front porch" />
                    <figcaption><div><strong>841 Maple Avenue</strong><p>3 beds · 2 baths</p></div><span>For sale</span></figcaption>
                  </figure>
                  <form className="space-y-3 p-4 sm:p-5" onSubmit={submitInquiry}>
                    <label className="block text-base font-bold" htmlFor="demo-inquiry">Contact agent</label>
                    <p className="text-sm text-slate-600">Morgan Ellis · sample buyer</p>
                    <textarea className={publicField} id="demo-inquiry" rows={2} maxLength={320} required value={inquiry}
                      readOnly={step !== 'listing'} onChange={event => setInquiry(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                          event.preventDefault()
                          event.currentTarget.form?.requestSubmit()
                        }
                      }} />
                    <button className="demo-listing-submit" data-next-action disabled={step !== 'listing'}>{step === 'listing' ? 'Send inquiry' : 'Inquiry sent'}</button>
                    {step === 'waiting' && <p className="text-sm text-slate-600" role="status">Waiting for a text notification…</p>}
                  </form>
                  {step === 'notification' && (
                    <button className="demo-notification" data-next-action ref={notification} onClick={openText}>
                      <span className="demo-notification-icon"><MessageCircle size={20} aria-hidden="true" /></span>
                      <span><strong>New text about 841 Maple Avenue</strong><small>Open Messages</small></span>
                      <ArrowRight size={17} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <Transcript messages={messages} pending={pending} entries={entries} buyer />
                  {(step === 'question' || step === 'showing' || step === 'manual') && (
                    <form className="demo-phone-composer" onSubmit={sendBuyer}>
                      <label htmlFor="demo-buyer-text">{step === 'question' ? 'Ask about the property' : step === 'showing' ? 'Ask for a showing' : 'Text your agent'}</label>
                      <div>
                        <textarea id="demo-buyer-text" rows={2} maxLength={320} value={buyerText} onChange={event => setBuyerText(event.target.value)} disabled={pending || !!failed} placeholder="Text Message" />
                        <button key={step} aria-label="Send text" data-next-action disabled={pending || !!failed || !buyerText.trim()}><ArrowUp size={17} strokeWidth={3} aria-hidden="true" /></button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </section>
            <section className="demo-panel demo-agent" aria-labelledby="demo-agent-title" inert={cinematic} aria-hidden={cinematic || undefined}>
              <div className="demo-panel-header">
                <House size={18} className="text-indigo-700" aria-hidden="true" />
                <div><h2 id="demo-agent-title" className="font-semibold">Agent workspace</h2><p className="text-xs text-slate-600">Alex · SMS inbox</p></div>
                <span className={`demo-mode ${step === 'manual' ? 'demo-mode-manual' : ''}`}>{step === 'manual' ? 'Manual mode' : 'Demo autopilot'}</span>
              </div>
              <DemoMemory entries={entries} matchedIds={matchedIds} searching={searching} />
              <Transcript messages={messages} pending={pending} entries={entries} />
              {failed && (
                <div className="demo-composer">
                  <p role="alert" className="text-sm text-red-700">{failed.error}</p>
                  <div className="flex flex-wrap gap-2">
                    <button className={publicSecondary} data-next-action onClick={() => void generate(failed.scene, failed.message)}>Retry reply</button>
                    <button className={publicSecondary} onClick={continueWithSample}>Continue with sample reply</button>
                    <button className="demo-takeover" onClick={takeOver}>Take Over</button>
                  </div>
                </div>
              )}
              {step === 'handoff' && (
                <div className="demo-composer demo-handoff">
                  <div><h3 className="font-semibold">Make the next reply yours.</h3><p className="text-sm text-slate-600">Take over to pause AI replies and write as Alex.</p></div>
                  <button className="demo-takeover" data-next-action onClick={takeOver}>Take Over <ArrowRight size={16} aria-hidden="true" /></button>
                </div>
              )}
              {step === 'manual' && (
                <form className="demo-composer" onSubmit={sendAgent}>
                  <p className="flex items-center gap-2 text-sm text-emerald-800" role="status"><Check size={16} aria-hidden="true" /> You’re in control. AI replies are paused.</p>
                  <label className="block text-sm font-semibold" htmlFor="demo-agent-reply">Reply as Alex</label>
                  <textarea ref={agentReply} className={publicField} id="demo-agent-reply" rows={2} maxLength={600} value={agentText} onChange={event => setAgentText(event.target.value)} />
                  <button className={publicPrimary} data-next-action disabled={!agentText.trim()}><Send size={15} aria-hidden="true" /> Send reply</button>
                </form>
              )}
            </section>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-600">Sample listing, photos, and calendar. OpenAI generates the replies. Texts and showings are simulated. Please use sample details.</p>
      </main>
    </div>
  )
}
