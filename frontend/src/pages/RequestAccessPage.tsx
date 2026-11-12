import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PublicBrand, publicField, publicPrimary } from '../components/public/PublicBrand'
import { BACKEND_URL } from '../consts'

const leadVolumes = [
  ['0-5', '0–5 leads'],
  ['6-15', '6–15 leads'],
  ['16-30', '16–30 leads'],
  ['31-50', '31–50 leads'],
  ['51+', '51 or more leads'],
]

export default function RequestAccessPage() {
  const [search] = useSearchParams()
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setStatus('sending')
    try {
      const response = await fetch(`${BACKEND_URL}api/access-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!response.ok) throw new Error('Request failed')
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#172033]">
      <header className="mx-auto max-w-7xl px-6 py-5 lg:px-8"><PublicBrand /></header>
      <main className="mx-auto max-w-xl px-6 pb-12 pt-10 sm:pt-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h1 className="text-3xl font-semibold tracking-tight">Request access</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Tell us a little about your business and what you’re looking for.</p>
          {search.get('reason') === 'signup' && status !== 'done' && (
            <p role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Your Google email needs approval before you can create an account.</p>
          )}
          {status === 'done' ? (
            <div className="mt-6 rounded-xl bg-emerald-50 p-5 text-emerald-800" role="status">
              <strong>Request received.</strong>
              <p className="mt-1 text-sm">Thank you for your interest in Keystone.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-5">
              <label className="block space-y-1.5 text-sm font-medium">
                <span>Name</span>
                <input className={publicField} name="name" autoComplete="name" maxLength={120} required />
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                <span>Email</span>
                <input className={publicField} name="email" type="email" autoComplete="email" maxLength={254} required />
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                <span>How many leads do you receive per week?</span>
                <select className={publicField} name="leadVolume" defaultValue="" required>
                  <option value="" disabled>Select one</option>
                  {leadVolumes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                <span>Why do you want to use Keystone?</span>
                <textarea className={publicField} name="reason" rows={4} maxLength={2000} required />
              </label>
              {status === 'error' && <p role="alert" className="text-sm text-red-700">We couldn’t submit your request. Please try again.</p>}
              <button className={publicPrimary + ' w-full'} disabled={status === 'sending'}>
                {status === 'sending' ? 'Submitting…' : 'Submit request'}
              </button>
            </form>
          )}
        </div>
        <p className="mt-5 text-center text-sm"><Link to="/demo" className="text-indigo-700 underline underline-offset-4">Try the demo</Link></p>
      </main>
    </div>
  )
}
