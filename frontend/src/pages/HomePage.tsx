import { Link } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { PublicBrand, publicPrimary, publicSecondary } from '../components/public/PublicBrand'

const PropertyMap = lazy(() => import('../components/public/PropertyMap').then(module => ({ default: module.PropertyMap })))

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#172033]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
        <PublicBrand />
        <Link to="/login" className={publicSecondary}>Sign in</Link>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-6 pb-14 pt-12 lg:px-8 lg:pb-20 lg:pt-20">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c77c26]" aria-hidden="true" /> Built for working agents
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-.04em] sm:text-6xl">
              Keep every opportunity moving.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Keystone brings leads, conversations, and property context into one focused workspace—so follow-up stays personal and nothing falls through the cracks.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/demo" className={publicPrimary}>Try the interactive demo <ArrowRight size={16} className="text-[#f2b563]" aria-hidden="true" /></Link>
              <Link to="/request-access" className={publicSecondary}>Request access</Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
              {['Email + SMS in one view', 'Lead context, not noise', 'Built-in follow-up signals'].map(item => (
                <li key={item} className="flex items-center gap-2"><Check size={16} className="text-slate-600" aria-hidden="true" />{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="relative isolate min-h-[40rem] overflow-hidden border-t border-slate-200 bg-slate-100 lg:flex lg:min-h-[32rem] lg:items-center" aria-labelledby="property-map-title">
          <Suspense fallback={<div className="absolute inset-0 bg-slate-200" role="status" aria-label="Loading property map" />}>
            <PropertyMap />
          </Suspense>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/75 to-transparent backdrop-blur-md [mask-image:linear-gradient(to_bottom,black_24%,transparent_60%)] lg:bg-gradient-to-r lg:[mask-image:linear-gradient(to_right,black_30%,transparent_67%)]" aria-hidden="true" />
          <div className="pointer-events-none relative mx-auto w-full max-w-7xl px-6 py-12 lg:px-8">
            <div className="max-w-md lg:max-w-[28rem]">
              <h2 id="property-map-title" className="text-4xl font-semibold leading-[1.06] tracking-[-.04em] sm:text-5xl">
                You manage the properties. We handle the leads.
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">Bring new inquiries, property details, and follow-ups into one place, from the first question to the showing.</p>
            </div>
          </div>
        </section>

        <section className="bg-[#17283b] text-white" aria-labelledby="context-title">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-8 lg:py-24">
            <div>
              <h2 id="context-title" className="max-w-xl text-4xl font-semibold leading-[1.06] tracking-[-.04em] sm:text-5xl">Replies grounded in what you share.</h2>
              <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Keystone uses the details you provide about yourself, your leads, and your properties, along with the conversation, to help prepare a more personal reply.</p>
              <p className="mt-4 max-w-lg leading-7 text-slate-300">You stay in control: review, edit, or dismiss the AI draft before sending.</p>
              <Link to="/demo" className="mt-7 inline-flex items-center gap-2 font-semibold text-[#f2b563] underline underline-offset-4">See it in the demo <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className="rounded-xl bg-white p-6 text-[#172033] shadow-lg sm:p-8">
              <p className="text-sm font-semibold text-slate-500">An example conversation</p>
              <p className="mt-4 text-lg font-medium leading-7">“Is the home on Oak Street still available? Could we see it this weekend?”</p>
              <div className="mt-6 border-t border-slate-200 pt-5">
                <p className="text-sm font-semibold text-[#9a5a19]">Information you’ve provided</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>Your name and brokerage: Alex Morgan, Oak Realty</li>
                  <li>Your note: the buyer is looking for a home with a garden</li>
                  <li>Listing details and conversation history</li>
                </ul>
              </div>
              <div className="mt-5 rounded-lg bg-[#f7f8fa] p-4">
                <p className="text-sm font-semibold">A draft, ready for your review</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">“Thanks for asking about the Oak Street home! I’d be happy to help arrange a showing so you can see the garden. What time this weekend works for you?<br /><br />Alex Morgan<br />Oak Realty”</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white" aria-labelledby="integrations-title">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-[.85fr_1.15fr] lg:gap-14 lg:px-8">
            <div>
              <h2 id="integrations-title" className="text-balance text-4xl font-semibold leading-[1.02] tracking-[-.04em] sm:text-5xl lg:text-6xl">
                From listing inquiry <span className="block text-slate-600">to Keystone.</span>
              </h2>
              <p className="mt-3 max-w-md leading-7 text-slate-700">Connect your lead sources through Zapier so new inquiries land in your workspace, ready for review.</p>
              <Link to="/request-access" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">Request access <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="border-t border-slate-200 pt-5">
                <h3><img src="/zillow-logo.png" alt="Zillow" className="h-7 w-auto max-w-full object-contain object-left" /></h3>
                <p className="mt-4 text-sm leading-6 text-slate-700">Send new Premier Agent leads to Keystone using the Zillow Tech Connect trigger in Zapier.</p>
              </div>
              <div className="border-t border-slate-200 pt-5">
                <h3><img src="/streeteasy-logo.png" alt="StreetEasy" className="h-7 w-auto max-w-full object-contain object-left" /></h3>
                <p className="mt-4 text-sm leading-6 text-slate-700">Forward StreetEasy lead emails to Zapier’s email parser to capture the contact and listing details.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p>© {new Date().getFullYear()} Keystone CRM</p>
        <div className="flex gap-4"><Link to="/terms" className="hover:text-slate-800">Terms</Link><Link to="/privacy" className="hover:text-slate-800">Privacy</Link></div>
      </footer>
    </div>
  )
}
