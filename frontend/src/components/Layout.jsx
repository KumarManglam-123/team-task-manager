import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'

const NavItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150
      ${isActive
        ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`
    }
  >
    <span className="text-lg">{icon}</span>
    <span>{label}</span>
  </NavLink>
)

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 h-screen w-64 bg-gray-950 border-r border-gray-800 flex flex-col z-30
        transition-transform duration-300 lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">⚡</div>
            <div>
              <div className="font-bold text-white text-lg leading-none">FlowTask</div>
              <div className="text-xs text-gray-500 font-mono">team workspace</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-3 px-4">Menu</p>
          <NavItem to="/dashboard" icon="◈" label="Dashboard" />
          <NavItem to="/projects" icon="⬡" label="Projects" />
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 transition-colors group">
            <img src={user?.avatar} alt={user?.name} className="w-9 h-9 rounded-full ring-2 ring-gray-700" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-200 truncate">{user?.name}</div>
              <div className="text-xs text-gray-500 truncate">{user?.email}</div>
            </div>
            <button onClick={handleLogout} className="text-gray-600 hover:text-red-400 transition-colors text-lg" title="Logout">⏻</button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white text-xl">☰</button>
          <span className="font-bold text-white">FlowTask</span>
        </div>

        <div className="p-4 md:p-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
