import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, Building2, Check, Inbox, ShieldCheck, Zap } from 'lucide-react'

const features = [
  { icon: Building2, title: 'Organize the signal', copy: 'Capture each inquiry with the property and source context that matters.' },
  { icon: Inbox, title: 'Respond with context', copy: 'Pick up any conversation without rebuilding the story.' },
  { icon: ShieldCheck, title: 'Stay in control', copy: 'Use automation to surface work—not to replace your judgment.' },
]

const conversations = [
  ['Morgan Ellis', 'Asking about 841 Maple Ave', '2 min ago'],
  ['Jordan Lee', 'Requested a showing this week', '18 min ago'],
  ['Casey Martin', 'New referral from Mike Rose', '1 hr ago'],
]

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f8fa] text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#172033] text-white shadow-sm"><Zap className="h-4 w-4" /></span>
          Keystone <span className="font-normal text-slate-400">CRM</span>
        </Link>
        <Link to="/login" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950">Sign in</Link>
      </header>

      <main>
        <section className="relative mx-auto max-w-7xl px-6 pb-20 pt-12 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="absolute right-[-12rem] top-0 -z-0 h-[34rem] w-[34rem] rounded-full bg-indigo-100/70 blur-3xl" />
          <div className="relative grid items-center gap-12 lg:grid-cols-[1.02fr_.98fr]">
            <div>
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Built for working agents</p>
              <h1 className="max-w-2xl text-5xl font-semibold leading-[1.03] tracking-[-0.045em] text-[#172033] sm:text-6xl">Keep every opportunity moving.</h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Keystone brings leads, conversations, and property context into one focused workspace—so follow-up stays personal and nothing falls through the cracks.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/login" className="inline-flex items-center gap-2 rounded-lg bg-[#172033] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">Open your workspace <ArrowRight className="h-4 w-4" /></Link>
                <a href="#workflow" className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300">See how it works</a>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
                {['Email + SMS in one view', 'Lead context, not noise', 'Built-in follow-up signals'].map((item) => <span key={item} className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />{item}</span>)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(22,32,51,.13)]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#fbfcfe]">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5"><div className="flex items-center gap-2 text-sm font-semibold text-[#172033]"><BarChart3 className="h-4 w-4 text-indigo-600" /> Pipeline overview</div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Updated now</span></div>
                <div className="grid grid-cols-3 gap-3 p-4">{[['42', 'Active leads'], ['8', 'Need follow-up'], ['76%', 'Reply rate']].map(([value, label]) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-xl font-semibold text-[#172033]">{value}</p><p className="mt-1 text-[11px] text-slate-500">{label}</p></div>)}</div>
                <div className="mx-4 mb-4 rounded-lg border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Priority conversations</p><Inbox className="h-4 w-4 text-slate-400" /></div>{conversations.map(([name, note, time], index) => <div key={name} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0"><span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${index === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{name.split(' ').map((part) => part[0]).join('')}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-[#172033]">{name}</p><p className="truncate text-xs text-slate-500">{note}</p></div><span className="text-[11px] text-slate-400">{time}</span></div>)}</div>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="border-y border-slate-200 bg-white"><div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-3 lg:px-8">{features.map(({ icon: Icon, title, copy }) => <div key={title} className="max-w-sm"><div className="mb-5 grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-indigo-700"><Icon className="h-5 w-5" /></div><h2 className="text-base font-semibold text-[#172033]">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p></div>)}</div></section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8"><p>© {new Date().getFullYear()} Keystone CRM</p><div className="flex gap-4"><Link to="/terms" className="hover:text-slate-800">Terms</Link><Link to="/privacy" className="hover:text-slate-800">Privacy</Link></div></footer>
    </div>
  )
}
