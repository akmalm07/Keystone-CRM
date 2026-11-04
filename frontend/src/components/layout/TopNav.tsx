import { Menu, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'

interface TopNavProps {
  onMenuClick: () => void
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/properties': 'Properties',
  '/messages': 'Messages',
  '/settings': 'Settings',
}

function getTitle(pathname: string): string {
  if (pathname.startsWith('/leads/')) return 'Lead Detail'
  return pageTitles[pathname] ?? 'Keystone CRM'
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const location = useLocation()
  const title = getTitle(location.pathname)

  return (
    <header className="h-16 bg-[#fdfdfc]/95 border-b border-slate-200 flex items-center px-5 gap-4 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#14253a] transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      <h1 className="text-sm font-semibold text-[#14253a]">{title}</h1>

      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1.5 w-56">
        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-sm text-[#14253a] placeholder-slate-400 outline-none w-full"
        />
      </div>

    </header>
  )
}
