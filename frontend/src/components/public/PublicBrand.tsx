import { Link } from 'react-router-dom'
import { KeystoneMark } from '../KeystoneMark'

export const publicPrimary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#172033] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50'
export const publicSecondary = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50'
export const publicField = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-[#172033] placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100'

export function PublicBrand() {
  return (
    <Link to="/" aria-label="Keystone CRM home" className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-[#172033]">
      <KeystoneMark />
      Keystone <span className="font-normal text-slate-500">CRM</span>
    </Link>
  )
}
