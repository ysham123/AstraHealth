/**
 * Layout Component
 * 
 * Main application layout with navigation sidebar.
 * Features: Dark mode for reading rooms, keyboard shortcuts
 */

import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  Home,
  BarChart3,
  FileText,
  LogOut,
  User,
  Moon,
  Sun,
  Keyboard,
  Search,
  BookOpen,
  Brain,
  Users,
} from 'lucide-react'
import CommandPalette from '../CommandPalette'

// Navigation configuration
const navItems = [
  { path: '/', label: 'Dashboard', icon: Home, shortcut: '1' },
  { path: '/reading', label: 'Reading Room', icon: FileText, shortcut: '2' },
  { path: '/ai', label: 'AI Assistant', icon: Brain, shortcut: '3' },
  { path: '/tumor-board', label: 'Tumor Board', icon: Users, shortcut: '4' },
  { path: '/reference', label: 'Reference', icon: BookOpen, shortcut: '5' },
  { path: '/metrics', label: 'Analytics', icon: BarChart3, shortcut: '6' },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('loopguard-dark-mode') === 'true'
  })
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  // Apply dark mode class to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('loopguard-dark-mode', String(darkMode))
  }, [darkMode])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
        return
      }
      
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // Alt + number for navigation
      if (e.altKey && e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key) - 1
        if (navItems[index]) {
          navigate(navItems[index].path)
        }
      }
      
      // Alt + D for dark mode toggle
      if (e.altKey && e.key === 'd') {
        setDarkMode(prev => !prev)
      }
      
      // ? for shortcuts help
      if (e.key === '?') {
        setShowShortcuts(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Sign out error:', error)
      // Force navigation even if signOut fails
      navigate('/login')
    }
  }

  // All nav items visible
  const visibleNavItems = navItems

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShortcuts(false)}>
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-xl p-6 max-w-md`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Keyboard size={20} />
              <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Dashboard</span><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Alt + 1</kbd></div>
              <div className="flex justify-between"><span>Worklist</span><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Alt + 2</kbd></div>
              <div className="flex justify-between"><span>Reading Panel</span><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Alt + 3</kbd></div>
              <div className="flex justify-between"><span>Metrics</span><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Alt + 4</kbd></div>
              <div className="flex justify-between"><span>Toggle Dark Mode</span><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Alt + D</kbd></div>
              <div className="flex justify-between"><span>Show Shortcuts</span><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">?</kbd></div>
            </div>
            <button onClick={() => setShowShortcuts(false)} className="mt-4 w-full btn-primary">Close</button>
          </div>
        </div>
      )}
      
      {/* Command Palette */}
      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />

      {/* Sidebar */}
      <aside className={`w-64 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">Astra Health</h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Radiology Intelligence Platform</p>
        </div>

        <nav className="mt-6">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? darkMode 
                      ? 'bg-primary-900/50 text-primary-400 border-r-4 border-primary-500'
                      : 'bg-primary-50 text-primary-700 border-r-4 border-primary-600'
                    : darkMode
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={20} />
                  {item.label}
                </span>
                <kbd className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-400'}`}>
                  {item.shortcut}
                </kbd>
              </Link>
            )
          })}
        </nav>

        {/* Search */}
        <button
          onClick={() => setShowCommandPalette(true)}
          className={`mx-4 mt-4 w-[calc(100%-2rem)] flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
            darkMode 
              ? 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600' 
              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Search size={16} />
          <span className="flex-1 text-left">Search...</span>
          <kbd className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>⌘K</kbd>
        </button>

        {/* Dark Mode & Shortcuts */}
        <div className={`mx-4 mt-6 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className={`p-1.5 rounded ${darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
              title="Keyboard shortcuts (?)"
            >
              <Keyboard size={16} />
            </button>
          </div>
        </div>

        {/* User section */}
        <div className={`absolute bottom-0 left-0 w-64 p-4 border-t z-10 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-primary-900' : 'bg-primary-100'} flex items-center justify-center`}>
              <User size={20} className={darkMode ? 'text-primary-400' : 'text-primary-600'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {user?.email}
              </p>
              <p className={`text-xs capitalize ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {user?.user_metadata?.role || 'User'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-2 text-sm w-full p-2 rounded-lg cursor-pointer transition-colors ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 p-8 overflow-auto ${darkMode ? 'bg-gray-900' : ''}`}>
        <Outlet />
      </main>
    </div>
  )
}
