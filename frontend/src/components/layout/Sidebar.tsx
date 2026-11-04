import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Building2,
  MessageSquare,
  Settings,
  X,
  Zap,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/properties', icon: Building2, label: 'Properties' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
]

export function Sidebar({ open, onClose }: SidebarProps) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 w-64 bg-[#14253a] border-r border-[#263d54] flex flex-col transition-transform duration-200 ease-in-out',
        'lg:relative lg:translate-x-0 lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-[#263d54] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#c8793c] rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#14253a]" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-white text-sm tracking-tight">Keystone CRM</span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        <p className="px-2 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-[.14em]">
          Main
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        <div className="pt-4">
          <p className="px-2 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-[.14em]">
            Account
          </p>
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            Settings
          </NavLink>
        </div>
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-[#263d54] flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer group">
          <div className="w-7 h-7 rounded-full bg-[#e7edf2] flex items-center justify-center flex-shrink-0">
            <span className="text-[#20384f] text-xs font-semibold">AJ</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-[11px] text-slate-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  )
}
